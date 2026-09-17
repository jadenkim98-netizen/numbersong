// Unit tests for the pure music-theory model (src/theory.mjs).
// Run with: node --test test/theory.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  degreeLabel, mod12, resolutionSemis, chordTones, chordByRoman,
  chordNumber, chordSymbol, chordQuality, buildGroup, MELODY_LEVELS,
  CHORD_LEVELS, PROG_LEVELS, levelsFor, randKey, randomProgression, KEYS,
  CURATED_7, pickProgression, CHORD_CHAPTERS, PROG_CHAPTERS, PROG_WEIGHTS, ALL_CHORDS,
  CURATED_3D, POOL_3D, WEIGHTS_3D, DEGREE_SEMITONES, EAR_CHORD_ROSTER, voiceLead,
  CURATED_4M, POOL_4M, WEIGHTS_4M, FOLLOW_4M, randomVoicing,
  CURATED_COLOUR, POOL_COLOUR, WEIGHTS_COLOUR, FOLLOW_COLOUR,
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
    ["3D · five of six", 18, 6],
    ["4- · borrowed from minor", 24, 6],
    ["Colour chords · 3D and 4-", 30, 6],
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
    for (const c of chapters.filter((x) => /^(Major|Minor) ·/.test(x.name))) {
      const last = c.levels[c.levels.length - 1];
      assert.equal(last.name, "Mastery · the big four · " + last.mode, c.name);
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

test("3D plays as a real dominant on the 3 (and the sevenths toggle can't restack it)", () => {
  const c = chordByRoman("III7");
  assert.deepEqual(c.tones, [3, "♯5", 7, 2]);
  // every playback path does DEGREE_SEMITONES[tone] — so all four must resolve
  const semis = c.tones.map((t) => DEGREE_SEMITONES[t]);
  assert.deepEqual(semis, [4, 8, 11, 2], "in C: E G# B D");
  assert.deepEqual(chordTones(c, true), c.tones, "already a 7th chord — don't stack another");
  assert.equal(chordNumber("III7", false), "3D");
  assert.equal(chordNumber("III7", true), "3D");
});

test("3D stays out of the diatonic tables it would corrupt", () => {
  assert.equal(ALL_CHORDS.length, 7, "the ear log's roster of seven must stay seven");
  assert.ok(!ALL_CHORDS.includes("III7"));
  assert.ok(!CURATED_7[4].flat().includes("III7"), "the All seven chapter stays diatonic");
});

test("the 3D chapter teaches by contrast: 3- and 3D share the pool and the shapes", () => {
  const ch = PROG_CHAPTERS.find((c) => c.name.startsWith("3D"));
  assert.equal(ch.levels.length, 6);
  assert.ok(ch.levels.every((l) => l.pool.includes("iii") && l.pool.includes("III7")),
    "the twin must always be answerable alongside it");
  assert.ok(!ch.levels.some((l) => l.pool.includes("vii°")));
  // every curated four has a twin differing only by iii <-> III7
  const swap = (s) => s.map((c) => (c === "III7" ? "iii" : c === "iii" ? "III7" : c)).join();
  const fours = CURATED_3D[4].map((s) => s.join());
  const paired = CURATED_3D[4].filter((s) => fours.includes(swap(s)));
  assert.ok(paired.length >= 6, `expected paired progressions, got ${paired.length}`);
});

test("3D is common in its own chapter, and reachable from every slot", () => {
  let hits = 0, slots = 0;
  for (let i = 0; i < 4000; i++) {
    const seq = randomProgression(4, POOL_3D, null, WEIGHTS_3D);
    seq.forEach((c) => { if (c === "III7") hits++; });
    slots += 4;
  }
  const rate = hits / slots;
  assert.ok(rate > 0.12 && rate < 0.30, `3D rate ${rate} should be prominent, not overwhelming`);
});

test("Your ear's chord roster carries the altered chords, but level pools stay diatonic", () => {
  assert.deepEqual(EAR_CHORD_ROSTER, [...ALL_CHORDS, "III7", "iv"]);
  assert.equal(ALL_CHORDS.length, 7);
});

test("3D sits next to its twin on the pad, not at the end", () => {
  assert.deepEqual(POOL_3D, ["I", "ii", "iii", "III7", "IV", "V", "vi"]);
  assert.equal(POOL_3D.indexOf("III7") - POOL_3D.indexOf("iii"), 1);
});

test("voiceLead: the upper voices step instead of leaping with the root", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const v = voiceLead(["I", "V", "vi", "IV"].map(sem));
  // every chord keeps all its pitch classes — voicing must never change the harmony
  ["I", "V", "vi", "IV"].forEach((r, i) => {
    assert.deepEqual(new Set(v[i].map(mod12)), new Set(sem(r).map(mod12)), r);
  });
  // and each voice moves only a step or two between chords, never an octave leap
  for (let i = 1; i < v.length; i++) {
    for (let j = 0; j < 3; j++) {
      assert.ok(Math.abs(v[i][j] - v[i - 1][j]) <= 4,
        `voice ${j} leapt ${Math.abs(v[i][j] - v[i - 1][j])} semitones into chord ${i}`);
    }
  }
});

