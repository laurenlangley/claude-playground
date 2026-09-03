/// <reference path="./worklet-globals.d.ts" />

/**
 * Ten independent Ornstein-Uhlenbeck walks, one per shaper band, emitted as ten
 * mono outputs. Each is connected directly to a BiquadFilterNode's `gain`
 * AudioParam.
 *
 * Why this lives on the audio thread rather than in a setInterval:
 * background tabs throttle timers to roughly once a minute, so a main-thread
 * drift would freeze while the tab is hidden and then lurch when it returns.
 * An AudioParam sums its intrinsic value with any connected signal, so:
 *
 *   band gain = user's slider value (setTargetAtTime, main thread)
 *             + drift signal (audio rate, here)
 *
 * No polling, no zipper noise, and immune to tab state.
 *
 * Why drift at all: a completely static spectrum is predictable, and the ear
 * learns to hear through it within an hour or so. Slight movement keeps it
 * reading as texture rather than as a fixed tone.
 */
const BANDS = 10;

class DriftProcessor extends AudioWorkletProcessor {
  private x = new Float64Array(BANDS);   // current OU state, unit variance
  private prev = new Float64Array(BANDS); // previous emitted value, for interpolation
  private spare = 0;
  private hasSpare = false;
  private s = new Uint32Array(4);

  static get parameterDescriptors() {
    return [
      // 0 = barely (~120 s correlation time), 1 = noticeable (~8 s).
      { name: 'rate', defaultValue: 0.25, minValue: 0, maxValue: 1, automationRate: 'k-rate' as const },
      // Bound in dB. The walk is tanh-limited, so output never exceeds this.
      { name: 'depth', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' as const },
    ];
  }

  constructor() {
    super();
    let z = ((Math.random() * 0xffffffff) >>> 0) || 1;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
      this.s[i] = (t ^ (t >>> 15)) >>> 0 || 1;
    }
  }

  private uniform(): number {
    const s = this.s;
    const result = (s[0] + s[3]) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return (result >>> 8) * 5.9604644775390625e-8 + 1e-9; // (0, 1)
  }

  private gaussian(): number {
    if (this.hasSpare) { this.hasSpare = false; return this.spare; }
    const u = this.uniform();
    const v = this.uniform();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(2 * Math.PI * v);
    this.hasSpare = true;
    return m * Math.cos(2 * Math.PI * v);
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const n = outputs[0]?.[0]?.length ?? 128;
    const depth = parameters.depth[0];
    const rate = parameters.rate[0];

    // Correlation time, log-interpolated from 120 s down to 8 s.
    const tau = 120 * Math.pow(8 / 120, rate);
    const dt = n / sampleRate;
    const decay = Math.exp(-dt / tau);
    // Diffusion scaled so the stationary distribution stays unit variance
    // regardless of rate; only the speed of wandering changes.
    const sigma = Math.sqrt(1 - decay * decay);

    for (let b = 0; b < BANDS; b++) {
      const ch = outputs[b]?.[0];
      if (!ch) continue;
      const from = this.prev[b];
      if (depth === 0) {
        // Ramp cleanly to zero rather than cutting, so toggling drift off does
        // not step the band gain.
        this.x[b] = 0;
        this.prev[b] = 0;
        for (let i = 0; i < n; i++) ch[i] = from * (1 - (i + 1) / n);
        continue;
      }
      this.x[b] = this.x[b] * decay + sigma * this.gaussian();
      // tanh gives a hard bound at +/-depth with no clipping discontinuity.
      const to = depth * Math.tanh(this.x[b] * 0.6);
      this.prev[b] = to;
      // One OU step per render quantum (375 Hz at 48 kHz), linearly
      // interpolated across it. Far above any rate the ear can track, far below
      // the cost of running the walk per sample.
      const step = (to - from) / n;
      let v = from;
      for (let i = 0; i < n; i++) { v += step; ch[i] = v; }
    }
    return true;
  }
}

registerProcessor('drift-processor', DriftProcessor);
