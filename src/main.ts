import { Engine, DEFAULT_STATE } from './audio/engine.ts';
import { BAND_CENTERS, BAND_MIN_DB, BAND_MAX_DB } from './audio/shaper.ts';
import { CHORD_INTERVALS, type ChordQuality } from './audio/drone.ts';
import { HEADROOM_CEILING_DB } from './audio/output.ts';
import type { NoiseKind } from './dsp/noise.ts';
import { el, slider, toggleGroup, section } from './ui/controls.ts';
import { Spectrum } from './ui/spectrum.ts';

/**
 * Engine build. Steps 1-3 of the build order: generators, ten-band shaper,
 * drone bus. The interface is deliberately plain — the design pass is separate
 * work and this is not a preview of it.
 *
 * Presets, calibration, persistence and URL state are step 6 and are not here.
 * The one exception is the speech-masking starting curve below, because that is
 * the reason the app exists and it costs nothing to ship a sensible default.
 */

/**
 * Speech masking. Energy concentrated 1-4 kHz, rolled off above 6 kHz to keep
 * an eight-hour session from turning into hiss fatigue, low end pulled well
 * back so it does not just add rumble.
 *
 * These are shaper gains applied on top of pink noise, which already falls
 * 3 dB/octave, so the cuts at the bottom are undoing pink's natural tilt before
 * the boosts do their work.
 */
const SPEECH_MASK = [-20, -16, -12, -8, -3, 6, 9, 7, -4, -12];
const FLAT = new Array(BAND_CENTERS.length).fill(0);

const engine = new Engine();
const app = document.getElementById('app')!;
let spectrum: Spectrum | null = null;

const bandInputs: HTMLInputElement[] = [];
const bandOuts: HTMLOutputElement[] = [];
let rateInput: HTMLInputElement;

const fmtDb = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;

function setBands(values: number[]): void {
  for (let i = 0; i < values.length; i++) {
    engine.setBand(i, values[i]);
    bandInputs[i].value = String(values[i]);
    bandOuts[i].textContent = fmtDb(values[i]);
  }
}

/* ---------------------------------------------------------------- header */

app.append(
  el('h1', {}, ['Noisefloor']),
  el('p', { class: 'note' }, [
    'Engine build. Everything is synthesised in real time — no samples, no loops, ' +
    'nothing repeats. Interface is unstyled on purpose; the design pass is separate work.',
  ]),
);

/* ------------------------------------------------------------- transport */

const startBtn = el('button', { type: 'button', class: 'primary' }, ['Start']) as HTMLButtonElement;
const statusEl = el('span', { class: 'stat', role: 'status' }, ['stopped']);

startBtn.addEventListener('click', async () => {
  // Audio starts only on an explicit gesture, and the context is resumed here
  // rather than at load, because browsers create it suspended.
  if (engine.running) {
    startBtn.textContent = 'Stopping…';
    startBtn.disabled = true;
    await engine.stop();
    spectrum?.stop();
    startBtn.textContent = 'Start';
    startBtn.disabled = false;
    statusEl.textContent = 'stopped';
  } else {
    startBtn.textContent = 'Starting…';
    startBtn.disabled = true;
    await engine.start();
    if (!spectrum && engine.output && engine.shaper) {
      spectrum = new Spectrum(canvas, engine.output.analyser, engine.shaper);
    }
    spectrum?.start();
    startBtn.textContent = 'Stop';
    startBtn.disabled = false;
    statusEl.textContent = `running · ${engine.ctx!.sampleRate} Hz`;
    updateLevelReadout();
  }
});

const levelOut = el('span', { class: 'stat' }, ['']);
const level = slider({
  label: 'Level',
  min: 0, max: 1, step: 0.01, value: DEFAULT_STATE.level,
  format: (v) => `${Math.round(v * 100)}%`,
  onInput: (v) => {
    engine.setLevel(v);
    updateLevelReadout();
  },
});

function updateLevelReadout(): void {
  const o = engine.output;
  levelOut.textContent = o ? `${o.levelDbfs.toFixed(1)} dBFS` : `ceiling ${HEADROOM_CEILING_DB} dBFS`;
}
updateLevelReadout();

const overrideBox = el('input', { type: 'checkbox', id: 'override' }) as HTMLInputElement;
overrideBox.addEventListener('change', () => {
  engine.output?.setOverride(overrideBox.checked);
  updateLevelReadout();
});

const timerSelect = el('select', { 'aria-label': 'Fade-out timer' }, []) as HTMLSelectElement;
for (const [v, t] of [['0', 'No timer'], ['30', 'Fade out after 30 min'], ['60', 'after 60 min'], ['90', 'after 90 min']]) {
  timerSelect.append(el('option', { value: v }, [t]));
}
timerSelect.addEventListener('change', () => {
  const m = parseInt(timerSelect.value, 10);
  if (!engine.output) return;
  if (m === 0) engine.output.cancelFadeOut();
  else engine.output.scheduleFadeOut(m, () => { statusEl.textContent = 'faded out'; });
});