test("voiceLead beats block voicing on total motion for the axis progression", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const seq = ["I", "V", "vi", "IV"].map(sem);
  const block = seq.map((tones) => { // what the old path produced
    let last = -1;
    return tones.map((s) => { let n = s; while (n <= last) n += 12; last = n; return n; });
  });
  const motion = (vs) => vs.slice(1).reduce((tot, v, i) =>
    tot + v.reduce((m, n, j) => m + Math.abs(n - vs[i][j]), 0), 0);
  assert.ok(motion(voiceLead(seq)) < motion(block),
    "smooth voicing should move less than root-position blocks");
});

test("voiceLead stays in register over a long progression (no runaway climb)", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const long = Array.from({ length: 40 }, (_, i) => sem(["I", "V", "vi", "IV"][i % 4]));
  const all = voiceLead(long).flat();
  assert.ok(Math.min(...all) >= 0 && Math.max(...all) <= 24,
    `drifted to ${Math.min(...all)}..${Math.max(...all)}`);
});

test("voicing is not a level setting — every progression comps the same way", () => {
  // Voice leading is always on: it can't change which chord you hear (the root is
  // doubled in the bass), so there's nothing to ramp and no per-level flag.
  for (const lvl of PROG_LEVELS) assert.equal(lvl.voicing, undefined, lvl.chapter + " / " + lvl.name);
});

test("4- is the major four with a flattened 6, sharing its root", () => {
  const iv = chordByRoman("iv"), IV = chordByRoman("IV");
  assert.deepEqual(iv.tones, [4, "♭6", 1]);
  assert.deepEqual(iv.tones.map((t) => DEGREE_SEMITONES[t]), [5, 8, 0]); // in C: F Ab C
  assert.equal(DEGREE_SEMITONES["♭6"], DEGREE_SEMITONES["♯5"], "same pitch, different spelling");
  assert.equal(chordNumber("iv", false), "4-");
  assert.deepEqual(chordTones(iv, true), iv.tones, "fixed: never derive a 7th (it'd be spelled wrong)");
  // the bass can't separate them — that's the whole difficulty of the chapter
  assert.equal(DEGREE_SEMITONES[iv.tones[0]], DEGREE_SEMITONES[IV.tones[0]]);
  assert.ok(EAR_CHORD_ROSTER.includes("iv") && !ALL_CHORDS.includes("iv"));
});

test("follow-weights make 4 → 4- the common move and ban 4- → 4", () => {
  let ivAfterIV = 0, ivBeforeIV = 0, fours = 0, withIv = 0;
  for (let i = 0; i < 6000; i++) {
    const s = randomProgression(4, POOL_4M, null, WEIGHTS_4M, FOLLOW_4M);
    if (s.includes("iv")) withIv++;
    s.forEach((c, j) => {
      if (c === "IV" && j < 3) { fours++; if (s[j + 1] === "iv") ivAfterIV++; }
      if (c === "iv" && j < 3 && s[j + 1] === "IV") ivBeforeIV++;
    });
  }
  assert.equal(ivBeforeIV, 0, "4- should never brighten back to 4");
  assert.ok(ivAfterIV / fours > 0.45, `4 should usually darken to 4- (got ${ivAfterIV / fours})`);
  assert.ok(withIv > 6000 * 0.4, "4- should turn up often in its own chapter");
});

