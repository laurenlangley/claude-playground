# Architecture proposal — checkpoint before step 1

Nothing in this document is built yet. It exists to be argued with.

Four things in the brief, implemented literally, produce the opposite of what the
brief asks for. Those are section 1. Everything after is the plan as written.

---

## 1. Four objections

### 1.1 The calibration flow, as specified, will pull energy *out* of the speech band

The brief says: play a narrow-band tone at each octave center, user raises level
until just audible, store the offset curve, apply as per-band trim.

That measures **detection threshold**. The app operates at roughly 55–65 phon.
The ear's frequency response is not the same shape at those two levels — it
flattens substantially as level rises. Applying the inverse of a threshold curve
as a trim at operating level is a category error.

Computed from ISO 226:2003 (Annex A `af` / `Lu` / `Tf` tables, transfer formula
verified: 60 phon at 1 kHz returns 60.01 dB SPL). Both columns are relative to
1 kHz, so the numbers are directly comparable:

| Band | Threshold curve says | 60-phon curve says | Error if you use threshold |
|------|---------------------|--------------------|----------------------------|
| 31.5 Hz | +57.1 dB | +39.1 dB | **+18.0 dB too much** |
| 63 Hz | +35.1 dB | +26.0 dB | +9.1 dB too much |
| 125 Hz | +19.7 dB | +15.7 dB | +4.0 dB too much |
| 250 Hz | +9.0 dB | +7.6 dB | +1.4 dB too much |
| 500 Hz | +2.0 dB | +2.0 dB | 0.0 |
| 1 kHz | 0.0 | 0.0 | 0.0 |
| 2 kHz | −3.7 dB | −0.0 dB | **3.7 dB too little** |
| 4 kHz | −7.8 dB | −2.4 dB | **5.4 dB too little** |
| 8 kHz | +10.2 dB | +11.7 dB | 1.5 dB too little |

Reproduce with `scripts/iso226.mjs` (will ship with the repo).

Read the last column against the app's purpose. A threshold-derived trim adds
18 dB of rumble at 31.5 Hz and removes 3.7–5.4 dB from 2–4 kHz — it takes level
out of the exact band the entire product exists to fill, and puts it into the
band the brief explicitly says is wrong.

**Proposal:** replace detection with **loudness matching at operating level**.
Play a fixed 1 kHz band-limited reference at the target working level, then a
band tone, and the user matches the two by ear. Same interaction, same number of
steps, same skippable flow. Different task, correct curve.

Fallback if matching proves too hard to do by ear for a non-trained listener:
keep the threshold task but apply the result at ~35% weight and state in the copy
that it is a partial correction. That is a compromise, not a fix, and I would
rather not ship it.

### 1.2 The exposure guard cannot do what the brief says it does

> Cap master output so that at typical headphone sensitivity the user cannot
> easily exceed ~70 dB SPL at the ear.

The Web Audio graph controls a fraction of digital full scale. Between that
number and SPL at the eardrum sit: the OS volume slider, the DAC output voltage,
the headphone's sensitivity (which spans roughly 90 to 110 dB SPL/mW across
consumer models — a 20 dB range), and its impedance. A gain node cannot see any
of them. A fixed digital ceiling is inaudible on 250 Ω studio cans and still
dangerous on sensitive IEMs at full system volume.

Shipping a control labelled "70 dB limit" that does not limit to 70 dB fails this
brief's own honesty standard harder than anything in the drone section.

**Proposal, three parts, all of which are honest:**

1. **Hard digital ceiling** at −18 dBFS peak into the limiter. Real, enforced,
   described as what it is: a headroom limit, not an SPL limit.
2. **Optional SPL estimate.** User picks their headphone from a small list, or
   types a sensitivity in dB SPL/mW, and confirms system volume. We then show an
   estimated SPL with the uncertainty stated (±6 dB is realistic). Estimate, not
   measurement, and labelled that way.
