import React, { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

/* ─────────────────────────────  MUSIC DATA  ───────────────────────────── */

const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const DEGREE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14 }; // 9 = degree 2 an octave up (audio only)
const SOLFEGE = { 1: "do", 2: "re", 3: "mi", 4: "fa", 5: "sol", 6: "la", 7: "ti", 8: "do" };
const NUMBER_WORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "one" };
const degreeLabel = (d) => (d === 8 ? "1" : String(d)); // octave is 1 again, never "8"

// Chromatic note model: every answerable melody note is a pitch-class 0–11 above
// the MAJOR tonic. Labels never change; minor just moves "home" to 6 (la-based).
const NOTE_LABELS  = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
const NOTE_SOLFEGE = ["do", "ra", "re", "me", "mi", "fa", "fi", "sol", "le", "la", "te", "ti"];
const ALTERED_PCS  = [1, 3, 6, 8, 10];
const NAT_PCS      = [0, 2, 4, 5, 7, 9, 11];              // degrees 1–7
const ALL12        = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PC_TO_DEGREE = { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 };
const DEGREE_TO_PC = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
const mod12 = (n) => ((n % 12) + 12) % 12;
const tonicPcOf = (mode) => (mode === "minor" ? 9 : 0);  // la-based minor → home is 6

// Cadences that anchor the ear in the key, as semitone chords above key+"4".
const CADENCES = {
  major: [
    { semis: [0, 4, 7],   bass: 0 },   // I
    { semis: [5, 9, 12],  bass: 5 },   // IV
    { semis: [7, 11, 14], bass: 7 },   // V
    { semis: [0, 4, 7],   bass: 0 },   // I
  ],
  minor: [
    { semis: [-3, 0, 4],  bass: -3 },  // i   (A minor, relative to C major)
    { semis: [2, 5, 9],   bass: 2 },   // iv  (D minor)
    { semis: [4, 8, 11],  bass: 4 },   // V   (E major — raised leading tone)
    { semis: [-3, 0, 4],  bass: -3 },  // i
  ],
};

// Diatonic triads expressed as scale degrees of the KEY (the whole point!)
const CHORDS = [
  { roman: "I",    name: "tonic",        tones: [1, 3, 5] },
  { roman: "ii",   name: "supertonic",   tones: [2, 4, 6] },
  { roman: "iii",  name: "mediant",      tones: [3, 5, 7] },
  { roman: "IV",   name: "subdominant",  tones: [4, 6, 1] },
  { roman: "V",    name: "dominant",     tones: [5, 7, 2] },
  { roman: "vi",   name: "submediant",   tones: [6, 1, 3] },
  { roman: "vii°", name: "leading",      tones: [7, 2, 4] },
];

// A word for each degree when you name it right
const DEGREE_QUIPS = {
  1: "Like we never left home.",
  2: "Close to home.",
  3: "Mary had...",
  4: "(Fa)r far from home.",
  5: "5 points to 1.",
  6: "Laaa tii do!",
  7: "Barely below home.",
};

// After a correct answer the note walks home, given as SEMITONES relative to the
// note's own octave. Major walks home to 1 (0/12); la-based minor walks to the
// nearest 6 (A sits at +9 above, or -3 below, the C reference).
const RES_MAJOR = { 1: [0], 2: [2, 0], 3: [4, 2, 0], 4: [5, 4, 2, 0], 5: [7, 9, 11, 12], 6: [9, 11, 12], 7: [11, 12] };
const RES_MINOR = { 1: [0, -1, -3], 2: [2, 0, -1, -3], 3: [4, 2, 0, -1, -3], 4: [5, 7, 9], 5: [7, 9], 6: [9], 7: [11, 9] };

function resolutionSemis(pc, mode) {
  const deg = PC_TO_DEGREE[pc];
  if (deg != null) return (mode === "minor" ? RES_MINOR : RES_MAJOR)[deg];
  // altered (chromatic) note: step to the nearest diatonic note in the direction
  // of the closest home (1 in major, 6 in minor), then ride that note's usual
  // scale resolution the rest of the way home.
  const homes = mode === "minor" ? [-3, 9, 21] : [0, 12];
  let H = homes[0], bd = 1e9;
  for (const h of homes) { const d = Math.abs(pc - h); if (d < bd) { bd = d; H = h; } }
  const tied = homes.filter((h) => Math.abs(pc - h) === bd);
  if (tied.length > 1) H = mode === "minor" ? Math.min(...tied) : Math.max(...tied); // ♯4 leans up; minor leans down
  const DIA = [0, 2, 4, 5, 7, 9, 11];
  const dia = H > pc ? DIA.find((d) => d > pc) : [...DIA].reverse().find((d) => d < pc);
  return [pc, ...(mode === "minor" ? RES_MINOR : RES_MAJOR)[PC_TO_DEGREE[dia]]];
}

// A word for each note when you name it right
const ALT_QUIPS = {
  1: "♭2 — right above home.",
  3: "♭3 — the blue third.",
  6: "♯4 — the tritone's edge.",
  8: "♭6 — a soft shadow.",
  10: "♭7 — bluesy, leans down.",
};

const CHORD_INSIGHTS = {
  I:    "Home itself — 1, 3 and 5 all at rest.",
  ii:   "All three tones lean toward home: 2→1, 4→3, 6→5.",
  iii:  "Shares 3 and 5 with home, but 7 keeps it restless.",
  IV:   "Same as the 1 chord, but includes notes 4 and 6 — plus the home note 1, hiding in plain sight.",
  V:    "7 and 2 both pull hard toward 1. Maximum tension.",
  vi:   "Contains the tonic (1) and mediant (3) — home's shadow.",
  "vii°": "No rest anywhere: 7, 2 and 4 all demand resolution.",
};

/* ─────────────────────────────  LEVELS & SESSIONS  ───────────────────────────── */

const SESSION_LEN = 10;
const PASS_RATE = 0.8;

// Each of the four worlds (diatonic/chromatic × major/minor) follows the same
// FET-style ramp: three intro levels in C, then octaves, then away from C, then
// a new key every question. Pools are pitch-classes (0–11 above the major tonic).
function buildGroup(group, mode, chromatic, intro) {
  const FULL = chromatic ? ALL12 : NAT_PCS;
  const tail = [
    ["Octaves apart",        "any octave",                          "c",      [3, 4, 5]],
    ["A new home",           "a new key · one octave",              "not-c",  [4]],
    ["New home, any octave", "a new key · any octave",              "not-c",  [3, 4, 5]],
    ["Wandering",            "new key every question",              "random", [4]],
    ["Wandering, any octave","new key every question · any octave", "random", [3, 4, 5]],
  ];
  const base = { group, mode, chromatic };
  return [
    ...intro.map(([name, desc, pool]) => ({ ...base, name, desc, pool, keyMode: "c", octaves: [4] })),
    ...tail.map(([name, desc, keyMode, octaves]) => ({ ...base, name, desc, pool: FULL, keyMode, octaves })),
  ];
}

const MELODY_LEVELS = [
  ...buildGroup("Diatonic · major", "major", false, [
    ["First steps",     "degrees 1 · 2 · 3", [0, 2, 4]],
    ["Half the ladder", "degrees 1 – 5",     [0, 2, 4, 5, 7]],
    ["The full key",    "all seven degrees", NAT_PCS],
  ]),
  ...buildGroup("Diatonic · minor", "minor", false, [
    ["First steps",     "6 · 7 · 1 (la ti do)", [9, 11, 0]],
    ["Half the ladder", "6 · 7 · 1 · 2 · 3",    [9, 11, 0, 2, 4]],
    ["The full key",    "all seven degrees",    NAT_PCS],
  ]),
  ...buildGroup("Chromatic · major", "major", true, [
    ["Lower half", "1 ♭2 2 ♭3 3 4",   [0, 1, 2, 3, 4, 5]],
    ["Upper half", "♯4 5 ♭6 6 ♭7 7 1", [0, 6, 7, 8, 9, 10, 11]],
    ["Every color", "all twelve notes", ALL12],
  ]),
  ...buildGroup("Chromatic · minor", "minor", true, [
    ["Around home", "6 ♭7 7 1 ♭2 2",   [9, 10, 11, 0, 1, 2]],
    ["The far side", "♭3 3 4 ♯4 5 ♭6 6", [3, 4, 5, 6, 7, 8, 9]],
    ["Every color", "all twelve notes", ALL12],
  ]),
];

// The four worlds, sliced back out of the flat level list for the FET-style
// two-tier picker (pick a world → see its ramp). Each carries its start index
// so a level's global position (for progress/unlock) stays intact.
const MELODY_GROUPS = MELODY_LEVELS.reduce((groups, lvl, idx) => {
  let g = groups.find((x) => x.name === lvl.group);
  if (!g) { g = { name: lvl.group, start: idx, levels: [] }; groups.push(g); }
  g.levels.push({ ...lvl, idx });
  return groups;
}, []);
const groupIndexOf = (li) => MELODY_GROUPS.findIndex((g) => li >= g.start && li < g.start + g.levels.length);

// Clean FET-style pill tags for a melody level's card (the level name already
// says which notes, so we show key context + octave scope instead of a string).
function levelTags(lvl) {
  const key = lvl.keyMode === "c"
    ? (lvl.mode === "minor" ? "A minor" : "C major")
    : lvl.keyMode === "not-c" ? "New key" : "Every key";
  return [key, lvl.octaves.length > 1 ? "Many octaves" : "1 octave"];
}

function randKey(exclude) {
  let k;
  do { k = KEYS[Math.floor(Math.random() * KEYS.length)]; } while (exclude.includes(k));
  return k;
}

// A chord's degrees; with sevenths on, add the 7th (two scale steps above the 5th).
const chordTones = (chord, sevenths) =>
  sevenths ? [...chord.tones, ((chord.tones[0] - 1 + 6) % 7) + 1] : chord.tones;

// Quality names + proper symbols per diatonic chord (major key).
const CHORD_QUALITY = {
  I:      { tri: "major",      sev: "major 7th" },
  ii:     { tri: "minor",      sev: "minor 7th" },
  iii:    { tri: "minor",      sev: "minor 7th" },
  IV:     { tri: "major",      sev: "major 7th" },
  V:      { tri: "major",      sev: "dominant 7th" },
  vi:     { tri: "minor",      sev: "minor 7th" },
  "vii°": { tri: "diminished", sev: "half-diminished 7th" },
};
const SEVENTH_SYMBOL = { I: "Imaj7", ii: "ii7", iii: "iii7", IV: "IVmaj7", V: "V7", vi: "vi7", "vii°": "viiø7" };
const chordSymbol = (roman, sevenths) => (sevenths ? SEVENTH_SYMBOL[roman] : roman);
const chordQuality = (roman, sevenths) => CHORD_QUALITY[roman][sevenths ? "sev" : "tri"];

// Number notation (the method): major = plain number, minor = number-, dim = 7dim.
const CHORD_NUMBER   = { I: "1", ii: "2-", iii: "3-", IV: "4", V: "5D", vi: "6-", "vii°": "7dim" };
const CHORD_NUMBER_7 = { I: "1maj7", ii: "2-7", iii: "3-7", IV: "4maj7", V: "5D7", vi: "6-7", "vii°": "7-7b5" };
const chordNumber = (roman, sevenths) => (sevenths ? CHORD_NUMBER_7 : CHORD_NUMBER)[roman];

const ALL_CHORDS = CHORDS.map((c) => c.roman);
const chordByRoman = (r) => CHORDS.find((c) => c.roman === r);
const FOUR = ["I", "IV", "V", "vi"];          // the 1-4-5-6 core (major)
const FOUR_MINOR = ["vi", "ii", "iii", "IV"]; // the 6-2-3-4 core (la-based minor: i·iv·v·VI)

// Each chapter is a mastery ramp: isolate the hard sounds as pairs, fold into the
// group, then force transposition. Capstone (every key) is tougher on purpose.
// The Minor chapter plays a minor cadence (home on 6) — same idea, minor world.
function chordRamp(chapter, mode, intro, four) {
  const cap = { chapter, mode };
  return [
    ...intro.map(([name, desc, pool]) => ({ ...cap, name, desc, pool, keyMode: "fixed" })),
    { ...cap, name: "The big four", desc: mode === "minor" ? "6- · 2- · 3- · 4" : "1 · 4 · 5D · 6-", pool: four, keyMode: "fixed" },
    { ...cap, name: "New key", desc: "the big four · a new key", pool: four, keyMode: "not-c" },
    { ...cap, name: "Every key", desc: "the big four · new key each Q · capstone", pool: four, keyMode: "random", qCount: 15, pass: 0.85 },
    { ...cap, name: "Advanced · all seven", desc: "every diatonic triad", pool: ALL_CHORDS, keyMode: "fixed" },
  ];
}
const CHORD_LEVELS = [
  ...chordRamp("Major · 1 4 5 6", "major", [
    ["Home & away",       "1 · 5D",                       ["I", "V"]],
    ["The three pillars", "1 · 4 · 5D",                   ["I", "IV", "V"]],
    ["Meet the six",      "1 · 6-  (major vs its minor)", ["I", "vi"]],
  ], FOUR),
  ...chordRamp("Minor · 6 2 3 4", "minor", [
    ["Home & away",       "6- · 3-",                     ["vi", "iii"]],
    ["The three pillars", "6- · 2- · 3-",                ["vi", "ii", "iii"]],
    ["Meet the four",     "6- · 4  (the major one)",     ["vi", "IV"]],
  ], FOUR_MINOR),
];
const CHORD_CHAPTERS = CHORD_LEVELS.reduce((chs, lvl, idx) => {
  let c = chs.find((x) => x.name === lvl.chapter);
  if (!c) { c = { name: lvl.chapter, start: idx, levels: [] }; chs.push(c); }
  c.levels.push({ ...lvl, idx });
  return chs;
}, []);
const chordChapterIndexOf = (li) => CHORD_CHAPTERS.findIndex((c) => li >= c.start && li < c.start + c.levels.length);

/* ── chord progressions ── */
// Curated common progressions from the 1-4-5-6 core, by length. Later levels
// generate random sequences from a pool; an advanced tier opens up all seven.
const CURATED_4 = {
  2: [["I", "V"], ["I", "IV"], ["I", "vi"], ["vi", "IV"], ["V", "vi"], ["IV", "V"]],
  3: [["I", "IV", "V"], ["I", "V", "vi"], ["I", "vi", "IV"], ["vi", "IV", "V"], ["IV", "V", "I"], ["I", "vi", "V"]],
  4: [["I", "V", "vi", "IV"], ["vi", "IV", "I", "V"], ["I", "vi", "IV", "V"], ["IV", "V", "I", "vi"], ["I", "IV", "V", "vi"], ["vi", "V", "IV", "I"]],
};
// Minor curated progressions from 6-2-3-4 (i·iv·v·VI, la-based, home = vi).
const CURATED_4_MINOR = {
  2: [["vi", "ii"], ["vi", "iii"], ["vi", "IV"], ["IV", "iii"], ["ii", "iii"], ["IV", "ii"]],
  3: [["vi", "ii", "iii"], ["vi", "IV", "ii"], ["vi", "ii", "IV"], ["vi", "IV", "iii"], ["ii", "iii", "vi"], ["vi", "iii", "ii"]],
  4: [["vi", "ii", "iii", "vi"], ["vi", "IV", "ii", "iii"], ["vi", "ii", "IV", "iii"], ["IV", "ii", "vi", "iii"], ["vi", "iii", "IV", "ii"], ["vi", "IV", "iii", "ii"]],
};
function randomProgression(len, pool, home) {
  const seq = [home];
  while (seq.length < len) {
    let c;
    do { c = pool[Math.floor(Math.random() * pool.length)]; } while (c === seq[seq.length - 1]);
    seq.push(c);
  }
  return seq;
}
function pickProgression(lvl, avoid) {
  if (lvl.gen === "curated") {
    const set = (lvl.mode === "minor" ? CURATED_4_MINOR : CURATED_4)[lvl.len];
    let p;
    do { p = set[Math.floor(Math.random() * set.length)]; } while (set.length > 1 && avoid && p.join() === avoid.join());
    return p;
  }
  return randomProgression(lvl.len, lvl.pool, lvl.home);
}
function progRamp(chapter, mode, pool, home) {
  const cap = { chapter, mode, home };
  return [
    { ...cap, name: "Two-chord moves",      desc: "pairs",           len: 2, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Three-chord",          desc: "threes",          len: 3, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics",  desc: "the common ones", len: 4, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Any order",            desc: "random · 4",      len: 4, gen: "random",  pool, keyMode: "fixed" },
    { ...cap, name: "Every key",            desc: "random · new key each Q · capstone", len: 4, gen: "random", pool, keyMode: "random", qCount: 15, pass: 0.85 },
    { ...cap, name: "Advanced · all seven", desc: "every triad · random 4", len: 4, gen: "random", pool: ALL_CHORDS, keyMode: "fixed" },
  ];
}
const PROG_LEVELS = [
  ...progRamp("Major · 1 4 5 6", "major", FOUR, "I"),
  ...progRamp("Minor · 6 2 3 4", "minor", FOUR_MINOR, "vi"),
];
const PROG_CHAPTERS = PROG_LEVELS.reduce((chs, lvl, idx) => {
  let c = chs.find((x) => x.name === lvl.chapter);
  if (!c) { c = { name: lvl.chapter, start: idx, levels: [] }; chs.push(c); }
  c.levels.push({ ...lvl, idx });
  return chs;
}, []);
const progChapterIndexOf = (li) => PROG_CHAPTERS.findIndex((c) => li >= c.start && li < c.start + c.levels.length);

// Adventure region order = the teaching spine (map nodes 1→8):
// diatonic notes → chord tones → progressions → chromatic notes (the hard stuff last).
// gi = index within that mode's group/chapter array.
const ADV_STAGES = [
  { mode: "melody",       gi: 0 }, // 1  diatonic major — single notes
  { mode: "melody",       gi: 1 }, // 2  diatonic minor — single notes
  { mode: "chords",       gi: 0 }, // 3  chord tones, major (1 4 5 6)
  { mode: "chords",       gi: 1 }, // 4  chord tones, minor (6 2 3 4)
  { mode: "progressions", gi: 0 }, // 5  progressions, major
  { mode: "progressions", gi: 1 }, // 6  progressions, minor
  { mode: "melody",       gi: 2 }, // 7  chromatic major — single notes
  { mode: "melody",       gi: 3 }, // 8  chromatic minor — single notes
];
const advGroupOf = (s) => s.mode === "melody" ? MELODY_GROUPS[s.gi] : s.mode === "chords" ? CHORD_CHAPTERS[s.gi] : PROG_CHAPTERS[s.gi];

// One-line "what you'll learn" preview shown at the top of a stage's level list.
function stageGoal(mode, name) {
  if (mode === "melody") return ({
    "Diatonic · major": "Hear any of the seven degrees (1–7) in a major key and name it by number — building from 1·2·3 up to the full key, then any octave, then any key.",
    "Diatonic · minor": "The same seven degrees, but home is 6 (la-based minor). Learn to feel 6 as the resting place.",
    "Chromatic · major": "Add the five color notes between the scale steps (♭2 ♭3 ♯4 ♭6 ♭7) — hearing all twelve notes of the major key.",
    "Chromatic · minor": "All twelve notes around a minor home (6) — the color notes in the minor world.",
  })[name] || "";
  if (mode === "chords") return name.startsWith("Major")
    ? "Hear a chord and pick out its notes as numbers. Master the four workhorse chords of a major key: 1, 4, 5D and 6-."
    : "Pick out chord notes centered on a minor home — the four chords 6-, 2-, 3- and 4.";
  return name.startsWith("Major")
    ? "Hear two-to-four chords in a row and name each in order — the 1-4-5-6 family behind most songs."
    : "Follow minor progressions from the 6-2-3-4 family and name each chord in order.";
}

// Melody Paths (Free Play jam) — preset progressions. The tonic is repeated so a
// "251" or "145" stays an even 4-bar loop instead of an odd 3-bar one.
const PATH_PRESETS = [
  ["I", "V", "vi", "IV"],   // 1 5 6 4
  ["vi", "IV", "I", "V"],   // 6 4 1 5
  ["I", "vi", "IV", "V"],   // 1 6 4 5
  ["ii", "V", "I", "I"],    // 2 5 1 1
  ["IV", "ii", "iii", "vi"],// 4 2 3 6
];
// Grid rows top→bottom: degree 7 down to 1, with home (1) on the bottom.
const PATH_ROWS = [
  { d: 7, oct: 4 }, { d: 6, oct: 4 }, { d: 5, oct: 4 }, { d: 4, oct: 4 },
  { d: 3, oct: 4 }, { d: 2, oct: 4 }, { d: 1, oct: 4 },
];
const PATH_SPEEDS = [
  { label: "Slow", beat: 2.2 }, { label: "Medium", beat: 1.6 },
  { label: "Fast", beat: 1.1 }, { label: "Faster", beat: 0.8 },
];
// keyboard: the whole number row is a continuous diatonic scale —
// `=7 below home, 1–7 the home octave, 8 9 0 - = the octave above (1–5).
const KEY_MAP = {
  "`": { d: 7, oct: 3 },
  "1": { d: 1, oct: 4 }, "2": { d: 2, oct: 4 }, "3": { d: 3, oct: 4 }, "4": { d: 4, oct: 4 },
  "5": { d: 5, oct: 4 }, "6": { d: 6, oct: 4 }, "7": { d: 7, oct: 4 },
  "8": { d: 1, oct: 5 }, "9": { d: 2, oct: 5 }, "0": { d: 3, oct: 5 },
  "-": { d: 4, oct: 5 }, "=": { d: 5, oct: 5 },
};

// Per-level rigor: most levels are 10 questions at 80%; capstones override these.
const levelsFor = (m) => (m === "melody" ? MELODY_LEVELS : m === "chords" ? CHORD_LEVELS : PROG_LEVELS);
const TEST_MODE = true; // TODO remove: 3-question sessions for celebration testing
const qCountOf = (lvl) => TEST_MODE ? 3 : ((lvl && lvl.qCount) || SESSION_LEN);
const passRateOf = (lvl) => TEST_MODE ? 0.6 : ((lvl && lvl.pass) || PASS_RATE);
const passCountFor = (lvl) => Math.ceil(passRateOf(lvl) * qCountOf(lvl));

// Shop: spend earned stars on Coda skins. "default" is free/always-equipped.
const SHOP = [
  { id: "gold",    type: "skin", name: "Gilded Coda",  cost: 12, tint: "#D9B45B", desc: "A hero forged in gold." },
  { id: "shadow",  type: "skin", name: "Shadow Coda",  cost: 8,  tint: "#2f3b45", desc: "Cloaked in dusk." },
  { id: "crimson", type: "skin", name: "Crimson Coda", cost: 8,  tint: "#E07856", desc: "Ember-touched." },
  { id: "violet",  type: "skin", name: "Violet Coda",  cost: 8,  tint: "#9b8ec4", desc: "Crystal-kissed." },
];

// Progress is a per-level best-score map: { melody: {levelIdx: bestFirstTries}, chords: {…} }.
function loadProgress() {
  try {
    const raw = window.localStorage.getItem("numbersong-progress");
    const p = raw ? JSON.parse(raw) : {};
    const norm = (m) => (m && typeof m === "object" ? m : {}); // migrate old numeric format → {}
    return { melody: norm(p.melody), chords: norm(p.chords), progressions: norm(p.progressions) };
  } catch (e) {
    return { melody: {}, chords: {}, progressions: {} };
  }
}
function saveProgress(p) {
  try { window.localStorage.setItem("numbersong-progress", JSON.stringify(p)); } catch (e) {}
}

// Preferences (theme + how fast the "walk home" resolution plays), persisted.
const RES_SPEEDS = [
  { label: "Slow",    step: 1.0 },
  { label: "Normal",  step: 0.8 },
  { label: "Fast",    step: 0.55 },
  { label: "Fastest", step: 0.38 },
];
const PROG_SPEEDS = [
  { label: "Slow",    beat: 1.3 },
  { label: "Normal",  beat: 1.0 },
  { label: "Fast",    beat: 0.72 },
  { label: "Fastest", beat: 0.5 },
];
function loadPref(key, fallback) {
  try {
    const v = window.localStorage.getItem("numbersong-" + key);
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function savePref(key, val) {
  try { window.localStorage.setItem("numbersong-" + key, String(val)); } catch (e) {}
}

/* ─────────────────────────────  AUDIO ENGINE  ───────────────────────────── */

function degreeToNote(key, degree, octave = 4) {
  const base = Tone.Frequency(key + octave).toMidi();
  return Tone.Frequency(base + DEGREE_SEMITONES[degree], "midi").toNote();
}

function buildInstrument(buffers) {
  if (buffers) {
    return new Tone.Sampler({ urls: buffers, release: 1.2 }).toDestination();
  }
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.5, release: 0.8 },
    volume: -2,
  }).toDestination();
}

