import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyEar, normalizeEar, recordSession, weakLink, weakLabel, earRows,
  buildWeakDrill, splitPhases, drawPoolForQuestion, phaseForQuestion,
  sessionFocus, withSessionFocus, SESSION_FOCUS_SHARE, SESSION_FOCUS_MAX,
  earBoard, earCoverage,
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

/* ── the full breakdown (the "Your ear" screen) ── */

test("earRows lists every target worst-first, including thin evidence", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 20, 8, 7));   // 60%
  ear = recordSession(ear, "melody", runs(4, 20, 2, 2));              // 90%
  ear = recordSession(ear, "melody", runs(0, 3, 3, 11));              // 0% but only 3 asks
  const rows = earRows(ear, "melody");
  assert.deepEqual(rows.map((r) => r.target), [0, 9, 4]);   // worst rate first
  assert.deepEqual(rows.map((r) => r.enough), [false, true, true]);
  assert.equal(rows[1].confuser, 7);
  assert.equal(rows[1].seen, 20);
});

test("earRows breaks rate ties by who we've seen more of", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 10, 5, 7));   // 50%, seen 10
  ear = recordSession(ear, "melody", runs(4, 20, 10, 2));             // 50%, seen 20
  assert.deepEqual(earRows(ear, "melody").map((r) => r.target), [4, 9]);
});

test("earRows and weakLink agree on the headline", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 20, 8, 7));
  ear = recordSession(ear, "melody", runs(0, 3, 3, 11));  // worse, but too thin to name
  const top = earRows(ear, "melody").filter((r) => r.enough)[0];
  assert.equal(weakLink(ear, "melody").target, top.target);
  assert.equal(weakLink(ear, "melody").target, 9);
});

test("earRows is empty for progressions and for an untouched log", () => {
  assert.deepEqual(earRows(emptyEar(), "melody"), []);
  assert.deepEqual(earRows(recordSession(emptyEar(), "chords", runs("vi", 9, 4, "I")), "progressions"), []);
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

test("the ANSWER pool is never narrowed — the drill must not become a coin flip", () => {
  // The whole point: shrinking the answer surface to the confused pair turns "name
  // it among seven" into "A or B", which a guess wins half the time.
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.deepEqual(d.pool, BASE.pool);
  for (let q = 0; q < 20; q++) {
    assert.deepEqual(d.pool, BASE.pool, `answer pool changed at question ${q}`);
  }
});

test("buildWeakDrill weights the stimulus: pair, then the weak note, then neither", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.deepEqual(d.phases.map((p) => p.n), [12, 6, 2]);
  assert.deepEqual(d.phases[0].focus, [7, 9]);   // compare: the confused pair
  assert.equal(d.phases[0].share, 0.75);
  assert.deepEqual(d.phases[1].focus, [9]);      // integrate: the weak note alone
  assert.equal(d.phases[1].share, 0.35);
  assert.deepEqual(d.phases[2].focus, []);       // whole: the level's own distribution
  assert.equal(d.phases[2].share, 0);
});

test("buildWeakDrill keeps the key and octave context untouched", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, { ...BASE, keyMode: "random", octaves: [3, 4, 5] }, 20);
  assert.equal(d.keyMode, "random");
  assert.deepEqual(d.octaves, [3, 4, 5]);
  assert.equal(d.mode, "major");
});

test("buildWeakDrill still gives something to discriminate with no confuser", () => {
  const d = buildWeakDrill({ target: 9, confuser: null }, BASE, 20);
  assert.equal(d.phases[0].focus.length, 2, "a one-note focus trains no discrimination");
  assert.ok(d.phases[0].focus.includes(9));
  // the partner is a NEAREST neighbour by semitone distance, not the next array
  // entry — 7 and 11 both sit 2 semitones from 9, so either is correct
  const partner = d.phases[0].focus.find((x) => x !== 9);
  assert.ok([7, 11].includes(partner), `expected a nearest neighbour, got ${partner}`);
  assert.deepEqual(d.pool, BASE.pool, "and the answer surface is still full");
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
  assert.deepEqual(d.phases[0].focus, ["vi", "I"]);
  assert.deepEqual(d.pool, ["I", "IV", "V", "vi"]);   // every chord still answerable
});

