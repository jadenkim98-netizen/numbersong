// Numbersong — the weak-link engine ("the cracked note").
//
// Pure: no React / Tone / window, so it is unit-tested directly like theory.mjs /
// pitch.mjs / boss.mjs and inlined by build.sh.
//
// The app already knows, every question, WHAT it asked and WHAT the player pressed
// instead — and it threw both away at the end of the results screen. This module is
// the memory: a small rolling aggregate ("the ear log") that survives sessions, plus
// the two things you can only do once you have it:
//
//   weakLink(ear, mode)  → "you hear 6 as 5, 41% of the time"
//   buildWeakDrill(...)  → the 60/30/10 deconstruction drill that fixes it
//
// The 60/30/10 split (60% isolated weak link · 30% integration · 10% whole skill) is
// from The Art of Practice: practicing the WHOLE skill lets your strengths mask the
// real problem, so the weak component has to be trained alone before it is put back.
//
// The ear log is an AGGREGATE, never an event list — it must stay a few KB in
// localStorage forever, so counts decay (see EAR_DECAY_AT) instead of growing.

import { NOTE_LABELS, PC_TO_DEGREE, chordNumber } from "./theory.mjs";

export const EAR_VERSION = 1;

// Past this many observations of one target, halve its counts. Exponential
// forgetting: the diagnosis reflects the player's ear NOW, not their first week.
export const EAR_DECAY_AT = 40;

// Don't diagnose from noise: a target needs this many observations before it can be
// called weak, and anything at/above WEAK_MAX_RATE first-try is not a weak link —
// it's a skill (and per the 90% rule, a reason to move UP, not to drill).
export const WEAK_MIN_SEEN = 8;
export const WEAK_MAX_RATE = 0.85;

// Which sub-map of the ear log a mode writes to. Progressions are deliberately
// absent in v1 — a wrong 3-chord answer doesn't cleanly blame one chord, so they
// need a per-slot attribution rule the other two modes don't. The `p` map exists in
// the shape so adding them later needs no migration.
export const BUCKETS = { melody: "n", chords: "c" };
export const bucketFor = (mode) => BUCKETS[mode] || null;

export function emptyEar() {
  return { v: EAR_VERSION, n: {}, c: {}, p: {} };
}

// Defensive load: any shape we don't recognise degrades to empty rather than
// throwing. Storage is user-editable and survives across app versions.
export function normalizeEar(raw) {
  if (!raw || typeof raw !== "object") return emptyEar();
  const stats = (m) => {
    if (!m || typeof m !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(m)) {
      if (!v || typeof v !== "object") continue;
      const seen = Number(v.seen) || 0;
      if (seen <= 0) continue;
      const miss = {};
      if (v.miss && typeof v.miss === "object") {
        for (const [mk, mv] of Object.entries(v.miss)) {
          const n = Number(mv) || 0;
          if (n > 0) miss[mk] = n;
        }
      }
      // first can never exceed seen (a corrupted log would otherwise read as mastery)
      out[k] = { seen, first: Math.min(Number(v.first) || 0, seen), miss, last: Number(v.last) || 0 };
    }
    return out;
  };
  return { v: EAR_VERSION, n: stats(raw.n), c: stats(raw.c), p: stats(raw.p) };
}

function decay(st) {
  if (st.seen < EAR_DECAY_AT) return;
  st.seen = Math.floor(st.seen / 2);
  st.first = Math.floor(st.first / 2);
  for (const k of Object.keys(st.miss)) {
    const n = Math.floor(st.miss[k] / 2);
    if (n > 0) st.miss[k] = n; else delete st.miss[k];
  }
}

/* ─────────────────────────────  RECORDING  ───────────────────────────── */

// Fold one finished session's results into the ear log. Returns a NEW ear object.
//
// `results` entries are the session engine's own shape, plus one field this module
// needs: `wrong` — the FIRST wrong answer given for that question (undefined if the
// player got it on the first try). Only the first wrong answer counts toward the
// confusion matrix: it's the honest instinct, and it keeps every miss count ≤ seen
// so "you call it 5, 41% of the time" is a percentage of questions, not of guesses.
export function recordSession(ear, mode, results, now = 0) {
  const bucket = bucketFor(mode);
  if (!bucket || !Array.isArray(results) || !results.length) return ear;
  const next = normalizeEar(ear);
  const map = next[bucket];
  for (const r of results) {
    if (!r || r.target == null) continue;
    const key = String(r.target);
    const st = map[key] || (map[key] = { seen: 0, first: 0, miss: {}, last: 0 });
    st.seen += 1;
    if (r.firstTry) st.first += 1;
    if (!r.firstTry && r.wrong != null) {
      const wk = String(r.wrong);
      st.miss[wk] = (st.miss[wk] || 0) + 1;
    }
    st.last = now;
    decay(st);
  }
  return next;
}

/* ─────────────────────────────  DIAGNOSIS  ───────────────────────────── */

// The cracked note: the target you get wrong most often, and what you call it
// instead. Returns null when there isn't enough evidence to say anything — which is
// the correct answer most of the time and must never be papered over with a guess.
export function weakLink(ear, mode) {
  const bucket = bucketFor(mode);
  if (!bucket) return null;
  const map = normalizeEar(ear)[bucket];
  let best = null;
  for (const [key, st] of Object.entries(map)) {
    if (st.seen < WEAK_MIN_SEEN) continue;
    const rate = st.first / st.seen;
    if (rate >= WEAK_MAX_RATE) continue;
    // worst rate wins; ties go to the target we've seen more of (more confidence)
    if (!best || rate < best.rate || (rate === best.rate && st.seen > best.seen)) {
      best = { key, seen: st.seen, first: st.first, rate, miss: st.miss };
    }
  }
  if (!best) return null;

  let confuser = null, confuserCount = 0;
  for (const [k, n] of Object.entries(best.miss)) {
    if (n > confuserCount) { confuser = k; confuserCount = n; }
  }
  return {
    key: best.key,
    target: mode === "melody" ? Number(best.key) : best.key,
    confuser: confuser == null ? null : (mode === "melody" ? Number(confuser) : confuser),
    seen: best.seen,
    first: best.first,
    rate: best.rate,                              // first-try rate on this target
    confuserCount,
    confuserRate: confuserCount / best.seen,      // share of ALL askings, not of misses
  };
}

