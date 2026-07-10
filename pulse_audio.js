/*
 * PulseAudio — drop-in audio engine for heartbeat_visualizer.html
 *
 * REQUIRES: Tone.js (add this to your HTML head first):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
 *   <script src="pulse_audio.js"></script>
 *
 * USAGE:
 *   1. await PulseAudio.init()      // after user gesture (button click)
 *   2. PulseAudio.beat()            // call on every heartbeat
 *   3. PulseAudio.setHRVMod(true)   // enable HRV → sound mapping
 *
 * That's the minimum. Everything else is optional tuning.
 */

const PulseAudio = (() => {
  // ============================================================
  // STATE
  // ============================================================
  
  let initialized = false;
  let audioGraph = null;
  let hrvModEnabled = false;
  let lastBeatTime = 0;
  let ibiBuffer = [];
  const IBI_BUFFER_SIZE = 12;
  let currentRMSSD = 0;
  
  // Chord voicings (Tone.js note names)
  const CHORDS = {
    'Am':     ['A3', 'C4', 'E4', 'A4'],
    'Cmaj7':  ['C3', 'E3', 'G3', 'B3'],
    'Dm9':    ['D3', 'F3', 'A3', 'E4'],
    'Fmaj7':  ['F2', 'A3', 'C4', 'E4'],
    'G6':     ['G2', 'D3', 'E3', 'B3'],
    'Emin':   ['E2', 'G3', 'B3', 'E4']
  };
  let currentChord = 'Am';
  
  // Per-layer configuration (change via .setLayer())
  const layers = {
    1: { pitch: 'C2',  level: -6  },  // R-peak (kick, t=0)
    2: { pitch: 'A1',  level: -14 },  // T-wave (bass, t+100ms)
    3: { pitch: 'E4',  level: -18 },  // Pulse arrival (FM, t+250ms)
    4: {                level: -20 }  // Late HEP (chord pad, t+400ms)
  };
  
  // HRV mapping ranges (tune these to your typical audience)
  const HRV_MIN_MS = 15;
  const HRV_MAX_MS = 100;
  const FILTER_LOW = 400;    // Layer 3 filter at low HRV (dark/closed)
  const FILTER_HIGH = 6000;  // Layer 3 filter at high HRV (bright/open)
  const REVERB_LOW = 0.15;   // Layer 4 reverb at low HRV (dry/tight)
  const REVERB_HIGH = 0.85;  // Layer 4 reverb at high HRV (spacious)
  
  // ============================================================
  // AUDIO GRAPH CONSTRUCTION
  // ============================================================
  
  function buildAudioGraph() {
    const master = new Tone.Compressor({
      threshold: -18, ratio: 3, attack: 0.01, release: 0.2
    }).toDestination();
    
    // LAYER 1: R-peak percussive kick
    const l1Vol = new Tone.Volume(layers[1].level).connect(master);
    const l1 = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 }
    }).connect(l1Vol);
    
    // LAYER 2: T-wave sub bass
    const l2Vol = new Tone.Volume(layers[2].level).connect(master);
    const l2 = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.3, sustain: 0.3, release: 1.2 },
      filterEnvelope: {
        attack: 0.1, decay: 0.4, sustain: 0.2, release: 1.0,
        baseFrequency: 60, octaves: 2
      }
    }).connect(l2Vol);
    
    // LAYER 3: Pulse arrival FM through filter
    const l3Filter = new Tone.Filter({ frequency: 2000, type: 'lowpass', Q: 2 });
    const l3Vol = new Tone.Volume(layers[3].level);
    l3Filter.connect(l3Vol);
    l3Vol.connect(master);
    const l3 = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 8,
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.5 }
    }).connect(l3Filter);
    
    // LAYER 4: Late HEP chord pad
    const l4Reverb = new Tone.Reverb({ decay: 4, wet: 0.6 });
    const l4Vol = new Tone.Volume(layers[4].level);
    l4Reverb.connect(l4Vol);
    l4Vol.connect(master);
    const l4 = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.3, decay: 0.8, sustain: 0.4, release: 3.0 }
    }).connect(l4Reverb);
    l4.volume.value = -8;
    
    return { master, l1, l1Vol, l2, l2Vol, l3, l3Vol, l3Filter, l4, l4Vol, l4Reverb };
  }
  
  // ============================================================
  // HRV COMPUTATION (RMSSD)
  // ============================================================
  
  function computeRMSSD(ibis) {
    if (ibis.length < 2) return 0;
    let sumSquaredDiffs = 0;
    for (let i = 1; i < ibis.length; i++) {
      const diff = ibis[i] - ibis[i - 1];
      sumSquaredDiffs += diff * diff;
    }
    return Math.sqrt(sumSquaredDiffs / (ibis.length - 1));
  }
  
  function addIBI(ibiMs) {
    if (ibiMs < 300 || ibiMs > 2000) return; // reject implausible
    ibiBuffer.push(ibiMs);
    if (ibiBuffer.length > IBI_BUFFER_SIZE) ibiBuffer.shift();
    if (ibiBuffer.length >= 3) {
      currentRMSSD = computeRMSSD(ibiBuffer);
    }
  }
  
  function applyHRVMapping() {
    if (!audioGraph) return;
    const clamped = Math.max(HRV_MIN_MS, Math.min(HRV_MAX_MS, currentRMSSD));
    const norm = (clamped - HRV_MIN_MS) / (HRV_MAX_MS - HRV_MIN_MS);
    
    const filterHz = FILTER_LOW * Math.pow(FILTER_HIGH / FILTER_LOW, norm);
    const reverbWet = REVERB_LOW + (REVERB_HIGH - REVERB_LOW) * norm;
    
    audioGraph.l3Filter.frequency.rampTo(filterHz, 0.2);
    audioGraph.l4Reverb.wet.rampTo(reverbWet, 0.2);
  }
  
  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    /**
     * Initialize audio graph. Must be called from a user gesture handler
     * (button click) or browsers will refuse to start audio.
     * @returns {Promise<void>}
     */
    async init() {
      if (initialized) return;
      await Tone.start();
      audioGraph = buildAudioGraph();
      initialized = true;
    },
    
    /**
     * Trigger one heartbeat. Fires the four-layer cascade over ~500ms.
     * Automatically computes IBI from time since last beat call
     * (used for HRV if you don't provide explicit IBI values).
     */
    beat() {
      if (!initialized || !audioGraph) return;
      
      const now = Tone.now();
      
      // Auto-track IBI from beat timing
      const nowMs = performance.now();
      if (lastBeatTime > 0) {
        const ibi = nowMs - lastBeatTime;
        addIBI(ibi);
        if (hrvModEnabled) applyHRVMapping();
      }
      lastBeatTime = nowMs;
      
      // Trigger the cascade
      audioGraph.l1.triggerAttackRelease(layers[1].pitch, '16n', now);
      audioGraph.l2.triggerAttackRelease(layers[2].pitch, '4n', now + 0.100);
      audioGraph.l3.triggerAttackRelease(layers[3].pitch, '8n', now + 0.250);
      audioGraph.l4.triggerAttackRelease(CHORDS[currentChord], '2n', now + 0.400);
    },
    
    /**
     * Provide an explicit IBI value. Optional — beat() auto-tracks this.
     * Use this if you have a more accurate hardware IBI (e.g. from Arduino).
     * @param {number} ibiMs Inter-beat interval in milliseconds.
     */
    setIBI(ibiMs) {
      // Overwrite last auto-tracked IBI with hardware value
      if (ibiBuffer.length > 0) ibiBuffer[ibiBuffer.length - 1] = ibiMs;
      else addIBI(ibiMs);
      if (ibiBuffer.length >= 3) {
        currentRMSSD = computeRMSSD(ibiBuffer);
        if (hrvModEnabled) applyHRVMapping();
      }
    },
    
    /**
     * Enable or disable HRV-driven sound modulation.
     * When enabled, layer 3 filter and layer 4 reverb are driven by RMSSD.
     * @param {boolean} on
     */
    setHRVMod(on) {
      hrvModEnabled = !!on;
      if (hrvModEnabled && currentRMSSD > 0) applyHRVMapping();
    },
    
    /**
     * Get the current RMSSD value (short-term HRV metric) in ms.
     * Use this to update your UI display.
     * @returns {number} RMSSD in ms, or 0 if not enough beats yet.
     */
    getRMSSD() {
      return currentRMSSD;
    },
    
    /**
     * Set the chord for layer 4 (late HEP pad).
     * @param {string} name One of: Am, Cmaj7, Dm9, Fmaj7, G6, Emin
     */
    setChord(name) {
      if (CHORDS[name]) currentChord = name;
    },
    
    /**
     * Get available chord names for populating your UI.
     * @returns {string[]}
     */
    getChords() {
      return Object.keys(CHORDS);
    },
    
    /**
     * Adjust a layer's level in dB.
     * @param {number} layerNum 1-4
     * @param {number} dB Typical range: -60 (silent) to 0 (loudest)
     */
    setLayerLevel(layerNum, dB) {
      if (!audioGraph) return;
      const volNode = audioGraph[`l${layerNum}Vol`];
      if (volNode) volNode.volume.rampTo(dB, 0.05);
      if (layers[layerNum]) layers[layerNum].level = dB;
    },
    
    /**
     * Set the pitch for a percussive layer (1, 2, or 3).
     * Layer 4 uses chords instead.
     * @param {number} layerNum 1, 2, or 3
     * @param {string} note Tone.js note (e.g. 'C2', 'A#3', 'E4')
     */
    setLayerPitch(layerNum, note) {
      if (layers[layerNum] && layerNum !== 4) {
        layers[layerNum].pitch = note;
      }
    },
    
    /**
     * Directly set the layer 3 filter cutoff. Ignored while HRV mod is on.
     * @param {number} hz Frequency in Hz
     */
    setFilter(hz) {
      if (!audioGraph || hrvModEnabled) return;
      audioGraph.l3Filter.frequency.rampTo(hz, 0.05);
    },
    
    /**
     * Directly set the layer 4 reverb amount. Ignored while HRV mod is on.
     * @param {number} wet 0 to 1
     */
    setReverb(wet) {
      if (!audioGraph || hrvModEnabled) return;
      audioGraph.l4Reverb.wet.rampTo(wet, 0.05);
    },
    
    /**
     * True if HRV modulation is currently enabled.
     */
    isHRVModEnabled() {
      return hrvModEnabled;
    },
    
    /**
     * True if audio graph is initialized and ready.
     */
    isReady() {
      return initialized;
    }
  };
})();
