/**
 * Paul Kellett's "refined" pink filter, re-solved for arbitrary sample rate.
 *
 * Why Kellett and not Voss-McCartney: Voss updates its rows on the bit-flip
 * pattern of a counter, so its *update structure* repeats with period 2^N even
 * though the random values are fresh, and it carries a known +/-0.5 dB ripple.
 * This app's disqualifying failure is a perceptible loop point, so a generator
 * with any internal counter is the wrong tool. Kellett is a weighted sum of
 * first-order IIR sections driven by white noise: a filter, with no counter, no
 * structure, and no period beyond the PRNG's.
 *
 * The published coefficients are specified at 44100 Hz (+/-0.05 dB above
 * 9.2 Hz). Browsers overwhelmingly run 48000 Hz, where the poles sit at the
 * wrong normalised frequencies. Rather than hardcode the 44.1 constants and
 * accept unmeasured error, we map each pole to the target rate and rescale its
 * gain to preserve that section's contribution.
 *
 * Source of the original coefficients: Paul Kellett, via
 * https://www.firstpr.com.au/dsp/pink-noise/
 */
export const KELLETT_REFERENCE_RATE = 44100;

const P44 = [0.99886, 0.99332, 0.969, 0.8665, 0.55, -0.7616];
const G44 = [0.0555179, 0.0750759, 0.153852, 0.3104856, 0.5329522, -0.016898];

/** Direct (undelayed) white contribution. */
export const KELLETT_DIRECT = 0.5362;
/** White contribution delayed by one sample (the `b6` term in the original). */
export const KELLETT_DELAYED = 0.115926;

export interface KellettCoeffs {
  poles: Float64Array;
  gains: Float64Array;
}

/**
 * A one-pole section y[n] = p*y[n-1] + g*x[n] has pole radius p = exp(-2*pi*fc/fs).
 * Holding fc fixed while changing fs means p' = p^(fs_ref/fs_target).
 *
 * Sections with a negative pole sit near Nyquist rather than DC; the same
 * exponentiation is applied to the magnitude and the sign is kept, which holds
 * the section's bandwidth fixed relative to Nyquist.
 *
 * Gains are rescaled to preserve each section's gain at the frequency it
 * dominates: DC (g/(1-p)) for positive poles, Nyquist (g/(1+p)) for negative.
 */
export function kellettCoeffs(sampleRate: number): KellettCoeffs {
  const r = KELLETT_REFERENCE_RATE / sampleRate;
  const poles = new Float64Array(6);
  const gains = new Float64Array(6);
  for (let i = 0; i < 6; i++) {
    const p = P44[i];
    const g = G44[i];
    if (p >= 0) {
      const pn = Math.pow(p, r);
      poles[i] = pn;
      gains[i] = g * ((1 - pn) / (1 - p));
    } else {
      const pn = -Math.pow(-p, r);
      poles[i] = pn;
      gains[i] = g * ((1 + pn) / (1 + p));
    }
  }
  return { poles, gains };
}