test("buildWeakDrill returns null without a diagnosis", () => {
  assert.equal(buildWeakDrill(null, BASE, 20), null);
  assert.equal(buildWeakDrill({ target: 9 }, null, 20), null);
});

/* ── the dashboard board ── */

test("earBoard shows the whole roster, including targets never heard", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 20, 8, 7));
  const board = earBoard(ear, "melody", [0, 2, 4, 9]);
  assert.equal(board.length, 4);
  assert.deepEqual(board.map((r) => r.target), [0, 2, 4, 9], "roster order is preserved");
  assert.equal(board[3].seen, 20);
  assert.equal(board[3].unheard, undefined);
  for (const r of board.slice(0, 3)) {
    assert.equal(r.unheard, true);
    assert.equal(r.seen, 0);
    assert.equal(r.enough, false);
  }
});

test("earBoard works on an empty log — the whole roster is a gap to fill", () => {
  const board = earBoard(emptyEar(), "melody", [0, 2, 4]);
  assert.equal(board.length, 3);
  assert.ok(board.every((r) => r.unheard && r.seen === 0));
});

test("earCoverage counts measured vs merely heard, and never fakes 0%", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 20, 8, 7));   // measured
  ear = recordSession(ear, "melody", runs(4, 3, 1, 2));               // heard, too thin
  const cov = earCoverage(earBoard(ear, "melody", [0, 2, 4, 9]));
  assert.equal(cov.total, 4);
  assert.equal(cov.measured, 1);
  assert.equal(cov.heard, 2);
  assert.equal(cov.asked, 23);
  assert.equal(Math.round(cov.overall * 100), 61); // (12+2)/23
});

test("earCoverage reports overall as null with nothing played", () => {
  const cov = earCoverage(earBoard(emptyEar(), "melody", [0, 2, 4]));
  assert.equal(cov.overall, null, "no data must not render as 0%");
  assert.equal(cov.measured, 0);
  assert.equal(cov.asked, 0);
});

/* ── always-on weighting in ordinary sessions ── */

test("sessionFocus only reaches for weak notes the level actually teaches", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 20, 10, 7));  // 6 is weak
  ear = recordSession(ear, "melody", runs(4, 20, 1, 2));              // 3 is fine
  // a level that teaches 1·2·3 must not start asking 6
  assert.deepEqual(sessionFocus(ear, "melody", [0, 2, 4]), []);
  // the full key does include it
  assert.deepEqual(sessionFocus(ear, "melody", BASE.pool), [9]);
});

test("sessionFocus is worst-first and capped", () => {
  let ear = emptyEar();
  for (const [pc, miss] of [[9, 12], [7, 10], [5, 8], [2, 6]]) {
    ear = recordSession(ear, "melody", runs(pc, 20, miss, 0));
  }
  const focus = sessionFocus(ear, "melody", BASE.pool);
  assert.equal(focus.length, SESSION_FOCUS_MAX);
  assert.deepEqual(focus, [9, 7, 5]);   // worst three, in order
});

test("sessionFocus ignores thin evidence and notes that aren't weak", () => {
  let ear = recordSession(emptyEar(), "melody", runs(9, 4, 4, 7));   // too few asks
  ear = recordSession(ear, "melody", runs(4, 20, 1, 2));             // 95% — not weak
  assert.deepEqual(sessionFocus(ear, "melody", BASE.pool), []);
});

test("withSessionFocus weights an ordinary level without touching its answer pool", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 20, 10, 7));
  const lvl = withSessionFocus(BASE, ear, "melody", 20);
  assert.deepEqual(lvl.pool, BASE.pool, "the answer surface must never change");
  assert.equal(lvl.phases.length, 1);
  assert.deepEqual(lvl.phases[0].focus, [9]);
  assert.equal(lvl.phases[0].share, SESSION_FOCUS_SHARE);
  // and it actually drives the draw
  assert.deepEqual(drawPoolForQuestion(lvl, 0, () => 0.1), [9]);
  assert.deepEqual(drawPoolForQuestion(lvl, 0, () => 0.9), BASE.pool);
  assert.deepEqual(drawPoolForQuestion(lvl, 19, () => 0.1), [9]); // whole session
});

