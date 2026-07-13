import { test } from "node:test";
import assert from "node:assert/strict";
import {
  qCountForLevel,
  passRateForLevel,
  passCountForLevel,
  starsForLevelBest,
  totalStarsForProgress,
  mergeBestProgress,
  countFirstTries,
  chooseSessionKey,
  resolveSessionLevel,
  buildSessionState,
  nextQuestionProgress,
  nextRandomSessionKey,
  pickOctave,
  pickMelodyTarget,
  pickChordRoman,
  shouldCelebrateStageClear,
} from "../src/app-flow.mjs";

test("question/pass helpers respect test and jojo overrides", () => {
  const lvl = { qCount: 30, pass: 0.9 };
  assert.equal(qCountForLevel(lvl, { defaultSessionLen: 20 }), 30);
  assert.equal(qCountForLevel(lvl, { testMode: true, defaultSessionLen: 20 }), 3);
  assert.equal(qCountForLevel(lvl, { jojoMode: true, defaultSessionLen: 20 }), 3);
  assert.equal(passRateForLevel(lvl, { defaultPassRate: 0.8 }), 0.9);
  assert.equal(passRateForLevel(lvl, { testMode: true, defaultPassRate: 0.8 }), 0.6);
  assert.equal(passCountForLevel(lvl, { defaultSessionLen: 20, defaultPassRate: 0.8 }), 27);
  assert.equal(passCountForLevel(lvl, { jojoMode: true, defaultSessionLen: 20, defaultPassRate: 0.8 }), 1);
});

test("star calculation keeps the existing 0/1/2/3 thresholds", () => {
  const lvl = { qCount: 20, pass: 0.8 }; // pass=16
  const opts = { defaultSessionLen: 20, defaultPassRate: 0.8 };
  assert.equal(starsForLevelBest(15, lvl, opts), 0);
  assert.equal(starsForLevelBest(16, lvl, opts), 1);
  assert.equal(starsForLevelBest(19, lvl, opts), 2);
  assert.equal(starsForLevelBest(20, lvl, opts), 3);
});

test("total stars aggregates all modes from progress map", () => {
  const levelsByMode = {
    melody: [{ qCount: 20, pass: 0.8 }, { qCount: 20, pass: 0.8 }],
    chords: [{ qCount: 20, pass: 0.8 }],
    progressions: [{ qCount: 20, pass: 0.8 }],
  };
  const progress = {
    melody: { 0: 20, 1: 16 }, // 3 + 1
    chords: { 0: 19 },        // 2
    progressions: { 0: 12 },  // 0
  };
  const total = totalStarsForProgress(progress, levelsByMode, { defaultSessionLen: 20, defaultPassRate: 0.8 });
  assert.equal(total, 6);
});

test("mergeBestProgress only writes strictly better scores", () => {
  const prev = { melody: { 1: 14 }, chords: {}, progressions: {} };
  assert.equal(mergeBestProgress(prev, "melody", null, 18), prev);
  assert.equal(mergeBestProgress(prev, "melody", 1, 14), prev);
  assert.equal(mergeBestProgress(prev, "melody", 1, 10), prev);
  const next = mergeBestProgress(prev, "melody", 1, 18);
  assert.notEqual(next, prev);
  assert.equal(next.melody[1], 18);
});

test("countFirstTries matches session result semantics", () => {
  const results = [{ firstTry: true }, { firstTry: false }, { firstTry: true }, {}];
  assert.equal(countFirstTries(results), 2);
  assert.equal(countFirstTries([]), 0);
});

test("chooseSessionKey keeps melody/chord key-mode behavior", () => {
  const calls = [];
  const fakeRand = (exclude) => { calls.push(exclude); return "G"; };

  assert.equal(chooseSessionKey({ mode: "melody", lvl: { keyMode: "c" }, musicKey: "D", randKey: fakeRand }), "C");
  assert.equal(chooseSessionKey({ mode: "melody", lvl: { keyMode: "not-c" }, musicKey: "D", randKey: fakeRand }), "G");
  assert.deepEqual(calls[calls.length - 1], ["C"]);
  assert.equal(chooseSessionKey({ mode: "melody", lvl: { keyMode: "random" }, musicKey: "D", randKey: fakeRand }), "G");
  assert.deepEqual(calls[calls.length - 1], []);
  assert.equal(chooseSessionKey({ mode: "chords", lvl: { keyMode: "fixed" }, musicKey: "D", randKey: fakeRand }), "D");
  assert.equal(chooseSessionKey({ mode: "chords", lvl: { keyMode: "not-c" }, musicKey: "D", randKey: fakeRand }), "G");
  assert.deepEqual(calls[calls.length - 1], ["D"]);
  assert.equal(chooseSessionKey({ mode: "progressions", lvl: { keyMode: "random" }, musicKey: "D", randKey: fakeRand }), "G");
});

