/**
 * Long-run verification for the noise generators.
 *
 * "Seamless" is the requirement that cannot be checked by reading the code, and
 * it is the one that makes the rest of the app pointless if it is wrong. So it
 * gets a method rather than a listen.
 *
 * Four tests per generator:
 *
 *  1. EXACT BLOCK COLLISIONS. Hash every 0.5 s block over the whole run. A
 *     buffer-based generator would produce bit-identical blocks. Zero
 *     collisions is the only acceptable result.
 *
 *     The hash is 64 bits, built from two independent 32-bit FNV-1a variants.
 *     A single 32-bit hash is not enough here and gives false failures: an
 *     8-hour run is 57,600 blocks, and the birthday probability of a chance
 *     collision in a 2^32 space is 1 - exp(-57600^2 / 2^33) = 32%. At 64 bits
 *     the same figure is about 9e-11.
 *  2. FULL-RATE AUTOCORRELATION over the first 2^21 samples (~44 s), lags from
 *     0.5 s to 21 s.
 *
 *     Measured as PROMINENCE, not absolute magnitude. Brown noise is white
 *     through a 20 Hz leaky integrator, so it has a genuine correlation time of
 *     about 8 ms; at short lags it shows real, expected, non-zero correlation
 *     that has nothing to do with periodicity. A loop does not look like
 *     elevated correlation, it looks like a *spike* standing out of the local
 *     baseline. So the test reports max|r| divided by the RMS of r across the
 *     search range. Broadband noise gives a ratio around 4-6, which is just the
 *     expected maximum of that many samples. A loop gives hundreds.
 *  3. ENVELOPE AUTOCORRELATION over the entire run at 100 Hz, catching slow
 *     periodicity out to minutes, which full-rate analysis of a 44 s window
 *     cannot see.
 *  4. LEVEL DRIFT. Sliding 1 s RMS across the whole run, reported as dB from
 *     first window to last. Brown is the one at risk here; target is under
 *     0.2 dB.
 *
 * Plus NaN / Inf / out-of-range checks on every sample.
 *
 * Run: npm run seam            (30 minutes per generator)
 *      npm run seam -- --hours=8
 *
 * None of this replaces listening. Per the brief: 30+ minutes, eyes closed,
 * before anything is built on top.
 */
import { StereoNoise, NOISE_KINDS, type NoiseKind } from '../src/dsp/noise.ts';
import { fft } from './dspmath.ts';

const SR = 48000;
const BLOCK = 8192;
const ENV_HZ = 100;
const ENV_SAMPLES = SR / ENV_HZ;
const HASH_SAMPLES = SR / 2;
const AC_LEN = 1 << 21;

const arg = process.argv.find((a) => a.startsWith('--hours='));
const HOURS = arg ? parseFloat(arg.split('=')[1]) : 0.5;
const TOTAL = Math.round(SR * 3600 * HOURS);

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Normalised autocorrelation via FFT. Returns r[lag], r[0] == 1. */
function autocorr(x: Float64Array, maxLag: number): Float64Array {
  const n = x.length;
  const size = nextPow2(n * 2);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) re[i] = x[i] - mean;
  fft(re, im);
  for (let i = 0; i < size; i++) {
    const p = re[i] * re[i] + im[i] * im[i];
    re[i] = p;
    im[i] = 0;
  }
  // Inverse via conjugation: IFFT(X) = conj(FFT(conj(X)))/N. X is real here.
  fft(re, im);
  const out = new Float64Array(maxLag + 1);
  const r0 = re[0];
  for (let l = 0; l <= maxLag; l++) out[l] = re[l] / r0;
  return out;
}

interface Result {
  kind: NoiseKind;
  peak: number;
  dc: number;
  bad: number;
  collisions: number;
  acMax: number;
  acProminence: number;
  acMaxLagS: number;
  envMax: number;
  envProminence: number;
  envMaxLagS: number;
  rmsDriftDb: number;
  rmsSpreadDb: number;
  renderSeconds: number;
}

