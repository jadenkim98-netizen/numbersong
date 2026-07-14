// Unit tests for the pure fretboard model (src/fretboard.mjs).
// Run with: node --test test/fretboard.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS, PC_TO_DEGREE, mod12 } from "../src/theory.mjs";
import {
  STANDARD_TUNING, OPEN_PC, INLAYS, DOUBLE_INLAYS, FRET_COUNT, ANSWER_STRINGS,
  fretMidi, pcOf, degreeAt, positionsOfPc, positionsOfDegree, positionBox, answerBox,
} from "../src/fretboard.mjs";

const cellAt = (box, string, fret) => box.cells.find((c) => c.string === string && c.fret === fret);

test("answerBox: C major is the A·D·G / frets 2–5 shape from the spec", () => {
  const box = answerBox("C", "major");
  assert.deepEqual(box.strings, [1, 2, 3]);         // A, D, G
  assert.deepEqual(box.frets, [2, 3, 4, 5]);
  assert.equal(box.cells.length, 12);               // 3 strings × 4 frets
  // A string: 1 on fret 3 (2nd of window), 2 on fret 5 (4th)
  assert.equal(cellAt(box, 1, 3).degree, 1);
  assert.equal(cellAt(box, 1, 3).isTonic, true);
  assert.equal(cellAt(box, 1, 5).degree, 2);
  // D string: 3 on fret 2 (1st), 4 on fret 3 (2nd), 5 on fret 5
  assert.equal(cellAt(box, 2, 2).degree, 3);
  assert.equal(cellAt(box, 2, 3).degree, 4);
  assert.equal(cellAt(box, 2, 5).degree, 5);
  // G string: 6 on fret 2, 7 on fret 4
  assert.equal(cellAt(box, 3, 2).degree, 6);
  assert.equal(cellAt(box, 3, 4).degree, 7);
});

test("answerBox: holds all 7 degrees in every key/mode, stays on the neck", () => {
  for (const key of KEYS) {
    for (const mode of ["major", "minor"]) {
      const box = answerBox(key, mode);
      assert.equal(box.cells.length, 12);
      assert.ok(box.startFret >= 0 && box.endFret <= FRET_COUNT, `on-neck ${key} ${mode}`);
      const degs = new Set(box.cells.map((c) => c.degree).filter((d) => d !== null));
      for (let d = 1; d <= 7; d++) assert.ok(degs.has(d), `degree ${d} missing in ${key} ${mode} answerBox`);
      assert.ok(box.cells.some((c) => c.isTonic), `no tonic in ${key} ${mode} answerBox`);
    }
  }
});

test("open strings: pitch-classes match standard tuning EADGBE", () => {
  assert.deepEqual(OPEN_PC, [4, 9, 2, 7, 11, 4]); // E A D G B E
  // In C, open low E is the 3 (pc 4), open A is the 6 (pc 9), both E strings are the 3.
  assert.equal(pcOf(0, 0, "C"), 4);
  assert.equal(pcOf(1, 0, "C"), 9);
  assert.equal(pcOf(5, 0, "C"), 4);
  // Low-E 5th fret == open A (same pitch → same pc).
  assert.equal(pcOf(0, 5, "C"), pcOf(1, 0, "C"));
  // Degree 1 of C lives on the A string, 3rd fret (C note).
  assert.equal(pcOf(1, 3, "C"), 0);
});

test("pcOf equals the runtime Tone formula for every key/string/fret", () => {
  // Runtime (number-ear-trainer.jsx): mod12(fretMidi - Tone.Frequency(key+"4").toMidi()).
  // Tone.Frequency("<key>4").toMidi() === 60 + KEYS.indexOf(key)  (60 = MIDI of C4),
  // derived here independently so the test needs no Tone import.
  for (const key of KEYS) {
    const keyMidi = 60 + KEYS.indexOf(key);
    for (let s = 0; s < STANDARD_TUNING.length; s++) {
      for (let fret = 0; fret <= 15; fret++) {
        const runtime = mod12(fretMidi(s, fret) - keyMidi);
        assert.equal(pcOf(s, fret, key), runtime, `mismatch key=${key} s=${s} fret=${fret}`);
      }
    }
  }
});

