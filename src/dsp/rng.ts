/**
 * xoshiro128+ — 128-bit state, period 2^128 - 1.
 *
 * Chosen over Math.random() for two reasons: it is seedable (needed for
 * per-channel stereo decorrelation and for reproducible seam tests), and it is
 * pure 32-bit integer arithmetic, so it costs nothing in a JS audio thread.
 *
 * Period in real terms: 3.4e38 samples / 48000 Hz ~= 2.3e26 years per stream.
 * Periodicity of the PRNG is not a failure mode this app needs to worry about.
 *
 * xoshiro128+ has weak low-order bits, which is why nextFloat() takes the top
 * 24 and discards the rest rather than masking from the bottom.
 */
export class Rng {
  private s = new Uint32Array(4);

  constructor(seed: number) {
    // splitmix32 to expand a single seed into 128 bits of state.
    let z = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
      this.s[i] = (t ^ (t >>> 15)) >>> 0;
    }
    if ((this.s[0] | this.s[1] | this.s[2] | this.s[3]) === 0) this.s[0] = 1;
    for (let i = 0; i < 32; i++) this.nextUint32(); // discard the seeding transient
  }

  nextUint32(): number {
    const s = this.s;
    const result = (s[0] + s[3]) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return result;
  }

  /** Uniform in [-1, 1). Top 24 bits only. */
  nextFloat(): number {
    return (this.nextUint32() >>> 8) * 1.1920928955078125e-7 - 1; // 2^-23
  }
}
