// Numbersong — Sing-tuner pitch math (autocorrelation detector + degree mapper).
// Pure: no Tone, no window. Bundled by build.sh and unit-tested under node:test
// (test/pitch.test.mjs).

import { KEYS, DEGREE_SEMITONES } from "./theory.mjs";

// Autocorrelation pitch detector for the Sing tuner. Takes a window of raw
// time-domain samples and returns the fundamental frequency in Hz, or -1 when
// the signal is too quiet or too noisy to trust (silence, breath, consonants).
// No library — the whole app stays a single standalone file. Adapted from the
// classic ACF approach; parabolic interpolation gives sub-semitone accuracy.
export function detectPitch(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.006) return -1; // below the noise floor — treat as silence

  // Trim leading/trailing near-silence so onsets/tails don't skew the ACF.
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  const b = buf.slice(r1, r2);
  const n = b.length;
  if (n < 128) return -1;

  const c = new Array(n).fill(0);
  for (let lag = 0; lag < n; lag++)
    for (let i = 0; i < n - lag; i++) c[lag] += b[i] * b[i + lag];

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++; // walk down off the zero-lag peak
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  if (maxpos <= 0) return -1;
  let T0 = maxpos;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 70 || freq > 1100) return -1; // outside the human singing range
  return freq;
}

// Detected frequency (Hz) → nearest scale degree of `key` + cents off it.
// Octave-agnostic: we only care WHICH number you're singing, not which octave,
// so a low 3 and a high 3 both light the 3 pad. Returns { deg: 1..7, cents }.
export function pitchToDegree(freq, key) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const tonicMidi = 60 + KEYS.indexOf(key); // C4 = MIDI 60; KEYS index = pitch-class (Tone-free)
  const rel = (((midi - tonicMidi) % 12) + 12) % 12; // semitones above tonic, 0..12
  let best = 1, bestDiff = 99;
  for (const deg of [1, 2, 3, 4, 5, 6, 7]) {
    let diff = rel - DEGREE_SEMITONES[deg];
    if (diff > 6) diff -= 12;        // wrap so the octave-tonic counts as degree 1
    if (diff < -6) diff += 12;
    if (Math.abs(diff) < Math.abs(bestDiff)) { bestDiff = diff; best = deg; }
  }
  return { deg: best, cents: Math.round(bestDiff * 100) };
}
