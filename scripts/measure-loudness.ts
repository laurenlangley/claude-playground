/**
 * Measures K-weighted loudness of the three generators and prints the trim
 * scalars for LOUDNESS_TRIM in src/dsp/noise.ts, plus the spectral slope of
 * each so the DSP claims in docs/architecture.md stay checkable.
 *
 * Run: npm run loudness
 */
import { StereoNoise, NOISE_KINDS } from '../src/dsp/noise.ts';
import { lufs, welch, slopeDbPerOctave } from './dspmath.ts';

const SR = 48000;
const SECONDS = 60;
const BLOCK = 4096;
const total = SR * SECONDS;

const results: Record<string, { lufs: number; slope: number; peak: number }> = {};

for (const kind of NOISE_KINDS) {
  const gen = new StereoNoise(kind, SR, 0xc0ffee, BLOCK);
  const buf = new Float32Array(total);
  const l = new Float32Array(BLOCK);
  const r = new Float32Array(BLOCK);
  let peak = 0;
  for (let off = 0; off < total; off += BLOCK) {
    const n = Math.min(BLOCK, total - off);
    gen.render(l, r, n, 1.0); // mono for measurement
    buf.set(l.subarray(0, n), off);
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(l[i]));
  }
  const psd = welch(buf.subarray(0, 1 << 20), 16384);
  results[kind] = {
    lufs: lufs(buf),
    slope: slopeDbPerOctave(psd, SR, 30, 16000),
    peak,
  };
}

const ref = results.pink.lufs;
console.log(`sample rate ${SR} Hz, ${SECONDS} s per generator, slope fit 30 Hz - 16 kHz\n`);
console.log('kind    LUFS      slope dB/oct   ideal   peak    trim (rel. pink)');
const ideal: Record<string, number> = { white: 0, pink: -3.01, brown: -6.02 };
const trims: Record<string, number> = {};
for (const kind of NOISE_KINDS) {
  const rres = results[kind];
  const trim = Math.pow(10, (ref - rres.lufs) / 20);
  trims[kind] = trim;
  console.log(
    kind.padEnd(7),
    rres.lufs.toFixed(2).padStart(7),
    rres.slope.toFixed(2).padStart(13),
    ideal[kind].toFixed(2).padStart(7),
    rres.peak.toFixed(2).padStart(7),
    trim.toFixed(5).padStart(10),
  );
}

// Scale so the loudest generator peaks near -6 dBFS, leaving the shaper's
// +12 dB of possible band boost inside the fixed output headroom.
const peakAfter = NOISE_KINDS.map((k) => results[k].peak * trims[k]);
const headroom = 0.5 / Math.max(...peakAfter);
console.log('\nLOUDNESS_TRIM (paste into src/dsp/noise.ts):');
console.log('{');
for (const kind of NOISE_KINDS) {
  console.log(`  ${kind}: ${(trims[kind] * headroom).toPrecision(6)},`);
}
console.log('}');