3. **The procedure is the actual guard.** Reframe calibration as: raise the noise
   until speech at your desk stops being intelligible, then stop. That is a
   behavioural endpoint the app can genuinely enforce by asking for it, and it
   lands at the minimum effective level by construction.

The 70 dB copy stays. What changes is that we stop claiming the gain node
enforces it.

### 1.3 The drone's "−12.3 dB/octave" is a fitting artifact, not the shape of the source

The measured octave distribution in the brief is 63 Hz 9.8%, 125 Hz 48.4%,
250 Hz 37.9%, 500 Hz 3.9%. Converting those to per-octave slopes:

```
 63 → 125 Hz:  +6.9 dB/oct   (rising)
125 → 250 Hz:  −1.1 dB/oct   (flat)
250 → 500 Hz:  −9.9 dB/oct   (cliff)
```

That is not a −12 dB/octave slope. It is a **peak at 125 Hz, a shelf out to
250 Hz, and a cliff after** — the shape of a band-limited harmonic stack, not the
shape of a filter. The −12.3 dB/oct figure is what you get from a regression fit
across a range that includes the empty octaves above 500 Hz, where the "slope" is
just the top edge of the stack.

Building a 2-pole lowpass to hit −12 dB/oct gives a monotonically falling
spectrum, which the source is not. It would attenuate G3 and C4 — and those two
voices carry the 37.9% in the 250 Hz band, over a third of the total energy.

**Proposal:** no shaping filter. Use sine oscillators, which by construction have
nothing above their fundamental, and set the five voice gains so the resulting
octave-band energy matches the measurement. One gentle 2-pole lowpass at 400 Hz
stays, purely as insurance against AM sidebands when the 40 Hz experiment is on
(260.4 Hz ± 40 Hz = 220 / 300 Hz, comfortably clear of 500).

Two further things fell out of checking the numbers, both of which support this:

- **The C4 partial is inharmonic.** 260.4 Hz is 13.2 cents flat of 2 × 131.2 Hz.
  It is an independent voice, not a harmonic of C3. Five oscillators is the right
  model; one voice with harmonics is not.
- **The 63 Hz band contains no partial at all.** Bands run 45–90 Hz; the lowest
  partial is A2 at 109.7 Hz, which sits in the 125 Hz band. So the 9.8% at 63 Hz
  is not a fundamental — and 55.2 Hz, the A2/E3 difference tone the brief
  identifies, falls squarely in that band. The measurement corroborates the
  difference-tone reading of the "55 Hz envelope" independently.

Cents deviations from 12-TET, confirmed: A2 −4.7, C3 +5.1, E3 +0.9, G3 +4.4,
C4 −8.1. All within 10 cents as stated.

### 1.4 Main-thread drift will be throttled the moment the tab is hidden

The brief requires that a hidden tab must not stop or throttle audio. A drift
implemented as `setInterval` calling `setTargetAtTime` breaks that: background
tabs throttle timers to roughly once per minute, so drift freezes and then jumps.

**Proposal:** drift never touches the main thread. `BiquadFilterNode.gain` is an
`AudioParam`, and an AudioParam sums its intrinsic value with any connected audio
signal. So:

```
band gain = user value (setTargetAtTime, main thread, on slider move)
          + drift signal (audio-rate, from a worklet, connected to .gain)
```

One `DriftProcessor` with 10 outputs, one per band, each an independent
Ornstein-Uhlenbeck walk bounded to ±3 dB. Runs on the audio thread, immune to tab
state, no zipper noise, no polling. The same trick handles the drone's per-voice
swells, though there native `OscillatorNode`s at 0.02–0.1 Hz are simpler and I'll
use those.

One limitation I will document rather than paper over: **iOS Safari suspends the
AudioContext when the page is backgrounded or the screen locks**, regardless of
what we do. No workaround exists without a media-session/`<audio>` element hack
that conflicts with "no sample playback." The honest answer is a stated platform
limitation.

---

## 2. Stack

