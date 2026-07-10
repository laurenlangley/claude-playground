/*
 * PulseSequencer — tempo-quantized heartbeat sonification
 *
 * Instead of playing a sound on every heartbeat (biological timing),
 * this runs a steady musical clock (default 90 BPM) and at each tick
 * polls the current average heart rate reading. The reading drives
 * WHAT plays, not WHEN:
 *
 *   - Pitch:  heart BPM mapped onto a minor pentatonic scale
 *             (low reading = low note, high reading = high note)
 *   - Volume: higher reading = louder note
 *   - Rest:   no reading (no finger) = silence on that tick
 *
 * REQUIRES: Tone.js (same as pulse_audio.js)
 *
 * USAGE:
 *   await PulseSequencer.init()                  // inside a user gesture
 *   PulseSequencer.setBPMSource(() => avgBPM)    // 0 = rest
 *   PulseSequencer.start(90)                     // musical tempo
 *   PulseSequencer.stop()
 */

const PulseSequencer = (() => {
  let initialized = false;
  let synth = null;
  let reverb = null;
  let loop = null;
  let running = false;
  let bpmSource = () => 0;

  // A minor pentatonic across ~2.5 octaves — always consonant, so any
  // reading-to-note mapping sounds musical
  const SCALE = ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5'];

  // Heart rate range mapped across the scale
  const BPM_MIN = 40;
  const BPM_MAX = 140;

  return {
    async init() {
      if (initialized) return;
      await Tone.start();
      reverb = new Tone.Reverb({ decay: 3, wet: 0.35 }).toDestination();
      synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.15, release: 0.6 }
      }).connect(reverb);
      synth.volume.value = -8;
      initialized = true;
    },

    /**
     * Register the polling callback. Called once per tick; return the
     * current average heart BPM, or 0/falsy to rest.
     */
    setBPMSource(fn) {
      bpmSource = fn;
    },

    /** Start the clock at the given musical tempo (quarter-note ticks). */
    start(tempo = 90) {
      if (!initialized) return;
      Tone.Transport.bpm.value = tempo;
      if (!loop) {
        loop = new Tone.Loop((time) => {
          const bpm = bpmSource();
          if (!bpm) return;  // no reading — rest this tick

          const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
          const norm = (clamped - BPM_MIN) / (BPM_MAX - BPM_MIN);

          const note = SCALE[Math.round(norm * (SCALE.length - 1))];
          const velocity = 0.25 + norm * 0.75;  // higher reading = louder

          synth.triggerAttackRelease(note, '8n', time, velocity);
        }, '4n');
      }
      loop.start(0);
      Tone.Transport.start();
      running = true;
    },

    stop() {
      if (loop) loop.stop();
      Tone.Transport.stop();
      running = false;
    },

    /** Change the musical tempo while running. */
    setTempo(tempo) {
      Tone.Transport.bpm.value = tempo;
    },

    isRunning() {
      return running;
    }
  };
})();