test("a zero follow-weight is a ban, not a missing value", () => {
  // guards the ?? vs || bug: `|| 1` would read 0 as "no preference" and allow the move
  for (let i = 0; i < 200; i++) {
    assert.notEqual(randomProgression(2, ["I", "IV", "iv"], "iv", null, { iv: { IV: 0 } })[1], "IV");
  }
});

test("the 4- curated sets keep 4 and 4- adjacent, and resolve where they should", () => {
  const fours = CURATED_4M[4].map((s) => s.join());
  assert.ok(fours.includes(["I", "IV", "iv", "I"].join()), "1 4 4- 1");
  assert.ok(fours.includes(["I", "IV", "iv", "vi"].join()), "...into 6");
  assert.ok(fours.includes(["I", "IV", "iv", "iii"].join()), "...into 3");
  const all = Object.values(CURATED_4M).flat();
  for (const seq of all) {
    for (const r of seq) assert.ok(chordByRoman(r), `unknown chord ${r}`);
    seq.forEach((c, j) => { if (c === "iv" && seq[j + 1] === "IV") assert.fail("4- → 4 in " + seq.join("-")); });
  }
  // some progressions keep the four major, so it can't just be assumed to darken
  assert.ok(all.some((s) => s.includes("IV") && !s.includes("iv")));
});

test("voiceLead varies its realization, but never the harmony", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const seq = ["I", "V", "vi", "IV"];
  const shapes = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = voiceLead(seq.map(sem), randomVoicing());
    shapes.add(JSON.stringify(v));
    v.forEach((chord, j) => {
      assert.deepEqual(new Set(chord.map(mod12)), new Set(sem(seq[j]).map(mod12)), seq[j]);
      if (j) for (let k = 0; k < 3; k++) {
        assert.ok(Math.abs(chord[k] - v[j - 1][k]) <= 4, "a voice leapt more than a major third");
      }
    });
  }
  assert.ok(shapes.size >= 4, `expected several realizations, got ${shapes.size}`);
});

test("voiceLead stays deterministic with no options (so the rest of the suite holds)", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const seq = ["I", "V", "vi", "IV"].map(sem);
  const once = JSON.stringify(voiceLead(seq));
  for (let i = 0; i < 20; i++) assert.equal(JSON.stringify(voiceLead(seq)), once);
});

test("an injected rng makes a varied voicing reproducible", () => {
  const sem = (r) => chordByRoman(r).tones.map((d) => DEGREE_SEMITONES[d]);
  const seq = ["I", "IV", "iv", "I"].map(sem);
  const fixed = () => 0.99; // always take the last candidate within slack
  assert.equal(JSON.stringify(voiceLead(seq, { slack: 5, rng: fixed })),
               JSON.stringify(voiceLead(seq, { slack: 5, rng: fixed })));
});

test("the colour chapter runs both altered chords beside the plain chords they're mistaken for", () => {
  assert.deepEqual(POOL_COLOUR, ["I", "ii", "iii", "III7", "IV", "iv", "V", "vi"]);
  // each altered chord sits immediately after its twin
  assert.equal(POOL_COLOUR.indexOf("III7") - POOL_COLOUR.indexOf("iii"), 1);
  assert.equal(POOL_COLOUR.indexOf("iv") - POOL_COLOUR.indexOf("IV"), 1);
  const ch = PROG_CHAPTERS.find((c) => c.name.startsWith("Colour"));
  assert.equal(ch.levels.length, 6);
  assert.ok(ch.levels.every((l) => l.pool.includes("III7") && l.pool.includes("iv")));
});