Vanilla TypeScript + Vite. No React. State is ~10 band values, ~15 drone params,
a preset list, and a transport flag — a 60-line observable store covers it, and
the interesting part of this app is a canvas surface that React would only get in
the way of.

No audio libraries. No runtime dependencies at all in the audio path.

```
src/
  audio/
    engine.ts            graph construction, lifecycle, suspended-context handling
    noise-processor.ts   AudioWorkletProcessor: white / pink / brown + stereo decorrelation
    drift-processor.ts   AudioWorkletProcessor: 10 independent OU walks -> 10 outputs
    shaper.ts            10 peaking biquads, ramping, drift wiring
    drone.ts             5 sines, per-voice LFOs, optional 40 Hz AM, own bus
    output.ts            master gain, limiter, ceiling, fade timer
    calibration.ts       loudness-matching flow, trim curve
    rng.ts               xorshift128+
  state/                 store, presets, localStorage, URL hash codec
  ui/                    later
scripts/
  iso226.mjs             the table in 1.1, reproducible
  measure-loudness.mjs   offline K-weighted normalization (see 3.4)
  seam-test.mjs          long-run verification harness (see 6)
```

## 3. Audio graph

```
NoiseWorklet ──> [10 × peaking biquad] ──┐
  (L/R decorrelated)     ▲               │
                         │               ├──> master gain ──> limiter ──> ceiling ──> destination
              DriftWorklet (10 outs)     │         ▲
              connected to .gain params  │         │
                                         │    fade envelope
5 × sine ──> per-voice gain ──> [40 Hz AM] ──> LP 400 Hz ──> drone gain ──┘
   ▲              ▲
   │         slow LFO (0.02–0.1 Hz)
 slow detune drift
```

The drone bus joins at the master gain, downstream of the shaper. It is never in
the masking path and the UI will not present it as one.

## 4. DSP, per generator

All three run in one `AudioWorkletProcessor`, selected by parameter, so switching
does not rebuild the graph.

### 4.1 PRNG

xorshift128+, seeded per channel. Period 2^128 − 1; at 48 kHz that is on the order
of 10^26 years per channel. `Math.random()` would probably be fine (V8 uses
xorshift128+ underneath) but is not seedable, and I need seeding for stereo
decorrelation and for reproducible tests. Output mapped to uniform [−1, 1).

### 4.2 White

The PRNG output directly. Uniform, flat PSD. Nothing to say.

### 4.3 Pink — Paul Kellett's refined filter

Chosen over Voss–McCartney, and the reason is exactly the brief's disqualifying
failure. Voss–McCartney updates its rows on the bit-flip pattern of a counter,
so the *update structure* is periodic with period 2^N even though the values are
fresh; it also carries known ±0.5 dB ripple. Kellett is a weighted sum of
first-order IIR sections over white noise — a filter, with no internal counter,
no structure, and therefore no period beyond the PRNG's.

Accuracy: ±0.05 dB above 9.2 Hz, but that figure is specified at 44.1 kHz. Most
browsers run 48 kHz, where the pole positions shift and HF error grows. I will
re-solve the six pole/gain pairs for the actual `sampleRate` at construction
rather than hardcoding the 44.1 kHz constants, and report the measured deviation.

### 4.4 Brown — leaky integrator + DC blocker

```
y[n] = a·y[n−1] + g·white[n]      a = 1 − 2π·f_leak/fs,  f_leak ≈ 20 Hz
z[n] = y[n] − y[n−1] + R·z[n−1]   R = 1 − 2π·8/fs
```

A true 1/f² integrator down to DC is a random walk with unbounded variance — over
an 8-hour session it will wander into the rails. The leak is not optional; it
bounds the output and costs a departure from −6 dB/oct only below ~20 Hz, which
is inaudible and out of band anyway. The DC blocker on top is belt and braces
against any residual offset accumulating over hours.

Denormals: the JS path is float64 and the integrator input is never zero, so the
classic denormal stall is unlikely here. Guarding anyway, with an alternating
±1e-20 injection — it costs nothing and I would rather not discover it at hour six.