test("withSessionFocus leaves a level alone when there's nothing to weight", () => {
  assert.equal(withSessionFocus(BASE, emptyEar(), "melody", 20), BASE);
  assert.equal(withSessionFocus(BASE, emptyEar(), "progressions", 20), BASE);
  assert.equal(withSessionFocus(null, emptyEar(), "melody", 20), null);
});

test("withSessionFocus never overrides a drill's own schedule", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 20, 10, 7));
  const drill = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.equal(withSessionFocus(drill, ear, "melody", 20), drill);
  assert.equal(drill.phases[0].share, 0.75, "the drill keeps its stronger weighting");
});

test("ambient weighting is gentle — the level still plays like itself", () => {
  const ear = recordSession(emptyEar(), "melody", runs(9, 20, 10, 7));
  const lvl = withSessionFocus(BASE, ear, "melody", 20);
  let seq = 7;
  const rng = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };
  const counts = {};
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const pool = drawPoolForQuestion(lvl, 0, rng);
    for (const pc of pool) counts[pc] = (counts[pc] || 0) + 1 / pool.length;
  }
  const share9 = counts[9] / N;
  // unweighted it would be 1/7 ≈ 0.143; weighted ≈ 0.18 + 0.82/7 ≈ 0.30
  assert.ok(share9 > 0.22 && share9 < 0.38, `expected a nudge, got ${share9}`);
  for (const pc of BASE.pool) {
    assert.ok(counts[pc] / N > 0.08, `note ${pc} must stay common, got ${counts[pc] / N}`);
  }
});

/* ── the per-question difficulty primitive ── */

test("drawPoolForQuestion picks the focus set exactly `share` of the time", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  // rng below share → focus; at/above → the full pool
  assert.deepEqual(drawPoolForQuestion(d, 0, () => 0.10), [7, 9]);
  assert.deepEqual(drawPoolForQuestion(d, 0, () => 0.74), [7, 9]);
  assert.deepEqual(drawPoolForQuestion(d, 0, () => 0.76), BASE.pool);
  assert.deepEqual(drawPoolForQuestion(d, 12, () => 0.30), [9]);      // integrate
  assert.deepEqual(drawPoolForQuestion(d, 12, () => 0.40), BASE.pool);
  assert.deepEqual(drawPoolForQuestion(d, 19, () => 0.00), BASE.pool); // whole: never focused
  assert.deepEqual(drawPoolForQuestion(d, 99, () => 0.00), BASE.pool); // past the end: clamp
});

test("the weak note is oversampled but everything else keeps appearing", () => {
  // interleaving, not a blocked run: a phase of only-the-weak-note would show fast
  // in-session gains and poor retention
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  let seq = 0;
  const rng = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };
  const counts = {};
  for (let i = 0; i < 4000; i++) {
    const pool = drawPoolForQuestion(d, 0, rng);
    for (const pc of pool) counts[pc] = (counts[pc] || 0) + 1 / pool.length;
  }
  const share = (pc) => counts[pc] / 4000;
  assert.ok(share(9) > 0.3, `weak note should dominate, got ${share(9)}`);
  const others = BASE.pool.filter((p) => p !== 9 && p !== 7);
  for (const pc of others) {
    assert.ok(share(pc) > 0.01, `note ${pc} must still appear, got ${share(pc)}`);
  }
});

test("drawPoolForQuestion leaves ordinary levels exactly as they are", () => {
  assert.deepEqual(drawPoolForQuestion(BASE, 0, () => 0), BASE.pool);
  assert.deepEqual(drawPoolForQuestion(BASE, 19, () => 0.99), BASE.pool);
  assert.equal(phaseForQuestion(BASE, 0), null);
});

test("phaseForQuestion names the phase the player is in", () => {
  const d = buildWeakDrill({ target: 9, confuser: 7 }, BASE, 20);
  assert.equal(phaseForQuestion(d, 0), "compare");
  assert.equal(phaseForQuestion(d, 12), "integrate");
  assert.equal(phaseForQuestion(d, 19), "whole");
});
