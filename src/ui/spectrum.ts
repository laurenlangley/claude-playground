import type { Shaper } from '../audio/shaper.ts';
import { BAND_CENTERS } from '../audio/shaper.ts';

/**
 * Live spectrum plus the shaper's computed response curve, on a log frequency
 * axis, with the 1-4 kHz speech band marked.
 *
 * This exists in the engine build as a verification instrument, not as design.
 * It is also the seed of the intended signature element: the interesting thing
 * about a ten-band shaper is that the bands *interact* — adjacent one-octave
 * peaking filters overlap, so the curve you get is not the curve you drew — and
 * that is worth showing rather than hiding behind ten tidy sliders.
 */
const F_MIN = 20;
const F_MAX = 20000;
const DB_MIN = -80;
const DB_MAX = 0;

export class Spectrum {
  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private analyser: AnalyserNode;
  private shaper: Shaper;
  private data: Float32Array<ArrayBuffer>;
  private freqs: Float32Array<ArrayBuffer>;
  private raf = 0;
  private reduced: boolean;

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode, shaper: Shaper) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;
    this.analyser = analyser;
    this.shaper = shaper;
    this.data = new Float32Array(analyser.frequencyBinCount);
    this.freqs = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      this.freqs[i] = F_MIN * Math.pow(F_MAX / F_MIN, i / 255);
    }
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private x(f: number, w: number): number {
    return (Math.log2(f / F_MIN) / Math.log2(F_MAX / F_MIN)) * w;
  }

  private y(db: number, h: number): number {
    return h - ((db - DB_MIN) / (DB_MAX - DB_MIN)) * h;
  }

  start(): void {
    if (this.raf) return;
    const draw = () => {
      this.render();
      // prefers-reduced-motion stops the *visual* animation only. Drift keeps
      // running as audio, because it is part of how the sound works.
      this.raf = this.reduced ? 0 : requestAnimationFrame(draw);
    };
    draw();
    if (this.reduced) {
      // Still refresh, just slowly and without animation-frame motion.
      this.raf = window.setInterval(() => this.render(), 1000) as unknown as number;
    }
  }

  stop(): void {
    if (this.reduced) clearInterval(this.raf);
    else cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  render(): void {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    const g = this.ctx2d;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const hot = css.getPropertyValue('--hot').trim() || '#b8321a';
    const sig = css.getPropertyValue('--sig').trim() || '#1c5fa8';
    const dim = css.getPropertyValue('--dim').trim() || '#5c6068';
    const line = css.getPropertyValue('--line').trim() || '#d4d7dc';

    // Speech band, 1-4 kHz. The reason the app exists.
    g.fillStyle = hot + '14';
    const x1 = this.x(1000, w);
    g.fillRect(x1, 0, this.x(4000, w) - x1, h);
    g.strokeStyle = hot + '55';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x1 + 0.5, 0); g.lineTo(x1 + 0.5, h);
    g.moveTo(this.x(4000, w) + 0.5, 0); g.lineTo(this.x(4000, w) + 0.5, h);
    g.stroke();

    // Octave gridlines
    g.strokeStyle = line;
    g.fillStyle = dim;
    g.font = '10px ui-monospace, monospace';
    for (const f of BAND_CENTERS) {
      const xx = Math.round(this.x(f, w)) + 0.5;
      g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, h - 14); g.stroke();
      const t = f >= 1000 ? `${f / 1000}k` : String(f);
      g.fillText(t, xx - g.measureText(t).width / 2, h - 3);
    }

    // Shaper response curve (what you asked for, including band interaction)
    const mag = this.shaper.frequencyResponse(this.freqs);
    g.strokeStyle = dim;
    g.lineWidth = 1.5;
    g.setLineDash([4, 3]);
    g.beginPath();
    for (let i = 0; i < this.freqs.length; i++) {
      const db = 20 * Math.log10(Math.max(1e-6, mag[i])) - 40; // offset to sit in view
      const px = this.x(this.freqs[i], w);
      const py = this.y(db, h);
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
    g.setLineDash([]);

    // Live output spectrum (what you actually got)
    this.analyser.getFloatFrequencyData(this.data);
    const nyq = this.analyser.context.sampleRate / 2;
    const bins = this.data.length;
    g.strokeStyle = sig;
    g.lineWidth = 1.5;
    g.beginPath();
    let started = false;
    for (let i = 1; i < bins; i++) {
      const f = (i / bins) * nyq;
      if (f < F_MIN || f > F_MAX) continue;
      const px = this.x(f, w);
      const py = this.y(Math.max(DB_MIN, this.data[i]), h);
      started ? g.lineTo(px, py) : (g.moveTo(px, py), (started = true));
    }
    g.stroke();
  }
}
