import { Rng } from './rng.ts';
import { kellettCoeffs, KELLETT_DIRECT, KELLETT_DELAYED } from './kellett.ts';

export type NoiseKind = 'white' | 'pink' | 'brown';
export const NOISE_KINDS: NoiseKind[] = ['white', 'pink', 'brown'];

/**
 * Equal-loudness normalisation, not equal-RMS.
 *
 * Equal RMS is the wrong target: brown noise at the same RMS as white sounds
 * markedly quieter, because most of its energy sits where the ear is least
 * sensitive. The requirement is that switching generators must not jump in
 * *loudness*, so these scalars are measured with ITU-R BS.1770 K-weighting.
 *
 * Regenerate with `npm run loudness`. Measured values are recorded in
 * docs/measurements.md alongside the raw LUFS figures.
 */
export const LOUDNESS_TRIM: Record<NoiseKind, number> = {
  white: 0.0724699,
  pink: 0.0371945,
  brown: 0.0164759,
};

export interface Generator {
  /** Fill `out[0..n)` with samples in roughly [-1, 1]. Allocation-free. */
  render(out: Float32Array, n: number): void;
}

class WhiteGen implements Generator {
  private rng: Rng;
  constructor(rng: Rng) { this.rng = rng; }
  render(out: Float32Array, n: number): void {
    const rng = this.rng;
    for (let i = 0; i < n; i++) out[i] = rng.nextFloat();
  }
}

class PinkGen implements Generator {
  private b = new Float64Array(6);
  private prevWhite = 0;
  private poles: Float64Array;
  private gains: Float64Array;

  private rng: Rng;

  constructor(rng: Rng, sampleRate: number) {
    this.rng = rng;
    const c = kellettCoeffs(sampleRate);
    this.poles = c.poles;
    this.gains = c.gains;
  }

  render(out: Float32Array, n: number): void {
    const { rng, b, poles, gains } = this;
    let prev = this.prevWhite;
    // Unrolled: six one-pole sections, a direct term and a one-sample-delayed
    // term. Local scalars rather than array indexing in the inner loop.
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    const p0 = poles[0], p1 = poles[1], p2 = poles[2], p3 = poles[3], p4 = poles[4], p5 = poles[5];
    const g0 = gains[0], g1 = gains[1], g2 = gains[2], g3 = gains[3], g4 = gains[4], g5 = gains[5];
    for (let i = 0; i < n; i++) {
      const w = rng.nextFloat();
      b0 = p0 * b0 + w * g0;
      b1 = p1 * b1 + w * g1;
      b2 = p2 * b2 + w * g2;
      b3 = p3 * b3 + w * g3;
      b4 = p4 * b4 + w * g4;
      b5 = p5 * b5 + w * g5;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + prev * KELLETT_DELAYED + w * KELLETT_DIRECT;
      prev = w;
    }
    b[0] = b0; b[1] = b1; b[2] = b2; b[3] = b3; b[4] = b4; b[5] = b5;
    this.prevWhite = prev;
  }
}

/**
 * Brown: leaky integrator over white, then a DC blocker.
 *
 * A true 1/f^2 integrator down to DC is a random walk with unbounded variance;
 * over an 8-hour session it will wander into the rails. The leak is therefore
 * not optional. It costs a departure from -6 dB/oct only below f_leak, which is
 * inaudible and out of band anyway.
 *
 * The DC blocker on top is belt and braces: it guarantees no offset can
 * accumulate across hours even if the integrator state picks up a bias.
 */
class BrownGen implements Generator {
  private y = 0;   // integrator state
  private xz = 0;  // DC blocker input history
  private yz = 0;  // DC blocker output history
  private a: number;
  private r: number;
  private denorm = 1e-20;

  private static LEAK_HZ = 20;
  private static DC_BLOCK_HZ = 8;

  private rng: Rng;