test("degreeAt: diatonic degree, tonic flag, and null for chromatic notes", () => {
  // G major: the open G string (index 3) is the tonic → degree 1.
  const g = degreeAt(3, 0, "G", "major");
  assert.equal(g.pc, 0);
  assert.equal(g.degree, 1);
  assert.equal(g.isTonic, true);
  assert.equal(g.inKey, true);
  // Find a chromatic note in G major (pc with no diatonic degree) and confirm it's null.
  let foundChromatic = false;
  for (let s = 0; s < 6 && !foundChromatic; s++) {
    for (let f = 0; f <= 12; f++) {
      const c = degreeAt(s, f, "G", "major");
      if (PC_TO_DEGREE[c.pc] === undefined) {
        assert.equal(c.degree, null);
        assert.equal(c.inKey, false);
        assert.equal(c.isTonic, false);
        foundChromatic = true;
        break;
      }
    }
  }
  assert.ok(foundChromatic, "expected at least one chromatic cell");
});

test("minor only changes the tonic, not the diatonic degree set", () => {
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 12; f++) {
      const maj = degreeAt(s, f, "A", "major");
      const min = degreeAt(s, f, "A", "minor");
      assert.equal(maj.degree, min.degree, `degree drift s=${s} f=${f}`);
    }
  }
  // Home differs: pc 0 is tonic in major, pc 9 (the 6) is tonic in minor.
  assert.equal(degreeAt(3, 5, "A", "major").isTonic, degreeAt(3, 5, "A", "major").pc === 0);
  const min6 = [...Array(6)].some((_, s) =>
    [...Array(13)].some((_, f) => degreeAt(s, f, "A", "minor").isTonic && degreeAt(s, f, "A", "minor").pc === 9));
  assert.ok(min6, "minor tonic should be pc 9 (the 6)");
});

test("positionsOfPc / positionsOfDegree enumerate every matching fret, no chromatics", () => {
  const win = { min: 0, max: 12 };
  const ones = positionsOfDegree(1, "C", win); // all the C's
  assert.ok(ones.length >= 3, "expected multiple tonic instances in a 13-fret window");
  for (const { string, fret } of ones) assert.equal(pcOf(string, fret, "C"), 0);
  // pc-addressed matches degree-addressed for a diatonic degree.
  assert.deepEqual(positionsOfPc(0, "C", win), ones);
  // A chromatic degree request returns nothing.
  assert.deepEqual(positionsOfDegree(0, "C", win), []);
  assert.deepEqual(positionsOfDegree(8, "C", win), []);
});

test("positionBox: 5 frets, 30 cells, contains the tonic, and all 7 degrees appear", () => {
  for (const key of KEYS) {
    for (const mode of ["major", "minor"]) {
      const box = positionBox(key, mode);
      assert.equal(box.frets.length, 5, `frets ${key} ${mode}`);
      assert.equal(box.cells.length, 30, `cells ${key} ${mode}`);
      assert.equal(box.endFret - box.startFret, 4);
      assert.ok(box.startFret >= 0 && box.endFret <= FRET_COUNT);
      assert.ok(box.cells.some((c) => c.isTonic), `no tonic in box ${key} ${mode}`);
      const degs = new Set(box.cells.map((c) => c.degree).filter((d) => d !== null));
      for (let d = 1; d <= 7; d++) assert.ok(degs.has(d), `degree ${d} missing in ${key} ${mode} box`);
    }
  }
});

test("inlay data is present and sane", () => {
  assert.ok(INLAYS.includes(3) && INLAYS.includes(5) && INLAYS.includes(7) && INLAYS.includes(9));
  assert.ok(DOUBLE_INLAYS.includes(12));
  assert.ok(!INLAYS.includes(12), "12 is a double-dot, not a single inlay");
});
