/*
 * PulseSequencer — tempo-quantized heartbeat sonification
 *
 * Instead of playing a sound on every heartbeat (biological timing),
 * this runs a steady musical clock (default 90 BPM) and at each tick
 * polls the current average heart rate reading, then fires the same
 * four-layer cascade as the heartbeat mode (kick -> sub bass -> FM
 * pulse -> chord pad, staggered over ~500ms). The reading drives HOW
 * the cascade sounds, not WHEN it plays:
 *
 *   - Pitch:  the whole cascade is transposed along a pentatonic
 *             ladder — low reading = shifted down, high = shifted up
 *   - Volume: higher reading = louder cascade
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
  let graph = null;
  let loop = null;
  let running = false;
  let bpmSource = () => 0;

  // Transposition ladder in semitones — A minor pentatonic steps
  // spanning an octave down to an octave up from the base voicing,
  // so mid-range readings sit near the cascade's natural pitch
  const OFFSETS = [-12, -9, -7, -5, -2, 0, 3, 5, 7, 10, 12];

  // Heart rate range mapped across the ladder (~10 BPM per step)
  const BPM_MIN = 40;
  const BPM_MAX = 140;

  // Base pitches per layer — same voicing as the heartbeat cascade
  const BASE = {
    kick: 'C2',
    bass: 'A1',
    fm: 'E4'
  };

  // Chord voicings — same set as pulse_audio.js so the chord selector
  // drives both sound modes identically
  const CHORDS = {
    'Am':     ['A3', 'C4', 'E4', 'A4'],
    'Cmaj7':  ['C3', 'E3', 'G3', 'B3'],
    'Dm9':    ['D3', 'F3', 'A3', 'E4'],
    'Fmaj7':  ['F2', 'A3', 'C4', 'E4'],
    'G6':     ['G2', 'D3', 'E3', 'B3'],
    'Emin':   ['E2', 'G3', 'B3', 'E4']
  };
  let currentChord = 'Am';

  // Four-layer graph mirroring pulse_audio.js so both sound modes
  // share one sonic identity
  function buildGraph() {
    const master = new Tone.Compressor({
      threshold: -18, ratio: 3, attack: 0.01, release: 0.2
    }).toDestination();

    const kickVol = new Tone.Volume(-6).connect(master);
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 }
    }).connect(kickVol);

    const bassVol = new Tone.Volume(-14).connect(master);
    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.3, sustain: 0.3, release: 1.2 },
      filterEnvelope: {
        attack: 0.1, decay: 0.4, sustain: 0.2, release: 1.0,
        baseFrequency: 60, octaves: 2
      }
    }).connect(bassVol);

    const fmVol = new Tone.Volume(-18).connect(master);
    const fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 8,
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.5 }
    }).connect(fmVol);

    const padReverb = new Tone.Reverb({ decay: 4, wet: 0.5 });
    const padVol = new Tone.Volume(-20);
    padReverb.connect(padVol);
    padVol.connect(master);
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.3, decay: 0.8, sustain: 0.4, release: 3.0 }
    }).connect(padReverb);
    pad.volume.value = -8;

    return { master, kick, bass, fm, pad };
  }

  function transpose(note, semitones) {
    return Tone.Frequency(note).transpose(semitones).toNote();
  }

  return {
    async init() {
      if (initialized) return;
      await Tone.start();
      graph = buildGraph();
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

          const offset = OFFSETS[Math.round(norm * (OFFSETS.length - 1))];
          const velocity = 0.3 + norm * 0.7;  // higher reading = louder

          // Same stagger as the heartbeat cascade. The kick transposes
          // at half depth so the low thump stays audible at the extremes.
          graph.kick.triggerAttackRelease(
            transpose(BASE.kick, Math.round(offset / 2)), '16n', time, velocity);
          graph.bass.triggerAttackRelease(
            transpose(BASE.bass, offset), '4n', time + 0.100, velocity);
          graph.fm.triggerAttackRelease(
            transpose(BASE.fm, offset), '8n', time + 0.250, velocity);
          // Selected chord voicing, transposed by the BPM offset
          graph.pad.triggerAttackRelease(
            CHORDS[currentChord].map(n => transpose(n, offset)), '2n', time + 0.400, velocity * 0.8);
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

    /** Set the chord voicing for the pad layer (matches pulse_audio.js). */
    setChord(name) {
      if (CHORDS[name]) currentChord = name;
    },

    isRunning() {
      return running;
    }
  };
})();
