/**
 * Tonal drone layer. Separate bus, separate gain, separate on/off. This is not
 * part of the masking signal path and the UI does not present it as one.
 *
 * WHAT THIS IS MODELLED ON, AND WHAT IT IS NOT
 *
 * The source was a commercial "40 Hz gamma" track. Measured, the 40 Hz claim
 * does not survive: there is no dichotic carrier pair and no meaningful 40 Hz
 * amplitude modulation. What is actually in the signal is a sustained Am7 pad
 * with partials at 109.7 / 131.2 / 164.9 / 196.5 / 260.4 Hz — A2, C3, E3, G3,
 * C4, all within 10 cents of 12-TET (measured deviations: -4.7, +5.1, +0.9,
 * +4.4, -8.1 cents).
 *
 * Two details from re-checking the measurements shaped this implementation:
 *
 * - The C4 partial is 13.2 cents flat of 2x the C3 partial. It is an
 *   independent voice, not a harmonic. Five oscillators is the right model.
 * - The measured octave distribution (63 Hz 9.8%, 125 Hz 48.4%, 250 Hz 37.9%,
 *   500 Hz 3.9%) is NOT a -12 dB/octave slope. Per octave it runs +6.9, -1.1,
 *   -9.9 dB: a peak at 125 Hz, a shelf to 250 Hz, then a cliff. That is the
 *   shape of a band-limited harmonic stack, not of a filter. The -12.3 dB/oct
 *   figure is a regression artifact from fitting across the empty octaves above
 *   500 Hz.
 *
 * So there is no shaping filter here. Sine oscillators have nothing above their
 * fundamental by construction, and the voice gains are set to reproduce the
 * measured band energy. The one lowpass in the chain sits at 400 Hz purely to
 * catch AM sidebands when the 40 Hz experiment is switched on.
 *
 * Note also that the 63 Hz band (45-90 Hz) contains no partial at all — the
 * lowest is A2 at 109.7 Hz. Its 9.8% is room and difference-tone energy, and
 * 55.2 Hz (the A2/E3 difference tone, 164.9 - 109.7) falls squarely in it. That
 * is independent corroboration that the "55 Hz envelope" in the source is a
 * difference tone, not a designed modulation. It is not synthesised here,
 * because inventing it would be manufacturing a mechanism.
 */

export type ChordQuality = 'min7' | 'maj7' | 'min' | 'maj' | 'sus4' | 'min9';

/** Semitones from the root. Five voices, matching the source's voicing. */
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  min7: [0, 3, 7, 10, 15],
  maj7: [0, 4, 7, 11, 16],
  min: [0, 3, 7, 12, 15],
  maj: [0, 4, 7, 12, 16],
  sus4: [0, 5, 7, 12, 17],
  min9: [0, 3, 7, 10, 14],
};

/**
 * Voice amplitudes from the measured octave energy. A2/C3/E3 fall in the 125 Hz
 * band (48.4%), G3/C4 in the 250 Hz band (37.9%). Distributing each band's
 * power equally among its voices and taking square roots gives amplitudes that
 * are very nearly equal — and slightly *rising* toward the top. Which is the
 * point: the source does not roll off.
 *
 * Normalised so the amplitudes sum to 1, bounding the coherent-sum peak.
 */
const VOICE_AMPLITUDES = [0.1936, 0.1936, 0.1936, 0.2097, 0.2097];

/** Deliberately non-commensurate so voices never settle into a fixed pattern. */
const SWELL_RATES = [0.0231, 0.0347, 0.0413, 0.0571, 0.0673];
const DETUNE_RATES = [0.0119, 0.0163, 0.0197, 0.0271, 0.0313];

const MIDI_A2 = 45;
const SWELL_DB = 4;