app.append(
  section('Transport', [
    el('div', { class: 'controls' }, [startBtn, statusEl, timerSelect]),
    level.row,
    el('div', { class: 'row' }, [
      el('label', { for: 'override' }, ['Headroom']),
      el('div', { class: 'controls' }, [
        overrideBox,
        el('label', { for: 'override' }, [`Allow above ${HEADROOM_CEILING_DB} dBFS`]),
      ]),
      levelOut,
    ]),
    el('p', { class: 'warn' }, [
      `The ${HEADROOM_CEILING_DB} dBFS cap is a headroom limit, not a loudness limit. ` +
      'It cannot know your headphone sensitivity, your DAC, or your system volume, ' +
      'so it cannot promise an SPL. What it can tell you: sustained daily exposure ' +
      'above roughly 70 dB SPL carries cumulative hearing-damage risk over years, and ' +
      'this app is built for eight-hour days. Set the level by raising it only until ' +
      'speech around you stops being intelligible, then stop. Louder is not better here.',
    ]),
  ]),
);

/* ------------------------------------------------------------- generator */

app.append(
  section('Generator', [
    toggleGroup(
      [
        { value: 'white', label: 'White · 0 dB/oct' },
        { value: 'pink', label: 'Pink · −3 dB/oct' },
        { value: 'brown', label: 'Brown · −6 dB/oct' },
      ],
      DEFAULT_STATE.kind,
      (v) => engine.setKind(v as NoiseKind),
    ),
    slider({
      label: 'Width',
      min: 0, max: 1, step: 0.01, value: 1 - DEFAULT_STATE.correlation,
      format: (v) => (v === 0 ? 'mono' : `${Math.round(v * 100)}%`),
      onInput: (v) => engine.setCorrelation(1 - v),
    }).row,
    el('p', { class: 'note' }, [
      'Width mixes a shared stream with two independent ones. Fully decorrelated ' +
      'channels are very wide and get unstable over a long session, so the default ' +
      'sits at 30%.',
    ]),
  ]),
);

/* ---------------------------------------------------------------- shaper */

