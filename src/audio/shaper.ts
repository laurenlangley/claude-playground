/**
 * Ten-band octave shaper. Peaking biquads in series.
 *
 * Q = 1.4142, derived rather than dialled in: for a bandwidth of N octaves,
 * Q = 2^(N/2) / (2^N - 1). At N = 1 that is sqrt(2)/1 = 1.4142. Since the band
 * centres *are* octave spaced, one-octave bandwidth is the value that tiles
 * them. (The brief suggested 1.0-1.4; the derived number sits at the top of
 * that range and is the one that makes the bands neighbours rather than
 * islands.)
 *
 * Two honest limits of this topology, both surfaced in the UI rather than
 * engineered around:
 *
 * 1. There is no "-infinity". A peaking filter driven to -inf dB is a notch of
 *    finite width, not a removed octave. The slider bottoms out at -40 dB and
 *    says so.
 * 2. Bands interact. Two adjacent bands at +12 dB sum to more than +12 dB
 *    between them; pulling one band down leaves its neighbours' skirts filling
 *    part of the hole. Every graphic EQ does this. The answer is to show the
 *    real resulting curve, not to pretend otherwise.
 */
export const BAND_CENTERS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const BAND_COUNT = BAND_CENTERS.length;
export const BAND_Q = Math.SQRT2;
export const BAND_MIN_DB = -40;
export const BAND_MAX_DB = 12;

/** Ramp time constant for slider moves. Anything shorter and you hear zipper. */
const RAMP_TC = 0.03;

export class Shaper {
  readonly input: AudioNode;
  readonly output: AudioNode;
  private bands: BiquadFilterNode[] = [];
  private ctx: BaseAudioContext;
  /** User-set values, excluding any drift offset. */
  private values = new Float32Array(BAND_COUNT);

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    for (let i = 0; i < BAND_COUNT; i++) {
      const f = ctx.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = Math.min(BAND_CENTERS[i], ctx.sampleRate / 2 - 1);
      f.Q.value = BAND_Q;
      f.gain.value = 0;
      if (i > 0) this.bands[i - 1].connect(f);
      this.bands.push(f);
    }
    this.input = this.bands[0];
    this.output = this.bands[BAND_COUNT - 1];
  }

  /** Never assigns .value directly — that is a step change, and it clicks. */
  setBand(index: number, db: number): void {
    const v = Math.max(BAND_MIN_DB, Math.min(BAND_MAX_DB, db));
    this.values[index] = v;
    this.bands[index].gain.setTargetAtTime(v, this.ctx.currentTime, RAMP_TC);
  }

  setAll(dbs: ArrayLike<number>): void {
    for (let i = 0; i < BAND_COUNT; i++) this.setBand(i, dbs[i]);
  }

  getBand(index: number): number {
    return this.values[index];
  }

  getAll(): number[] {
    return Array.from(this.values);
  }

  /**
   * Wire the drift worklet's ten outputs into the ten band gain params.
   *
   * An AudioParam sums its intrinsic value with everything connected to it, so
   * this adds the drift offset on top of whatever setBand() last wrote without
   * either one having to know about the other.
   */
  connectDrift(drift: AudioWorkletNode): void {
    for (let i = 0; i < BAND_COUNT; i++) drift.connect(this.bands[i].gain, i);
  }

  /** Magnitude response of the whole chain, for drawing the real curve. */
  frequencyResponse(freqs: Float32Array<ArrayBuffer>): Float32Array {
    const mag = new Float32Array(freqs.length);
    const phase = new Float32Array(freqs.length);
    const total = new Float32Array(freqs.length).fill(1);
    for (const b of this.bands) {
      b.getFrequencyResponse(freqs, mag, phase);
      for (let i = 0; i < freqs.length; i++) total[i] *= mag[i];
    }
    return total;
  }
}