### 4.5 Amplitude normalization — equal loudness, not equal RMS

Equal RMS is the wrong target: brown noise at the same RMS as white sounds
markedly quieter, because most of its energy sits where the ear is insensitive.
The brief asks that switching not jump in *loudness*, so:

Measure all three offline with ITU-R BS.1770 K-weighting, hardcode three scalars,
document the measured LUFS values in a comment. `scripts/measure-loudness.mjs`.

### 4.6 Stereo decorrelation

Two fully independent noise streams are fully decorrelated, which is very wide and
which a lot of listeners find unstable over hours. Proposing a correlation
coefficient instead:

```
L = √ρ·M + √(1−ρ)·A     R = √ρ·M + √(1−ρ)·B
```

M, A, B independent streams; ρ default 0.7. Preserves power, no phase weirdness,
one control from mono to fully wide. Default on, at 0.7, per the brief.

## 5. Ten-band shaper

Peaking biquads at 31.5 · 63 · 125 · 250 · 500 · 1k · 2k · 4k · 8k · 16k.

**Q = 1.414.** Not tuned by ear — derived. For a bandwidth of N octaves,
Q = 2^(N/2)/(2^N − 1); at N = 1 that is √2/1 = 1.414. Since the bands *are* octave
spaced, one-octave bandwidth is the value that tiles them. The brief's 1.0–1.4
range brackets it; I'll confirm by ear but I expect to land on the derived number.

Two things the brief asks for that a peaking filter cannot deliver, and what I
propose instead:

- **"−∞ (fully out)" is not achievable.** A peaking filter with gain → −∞ is a
  notch of finite width, not a removed octave. Slider bottom will be −40 dB and
  labelled as such.
- **Bands interact.** Adjacent one-octave peaking filters overlap; two neighbours
  at +12 dB sum to more than +12 dB between them, and pulling one band down leaves
  its neighbours' skirts filling the hole. This is true of every graphic EQ and is
  not worth engineering away.

It is, however, worth *showing*. Which is where the signature element goes:
a live FFT of the actual post-shaper output, drawn as the control surface itself,
so the user drags the band and sees the real resulting curve including the
interaction — rather than a row of sliders next to a diagram of what they were
supposed to do. That is one bold thing, it is honest about the DSP, and it makes
the band overlap legible instead of mysterious. Full design plan comes at the
step-3 checkpoint; flagging it here because it changes what the shaper module
has to expose.

Ramping: `setTargetAtTime`, time constant 30 ms. Never `.value =`.

## 6. Verifying seamlessness — the one requirement that can't be read off the code

The brief names this as disqualifying, so it gets a real method, not a listen.

1. `scripts/seam-test.mjs` renders 8 hours per generator via OfflineAudioContext
   at 48 kHz.
2. Autocorrelation over lags from 1 s to 60 s. Any peak above the noise floor of
   the estimate is a period, and a failure.
3. Sliding 1-second RMS across the full run: report drift in dB from first to last
   window. Brown is the one at risk here; target is under 0.2 dB.
4. Check for NaN, Inf, and |x| > 1 across every sample.
5. Then a human listen, because 2–4 catch structure and a listener catches
   character. Per your own note: 30+ minutes, eyes closed, before anything is
   built on top.

CPU: I will profile with `performance.now()` accumulated inside `process()`,
report worst-case render-quantum time as a percentage of the 2.67 ms budget at
128 frames / 48 kHz, and state the machine it was measured on. No estimates.

## 7. Build order

Unchanged from the brief. Checkpoint after step 3 for the design plan; the design
pass is a separate session.

---

## Open questions

1. **Calibration** — loudness matching at operating level (1.1), or the weighted
   threshold compromise?
2. **Exposure guard** — ship the headphone-sensitivity SPL estimator with stated
   ±6 dB uncertainty, or keep it relative-only and let the procedure carry it?
3. **Scope for this session** — steps 1–3 and stop with an ugly, correct
   instrument, or push further?
