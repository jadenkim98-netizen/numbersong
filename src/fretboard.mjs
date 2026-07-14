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
  const minFret = opts.minFret ?? 0;
  const tonicPc = tonicPcOf(mode);
  let anchor = null;
  for (let f = minFret; f <= FRET_COUNT && anchor === null; f++) {
    if (pcOf(0, f, key) === tonicPc || pcOf(1, f, key) === tonicPc) anchor = f;
  }
  if (anchor === null) anchor = minFret;
  let startFret = Math.max(0, anchor - 1);
  if (startFret + span - 1 > FRET_COUNT) startFret = FRET_COUNT - span + 1;
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
  return { key, mode, startFret, endFret, frets, cells, markers, name: key + " " + mode + " @" + startFret };
}
