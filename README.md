# Noisefloor

Band-shaped masking noise for people whose problem is background speech, not
volume. Runs entirely in the browser, generates every sample in real time, and
never plays a file.

**Current state: engine build (steps 1–3 of 7).** Generators, ten-band shaper,
tonal drone bus. The interface is deliberately unstyled — the design pass is
separate work and nothing in `src/style.css` is a preview of it.

## The problem this is shaped around

Speech intelligibility lives in **1–4 kHz**. Most noise apps ship brown-noise
loops that put their energy below 500 Hz, which is the wrong band: they add
rumble and leave the voices exactly as legible as they were. This app exists to
put a controllable noise floor into the speech band and hold it there for an
eight-hour day without fatigue.

Everything else follows from that: precise band control, long-session
tolerance, and no surprises.

## What is here

- **Three generators** in an `AudioWorkletProcessor`, off the main thread.
  White, pink (Kellett refined, re-solved for the running sample rate), brown
  (leaky integrator with DC blocking). Loudness-matched with ITU-R BS.1770
  K-weighting so switching does not jump in level.
- **Ten-band octave shaper** — peaking biquads at 31.5 Hz to 16 kHz, Q = 1.414,
  every change ramped with `setTargetAtTime`.
- **Drift** — ten independent bounded random walks generated on the audio thread
  and summed into the band gain `AudioParam`s, so a hidden tab cannot freeze it.
- **Tonal drone** on its own bus: five sine voices, slow independent swells,
  optional 40 Hz AM. Not part of the masking path, and not presented as one.
- **Live spectrum** showing the real output against the shaper's computed
  response, with the 1–4 kHz speech band marked.

## Not here yet

Presets and persistence, URL state, calibration, and the design pass
(steps 4–7). One speech-masking starting curve ships as a button because it is
the reason the app exists.

## Running it

```
npm install
npm run dev          # builds worklets, then starts Vite
```

Other commands:

```
npm run seam                  # 30 min per generator, seamlessness verification
npm run seam -- --hours=8     # the full soak
npm run loudness              # K-weighting measurement and trim scalars
npm run iso226                # the equal-loudness table behind the calibration argument
node bt.mjs http://localhost:4173/   # headless browser check (needs a build + preview)
```

## Verification

Measured numbers, methods and the negative controls are in
[`docs/measurements.md`](docs/measurements.md). The short version: no
periodicity over 8 hours per generator, pink within ±0.12 dB of ideal 1/f from
31.5 Hz to 16 kHz, and the generator costs about 0.2% of the audio thread's
render budget.

The design and DSP decisions, including four places where the original brief
would have inverted its own goal, are in
[`docs/architecture.md`](docs/architecture.md).

## Honesty notes

Two of these are load-bearing and are repeated in the interface itself:

- **The headroom cap is not a loudness cap.** A gain node controls a fraction of
  digital full scale. Headphone sensitivity alone spans about 20 dB across
  consumer models, and the OS volume and DAC sit in between. The app enforces a
  real −18 dBFS ceiling and says that is what it is. It does not claim an SPL
  it cannot measure. Sustained daily exposure above roughly 70 dB SPL carries
  cumulative hearing-damage risk over years; the way to set the level is to
  raise it until speech stops being intelligible and then stop.
- **The drone's origin, stated accurately.** It is modelled on a commercial
  "40 Hz gamma" track whose 40 Hz claim does not survive measurement: no
  dichotic carrier pair, no meaningful 40 Hz modulation. What is in the signal
  is a sustained Am7 pad. The 55 Hz envelope people point to is a difference
  tone between the A2 and E3 partials (164.9 − 109.7 = 55.2 Hz), not a designed
  modulation. The gamma research (MIT/Tsai, GENUS) used amplitude-modulated
  stimuli and is largely preclinical, aimed at neurodegeneration rather than
  focus. Liking how something sounds is a sufficient reason to use it. No
  mechanism is claimed.

## Known limitations

- **iOS Safari suspends the AudioContext** when the page is backgrounded or the
  screen locks. There is no workaround that does not involve playing a media
  file, which this app does not do.
- **Bands interact.** Adjacent one-octave peaking filters overlap, so the curve
  you get is not exactly the curve you drew, and a band pulled down still has
  its neighbours' skirts in the hole. Every graphic EQ does this. The spectrum
  plot shows the real result rather than hiding it.
- **Bands bottom out at −40 dB, not silence.** A peaking filter driven to minus
  infinity is a narrow notch, not a removed octave.
