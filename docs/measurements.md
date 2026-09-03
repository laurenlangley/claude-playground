# Measurements

Everything here is reproducible from the repo. No estimates.

Machine: Linux x64, Node 22.22.2. Regenerate with `npm run loudness` and
`npm run seam`.

## Generator loudness and spectral slope

`npm run loudness` — 60 s per generator at 48 kHz, mono, slope fit 30 Hz–16 kHz.

| Generator | LUFS (untrimmed) | Measured slope | Ideal | Peak |
|-----------|-----------------|----------------|-------|------|
| White | −1.63 | 0.00 dB/oct | 0.00 | 1.00 |
| Pink | +4.16 | −3.02 dB/oct | −3.01 | 7.72 |
| Brown | +11.23 | −5.74 dB/oct | −6.02 | 30.35 |

Trims applied (`LOUDNESS_TRIM` in `src/dsp/noise.ts`): white 0.0724699,
pink 0.0371945, brown 0.0164759. These equalise **K-weighted loudness**
(ITU-R BS.1770), not RMS — brown at equal RMS sounds much quieter than white,
because most of its energy sits where the ear is least sensitive.

The trims also scale so the loudest generator peaks at −6 dBFS out of the
worklet, leaving room for the shaper's +12 dB before the master gain's own
−18 dBFS ceiling.

## Pink: Kellett refined filter, re-solved for 48 kHz

Kellett's published coefficients are specified at 44.1 kHz (±0.05 dB above
9.2 Hz). `src/dsp/kellett.ts` maps each pole to the running sample rate rather
than hardcoding them. Measured at 48 kHz, per octave band, normalised at 1 kHz:

| Band | Measured | Ideal | Deviation |
|------|---------|-------|-----------|
| 31.5 Hz | +15.02 | +15.02 | 0.00 |
| 63 Hz | +12.13 | +12.01 | +0.12 |
| 125 Hz | +9.01 | +9.03 | −0.02 |
| 250 Hz | +6.05 | +6.02 | +0.03 |
| 500 Hz | +2.93 | +3.01 | −0.08 |
| 1 kHz | 0.00 | 0.00 | 0.00 |
| 2 kHz | −3.06 | −3.01 | −0.05 |
| 4 kHz | −6.07 | −6.02 | −0.05 |
| 8 kHz | −9.11 | −9.03 | −0.08 |
| 16 kHz | −12.10 | −12.04 | −0.06 |

**Max deviation ±0.12 dB, 31.5 Hz to 16 kHz.** Some of that is Welch estimator
variance rather than filter error. The re-solve was worth doing.

## Brown: where the −5.74 dB/oct fit comes from

The fitted slope looks 0.28 dB/oct short of ideal. It isn't a broadband error —
it is two opposite-signed end effects averaging out:

| Band | Measured | Ideal | Deviation |
|------|---------|-------|-----------|
| 31.5 Hz | +28.12 | +30.03 | **−1.91** |
| 63 Hz | +23.55 | +24.01 | −0.46 |
| 125 Hz | +17.88 | +18.06 | −0.18 |
| 250 Hz | +12.03 | +12.04 | −0.02 |
| 500 Hz | +5.97 | +6.02 | −0.05 |
| 1 kHz | 0.00 | 0.00 | 0.00 |
| 2 kHz | −6.01 | −6.02 | +0.01 |
| 4 kHz | −11.93 | −12.04 | +0.11 |
| 8 kHz | −17.66 | −18.06 | +0.41 |
| 16 kHz | −22.35 | −24.08 | **+1.73** |

Within ±0.2 dB from 125 Hz to 4 kHz. The two ends:

- **−1.91 dB at 31.5 Hz** is the 20 Hz leak in the integrator, and it is
  deliberate. A true 1/f² integrator down to DC is a random walk with unbounded
  variance; over an 8-hour session it wanders into the rails. The leak is what
  makes the generator safe to run all day.
- **+1.73 dB at 16 kHz** is the digital one-pole flattening near Nyquist —
  |H| at Nyquist is 1/(1+a), which is finite, so the response stops following
  the −6 dB/oct asymptote. Brown is 22 dB down at 16 kHz; 1.7 dB of excess there
  is not audible and not worth a correction filter.

Neither is worth fixing. Both are worth knowing about.

## Seamlessness — 8 hours per generator

`npm run seam -- --hours=8`. 1,382,400,000 samples each at 48 kHz.

This is the requirement that makes the rest of the app pointless if it is wrong,
so it gets four independent detectors rather than a listen.

