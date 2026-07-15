// Pure fretboard model for Guitar Mode. No React/Tone/window — inlined into the app by
// build.sh (once imported by number-ear-trainer.jsx) and unit-tested directly by node:test.
//
// Everything is expressed in the SAME frame the session engine grades in:
//   pitch-class = semitones above the (major-reference) tonic, 0..11.
// That is exactly `sess.current.target` in a melody session, so a tapped fret's `pcOf`
// can be handed straight to `answerMelodySession(pc)` with no conversion.
//
// Minor keys need no special handling here: `sess.key` is always the relative-MAJOR
// reference, so the diatonic pitch-class set is identical to major; only which pc is
// "home" differs (`tonicPcOf`), which affects labeling/starring, not the answer frame.

import { KEYS, PC_TO_DEGREE, DEGREE_TO_PC, tonicPcOf, mod12 } from "./theory.mjs";

// Standard tuning, low string first. Index 0 = low E (6th string) … index 5 = high e (1st).
// MIDI: E2 A2 D3 G3 B3 E4.
export const STANDARD_TUNING = [
  { name: "E", midi: 40 },
  { name: "A", midi: 45 },
  { name: "D", midi: 50 },
  { name: "G", midi: 55 },
  { name: "B", midi: 59 },
  { name: "E", midi: 64 },
];

// Chromatic pitch-class of each open string (midi % 12) → [4, 9, 2, 7, 11, 4].
export const OPEN_PC = STANDARD_TUNING.map((s) => mod12(s.midi));

// Fret-marker inlays: single dots, plus octave double-dots.
export const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS = [12, 24];
export const FRET_COUNT = 22;

// Absolute MIDI note number of a (string, fret).
export function fretMidi(string, fret) {
  return STANDARD_TUNING[string].midi + fret;
}

// Session-frame pitch-class of a (string, fret) in a given key: semitones above the tonic, 0..11.
// KEYS is a 12-slot chromatic array, so KEYS.indexOf(key) === Tone.Frequency(key+"4").toMidi() % 12,
// which makes this identical to the runtime formula used in number-ear-trainer.jsx.
export function pcOf(string, fret, key) {
  return mod12(OPEN_PC[string] + fret - KEYS.indexOf(key));
}

// Full description of one (string, fret) cell in a key/mode.
// `degree` is null for chromatic (out-of-key) notes; `inKey` mirrors that.
export function degreeAt(string, fret, key, mode) {
  const pc = pcOf(string, fret, key);
  const degree = PC_TO_DEGREE[pc] ?? null;
  return { string, fret, pc, degree, isTonic: pc === tonicPcOf(mode), inKey: degree !== null };
}

// Every (string, fret) within `window` {min,max} whose session-frame pc === pc.
// This is the "any instance counts" enumerator: used to light ALL correct frets on a
// correct answer / reveal, since grading is octave-agnostic.
export function positionsOfPc(pc, key, window) {
  const target = mod12(pc);
  const out = [];
  for (let s = 0; s < STANDARD_TUNING.length; s++) {
    for (let f = window.min; f <= window.max; f++) {
      if (pcOf(s, f, key) === target) out.push({ string: s, fret: f });
    }
  }
  return out;
}

// Same, addressed by a diatonic degree 1..7. Returns [] for anything not 1..7.
export function positionsOfDegree(degree, key, window) {
  const pc = DEGREE_TO_PC[degree];
  return pc === undefined ? [] : positionsOfPc(pc, key, window);
}

