// Unit tests for the pure music-theory model (src/theory.mjs).
// Run with: node --test test/theory.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  degreeLabel, mod12, resolutionSemis, chordTones, chordByRoman,
  chordNumber, chordSymbol, chordQuality, buildGroup, MELODY_LEVELS,
  CHORD_LEVELS, PROG_LEVELS, levelsFor, randKey, randomProgression, KEYS,
  CURATED_7, pickProgression, CHORD_CHAPTERS, PROG_CHAPTERS, PROG_WEIGHTS, ALL_CHORDS,
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

test("all-seven chapters are appended, never inserted (level idx is the saved-progress key)", () => {
  // The big-four chapters must keep their original start indices. A new chapter
  // inserted ahead of them would silently re-point every saved clear.
  assert.deepEqual(CHORD_CHAPTERS.map((c) => [c.name, c.start, c.levels.length]), [
    ["Major · 1 4 5 6", 0, 7],
    ["Minor · 6 2 3 4", 7, 7],
    ["All seven", 14, 6],
  ]);
  assert.deepEqual(PROG_CHAPTERS.map((c) => [c.name, c.start, c.levels.length]), [
    ["Major · 1 4 5 6", 0, 6],
    ["Minor · 6 2 3 4", 6, 6],
    ["All seven", 12, 6],
  ]);
});

test("all-seven ramp isolates 7dim before opening the pool", () => {
  const ch = CHORD_LEVELS.filter((l) => l.chapter === "All seven");
  assert.deepEqual(ch[0].pool, ["I", "vii°"]);   // alone against home
  assert.deepEqual(ch[1].pool, ["V", "vii°"]);   // then against the chord it hides behind
  assert.equal(ch[3].pool.length, 7);            // only then, everything
  assert.ok(ch.every((l) => l.mode === "major"));
});

test("curated all-seven progressions only use real diatonic chords", () => {
  const all = Object.values(CURATED_7).flat();
  for (const seq of all) {
    for (const roman of seq) assert.ok(chordByRoman(roman), `unknown chord ${roman}`);
    for (let j = 1; j < seq.length; j++) assert.notEqual(seq[j], seq[j - 1]);
  }
  // 7dim is a leading chord: wherever it isn't last, it must resolve to 1.
  for (const seq of all) {
    seq.forEach((c, j) => {
      if (c === "vii°" && j < seq.length - 1) assert.equal(seq[j + 1], "I");
    });
  }
});

test("four-chord classics carry the workhorse progressions (and their rotations)", () => {
  const has = (...seq) => CURATED_7[4].some((s) => s.join() === seq.join());
  assert.ok(has("I", "V", "vi", "IV"), "1564 — the axis");
  assert.ok(has("vi", "IV", "I", "V"), "6415");
  assert.ok(has("I", "vi", "IV", "V"), "1645 — doo-wop");
  assert.ok(has("IV", "V", "I", "vi"), "4516");
  assert.ok(has("I", "vi", "ii", "V"), "1625 — the turnaround");
  assert.ok(has("IV", "V", "iii", "vi"), "4536 — the Royal Road");
  assert.ok(has("I", "V", "vi", "iii"), "1563 — Pachelbel");
  assert.ok(has("vi", "ii", "V", "I"), "6251");
});

test("the all-seven progression chapter mirrors progRamp's six rungs", () => {
  const ch = PROG_CHAPTERS.find((c) => c.name === "All seven").levels;
  assert.deepEqual(ch.map((l) => l.name),
    ["Two-chord moves", "Three-chord", "Four-chord classics", "Any order", "New key", "Every key"]);
  assert.deepEqual(ch.map((l) => l.len), [2, 3, 4, 4, 4, 4]);
  assert.deepEqual(ch.map((l) => l.gen), ["curated", "curated", "curated", "random", "random", "random"]);
  assert.deepEqual(ch.map((l) => l.keyMode), ["fixed", "fixed", "fixed", "fixed", "not-c", "random"]);
  assert.equal(ch[5].qCount, 30); // the capstone runs longer
});

test("each big-four chapter ends inside its own four chords, not on all seven", () => {
  for (const chapters of [CHORD_CHAPTERS, PROG_CHAPTERS]) {
    for (const c of chapters.filter((x) => x.name !== "All seven")) {
      const last = c.levels[c.levels.length - 1];
      assert.equal(last.name, "Mastery · the big four", c.name);
      assert.equal(last.pool.length, 4, `${c.name} capstone must stay in the taught pool`);
      assert.equal(last.keyMode, "random");
      assert.equal(last.qCount, 30);
    }
  }
});

test("anyStart opens up the rotations (every chord can begin a progression)", () => {
  const pool = ["I", "IV", "V", "vi"];
  const starts = new Set(), seqs = new Set();
  for (let i = 0; i < 3000; i++) {
    const s = randomProgression(4, pool, null);
    starts.add(s[0]);
    seqs.add(s.join());
    for (let j = 1; j < s.length; j++) assert.notEqual(s[j], s[j - 1]);
  }
  assert.equal(starts.size, 4, "every chord should be able to start a progression");
  assert.equal(seqs.size, 108, "4 starts x 3 x 3 x 3 distinct sequences");
  // and the home-anchored form is still the default everywhere else
  const anchored = new Set();
  for (let i = 0; i < 300; i++) anchored.add(randomProgression(4, pool, "I")[0]);
  assert.deepEqual([...anchored], ["I"]);
});

test("weighted draws stay legal and make 7dim rare without banning it", () => {
  let dim = 0, slots = 0, seen = new Set();
  for (let i = 0; i < 4000; i++) {
    const seq = randomProgression(4, ALL_CHORDS, "I", PROG_WEIGHTS);
    assert.equal(seq.length, 4);
    assert.equal(seq[0], "I");
    for (let j = 1; j < seq.length; j++) assert.notEqual(seq[j], seq[j - 1]);
    seq.forEach((c) => { seen.add(c); if (c === "vii°") dim++; });
    slots += 3; // the first slot is always home
  }
  assert.equal(seen.size, 7, "every chord must still be reachable");
  const rate = dim / slots;
  assert.ok(rate > 0.01 && rate < 0.09, `7dim rate ${rate} should be rare but present (uniform would be ~0.14)`);
});

test("an unweighted draw is unchanged (the big-four chapters keep their behaviour)", () => {
  const counts = {};
  for (let i = 0; i < 3000; i++) {
    randomProgression(4, ["I", "IV", "V", "vi"], "I").slice(1).forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
  }
  for (const c of ["IV", "V", "vi"]) assert.ok(counts[c] > 1500, `${c} should stay common under a uniform draw`);
});

test("pickProgression honours a level's own curated set", () => {
  const lvl = { gen: "curated", len: 3, mode: "major", curated: CURATED_7 };
  for (let i = 0; i < 40; i++) {
    const p = pickProgression(lvl, null);
    assert.ok(CURATED_7[3].some((s) => s.join() === p.join()), p.join());
  }
});
