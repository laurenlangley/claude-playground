/** Minimal radix-2 FFT and Welch PSD, for the offline measurement scripts. */

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** Welch-averaged power spectral density. Hann window, 50% overlap. */
export function welch(x: Float32Array, fftSize: number): Float64Array {
  const half = fftSize >> 1;
  const win = new Float64Array(fftSize);
  let winPow = 0;
  for (let i = 0; i < fftSize; i++) {
    win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / fftSize);
    winPow += win[i] * win[i];
  }
  const acc = new Float64Array(half);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  let frames = 0;
  for (let off = 0; off + fftSize <= x.length; off += half) {
    for (let i = 0; i < fftSize; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < half; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  for (let k = 0; k < half; k++) acc[k] /= frames * winPow;
  return acc;
}

/** Biquad in direct form I, applied in place. */
export function biquad(x: Float32Array, b: number[], a: number[]): void {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    x[i] = y0;
  }
}

/**
 * ITU-R BS.1770 K-weighting, 48 kHz coefficients: a high-shelf "head" filter
 * followed by an RLB high-pass. Returns loudness in LUFS for a mono buffer.
 */
export function lufs(x: Float32Array): number {
  const y = Float32Array.from(x);
  biquad(y, [1.53512485958697, -2.69169618940638, 1.19839281085285],
            [1, -1.69065929318241, 0.73248077421585]);
  biquad(y, [1.0, -2.0, 1.0],
            [1, -1.99004745483398, 0.99007225036621]);
  let s = 0;
  for (let i = 0; i < y.length; i++) s += y[i] * y[i];
  return -0.691 + 10 * Math.log10(s / y.length);
}

/** Least-squares slope in dB per octave of a PSD over [fLo, fHi]. */
export function slopeDbPerOctave(psd: Float64Array, sampleRate: number, fLo: number, fHi: number): number {
  const df = sampleRate / (psd.length * 2);
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let k = 1; k < psd.length; k++) {
    const f = k * df;
    if (f < fLo || f > fHi || psd[k] <= 0) continue;
    const xv = Math.log2(f);
    const yv = 10 * Math.log10(psd[k]);
    n++; sx += xv; sy += yv; sxx += xv * xv; sxy += xv * yv;
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}