test("stage-clear celebration logic matches adventure rules", () => {
  const base = {
    fromAdventure: true,
    advStageId: 4,
    alreadyCleared: false,
    firstTries: 16,
    passCount: 16,
    levelIdx: 10,
    lastIdx: 12,
  };
  assert.equal(shouldCelebrateStageClear({ ...base, testMode: true }), true); // any passed level in test mode
  assert.equal(shouldCelebrateStageClear({ ...base, testMode: false }), false); // normal mode needs capstone
  assert.equal(shouldCelebrateStageClear({ ...base, testMode: false, levelIdx: 12 }), true);
  assert.equal(shouldCelebrateStageClear({ ...base, testMode: true, alreadyCleared: true }), false);
  assert.equal(shouldCelebrateStageClear({ ...base, testMode: true, fromAdventure: false }), false);
});

test("resolveSessionLevel decorates chords with sevenths only", () => {
  const levelsByMode = {
    melody: [{ name: "m0" }],
    chords: [{ name: "c0", pool: ["I", "V"] }],
    progressions: [{ name: "p0" }],
  };
  const melody = resolveSessionLevel({ mode: "melody", levelIdx: 0, levelsByMode, chordSevenths: true });
  const chord = resolveSessionLevel({ mode: "chords", levelIdx: 0, levelsByMode, chordSevenths: true });
  assert.deepEqual(melody, { name: "m0" });
  assert.deepEqual(chord, { name: "c0", pool: ["I", "V"], sevenths: true });
});

test("buildSessionState and nextQuestionProgress keep session counters stable", () => {
  const s = buildSessionState({
    mode: "chords",
    lvl: { name: "lvl" },
    levelIdx: 2,
    key: "G",
    chordSevenths: true,
    qCount: 20,
  });
  assert.equal(s.mode, "chords");
  assert.equal(s.sevenths, true);
  assert.equal(s.qNum, 0);
  assert.equal(s.qCount, 20);
  assert.deepEqual(nextQuestionProgress(0, 3), { nextQNum: 1, isComplete: false });
  assert.deepEqual(nextQuestionProgress(2, 3), { nextQNum: 3, isComplete: true });
});

test("nextRandomSessionKey only rotates on non-first random questions", () => {
  const fakeRand = () => "Eb";
  const lvlFixed = { keyMode: "fixed" };
  const lvlRandom = { keyMode: "random" };
  assert.equal(nextRandomSessionKey({ lvl: lvlFixed, isFirst: false, currentKey: "C", randKey: fakeRand }), "C");
  assert.equal(nextRandomSessionKey({ lvl: lvlRandom, isFirst: true, currentKey: "C", randKey: fakeRand }), "C");
  assert.equal(nextRandomSessionKey({ lvl: lvlRandom, isFirst: false, currentKey: "C", randKey: fakeRand }), "Eb");
});

test("pick helpers avoid immediate repeats when pool has alternatives", () => {
  const seq = (...vals) => {
    let i = 0;
    return () => vals[Math.min(i++, vals.length - 1)];
  };
  assert.equal(pickOctave([3, 4, 5], () => 0.99), 5);
  assert.equal(pickMelodyTarget([0, 2], 0, seq(0.0, 0.9)), 2); // first draw repeats, second draw changes
  assert.equal(pickMelodyTarget([0], 0, () => 0.0), 0);     // single option is allowed
  assert.equal(pickChordRoman(["I", "V"], "I", seq(0.0, 0.9)), "V");
  assert.equal(pickChordRoman(["I"], "I", () => 0.0), "I");
});