// Sustaining synth voices for Free Play (piano is handled by the sampler instead).
function buildSusSynth(name) {
  const P = {
    pad:     [Tone.Synth,     { oscillator: { type: "triangle" },                          envelope: { attack: 0.35, decay: 0.2, sustain: 0.85, release: 0.9 } }, -12],
    lead:    [Tone.MonoSynth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.25 }, filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.6, baseFrequency: 350, octaves: 3.2 } }, -15],
    strings: [Tone.Synth,     { oscillator: { type: "fatsawtooth", count: 3, spread: 22 }, envelope: { attack: 0.3, decay: 0.2, sustain: 0.9, release: 0.6 } }, -19],
  }[name] || null;
  if (!P) return null;
  const s = new Tone.PolySynth(P[0], P[1]).toDestination();
  s.volume.value = P[2];
  return s;
}

function useAudio() {
  const synthRef = useRef(null);
  const padRef = useRef(null);
  const voicesRef = useRef(null);
  const buffersRef = useRef(null);
  const voicePlayersRef = useRef([]);

  const ensure = useCallback(async () => {
    await Tone.start();
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }
    if (!synthRef.current) {
      // Sampled grand piano (Salamander). Buffers are cached so the instrument
      // can be torn down and rebuilt instantly (that's how stopAll cancels
      // notes that were already scheduled into the future).
      const PIANO_URLS = {
        C2: "C2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3",
        C3: "C3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3",
        C4: "C4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3",
        C5: "C5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3",
        C6: "C6.mp3",
      };
      const BASE = "https://tonejs.github.io/audio/salamander/";
      const loaded = await Promise.race([
        Promise.all(Object.entries(PIANO_URLS).map(([n, f]) =>
          new Promise((res) => {
            const b = new Tone.ToneAudioBuffer(BASE + f, () => res([n, b]), () => res(null));
          })
        )),
        new Promise((res) => setTimeout(() => res(null), 8000)),
      ]);
      if (loaded && loaded.every(Boolean)) {
        // store native AudioBuffers: disposing a sampler can't destroy these,
        // so rebuilt instruments stay healthy
        buffersRef.current = Object.fromEntries(loaded.map(([n, b]) => [n, b.get()]));
      }
      synthRef.current = buildInstrument(buffersRef.current);
      padRef.current = synthRef.current;
    }
    // Decode embedded sung numbers (Jojo's voice), once.
    // Sets are keyed by semitone base: 0 = C major, 4 = E major, 8 = Ab major.
    if (!voicesRef.current && window.SUNG_NUMBERS) {
      try {
        const out = {};
        for (const [base, set] of Object.entries(window.SUNG_NUMBERS)) {
          out[base] = {};
          for (const [d, b64] of Object.entries(set)) {
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            out[base][d] = await Tone.getContext().rawContext.decodeAudioData(arr.buffer);
          }
        }
        voicesRef.current = out;
      } catch (e) {
        voicesRef.current = null; // fall back to speech synthesis
      }
    }
  }, []);

  // Cadence to anchor the ear in the key — major (I–IV–V–I) or minor (i–iv–V–i)
  const playCadence = useCallback(async (key, mode = "major") => {
    await ensure();
    const now = Tone.now();
    const base = Tone.Frequency(key + "4").toMidi();
    const noteAt = (semi) => Tone.Frequency(base + semi, "midi").toNote();
    (CADENCES[mode] || CADENCES.major).forEach((ch, i) => {
      const t = i * 0.55;
      padRef.current.triggerAttackRelease(ch.semis.map(noteAt), 0.5, now + t, 0.45);
      // bass: the chord's root an octave below, slightly stronger
      padRef.current.triggerAttackRelease(noteAt(ch.bass - 12), 0.6, now + t, 0.6);
    });
    return 2.4; // total seconds
  }, [ensure]);

  const playDegree = useCallback(async (key, degree, delay = 0, octave = 4) => {
    await ensure();
    synthRef.current.triggerAttackRelease(
      degreeToNote(key, degree, octave), 0.9, Tone.now() + delay
    );
  }, [ensure]);

  const playChord = useCallback(async (key, tones, delay = 0, arp = true) => {
    await ensure();
    const now = Tone.now() + delay;
    // Voice ascending from degree order, wrapping up an octave when needed
    let lastMidi = -1;
    const notes = tones.map((d) => {
      let midi = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
      while (midi <= lastMidi) midi += 12;
      lastMidi = midi;
      return Tone.Frequency(midi, "midi").toNote();
    });
    // Block chord, then (optionally) a gentle arpeggio so each tone is audible
    synthRef.current.triggerAttackRelease(notes, arp ? 1.1 : 1.5, now);
    if (arp) {
      notes.forEach((n, i) =>
        synthRef.current.triggerAttackRelease(n, 0.45, now + 1.35 + i * 0.4)
      );
      return 1.35 + notes.length * 0.4 + 0.5;
    }
    return 1.6;
  }, [ensure]);

  const playSemi = useCallback(async (key, semi, delay = 0, octave = 4) => {
    await ensure();
    const midi = Tone.Frequency(key + octave).toMidi() + semi;
    synthRef.current.triggerAttackRelease(
      Tone.Frequency(midi, "midi").toNote(), 0.9, Tone.now() + delay
    );
  }, [ensure]);

  // Retro menu SFX (chiptune blips) — spec from the design pass.
  const sfxRef = useRef(null);
  const sfx = useCallback(async (name) => {
    await ensure();
    if (!sfxRef.current) sfxRef.current = new Tone.Synth({ envelope: { attack: 0.006, decay: 0.08, sustain: 0, release: 0.05 }, volume: -17 }).toDestination();
    // +0.05s lead so the FIRST sound after audio-unlock (the boot chime) isn't
    // dropped while the just-resumed AudioContext spins up.
    const s = sfxRef.current, now = Tone.now() + 0.05;
    const beep = (freq, dur, t, type) => { s.oscillator.type = type; try { s.triggerAttackRelease(freq, dur, now + t); } catch (e) {} };
    if (name === "move") beep(494, 0.045, 0, "square");
    else if (name === "select") { beep(659, 0.055, 0, "square"); beep(988, 0.06, 0.06, "square"); }
    else if (name === "back") { beep(392, 0.06, 0, "square"); beep(294, 0.065, 0.065, "square"); }
    else if (name === "boot") [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.15, i * 0.07, "triangle"));
    else if (name === "correct") { beep(880, 0.09, 0, "triangle"); beep(1319, 0.1, 0.09, "triangle"); }
    else if (name === "victory") [659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.18, i * 0.095, "triangle"));
    else if (name === "twinkle") [2093, 2637, 3136, 2349, 1760].forEach((fr, i) => beep(fr, 0.11, i * 0.05, "triangle"));
  }, [ensure]);

  // big triumphant fanfare for forging a fragment — layered: lead run + chord,
  // a deep bass boom, a soft choir "aah" swell, and bright bell sparkles.
  const fanfareRef = useRef(null);
  const fanfare = useCallback(async () => {
    await ensure();
    if (!fanfareRef.current) {
      fanfareRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.008, decay: 0.18, sustain: 0.35, release: 0.7 }, volume: -9 }).toDestination(),
        bass:  new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.9 }, volume: -5 }).toDestination(),
        choir: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.35, decay: 0.2, sustain: 0.7, release: 1.3 }, volume: -15 }).toDestination(),
        bell:  new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.6 }, volume: -11 }).toDestination(),
      };
    }
    const f = fanfareRef.current, t = Tone.now() + 0.06;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    // pickup, then the Super-Mario course-clear cadence: ♭VI – ♭VII – I
    // (in C: Ab → Bb → C). Each chord is held so it breathes, landing on a long tonic.
    P(f.lead, "G4", 0.12, 0.00); P(f.lead, "C5", 0.14, 0.12);
    P(f.lead, ["Ab4", "C5", "Eb5"], 0.46, 0.28); P(f.bass, "Ab2", 0.48, 0.28);   // ♭VI (held)
    P(f.lead, ["Bb4", "D5", "F5"], 0.46, 0.78);  P(f.bass, "Bb2", 0.48, 0.78);   // ♭VII (held)
    P(f.lead, ["C5", "E5", "G5", "C6"], 2.4, 1.28); P(f.bass, "C2", 2.6, 1.28);   // I — landing, long hold
    // choir swell + bell sparkles on the landing
    P(f.choir, ["C4", "E4", "G4", "C5"], 2.8, 1.26);
    P(f.bell, "E6", 0.4, 1.34); P(f.bell, "G6", 0.5, 1.5); P(f.bell, "C7", 1.3, 1.7);
  }, [ensure]);

  // EPIC finale — reforging the WHOLE sword. The ♭VI–♭VII rise happens three
  // times, climbing an octave each round, then lands on the biggest, widest,
  // longest C-major chord of all time.
  const grandFanfare = useCallback(async () => {
    await ensure();
    if (!fanfareRef.current) {
      fanfareRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.008, decay: 0.18, sustain: 0.35, release: 0.7 }, volume: -9 }).toDestination(),
        bass:  new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.9 }, volume: -5 }).toDestination(),
        choir: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.35, decay: 0.2, sustain: 0.7, release: 1.3 }, volume: -15 }).toDestination(),
        bell:  new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.6 }, volume: -11 }).toDestination(),
      };
    }
    const f = fanfareRef.current, t = Tone.now() + 0.06;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    const rounds = [
      { six: ["Ab3", "C4", "Eb4"], sev: ["Bb3", "D4", "F4"], r6: "Ab2", r7: "Bb2" },
      { six: ["Ab4", "C5", "Eb5"], sev: ["Bb4", "D5", "F5"], r6: "Ab2", r7: "Bb2" },
      { six: ["Ab5", "C6", "Eb6"], sev: ["Bb5", "D6", "F6"], r6: "Ab3", r7: "Bb3" },
    ];
    let at = 0; const step = 0.42;
    rounds.forEach((r) => {
      P(f.lead, r.six, step * 0.9, at); P(f.bass, r.r6, step, at); at += step;
      P(f.lead, r.sev, step * 0.9, at); P(f.bass, r.r7, step, at); at += step;
    });
    // rising run into the landing
    P(f.lead, "F6", 0.1, at); P(f.lead, "G6", 0.1, at + 0.1); P(f.lead, "A6", 0.1, at + 0.2); P(f.lead, "B6", 0.12, at + 0.3);
    at += 0.46;
    // THE biggest I chord of all time — C major across the whole range, very long
    P(f.lead, ["C5", "E5", "G5", "C6", "E6", "G6"], 4.6, at);
    P(f.bass, "C2", 5.2, at);
    P(f.choir, ["C3", "G3", "C4", "E4", "G4", "C5"], 5.2, at);
    P(f.bell, "C6", 1.2, at + 0.1); P(f.bell, "E6", 1.0, at + 0.3); P(f.bell, "G6", 1.0, at + 0.5); P(f.bell, "C7", 3.2, at + 0.75);
  }, [ensure]);

  // robust "power on" chime for the Press-Any-Key boot: rising arpeggio into a
  // bright major chord with a sparkle up top.
  const bootRef = useRef(null);
  const bootChime = useCallback(async () => {
    await ensure();
    if (!bootRef.current) {
      bootRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.25, release: 0.6 }, volume: -9 }).toDestination(),
        spark: new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.5 }, volume: -13 }).toDestination(),
      };
    }
    const s = bootRef.current, t = Tone.now() + 0.09;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    P(s.lead, "C4", 0.1, 0.00); P(s.lead, "E4", 0.1, 0.08); P(s.lead, "G4", 0.1, 0.16); P(s.lead, "C5", 0.12, 0.24);
    P(s.lead, ["C5", "E5", "G5", "C6"], 0.95, 0.36);
    P(s.spark, "E6", 0.25, 0.42); P(s.spark, "G6", 0.3, 0.56); P(s.spark, "C7", 0.6, 0.7);
  }, [ensure]);

  // Sustaining voice (Free Play): attack on hold, release on let-go. "piano" reuses
  // the loaded Salamander sampler (synthRef); the others are dedicated synths.
  const susRef = useRef(null);
  const susVoiceRef = useRef("piano");
  const susInst = () => (susVoiceRef.current === "piano" ? synthRef.current : susRef.current);
  const setSustainVoice = useCallback(async (name) => {
    await ensure();
    susVoiceRef.current = name;
    if (susRef.current) { try { susRef.current.releaseAll(); susRef.current.dispose(); } catch (e) {} susRef.current = null; }
    if (name !== "piano") susRef.current = buildSusSynth(name);
  }, [ensure]);
  const holdNote = useCallback(async (note) => {
    await ensure();
    if (susVoiceRef.current !== "piano" && !susRef.current) susRef.current = buildSusSynth(susVoiceRef.current);
    try { susInst()?.triggerAttack(note); } catch (e) {}
  }, [ensure]);
  const releaseNote = useCallback((note) => {
    try { susInst()?.triggerRelease(note); } catch (e) {}
  }, []);
  const releaseAllNotes = useCallback(() => {
    try { susInst()?.releaseAll?.(); } catch (e) {}
  }, []);

  // Play a progression: each chord as a block, in tempo, with a bass root below.
  const playProgression = useCallback(async (key, chordsTones, delay = 0, beat = 1.0) => {
    await ensure();
    const now = Tone.now() + delay;
    chordsTones.forEach((tones, i) => {
      let lastMidi = -1;
      const notes = tones.map((d) => {
        let midi = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
        while (midi <= lastMidi) midi += 12;
        lastMidi = midi;
        return Tone.Frequency(midi, "midi").toNote();
      });
      const t = now + i * beat;
      synthRef.current.triggerAttackRelease(notes, beat * 0.92, t);
      const bass = Tone.Frequency(key + 3).toMidi() + DEGREE_SEMITONES[tones[0]];
      synthRef.current.triggerAttackRelease(Tone.Frequency(bass, "midi").toNote(), beat * 0.95, t, 0.6);
    });
    return chordsTones.length * beat + 0.3;
  }, [ensure]);

  // Looping soft-pad backing (Melody Paths jam): count-in clicks, then each chord
  // sustains as a pad in tempo, calling back so the UI can light the current chord.
  const pathRef = useRef({ active: false, timers: [], pad: null, click: null });
  const stopPathLoop = useCallback(() => {
    const p = pathRef.current;
    p.active = false;
    p.timers.forEach(clearTimeout);
    p.timers = [];
    ["pad", "click", "kick", "snare", "hat", "bass"].forEach((k) => {
      if (p[k]) { try { p[k].dispose(); } catch (e) {} p[k] = null; }
    });
  }, []);
  const startPathLoop = useCallback(async (key, chordsTones, beat, cb, countIn = 4, getDrums = () => false) => {
    await ensure();
    stopPathLoop();
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.09, decay: 0.3, sustain: 0.55, release: 0.7 },
      volume: -19,
    }).toDestination();
    const click = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 }, volume: -20,
    }).toDestination();
    const kick = new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.05, volume: -6 }).toDestination();
    const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.13, sustain: 0 }, volume: -15 }).toDestination();
    const hat = new Tone.MetalSynth({ frequency: 260, envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.4, volume: -30 }).toDestination();
    const bass = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.3 },
      filterEnvelope: { attack: 0.02, decay: 0.12, sustain: 0.5, baseFrequency: 110, octaves: 2.6 },
      volume: -9,
    }).toDestination();
    const p = (pathRef.current = { active: true, timers: [], pad, click, kick, snare, hat, bass });
    const B = () => (typeof beat === "function" ? beat() : beat); // live tempo (seconds per bar)
    const notesFor = (tones) => {
      let last = -1;
      return tones.map((d) => {
        let m = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
        while (m <= last) m += 12;
        last = m;
        return Tone.Frequency(m, "midi").toNote();
      });
    };
    const bassNote = (d) => Tone.Frequency(Tone.Frequency(key + 2).toMidi() + DEGREE_SEMITONES[d], "midi").toNote();
    let curTones = null;
    // One quarter-note clock drives both drums and chord changes (locked, no drift).
    // A bar = 4 quarters = 1 chord. Count-in = one bar of clicks.
    let q = -countIn, ci = 0;
    const tick = () => {
      if (!p.active) return;
      const qDur = B() / 4;
      const t = Tone.now();
      if (q < 0) {
        click.triggerAttackRelease(q === -countIn ? "C6" : "C5", 0.05, t);
        cb({ phase: "count", n: -q });
      } else {
        if (getDrums()) {
          hat.triggerAttackRelease("32n", t, 0.5);
          if (q % 4 === 0 || q % 4 === 2) kick.triggerAttackRelease("C1", "8n", t);
          if (q % 4 === 1 || q % 4 === 3) snare.triggerAttackRelease("8n", t);
        }
        if (q % 4 === 0) {
          const idx = ci % chordsTones.length;
          curTones = chordsTones[idx];
          pad.triggerAttackRelease(notesFor(curTones), qDur * 4 * 0.95, t);
          bass.triggerAttackRelease(bassNote(curTones[0]), qDur * 2 * 0.9, t); // root on beat 1
          cb({ phase: "play", i: idx });
          ci++;
        } else if (q % 4 === 2 && curTones) {
          bass.triggerAttackRelease(bassNote(curTones[2] || curTones[0]), qDur * 2 * 0.9, t); // fifth on beat 3
        }
      }
      q++;
      p.timers.push(setTimeout(tick, qDur * 1000));
    };
    tick();
  }, [ensure, stopPathLoop]);

  // Sing a number: three recorded sets (C, E, Ab major). Pick the set nearest
  // the current key, so the voice is never repitched more than 2 semitones.
  const lastVoiceRef = useRef(null);
  const sing = useCallback(async (key, degree, enabled, delay = 0, cutAfter = null) => {
    if (!enabled) return;
    await ensure();
    if (!voicesRef.current) { speak(NUMBER_WORDS[degree], enabled); return; }
    const idx = KEYS.indexOf(key);
    let bestBase = null, bestShift = 99;
    for (const base of Object.keys(voicesRef.current).map(Number)) {
      let s = idx - base;
      if (s > 6) s -= 12;
      if (s < -6) s += 12;
      if (Math.abs(s) < Math.abs(bestShift)) { bestShift = s; bestBase = base; }
    }
    const buf = bestBase != null && voicesRef.current[bestBase][degree];
    if (!buf) { speak(NUMBER_WORDS[degree], enabled); return; }
    const player = new Tone.Player(buf).toDestination();
    player.playbackRate = Math.pow(2, bestShift / 12);
    player.fadeOut = 0.12; // gentle release when cut short
    const t = Tone.now() + delay;
    // one voice at a time: the previous number stops the moment this one starts
    if (lastVoiceRef.current) {
      try { lastVoiceRef.current.stop(t); } catch (e) {}
    }
    lastVoiceRef.current = player;
    voicePlayersRef.current.push(player);
    player.start(t);
    if (cutAfter) player.stop(t + cutAfter);
    setTimeout(() => {
      player.dispose();
      voicePlayersRef.current = voicePlayersRef.current.filter((p) => p !== player);
    }, (delay + 4) * 1000);
  }, [ensure]);

  const droneRef = useRef(null);
  const startDrone = useCallback(async (key, degree = 1) => {
    await ensure();
    if (droneRef.current) { droneRef.current.dispose(); droneRef.current = null; }
    const s = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.5 },
      volume: -17,
    }).toDestination();
    s.triggerAttack(degreeToNote(key, degree, degree >= 5 ? 2 : 3));
    droneRef.current = s;
  }, [ensure]);
  const stopDrone = useCallback(() => {
    if (!droneRef.current) return;
    const d = droneRef.current;
    droneRef.current = null;
    d.triggerRelease();
    setTimeout(() => d.dispose(), 2000);
  }, []);

  const stopAll = useCallback(() => {
    stopPathLoop();
    releaseAllNotes();
    voicePlayersRef.current.forEach((p) => { try { p.stop(); p.dispose(); } catch (e) {} });
    voicePlayersRef.current = [];
    lastVoiceRef.current = null;
    if (synthRef.current) {
      try { synthRef.current.dispose(); } catch (e) {}
      try {
        synthRef.current = buildInstrument(buffersRef.current);
      } catch (e) {
        synthRef.current = buildInstrument(null); // fallback synth, never silent
      }
      padRef.current = synthRef.current;
    }
  }, []);

  return { playCadence, playDegree, playChord, playProgression, playSemi, sing, sfx, fanfare, grandFanfare, bootChime, startDrone, stopDrone, startPathLoop, stopPathLoop, setSustainVoice, holdNote, releaseNote, releaseAllNotes, stopAll };
}

