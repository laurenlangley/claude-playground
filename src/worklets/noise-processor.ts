/// <reference path="./worklet-globals.d.ts" />
import { StereoNoise, type NoiseKind } from '../dsp/noise.ts';

/**
 * Noise source. Runs on the audio thread so a busy main thread, a hidden tab,
 * or a long layout pass cannot interrupt it.
 *
 * There is no buffer, no loop, and no sample data anywhere in this file. Every
 * sample is computed. That is the whole point: a perceptible loop point would
 * defeat the app.
 */
class NoiseProcessor extends AudioWorkletProcessor {
  private gen: StereoNoise;
  // Audio-thread cost instrumentation. The render-quantum budget is
  // 128 / sampleRate seconds (2.667 ms at 48 kHz); anything approaching that
  // will glitch.
  //
  // AudioWorkletGlobalScope has no `performance` object (verified in Chrome
  // 141), so there is no high-resolution clock here. `Date` is available, at
  // 1 ms resolution — far too coarse to time a single quantum directly.
  //
  // It is not too coarse to time them in aggregate. If a quantum takes t ms
  // where t < 1, the probability that a millisecond boundary falls inside it is
  // exactly t, so Date.now() after minus Date.now() before is 1 with
  // probability t and 0 otherwise. The mean of that indicator over many quanta
  // is an unbiased estimator of t in milliseconds. Averaging over ~2000 quanta
  // (about 5 seconds of audio) gives a standard error of roughly
  // sqrt(t(1-t)/2000), which at t = 0.05 ms is about 0.005 ms.
  private acc = 0;
  private accN = 0;
  private lastReport = 0;

  static get parameterDescriptors() {
    return [
      // 1 = mono, 0 = fully decorrelated. Default 0.7: wide enough to open the
      // field, correlated enough to stay stable over an 8-hour session.
      { name: 'correlation', defaultValue: 0.7, minValue: 0, maxValue: 1, automationRate: 'k-rate' as const },
    ];
  }

  constructor() {
    super();
    this.gen = new StereoNoise('pink', sampleRate, (Math.random() * 0xffffffff) >>> 0, 256);
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { type: string; kind?: NoiseKind };
      if (d.type === 'kind' && d.kind) this.gen.setKind(d.kind);
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const out = outputs[0];
    if (!out || out.length < 2) return true;
    const n = out[0].length;
    const rho = parameters.correlation[0];

    const t0 = Date.now();
    this.gen.render(out[0], out[1], n, rho);
    this.acc += Date.now() - t0;
    this.accN++;

    if (currentTime - this.lastReport > 5 && this.accN >= 2000) {
      this.lastReport = currentTime;
      // Peak of this quantum, so the main thread can show a real output meter
      // without a second analyser tap on the noise bus.
      // (Reported on the same 5 s cadence as the cost estimate.)
      let peak = 0;
      for (let i = 0; i < n; i++) {
        const a = Math.abs(out[0][i]);
        if (a > peak) peak = a;
      }
      this.port.postMessage({
        type: 'cpu',
        msPerQuantum: this.acc / this.accN,
        budgetMs: (1000 * n) / sampleRate,
        quanta: this.accN,
        sourcePeak: peak,
      });
      this.acc = 0;
      this.accN = 0;
    }
    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