test("the colour four-chord set pairs 1·3D·4·4- with its plain-3 twin", () => {
  const has = (...s) => CURATED_COLOUR[4].some((x) => x.join() === s.join());
  assert.ok(has("I", "III7", "IV", "iv"), "1 3D 4 4- — both colours");
  assert.ok(has("I", "iii", "IV", "iv"), "the same shape with a plain 3");
  assert.ok(CURATED_COLOUR[4].some((s) => !s.includes("III7") && !s.includes("iv")),
    "some progressions must be fully diatonic");
  for (const seq of Object.values(CURATED_COLOUR).flat()) {
    for (const r of seq) assert.ok(chordByRoman(r), `unknown chord ${r}`);
    for (let j = 1; j < seq.length; j++) assert.notEqual(seq[j], seq[j - 1]);
    seq.forEach((c, j) => { if (c === "iv" && seq[j + 1] === "IV") assert.fail("4- → 4 in " + seq.join("-")); });
  }
});

test("colour chapter keeps the 4 → 4- move and the 4- → 4 ban", () => {
  let darkens = 0, fours = 0, brightens = 0, colourful = 0;
  for (let i = 0; i < 6000; i++) {
    const s = randomProgression(4, POOL_COLOUR, null, WEIGHTS_COLOUR, FOLLOW_COLOUR);
    if (s.includes("III7") || s.includes("iv")) colourful++;
    s.forEach((c, j) => {
      if (c === "IV" && j < 3) { fours++; if (s[j + 1] === "iv") darkens++; }
      if (c === "iv" && j < 3 && s[j + 1] === "IV") brightens++;
    });
  }
  assert.equal(brightens, 0);
  assert.ok(darkens / fours > 0.4, `4 should usually darken (got ${darkens / fours})`);
  assert.ok(colourful / 6000 > 0.5, "most questions should carry a colour chord");
});

test("3D never falls back to 3- (same root, altered → plain is a backtrack)", () => {
  for (const name of ["3D · five of six", "Colour chords · 3D and 4-"]) {
    const ch = PROG_CHAPTERS.find((c) => c.name === name);
    for (const lvl of ch.levels.filter((l) => l.gen === "random")) {
      assert.ok(lvl.follow, `${name} / ${lvl.name} must carry a follow map`);
      for (let i = 0; i < 3000; i++) {
        const s = pickProgression(lvl, null);
        s.forEach((c, j) => {
          if (c === "III7" && s[j + 1] === "iii") assert.fail(`3D → 3- in ${name}: ${s.join("-")}`);
        });
      }
    }
    // and no curated set smuggles it in either
    for (const set of [CURATED_3D, CURATED_COLOUR]) {
      for (const seq of Object.values(set).flat()) {
        seq.forEach((c, j) => { if (c === "III7" && seq[j + 1] === "iii") assert.fail("3D → 3- in " + seq.join("-")); });
      }
    }
  }
});

test("an altered chord is never undone later in the same progression", () => {
  // Not just adjacent: once the four has gone minor, a plain 4 anywhere later in the
  // loop brightens it back. Same for 3D followed by a plain 3-.
  const undone = (s) => {
    const iv = s.indexOf("iv"), IV = s.lastIndexOf("IV");
    const d3 = s.indexOf("III7"), m3 = s.lastIndexOf("iii");
    return (iv > -1 && IV > iv) || (d3 > -1 && m3 > d3);
  };
  for (const ch of PROG_CHAPTERS) {
    for (const lvl of ch.levels.filter((l) => l.gen === "random")) {
      for (let i = 0; i < 2000; i++) {
        const s = pickProgression(lvl, null);
        if (undone(s)) assert.fail(`${ch.name} / ${lvl.name}: ${s.join("-")}`);
      }
    }
  }
  for (const set of [CURATED_3D, CURATED_4M, CURATED_COLOUR]) {
    for (const seq of Object.values(set).flat()) {
      if (undone(seq)) assert.fail("curated: " + seq.join("-"));
    }
  }
});

test("forbid never starves the draw (a banned pool still yields a legal chord)", () => {
  for (let i = 0; i < 500; i++) {
    const s = randomProgression(4, ["I", "IV", "iv"], "iv", null, null, { iv: ["IV"] });
    assert.equal(s.length, 4);
    assert.ok(!s.slice(1).includes("IV"), s.join("-"));
    for (let j = 1; j < s.length; j++) assert.notEqual(s[j], s[j - 1]);
  }
});
