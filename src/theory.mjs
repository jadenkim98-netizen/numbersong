// Numbersong — pure music-theory model + level/session data.
// No React, no Tone, no window: every export here is a pure function or static
// data table. It's bundled into the app by build.sh (--bundle) AND unit-tested
// directly under node:test (test/theory.test.mjs). Keep it dependency-free.

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const DEGREE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14 }; // 9 = degree 2 an octave up (audio only)
export const SOLFEGE = { 1: "do", 2: "re", 3: "mi", 4: "fa", 5: "sol", 6: "la", 7: "ti", 8: "do" };
export const NUMBER_WORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "one" };
export const degreeLabel = (d) => (d === 8 ? "1" : String(d)); // octave is 1 again, never "8"

// Chromatic note model: every answerable melody note is a pitch-class 0–11 above
// the MAJOR tonic. Labels never change; minor just moves "home" to 6 (la-based).
export const NOTE_LABELS  = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
export const NOTE_SOLFEGE = ["do", "ra", "re", "me", "mi", "fa", "fi", "sol", "le", "la", "te", "ti"];
export const ALTERED_PCS  = [1, 3, 6, 8, 10];
export const NAT_PCS      = [0, 2, 4, 5, 7, 9, 11];              // degrees 1–7
export const ALL12        = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const PC_TO_DEGREE = { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 };
export const DEGREE_TO_PC = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
export const mod12 = (n) => ((n % 12) + 12) % 12;
export const tonicPcOf = (mode) => (mode === "minor" ? 9 : 0);  // la-based minor → home is 6