| | White | Pink | Brown |
|---|---|---|---|
| Peak | 0.1003 | 0.3496 | 0.6213 |
| DC offset | 7.6e-7 | 2.7e-5 | −5.3e-8 |
| Non-finite samples | 0 | 0 | 0 |
| Identical 0.5 s blocks | 0 | 0 | 0 |
| Autocorrelation 0.5–21 s | 5.9× baseline | 3.6× | 4.0× |
| Envelope autocorrelation | 4.5× baseline | 4.2× | 4.6× |
| RMS drift, first → last | −0.000 dB | +0.037 dB | +0.126 dB |
| Render throughput | 18.3 Ms/s | 16.3 Ms/s | 18.3 Ms/s |

**All three pass.** Thresholds: 12× baseline for both autocorrelations, 0.2 dB
for drift, zero for collisions and non-finite samples.

### Why autocorrelation is measured as prominence, not magnitude

Brown noise is white through a 20 Hz leaky integrator, so it has a real
correlation time of about 8 ms and shows genuine non-zero correlation at short
lags that has nothing to do with periodicity. An early version of this test
failed brown at 50 ms lag for exactly that reason — the test was wrong, not the
generator.

A loop does not look like elevated correlation. It looks like a *spike* standing
out of the local baseline. So the test reports max|r| divided by the RMS of r
across the search range. Broadband noise lands at 3.6–5.9×, which is just the
expected maximum of that many near-Gaussian samples. There is a wide margin
between that and the threshold.

### Negative control

A test that cannot fail measures nothing. Feeding the same analysis a 10-second
loop of pink noise, which is what a sample-playback app ships:

```
looped signal: max|r| = 0.7714 at 10.00 s, prominence 50.4x baseline
identical 0.5 s blocks in looped signal: 67
```

Both detectors fire, and the autocorrelation peak lands on the loop length to
two decimal places.

### The false failure that had to be fixed

The first 8-hour run reported one identical block in brown. That was a hash
collision, not a repeat: the block hash was 32 bits, and 57,600 blocks in a 2³²
space collide with probability 1 − exp(−57600²/2³³) = **32%**. Widened to 64
bits (two independent FNV-1a variants), where the same probability is about
9e-11. Zero collisions across all three generators since.

### Brown's 0.126 dB drift

The largest of the three, and still comfortably inside the threshold. It is 1/f²
level wander, not integrator drift: the DC offset over the full 8 hours is
−5.3e-8, which is the DC blocker doing its job. The 3.59 dB RMS spread across
the run is the same thing — brown's one-second RMS genuinely varies that much,
by construction.

### What this does not replace

None of it substitutes for listening. Per the brief: 30+ minutes, eyes closed,
before anything is built on top.

## Audio-thread cost

There is no high-resolution clock in `AudioWorkletGlobalScope` — `performance`
is undefined (verified in Chrome 141). `Date` is available at 1 ms resolution,
which cannot time a single 2.7 ms render quantum but can time many of them.

If a quantum takes t ms with t < 1, a millisecond boundary falls inside it with
probability exactly t. So `Date.now()` after minus `Date.now()` before is 1 with
probability t and 0 otherwise, and the mean of that indicator over N quanta is
an unbiased estimator of t in ms. Over 2000 quanta at t ≈ 0.005 ms the standard
error is sqrt(t(1−t)/N) ≈ 0.0016 ms.

Measured, Chromium 141 headless, Linux x64, pink noise, 44.1 kHz:

```
audio thread: 0.004–0.006 ms per 2.90 ms quantum (0.2% of budget, over 2000 quanta)
```

Cross-check against the offline Node figure: the seam test renders pink at
18.8 Msamples/s, so 128 output samples cost 128 / 18.8e6 = **0.0068 ms**. Two
independent measurements — a high-resolution timer in Node and a
boundary-crossing estimator in the browser — agree to the precision either one
reports.

Scope of the number: it covers the generator worklet only. The ten shaper
biquads, the drift worklet, the drone's oscillators and the limiter are all
native nodes whose cost is not included here, though ten biquads and five sine
oscillators are not meaningful load. What matters for all-day use is the margin,
and 0.2% of budget is not close to anything.

## Headless browser check

`node bt.mjs <preview-url>` drives the built app in Chromium and verifies the
things that fail silently: worklet module loading, real signal on the bus
(−15.7 dBFS peak pre-shaper), the shaper actually moving the response curve, the
drone toggling, band sliders taking focus and responding to arrow keys, and a
clean console with no failed requests.
