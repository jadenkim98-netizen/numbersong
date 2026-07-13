// Unit tests for the pure music-theory model (src/theory.mjs).
// Run with: node --test test/theory.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  degreeLabel, mod12, resolutionSemis, chordTones, chordByRoman,
  chordNumber, chordSymbol, chordQuality, buildGroup, MELODY_LEVELS,
  CHORD_LEVELS, PROG_LEVELS, levelsFor, randKey, randomProgression, KEYS,
} from "../src/theory.mjs";

test("degreeLabel: the upper octave shows as 1, never 8", () => {
  assert.equal(degreeLabel(8), "1");
  assert.equal(degreeLabel(1), "1");
  assert.equal(degreeLabel(5), "5");
  assert.equal(degreeLabel(7), "7");
});

test("mod12 wraps negatives and multiples into 0..11", () => {
  assert.equal(mod12(-1), 11);
  assert.equal(mod12(0), 0);
  assert.equal(mod12(12), 0);
  assert.equal(mod12(13), 1);
  assert.equal(mod12(-13), 11);
});

test("resolutionSemis: diatonic notes walk home (major)", () => {
  assert.deepEqual(resolutionSemis(0, "major"), [0]);        // 1 is already home
  assert.deepEqual(resolutionSemis(2, "major"), [2, 0]);     // 2 -> 1
  assert.deepEqual(resolutionSemis(7, "major"), [7, 9, 11, 12]); // 5 -> 6 -> 7 -> 1
  assert.deepEqual(resolutionSemis(9, "major"), [9, 11, 12]);    // 6 -> 7 -> 1
  assert.deepEqual(resolutionSemis(11, "major"), [11, 12]);      // 7 -> 1
});

test("resolutionSemis: home is 6 in la-based minor", () => {
  assert.deepEqual(resolutionSemis(9, "minor"), [9]);            // 6 is home
  assert.deepEqual(resolutionSemis(0, "minor"), [0, -1, -3]);    // 1 -> 7 -> 6
});

test("resolutionSemis: altered notes step to a diatonic note first", () => {
  assert.deepEqual(resolutionSemis(1, "major"), [1, 0]);            // b2 leans down to 1
  assert.deepEqual(resolutionSemis(6, "major"), [6, 7, 9, 11, 12]); // #4 leans up to 5, then home
});

test("chordTones: triads, and sevenths add the 7th a step above the 5th", () => {
  assert.deepEqual(chordTones(chordByRoman("I"), false), [1, 3, 5]);
  assert.deepEqual(chordTones(chordByRoman("I"), true), [1, 3, 5, 7]);
  assert.deepEqual(chordTones(chordByRoman("IV"), false), [4, 6, 1]);
  assert.deepEqual(chordTones(chordByRoman("IV"), true), [4, 6, 1, 3]);
});

test("chord naming helpers (roman / number notation / quality)", () => {
  assert.equal(chordSymbol("I", false), "I");
  assert.equal(chordSymbol("V", true), "V7");
  assert.equal(chordNumber("V", false), "5D");
  assert.equal(chordNumber("V", true), "5D7");
  assert.equal(chordNumber("ii", false), "2-");
  assert.equal(chordQuality("V", true), "dominant 7th");
  assert.equal(chordQuality("vii°", false), "diminished");
});

test("buildGroup: 3 intro levels in C then a 5-step transposition ramp", () => {
  const g = buildGroup("Test", "major", false, [
    ["a", "", [0]], ["b", "", [0, 2]], ["c", "", [0, 2, 4]],
  ]);
  assert.equal(g.length, 8);
  assert.deepEqual(g.slice(0, 3).map((l) => l.keyMode), ["c", "c", "c"]);
  assert.deepEqual(g.slice(3).map((l) => l.keyMode), ["c", "not-c", "not-c", "random", "random"]);
  assert.equal(g[g.length - 1].qCount, 30); // the capstone runs longer
});

test("level tables have the expected shape", () => {
  assert.equal(MELODY_LEVELS.length, 32); // 4 groups x 8 levels
  assert.equal(MELODY_LEVELS[0].name, "First steps");
  assert.equal(levelsFor("melody"), MELODY_LEVELS);
  assert.equal(levelsFor("chords"), CHORD_LEVELS);
  assert.equal(levelsFor("progressions"), PROG_LEVELS);
});

test("randKey never returns an excluded key", () => {
  for (let i = 0; i < 100; i++) {
    const k = randKey(["C"]);
    assert.ok(KEYS.includes(k));
    assert.notEqual(k, "C");
  }
});

test("randomProgression: right length, starts home, no repeats back-to-back", () => {
  for (let i = 0; i < 50; i++) {
    const seq = randomProgression(4, ["I", "IV", "V", "vi"], "I");
    assert.equal(seq.length, 4);
    assert.equal(seq[0], "I");
    for (let j = 1; j < seq.length; j++) assert.notEqual(seq[j], seq[j - 1]);
  }
});
