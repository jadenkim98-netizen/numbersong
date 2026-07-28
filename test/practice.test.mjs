import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyEar, normalizeEar, recordSession, weakLink, weakLabel,
  buildWeakDrill, splitPhases, poolForQuestion, phaseForQuestion,
  EAR_DECAY_AT, WEAK_MIN_SEEN,
} from "../src/practice.mjs";

/* ── recording ── */

// helper: n questions on one target, `misses` of them wrong (answered as `wrong`)
const runs = (target, n, misses, wrong) =>
  Array.from({ length: n }, (_, i) =>
    i < misses ? { target, firstTry: false, wrong } : { target, firstTry: true });

test("recordSession folds hits, misses and the confusion into the ear log", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 10, 4, 7));
  assert.equal(ear.n["9"].seen, 10);
  assert.equal(ear.n["9"].first, 6);
  assert.equal(ear.n["9"].miss["7"], 4);
});

test("recordSession accumulates across sessions", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 10, 4, 7));
  ear = recordSession(ear, "melody", runs(9, 10, 3, 7));
  assert.equal(ear.n["9"].seen, 20);
  assert.equal(ear.n["9"].first, 13);
  assert.equal(ear.n["9"].miss["7"], 7);
});

test("recordSession does not mutate the ear it was given", () => {
  const ear = emptyEar();
  recordSession(ear, "melody", runs(9, 10, 4, 7));
  assert.deepEqual(ear.n, {});
});

test("a first-try correct answer never records a confusion", () => {
  // `wrong` is only meaningful when firstTry is false; a stray value must be ignored
  const ear = recordSession(emptyEar(), "melody", [{ target: 9, firstTry: true, wrong: 7 }]);
  assert.deepEqual(ear.n["9"].miss, {});
});

test("chord sessions write to their own bucket, keyed by roman", () => {
  const ear = recordSession(emptyEar(), "chords", runs("vi", 10, 6, "I"));
  assert.equal(ear.c["vi"].seen, 10);
  assert.equal(ear.c["vi"].miss["I"], 6);
  assert.deepEqual(ear.n, {});
});

test("progressions are not recorded in v1", () => {
  const ear = recordSession(emptyEar(), "progressions", runs("I–V–vi", 10, 5, "x"));
  assert.deepEqual(ear.p, {});
});

test("counts halve once a target passes the decay threshold", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, EAR_DECAY_AT, EAR_DECAY_AT, 7));
  // the decay fires on the question that reaches the threshold, so seen lands at half
  assert.ok(ear.n["9"].seen < EAR_DECAY_AT, "seen should have been halved");
  assert.ok(ear.n["9"].miss["7"] < EAR_DECAY_AT, "miss counts should have been halved too");
});

/* ── normalize / robustness ── */

test("normalizeEar survives garbage without throwing", () => {
  assert.deepEqual(normalizeEar(null), emptyEar());
  assert.deepEqual(normalizeEar("nope"), emptyEar());
  assert.deepEqual(normalizeEar({ n: "nope" }), emptyEar());
  assert.deepEqual(normalizeEar({ n: { 9: null } }).n, {});
});

test("normalizeEar clamps a corrupted first-try count to seen", () => {
  const ear = normalizeEar({ n: { 9: { seen: 5, first: 999, miss: {} } } });
  assert.equal(ear.n["9"].first, 5);
  assert.equal(weakLink(ear, "melody"), null); // and so it can't read as mastery
});

/* ── diagnosis ── */

test("weakLink returns null until there is enough evidence", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, WEAK_MIN_SEEN - 1, 5, 7));
  assert.equal(weakLink(ear, "melody"), null);
});

test("weakLink returns null when nothing is actually weak", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 20, 1, 7)); // 95% first try
  assert.equal(weakLink(ear, "melody"), null);
});

test("weakLink picks the worst target and names the confuser", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 20, 8, 7));  // 60% — the weak one
  ear = recordSession(ear, "melody", runs(4, 20, 2, 2));             // 90% — fine
  const w = weakLink(ear, "melody");
  assert.equal(w.target, 9);
  assert.equal(w.confuser, 7);
  assert.equal(w.rate, 0.6);
  assert.equal(w.confuserRate, 0.4); // "you call it 7, 40% of the time"
});

test("weakLink picks the most common confuser, not the first seen", () => {
  const results = [...runs(9, 12, 3, 11), ...runs(9, 8, 6, 7)];
  const w = weakLink(recordSession(emptyEar(), "melody", results), "melody");
  assert.equal(w.confuser, 7);
  assert.equal(w.confuserCount, 6);
});

test("weakLink reports a weak target with no confuser on record", () => {
  const ear = recordSession(emptyEar(), "melody",
    Array.from({ length: 20 }, (_, i) => ({ target: 9, firstTry: i >= 8 })));
  const w = weakLink(ear, "melody");
  assert.equal(w.target, 9);
  assert.equal(w.confuser, null);
  assert.equal(w.confuserCount, 0);
});