export interface DroneOptions {
  rootMidi?: number;
  quality?: ChordQuality;
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
  swell: OscillatorNode;
  swellDepth: GainNode;
  detuneLfo: OscillatorNode;
  detuneDepth: GainNode;
  baseDetune: number;
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Drone {
  readonly output: GainNode;
  private ctx: BaseAudioContext;
  private voices: Voice[] = [];
  private sum: GainNode;
  private am: GainNode;
  private amOsc: OscillatorNode;
  private amDepth: GainNode;
  private lowpass: BiquadFilterNode;
  private rootMidi: number;
  private quality: ChordQuality;
  private started = false;

  constructor(ctx: BaseAudioContext, opts: DroneOptions = {}) {
    this.ctx = ctx;
    this.rootMidi = opts.rootMidi ?? MIDI_A2;
    this.quality = opts.quality ?? 'min7';

    this.sum = ctx.createGain();
    this.sum.gain.value = 1;

    // 40 Hz amplitude modulation, off by default. gain = (1 - d/2) + (d/2)*sin,
    // so at depth 1 the envelope swings fully to zero and at depth 0 the node is
    // transparent.
    this.am = ctx.createGain();
    this.am.gain.value = 1;
    this.amOsc = ctx.createOscillator();
    this.amOsc.frequency.value = 40;
    this.amDepth = ctx.createGain();
    this.amDepth.gain.value = 0;
    this.amOsc.connect(this.amDepth).connect(this.am.gain);

    // Sideband insurance only. The 40 Hz AM puts sidebands at 260.4 +/- 40 Hz
    // (220 / 300 Hz), well inside this. Nothing here is doing spectral shaping.
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 400;
    this.lowpass.Q.value = Math.SQRT1_2;

    this.output = ctx.createGain();
    this.output.gain.value = 0;

    this.sum.connect(this.am).connect(this.lowpass).connect(this.output);
    this.buildVoices();
  }

  private buildVoices(): void {
    const ctx = this.ctx;
    const intervals = CHORD_INTERVALS[this.quality];
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = midiToHz(this.rootMidi + intervals[i]);
      const baseDetune = (Math.random() * 2 - 1) * 5; // +/-5 cents
      osc.detune.value = baseDetune;

      const gain = ctx.createGain();
      const a = VOICE_AMPLITUDES[i];
      // Swell of +/-2 dB around the base amplitude, linearised.
      const hi = Math.pow(10, SWELL_DB / 40);
      const lo = 1 / hi;
      gain.gain.value = a * (hi + lo) / 2;

      const swell = ctx.createOscillator();
      swell.type = 'sine';
      swell.frequency.value = SWELL_RATES[i];
      const swellDepth = ctx.createGain();
      swellDepth.gain.value = (a * (hi - lo)) / 2;
      swell.connect(swellDepth).connect(gain.gain);

      // Slow independent pitch wander so the voices never phase-lock into a
      // fixed beat pattern.
      const detuneLfo = ctx.createOscillator();
      detuneLfo.type = 'sine';
      detuneLfo.frequency.value = DETUNE_RATES[i];
      const detuneDepth = ctx.createGain();
      detuneDepth.gain.value = 3;
      detuneLfo.connect(detuneDepth).connect(osc.detune);

      osc.connect(gain).connect(this.sum);
      this.voices.push({ osc, gain, swell, swellDepth, detuneLfo, detuneDepth, baseDetune });
    }
  }

  /**
   * Called once. Every oscillator runs for the lifetime of the context.
   *
   * This is the constraint that matters for this layer: amplitude may vary,
   * but nothing may *begin*. A note that starts is an event, and events are
   * exactly what pulls attention back after eight hours.
   */
  start(when: number): void {
    if (this.started) return;
    this.started = true;
    for (const v of this.voices) {
      v.osc.start(when);
      v.swell.start(when);
      v.detuneLfo.start(when);
    }
    this.amOsc.start(when);
  }

  setLevel(linear: number, when: number, tc = 0.1): void {
    this.output.gain.setTargetAtTime(linear, when, tc);
  }

  /** Retunes in place. No restart, so no onset. */
  setChord(rootMidi: number, quality: ChordQuality): void {
    this.rootMidi = rootMidi;
    this.quality = quality;
    const intervals = CHORD_INTERVALS[quality];
    const t = this.ctx.currentTime;
    for (let i = 0; i < this.voices.length; i++) {
      this.voices[i].osc.frequency.setTargetAtTime(midiToHz(rootMidi + intervals[i]), t, 0.4);
    }
  }

  /** 0 to 1. Off by default; this is an experiment, not a feature of the source. */
  setAmDepth(depth: number): void {
    const d = Math.max(0, Math.min(1, depth));
    const t = this.ctx.currentTime;
    this.am.gain.setTargetAtTime(1 - d / 2, t, 0.05);
    this.amDepth.gain.setTargetAtTime(d / 2, t, 0.05);
  }

  setAmFrequency(hz: number): void {
    this.amOsc.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.05);
  }
}