// A ~5-fret "position box": the window every in-key degree gets labeled in.
// Anchor = lowest fret >= opts.minFret where the tonic sits on the low-E or A string, so the
// box is a real playable shape; the box starts one fret below that (clamped to 0) so the tonic
// isn't on the edge. Any 5-fret × 6-string window in standard tuning already contains all 7
// diatonic degrees (strings a 4th apart make the covered pc range span well over an octave),
// so the "all degrees present" guarantee holds for any anchor — asserted in the tests.
export function positionBox(key, mode, opts = {}) {
  const span = opts.span ?? 5;
  let startFret;
  if (opts.startFret != null) {
    // Explicit window (the movable-position box in landscape Free Play): the caller drives the
    // window directly. Clamp so the span still fits on the neck; every 5-fret window holds all 7
    // degrees, so any position stays fully labeled.
    startFret = Math.max(0, Math.min(opts.startFret, FRET_COUNT - span + 1));
  } else {
    // Auto-anchor: lowest fret >= minFret where the tonic sits on the low-E or A string.
    const minFret = opts.minFret ?? 0;
    const tonicPc = tonicPcOf(mode);
    let anchor = null;
    for (let f = minFret; f <= FRET_COUNT && anchor === null; f++) {
      if (pcOf(0, f, key) === tonicPc || pcOf(1, f, key) === tonicPc) anchor = f;
    }
    if (anchor === null) anchor = minFret;
    startFret = Math.max(0, anchor - 1);
    if (startFret + span - 1 > FRET_COUNT) startFret = FRET_COUNT - span + 1;
  }
  const endFret = startFret + span - 1;
  const frets = [];
  for (let f = startFret; f <= endFret; f++) frets.push(f);
  const cells = [];
  for (let s = 0; s < STANDARD_TUNING.length; s++) {
    for (const f of frets) cells.push(degreeAt(s, f, key, mode));
  }
  const markers = frets
    .filter((f) => INLAYS.includes(f) || DOUBLE_INLAYS.includes(f))
    .map((f) => ({ fret: f, double: DOUBLE_INLAYS.includes(f) }));
  return { key, mode, strings: [0, 1, 2, 3, 4, 5], startFret, endFret, frets, cells, markers, name: key + " " + mode + " @" + startFret };
}

// Compact 3-string × 4-fret ANSWER box for portrait tests — big finger targets, all 7 degrees.
// Shape: the classic scale position on the A·D·G strings (in C: frets 2–5, with 1 on the A string
// 3rd fret and 2 on the 5th). Anchored one fret below where the tonic sits on the A string, so the
// leading tone (7) sits under the index finger. Transposes per key; shifts up an octave if it would
// fall below the nut. Grading is octave-agnostic, so the doubled 1/7 are all valid taps.
export const ANSWER_STRINGS_MAJOR = [1, 2, 3]; // A, D, G — home is 1
export const ANSWER_STRINGS_MINOR = [0, 1, 2]; // E, A, D — home is 6 (la-based minor)
export const ANSWER_STRINGS = ANSWER_STRINGS_MAJOR; // back-compat default
export function answerBox(key, mode = "major") {
  // The compact test box follows the mode's home, as the lowest note:
  //  major → home 1 (pc0), on the A·D·G strings; window opens ONE fret below the 1 (so the 7 sits
  //          under the index finger): A = 7·1·_·2, D = 3·4·_·5, G = 6·_·7·1.
  //  minor → home 6 (pc9), on the E·A·D strings; window opens ON the 6 (the 6 IS the lowest note):
  //          E = 6·_·7·1, A = 2·_·3·4, D = 5·_·6 — i.e. 6·7·1 / 2·3·4 / 5·6.
  // `key` is always the relative-major reference either way. Both hold all 7 degrees.
  const minor = mode === "minor";
  const strings = minor ? ANSWER_STRINGS_MINOR : ANSWER_STRINGS_MAJOR;
  const anchorString = strings[0];       // lowest string carries the home note
  const homePc = minor ? 9 : 0;
  let homeFret = 0;
  for (let f = 0; f <= 12; f++) { if (pcOf(anchorString, f, key) === homePc) { homeFret = f; break; } }
  let startFret = minor ? homeFret : homeFret - 1;
  if (startFret < 0) startFret += 12;    // low keys → same shape an octave up
  const frets = [startFret, startFret + 1, startFret + 2, startFret + 3];
  const cells = [];
  for (const s of strings) for (const f of frets) cells.push(degreeAt(s, f, key, mode));
  const markers = frets
    .filter((f) => INLAYS.includes(f) || DOUBLE_INLAYS.includes(f))
    .map((f) => ({ fret: f, double: DOUBLE_INLAYS.includes(f) }));
  return { key, mode, strings, startFret, endFret: startFret + 3, frets, cells, markers, name: key + " " + mode + " answer" };
}