function run(kind: NoiseKind): Result {
  const gen = new StereoNoise(kind, SR, 0x5eed, BLOCK);
  const l = new Float32Array(BLOCK);
  const r = new Float32Array(BLOCK);

  const acHead = new Float64Array(AC_LEN);
  const envLen = Math.floor(TOTAL / ENV_SAMPLES);
  const env = new Float64Array(envLen);
  const rmsWindows: number[] = [];
  const hashes = new Set<string>();

  let peak = 0;
  let dcSum = 0;
  let bad = 0;
  let collisions = 0;

  let envAcc = 0, envN = 0, envI = 0;
  let secAcc = 0, secN = 0;
  let hashA = 0x811c9dc5, hashB = 0x01000193, hashN = 0;

  const t0 = Date.now();
  for (let off = 0; off < TOTAL; off += BLOCK) {
    const n = Math.min(BLOCK, TOTAL - off);
    gen.render(l, r, n, 0.7);
    for (let i = 0; i < n; i++) {
      const v = l[i];
      if (!Number.isFinite(v) || Math.abs(v) > 4) bad++;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      dcSum += v;

      if (off + i < AC_LEN) acHead[off + i] = v;

      envAcc += v * v;
      if (++envN === ENV_SAMPLES) {
        if (envI < envLen) env[envI++] = Math.sqrt(envAcc / envN);
        envAcc = 0; envN = 0;
      }

      secAcc += v * v;
      if (++secN === SR) {
        rmsWindows.push(Math.sqrt(secAcc / secN));
        secAcc = 0; secN = 0;
      }

      // Two independent FNV-1a variants over the raw float bits of each block,
      // combined into one 64-bit key.
      const bits = (v * 2147483647) | 0;
      for (let s8 = 0; s8 < 24; s8 += 8) {
        const byte = (bits >>> s8) & 0xff;
        hashA = Math.imul(hashA ^ byte, 16777619) >>> 0;
        hashB = Math.imul(hashB ^ byte, 2246822519) >>> 0;
      }
      if (++hashN === HASH_SAMPLES) {
        const key = `${hashA.toString(36)}.${hashB.toString(36)}`;
        if (hashes.has(key)) collisions++;
        hashes.add(key);
        hashA = 0x811c9dc5; hashB = 0x01000193; hashN = 0;
      }
    }
  }
  const renderSeconds = (Date.now() - t0) / 1000;

  const acMaxLagSamples = Math.min(AC_LEN >> 1, SR * 21);
  const ac = autocorr(acHead, acMaxLagSamples);
  const acLagStart = Math.round(SR * 0.5);
  let acMax = 0, acMaxLag = 0, acSq = 0, acN = 0;
  for (let lag = acLagStart; lag <= acMaxLagSamples; lag++) {
    const a = Math.abs(ac[lag]);
    if (a > acMax) { acMax = a; acMaxLag = lag; }
    acSq += ac[lag] * ac[lag];
    acN++;
  }
  const acRms = Math.sqrt(acSq / acN);

  const envMaxLag = Math.min(envI >> 1, ENV_HZ * 600);
  const eac = autocorr(env.subarray(0, envI), envMaxLag);
  let envMax = 0, envMaxLagI = 0, envSq = 0, envN2 = 0;
  for (let lag = Math.round(ENV_HZ * 0.5); lag <= envMaxLag; lag++) {
    const a = Math.abs(eac[lag]);
    if (a > envMax) { envMax = a; envMaxLagI = lag; }
    envSq += eac[lag] * eac[lag];
    envN2++;
  }
  const envRms = Math.sqrt(envSq / envN2);

  const db = (x: number) => 20 * Math.log10(x);
  const first = rmsWindows.slice(0, 60).reduce((a, b) => a + b, 0) / Math.min(60, rmsWindows.length);
  const last = rmsWindows.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, rmsWindows.length);

  return {
    kind,
    peak,
    dc: dcSum / TOTAL,
    bad,
    collisions,
    acMax,
    acProminence: acMax / acRms,
    acMaxLagS: acMaxLag / SR,
    envMax,
    envProminence: envMax / envRms,
    envMaxLagS: envMaxLagI / ENV_HZ,
    rmsDriftDb: db(last / first),
    rmsSpreadDb: db(Math.max(...rmsWindows) / Math.min(...rmsWindows)),
    renderSeconds,
  };
}

/**
 * Prominence thresholds. Broadband noise lands around 4-6: the expected maximum
 * of ~1e6 near-Gaussian samples. A genuine loop point produces a spike hundreds
 * of times the local baseline, so there is a wide margin between "noise" and
 * "failure" and no need to sit close to either edge.
 */
const AC_PROMINENCE_THRESHOLD = 12;
const ENV_PROMINENCE_THRESHOLD = 12;
const DRIFT_THRESHOLD_DB = 0.2;

console.log(`seam test: ${HOURS} h per generator at ${SR} Hz (${TOTAL.toLocaleString()} samples each)\n`);
let failed = false;
for (const kind of NOISE_KINDS) {
  const res = run(kind);
  const fails: string[] = [];
  if (res.bad > 0) fails.push(`${res.bad} non-finite or out-of-range samples`);
  if (res.collisions > 0) fails.push(`${res.collisions} identical 0.5 s blocks`);
  if (res.acProminence > AC_PROMINENCE_THRESHOLD) fails.push(`autocorrelation spike ${res.acProminence.toFixed(1)}x baseline at ${res.acMaxLagS.toFixed(2)} s`);
  if (res.envProminence > ENV_PROMINENCE_THRESHOLD) fails.push(`envelope autocorrelation spike ${res.envProminence.toFixed(1)}x baseline at ${res.envMaxLagS.toFixed(1)} s`);
  if (Math.abs(res.rmsDriftDb) > DRIFT_THRESHOLD_DB) fails.push(`level drift ${res.rmsDriftDb.toFixed(3)} dB`);

  console.log(`${res.kind.toUpperCase()}  (rendered in ${res.renderSeconds.toFixed(1)} s, ${(TOTAL / res.renderSeconds / 1e6).toFixed(1)} Msamples/s)`);
  console.log(`  peak                    ${res.peak.toFixed(4)}`);
  console.log(`  DC offset               ${res.dc.toExponential(2)}`);
  console.log(`  non-finite samples      ${res.bad}`);
  console.log(`  identical 0.5 s blocks  ${res.collisions}`);
  console.log(`  autocorr 0.5-21 s       ${res.acMax.toExponential(3)} at ${res.acMaxLagS.toFixed(2)} s, ${res.acProminence.toFixed(1)}x baseline   (threshold ${AC_PROMINENCE_THRESHOLD}x)`);
  console.log(`  envelope autocorr       ${res.envMax.toExponential(3)} at ${res.envMaxLagS.toFixed(1)} s, ${res.envProminence.toFixed(1)}x baseline   (threshold ${ENV_PROMINENCE_THRESHOLD}x)`);
  console.log(`  RMS drift first->last   ${res.rmsDriftDb.toFixed(3)} dB          (threshold ${DRIFT_THRESHOLD_DB})`);
  console.log(`  RMS spread across run   ${res.rmsSpreadDb.toFixed(2)} dB  (inherent 1/f level wander, not drift)`);
  console.log(fails.length ? `  FAIL: ${fails.join('; ')}\n` : `  PASS\n`);
  if (fails.length) failed = true;
}
console.log(failed ? 'SEAM TEST FAILED' : 'SEAM TEST PASSED');
process.exit(failed ? 1 : 0);