  constructor(rng: Rng, sampleRate: number) {
    this.rng = rng;
    this.a = 1 - (2 * Math.PI * BrownGen.LEAK_HZ) / sampleRate;
    this.r = 1 - (2 * Math.PI * BrownGen.DC_BLOCK_HZ) / sampleRate;
  }

  render(out: Float32Array, n: number): void {
    const { rng, a, r } = this;
    let y = this.y, xz = this.xz, yz = this.yz, d = this.denorm;
    for (let i = 0; i < n; i++) {
      // Alternating tiny offset. Float64 denormal stalls are unlikely in JS and
      // the integrator input is never zero, but this costs nothing and the
      // failure it prevents would only show up hours in.
      d = -d;
      y = a * y + rng.nextFloat() + d;
      const o = y - xz + r * yz;
      xz = y;
      yz = o;
      out[i] = o;
    }
    this.y = y; this.xz = xz; this.yz = yz; this.denorm = d;
  }
}

export function makeGenerator(kind: NoiseKind, sampleRate: number, seed: number): Generator {
  const rng = new Rng(seed);
  switch (kind) {
    case 'white': return new WhiteGen(rng);
    case 'pink': return new PinkGen(rng, sampleRate);
    case 'brown': return new BrownGen(rng, sampleRate);
  }
}

/**
 * Stereo pair with a correlation control.
 *
 * Two fully independent streams are fully decorrelated, which is very wide and
 * which a lot of listeners find unstable over a long session. Mixing a shared
 * mid stream with two independent side streams gives one control from mono to
 * fully wide:
 *
 *   L = sqrt(rho)*M + sqrt(1-rho)*A
 *   R = sqrt(rho)*M + sqrt(1-rho)*B
 *
 * Power is preserved at every rho, so moving the width does not change level.
 */
export class StereoNoise {
  private m: Generator;
  private a: Generator;
  private b: Generator;
  private tm: Float32Array;
  private ta: Float32Array;
  private tb: Float32Array;
  private kind: NoiseKind;
  private sampleRate: number;
  private baseSeed: number;

  constructor(kind: NoiseKind, sampleRate: number, seed: number, maxBlock = 512) {
    this.kind = kind;
    this.sampleRate = sampleRate;
    this.baseSeed = seed;
    this.m = makeGenerator(kind, sampleRate, seed);
    this.a = makeGenerator(kind, sampleRate, seed ^ 0x5bf03635);
    this.b = makeGenerator(kind, sampleRate, seed ^ 0x27d4eb2f);
    this.tm = new Float32Array(maxBlock);
    this.ta = new Float32Array(maxBlock);
    this.tb = new Float32Array(maxBlock);
  }

  /**
   * Switching generator rebuilds the three streams. Doing this on a boundary is
   * fine: the shaper and master gain are unchanged, and the loudness trim keeps
   * the level continuous, so there is no audible discontinuity beyond the
   * change in character that the user asked for.
   */
  setKind(kind: NoiseKind): void {
    if (kind === this.kind) return;
    this.kind = kind;
    this.m = makeGenerator(kind, this.sampleRate, this.baseSeed);
    this.a = makeGenerator(kind, this.sampleRate, this.baseSeed ^ 0x5bf03635);
    this.b = makeGenerator(kind, this.sampleRate, this.baseSeed ^ 0x27d4eb2f);
  }

  getKind(): NoiseKind {
    return this.kind;
  }

  /** rho: 1 = mono, 0 = fully decorrelated. */
  render(left: Float32Array, right: Float32Array, n: number, rho: number): void {
    const { tm, ta, tb } = this;
    this.m.render(tm, n);
    this.a.render(ta, n);
    this.b.render(tb, n);
    const trim = LOUDNESS_TRIM[this.kind];
    const km = Math.sqrt(rho) * trim;
    const ks = Math.sqrt(1 - rho) * trim;
    for (let i = 0; i < n; i++) {
      const mid = tm[i] * km;
      left[i] = mid + ta[i] * ks;
      right[i] = mid + tb[i] * ks;
    }
  }
}