const bandRows: Node[] = [];
for (let i = 0; i < BAND_CENTERS.length; i++) {
  const f = BAND_CENTERS[i];
  const s = slider({
    label: f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`,
    min: BAND_MIN_DB, max: BAND_MAX_DB, step: 0.5, value: 0,
    format: fmtDb,
    onInput: (v) => engine.setBand(i, v),
  });
  bandInputs.push(s.input);
  bandOuts.push(s.out);
  bandRows.push(s.row);
}

const canvas = el('canvas', { 'aria-label': 'Output spectrum and shaper response' }) as HTMLCanvasElement;

app.append(
  section('Ten-band shaper', [
    el('div', { class: 'controls' }, [
      (() => { const b = el('button', { type: 'button' }, ['Speech masking']); b.addEventListener('click', () => setBands(SPEECH_MASK)); return b; })(),
      (() => { const b = el('button', { type: 'button' }, ['Flat']); b.addEventListener('click', () => setBands(FLAT)); return b; })(),
    ]),
    ...bandRows,
    el('p', { class: 'note' }, [
      `Bands bottom out at ${BAND_MIN_DB} dB, not silence: a peaking filter driven to ` +
      'minus infinity is a narrow notch, not a removed octave. Neighbouring bands also ' +
      'overlap — each is one octave wide and they sit one octave apart — so the curve ' +
      'you get is not quite the curve you drew. The plot below shows the real one.',
    ]),
    canvas,
    el('div', { class: 'legend' }, [
      el('span', {}, [el('i', { style: 'background:var(--sig)' }), 'live output']),
      el('span', {}, [el('i', { style: 'background:var(--dim)' }), 'shaper response']),
      el('span', {}, [el('i', { style: 'background:var(--hot)' }), '1–4 kHz speech band']),
    ]),
  ]),
);

/* ----------------------------------------------------------------- drift */

app.append(
  section('Drift', [
    slider({
      label: 'Depth',
      min: 0, max: 3, step: 0.1, value: DEFAULT_STATE.driftDepth,
      format: (v) => (v === 0 ? 'off' : `±${v.toFixed(1)} dB`),
      onInput: (v) => engine.setDrift(v, parseFloat(rateInput.value)),
    }).row,
    (() => {
      const s = slider({
        label: 'Rate',
        min: 0, max: 1, step: 0.01, value: DEFAULT_STATE.driftRate,
        format: (v) => (v < 0.33 ? 'barely' : v < 0.67 ? 'slow' : 'noticeable'),
        onInput: (v) => engine.setDrift(engine.getState().driftDepth, v),
      });
      rateInput = s.input;
      return s.row;
    })(),
    el('p', { class: 'note' }, [
      'Each band wanders independently around the value you set. A completely static ' +
      'spectrum becomes predictable and the ear starts to hear through it; slight ' +
      'movement keeps it reading as texture. The walk runs on the audio thread, so it ' +
      'keeps going when the tab is hidden.',
    ]),
  ]),
);

/* ----------------------------------------------------------------- drone */

const droneBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, ['Drone off']) as HTMLButtonElement;
droneBtn.addEventListener('click', () => {
  const on = droneBtn.getAttribute('aria-pressed') !== 'true';
  droneBtn.setAttribute('aria-pressed', String(on));
  droneBtn.textContent = on ? 'Drone on' : 'Drone off';
  engine.setDroneOn(on);
});

const qualitySelect = el('select', { 'aria-label': 'Chord quality' }, []) as HTMLSelectElement;
for (const q of Object.keys(CHORD_INTERVALS)) qualitySelect.append(el('option', { value: q }, [q]));
qualitySelect.value = DEFAULT_STATE.droneQuality;

const rootSelect = el('select', { 'aria-label': 'Root note' }, []) as HTMLSelectElement;
const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
for (let m = 33; m <= 57; m++) {
  rootSelect.append(el('option', { value: String(m) }, [`${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`]));
}
rootSelect.value = String(DEFAULT_STATE.droneRoot);

const applyChord = () =>
  engine.setDroneChord(parseInt(rootSelect.value, 10), qualitySelect.value as ChordQuality);
qualitySelect.addEventListener('change', applyChord);
rootSelect.addEventListener('change', applyChord);

app.append(
  section('Tonal drone', [
    el('p', { class: 'note' }, [
      'A separate layer on its own bus. It is not part of the masking signal and does ' +
      'not help mask speech — that is the shaper’s job.',
    ]),
    el('div', { class: 'controls' }, [droneBtn, rootSelect, qualitySelect]),
    slider({
      label: 'Level',
      min: 0, max: 1, step: 0.01, value: DEFAULT_STATE.droneLevel,
      format: (v) => `${Math.round(v * 100)}%`,
      onInput: (v) => engine.setDroneLevel(v),
    }).row,
    slider({
      label: '40 Hz AM',
      min: 0, max: 1, step: 0.01, value: 0,
      format: (v) => (v === 0 ? 'off' : `${Math.round(v * 100)}%`),
      onInput: (v) => engine.setDroneAmDepth(v),
    }).row,
    el('p', { class: 'warn' }, [
      'Where this layer came from, stated accurately. It is modelled on a commercial ' +
      '"40 Hz gamma" track. Measured, the 40 Hz claim does not survive: there is no ' +
      'dichotic carrier pair and no meaningful 40 Hz amplitude modulation in the signal. ' +
      'What is in it is a sustained Am7 pad — partials at 109.7, 131.2, 164.9, 196.5 and ' +
      '260.4 Hz, all within 10 cents of A2, C3, E3, G3 and C4. The 55 Hz envelope rate ' +
      'people point to is a difference tone between the A2 and E3 partials ' +
      '(164.9 − 109.7 = 55.2 Hz), not a designed modulation. ' +
      'The gamma research (MIT/Tsai, GENUS) used amplitude-modulated stimuli, and it is ' +
      'largely preclinical and aimed at neurodegeneration, not focus. ' +
      'The 40 Hz AM control above is an experiment so you can A/B the real GENUS-style ' +
      'stimulus against what the source track actually contained. ' +
      'If you like how this sounds, that is a sufficient reason to use it. No mechanism required.',
    ]),
  ]),
);

/* ------------------------------------------------------------ diagnostics */

const cpuEl = el('span', { class: 'stat', id: 'cpu-stat' }, ['audio thread: not running']);
const peakEl = el('span', { class: 'stat', id: 'peak-stat' }, ['generator output: —']);
engine.onCpu = (r) => {
  cpuEl.textContent =
    `audio thread: ${r.msPerQuantum.toFixed(3)} ms per ${r.budgetMs.toFixed(2)} ms quantum ` +
    `(${((r.msPerQuantum / r.budgetMs) * 100).toFixed(1)}% of budget, over ${r.quanta} quanta)`;
  const db = 20 * Math.log10(Math.max(1e-7, r.sourcePeak));
  peakEl.textContent = `generator output: ${db.toFixed(1)} dBFS peak (pre-shaper)`;
};

app.append(
  section('Diagnostics', [
    el('div', { class: 'stack' }, [
      cpuEl,
      peakEl,
      el('span', { class: 'stat' }, [
        `reduced motion: ${window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on — visuals still, audio drift unaffected' : 'off'}`,
      ]),
    ]),
  ]),
);

// Tab visibility deliberately does nothing. The AudioContext and both worklets
// run on the audio thread and are not throttled by a hidden tab; the only
// main-thread work is drawing, which the browser pauses on its own.
// Known limitation: iOS Safari suspends the AudioContext when the page is
// backgrounded or the screen locks, and there is no workaround that does not
// involve playing a media file, which this app does not do.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) spectrum?.stop();
  else if (engine.running) spectrum?.start();
});