// Cadences that anchor the ear in the key, as semitone chords above key+"4".
export const CADENCES = {
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
export const CHORDS = [
  { roman: "I",    name: "tonic",        tones: [1, 3, 5] },
  { roman: "ii",   name: "supertonic",   tones: [2, 4, 6] },
  { roman: "iii",  name: "mediant",      tones: [3, 5, 7] },
  { roman: "IV",   name: "subdominant",  tones: [4, 6, 1] },
  { roman: "V",    name: "dominant",     tones: [5, 7, 2] },
  { roman: "vi",   name: "submediant",   tones: [6, 1, 3] },
  { roman: "vii°", name: "leading",      tones: [7, 2, 4] },
];

// A word for each degree when you name it right
export const DEGREE_QUIPS = {
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
export const RES_MAJOR = { 1: [0], 2: [2, 0], 3: [4, 2, 0], 4: [5, 4, 2, 0], 5: [7, 9, 11, 12], 6: [9, 11, 12], 7: [11, 12] };
export const RES_MINOR = { 1: [0, -1, -3], 2: [2, 0, -1, -3], 3: [4, 2, 0, -1, -3], 4: [5, 7, 9], 5: [7, 9], 6: [9], 7: [11, 9] };

export function resolutionSemis(pc, mode) {
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
export const ALT_QUIPS = {
  1: "♭2 — right above home.",
  3: "♭3 — the blue third.",
  6: "♯4 — the tritone's edge.",
  8: "♭6 — a soft shadow.",
  10: "♭7 — bluesy, leans down.",
};

// Minor-key quips — home is now 6 (la-based minor), so the mood is darker and the
// pull is toward 6, not 1.  (DRAFT copy — refine the teaching voice to taste.)
export const DEGREE_QUIPS_MINOR = {
  6: "Home — la, where minor rests.",
  7: "One step above home.",
  1: "Bright — but not home down here.",
  2: "A bit suspended — the '4 of 6'.",
  3: "3 — it pulls you home.",
  4: "Half-step above 3 — a bit of ache.",
  5: "5 — a bit mellow.",
};
export const ALT_QUIPS_MINOR = {
  1: "♭2 — a dark half-step.",
  3: "♭3 — the minor's blue note.",
  6: "♯4 — the tritone's edge.",
  8: "♭6 — also ♯5, points home.",
  10: "♭7 — close to home, maybe too close.",
};

export const CHORD_INSIGHTS = {
  I:    "Home itself — 1, 3 and 5 all at rest.",
  ii:   "All three tones lean toward home: 2→1, 4→3, 6→5.",
  iii:  "Shares 3 and 5 with home, but 7 keeps it restless.",
  IV:   "Same as the 1 chord, but includes notes 4 and 6 — plus the home note 1, hiding in plain sight.",
  V:    "7 and 2 both pull hard toward 1. Maximum tension.",
  vi:   "Contains the tonic (1) and mediant (3) — home's shadow.",
  "vii°": "No rest anywhere: 7, 2 and 4 all demand resolution.",
};

/* ─────────────────────────────  LEVELS & SESSIONS  ───────────────────────────── */

export const SESSION_LEN = 20;
export const FINAL_LEN = 30; // the last (mastery) level of each region runs longer
export const PASS_RATE = 0.8;

// Each of the four worlds (diatonic/chromatic × major/minor) follows the same
// FET-style ramp: three intro levels in C, then octaves, then away from C, then
// a new key every question. Pools are pitch-classes (0–11 above the major tonic).
export function buildGroup(group, mode, chromatic, intro) {
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
    ...tail.map(([name, desc, keyMode, octaves], i) => ({ ...base, name, desc, pool: FULL, keyMode, octaves, ...(i === tail.length - 1 ? { qCount: FINAL_LEN } : {}) })),
  ];
}

export const MELODY_LEVELS = [
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
export const MELODY_GROUPS = MELODY_LEVELS.reduce((groups, lvl, idx) => {
  let g = groups.find((x) => x.name === lvl.group);
  if (!g) { g = { name: lvl.group, start: idx, levels: [] }; groups.push(g); }
  g.levels.push({ ...lvl, idx });
  return groups;
}, []);
export const groupIndexOf = (li) => MELODY_GROUPS.findIndex((g) => li >= g.start && li < g.start + g.levels.length);

// Clean FET-style pill tags for a melody level's card (the level name already
// says which notes, so we show key context + octave scope instead of a string).
export function levelTags(lvl) {
  const key = lvl.keyMode === "c"
    ? (lvl.mode === "minor" ? "A minor" : "C major")
    : lvl.keyMode === "not-c" ? "New key" : "Every key";
  return [key, lvl.octaves.length > 1 ? "Many octaves" : "1 octave"];
}

export function randKey(exclude) {
  let k;
  do { k = KEYS[Math.floor(Math.random() * KEYS.length)]; } while (exclude.includes(k));
  return k;
}

// A chord's degrees; with sevenths on, add the 7th (two scale steps above the 5th).
export const chordTones = (chord, sevenths) =>
  sevenths ? [...chord.tones, ((chord.tones[0] - 1 + 6) % 7) + 1] : chord.tones;

// Quality names + proper symbols per diatonic chord (major key).
export const CHORD_QUALITY = {
  I:      { tri: "major",      sev: "major 7th" },
  ii:     { tri: "minor",      sev: "minor 7th" },
  iii:    { tri: "minor",      sev: "minor 7th" },
  IV:     { tri: "major",      sev: "major 7th" },
  V:      { tri: "major",      sev: "dominant 7th" },
  vi:     { tri: "minor",      sev: "minor 7th" },
  "vii°": { tri: "diminished", sev: "half-diminished 7th" },
};
export const SEVENTH_SYMBOL = { I: "Imaj7", ii: "ii7", iii: "iii7", IV: "IVmaj7", V: "V7", vi: "vi7", "vii°": "viiø7" };
export const chordSymbol = (roman, sevenths) => (sevenths ? SEVENTH_SYMBOL[roman] : roman);
export const chordQuality = (roman, sevenths) => CHORD_QUALITY[roman][sevenths ? "sev" : "tri"];

// Number notation (the method): major = plain number, minor = number-, dim = 7dim.
export const CHORD_NUMBER   = { I: "1", ii: "2-", iii: "3-", IV: "4", V: "5D", vi: "6-", "vii°": "7dim" };
export const CHORD_NUMBER_7 = { I: "1maj7", ii: "2-7", iii: "3-7", IV: "4maj7", V: "5D7", vi: "6-7", "vii°": "7-7b5" };
export const chordNumber = (roman, sevenths) => (sevenths ? CHORD_NUMBER_7 : CHORD_NUMBER)[roman];

export const ALL_CHORDS = CHORDS.map((c) => c.roman);
export const chordByRoman = (r) => CHORDS.find((c) => c.roman === r);
export const FOUR = ["I", "IV", "V", "vi"];          // the 1-4-5-6 core (major)
export const FOUR_MINOR = ["vi", "ii", "iii", "IV"]; // the 6-2-3-4 core (la-based minor: i·iv·v·VI)

// Each chapter is a mastery ramp: isolate the hard sounds as pairs, fold into the
// group, then force transposition. Capstone (every key) is tougher on purpose.
// The Minor chapter plays a minor cadence (home on 6) — same idea, minor world.
export function chordRamp(chapter, mode, intro, four) {
  const cap = { chapter, mode };
  return [
    ...intro.map(([name, desc, pool]) => ({ ...cap, name, desc, pool, keyMode: "fixed" })),
    { ...cap, name: "The big four", desc: mode === "minor" ? "6- · 2- · 3- · 4" : "1 · 4 · 5D · 6-", pool: four, keyMode: "fixed" },
    { ...cap, name: "New key", desc: "the big four · a new key", pool: four, keyMode: "not-c" },
    { ...cap, name: "Every key", desc: "the big four · new key each Q", pool: four, keyMode: "random" },
    { ...cap, name: "Advanced · all seven", desc: "every diatonic triad · mastery", pool: ALL_CHORDS, keyMode: "fixed", qCount: FINAL_LEN },
  ];
}
export const CHORD_LEVELS = [
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
export const CHORD_CHAPTERS = CHORD_LEVELS.reduce((chs, lvl, idx) => {
  let c = chs.find((x) => x.name === lvl.chapter);
  if (!c) { c = { name: lvl.chapter, start: idx, levels: [] }; chs.push(c); }
  c.levels.push({ ...lvl, idx });
  return chs;
}, []);
export const chordChapterIndexOf = (li) => CHORD_CHAPTERS.findIndex((c) => li >= c.start && li < c.start + c.levels.length);

/* ── chord progressions ── */
// Curated common progressions from the 1-4-5-6 core, by length. Later levels
// generate random sequences from a pool; an advanced tier opens up all seven.
export const CURATED_4 = {
  2: [["I", "V"], ["I", "IV"], ["I", "vi"], ["vi", "IV"], ["V", "vi"], ["IV", "V"]],
  3: [["I", "IV", "V"], ["I", "V", "vi"], ["I", "vi", "IV"], ["vi", "IV", "V"], ["IV", "V", "I"], ["I", "vi", "V"]],
  4: [["I", "V", "vi", "IV"], ["vi", "IV", "I", "V"], ["I", "vi", "IV", "V"], ["IV", "V", "I", "vi"], ["I", "IV", "V", "vi"], ["vi", "V", "IV", "I"]],
};
// Minor curated progressions from 6-2-3-4 (i·iv·v·VI, la-based, home = vi).
export const CURATED_4_MINOR = {
  2: [["vi", "ii"], ["vi", "iii"], ["vi", "IV"], ["IV", "iii"], ["ii", "iii"], ["IV", "ii"]],
  3: [["vi", "ii", "iii"], ["vi", "IV", "ii"], ["vi", "ii", "IV"], ["vi", "IV", "iii"], ["ii", "iii", "vi"], ["vi", "iii", "ii"]],
  4: [["vi", "ii", "iii", "vi"], ["vi", "IV", "ii", "iii"], ["vi", "ii", "IV", "iii"], ["IV", "ii", "vi", "iii"], ["vi", "iii", "IV", "ii"], ["vi", "IV", "iii", "ii"]],
};
export function randomProgression(len, pool, home) {
  const seq = [home];
  while (seq.length < len) {
    let c;
    do { c = pool[Math.floor(Math.random() * pool.length)]; } while (c === seq[seq.length - 1]);
    seq.push(c);
  }
  return seq;
}
export function pickProgression(lvl, avoid) {
  if (lvl.gen === "curated") {
    const set = (lvl.mode === "minor" ? CURATED_4_MINOR : CURATED_4)[lvl.len];
    let p;
    do { p = set[Math.floor(Math.random() * set.length)]; } while (set.length > 1 && avoid && p.join() === avoid.join());
    return p;
  }
  return randomProgression(lvl.len, lvl.pool, lvl.home);
}
export function progRamp(chapter, mode, pool, home) {
  const cap = { chapter, mode, home };
  return [
    { ...cap, name: "Two-chord moves",      desc: "pairs",           len: 2, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Three-chord",          desc: "threes",          len: 3, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics",  desc: "the common ones", len: 4, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Any order",            desc: "random · 4",      len: 4, gen: "random",  pool, keyMode: "fixed" },
    { ...cap, name: "Every key",            desc: "random · new key each Q", len: 4, gen: "random", pool, keyMode: "random" },
    { ...cap, name: "Advanced · all seven", desc: "every triad · random 4 · mastery", len: 4, gen: "random", pool: ALL_CHORDS, keyMode: "fixed", qCount: FINAL_LEN },
  ];
}
export const PROG_LEVELS = [
  ...progRamp("Major · 1 4 5 6", "major", FOUR, "I"),
  ...progRamp("Minor · 6 2 3 4", "minor", FOUR_MINOR, "vi"),
];
export const PROG_CHAPTERS = PROG_LEVELS.reduce((chs, lvl, idx) => {
  let c = chs.find((x) => x.name === lvl.chapter);
  if (!c) { c = { name: lvl.chapter, start: idx, levels: [] }; chs.push(c); }
  c.levels.push({ ...lvl, idx });
  return chs;
}, []);
export const progChapterIndexOf = (li) => PROG_CHAPTERS.findIndex((c) => li >= c.start && li < c.start + c.levels.length);

// Adventure region order = the teaching spine (map nodes 1→8):
// diatonic notes → chord tones → progressions → chromatic notes (the hard stuff last).
// gi = index within that mode's group/chapter array.
export const ADV_STAGES = [
  { mode: "melody",       gi: 0 }, // 1  diatonic major — single notes
  { mode: "melody",       gi: 1 }, // 2  diatonic minor — single notes
  { mode: "chords",       gi: 0 }, // 3  chord tones, major (1 4 5 6)
  { mode: "chords",       gi: 1 }, // 4  chord tones, minor (6 2 3 4)
  { mode: "progressions", gi: 0 }, // 5  progressions, major
  { mode: "progressions", gi: 1 }, // 6  progressions, minor
  { mode: "melody",       gi: 2 }, // 7  chromatic major — single notes
  { mode: "melody",       gi: 3 }, // 8  chromatic minor — single notes
];
export const advGroupOf = (s) => s.mode === "melody" ? MELODY_GROUPS[s.gi] : s.mode === "chords" ? CHORD_CHAPTERS[s.gi] : PROG_CHAPTERS[s.gi];

// One-line "what you'll learn" preview shown at the top of a stage's level list.
export function stageGoal(mode, name) {
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
export const PATH_PRESETS = [
  ["I", "V", "vi", "IV"],   // 1 5 6 4
  ["vi", "IV", "I", "V"],   // 6 4 1 5
  ["I", "vi", "IV", "V"],   // 1 6 4 5
  ["ii", "V", "I", "I"],    // 2 5 1 1
  ["IV", "ii", "iii", "vi"],// 4 2 3 6
];
// Grid rows top→bottom: degree 7 down to 1, with home (1) on the bottom.
export const PATH_ROWS = [
  { d: 7, oct: 4 }, { d: 6, oct: 4 }, { d: 5, oct: 4 }, { d: 4, oct: 4 },
  { d: 3, oct: 4 }, { d: 2, oct: 4 }, { d: 1, oct: 4 },
];
export const PATH_SPEEDS = [
  { label: "Slow", beat: 2.2 }, { label: "Medium", beat: 1.6 },
  { label: "Fast", beat: 1.1 }, { label: "Faster", beat: 0.8 },
];
// keyboard: the whole number row is a continuous diatonic scale —
// `=7 below home, 1–7 the home octave, 8 9 0 - = the octave above (1–5).
export const KEY_MAP = {
  "`": { d: 7, oct: 3 },
  "1": { d: 1, oct: 4 }, "2": { d: 2, oct: 4 }, "3": { d: 3, oct: 4 }, "4": { d: 4, oct: 4 },
  "5": { d: 5, oct: 4 }, "6": { d: 6, oct: 4 }, "7": { d: 7, oct: 4 },
  "8": { d: 1, oct: 5 }, "9": { d: 2, oct: 5 }, "0": { d: 3, oct: 5 },
  "-": { d: 4, oct: 5 }, "=": { d: 5, oct: 5 },
};

// Per-level rigor: most levels are 10 questions at 80%; capstones override these.
export const levelsFor = (m) => (m === "melody" ? MELODY_LEVELS : m === "chords" ? CHORD_LEVELS : PROG_LEVELS);