// Display label for a target/confuser. Melody targets are pitch classes; chord
// targets are roman numerals shown in Jojo's number notation ("6-", "5D", …).
export function weakLabel(value, mode) {
  if (value == null) return "";
  if (mode === "melody") {
    const pc = Number(value);
    const deg = PC_TO_DEGREE[pc];
    return deg != null ? String(deg) : NOTE_LABELS[pc];
  }
  return chordNumber(value, false);
}

/* ─────────────────────────  THE 60/30/10 DRILL  ───────────────────────── */

// Semitone distance on the circle — used to pick the notes that sit closest to the
// weak one for the integration phase (its actual neighbours, not random pool items).
const pcDist = (a, b) => { const d = Math.abs(((a - b) % 12 + 12) % 12); return Math.min(d, 12 - d); };

// 60/30/10 of qCount, rounded so the three phases ALWAYS total exactly qCount and no
// phase is empty. Short sessions (TEST_MODE runs 3 questions) can't carry a real
// 60/30/10, so they degrade to one question per phase — or fewer phases if there
// aren't three questions to give.
export function splitPhases(qCount) {
  const n = Math.max(1, Math.floor(qCount) || 0);
  if (n < 3) return n === 1 ? [1] : [1, 1];
  let isolate = Math.max(1, Math.round(n * 0.6));
  let integrate = Math.max(1, Math.round(n * 0.3));
  // rounding can overspend the budget — pay it back from the largest phase first
  while (n - isolate - integrate < 1) {
    if (isolate >= integrate) isolate -= 1; else integrate -= 1;
  }
  return [isolate, integrate, n - isolate - integrate];
}

// Build the deconstruction drill as a `customLvl` — the same object shape the Custom
// builder already produces, so it runs through startSession(mode, null, lvl) with no
// new session engine. `phases` is the only addition; poolForQuestion() below reads it.
//
// Only the POOL narrows across phases. Key and octave context stay exactly as the
// player just played them — one variable isolated at a time, which is the whole
// point of deconstruction. Widening the pool back to the base level IS the
// reintegration step.
export function buildWeakDrill(weak, baseLvl, qCount) {
  if (!weak || !baseLvl) return null;
  // NB: baseLvl.mode is the KEY feel ("major"/"minor"), not the drill mode — the
  // drill mode is inferred from the weak target's type (pitch class vs roman).
  const basePool = Array.isArray(baseLvl.pool) ? baseLvl.pool : [];
  const isMelody = typeof weak.target === "number";
  const t = weak.target;
  const c = weak.confuser;

  // Phase 1 — isolate: the weak target against what it gets confused with. With no
  // confuser on record, pair it with its nearest pool neighbour so there's still a
  // discrimination to make (a one-note "drill" teaches nothing).
  let pair = [t];
  if (c != null && c !== t) pair.push(c);
  else {
    const alt = basePool.filter((x) => x !== t)
      .sort((a, b) => (isMelody ? pcDist(a, t) - pcDist(b, t) : 0))[0];
    if (alt != null) pair.push(alt);
  }

  // Phase 2 — integrate: add the two nearest other pool members back in.
  const extras = basePool
    .filter((x) => !pair.includes(x))
    .sort((a, b) => (isMelody ? pcDist(a, t) - pcDist(b, t) : 0))
    .slice(0, 2);
  const mid = [...pair, ...extras];

  // Phase 3 — whole: the level exactly as it was.
  const whole = basePool.length ? basePool : mid;

  const sortPool = (p) => (isMelody ? [...new Set(p)].sort((a, b) => a - b) : [...new Set(p)]);
  const pools = [pair, mid, whole];
  const labels = ["isolate", "integrate", "whole"];
  const counts = splitPhases(qCount);

  return {
    ...baseLvl,
    name: "Mending " + weakLabel(t, isMelody ? "melody" : "chords"),
    desc: "60/30/10 — isolate, integrate, whole",
    group: null,
    weakDrill: true,
    pool: sortPool(pair),            // fallback for any path that reads .pool directly
    qCount: counts.reduce((a, b) => a + b, 0),
    phases: counts.map((n, i) => ({ n, pool: sortPool(pools[i]), label: labels[i] })),
  };
}

// The one primitive that makes difficulty a function of question index instead of a
// constant. Levels without `phases` are unaffected, so every existing level behaves
// exactly as before.
export function poolForQuestion(lvl, qNum) {
  if (!lvl) return [];
  if (!Array.isArray(lvl.phases) || !lvl.phases.length) return lvl.pool;
  let acc = 0;
  for (const ph of lvl.phases) {
    acc += ph.n;
    if (qNum < acc) return ph.pool;
  }
  return lvl.phases[lvl.phases.length - 1].pool;
}

// Which phase a question sits in — drives the in-session "isolate / integrate /
// whole" caption so the player can see the method working on them.
export function phaseForQuestion(lvl, qNum) {
  if (!lvl || !Array.isArray(lvl.phases) || !lvl.phases.length) return null;
  let acc = 0;
  for (const ph of lvl.phases) {
    acc += ph.n;
    if (qNum < acc) return ph.label;
  }
  return lvl.phases[lvl.phases.length - 1].label;
}