test("weakLink works on chords and keeps romans as strings", () => {
  const w = weakLink(recordSession(emptyEar(), "chords", runs("vi", 20, 9, "I")), "chords");
  assert.equal(w.target, "vi");
  assert.equal(w.confuser, "I");
});

test("weakLabel renders degrees for melody and Jojo numbers for chords", () => {
  assert.equal(weakLabel(9, "melody"), "6");   // pitch class 9 = degree 6
  assert.equal(weakLabel(0, "melody"), "1");
  assert.equal(weakLabel(1, "melody"), "♭2");  // chromatic — no degree, use the label
  assert.equal(weakLabel("vi", "chords"), "6-");
  assert.equal(weakLabel(null, "melody"), "");
});

/* ── the 60/30/10 drill ── */

test("splitPhases is 60/30/10 and always totals the session length", () => {
  assert.deepEqual(splitPhases(20), [12, 6, 2]);
  assert.deepEqual(splitPhases(30), [18, 9, 3]);
  for (const n of [3, 5, 10, 20, 30]) {
    assert.equal(splitPhases(n).reduce((a, b) => a + b, 0), n, `phases must total ${n}`);
    assert.ok(splitPhases(n).every((x) => x >= 1), `no empty phase at ${n}`);
  }
});

const BASE = { mode: "major", chromatic: false, pool: [0, 2, 4, 5, 7, 9, 11], keyMode: "c", octaves: [4] };

test("buildWeakDrill isolates the pair, then integrates, then restores the level", () => {
  const w = { target: 9, confuser: 7 };
  const d = buildWeakDrill(w, BASE, 20);
  assert.deepEqual(d.phases.map((p) => p.n), [12, 6, 2]);
  assert.deepEqual(d.phases[0].pool, [7, 9]);           // isolate: just the confused pair
  // integrate: + the two nearest neighbours of 9 (= 11 and 0, i.e. degrees 7 and 1 —
  // the la-ti-do cluster around it), NOT just the next pool entries
  assert.deepEqual(d.phases[1].pool, [0, 7, 9, 11]);
  assert.deepEqual(d.phases[2].pool, BASE.pool);        // whole: the level as it was
});

test("buildWeakDrill keeps the key and octave context untouched", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, { ...BASE, keyMode: "random", octaves: [3, 4, 5] }, 20);
  assert.equal(d.keyMode, "random");
  assert.deepEqual(d.octaves, [3, 4, 5]);
  assert.equal(d.mode, "major");
});

test("buildWeakDrill still gives something to discriminate with no confuser", () => {
  const d = buildWeakDrill({ target: 9, confuser: null }, BASE, 20);
  assert.equal(d.phases[0].pool.length, 2, "a one-note drill teaches nothing");
  assert.ok(d.phases[0].pool.includes(9));
});

test("buildWeakDrill runs as a custom (unscored) level and is flagged", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.equal(d.weakDrill, true);
  assert.equal(d.group, null);
  assert.equal(d.qCount, 20);
  assert.match(d.name, /6/); // "Mending 6"
});

test("buildWeakDrill handles chord pools (romans, no semitone sorting)", () => {
  const chordBase = { mode: "major", pool: ["I", "IV", "V", "vi"], keyMode: "c", octaves: [4] };
  const d = buildWeakDrill({ target: "vi", confuser: "I" }, chordBase, 20);
  assert.deepEqual(d.phases[0].pool, ["vi", "I"]);
  assert.equal(d.phases[2].pool.length, 4);
});

test("buildWeakDrill returns null without a diagnosis", () => {
  assert.equal(buildWeakDrill(null, BASE, 20), null);
  assert.equal(buildWeakDrill({ target: 9 }, null, 20), null);
});

/* ── the per-question difficulty primitive ── */

test("poolForQuestion walks the phases by question index", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.deepEqual(poolForQuestion(d, 0), [7, 9]);
  assert.deepEqual(poolForQuestion(d, 11), [7, 9]);          // last isolate question
  assert.deepEqual(poolForQuestion(d, 12), [0, 7, 9, 11]);   // first integrate question
  assert.deepEqual(poolForQuestion(d, 17), [0, 7, 9, 11]);
  assert.deepEqual(poolForQuestion(d, 18), BASE.pool);       // whole
  assert.deepEqual(poolForQuestion(d, 99), BASE.pool);       // past the end: clamp
});

test("poolForQuestion leaves ordinary levels exactly as they are", () => {
  assert.deepEqual(poolForQuestion(BASE, 0), BASE.pool);
  assert.deepEqual(poolForQuestion(BASE, 19), BASE.pool);
  assert.equal(phaseForQuestion(BASE, 0), null);
});

test("phaseForQuestion names the phase the player is in", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.equal(phaseForQuestion(d, 0), "isolate");
  assert.equal(phaseForQuestion(d, 12), "integrate");
  assert.equal(phaseForQuestion(d, 19), "whole");
});
