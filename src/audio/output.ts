/**
 * Master output chain and exposure guard.
 *
 * WHAT THE GUARD ACTUALLY DOES, STATED HONESTLY
 *
 * A gain node controls a fraction of digital full scale. Between that number
 * and sound pressure at the eardrum sit the OS volume, the DAC's output
 * voltage, and the headphone's sensitivity — which spans roughly 90 to 110 dB
 * SPL/mW across consumer models, a 20 dB range. None of that is visible from
 * here. So this module does NOT claim to cap SPL.
 *
 * What it does:
 *   1. Enforces a real -18 dBFS headroom ceiling on master gain, and calls it
 *      a headroom limit, which is what it is.
 *   2. Optionally converts the digital level into an SPL *estimate* when the
 *      user supplies a headphone sensitivity — reported with its uncertainty.
 *   3. Leaves the real work to procedure: the calibration flow asks the user to
 *      raise the level until speech stops being intelligible and then stop,
 *      which lands at the minimum effective level by construction.
 *
 * The health note stands regardless: sustained daily exposure above about
 * 70 dB SPL carries cumulative hearing-damage risk over years. This app is
 * built for eight-hour days, which makes level a safety question rather than a
 * preference. Louder is never better here.
 */

/** Master gain ceiling without an explicit override, in dBFS. */
export const HEADROOM_CEILING_DB = -18;
export const HEADROOM_CEILING = Math.pow(10, HEADROOM_CEILING_DB / 20);

/** Fade length on start and stop. Long enough that neither end is an event. */
const FADE_SECONDS = 1.5;

export interface SplEstimate {
  db: number;
  uncertaintyDb: number;
}

export class OutputChain {
  /** Everything mixes into this. */
  readonly bus: GainNode;
  readonly analyser: AnalyserNode;
  private ctx: AudioContext;
  private limiter: DynamicsCompressorNode;
  private master: GainNode;
  private level = 0.5;
  private overrideEnabled = false;
  private fadeTimerId: number | null = null;
  /**
   * True between stop() and the next start(). Without this, moving the level
   * slider after a stop would ramp the master back up and produce sound with no
   * start gesture behind it. Stopped means stopped.
   */
  private silenced = true;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1;

    // Soft limiter sits BEFORE the master gain, so it protects against the
    // shaper's +12 dB of band boost rather than only against the user's level.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.8;

    this.bus.connect(this.limiter).connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(ctx.destination);
  }

  /** Maximum linear gain the master is allowed to reach right now. */
  get ceiling(): number {
    return this.overrideEnabled ? 1 : HEADROOM_CEILING;
  }

  /**
   * Raising the ceiling is a deliberate act, not a slider that happens to go
   * further. The caller is responsible for having shown the exposure note.
   */
  setOverride(enabled: boolean): void {
    this.overrideEnabled = enabled;
    this.setLevel(this.level);
  }

  get overridden(): boolean {
    return this.overrideEnabled;
  }

  /** level: 0..1, mapped to the current ceiling. Silent while stopped. */
  setLevel(level: number): void {
    this.level = Math.max(0, Math.min(1, level));
    if (this.silenced) return;
    this.master.gain.setTargetAtTime(this.targetGain, this.ctx.currentTime, 0.05);
  }

  getLevel(): number {
    return this.level;
  }

  private get targetGain(): number {
    // Perceptually even travel: level^2 approximates a fader taper far better
    // than a linear map over this range.
    return this.level * this.level * this.ceiling;
  }

  get levelDbfs(): number {
    return 20 * Math.log10(Math.max(1e-6, this.targetGain));
  }

  /**
   * Estimate only. sensitivity is dB SPL per mW; drive is the assumed
   * electrical level at full scale, which we cannot measure, hence the stated
   * uncertainty. Present this with the number, never on its own.
   */
  estimateSpl(sensitivityDbPerMw: number): SplEstimate {
    return {
      db: sensitivityDbPerMw + this.levelDbfs,
      uncertaintyDb: 6,
    };
  }

  fadeIn(): void {
    this.silenced = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(1e-5, this.master.gain.value), t);
    this.master.gain.linearRampToValueAtTime(this.targetGain, t + FADE_SECONDS);
  }

  fadeOut(): Promise<void> {
    this.silenced = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
    return new Promise((res) => setTimeout(res, FADE_SECONDS * 1000 + 50));
  }

  /**
   * Sleep timer. The ramp is scheduled on the AudioParam timeline immediately,
   * not fired from a setTimeout, so a backgrounded tab throttling its timers
   * cannot make the fade late or lumpy. The timeout only exists to tell the UI.
   */
  scheduleFadeOut(minutes: number, onDone: () => void): void {
    this.cancelFadeOut();
    const fadeLen = 60;
    const start = this.ctx.currentTime + minutes * 60 - fadeLen;
    this.master.gain.setValueAtTime(this.targetGain, start);
    this.master.gain.linearRampToValueAtTime(0, start + fadeLen);
    this.fadeTimerId = window.setTimeout(onDone, (minutes * 60 + 1) * 1000);
  }

  cancelFadeOut(): void {
    if (this.fadeTimerId !== null) {
      clearTimeout(this.fadeTimerId);
      this.fadeTimerId = null;
    }
    if (this.silenced) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.targetGain, t, 0.05);
  }
}