function speak(text, enabled) {
  if (!enabled || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/* ─────────────────────────────  DEGREE LADDER  ───────────────────────────── */

/* ─────────────────────────  TONAL MAP  ─────────────────────────
   Degrees sit at their true semitone positions across the octave;
   dots mark the chromatic notes in the whole-step gaps, so 3–4 and
   7–1 visibly touch while the others have space between. */

const CHROMATIC_GAPS = [1, 3, 6, 8, 10];

// The tonal map is drawn RELATIVE TO HOME: major reads 1 2 3 4 5 6 7 1, la-based
// minor reads 6 7 1 2 3 4 5 6. Columns are semitones above the mode's tonic.
// Highlights (active/correct/wrong) and pool are pitch-classes (0–11); showChrom
// reveals the five altered positions as small, lightable rungs instead of dots.
const MINOR_SCALE_STEPS = [0, 2, 3, 5, 7, 8, 10, 12]; // natural minor above 6
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

function DegreeLadder({ active, correct, wrong, tonicPc = 0, pool, showChrom }) {
  const inPool = (pc) => !pool || pool.includes(pc);
  const steps = tonicPc === 9 ? MINOR_SCALE_STEPS : MAJOR_SCALE_STEPS;
  const lit = (pc) => [
    active?.includes(pc) && "active",
    correct?.includes(pc) && "correct",
    wrong?.includes(pc) && "wrong",
  ];
  const cells = [];
  steps.forEach((pos) => {
    const pc = mod12(tonicPc + pos);
    const cls = ["rung", pc === tonicPc && "tonic", !inPool(pc) && "dim", ...lit(pc)].filter(Boolean).join(" ");
    cells.push(
      <div key={"n" + pos} className={cls} style={{ gridColumn: pos + 1, gridRow: 1 }}>
        <span className="rung-num">{NOTE_LABELS[pc]}</span>
      </div>
    );
  });
  for (let pos = 1; pos < 12; pos++) {
    if (steps.includes(pos)) continue;
    const pc = mod12(tonicPc + pos);
    if (showChrom) {
      const cls = ["rung", "alt-rung", !inPool(pc) && "dim", ...lit(pc)].filter(Boolean).join(" ");
      cells.push(
        <div key={"a" + pos} className={cls} style={{ gridColumn: pos + 1, gridRow: 1 }}>
          <span className="rung-num alt">{NOTE_LABELS[pc]}</span>
        </div>
      );
    } else {
      cells.push(<div key={"a" + pos} className="gap-dot" style={{ gridColumn: pos + 1, gridRow: 1 }} />);
    }
  }
  return (
    <div className="ladder" role="img" aria-label="Tonal map of the octave">
      {cells}
    </div>
  );
}

/* ────────────────────  EXPLORE MAP (playable window)  ────────────────────
   A slice of the tonal map: starts on any degree, 3–7 notes long, degrees
   at true semitone spacing (wrapping past 7 back to 1). Stages fade it:
   0 = numbers shown, 1 = blank pads, 2 = invisible buttons. */

function exploreNotes(start, count) {
  const notes = [];
  for (let i = 0; i < count; i++) {
    const raw = start + i;                 // 1..13
    const label = ((raw - 1) % 7) + 1;     // display degree
    const upper = raw > 7;                 // wrapped into the next octave
    const semi = DEGREE_SEMITONES[label] + (upper ? 12 : 0);
    notes.push({ raw, label, upper, semi });
  }
  return notes;
}

// The world's chord skeleton: root, 3rd, 5th, 7th above it (as key degrees)
function worldChordTones(w) {
  return [0, 2, 4, 6].map((k) => ((w - 1 + k) % 7) + 1);
}

function ExploreMap({ start, count, stage, octaves, world, active, onPlay, onDown, onUp }) {
  const evts = (n, row) => onDown // guide taps (onPlay); Free Play holds (onDown/onUp)
    ? { onPointerDown: (e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(n, row); }, onPointerUp: () => onUp(n, row) }
    : { onClick: () => onPlay(n, row) };
  const notes = exploreNotes(start, count);
  const s0 = notes[0].semi, s1 = notes[notes.length - 1].semi;
  const chordal = world ? worldChordTones(world) : [];
  const cells = [];
  for (let row = 0; row < octaves; row++) {
    notes.forEach((n) => {
      const isTonic = n.label === 1;
      const isChordal = chordal.includes(n.label);
      const isRoot = n.label === world;
      const cls = [
        "rung", "explore-pad",
        isTonic && "tonic",
        isChordal && "chordal",
        isRoot && "world-root",
        stage === 1 && "blank",
        active?.includes(n.raw + row * 100) && "active",
      ].filter(Boolean).join(" ");
      cells.push(
        <button key={"n" + n.raw + "r" + row} className={cls}
          style={{ gridColumn: n.semi - s0 + 1, gridRow: row + 1 }}
          {...evts(n, row)}
          aria-label={"degree " + n.label + (row > 0 ? " upper octave" : "")}>
          <span className="rung-num">{stage === 0 ? n.label : "\u00A0"}</span>
          {stage === 0 && <span className="rung-sol">{SOLFEGE[n.label]}</span>}
        </button>
      );
    });
    for (let s = s0; s <= s1; s++) {
      if (!notes.some((n) => n.semi === s)) {
        cells.push(<div key={"g" + s + "r" + row} className="gap-dot" style={{ gridColumn: s - s0 + 1, gridRow: row + 1 }} />);
      }
    }
  }
  return (
    <div className="ladder explore" style={{ gridTemplateColumns: `repeat(${s1 - s0 + 1}, 1fr)`, rowGap: "10px" }}
      role="group" aria-label="Playable tonal map">
      {cells}
    </div>
  );
}

/* ────────────────────  PIANO (two octaves from the tonic)  ────────────────────
   A real chromatic keyboard anchored on the current key's tonic. Every key
   plays; the explore window's numbers sit on their corresponding keys, in
   both octaves. World chord tones show in blue, the tonic wears the star. */

function PianoMap({ start, count, stage, world, musicKey, active, onDown, onUp }) {
  const evts = (k) => ({ onPointerDown: (e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(k); }, onPointerUp: () => onUp(k) });
  const baseMidi = Tone.Frequency(musicKey + "4").toMidi();
  const BLACK_PCS = [1, 3, 6, 8, 10];

  // number labels: window notes plus their octave-up copies
  const labels = {};
  exploreNotes(start, count).forEach((n) => {
    labels[n.semi] = n.label;
    if (n.semi + 12 <= 24) labels[n.semi + 12] = n.label;
  });
  const chordal = worldChordTones(world);

  const isBlack = (s) => BLACK_PCS.includes((((baseMidi + s) % 12) + 12) % 12);
  let sStart = 0, sEnd = 24;
  while (isBlack(sStart)) sStart--;   // extend down to a white key
  while (isBlack(sEnd)) sEnd++;       // extend up to a white key
  const keys = [];
  let whiteIdx = -1;
  for (let s = sStart; s <= sEnd; s++) {
    const black = isBlack(s);
    if (!black) whiteIdx++;
    keys.push({ s, black, whiteBefore: whiteIdx });
  }
  const nWhites = whiteIdx + 1;
  const wW = 100 / nWhites;
  const bW = wW * 0.62;

  const keyLabel = (s) => {
    const lab = labels[s];
    if (lab == null || stage === 1) return null;
    const cls = ["pk-label",
      lab === 1 && "tonic",
      chordal.includes(lab) && "chordal",
      lab === world && "world-root",
    ].filter(Boolean).join(" ");
    return <span className={cls}>{lab}{lab === 1 ? <span className="pk-star">✳</span> : null}</span>;
  };

  return (
    <div className="piano" role="group" aria-label="Two-octave piano from the tonic">
      {keys.filter((k) => !k.black).map((k) => (
        <button key={k.s}
          className={"pk white" + (active?.includes("p" + k.s) ? " active" : "")}
          style={{ left: `${k.whiteBefore * wW}%`, width: `${wW}%` }}
          {...evts(k)}
          aria-label={"piano key " + (labels[k.s] ? "degree " + labels[k.s] : "")}>
          {keyLabel(k.s)}
        </button>
      ))}
      {keys.filter((k) => k.black).map((k) => (
        <button key={k.s}
          className={"pk black" + (active?.includes("p" + k.s) ? " active" : "")}
          style={{ left: `${(k.whiteBefore + 1) * wW - bW / 2}%`, width: `${bW}%` }}
          {...evts(k)}
          aria-label={"piano key " + (labels[k.s] ? "degree " + labels[k.s] : "")}>
          {keyLabel(k.s)}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────  GUIDE CHORD STACK  ────────────────────
   His slide notation: the seven degrees stacked, the chord's tones circled. */

function GuideStack({ label, world }) {
  const tones = worldChordTones(world);
  return (
    <div className="stack">
      {[7, 6, 5, 4, 3, 2, 1].map((d) => (
        <span key={d} className={"stack-note" + (tones.includes(d) ? " on" : "")}>{d}</span>
      ))}
      <span className="stack-label">{label}</span>
    </div>
  );
}

/* ────────────────────  SESSION STACK  ────────────────────
   Chord sessions show stack notation instead of the tonal map:
   the seven degrees stacked 7-down-to-1, picks and answers circled. */

function SessionStack({ picked, correct, wrong, label }) {
  return (
    <div className="stack session-stack">
      {[7, 6, 5, 4, 3, 2, 1].map((d) => {
        const cls = ["stack-note",
          picked?.includes(d) && "picked",
          correct?.includes(d) && "on-correct",
          wrong?.includes(d) && "on-wrong",
        ].filter(Boolean).join(" ");
        return <span key={d} className={cls}>{d}</span>;
      })}
      <span className="stack-label">{label || "?"}</span>
    </div>
  );
}

// A mini stack for one chord in a progression: 7 degrees stacked, its tones
// circled, labelled with its number notation — so the voice movement is visible.
function ProgStack({ roman, tonic, active, wrong }) {
  const tones = roman ? chordByRoman(roman).tones : [];
  const on = new Set(tones.map((d) => (d === 8 ? 1 : d)));
  return (
    <div className={"stack prog-stack" + (roman ? " filled" : "") + (active ? " active" : "") + (wrong ? " wrong" : "")}>
      {[7, 6, 5, 4, 3, 2, 1].map((d) => (
        <span key={d} className={"stack-note" + (on.has(d) ? " on" : "") + (d === tonic ? " home" : "")}>{d}</span>
      ))}
      <span className="stack-label">{roman ? chordNumber(roman, false) : "?"}</span>
    </div>
  );
}

// Melody Paths: one chord's column — the degree grid with its chord tones circled,
// each note tappable to solo over the loop. Lights up when it's the current chord.
function PathColumn({ roman, col, current, lit, onDown, onUp, sevenths }) {
  const tones = new Set(chordTones(chordByRoman(roman), sevenths).map((d) => (d === 8 ? 1 : d)));
  return (
    <div className={"path-col" + (current ? " current" : "")}>
      {PATH_ROWS.map((row, ri) => {
        const id = col + "-" + ri;
        const cls = ["path-note",
          tones.has(row.d) && "on",
          row.d === 1 && row.oct === 4 && "home",
          lit.includes(id) && "lit",
        ].filter(Boolean).join(" ");
        return (
          <button key={ri} className={cls}
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(col, ri); }}
            onPointerUp={() => onUp(col, ri)}>
            {row.d}
          </button>
        );
      })}
      <span className="path-label">{chordNumber(roman, sevenths)}</span>
    </div>
  );
}

// FET-style progress row: one square per session question, filled by best score.
function ProgressSquares({ best, total = SESSION_LEN }) {
  return (
    <span className="squares" aria-label={`best ${best} of ${total} on first try`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={"sq" + (i < best ? " on" : "")} />
      ))}
    </span>
  );
}

/* ─────────────────────────  ADVENTURE MAP (Harmonia)  ─────────────────────────
   Pixel world-map layer on Fable's original tile/sword asset pack (window.HARMONIA).
   The hero is a clean placeholder marker until a real sprite PNG is dropped in:
   swap the drawHero() block for ctx.drawImage(codaImg, ...). */

// cx,cy = the current node's CENTER. Coda stands on the node facing the viewer.
function drawHero(ctx, cx, cy, coda, bob) {
  ctx.save();                                                            // soft ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (coda) {
    const dh = 26, dw = coda.width * (dh / coda.height);
    ctx.save();
    ctx.shadowColor = "rgba(87,198,196,0.7)"; ctx.shadowBlur = 5;        // faint teal aura
    ctx.drawImage(coda, cx - dw / 2, cy + 3 - dh - (bob || 0), dw, dh);  // feet just below node center; bob while walking
    ctx.restore();
    return;
  }
  const y = cy - 12 - (bob || 0);                                        // fallback marker until sprite loads
  ctx.save();
  ctx.shadowColor = "#57C6C4"; ctx.shadowBlur = 6;
  ctx.fillStyle = "#6ABF5E"; ctx.fillRect(cx - 3, y + 2, 6, 7);
  ctx.fillStyle = "#57C6C4"; ctx.beginPath(); ctx.arc(cx, y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#EDF2EE"; ctx.fillRect(cx - 1.5, y - 1.5, 2, 2);
  ctx.restore();
}

// deterministic confetti pieces for the forge celebration (stable across re-renders)
const CONFETTI = Array.from({ length: 140 }, (_, i) => ({
  left: (i * 41) % 100,
  delay: ((i * 7) % 24) / 10,       // 0 – 2.3s staggered (rains for several seconds)
  dur: 3.4 + ((i * 13) % 34) / 10,  // 3.4 – 6.7s slow fall so it lingers
  color: ["var(--gold)", "var(--teal)", "var(--green)", "var(--blue)", "#fff", "var(--wrong)"][i % 6],
  drift: (((i * 17) % 13) - 6) * 16,
}));

// Excalibar rendered from the sword sheet; collected parts are solid, the rest ghosted.
function ForgeSword({ collected, className }) {
  const H = window.HARMONIA;
  const ref = useRef(null);
  const [img, setImg] = useState(null);
  useEffect(() => { const b = new Image(); b.onload = () => setImg(b); b.src = H.sword; }, []);
  useEffect(() => {
    if (!img) return; const cv = ref.current; if (!cv) return;
    cv.width = H.swordW; cv.height = H.swordH;
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const mask = window.HARMONIA_decodeMask(H);
    for (let i = 0; i < mask.length; i++) {
      const part = mask[i] - 1;
      if (part < 0) continue;
      if (!collected.has(part)) { const p = i * 4; data.data[p] = 60; data.data[p + 1] = 66; data.data[p + 2] = 63; data.data[p + 3] = 95; }
    }
    ctx.putImageData(data, 0, 0);
  }, [img, collected]);
  return <canvas ref={ref} className={className} aria-label="Excalibar" />;
}

// The Dojo = Free Play as an actual place on the map (sits on the home-hearth tile).
const DOJO = { c: 2, r: 20, name: "The Dojo" };
function drawDojo(ctx, cx, cy) {
  ctx.save();
  ctx.shadowColor = "#7CADD1"; ctx.shadowBlur = 9;
  ctx.fillStyle = "#39474f"; ctx.fillRect(cx - 10, cy - 1, 20, 11);         // body
  ctx.fillStyle = "#7CADD1";                                               // pagoda roof
  ctx.beginPath(); ctx.moveTo(cx - 15, cy + 1); ctx.lineTo(cx, cy - 12); ctx.lineTo(cx + 15, cy + 1); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - 15, cy + 1, 30, 2);                                    // eaves
  ctx.restore();
  ctx.fillStyle = "#1a2422"; ctx.fillRect(cx - 3, cy + 2, 6, 8);           // door
  ctx.font = "bold 10px 'Archivo Black', Archivo, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = "#12201d"; ctx.fillText("DOJO", cx + 1, cy + 14);        // label shadow
  ctx.fillStyle = "#EDF2EE"; ctx.fillText("DOJO", cx, cy + 13);            // label
}

function AdventureMap({ nodes, currentId, collected, onEnter, onMenu, onSettings, onGuide, onFree, onForge, burst, boringMode, celebrateNode, onCelebrateDone, skinTint }) {
  const H = window.HARMONIA;
  const mapRef = useRef(null);
  const swordRef = useRef(null);
  const scrollRef = useRef(null);
  const [tileset, setTileset] = useState(null);
  const [swordImg, setSwordImg] = useState(null);
  const [codaImg, setCodaImg] = useState(null);
  const [tintedCoda, setTintedCoda] = useState(null);
  useEffect(() => {
    if (!codaImg || !skinTint) { setTintedCoda(null); return; }
    const tc = document.createElement("canvas"); tc.width = codaImg.width; tc.height = codaImg.height;
    const x = tc.getContext("2d"); x.imageSmoothingEnabled = false;
    x.drawImage(codaImg, 0, 0);
    x.globalCompositeOperation = "source-atop"; x.globalAlpha = 0.5; x.fillStyle = skinTint;
    x.fillRect(0, 0, tc.width, tc.height);
    setTintedCoda(tc);
  }, [codaImg, skinTint]);
  const codaRef = useRef(null);   // Coda's live tile position {c,r} (floats while walking)
  const walkRef = useRef(false);  // true while a walk animation is in flight
  const rafRef = useRef(0);

  useEffect(() => {
    const a = new Image(); a.onload = () => setTileset(a); a.src = H.tileset;
    const b = new Image(); b.onload = () => setSwordImg(b); b.src = H.sword;
    if (typeof window !== "undefined" && window.CODA_SPRITE) {
      const c = new Image(); c.onload = () => setCodaImg(c); c.src = window.CODA_SPRITE;
    }
  }, []);

  // center the view on the hero / current node once the map is drawn
  useEffect(() => {
    const sc = scrollRef.current, cv = mapRef.current;
    if (!sc || !cv || !tileset) return;
    const cn = nodes.find((n) => n.id === currentId);
    if (!cn) return;
    const mapH = cv.getBoundingClientRect().height;
    sc.scrollTop = Math.max(0, ((cn.r + 0.5) / H.gr) * mapH - sc.clientHeight * 0.5);
  }, [tileset, currentId]);

  // full map paint with Coda at tile (codaC,codaR); reused by the static render and the walk loop
  const draw = useCallback((codaC, codaR, bob) => {
    if (!tileset) return;
    const cv = mapRef.current; if (!cv) return;
    const T = H.tile;
    if (cv.width !== H.gc * T) { cv.width = H.gc * T; cv.height = H.gr * T; }
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < H.gr; r++) for (let c = 0; c < H.gc; c++) {
      const idx = H.grid[r][c];
      if (!idx) continue;
      ctx.drawImage(tileset, (idx % H.scols) * T, ((idx / H.scols) | 0) * T, T, T, c * T, r * T, T, T);
    }
    nodes.forEach((n) => {
      const x = (n.c + 0.5) * T, y = (n.r + 0.5) * T;
      const cleared = collected.has(H.stageFrag[n.id]);
      const cur = n.id === currentId;
      ctx.save();
      if (cur) { ctx.shadowColor = "#6ABF5E"; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = cleared ? "#57C6C4" : cur ? "#6ABF5E" : "#4a524d";
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#EDF2EE"; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = cleared ? "#12201d" : cur ? "#23302A" : "#9aa39c";
      ctx.font = "bold 8px Archivo, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(cleared ? "★" : String(n.id), x, y + 0.5);
    });
    drawDojo(ctx, (DOJO.c + 0.5) * T, (DOJO.r + 0.5) * T);
    if (collected.size >= 8 && swordImg) {            // post-game: Excalibar rests, glowing, at home
      const mx = (2 + 0.5) * T, my = (24 + 0.5) * T;
      ctx.save();
      ctx.shadowColor = "#D9B45B"; ctx.shadowBlur = 13;
      const sh = 30, sw = swordImg.width * (sh / swordImg.height);
      ctx.drawImage(swordImg, mx - sw / 2, my + 5 - sh, sw, sh);
      ctx.restore();
    }
    drawHero(ctx, (codaC + 0.5) * T, (codaR + 0.5) * T, tintedCoda || codaImg, bob);
  }, [tileset, nodes, currentId, collected, codaImg, tintedCoda, swordImg]);

  // static render: Coda rests on the current node (unless mid-walk)
  useEffect(() => {
    const cn = nodes.find((n) => n.id === currentId);
    if (!cn || walkRef.current) return;
    codaRef.current = { c: cn.c, r: cn.r };
    draw(cn.c, cn.r, 0);
  }, [draw, currentId, nodes]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // "region cleared" banner auto-dismisses after a beat
  useEffect(() => {
    if (!celebrateNode) return;
    const t = setTimeout(() => onCelebrateDone && onCelebrateDone(), 2800);
    return () => clearTimeout(t);
  }, [celebrateNode]);

  useEffect(() => {
    if (!swordImg) return;
    const cv = swordRef.current; if (!cv) return;
    cv.width = H.swordW; cv.height = H.swordH;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(swordImg, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const mask = window.HARMONIA_decodeMask(H);
    for (let i = 0; i < mask.length; i++) {
      const part = mask[i] - 1;
      if (part < 0) continue;
      if (!collected.has(part)) {
        const p = i * 4;
        data.data[p] = 60; data.data[p + 1] = 66; data.data[p + 2] = 63; data.data[p + 3] = 95;
      }
    }
    ctx.putImageData(data, 0, 0);
  }, [swordImg, collected]);

  // BFS a route from tile (sc,sr) to (tc,tr) over walkable path/clearing tiles
  const WALKABLE = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  const buildRoute = (start, tc, tr) => {
    const sc = Math.round(start.c), sr = Math.round(start.r);
    const key = (c, r) => r * H.gc + c;
    const okTile = (c, r) => c >= 0 && c < H.gc && r >= 0 && r < H.gr && WALKABLE.has(H.grid[r][c]);
    const q = [[sc, sr]]; const prev = new Map([[key(sc, sr), null]]);
    let found = false;
    while (q.length) {
      const [c, r] = q.shift();
      if (c === tc && r === tr) { found = true; break; }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr, k = key(nc, nr);
        if (prev.has(k) || !okTile(nc, nr)) continue;
        prev.set(k, [c, r]); q.push([nc, nr]);
      }
    }
    if (!found) return [{ c: sc, r: sr }, { c: tc, r: tr }]; // fallback: straight hop
    const route = []; let cur = [tc, tr];
    while (cur) { route.push({ c: cur[0], r: cur[1] }); cur = prev.get(key(cur[0], cur[1])); }
    return route.reverse();
  };

  // walk Coda along the road to a node, then fire done()
  const walkTo = (target, done) => {
    const start = codaRef.current || { c: target.c, r: target.r };
    const route = buildRoute(start, target.c, target.r);
    if (route.length < 2) { done && done(); return; }
    walkRef.current = true;
    // keep the walk time roughly constant regardless of distance: a long route
    // (e.g. stage 1 → 7) walks proportionally faster so it doesn't drag; short
    // hops stay natural. Duration lands ~0.9–2.0s either way.
    const len = route.reduce((a, p, i) => (i ? a + Math.hypot(p.c - route[i - 1].c, p.r - route[i - 1].r) : 0), 0);
    const dur = Math.min(2.0, Math.max(0.9, len / 13));
    const SPEED = len / dur; // tiles per second
    let seg = 1, prevTs = 0;
    const step = (ts) => {
      if (!prevTs) prevTs = ts;
      let remain = SPEED * (ts - prevTs) / 1000; prevTs = ts;
      while (remain > 0 && seg < route.length) {
        const b = route[seg], cur = codaRef.current;
        const dc = b.c - cur.c, dr = b.r - cur.r, dist = Math.hypot(dc, dr);
        if (dist <= remain || dist < 1e-4) { codaRef.current = { c: b.c, r: b.r }; remain -= dist; seg++; }
        else { codaRef.current = { c: cur.c + dc / dist * remain, r: cur.r + dr / dist * remain }; remain = 0; }
      }
      draw(codaRef.current.c, codaRef.current.r, Math.abs(Math.sin(ts / 95)) * 2.5);
      if (seg < route.length) { rafRef.current = requestAnimationFrame(step); }
      else { walkRef.current = false; draw(target.c, target.r, 0); done && done(); }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const tapMap = (e) => {
    if (walkRef.current) return; // ignore taps mid-walk
    const cv = mapRef.current; const rect = cv.getBoundingClientRect();
    const nx = (e.clientX - rect.left) * (cv.width / rect.width);
    const ny = (e.clientY - rect.top) * (cv.height / rect.height);
    const T = H.tile;
    const dojoD = ((DOJO.c + 0.5) * T - nx) ** 2 + ((DOJO.r + 0.5) * T - ny) ** 2;
    let best = null, bd = 1e9;
    nodes.forEach((n) => {
      const d = ((n.c + 0.5) * T - nx) ** 2 + ((n.r + 0.5) * T - ny) ** 2;
      if (d < bd) { bd = d; best = n; }
    });
    if (dojoD < 22 * 22 && dojoD <= bd) { // the dojo (Free Play) was tapped
      const c0 = codaRef.current;
      const atDojo = c0 && Math.round(c0.c) === DOJO.c && Math.round(c0.r) === DOJO.r;
      if (boringMode || atDojo) onFree(); else walkTo(DOJO, () => onFree());
      return;
    }
    if (!best || bd >= 16 * 16) return;
    const cur = codaRef.current;
    const atNode = cur && Math.round(cur.c) === best.c && Math.round(cur.r) === best.r;
    if (boringMode || atNode) onEnter(best);
    else walkTo(best, () => onEnter(best));
  };

  const have = collected.size;
  const restored = have >= 8; // whole sword reforged → post-game state
  const next = nodes.find((n) => !collected.has(H.stageFrag[n.id]));
  return (
    <div className={"adv-screen" + (restored ? " restored" : "")}>
      <style>{CSS}</style>
      <div className="adv-hud adv-hud-top">
        <img className="adv-logo" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
        <span className="adv-title">Harmonia{restored && <em className="adv-restored-tag"> · restored</em>}</span>
        <button className="gear" onClick={onMenu} aria-label="Main menu">☰</button>
        <button className="gear" onClick={onSettings} aria-label="Settings">⚙</button>
      </div>
      <div className="adv-scroll" ref={scrollRef}>
        <canvas ref={mapRef} className="adv-map" onClick={tapMap} role="img" aria-label="Harmonia world map" />
      </div>
      {celebrateNode && H.nodes[celebrateNode - 1] && (
        <div className="map-cleared" aria-hidden="true">
          <span className="map-cleared-star">★</span>
          <span className="map-cleared-text">{H.nodes[celebrateNode - 1].name}<em>region cleared</em></span>
        </div>
      )}
      <div className="adv-hud adv-hud-bottom">
        <canvas ref={swordRef} className={"adv-sword-mini" + (burst ? " burst" : "")} onClick={onForge} role="button" tabIndex={0} aria-label="View Excalibar fragments" />
        <div className="adv-forge-txt">
          <b>{have} / 8</b> fragments
          <span>{have === 8 ? "Excalibar reforged!" : next ? "Next: " + H.fragLabel[H.stageFrag[next.id]] : ""}</span>
        </div>
        <div className="adv-hud-actions">
          <button className="ghost" onClick={onGuide} aria-label="How music works">📖</button>
          <button className="ghost" onClick={onFree} aria-label="Free play">🎸</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  APP  ───────────────────────────── */

export default function NumberEarTrainer() {
  const { playCadence, playDegree, playChord, playProgression, playSemi, sing, sfx, fanfare, grandFanfare, bootChime, startDrone, stopDrone, startPathLoop, stopPathLoop, setSustainVoice, holdNote, releaseNote, releaseAllNotes, stopAll } = useAudio();

  const [boringMode, setBoringMode] = useState(() => loadPref("boring", "0") === "1"); // classic UI vs Adventure
  const [screen, setScreen] = useState(() => (window.HARMONIA && loadPref("boring", "0") === "0" ? "boot" : "home")); // boot | menu | training | home | adventure | levels | session | results | learn | guide | settings
  const [mode, setMode] = useState("melody");     // melody | chords
  const [levelIdx, setLevelIdx] = useState(0);
  const [melGroup, setMelGroup] = useState(null);  // which of the 4 melody worlds is open (null = world picker)
  const [chordChapter, setChordChapter] = useState(null); // which chord chapter is open (null = chapter picker)
  const [progChapter, setProgChapter] = useState(null);   // which progression chapter is open
  const [fromAdventure, setFromAdventure] = useState(false); // entered a stage from the map? (back → map)
  const [advStageId, setAdvStageId] = useState(null);        // region node entered from the map (encounter/victory)
  const [encounterNode, setEncounterNode] = useState(null);  // region id whose encounter modal is open on the map
  const [auxReturn, setAuxReturn] = useState(null);          // where guide/free-play/settings back should go (e.g. "adventure")
  const [forgeOpen, setForgeOpen] = useState(false);         // Excalibar fragment inventory modal (on the map)
  const [mapCelebrateNode, setMapCelebrateNode] = useState(null); // node to play a "region cleared!" flourish on next map view
  const [swordBurst, setSwordBurst] = useState(false);       // one-shot forge flash after earning a fragment
  const sessWasClearedRef = useRef(false);                   // was the region already cleared before this session?
  const [melTab, setMelTab] = useState("stages");  // stages | custom
  const [sessLvl, setSessLvl] = useState(null);     // the level object being played (may be a custom one)

  // custom-level builder
  const [cuMode, setCuMode] = useState("major");
  const [cuKey, setCuKey] = useState("c");          // c | not-c | random
  const [cuOct, setCuOct] = useState(false);        // many octaves?
  const [cuNotes, setCuNotes] = useState([0, 2, 4, 5, 7, 9, 11]); // selected pitch-classes

  const bestOf = (m, idx) => (progress[m] && progress[m][idx]) || 0;
  const isPassed = (m, idx) => {
    const lv = levelsFor(m)[idx];
    return lv ? bestOf(m, idx) >= passCountFor(lv) : false;
  };
  // 3-star rating per level: passed = 1, one miss = 2, perfect = 3.
  const starsFor = (m, idx) => {
    const lv = levelsFor(m)[idx]; if (!lv) return 0;
    const best = bestOf(m, idx), q = qCountOf(lv), pass = passCountFor(lv);
    if (best < pass) return 0;
    if (best >= q) return 3;
    if (best >= q - 1) return 2;
    return 1;
  };
  const totalStars = () => {
    let t = 0;
    ["melody", "chords", "progressions"].forEach((m) => { levelsFor(m).forEach((_, i) => { t += starsFor(m, i); }); });
    return t;
  };
  const [shop, setShop] = useState(() => {
    try { const v = JSON.parse(loadPref("shop", "")); return (v && v.owned) ? v : { owned: [], skin: "default" }; }
    catch (e) { return { owned: [], skin: "default" }; }
  });
  const saveShop = (v) => { setShop(v); savePref("shop", JSON.stringify(v)); };
  const spentStars = () => shop.owned.reduce((a, id) => a + ((SHOP.find((x) => x.id === id) || {}).cost || 0), 0);
  const starBalance = () => totalStars() - spentStars();
  const buyItem = (item) => {
    if (shop.owned.includes(item.id) || starBalance() < item.cost) return;
    saveShop({ ...shop, owned: [...shop.owned, item.id], skin: item.type === "skin" ? item.id : shop.skin });
    sfx("select");
  };
  const equipSkin = (id) => { saveShop({ ...shop, skin: id }); sfx("move"); };
  const skinTint = (SHOP.find((x) => x.id === shop.skin) || {}).tint || null;
  const [progress, setProgress] = useState(loadProgress);

  const [musicKey, setMusicKey] = useState("C");
  const [voiceOn, setVoiceOn] = useState(true);
  const [busy, setBusy] = useState(false);

  // preferences
  const [theme, setTheme] = useState(() => loadPref("theme", "dark"));
  const [resStep, setResStep] = useState(() => parseFloat(loadPref("resstep", "0.8")) || 0.8);
  const [progBeat, setProgBeat] = useState(() => parseFloat(loadPref("progbeat", "1.0")) || 1.0);
  const [chordSevenths, setChordSevenths] = useState(() => loadPref("sevenths", "0") === "1");
  const [showRef, setShowRef] = useState(() => loadPref("chordref", "1") === "1"); // chord-tones reference chart
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    savePref("theme", theme);
  }, [theme]);
  // Installed-to-home-screen? Reserve a top buffer for the status bar ourselves,
  // since some iOS versions don't resolve env(safe-area-inset-top) in a web app.
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      if (standalone) document.documentElement.setAttribute("data-standalone", "1");
    } catch (e) {}
  }, []);
  // retro game skin is on unless the player is in Boring mode
  useEffect(() => {
    document.documentElement.classList.toggle("retro", window.HARMONIA && !boringMode);
  }, [boringMode]);
  // twinkle when landing on the map right after clearing a region
  useEffect(() => {
    if (screen === "adventure" && mapCelebrateNode) sfx("twinkle");
  }, [screen, mapCelebrateNode]);

  // Haptics: navigator.vibrate (Android) + a hidden iOS <input switch> whose
  // toggle produces a light haptic on iOS 17.4+ (best effort; iOS blocks vibrate).
  const hapticRef = useRef(null);
  useEffect(() => {
    const inp = document.createElement("input");
    inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.setAttribute("aria-hidden", "true"); inp.tabIndex = -1;
    inp.style.cssText = "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(inp); hapticRef.current = inp;
    return () => { try { document.body.removeChild(inp); } catch (e) {} };
  }, []);
  const haptic = (big) => {
    try { if (navigator.vibrate) navigator.vibrate(big ? [90, 60, 90, 60, 90, 60, 320] : 55); } catch (e) {}
    try {
      const el = hapticRef.current;
      if (el) { el.click(); if (big) { setTimeout(() => el.click(), 130); setTimeout(() => el.click(), 270); setTimeout(() => el.click(), 430); } }
    } catch (e) {}
  };
  // one-shot forge flash after earning a fragment (clears itself)
  useEffect(() => {
    if (!swordBurst) return;
    const t = setTimeout(() => setSwordBurst(false), 1500);
    return () => clearTimeout(t);
  }, [swordBurst]);
  // boot screen: any key / tap starts the game (and unlocks audio)
  useEffect(() => {
    if (screen !== "boot") return;
    const go = () => { bootChime(); haptic(false); setScreen("menu"); };
    window.addEventListener("keydown", go, { once: true });
    window.addEventListener("pointerdown", go, { once: true });
    return () => { window.removeEventListener("keydown", go); window.removeEventListener("pointerdown", go); };
  }, [screen, sfx]);

  // ladder highlights
  const [litActive, setLitActive] = useState([]);
  const [litCorrect, setLitCorrect] = useState([]);
  const [litWrong, setLitWrong] = useState([]);

  // session UI state
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("idle");     // idle | playing | answer | resolving
  const [feedback, setFeedback] = useState(null); // string or {roman}
  const [chPicked, setChPicked] = useState([]);
  const [progAnswer, setProgAnswer] = useState([]); // romans tapped so far
  const [progWrong, setProgWrong] = useState([]);   // wrong slot indices
  const [progActive, setProgActive] = useState(-1); // chord index lit during replay
  const [streak, setStreak] = useState(0);          // live first-try streak
  const [sessionResults, setSessionResults] = useState([]);
  const [sessKey, setSessKey] = useState("C");

  const sess = useRef({});
  const nextQuestionRef = useRef(() => {});
  const sessTimersRef = useRef([]);
  const sessTimer = (fn, ms) => { sessTimersRef.current.push(setTimeout(fn, ms)); };
  const killSession = () => {
    sessTimersRef.current.forEach(clearTimeout);
    sessTimersRef.current = [];
    stopAll();
  };

  // guide
  const [guidePage, setGuidePage] = useState(0);

  const playPhrase = (degs) => {
    if (busy) return;
    setBusy(true);
    const step = 0.55;
    degs.forEach((d, i) => {
      playDegree(musicKey, d, i * step);
      sing(musicKey, d, voiceOn, i * step, i < degs.length - 1 ? step : null);
      setTimeout(() => setLitActive([DEGREE_SEMITONES[d]]), i * step * 1000);
    });
    setTimeout(() => { setLitActive([]); setBusy(false); }, (degs.length * step + 0.8) * 1000);
  };

  const playTwoFiveOne = () => {
    if (busy) return;
    setBusy(true);
    const seq = [{ degs: [2, 4, 6], root: 2 }, { degs: [5, 7, 9], root: 5 }, { degs: [1, 3, 5], root: 1 }];
    seq.forEach(({ degs, root }, i) => {
      degs.forEach((d) => playDegree(musicKey, d, i * 0.9));
      playDegree(musicKey, root, i * 0.9, 3);
    });
    setTimeout(() => setBusy(false), 3400);
  };

  // free explore
  const [exStart, setExStart] = useState(1);
  const [exCount, setExCount] = useState(3);
  const [exStage, setExStage] = useState(0);
  const [exWorld, setExWorld] = useState(1);
  const [exOctaves, setExOctaves] = useState(1);
  const [exView, setExView] = useState("map"); // map | piano
  const [droneOn, setDroneOn] = useState(false);

  // Free Play: Melody Paths jam
  const [fpTab, setFpTab] = useState("notes");         // notes | paths
  const [pathProg, setPathProg] = useState(["I", "V", "vi", "IV"]);
  const [pathIdx, setPathIdx] = useState(-1);          // current chord in the loop (-1 stopped)
  const [pathCount, setPathCount] = useState(0);       // count-in number showing (0 = none)
  const [pathPlaying, setPathPlaying] = useState(false);
  const [pathBuild, setPathBuild] = useState(false);   // building a custom progression
  const [litPath, setLitPath] = useState([]);          // note cells lit when tapped
  const [pathBeat, setPathBeat] = useState(1.6);       // seconds per bar/chord
  const [pathSevenths, setPathSevenths] = useState(false);
  const [pathDrums, setPathDrums] = useState(true);
  const [pathVoice, setPathVoice] = useState(false); // singing off by default in Paths
  const [susVoice, setSusVoice] = useState("piano"); // Free Play sustain instrument
  const keyHeldRef = useRef({}); // held keyboard keys → { note, litId, litSet }
  const pathBeatRef = useRef(1.6);                     // live tempo for the running loop
  const pathDrumsRef = useRef(true);                   // live drums on/off
  const pathIdxRef = useRef(-1);                       // current column, for keyboard play

  useEffect(() => {
    if (droneOn && screen === "learn") startDrone(musicKey, exWorld);
    else stopDrone();
    return () => stopDrone();
  }, [droneOn, musicKey, exWorld, screen, startDrone, stopDrone]);

  // Stop the paths loop whenever we leave Free Play or the paths tab.
  useEffect(() => {
    if (screen !== "learn" || fpTab !== "paths") {
      stopPathLoop(); setPathPlaying(false); setPathIdx(-1); setPathCount(0);
    }
    return () => stopPathLoop();
  }, [screen, fpTab, stopPathLoop]);

  // Type the number row to play degrees; the note holds while the key is down.
  useEffect(() => {
    if (screen !== "learn") return;
    const held = keyHeldRef.current;
    const down = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const m = KEY_MAP[e.key];
      if (!m || held[e.key]) return;
      e.preventDefault();
      const note = noteOf(m.d, m.oct);
      holdNote(note);
      sing(musicKey, m.oct === 5 && m.d === 1 ? 8 : m.d, fpTab === "paths" ? pathVoice : voiceOn);
      let litId = null, litSet = null;
      if (fpTab === "paths" && m.oct === 4) {
        const col = pathIdxRef.current >= 0 ? pathIdxRef.current : 0;
        const ri = PATH_ROWS.findIndex((r) => r.d === m.d && r.oct === 4);
        if (col < pathProg.length && ri >= 0) { litId = col + "-" + ri; litSet = setLitPath; setLitPath((a) => (a.includes(litId) ? a : [...a, litId])); }
      }
      held[e.key] = { note, litId, litSet };
    };
    const up = (e) => {
      const h = held[e.key];
      if (!h) return;
      releaseNote(h.note);
      if (h.litSet && h.litId) h.litSet((a) => a.filter((x) => x !== h.litId));
      delete held[e.key];
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      Object.values(held).forEach((h) => releaseNote(h.note));
      keyHeldRef.current = {};
    };
  }, [screen, fpTab, musicKey, voiceOn, pathVoice, pathProg]);

  useEffect(() => { setSustainVoice(susVoice); }, [susVoice, setSustainVoice]);

  const setProg = (prog) => { stopPath(); setPathProg(prog); };
  const startPath = async () => {
    if (pathProg.length === 0) return;
    setPathPlaying(true);
    const tones = pathProg.map((r) => chordTones(chordByRoman(r), pathSevenths));
    startPathLoop(musicKey, tones, () => pathBeatRef.current, (s) => {
      if (s.phase === "count") { setPathCount(s.n); setPathIdx(-1); pathIdxRef.current = -1; }
      else { setPathCount(0); setPathIdx(s.i); pathIdxRef.current = s.i; }
    }, 4, () => pathDrumsRef.current);
  };
  const stopPath = () => { stopPathLoop(); setPathPlaying(false); setPathIdx(-1); pathIdxRef.current = -1; setPathCount(0); };
  const setTempo = (b) => { setPathBeat(b); pathBeatRef.current = b; };
  const toggleDrums = () => { const v = !pathDrums; setPathDrums(v); pathDrumsRef.current = v; };
  const noteOf = (d, oct) => Tone.Frequency(Tone.Frequency(musicKey + oct).toMidi() + DEGREE_SEMITONES[d], "midi").toNote();
  const pathDown = (col, ri) => {
    const row = PATH_ROWS[ri];
    const id = col + "-" + ri;
    setLitPath((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(noteOf(row.d, row.oct));
    sing(musicKey, row.d, pathVoice);
  };
  const pathUp = (col, ri) => {
    const row = PATH_ROWS[ri];
    setLitPath((a) => a.filter((x) => x !== col + "-" + ri));
    releaseNote(noteOf(row.d, row.oct));
  };

  const clearLadder = () => { setLitActive([]); setLitCorrect([]); setLitWrong([]); };

  const levels = mode === "melody" ? MELODY_LEVELS : mode === "chords" ? CHORD_LEVELS : PROG_LEVELS;

  /* ── shared actions ── */

  const hearKey = async () => {
    if (busy) return;
    setBusy(true);
    const dur = await playCadence(musicKey);
    setTimeout(() => setBusy(false), dur * 1000);
  };

  const playResolution = (key, octave, targetPc, mode, canSing, onDone) => {
    const path = resolutionSemis(targetPc, mode);
    const step = resStep;
    setBusy(true);
    path.forEach((semi, i) => {
      const isLast = i === path.length - 1;
      playSemi(key, semi, i * step, octave);
      const deg = PC_TO_DEGREE[mod12(semi)];
      if (canSing && deg != null) sing(key, semi >= 12 && deg === 1 ? 8 : deg, voiceOn, i * step, isLast ? null : step);
      sessTimer(() => setLitCorrect([mod12(semi)]), i * step * 1000);
    });
    sessTimer(() => { setBusy(false); if (onDone) onDone(); }, (path.length * step + 0.7) * 1000);
  };

  /* ── session engine ── */

  const startSession = (m, li, customLvl = null) => {
    killSession();
    const baseLvl = customLvl || (m === "melody" ? MELODY_LEVELS[li] : m === "chords" ? CHORD_LEVELS[li] : PROG_LEVELS[li]);
    const lvl = m === "chords" ? { ...baseLvl, sevenths: chordSevenths } : baseLvl;
    setMode(m); setLevelIdx(li); setSessLvl(lvl);
    if (m === "melody" && li != null) setMelGroup(groupIndexOf(li));
    if (m === "chords" && li != null) setChordChapter(chordChapterIndexOf(li));
    if (m === "progressions" && li != null) setProgChapter(progChapterIndexOf(li));
    let key = musicKey;
    if (m === "melody") {
      const km = lvl.keyMode;
      key = km === "c" ? "C" : km === "not-c" ? randKey(["C"]) : randKey([]);
    } else {
      key = lvl.keyMode === "not-c" ? randKey([musicKey]) : lvl.keyMode === "random" ? randKey([]) : musicKey;
    }
    setSessKey(key);
    sess.current = { mode: m, lvl, levelIdx: li, key, octave: 4, qNum: 0, qCount: qCountOf(lvl), results: [], attempted: false, target: null, sevenths: m === "chords" && chordSevenths };
    setQNum(0); setScore(0); setStreak(0); setSessionResults([]);
    setChPicked([]); setProgAnswer([]); setProgWrong([]);
    clearLadder(); setFeedback(null); setPhase("idle");
    setScreen("session");
    sessTimer(() => nextQuestionRef.current(true), 350);
  };

  const nextQuestion = async (isFirst = false) => {
    const s = sess.current;
    clearLadder(); setChPicked([]); setProgAnswer([]); setProgWrong([]); setProgActive(-1); setFeedback(null);
    s.attempted = false;
    setPhase("playing"); setBusy(true);

    if (s.mode === "progressions") {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      const prog = pickProgression(lvl, s.target);
      s.target = prog;
      const cad = (await playCadence(s.key, lvl.mode)) + 0.35;
      const dur = await playProgression(s.key, prog.map((r) => chordByRoman(r).tones), cad, progBeat);
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (cad + dur + 0.2) * 1000);
    } else if (s.mode === "melody") {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      const oct = lvl.octaves[Math.floor(Math.random() * lvl.octaves.length)];
      s.octave = oct;
      let pc;
      do { pc = lvl.pool[Math.floor(Math.random() * lvl.pool.length)]; }
      while (lvl.pool.length > 1 && pc === s.target);
      s.target = pc;
      const t = (await playCadence(s.key, lvl.mode)) + 0.25;
      playSemi(s.key, pc, t, oct);
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (t + 1.15) * 1000);
    } else {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      let c;
      do {
        const pick = lvl.pool[Math.floor(Math.random() * lvl.pool.length)];
        c = CHORDS.find((x) => x.roman === pick);
      } while (lvl.pool.length > 1 && s.target && c.roman === s.target.roman);
      s.target = c;
      const cad = (await playCadence(s.key, lvl.mode)) + 0.25;
      await playChord(s.key, chordTones(c, s.sevenths), cad); // block + arpeggio
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (cad + 0.7) * 1000); // but answer as soon as it sounds
    }
  };
  nextQuestionRef.current = nextQuestion;

  const advance = () => {
    const s = sess.current;
    s.qNum += 1;
    if (s.qNum >= s.qCount) {
      finishSession();
    } else {
      setQNum(s.qNum);
      sessTimer(() => nextQuestionRef.current(false), 750);
    }
  };

  const finishSession = () => {
    const s = sess.current;
    const firstTries = s.results.filter((r) => r.firstTry).length;
    // snapshot region-clear state BEFORE saving this session's progress (for the victory flourish)
    sessWasClearedRef.current = (fromAdventure && advStageId != null) ? stageClearedAdv(advStageId) : false;
    if (s.levelIdx != null) { // custom sessions aren't recorded
      setProgress((prev) => {
        const cur = (prev[s.mode] && prev[s.mode][s.levelIdx]) || 0;
        if (firstTries <= cur) return prev;
        const next = { ...prev, [s.mode]: { ...prev[s.mode], [s.levelIdx]: firstTries } };
        saveProgress(next);
        return next;
      });
    }
    // the moment a region is newly cleared: fanfare (or the GRAND finale on the 8th),
    // and flag the map so it plays a "region cleared" flourish when you return.
    if (fromAdventure && advStageId != null && !sessWasClearedRef.current) {
      const lv = advGroupOf(ADV_STAGES[advStageId - 1]).levels;
      const lastIdx = lv[lv.length - 1].idx;
      const clears = TEST_MODE ? (firstTries >= passCountFor(s.lvl)) : (s.levelIdx === lastIdx && firstTries >= passCountFor(s.lvl));
      if (clears) {
        setMapCelebrateNode(advStageId);
        const others = advNodes.filter((n) => n.id !== advStageId && stageClearedAdv(n.id)).length;
        if (others >= 7) { grandFanfare(); haptic(true); }
        else { fanfare(); haptic(false); }
      }
    }
    setPhase("idle");
    setScreen("results");
  };

  // ♪ — replay just the sound to identify
  const replayTarget = async () => {
    if (phase !== "answer" || busy) return;
    const s = sess.current;
    setBusy(true);
    if (s.mode === "progressions") {
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), 0, progBeat);
      sessTimer(() => setBusy(false), dur * 1000);
    } else if (s.mode === "melody") {
      playSemi(s.key, s.target, 0, s.octave);
      sessTimer(() => setBusy(false), 1000);
    } else {
      const dur = await playChord(s.key, chordTones(s.target, s.sevenths));
      sessTimer(() => setBusy(false), dur * 1000);
    }
  };

  // ↻ Repeat — replay the whole question: cadence, then the sound to identify
  const replayFull = async () => {
    if (phase !== "answer" || busy) return;
    const s = sess.current;
    setBusy(true);
    if (s.mode === "progressions") {
      const cad = (await playCadence(s.key, s.lvl.mode)) + 0.35;
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), cad, progBeat);
      sessTimer(() => setBusy(false), (cad + dur + 0.2) * 1000);
    } else if (s.mode === "melody") {
      const t = (await playCadence(s.key, s.lvl.mode)) + 0.25;
      playSemi(s.key, s.target, t, s.octave);
      sessTimer(() => setBusy(false), (t + 1.15) * 1000);
    } else {
      const cad = (await playCadence(s.key, s.lvl.mode)) + 0.25;
      const dur = await playChord(s.key, chordTones(s.target, s.sevenths), cad);
      sessTimer(() => setBusy(false), (cad + dur + 0.3) * 1000);
    }
  };

  /* ── melody answers ── */

  const answerMelodySession = (pc) => {
    if (phase !== "answer" || busy) return;
    const s = sess.current;
    const lvl = s.lvl;
    if (pc === s.target) {
      const first = !s.attempted;
      s.results.push({ target: s.target, firstTry: first });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setLitWrong([]);
      setPhase("resolving");
      const deg = PC_TO_DEGREE[pc];
      setFeedback(deg != null ? DEGREE_QUIPS[deg] : ALT_QUIPS[pc]);
      playResolution(s.key, s.octave, s.target, lvl.mode, !lvl.chromatic, advance);
    } else {
      s.attempted = true;
      setStreak(0);
      setLitWrong([pc]);
      playSemi(s.key, pc, 0, s.octave);
      setFeedback("Not that one — that's the note you pressed. Try again.");
    }
  };

  /* ── chord answers ── */

  const toggleChordPick = (d) => {
    if (phase !== "answer") return;
    const need = sess.current.sevenths ? 4 : 3;
    setLitWrong([]); setFeedback(null);
    setChPicked((p) =>
      p.includes(d) ? p.filter((x) => x !== d) : p.length < need ? [...p, d] : p
    );
  };

  const checkChordSession = async () => {
    const s = sess.current;
    const tones = chordTones(s.target, s.sevenths);
    if (phase !== "answer" || chPicked.length !== tones.length || busy) return;
    const t = new Set(tones.map((d) => (d === 8 ? 1 : d)));
    const right = chPicked.every((d) => t.has(d));
    if (right) {
      const first = !s.attempted;
      s.results.push({ target: s.target.roman, firstTry: first });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setLitCorrect(tones); setLitWrong([]);
      setPhase("resolving");
      setFeedback({ roman: s.target.roman, sym: chordSymbol(s.target.roman, s.sevenths), num: chordNumber(s.target.roman, s.sevenths), quality: chordQuality(s.target.roman, s.sevenths), tones });
      setBusy(true);
      const dur = await playChord(s.key, tones);
      sessTimer(() => { setBusy(false); advance(); }, (dur + 1.4) * 1000);
    } else {
      s.attempted = true;
      setStreak(0);
      setLitWrong(chPicked.filter((d) => !t.has(d)));
      setFeedback("Close — the marked degrees aren't in it. Adjust and check again.");
    }
  };

  /* ── progression answers ── */

  const tapChord = (roman) => {
    if (phase !== "answer" || busy) return;
    setProgWrong([]); setFeedback(null);
    setProgAnswer((p) => (p.length < sess.current.target.length ? [...p, roman] : p));
  };
  const backspaceChord = () => {
    if (phase !== "answer" || busy) return;
    setProgWrong([]); setFeedback(null);
    setProgAnswer((p) => p.slice(0, -1));
  };

  const checkProgression = async () => {
    const s = sess.current;
    if (phase !== "answer" || busy || progAnswer.length !== s.target.length) return;
    const wrong = s.target.map((r, i) => (progAnswer[i] === r ? -1 : i)).filter((i) => i >= 0);
    if (wrong.length === 0) {
      const first = !s.attempted;
      s.results.push({ target: s.target.join("–"), firstTry: first, prog: [...s.target] });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setPhase("resolving");
      setFeedback({ prog: [...s.target] });
      setBusy(true);
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), 0, progBeat);
      s.target.forEach((_, i) => sessTimer(() => setProgActive(i), i * progBeat * 1000));
      sessTimer(() => setProgActive(-1), s.target.length * progBeat * 1000);
      sessTimer(() => { setBusy(false); advance(); }, (dur + 0.4) * 1000);
    } else {
      s.attempted = true;
      setStreak(0);
      setProgWrong(wrong);
      setFeedback("Not quite — the marked chords are off. Fix them and check again.");
    }
  };

  /* ── free explore ── */

  const pianoNote = (k) => Tone.Frequency(Tone.Frequency(musicKey + "4").toMidi() + k.s, "midi").toNote();
  const pianoLabelOf = (k) => {
    const labs = {};
    exploreNotes(exStart, exCount).forEach((n) => {
      labs[n.semi] = n.label;
      if (n.semi + 12 <= 24) labs[n.semi + 12] = n.label;
    });
    return labs[k.s];
  };
  const pianoDown = (k) => {
    const id = "p" + k.s;
    setLitActive((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(pianoNote(k));
    const label = pianoLabelOf(k);
    if (label != null) sing(musicKey, k.s >= 12 && label === 1 ? 8 : label, voiceOn);
  };
  const pianoUp = (k) => {
    setLitActive((a) => a.filter((x) => x !== "p" + k.s));
    releaseNote(pianoNote(k));
  };

  // Guide keeps a simple tap; Free Play holds the note (down/up) on the sustain voice.
  const playExplore = async (n, row = 0) => {
    const id = n.raw + row * 100;
    setLitActive((a) => [...a, id]);
    playDegree(musicKey, n.label, 0, 4 + (n.upper ? 1 : 0) + row);
    sing(musicKey, (n.upper || row > 0) && n.label === 1 ? 8 : n.label, voiceOn);
    setTimeout(() => setLitActive((a) => a.filter((x) => x !== id)), 550);
  };
  const exploreDown = (n, row = 0) => {
    const id = n.raw + row * 100, oct = 4 + (n.upper ? 1 : 0) + row;
    setLitActive((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(noteOf(n.label, oct));
    sing(musicKey, (n.upper || row > 0) && n.label === 1 ? 8 : n.label, voiceOn);
  };
  const exploreUp = (n, row = 0) => {
    const id = n.raw + row * 100, oct = 4 + (n.upper ? 1 : 0) + row;
    setLitActive((a) => a.filter((x) => x !== id));
    releaseNote(noteOf(n.label, oct));
  };

  /* ── render helpers ── */

  const keyRow = (
    <div className="key-row">
      <label className="key-label">
        Key
        <select value={musicKey} onChange={(e) => { setMusicKey(e.target.value); e.target.blur(); }}>
          {KEYS.map((k) => <option key={k} value={k}>{k} major</option>)}
        </select>
      </label>
      <button className="ghost" onClick={hearKey} disabled={busy}>♪ Hear the key</button>
      <label className="key-label">
        Sound
        <select value={susVoice} onChange={(e) => { setSusVoice(e.target.value); e.target.blur(); }}>
          <option value="piano">Piano</option>
          <option value="pad">Pad</option>
          <option value="lead">Lead</option>
          <option value="strings">Strings</option>
        </select>
      </label>
      {(() => {
        const on = fpTab === "paths" ? pathVoice : voiceOn;
        const set = fpTab === "paths" ? setPathVoice : setVoiceOn;
        return (
          <button className={"ghost voice" + (on ? " on" : "")} onClick={() => set(!on)} aria-pressed={on}>
            {on ? "Voice on" : "Voice off"}
          </button>
        );
      })()}
      {typeof window !== "undefined" && window.CODA_MEDITATE && (
        <img className="fp-coda" src={window.CODA_MEDITATE} alt="Coda, meditating" aria-hidden="true" />
      )}
    </div>
  );

  const brand = (
    <div className="brand">
      <div className="brand-line">
        <h1><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <img className="wejam-logo" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
      </div>
      <p>Learn to speak and understand the true language of music</p>
    </div>
  );

  /* ── adventure (Harmonia) — nodes derived from real progress ── */
  const advNodes = (window.HARMONIA && window.HARMONIA.nodes) || [];
  // a region's fragment is earned by passing its FINAL level (the mastery capstone);
  // you don't have to pass every level along the way.
  const stageClearedAdv = (id) => {
    const s = ADV_STAGES[id - 1]; if (!s) return false;
    const lv = advGroupOf(s).levels;
    if (TEST_MODE) return lv.some((l) => isPassed(s.mode, l.idx)); // testing: any level clears it
    return isPassed(s.mode, lv[lv.length - 1].idx);
  };
  const advCollected = new Set(advNodes.filter((n) => stageClearedAdv(n.id)).map((n) => window.HARMONIA.stageFrag[n.id]));
  const advCurrentId = (advNodes.find((n) => !stageClearedAdv(n.id)) || advNodes[advNodes.length - 1] || {}).id;
  const enterStage = (n) => {
    const s = ADV_STAGES[n.id - 1]; if (!s) return;
    setFromAdventure(true);
    setAdvStageId(n.id);
    setMode(s.mode);
    if (s.mode === "melody") setMelGroup(s.gi);
    else if (s.mode === "chords") setChordChapter(s.gi);
    else setProgChapter(s.gi);
    setScreen("levels");
  };
  const setBoring = (v) => { setBoringMode(v); savePref("boring", v ? "1" : "0"); setScreen(v ? "home" : "menu"); };

  /* ── screens ── */

  if (screen === "boot") {
    return (
      <div className="app boot-screen">
        <style>{CSS}</style>
        <h1 className="boot-title"><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <img className="boot-star" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
        <div className="boot-start blink">PRESS ANY KEY</div>
      </div>
    );
  }

  if (screen === "menu") {
    const item = (icon, label, go) => (
      <button className="menu-item" onClick={() => { sfx("select"); setAuxReturn(null); go(); }} onMouseEnter={() => sfx("move")}>
        <span className="mi-icon">{icon}</span> {label}
      </button>
    );
    return (
      <div className="app menu-screen">
        <style>{CSS}</style>
        <h1 className="menu-logo"><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <div className="menu-list">
          {item("⚔", "Adventure", () => setScreen("adventure"))}
          {item("🎯", "Basic Training", () => setScreen("training"))}
          {item("🎸", "Free Play", () => { setFpTab("notes"); setScreen("learn"); })}
          {item("📖", "How music works", () => { setGuidePage(0); setScreen("guide"); })}
          {item("★", "Shop (" + starBalance() + ")", () => setScreen("shop"))}
          {item("⚙", "Settings", () => setScreen("settings"))}
        </div>
        <footer className="foot">One map to rule them all.</footer>
      </div>
    );
  }

  if (screen === "training") {
    const sec = (title, desc, go) => (
      <button className="card" onClick={() => { sfx("select"); go(); }}>
        <span className="card-title">{title}</span>
        <span className="card-desc">{desc}</span>
      </button>
    );
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { sfx("back"); setScreen("menu"); }}>← Menu</button>
          <h2 className="screen-title">Basic Training</h2>
        </header>
        <div className="cards">
          {sec("Single notes", `Hear a note, name its degree. ${MELODY_GROUPS.length} stages.`, () => { setMode("melody"); setMelGroup(null); setScreen("levels"); })}
          {sec("Chord tones", `Hear a chord, find its degrees. ${CHORD_CHAPTERS.length} chapters.`, () => { setMode("chords"); setChordChapter(null); setScreen("levels"); })}
          {sec("Chord progressions", `Name each chord in order. ${PROG_CHAPTERS.length} chapters.`, () => { setMode("progressions"); setProgChapter(null); setScreen("levels"); })}
        </div>
        <footer className="foot">Sharpen your ear — every rep forges Excalibar.</footer>
      </div>
    );
  }

  if (screen === "adventure") {
    // in game mode a tap opens the Keeper encounter modal; boring mode goes straight in
    const onTapNode = (n) => { if (boringMode) { enterStage(n); } else { sfx("select"); setEncounterNode(n.id); } };
    const en = encounterNode && window.HARMONIA ? window.HARMONIA.nodes[encounterNode - 1] : null;
    const enStage = encounterNode ? ADV_STAGES[encounterNode - 1] : null;
    const enTitle = enStage ? advGroupOf(enStage).name : "";
    const enMode = enStage ? enStage.mode : "melody";
    const enLevels = enStage ? advGroupOf(enStage).levels.length : 0;
    const enFrag = en ? window.HARMONIA.fragLabel[window.HARMONIA.stageFrag[encounterNode]] : "";
    const enModeLabel = enMode === "melody" ? "single notes" : enMode === "chords" ? "chord tones" : "chord progressions";
    return (
      <>
        <AdventureMap
          nodes={advNodes} currentId={advCurrentId} collected={advCollected} onEnter={onTapNode} skinTint={skinTint}
          burst={swordBurst} boringMode={boringMode} onForge={() => { sfx("select"); setForgeOpen(true); }}
          celebrateNode={mapCelebrateNode} onCelebrateDone={() => setMapCelebrateNode(null)}
          onMenu={() => setScreen(boringMode ? "home" : "menu")}
          onSettings={() => { setAuxReturn("adventure"); setScreen("settings"); }}
          onGuide={() => { setAuxReturn("adventure"); setGuidePage(0); setScreen("guide"); }}
          onFree={() => { setAuxReturn("adventure"); setFpTab("notes"); setScreen("learn"); }} />
        {en && (
          <div className="encounter-modal" onClick={() => setEncounterNode(null)}>
            <div className={"encounter mood-" + en.mood} onClick={(e) => e.stopPropagation()}>
              <div className="enc-head">
                <span className="enc-emblem" aria-hidden="true">{en.emblem}</span>
                <div className="enc-titles">
                  <span className="kicker">Region {encounterNode} · Harmonia</span>
                  <h2 className="encounter-title">{en.name}</h2>
                  <span className="encounter-sub">{enTitle}</span>
                </div>
                <span className="enc-frag"><span className="gem">◆</span>{enFrag}</span>
              </div>
              <p className="keeper-line">
                <b className="keeper-name">{en.keeper}</b>
                <q>{en.greet}</q>
              </p>
              <p className="stage-goal">{stageGoal(enMode, enTitle)}</p>
              <span className="stage-meta">{enLevels} levels · {enModeLabel} · earn {en.short}'s mark → ◆</span>
              <div className="enc-actions">
                <button className="ghost" onClick={() => setEncounterNode(null)}>Not yet</button>
                <button className="primary" onClick={() => { const id = encounterNode; sfx("select"); setEncounterNode(null); enterStage({ id }); }}>Continue →</button>
              </div>
            </div>
          </div>
        )}
        {forgeOpen && window.HARMONIA && (
          <div className="forge-modal" onClick={() => setForgeOpen(false)}>
            <div className="forge-panel" onClick={(e) => e.stopPropagation()}>
              <span className="forge-kicker">The legendary blade</span>
              <h2 className="forge-title">Excalibar</h2>
              <ForgeSword collected={advCollected} className="forge-sword-big" />
              <span className="forge-tally">{advCollected.size} / 8 fragments</span>
              <ul className="frag-list">
                {window.HARMONIA.nodes.map((nd) => {
                  const fid = window.HARMONIA.stageFrag[nd.id];
                  const have = advCollected.has(fid);
                  return (
                    <li key={nd.id} className={"frag-row" + (have ? " got" : " locked")}>
                      <span className="frag-mark">{have ? "◆" : "◇"}</span>
                      <span className="frag-name">{window.HARMONIA.fragLabel[fid]}</span>
                      <em className="frag-src">{have ? nd.name : "— locked"}</em>
                    </li>
                  );
                })}
              </ul>
              <button className="primary" onClick={() => setForgeOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (screen === "home") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top">
          <div className="brand-row">
            {brand}
            <button className="gear" onClick={() => { setAuxReturn(null); setScreen("settings"); }} aria-label="Settings">⚙</button>
          </div>
        </header>
        <div className="cards">
          {window.HARMONIA && (
            <button className="card adventure" onClick={() => setScreen("adventure")}>
              <span className="card-title">⚔ Adventure — Harmonia</span>
              <span className="card-desc">Travel the world, clear each region, and forge Excalibar — the tonal-map blade.</span>
              <span className="card-progress">{advCollected.size} of 8 fragments forged</span>
            </button>
          )}
          <button className="card start" onClick={() => { setAuxReturn(null); setGuidePage(0); setScreen("guide"); }}>
            <span className="card-title">Start here — how music works</span>
            <span className="card-desc">Why music is simpler than you think. The tonal map, the matrix of music, and the secret behind playing what you hear.</span>
          </button>
          <button className="card" onClick={() => { setMode("melody"); setMelGroup(null); setScreen("levels"); }}>
            <span className="card-title">Single notes</span>
            <span className="card-desc">Hear a note, name its degree. {MELODY_GROUPS.length} stages.</span>
            <span className="card-progress">{(() => {
              const done = MELODY_GROUPS.filter((g) => g.levels.every((l) => isPassed("melody", l.idx))).length;
              return done > 0 ? `${done} of ${MELODY_GROUPS.length} stages passed` : `${MELODY_GROUPS.length} stages`;
            })()}</span>
          </button>
          <button className="card" onClick={() => { setMode("chords"); setChordChapter(null); setScreen("levels"); }}>
            <span className="card-title">Chord tones</span>
            <span className="card-desc">Hear a chord, find its degrees in the key. {CHORD_CHAPTERS.length} chapters.</span>
            <span className="card-progress">{(() => {
              const done = CHORD_LEVELS.filter((_, i) => isPassed("chords", i)).length;
              return done > 0 ? `${done} of ${CHORD_LEVELS.length} levels passed` : `${CHORD_LEVELS.length} levels`;
            })()}</span>
          </button>
          <button className="card" onClick={() => { setMode("progressions"); setProgChapter(null); setScreen("levels"); }}>
            <span className="card-title">Chord progressions</span>
            <span className="card-desc">Hear a progression, name each chord in order. {PROG_CHAPTERS.length} chapters.</span>
            <span className="card-progress">{(() => {
              const done = PROG_LEVELS.filter((_, i) => isPassed("progressions", i)).length;
              return done > 0 ? `${done} of ${PROG_LEVELS.length} levels passed` : `${PROG_LEVELS.length} levels`;
            })()}</span>
          </button>
          <button className="card quiet" onClick={() => { setAuxReturn(null); setScreen("learn"); }}>
            <span className="card-title">Free play</span>
            <span className="card-desc">Improvise and explore with the raw materials of music.</span>
          </button>
        </div>
        <footer className="foot">Every sound relates to home. One map to rule them all.</footer>
      </div>
    );
  }

  if (screen === "settings") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => setScreen(auxReturn || (boringMode ? "home" : "menu"))}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">Settings</h2>
        </header>
        <div className="settings">
          <div className="set-block">
            <span className="set-label">Theme</span>
            <div className="seg">
              <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Dark</button>
              <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>Light</button>
            </div>
          </div>
          {window.HARMONIA && (
            <div className="set-block">
              <span className="set-label">Home screen</span>
              <p className="set-desc">Adventure = the Harmonia world map. Boring mode = the plain menu.</p>
              <div className="seg">
                <button className={!boringMode ? "on" : ""} onClick={() => setBoring(false)}>⚔ Adventure</button>
                <button className={boringMode ? "on" : ""} onClick={() => setBoring(true)}>Boring mode</button>
              </div>
            </div>
          )}
          <div className="set-block">
            <span className="set-label">Resolution speed</span>
            <p className="set-desc">How fast the notes walk home after a correct answer.</p>
            <div className="seg">
              {RES_SPEEDS.map((s) => (
                <button key={s.label}
                  className={Math.abs(resStep - s.step) < 0.001 ? "on" : ""}
                  onClick={() => { setResStep(s.step); savePref("resstep", s.step); }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button className="ghost" style={{ marginTop: 10 }}
              onClick={() => playResolution(musicKey, 4, 4, "major", voiceOn, null)}
              disabled={busy}>
              ♪ Hear resolution
            </button>
          </div>
          <div className="set-block">
            <span className="set-label">Progression speed</span>
            <p className="set-desc">How fast chords play in a progression.</p>
            <div className="seg">
              {PROG_SPEEDS.map((s) => (
                <button key={s.label}
                  className={Math.abs(progBeat - s.beat) < 0.001 ? "on" : ""}
                  onClick={() => { setProgBeat(s.beat); savePref("progbeat", s.beat); }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button className="ghost" style={{ marginTop: 10 }}
              onClick={() => playProgression(musicKey, [["I"], ["V"], ["vi"], ["IV"]].map(([r]) => chordByRoman(r).tones), 0, progBeat)}
              disabled={busy}>
              ♪ Hear a progression
            </button>
          </div>
          <div className="set-block">
            <span className="set-label">Progress</span>
            <p className="set-desc">Clears your ✓ marks and best scores on this device.</p>
            <button className="ghost" style={{ alignSelf: "flex-start" }}
              onClick={() => {
                if (window.confirm("Reset all progress on this device? This can't be undone.")) {
                  try { window.localStorage.removeItem("numbersong-progress"); } catch (e) {}
                  setProgress({ melody: {}, chords: {}, progressions: {} });
                }
              }}>
              Reset progress
            </button>
          </div>
        </div>
        <footer className="foot">Preferences are saved on this device.</footer>
      </div>
    );
  }

  if (screen === "levels") {
    // Melody world picker (with Stages / Custom tabs), then a world's ramp.
    if (mode === "melody" && melGroup === null) {
      return (
        <div className="app">
          <style>{CSS}</style>
          <header className="top-slim">
            <button className="back" onClick={() => setScreen(boringMode ? "home" : "menu")}>{boringMode ? "← Home" : "← Menu"}</button>
            <h2 className="screen-title">Single notes</h2>
          </header>
          <div className="tabs">
            <button className={"tab" + (melTab === "stages" ? " on" : "")} onClick={() => setMelTab("stages")}>Stages</button>
            <button className={"tab" + (melTab === "custom" ? " on" : "")} onClick={() => setMelTab("custom")}>Custom</button>
          </div>
          {melTab === "stages" ? (
            <>
              <div className="levels">
                {MELODY_GROUPS.map((g, gi) => {
                  const done = g.levels.filter((l) => isPassed("melody", l.idx)).length;
                  return (
                    <button key={gi} className="level world" onClick={() => { setFromAdventure(false); setMelGroup(gi); }}>
                      <span className="level-num">{gi + 1}</span>
                      <span className="level-body">
                        <span className="level-name">{g.name}</span>
                        <span className="level-desc">{done} of {g.levels.length} passed</span>
                      </span>
                      <span className="level-state">{done === g.levels.length ? "✓" : "›"}</span>
                    </button>
                  );
                })}
              </div>
              <p className="hint center">{SESSION_LEN} questions per session · {Math.round(PASS_RATE * 100)}% on first tries earns the ✓</p>
            </>
          ) : (
            <div className="custom-builder">
              <div className="cu-row">
                <span className="cu-label">Feel</span>
                <div className="seg">
                  <button className={cuMode === "major" ? "on" : ""} onClick={() => setCuMode("major")}>Major</button>
                  <button className={cuMode === "minor" ? "on" : ""} onClick={() => setCuMode("minor")}>Minor</button>
                </div>
              </div>
              <div className="cu-row">
                <span className="cu-label">Key</span>
                <div className="seg">
                  <button className={cuKey === "c" ? "on" : ""} onClick={() => setCuKey("c")}>{cuMode === "minor" ? "A minor" : "C major"}</button>
                  <button className={cuKey === "not-c" ? "on" : ""} onClick={() => setCuKey("not-c")}>New key</button>
                  <button className={cuKey === "random" ? "on" : ""} onClick={() => setCuKey("random")}>Every key</button>
                </div>
              </div>
              <div className="cu-row">
                <span className="cu-label">Octaves</span>
                <div className="seg">
                  <button className={!cuOct ? "on" : ""} onClick={() => setCuOct(false)}>One</button>
                  <button className={cuOct ? "on" : ""} onClick={() => setCuOct(true)}>Many</button>
                </div>
              </div>
              <div className="cu-notes-head">
                <span className="cu-label">Notes ({cuNotes.length})</span>
                <div className="cu-presets">
                  <button onClick={() => setCuNotes([...NAT_PCS])}>Scale</button>
                  <button onClick={() => setCuNotes([...ALL12])}>All 12</button>
                </div>
              </div>
              <div className="cu-notes">
                {ALL12.map((pc) => {
                  const on = cuNotes.includes(pc);
                  return (
                    <button key={pc}
                      className={"cu-note" + (on ? " on" : "") + (pc === tonicPcOf(cuMode) ? " tonic" : "") + (ALTERED_PCS.includes(pc) ? " alt" : "")}
                      onClick={() => setCuNotes((p) => p.includes(pc) ? p.filter((x) => x !== pc) : [...p, pc])}>
                      {NOTE_LABELS[pc]}
                    </button>
                  );
                })}
              </div>
              <button className="primary wide" disabled={cuNotes.length < 2}
                onClick={() => startSession("melody", null, {
                  name: "Custom", group: null, mode: cuMode,
                  chromatic: cuNotes.some((pc) => ALTERED_PCS.includes(pc)),
                  pool: [...cuNotes].sort((a, b) => a - b),
                  keyMode: cuKey, octaves: cuOct ? [3, 4, 5] : [4],
                })}>
                Start custom session
              </button>
              <p className="hint center">Pick your notes and key — custom runs aren't scored toward stages.</p>
            </div>
          )}
        </div>
      );
    }

    // Chords / progressions: pick a chapter (Major 1-4-5-6 / Minor 6-2-3-4) first.
    const chapters = mode === "chords" ? CHORD_CHAPTERS : PROG_CHAPTERS;
    const activeChapter = mode === "chords" ? chordChapter : progChapter;
    const setChapter = mode === "chords" ? setChordChapter : setProgChapter;
    if ((mode === "chords" || mode === "progressions") && activeChapter === null) {
      return (
        <div className="app">
          <style>{CSS}</style>
          <header className="top-slim">
            <button className="back" onClick={() => setScreen(boringMode ? "home" : "menu")}>{boringMode ? "← Home" : "← Menu"}</button>
            <h2 className="screen-title">{mode === "chords" ? "Chord tones" : "Chord progressions"}</h2>
          </header>
          <div className="levels">
            {chapters.map((c, ci) => {
              const done = c.levels.filter((l) => isPassed(mode, l.idx)).length;
              return (
                <button key={ci} className="level world" onClick={() => { setFromAdventure(false); setChapter(ci); }}>
                  <span className="level-num">{ci + 1}</span>
                  <span className="level-body">
                    <span className="level-name">{c.name}</span>
                    <span className="level-desc">{done} of {c.levels.length} passed</span>
                  </span>
                  <span className="level-state">{done === c.levels.length ? "✓" : "›"}</span>
                </button>
              );
            })}
          </div>
          <p className="hint center">Master the four chords of a key. Minor is the same four, centered on 6.</p>
        </div>
      );
    }

    const list = mode === "melody"
      ? MELODY_GROUPS[melGroup].levels
      : chapters[activeChapter].levels;
    const title = mode === "melody" ? MELODY_GROUPS[melGroup].name : chapters[activeChapter].name;
    const onBack = fromAdventure
      ? () => { setFromAdventure(false); setScreen("adventure"); }
      : mode === "melody" ? () => setMelGroup(null) : () => setChapter(null);
    const backLabel = fromAdventure ? "← Map" : mode === "melody" ? "← Worlds" : "← Chapters";
    const modeLabel = mode === "melody" ? "single notes" : mode === "chords" ? "chord tones" : "chord progressions";
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={onBack}>{backLabel}</button>
          <h2 className="screen-title">{title}</h2>
        </header>
        <div className="stage-intro">
          <p className="stage-goal">{stageGoal(mode, title)}</p>
          <span className="stage-meta">{list.length} levels · {modeLabel}</span>
        </div>
        {mode === "chords" && (
          <div className="key-row">
            <label className="key-label">
              Key
              <select value={musicKey} onChange={(e) => { setMusicKey(e.target.value); e.target.blur(); }}>
                {KEYS.map((k) => <option key={k} value={k}>{k} major</option>)}
              </select>
            </label>
            <button className={"ghost voice" + (chordSevenths ? " on" : "")}
              onClick={() => { const v = !chordSevenths; setChordSevenths(v); savePref("sevenths", v ? "1" : "0"); }}
              aria-pressed={chordSevenths}>
              {chordSevenths ? "Sevenths on" : "Sevenths off"}
            </button>
          </div>
        )}
        <div className="levels">
          {list.map((lvl, i) => {
            const best = bestOf(mode, lvl.idx);
            const passed = isPassed(mode, lvl.idx);
            return (
              <button key={lvl.idx} className="level" onClick={() => startSession(mode, lvl.idx)}>
                <span className="level-num">{i + 1}</span>
                <span className="level-body">
                  <span className="level-name">{lvl.name}</span>
                  {mode === "melody" ? (
                    <span className="level-tags">
                      {levelTags(lvl).map((t, ti) => <span key={ti} className="tag">{t}</span>)}
                    </span>
                  ) : (
                    <span className="level-desc">{lvl.desc}</span>
                  )}
                  <ProgressSquares best={best} total={qCountOf(lvl)} />
                </span>
                <span className="level-state">
                  <span className="level-stars">{[1, 2, 3].map((n) => <span key={n} className={"lvl-star" + (starsFor(mode, lvl.idx) >= n ? " on" : "")}>★</span>)}</span>
                  <span className={"level-pct" + (passed ? " pass" : "")}>{Math.round((best / qCountOf(lvl)) * 100)}%</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint center">{SESSION_LEN} questions per session · {Math.round(PASS_RATE * 100)}% on first tries earns the ✓</p>
      </div>
    );
  }

  if (screen === "session") {
    const lvl = sessLvl || levels[levelIdx];
    const pool = mode === "melody" ? lvl.pool : null;
    const isMinor = mode === "melody" && lvl.mode === "minor";
    const tonicPc = isMinor ? 9 : 0;
    const chordTonic = lvl.mode === "minor" ? 6 : 1; // home degree for chord chapters
    const displayKey = lvl.mode === "minor" ? `${KEYS[mod12(KEYS.indexOf(sessKey) + 9)]} minor` : `${sessKey} major`;
    // pads climb from home: minor starts on 6, major on 1 (matches the tonal map)
    const diaOrder = isMinor ? [6, 7, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
    const chromOrder = ALL12.map((i) => mod12(tonicPc + i));
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { killSession(); setPhase("idle"); setBusy(false); setScreen("levels"); }}>← Quit</button>
          <h2 className="screen-title">{lvl.name}</h2>
          <span className="session-score">{streak >= 2 && <span className="streak">🔥{streak}</span>}{score} ✓</span>
        </header>
        <div className="progressbar"><div className="fill" style={{ width: `${(qNum / qCountOf(lvl)) * 100}%` }} /></div>
        {!boringMode && (
          <div className="hpbar">
            <span className="hp-label">Trial</span>
            <div className="trial-cells">
              {Array.from({ length: qCountOf(lvl) }).map((_, i) => {
                const r = sessionResults[i];
                const cls = "cell"
                  + (r ? (r.firstTry ? " hit" : " miss") : "")
                  + (i === passCountFor(lvl) - 1 ? " mark" : "")
                  + (streak >= 2 && i === sessionResults.length - 1 && r && r.firstTry ? " hot" : "");
                return <i key={i} className={cls} />;
              })}
            </div>
            {streak >= 2 && <span className="combo">×{streak}</span>}
          </div>
        )}
        <p className="qcount">Question {Math.min(qNum + 1, qCountOf(lvl))} of {qCountOf(lvl)} · {displayKey}{lvl.keyMode === "random" ? " (changes every question)" : ""}</p>

        {mode === "melody" && (
          <DegreeLadder active={litActive} correct={litCorrect} wrong={litWrong}
            tonicPc={tonicPc} pool={pool} showChrom={lvl.chromatic} />
        )}

        <section className="panel">
          <div className="quiz-bar">
            <div className="replay-group">
              <button className="ghost" onClick={replayFull} disabled={phase !== "answer" || busy}>↻ Repeat</button>
              <button className="ghost note" onClick={replayTarget} disabled={phase !== "answer" || busy}
                aria-label="Play just the sound to identify">♪</button>
            </div>
            {mode === "melody" && (
              <button className={"ghost voice" + (voiceOn ? " on" : "")}
                onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn}>
                {voiceOn ? "Voice on" : "Voice off"}
              </button>
            )}
            {mode === "chords" && (
              <button className={"ghost voice" + (showRef ? " on" : "")}
                onClick={() => { const v = !showRef; setShowRef(v); savePref("chordref", v ? "1" : "0"); }}
                aria-pressed={showRef}>
                Chord chart
              </button>
            )}
            <p className="hint grow">
              {phase === "playing" ? "Listen…"
                : feedback && feedback.roman
                  ? <span><strong>{feedback.sym}</strong> <em className="numlabel">{feedback.num}</em> · {feedback.quality}. {CHORD_INSIGHTS[feedback.roman]}</span>
                : feedback && feedback.prog
                  ? <span><strong>{feedback.prog.join("–")}</strong> — nailed the changes.</span>
                : feedback ? feedback
                : mode === "melody" ? "Which number did you hear?"
                : mode === "chords" ? `Select ${lvl.sevenths ? 4 : 3} degrees (${chPicked.length}/${lvl.sevenths ? 4 : 3}), then check.`
                : "Tap the chords you heard, in order."}
            </p>
          </div>
          {mode === "melody" ? (
            lvl.chromatic ? (
              <div className="numpad chromatic">
                {chromOrder.map((pc) => {
                  const out = !pool.includes(pc);
                  return (
                    <button key={pc}
                      className={"num chrom" + (pc === tonicPc ? " tonic" : "") + (ALTERED_PCS.includes(pc) ? " alt" : "") + (out ? " dim" : "")}
                      onClick={() => answerMelodySession(pc)}
                      disabled={phase !== "answer" || out}>
                      {NOTE_LABELS[pc]}<span className="num-sol">{NOTE_SOLFEGE[pc]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="numpad">
                {diaOrder.map((deg) => {
                  const pc = DEGREE_TO_PC[deg];
                  const out = !pool.includes(pc);
                  return (
                    <button key={deg}
                      className={"num" + (pc === tonicPc ? " tonic" : "") + (out ? " dim" : "")}
                      onClick={() => answerMelodySession(pc)}
                      disabled={phase !== "answer" || out}>
                      {deg}<span className="num-sol">{SOLFEGE[deg]}</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : mode === "chords" ? (
            <>
            {showRef && (
              <div className="chord-ref">
                {lvl.pool.map((r) => {
                  const tones = chordTones(chordByRoman(r), lvl.sevenths);
                  return (
                    <div key={r} className="cr-row">
                      <span className="cr-sym">{chordSymbol(r, lvl.sevenths)}</span>
                      <span className="cr-num">{chordNumber(r, lvl.sevenths)}</span>
                      <span className="cr-tones">{tones.map(degreeLabel).join(" · ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="chord-layout">
              <SessionStack picked={chPicked} correct={litCorrect} wrong={litWrong}
                label={feedback && feedback.roman ? feedback.sym : null} />
              <div className="chord-right">
                <div className="numpad">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button key={d}
                      className={"num" + (d === chordTonic ? " tonic" : "") + (chPicked.includes(d) ? " picked" : "")}
                      onClick={() => toggleChordPick(d)}
                      disabled={phase !== "answer"}>
                      {d}<span className="num-sol">{SOLFEGE[d]}</span>
                    </button>
                  ))}
                </div>
                <button className="primary wide" onClick={checkChordSession}
                  disabled={phase !== "answer" || chPicked.length !== (lvl.sevenths ? 4 : 3) || busy}>
                  Check answer
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="prog-layout">
              <div className="prog-stacks">
                {Array.from({ length: lvl.len }, (_, i) => {
                  const revealing = phase === "resolving" && feedback && feedback.prog;
                  const roman = revealing ? feedback.prog[i] : progAnswer[i];
                  return (
                    <ProgStack key={i} roman={roman}
                      tonic={lvl.mode === "minor" ? 6 : 1}
                      wrong={progWrong.includes(i)}
                      active={revealing && progActive === i} />
                  );
                })}
              </div>
              <div className="numpad chordpad">
                {lvl.pool.map((r) => (
                  <button key={r} className="num chordbtn"
                    onClick={() => tapChord(r)}
                    disabled={phase !== "answer" || busy || progAnswer.length >= lvl.len}>
                    {r}<span className="num-sol">{chordNumber(r, false)}</span>
                  </button>
                ))}
              </div>
              <div className="prog-actions">
                <button className="ghost" onClick={backspaceChord}
                  disabled={phase !== "answer" || busy || !progAnswer.length}>⌫ Undo</button>
                <button className="primary grow" onClick={checkProgression}
                  disabled={phase !== "answer" || busy || progAnswer.length !== lvl.len}>
                  Check answer
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (screen === "results") {
    const total = sessionResults.length || 1;
    const firstTries = sessionResults.filter((r) => r.firstTry).length;
    const pct = Math.round((firstTries / total) * 100);
    const passRate = passRateOf(sessLvl);
    const passed = firstTries / total >= passRate;
    const lvls = levels;
    const isCustom = levelIdx == null;
    const resultName = (sessLvl && sessLvl.name) || (lvls[levelIdx] && lvls[levelIdx].name) || "Session";
    // region just fully cleared? → Keeper's mark + fragment flourish (game mode only)
    const advNode = fromAdventure && !boringMode && advStageId && window.HARMONIA ? window.HARMONIA.nodes[advStageId - 1] : null;
    const justCleared = advNode && !sessWasClearedRef.current && stageClearedAdv(advStageId);
    const finale = justCleared && advCollected.size >= 8; // the WHOLE sword just came together
    const fragName = advNode ? window.HARMONIA.fragLabel[window.HARMONIA.stageFrag[advStageId]] : "";
    const hasNext = !isCustom && levelIdx + 1 < lvls.length;

    // best first-try streak this session
    let bestStreak = 0, run = 0;
    sessionResults.forEach((r) => { if (r.firstTry) { run += 1; bestStreak = Math.max(bestStreak, run); } else run = 0; });

    // per-target breakdown (progressions have long, mostly-unique labels — skip the bars)
    const showBars = mode !== "progressions";
    const byTarget = {};
    sessionResults.forEach((r) => {
      const k = typeof r.target === "number" ? NOTE_LABELS[r.target] : r.target;
      byTarget[k] = byTarget[k] || { right: 0, total: 0 };
      byTarget[k].total += 1;
      if (r.firstTry) byTarget[k].right += 1;
    });

    return (
      <div className="app">
        <style>{CSS}</style>
        {justCleared && <div className="fx-flash" aria-hidden="true" />}
        {justCleared && (
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((cf, i) => (
              <i key={i} style={{ left: cf.left + "%", background: cf.color, "--drift": cf.drift + "px", "--dur": cf.dur + "s", "--delay": cf.delay + "s" }} />
            ))}
          </div>
        )}
        {finale && (
          <div className="finale" onClick={() => { setSwordBurst(true); setScreen("adventure"); }}>
            <div className="finale-rays" aria-hidden="true" />
            <div className="finale-inner">
              <span className="finale-kicker">✦ The blade is whole ✦</span>
              <div className="finale-forge">
                <ForgeSword collected={advCollected} className="finale-sword" />
                <span className="finale-shine" aria-hidden="true" />
                {typeof window !== "undefined" && window.CODA_VICTORY && (
                  <img className="finale-coda" src={window.CODA_VICTORY} alt="Coda, victorious" aria-hidden="true" />
                )}
              </div>
              <h2 className="finale-title">EXCALIBAR<br />REFORGED</h2>
              <span className="finale-quote">“{advNode.win}”</span>
              <button className="primary finale-btn" onClick={(e) => { e.stopPropagation(); setSwordBurst(true); setScreen("adventure"); }}>Return to Harmonia →</button>
            </div>
          </div>
        )}
        <header className="top-slim">
          <button className="back" onClick={() => { if (fromAdventure) { setSwordBurst(!!justCleared); setScreen("adventure"); } else { setScreen("levels"); } }}>{fromAdventure ? "← To the map" : "← Levels"}</button>
          <h2 className="screen-title">{resultName}</h2>
        </header>
        <div className="results">
          {justCleared && !finale && (
            <div className="victory">
              <div className="victory-rays" aria-hidden="true" />
              <div className="victory-glow" aria-hidden="true" />
              <span className="victory-kicker">✦ Fragment forged ✦</span>
              <h3 className="victory-title">{advNode.winTitle}</h3>
              <div className="victory-forge">
                <ForgeSword collected={advCollected} className="victory-sword" />
                <div className="forge-sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
              <span className="frag-chip"><span className="gem">◆</span>{fragName} — forged into Excalibar</span>
              <span className="victory-quote">“{advNode.win}”</span>
              <span className="forge-count">{advCollected.size >= 8 ? "Excalibar reforged!" : advCollected.size + " / 8 fragments"}</span>
            </div>
          )}
          {justCleared && !finale && (
            <button className="primary map-return" onClick={() => { setSwordBurst(true); setScreen("adventure"); }}>← Return to the map</button>
          )}
          <div className={"score-big" + (passed ? " pass" : "")}>{pct}%</div>
          <p className="hint center">
            {isCustom
              ? (passed ? "Strong run. Custom sessions aren't scored toward stages." : "Custom sessions aren't scored toward stages — tweak the notes and go again.")
              : passed
                ? (hasNext ? "Passed! This level is checked off." : "Passed — that's the top level. Your ears are working.")
                : `${Math.round(passRate * 100)}% on first tries earns the check. Every rep counts.`}
          </p>
          <div className="stat-row">
            <span className="stat"><b>{firstTries}/{total}</b> first try</span>
            <span className="stat"><b>{bestStreak >= 2 ? "🔥" : ""}{bestStreak}</b> best streak</span>
          </div>
          {showBars && (
            <div className="bars">
              {Object.entries(byTarget).map(([k, v]) => (
                <div key={k} className="bar-row">
                  <span className="bar-label">{k}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(v.right / v.total) * 100}%` }} /></div>
                  <span className="bar-count">{v.right}/{v.total}</span>
                </div>
              ))}
            </div>
          )}
          <div className="results-actions">
            <button className="primary" onClick={() => isCustom ? startSession(mode, null, sessLvl) : startSession(mode, levelIdx)}>Try again</button>
            {hasNext && (
              <button className="primary" onClick={() => startSession(mode, levelIdx + 1)}>Next level →</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    const bal = starBalance();
    const skinItem = (id, name, desc, tint) => {
      const owned = id === "default" || shop.owned.includes(id);
      const equipped = shop.skin === id;
      const cost = (SHOP.find((x) => x.id === id) || {}).cost;
      return (
        <div key={id} className={"shop-item" + (equipped ? " equipped" : "")}>
          <span className="shop-swatch" style={{ background: tint }} />
          <div className="shop-info"><span className="shop-name">{name}</span><span className="shop-desc">{desc}</span></div>
          {owned
            ? <button className={"ghost" + (equipped ? " on" : "")} onClick={() => equipSkin(id)} disabled={equipped}>{equipped ? "Equipped" : "Equip"}</button>
            : <button className="primary" onClick={() => buyItem(SHOP.find((x) => x.id === id))} disabled={bal < cost}>★ {cost}</button>}
        </div>
      );
    };
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => setScreen(boringMode ? "home" : "menu")}>{boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">Shop</h2>
        </header>
        <div className="shop-balance"><span className="star">★</span> {bal} <em>stars to spend</em></div>
        <p className="hint center">Ace levels to earn stars: 1★ pass · 2★ one miss · 3★ perfect. Spend them on Coda skins.</p>
        <div className="shop-grid">
          {skinItem("default", "Coda (classic)", "The original teal & green.", "#57C6C4")}
          {SHOP.map((it) => skinItem(it.id, it.name, it.desc, it.tint))}
        </div>
      </div>
    );
  }

  if (screen === "guide") {
    const pages = [
      // 1 — the problem
      <div key="p1" className="guide-page">
        <h3>Why music is simpler than you think</h3>
        <p className="guide-lead">Here's how most people learn to improvise:</p>
        <p>Learn some songs, memorize some chord shapes, drill some scale shapes… and then, somehow, you can play what you hear? There's a missing step, and everyone feels it.</p>
        <p className="guide-lead">What's actually missing:</p>
        <p><em>Why</em> certain sounds sound good, how to practice improvisation itself, and a personal connection to the sounds of music.</p>
        <p className="guide-lead">Don't scales help?</p>
        <p>They do — but scales and interval drills are not the core skill. Thousands of trained classical players can't play a simple nursery rhyme from memory without guessing, and plenty of jazz players sink in an unfamiliar key. So what is the core skill?</p>
      </div>,
      // 2 — music is relative
      <div key="p2" className="guide-page">
        <h3>Music is relative (it's all numbers, y'all)</h3>
        <p>Western music has only 12 notes, repeating forever in both directions — and at any given moment, a piece is mostly using just <em>7</em> of them. Most education overemphasizes absolute note names; numbers are the purest way to think about music for improvising.</p>
        <p>This is the <em>tonal map</em>. You might know it as the major scale. The dots are the notes in between — notice 3–4 and 7–1 sit right next to each other. Tap it. In any key, this map sounds the same.</p>
        <ExploreMap start={1} count={8} stage={0} octaves={1} world={null}
          active={litActive} onPlay={playExplore} />
      </div>,
      // 3 — the matrix
      <div key="p3" className="guide-page">
        <h3>The matrix of music</h3>
        <p>Almost every player who struggles to play what they hear is missing the same thing: an understanding of how everything in the key connects numerically. Above all, you should always know exactly <em>where you are</em> in the tonal octave.</p>
        <p>Every melody note has a number — relative to the <em>key</em>, not the chord. "Mary Had a Little Lamb" is:</p>
        <p className="guide-numbers">3 2 1 2 3 3 3 · 2 2 2 · 3 5 5</p>
        <button className="primary" onClick={() => playPhrase([3, 2, 1, 2, 3, 3, 3, 2, 2, 2, 3, 5, 5])} disabled={busy}>
          ♪ Hear it in numbers
        </button>
        <DegreeLadder active={litActive} correct={[]} wrong={[]} />
        <p>This matrix applies to every single piece of music you hear, at all times.</p>
      </div>,
      // 4 — chords live in the map
      <div key="p4" className="guide-page">
        <h3>Every note of every chord</h3>
        <p>Chords aren't separate objects — they're stacks of degrees from the same map. Here's a 2–5–1 in stack notation: circled numbers are the chord's tones, always named relative to the key.</p>
        <div className="stacks">
          <GuideStack label="2-" world={2} />
          <GuideStack label="5D" world={5} />
          <GuideStack label="1" world={1} />
        </div>
        <button className="primary" onClick={playTwoFiveOne} disabled={busy}>♪ Hear the 2–5–1</button>
        <p>Once you see music this way, everything you play becomes ear training — because the sounds of the map don't change. Note 1 to 3 is always note 1 to 3. You can even train without an instrument.</p>
      </div>,
      // 5 — what doors this opens
      <div key="p5" className="guide-page">
        <h3>What doors does this lens open?</h3>
        <p><em>Find the key of any song from one note.</em> Every note is somewhere in the key — the question is always "where am I in the key," never "what key are we in."</p>
        <p><em>Play anything you can sing.</em> Translate it into numbers, and you can play it in any key, on any instrument you know.</p>
        <p><em>Jam without asking the chords.</em> You just listen, and you know where everything lies in the tonal octave.</p>
        <p>The recap: only 12 notes (7, really). Music is relative — it's all numbers. Everything should be ear training. And you should know exactly where you are in the tonal octave, at all times. That's what this whole app trains.</p>
      </div>,
    ];
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { killSession(); setBusy(false); setScreen(auxReturn || (boringMode ? "home" : "menu")); }}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">How music works</h2>
        </header>
        <section className="panel">{pages[guidePage]}</section>
        <div className="pager">
          <button className="ghost" disabled={guidePage === 0} onClick={() => setGuidePage((p) => p - 1)}>← Back</button>
          <div className="dots">
            {pages.map((_, i) => <span key={i} className={"dot" + (i === guidePage ? " on" : "")} />)}
          </div>
          {guidePage < pages.length - 1
            ? <button className="primary" onClick={() => setGuidePage((p) => p + 1)}>Next →</button>
            : <button className="primary" onClick={() => startSession("melody", 0)}>Start training →</button>}
        </div>
      </div>
    );
  }

  // free explore screen
  const stageLabels = ["Numbers on", "Blank pads"];
  return (
    <div className="app">
      <style>{CSS}</style>
      <header className="top-slim">
        <button className="back" onClick={() => { setDroneOn(false); stopPath(); killSession(); setBusy(false); setScreen(auxReturn || (boringMode ? "home" : "menu")); }}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
        <h2 className="screen-title">Free play</h2>
      </header>
      {keyRow}
      <div className="tabs">
        <button className={"tab" + (fpTab === "notes" ? " on" : "")} onClick={() => setFpTab("notes")}>7 worlds</button>
        <button className={"tab" + (fpTab === "paths" ? " on" : "")} onClick={() => { setDroneOn(false); setFpTab("paths"); }}>Paths</button>
      </div>
      {fpTab === "paths" ? (
        <>
          <div className="explore-controls">
            <button className="primary" onClick={() => (pathPlaying ? stopPath() : startPath())} disabled={!pathProg.length}>
              {pathPlaying ? "■ Stop" : "▶ Play loop"}
            </button>
            <button className={"ghost" + (pathBuild ? " voice on" : "")} onClick={() => setPathBuild((b) => !b)}>
              {pathBuild ? "Done" : "Build"}
            </button>
            <label className="key-label">
              Tempo
              <select value={pathBeat} onChange={(e) => { setTempo(Number(e.target.value)); e.target.blur(); }}>
                {PATH_SPEEDS.map((s) => <option key={s.label} value={s.beat}>{s.label}</option>)}
              </select>
            </label>
            <button className={"ghost voice" + (pathSevenths ? " on" : "")}
              onClick={() => { stopPath(); setPathSevenths((v) => !v); }}>
              {pathSevenths ? "7ths on" : "7ths"}
            </button>
            <button className={"ghost voice" + (pathDrums ? " on" : "")} onClick={toggleDrums}>
              {pathDrums ? "Drums on" : "Drums"}
            </button>
            {pathCount > 0 && <span className="path-count">{pathCount}</span>}
          </div>
          {pathBuild ? (
            <div className="path-build">
              <div className="numpad chordpad">
                {ALL_CHORDS.map((r) => (
                  <button key={r} className="num chordbtn"
                    onClick={() => {
                      playChord(musicKey, chordTones(chordByRoman(r), pathSevenths), 0, false);
                      if (pathProg.length < 8) setProg([...pathProg, r]);
                    }}>
                    {r}<span className="num-sol">{chordNumber(r, false)}</span>
                  </button>
                ))}
              </div>
              <div className="prog-actions">
                <button className="ghost" onClick={() => setProg(pathProg.slice(0, -1))} disabled={!pathProg.length}>⌫ Undo</button>
                <button className="ghost" onClick={() => setProg([])} disabled={!pathProg.length}>Clear</button>
              </div>
            </div>
          ) : (
            <div className="path-presets">
              {PATH_PRESETS.map((p, i) => (
                <button key={i} className={"chip" + (p.join() === pathProg.join() ? " on" : "")}
                  onClick={() => setProg(p)}>
                  {p.map((r) => chordNumber(r, false)).join(" ")}
                </button>
              ))}
            </div>
          )}
          <div className="path-grid">
            {pathProg.map((r, col) => (
              <PathColumn key={col} roman={r} col={col} current={pathIdx === col} lit={litPath} onDown={pathDown} onUp={pathUp} sevenths={pathSevenths} />
            ))}
          </div>
          <p className="hint center">
            Play the loop, then solo — tap the pads or use the number row (<strong>` 1–7 8 9 0 - =</strong>). Hop to the nearest circled tone of each chord.
          </p>
          <footer className="foot">Solo over the changes. The circles are your safe landing notes.</footer>
        </>
      ) : (
      <>
      <div className="explore-controls">
        <label className="key-label">
          Start on
          <select value={exStart} onChange={(e) => { setExStart(Number(e.target.value)); e.target.blur(); }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="key-label">
          Notes
          <select value={exCount} onChange={(e) => { setExCount(Number(e.target.value)); e.target.blur(); }}>
            {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="key-label">
          <select value={exWorld} onChange={(e) => { const w = Number(e.target.value); setExWorld(w); setExStart(w); e.target.blur(); }}>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => <option key={w} value={w}>World {w}</option>)}
          </select>
        </label>
      </div>
      <div className="explore-controls">
        <button className={"ghost" + (exStage > 0 ? " voice on" : "")}
          onClick={() => setExStage((s) => (s + 1) % 2)}>
          {stageLabels[exStage]}
        </button>
        <button className={"ghost voice" + (droneOn ? " on" : "")}
          onClick={() => setDroneOn(!droneOn)} aria-pressed={droneOn}>
          {droneOn ? "Drone " + exWorld + " on" : "Drone"}
        </button>
        {exView === "map" && (
          <button className={"ghost voice" + (exOctaves === 2 ? " on" : "")}
            onClick={() => setExOctaves(exOctaves === 2 ? 1 : 2)}>
            + Octave
          </button>
        )}
        <button className="ghost" onClick={() => setExView(exView === "map" ? "piano" : "map")}>
          {exView === "map" ? "Piano view" : "Map view"}
        </button>
      </div>
      {exView === "map"
        ? <ExploreMap start={exStart} count={exCount} stage={exStage}
            octaves={exOctaves} world={exWorld}
            active={litActive} onDown={exploreDown} onUp={exploreUp} />
        : <PianoMap start={exStart} count={exCount} stage={exStage}
            world={exWorld} musicKey={musicKey}
            active={litActive} onDown={pianoDown} onUp={pianoUp} />}
      <p className="hint center">
        {exStage === 0
          ? `World ${exWorld}: the blue pads are its chord tones (${worldChordTones(exWorld).join("·")}). Drone on, sing the numbers.`
          : "Numbers hidden. Sing each number as you press its pad."}
        {" "}Or play the number row on your keyboard (<strong>` 1–7 8 9 0 - =</strong>).
      </p>
      <footer className="foot">Your imagined instrument, made briefly visible. The goal is to need it less and less.</footer>
      </>
      )}
    </div>
  );
}

/* ─────────────────────────────  STYLES  ───────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&display=swap');

:root {
  --bg: #383D3B;
  --card: #424845;
  --line: #565D59;
  --text: #EDF2EE;
  --text-soft: #A9B3AC;
  --green: #6ABF5E;
  --blue: #7CADD1;
  --teal: #57C6C4;
  --wrong: #E07856;
  --alt: #2B302D;
}
:root[data-theme="light"] {
  --bg: #F1F5F1;
  --card: #FFFFFF;
  --line: #D2DBD4;
  --text: #23302A;
  --text-soft: #63706A;
  --green: #4EA943;
  --blue: #4E86AE;
  --teal: #2FA6A4;
  --wrong: #D0603F;
  --alt: #E4EAE5;
}
html, body { background: var(--bg); }
* { box-sizing: border-box; }
.app {
  min-height: 100vh; background: var(--bg); color: var(--text);
  font-family: 'Archivo', system-ui, sans-serif;
  max-width: 560px; margin: 0 auto;
  /* pad for the iOS status bar / notch when launched from the home screen */
  padding:
    calc(20px + env(safe-area-inset-top, 0px))
    calc(16px + env(safe-area-inset-right, 0px))
    calc(32px + env(safe-area-inset-bottom, 0px))
    calc(16px + env(safe-area-inset-left, 0px));
  display: flex; flex-direction: column; gap: 16px;
  /* app-like touch: no text selection, callout, or tap flash on hold */
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
}
button { touch-action: manipulation; }
.path-note, .explore-pad, .pk, .num, .cu-note, .chip, .rung { touch-action: none; }
/* installed web app: guarantee a top buffer that clears the iOS status bar,
   even where env(safe-area-inset-top) reports 0 */
:root[data-standalone] .app {
  padding-top: max(64px, calc(20px + env(safe-area-inset-top, 0px)));
}
.top { display: flex; flex-direction: column; gap: 12px; }
.top-slim { display: flex; align-items: center; gap: 12px; }
.screen-title {
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.15rem;
  margin: 0; flex: 1;
}
.session-score { color: var(--green); font-weight: 700; font-size: 0.95rem; }
.back {
  background: transparent; border: 1.5px solid var(--line); color: var(--text-soft);
  border-radius: 10px; padding: 7px 12px; font-size: 0.85rem;
}
.brand h1 {
  font-family: 'Archivo Black', 'Archivo', sans-serif; font-weight: 400;
  font-size: 2.1rem; margin: 0; letter-spacing: 0.01em; line-height: 1;
}
.brand .w1 { color: var(--green); }
.brand .w2 { color: var(--blue); }
.brand-line { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.wejam-logo { display: block; height: 46px; width: auto; }
.brand p { margin: 6px 0 0; color: var(--text-soft); font-size: 0.95rem; }
.key-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.fp-coda { height: 46px; width: auto; image-rendering: pixelated; align-self: center; opacity: 0.92; }
.key-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-soft); }
select {
  font-family: inherit; font-size: 0.95rem; color: var(--text);
  background: var(--card); border: 1.5px solid var(--line); border-radius: 10px;
  padding: 8px 10px;
}
button { font-family: inherit; cursor: pointer; transition: transform 0.06s, background 0.15s, border-color 0.15s, color 0.15s; }
button:active { transform: scale(0.97); }
button:disabled { opacity: 0.4; cursor: default; }
button:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }
.ghost {
  background: transparent; color: var(--text); border: 1.5px solid var(--line);
  border-radius: 10px; padding: 8px 14px; font-size: 0.9rem; font-weight: 500;
}
.ghost.voice.on { border-color: var(--teal); color: var(--teal); }
.primary {
  background: var(--green); color: #23302A; border: none;
  border-radius: 10px; padding: 10px 18px; font-size: 0.95rem; font-weight: 700;
}
.primary.wide { width: 100%; margin-top: 14px; padding: 13px; }

/* home cards */
.cards { display: flex; flex-direction: column; gap: 12px; }
.card {
  text-align: left; background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 18px 16px; display: flex; flex-direction: column; gap: 5px;
  color: var(--text);
}
.card:hover { border-color: var(--blue); }
.card-title { font-family: 'Archivo Black', sans-serif; font-size: 1.15rem; }
.card-desc { color: var(--text-soft); font-size: 0.9rem; line-height: 1.45; }
.card-progress { color: var(--green); font-size: 0.8rem; font-weight: 600; margin-top: 3px; }
.card.quiet .card-title { color: var(--teal); }

/* level list */
.levels { display: flex; flex-direction: column; gap: 10px; }
.stage-intro {
  background: var(--card); border: 1.5px solid var(--line); border-left: 3px solid var(--teal);
  border-radius: 12px; padding: 12px 14px; margin: 0 0 14px;
}
.stage-goal { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--text); }
.stage-meta { display: block; margin-top: 7px; font-size: 0.72rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.06em; }
.level {
  display: flex; align-items: center; gap: 14px; text-align: left;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 14px;
  padding: 14px 16px; color: var(--text);
}
.level:hover:not(:disabled) { border-color: var(--green); }
.level.locked { opacity: 0.45; }
.level-num {
  font-family: 'Archivo Black', sans-serif; font-size: 1.3rem; color: var(--blue);
  min-width: 1.4em; text-align: center;
}
.level-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.level-name { font-weight: 700; }
.level-desc { color: var(--text-soft); font-size: 0.85rem; }
.level-state { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 3em; }
.level-pct { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text-soft); }
.level-pct.pass { color: var(--green); }
.level-check { color: var(--green); font-size: 0.95rem; line-height: 1; }
.level-stars { display: flex; gap: 1px; }
.lvl-star { font-size: 0.72rem; color: var(--line); line-height: 1; }
.lvl-star.on { color: #D9B45B; }
.star { color: #D9B45B; }
.shop-balance { text-align: center; font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: #D9B45B; }
.shop-balance em { font-style: normal; font-size: 0.8rem; color: var(--text-soft); font-family: 'Archivo', sans-serif; margin-left: 4px; }
.shop-grid { display: flex; flex-direction: column; gap: 10px; }
.shop-item { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.shop-item.equipped { border-color: var(--teal); }
.shop-swatch { width: 34px; height: 34px; border-radius: 8px; flex: 0 0 auto; box-shadow: inset 0 0 0 2px rgba(255,255,255,.18); }
.shop-info { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
.shop-name { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; }
.shop-desc { font-size: 0.8rem; color: var(--text-soft); }
.shop-item .primary, .shop-item .ghost { flex: 0 0 auto; padding: 10px 14px; }

/* session */
.progressbar {
  height: 8px; background: var(--card); border-radius: 99px; overflow: hidden;
  border: 1px solid var(--line);
}
.progressbar .fill { height: 100%; background: var(--green); border-radius: 99px; transition: width 0.4s ease; }
.qcount { margin: -6px 0 0; font-size: 0.8rem; color: var(--text-soft); text-align: center; }

/* ── the signature: proportional tonal map ── */
.ladder {
  display: grid; grid-template-columns: repeat(13, 1fr); gap: 2px;
  background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 14px 8px;
  align-items: center;
}
.rung {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 0; border-radius: 10px; position: relative;
  transition: background 0.25s, box-shadow 0.25s, opacity 0.25s;
}
.rung-num {
  font-family: 'Archivo Black', sans-serif; font-weight: 400;
  font-size: 1.1rem; line-height: 1; color: var(--text);
}
.gap-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-soft); opacity: 0.5;
  justify-self: center; align-self: center;
}
.rung.dim { opacity: 0.22; }
.ladder.explore { padding: 16px 10px; }
.explore-pad {
  border: 1.5px solid var(--line); background: var(--bg);
  min-height: 74px; justify-content: center; cursor: pointer;
}
.explore-pad .rung-num { font-size: 1.5rem; }
.explore-pad.tonic { border-color: var(--teal); }
.explore-pad.blank .rung-num { visibility: hidden; }
.explore-pad.chordal { border-color: var(--blue); }
.explore-pad.chordal .rung-num { color: var(--blue); }
.explore-pad.world-root { border-width: 2.5px; }
.explore-pad.tonic { box-shadow: inset 0 0 0 0; }
.explore-pad.active { background: var(--green); border-color: var(--green); }
.explore-pad.active .rung-num { color: #23302A; }
.explore-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* piano view */
.piano {
  position: relative; height: 190px;
  background: #232725; border: 1.5px solid var(--line); border-radius: 12px;
  overflow: hidden;
}
.pk { position: absolute; top: 0; padding: 0; display: flex; align-items: flex-end; justify-content: center; }
.pk.white {
  height: 100%; background: #EDF2EE; border: 1px solid #232725;
  border-radius: 0 0 6px 6px; z-index: 1;
}
.pk.black {
  height: 60%; background: #1A1D1B; border: 1px solid #000;
  border-radius: 0 0 5px 5px; z-index: 2;
}
.pk.white.active { background: var(--green); }
.pk.black.active { background: var(--green); }
.pk-label {
  font-family: 'Archivo Black', sans-serif; font-size: 1.05rem; color: #23302A;
  margin-bottom: 10px; position: relative;
}
.pk.black .pk-label { color: var(--text); font-size: 0.9rem; margin-bottom: 8px; }
.pk-label.chordal { color: #2F5E86; }
.pk.black .pk-label.chordal { color: var(--blue); }
.pk-label.tonic { color: #0F7B79; }
.pk.black .pk-label.tonic { color: var(--teal); }
.pk-label.world-root { text-decoration: underline; text-underline-offset: 3px; }
.pk-star { position: absolute; top: -0.7em; right: -0.8em; font-size: 0.55em; }
.rung.tonic { box-shadow: inset 0 0 0 1.5px var(--teal); }
.rung.tonic .rung-num { color: var(--teal); }
.rung.tonic::before {
  content: "✳"; position: absolute; top: 1px; right: 2px;
  font-size: 0.5rem; color: var(--teal); line-height: 1;
}
.rung.active, .rung.correct {
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(106,191,94,0.25), 0 0 18px rgba(106,191,94,0.45);
}
.rung.active .rung-num, .rung.correct .rung-num { color: #23302A; }
.rung.active::before, .rung.correct::before { color: #23302A; }
.rung.selected { background: var(--blue); }
.rung.selected .rung-num { color: #232E36; }
.rung.wrong { background: var(--wrong); }
.rung.wrong .rung-num { color: #3A241B; }
@media (prefers-reduced-motion: no-preference) {
  .rung.correct { animation: pulse 0.5s ease-out; }
  @keyframes pulse { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
}

.panel {
  background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 18px 16px;
}
.hint { margin: 0 0 14px; font-size: 0.92rem; color: var(--text-soft); line-height: 1.5; }
.hint.center { text-align: center; margin: 0; }
.hint.grow { flex: 1; margin: 0; min-height: 2.7em; }
.hint em { color: var(--text); font-style: normal; font-weight: 600; }
.hint strong { color: var(--teal); font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.05rem; }
.quiz-bar { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
.replay-group { display: flex; flex-shrink: 0; }
.replay-group .ghost { border-radius: 10px 0 0 10px; border-right-width: 0.75px; }
.replay-group .ghost.note { border-radius: 0 10px 10px 0; border-left-width: 0.75px; padding-left: 12px; padding-right: 12px; font-size: 1.05rem; }

.numpad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.num {
  aspect-ratio: 1; min-height: 58px;
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.5rem;
  background: var(--bg); color: var(--text);
  border: 1.5px solid var(--line); border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
}
.num-sol {
  font-family: 'Archivo', sans-serif; font-weight: 500; font-size: 0.62rem;
  color: var(--text-soft); letter-spacing: 0.05em;
}
.rung-sol {
  font-family: 'Archivo', sans-serif; font-weight: 500; font-size: 0.6rem;
  color: var(--text-soft); letter-spacing: 0.05em; margin-top: 2px;
}
.rung.active .rung-sol, .explore-pad.active .rung-sol { color: #23302A; }
.num.tonic { border-color: var(--teal); color: var(--teal); }
.num.picked { background: var(--blue); color: #232E36; border-color: var(--blue); }
.num.dim { opacity: 0.22; }
.num.picked.tonic { background: var(--teal); color: #1E3230; border-color: var(--teal); }

/* chromatic answer pad: 12 notes in two rows, altered ones tinted darker */
.numpad.chromatic { grid-template-columns: repeat(6, 1fr); gap: 8px; }
.num.chrom { aspect-ratio: auto; min-height: 52px; font-size: 1.2rem; padding: 10px 0; }
.num.chrom.alt { background: var(--alt); color: var(--text-soft); }
.num.chrom.tonic { border-color: var(--teal); color: var(--teal); }
.num.chrom.tonic.alt { color: var(--teal); }

/* altered positions on the tonal map when chromatics are shown */
.alt-rung { padding: 7px 0; }
.rung-num.alt { font-size: 0.72rem; color: var(--text-soft); }
.rung.active .rung-num.alt, .rung.correct .rung-num.alt, .rung.wrong .rung-num.alt { color: #23302A; }

/* FET-style pill tags on melody level cards */
.level-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
.tag {
  font-size: 0.72rem; color: var(--text-soft);
  background: var(--bg); border: 1px solid var(--line); border-radius: 999px;
  padding: 2px 9px; white-space: nowrap;
}

/* per-level progress squares */
.squares { display: flex; gap: 3px; margin-top: 7px; }
.sq { width: 9px; height: 9px; border-radius: 2px; background: var(--line); }
.sq.on { background: var(--green); }

/* Stages / Custom tabs */
.tabs { display: flex; gap: 6px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 4px; }
.tab {
  flex: 1; background: transparent; border: none; color: var(--text-soft);
  border-radius: 9px; padding: 9px; font-size: 0.9rem; font-weight: 600;
}
.tab.on { background: var(--bg); color: var(--text); box-shadow: inset 0 0 0 1.5px var(--line); }

/* custom level builder */
.custom-builder { display: flex; flex-direction: column; gap: 14px; }
.cu-row { display: flex; align-items: center; gap: 12px; }
.cu-label { font-size: 0.85rem; color: var(--text-soft); min-width: 4.6em; }
.seg { display: flex; flex: 1; gap: 6px; }
.seg button {
  flex: 1; background: var(--card); color: var(--text-soft);
  border: 1.5px solid var(--line); border-radius: 10px; padding: 9px 6px; font-size: 0.85rem; font-weight: 600;
}
.seg button.on { border-color: var(--blue); color: var(--text); }
.cu-notes-head { display: flex; align-items: center; justify-content: space-between; }
.cu-presets { display: flex; gap: 6px; }
.cu-presets button {
  background: transparent; color: var(--text-soft); border: 1.5px solid var(--line);
  border-radius: 8px; padding: 5px 12px; font-size: 0.78rem; font-weight: 600;
}
.cu-notes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.cu-note {
  min-height: 48px; font-family: 'Archivo Black', sans-serif; font-size: 1.1rem;
  background: var(--bg); color: var(--text-soft);
  border: 1.5px solid var(--line); border-radius: 12px;
}
.cu-note.alt { background: var(--alt); }
.cu-note.on { background: var(--blue); color: #232E36; border-color: var(--blue); }
.cu-note.tonic { border-color: var(--teal); }
.cu-note.on.tonic { background: var(--teal); color: #1E3230; }

/* settings */
.brand-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.gear {
  background: transparent; border: 1.5px solid var(--line); color: var(--text-soft);
  border-radius: 10px; width: 40px; height: 40px; font-size: 1.2rem; flex-shrink: 0;
}
.gear:hover { border-color: var(--teal); color: var(--teal); }

/* adventure map (Harmonia) */
.card.adventure { border-color: var(--teal); }
.card.adventure .card-title { color: var(--teal); }
.card.adventure:hover { border-color: var(--green); }
/* full-screen immersive adventure: the map fills the screen, HUD floats on top */
/* flex column: solid HUD bars top & bottom, the map lives fully BETWEEN them
   (never scrolls under a bar), so nothing obscures the terrain or Coda. */
.adv-screen { position: fixed; inset: 0; z-index: 40; background: #1b1f1d; overflow: hidden; display: flex; flex-direction: column; }
.adv-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; justify-content: center; }
.adv-map { image-rendering: pixelated; width: 100%; max-width: 460px; height: auto; align-self: center; margin: auto 0; cursor: pointer; }
.adv-hud { flex: 0 0 auto; z-index: 2; display: flex; align-items: center; gap: 12px; }
.adv-hud-top {
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px;
  background: #161a18; border-bottom: 2px solid #2b322d;
}
.adv-hud-bottom {
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
  background: #161a18; border-top: 2px solid #2b322d;
}
.adv-logo { height: 26px; width: auto; image-rendering: pixelated; }
.adv-title { flex: 1; font-family: 'Archivo Black', sans-serif; font-size: 1.05rem; letter-spacing: 0.08em; color: var(--teal); text-transform: uppercase; }
.adv-sword-mini { image-rendering: pixelated; height: 64px; width: auto; flex-shrink: 0; }
.adv-forge-txt { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; color: var(--text-soft); }
.adv-forge-txt b { font-family: 'Archivo Black', sans-serif; font-size: 1rem; color: var(--teal); }
.adv-hud-actions { display: flex; gap: 8px; }
.adv-hud-actions .ghost { padding: 8px 11px; font-size: 1.1rem; }
.settings { display: flex; flex-direction: column; gap: 20px; }
.set-block {
  display: flex; flex-direction: column; gap: 10px;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 16px; padding: 16px;
}
.set-label { font-family: 'Archivo Black', sans-serif; font-size: 1rem; }
.set-desc { margin: -4px 0 2px; font-size: 0.85rem; color: var(--text-soft); }
.set-block .seg button.on { border-color: var(--teal); color: var(--teal); }

/* chord-tones reference chart */
.chord-ref {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;
}
.cr-row {
  display: flex; align-items: baseline; gap: 8px;
  background: var(--bg); border: 1.5px solid var(--line); border-radius: 10px;
  padding: 7px 11px; flex: 1 1 auto; min-width: 128px;
}
.cr-sym { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; min-width: 2.6em; }
.cr-num { color: var(--blue); font-weight: 700; font-size: 0.82rem; min-width: 2.6em; }
.cr-tones { margin-left: auto; color: var(--text-soft); font-weight: 600; font-size: 0.9rem; }
.cr-tones b { color: var(--teal); font-weight: 700; }

/* chord progressions */
.streak { color: var(--wrong); font-weight: 700; margin-right: 8px; }
/* input area holds either the buttons or the review stacks — fixed height so
   swapping between them never shifts the layout, and the stacks never clip */
/* the answer slots ARE the stacks — always in place; the degree ladder is a
   skeleton with a "?" until you tap a chord, then its tones circle in. */
.prog-layout { display: flex; flex-direction: column; gap: 16px; }
.prog-stacks { display: flex; gap: 12px; align-items: flex-start; justify-content: center; flex-wrap: nowrap; }
.prog-stack { gap: 2px; flex: 0 0 auto; transition: transform 0.15s ease; }
.prog-stack .stack-note {
  width: 24px; height: 18px; font-size: 0.72rem; border-radius: 5px;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.prog-stack:not(.filled) .stack-note { opacity: 0.35; }
.prog-stack:not(.filled) .stack-label { color: var(--text-soft); }
.prog-stack .stack-note.on { border-width: 1.5px; }
.prog-stack .stack-note.home { color: var(--teal); }
.prog-stack .stack-note.on.home { border-color: var(--teal); color: var(--teal); }
.prog-stack .stack-label { color: var(--blue); font-size: 0.85rem; padding-top: 4px; min-width: 30px; }
.prog-stack.wrong .stack-label { color: var(--wrong); }
.prog-stack.wrong .stack-note.on { border-color: var(--wrong); color: var(--wrong); }
.prog-stack.active { transform: translateY(-3px) scale(1.06); }
.prog-stack.active .stack-note.on { border-color: var(--green); color: var(--green); box-shadow: 0 0 8px rgba(106,191,94,0.5); }
.prog-stack.active .stack-label { color: var(--green); }
.numpad.chordpad { grid-template-columns: repeat(4, 1fr); }
.num.chordbtn { aspect-ratio: auto; min-height: 52px; font-size: 1.15rem; }

/* Melody Paths grid */
.path-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  background: var(--card); color: var(--text-soft); border: 1.5px solid var(--line);
  border-radius: 999px; padding: 7px 13px; font-family: 'Archivo Black', sans-serif; font-size: 0.85rem;
}
.chip.on { border-color: var(--teal); color: var(--text); }
.path-count {
  font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: var(--teal);
  min-width: 1.4em; text-align: center;
}
.path-build { display: flex; flex-direction: column; gap: 12px; }
.path-grid {
  display: flex; gap: 10px; justify-content: center; overflow-x: auto;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 16px; padding: 14px 10px;
}
.path-col {
  display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 0 0 auto;
  padding: 6px 6px 4px; border-radius: 12px; border: 2px solid transparent; transition: background 0.2s, border-color 0.2s;
}
.path-col.current { border-color: var(--teal); background: rgba(87,198,196,0.08); }
.path-note {
  width: 40px; height: 34px; border-radius: 8px;
  background: var(--bg); color: var(--text-soft); border: 1.5px solid transparent;
  font-family: 'Archivo Black', sans-serif; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s, box-shadow 0.12s;
}
.path-note.on { border: 1.5px solid var(--blue); color: var(--blue); }
.path-note.home { color: var(--teal); }
.path-note.on.home { border-color: var(--teal); color: var(--teal); }
.path-note.lit { background: var(--green); color: #23302A; border-color: var(--green); box-shadow: 0 0 14px rgba(106,191,94,0.5); }
.path-label {
  font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text);
  border-top: 2px solid var(--line); padding-top: 6px; margin-top: 2px; min-width: 40px; text-align: center;
}
.path-col.current .path-label { color: var(--teal); }
.hint .numlabel { color: var(--blue); font-style: normal; font-weight: 600; font-family: 'Archivo', sans-serif; }
.prog-actions { display: flex; gap: 10px; align-items: center; }
.primary.grow { flex: 1; }

/* results stats */
.stat-row { display: flex; gap: 10px; width: 100%; }
.stat {
  flex: 1; text-align: center; font-size: 0.85rem; color: var(--text-soft);
  background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 10px;
}
.stat b { display: block; font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: var(--text); font-weight: 400; }

/* results */
.results { display: flex; flex-direction: column; gap: 16px; align-items: center; padding-top: 8px; }
.score-big {
  font-family: 'Archivo Black', sans-serif; font-size: 4rem; line-height: 1;
  color: var(--wrong);
}
.score-big.pass { color: var(--green); }
.bars { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.bar-label {
  font-family: 'Archivo Black', sans-serif; min-width: 2.2em; text-align: right;
  color: var(--blue);
}
.bar-track { flex: 1; height: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--green); border-radius: 99px; }
.bar-count { min-width: 2.6em; font-size: 0.8rem; color: var(--text-soft); }
.results-actions { display: flex; gap: 10px; }

.foot { text-align: center; font-size: 0.8rem; color: var(--text-soft); line-height: 1.5; padding: 0 12px; margin-top: auto; }

/* guide */
.card.start { border-color: var(--teal); }
.card.start .card-title { color: var(--teal); }
.guide-page { display: flex; flex-direction: column; gap: 14px; }
.guide-page h3 {
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.25rem;
  margin: 0; color: var(--green);
}
.guide-page p { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--text); }
.guide-page p em { color: var(--blue); font-style: normal; font-weight: 600; }
.guide-page .guide-lead { color: var(--blue); font-weight: 700; margin-top: 6px; }
.guide-numbers {
  font-family: 'Archivo Black', sans-serif; font-size: 1.25rem; text-align: center;
  color: var(--teal); letter-spacing: 0.06em;
}
.guide-page .primary { align-self: flex-start; }
.stacks { display: flex; gap: 26px; justify-content: center; padding: 6px 0; }
.stack { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.stack-note {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text-soft);
  border-radius: 50%;
}
.stack-note.on { border: 2px solid var(--blue); color: var(--blue); }
.stack-label {
  font-family: 'Archivo Black', sans-serif; font-size: 1.05rem; color: var(--text);
  border-top: 2px solid var(--line); padding-top: 6px; margin-top: 2px; min-width: 34px; text-align: center;
}
.chord-layout { display: flex; gap: 16px; align-items: flex-start; }
.chord-right { flex: 1; display: flex; flex-direction: column; }
.session-stack .stack-note { width: 32px; height: 32px; font-size: 0.98rem; }
.session-stack { gap: 3px; }
.session-stack .stack-note.picked { border: 2px solid var(--blue); color: var(--blue); }
.session-stack .stack-note.on-wrong { border: 2px solid var(--wrong); color: var(--wrong); }
.session-stack .stack-note.on-correct { border: 2px solid var(--green); color: var(--green); background: rgba(106,191,94,0.12); }
.session-stack .stack-label { color: var(--teal); }
.pager { display: flex; align-items: center; gap: 12px; }
.dots { flex: 1; display: flex; gap: 7px; justify-content: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dot.on { background: var(--green); }
`;
