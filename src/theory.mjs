// Numbersong — pure music-theory model + level/session data.
// No React, no Tone, no window: every export here is a pure function or static
// data table. It's bundled into the app by build.sh (--bundle) AND unit-tested
// directly under node:test (test/theory.test.mjs). Keep it dependency-free.

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// 9 = degree 2 an octave up (audio only). The "♯5" key is how an altered chord tone
// rides the same lookup: a chord's `tones` may hold a string for a note outside the
// key, and every playback path already does DEGREE_SEMITONES[tone], so nothing else
// has to know about it.
// "♯5" and "♭6" are the same pitch, spelled for the chord they belong to: 3D raises its
// 5th, the borrowed 4- lowers the key's 6. Same note, opposite stories.
// "♭7" is 1D's seventh — the one note that turns home into a door out to 4. "♯4" is
// 2D's third (5's leading tone) and "♯1" is 6D's (2's leading tone).
export const DEGREE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14, "♯5": 8, "♭6": 8, "♭7": 10, "♯4": 6, "♯1": 1, "♭3": 3 };
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

// Chords from OUTSIDE the key, kept in their own table so ALL_CHORDS (and the ear
// log's fixed roster of seven) stay diatonic. `fixed` = these tones are literal,
// never derive a 7th from them: the diatonic formula would spell it wrong.
//
// 3D is the 3 chord turned dominant — the five-chord of 6. Its ♯5 is 6's leading
// tone, which is exactly why the ear hears it lean toward 6-.
// 4- is the major 4 with its 6 flattened — borrowed from the parallel minor. It
// shares a root with 4, so the bass can't tell them apart; the whole difference is
// that one voice dropping a half step, which is why the two belong side by side.
// 1D is home with a ♭7 added — the five-chord of 4. Same root as 1, so again the bass
// can't tell them apart: the ♭7 falls a half step onto 4's 3, and that pull is the chord.
export const ALTERED_CHORDS = [
  { roman: "III7", name: "five of six",   tones: [3, "♯5", 7, 2], fixed: true },
  { roman: "iv",   name: "minor four",    tones: [4, "♭6", 1],    fixed: true },
  { roman: "I7",   name: "five of four",  tones: [1, 3, 5, "♭7"], fixed: true },
  { roman: "II7",  name: "five of five",  tones: [2, "♯4", 6, 1], fixed: true },
  { roman: "VI7",  name: "five of two",   tones: [6, "♯1", 3, 5], fixed: true },
  // Borrowed from the parallel minor. ♭7 is ONE answer that's played either as a triad or
  // as a dominant 7 (`variants`, rolled per question): the 7th is texture — both lead home
  // the same way — so by the house rule it's stimulus, never a separate answer.
  { roman: "iiø7", name: "minor's two",   tones: [2, 4, "♭6", 1], fixed: true },
  { roman: "♭III", name: "flat three",    tones: ["♭3", 5, "♭7"], fixed: true },
  { roman: "♭VI",  name: "flat six",      tones: ["♭6", 1, "♭3"], fixed: true },
  { roman: "♭VII", name: "flat seven",    tones: ["♭7", 2, 4],    fixed: true, variants: [["♭7", 2, 4, "♭6"]] },
];
// The tones to PLAY for one question. Usually a chord's own tones; a chord with
// `variants` rolls one of its forms instead, so the reveal and Repeat (which reuse the
// session's stored voicing) match what was asked.
export function rollTones(roman, rng = Math.random) {
  const c = chordByRoman(roman);
  if (!c.variants) return c.tones;
  const forms = [c.tones, ...c.variants];
  return forms[Math.floor(rng() * forms.length)];
}

// The answer pad is ROOT, then COLOUR — the same way the notation spells a chord
// (6-, 5D, 2-7♭5, ♭7 are a root number plus a suffix). Tapping a root enters that root's
// plain chord; a colour chip then turns the chord just entered into its coloured twin.
// The pad stays at ≤10 roots + 3 chips however many chords the game teaches, and guitar
// can answer any pool the same way: tap the root on the neck, then the chip.
// pc = semitones above the MAJOR tonic, the frame the fretboard reports in.
export const ROOT_KEYS = [
  { k: "1", pc: 0 }, { k: "2", pc: 2 }, { k: "♭3", pc: 3, flat: true }, { k: "3", pc: 4 },
  { k: "4", pc: 5 }, { k: "5", pc: 7 }, { k: "♭6", pc: 8, flat: true }, { k: "6", pc: 9 },
  { k: "♭7", pc: 10, flat: true }, { k: "7", pc: 11 },
];
export const COLOURS = ["D", "-", "7♭5"];
// chord → [root key, colour]; a null colour is that root's plain chord.
export const CHORD_SPELLING = {
  I: ["1", null], ii: ["2", null], iii: ["3", null], IV: ["4", null], V: ["5", null], vi: ["6", null], "vii°": ["7", null],
  I7: ["1", "D"], II7: ["2", "D"], III7: ["3", "D"], VI7: ["6", "D"],
  iv: ["4", "-"], "iiø7": ["2", "7♭5"],
  "♭III": ["♭3", null], "♭VI": ["♭6", null], "♭VII": ["♭7", null],
};
// The chord in `pool` on this root with this colour, if there is one.
export const chordAt = (pool, root, colour) =>
  pool.find((r) => CHORD_SPELLING[r][0] === root && CHORD_SPELLING[r][1] === colour) || null;
// The pad for a pool: roots in order of first appearance (so a minor pool still opens
// on 6), each entering its plain chord — or, when only coloured chords on that root are
// in the pool, the first of those. `chips` = the colours this pool actually uses.
export function padFor(pool) {
  const roots = [];
  for (const r of pool) {
    const k = CHORD_SPELLING[r][0];
    if (roots.some((x) => x.k === k)) continue;
    const key = ROOT_KEYS.find((x) => x.k === k);
    roots.push({ ...key, def: chordAt(pool, k, null) || pool.find((c) => CHORD_SPELLING[c][0] === k) });
  }
  const chips = COLOURS.filter((c) => pool.some((r) => CHORD_SPELLING[r][1] === c));
  return { roots, chips };
}
// What a colour chip does to the chord just entered: turn it into that colour, or — if
// it already is — back to the plain chord. null when the chip means nothing here.
export function recolour(pool, roman, colour) {
  const [root, cur] = CHORD_SPELLING[roman];
  if (cur === colour) return chordAt(pool, root, null);
  return chordAt(pool, root, colour);
}

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
  III7: "The 3 chord with a raised 5 — and that ♯5 is 6's leading tone, so the whole chord leans toward 6-.",
  iv: "The 4 chord with a flattened 6, borrowed from minor. Same root as 4, one note darker — and it leans home to 1.",
  II7: "The 2 chord made major, with a ♭7 — its ♯4 is 5's leading tone, so it pushes hard toward 5D.",
  VI7: "The 6 chord made major, with a ♭7 — its ♯1 is 2's leading tone, so it leans into 2-.",
  "iiø7": "The 2 chord with its 6 dropped to ♭6, borrowed from minor — darker than 2-, and it leans even harder into 5D.",
  "♭III": "A major chord on ♭3, from outside the key. It's the minor key's home-relative, and it usually steps up to 4.",
  "♭VI": "A major chord on ♭6, borrowed from minor. Big and bright, but the ♭6 sags — it usually climbs through ♭7 home to 1.",
  "♭VII": "A major chord a whole step below home, borrowed from minor. It does 5D's job — taking you home — without the leading tone, so it lands softer.",
  I7: "Home with a ♭7 on top — and that ♭7 wants to fall to 6, the 3 of the 4 chord. Home stops being home and becomes the way into 4.",
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
  sevenths && !chord.fixed ? [...chord.tones, ((chord.tones[0] - 1 + 6) % 7) + 1] : chord.tones;

// Quality names + proper symbols per diatonic chord (major key).
export const CHORD_QUALITY = {
  I:      { tri: "major",      sev: "major 7th" },
  ii:     { tri: "minor",      sev: "minor 7th" },
  iii:    { tri: "minor",      sev: "minor 7th" },
  IV:     { tri: "major",      sev: "major 7th" },
  V:      { tri: "major",      sev: "dominant 7th" },
  vi:     { tri: "minor",      sev: "minor 7th" },
  "vii°": { tri: "diminished", sev: "half-diminished 7th" },
  III7:   { tri: "dominant 7th", sev: "dominant 7th" },
  iv:     { tri: "minor", sev: "minor 7th" },
  I7:     { tri: "dominant 7th", sev: "dominant 7th" },
  II7:    { tri: "dominant 7th", sev: "dominant 7th" },
  VI7:    { tri: "dominant 7th", sev: "dominant 7th" },
  "iiø7": { tri: "half-diminished 7th", sev: "half-diminished 7th" },
  "♭III": { tri: "major", sev: "major" },
  "♭VI":  { tri: "major", sev: "major" },
  "♭VII": { tri: "major", sev: "major" },
};
export const SEVENTH_SYMBOL = { I: "Imaj7", ii: "ii7", iii: "iii7", IV: "IVmaj7", V: "V7", vi: "vi7", "vii°": "viiø7", III7: "III7", iv: "iv", I7: "I7", II7: "II7", VI7: "VI7", "iiø7": "iiø7", "♭III": "♭III", "♭VI": "♭VI", "♭VII": "♭VII" };
export const chordSymbol = (roman, sevenths) => (sevenths ? SEVENTH_SYMBOL[roman] : roman);
export const chordQuality = (roman, sevenths) => CHORD_QUALITY[roman][sevenths ? "sev" : "tri"];

// Number notation (the method): major = plain number, minor = number-, dim = 7dim.
export const CHORD_NUMBER   = { I: "1", ii: "2-", iii: "3-", IV: "4", V: "5D", vi: "6-", "vii°": "7dim", III7: "3D", iv: "4-", I7: "1D", II7: "2D", VI7: "6D", "iiø7": "2-7♭5", "♭III": "♭3", "♭VI": "♭6", "♭VII": "♭7" };
export const CHORD_NUMBER_7 = { I: "1maj7", ii: "2-7", iii: "3-7", IV: "4maj7", V: "5D7", vi: "6-7", "vii°": "7-7b5", III7: "3D", iv: "4-", I7: "1D", II7: "2D", VI7: "6D", "iiø7": "2-7♭5", "♭III": "♭3", "♭VI": "♭6", "♭VII": "♭7" };
export const chordNumber = (roman, sevenths) => (sevenths ? CHORD_NUMBER_7 : CHORD_NUMBER)[roman];

export const ALL_CHORDS = CHORDS.map((c) => c.roman);
// What "Your ear" lists under Chords: the seven, plus every altered chord that exists.
// ALL_CHORDS itself must stay diatonic (it's a level pool), so the roster is its own thing.
export const EAR_CHORD_ROSTER = [...ALL_CHORDS, ...ALTERED_CHORDS.map((c) => c.roman)];
export const chordByRoman = (r) => CHORDS.find((c) => c.roman === r) || ALTERED_CHORDS.find((c) => c.roman === r);
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
    // The capstone stays inside the four chords the chapter actually taught — a
    // long run in every key, not a surprise jump to all seven. (All seven has its
    // own chapter now.) Replaces the old "Advanced · all seven" IN PLACE, so every
    // level idx, and every saved clear, is undisturbed.
    { ...cap, name: "Mastery · the big four · " + mode, desc: "the big four · every key · a long run", pool: four, keyMode: "random", qCount: FINAL_LEN },
  ];
}
// The two big-four chapters between them teach six of the seven diatonic chords
// (1 4 5D 6- major, 6- 2- 3- 4 minor) — only 7dim is never met. Its difficulty
// isn't rarity: it shares 7 and 2 with 5D and resolves the same way (7dim is 5D7
// without its root), so dropping it straight into a seven-chord pool would mostly
// manufacture 5D-vs-7dim coin flips. Isolate it against home, then against 5D —
// the confusion that actually matters — before opening the pool.
export function allSevenChordRamp(chapter, mode) {
  const cap = { chapter, mode };
  return [
    ...[
      ["Meet the seven",   "1 · 7dim  (the last one)",         ["I", "vii°"]],
      ["The two tensions", "5D · 7dim  (they share 7 and 2)",  ["V", "vii°"]],
      ["The inside three", "2- · 3- · 7dim  (outside the big four)", ["ii", "iii", "vii°"]],
    ].map(([name, desc, pool]) => ({ ...cap, name, desc, pool, keyMode: "fixed" })),
    { ...cap, name: "All seven",  desc: "every diatonic triad",          pool: ALL_CHORDS, keyMode: "fixed" },
    { ...cap, name: "New key",    desc: "all seven · a new key",         pool: ALL_CHORDS, keyMode: "not-c" },
    { ...cap, name: "Every key",  desc: "all seven · new key each Q",    pool: ALL_CHORDS, keyMode: "random", qCount: FINAL_LEN },
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
  ...allSevenChordRamp("All seven", "major"),
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
// All-seven progressions. Random draws from a seven-chord pool produce sequences
// nobody would write (7dim → 3- → 7dim), so these are curated around what the two
// unfamiliar functions actually DO: 7dim resolving to 1, and 3- / 2- as the inner
// steps of a descending or rising diatonic run.
export const CURATED_7 = {
  // Pairs and threes are where the unfamiliar chords get met: 7dim against the
  // chord it hides behind (5D), the 2-5 and 2-5-1 that 2- exists for, and 3-'s
  // pull to 6-. Wherever 7dim isn't last it resolves to 1 — that's its whole job.
  2: [["vii°", "I"], ["V", "vii°"], ["I", "vii°"], ["ii", "V"], ["I", "iii"], ["iii", "vi"], ["ii", "vi"]],
  3: [["ii", "V", "I"], ["I", "vii°", "I"], ["V", "vii°", "I"], ["vi", "ii", "V"], ["iii", "vi", "ii"], ["I", "iii", "IV"], ["IV", "vii°", "I"]],
  // The fours are the actual songs: the axis and doo-wop families (and their
  // rotations — the same loop started somewhere else is a different sound to
  // name), the 1-6-2-5 turnaround family, the Royal Road, and Pachelbel's first
  // four. 7dim is rare in real pop, so it appears here only where it earns its
  // place — resolving to 1.
  4: [
    ["I", "V", "vi", "IV"],    // 1 5 6 4 — the axis
    ["vi", "IV", "I", "V"],    // 6 4 1 5 — axis, started on 6
    ["IV", "I", "V", "vi"],    // 4 1 5 6 — axis, started on 4
    ["I", "vi", "IV", "V"],    // 1 6 4 5 — doo-wop
    ["IV", "V", "I", "vi"],    // 4 5 1 6 — doo-wop, started on 4
    ["I", "vi", "ii", "V"],    // 1 6 2 5 — the turnaround
    ["vi", "ii", "V", "I"],    // 6 2 5 1 — around the circle
    ["iii", "vi", "ii", "V"],  // 3 6 2 5 — the long turnaround
    ["IV", "V", "iii", "vi"],  // 4 5 3 6 — the Royal Road
    ["I", "V", "vi", "iii"],   // 1 5 6 3 — Pachelbel's first four
    ["I", "IV", "ii", "V"],    // 1 4 2 5
    ["ii", "V", "I", "IV"],    // 2 5 1 4 — the same loop entered on the 2
    ["I", "IV", "vii°", "I"],  // 1 4 7dim 1 — 7dim standing in for 5D
  ],
};

// Songs that actually use a curated progression, keyed by its roman sequence. A
// progression is easier to hold onto when it has a record attached to it. Listed only
// where the song really runs that loop — an approximate match would teach the wrong ear.
export const PROG_SONGS = {
  "I-vi-IV-V":      "Stand By Me — Ben E. King",
  "ii-V-I-IV":      "Kiss Me More — Doja Cat",
  "I-III7-vi-IV":   "I'm Not the Only One — Sam Smith",
  "I-III7-IV-iv":   "Creep — Radiohead",
};
export const songFor = (seq) => PROG_SONGS[seq.join("-")] || null;

// Roughly how often each chord shows up in real music. Only the all-seven random
// levels use this: a uniform draw puts 7dim in ~1 of every 7 slots, which is both
// far more than anything anyone writes AND too easy — it's the key's only
// diminished triad, so it's unmistakable once known, and that much of it would
// quietly inflate scores. Chord-tone ID stays uniform on purpose: there you want
// even reps of all seven.
export const PROG_WEIGHTS = { I: 5, ii: 3, iii: 2, IV: 4, V: 4, vi: 4, "vii°": 1 };

// `follow` biases a chord by what came BEFORE it — some chords are defined by a move,
// not by a frequency. 4- is the case in point: it earns its place by arriving right
// after the major 4, so a flat per-chord weight would almost never produce the lesson.
// `?? 1`, not `|| 1`: a multiplier of 0 is a real instruction — it bans the move
// outright (4- back to 4), and `||` would silently read that as "no preference".
const weightAt = (c, weights, prev, follow) =>
  (weights ? (weights[c] ?? 1) : 1) * ((follow && prev && follow[prev] && follow[prev][c]) ?? 1);

const weightedPick = (pool, weights, prev, follow, banned) => {
  const usable = banned && banned.size ? pool.filter((c) => !banned.has(c)) : pool;
  const from = usable.length ? usable : pool; // never paint the draw into a corner
  if (!weights && !follow) return from[Math.floor(Math.random() * from.length)];
  const w = from.map((c) => weightAt(c, weights, prev, follow));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return from[Math.floor(Math.random() * from.length)];
  let r = Math.random() * total;
  for (let i = 0; i < from.length; i++) { r -= w[i]; if (r < 0) return from[i]; }
  return from[from.length - 1];
};

// home = the chord every sequence starts on; pass null to let it start anywhere,
// which is what opens up the rotations.
/* ── voicing ── */
// Root-position block triads make a progression lurch: the whole chord jumps register
// with its root, which no player does. This voices the UPPER structure the way a right
// hand does — pick the inversion nearest the previous chord, so the top voices step by
// a semitone or two instead of leaping.
//
// The bass is deliberately NOT this function's business. It stays on the root, so the
// harmony is always root position and no slash chords (a 5 chord over 7) appear.
//
// chords: arrays of semitone offsets above the key's tonic. Returns the same shape,
// re-octaved. Pure, so the ear-level decisions are testable without audio.
//
// `start` picks which inversion the FIRST chord takes; everything after follows it by
// voice leading, so that one choice re-shapes the whole realization. That's the point:
// a fixed voicing means a progression always sounds literally identical, and an ear can
// memorise the surface instead of hearing the function. Randomise it per question.
// `slack` stops the search being strictly greedy: any inversion within `slack` semitones
// of the best is fair game, chosen at random. Without it the optimum is a funnel — two
// different openings converge onto the same path by the second chord — so a progression
// only ever has one real sound. `rng` is injectable so tests stay deterministic.
export function voiceLead(chords, { center = 7, start = null, slack = 0, rng = Math.random } = {}) {
  let prev = null;
  return chords.map((semis, ci) => {
    const pcs = [...new Set(semis.map(mod12))].sort((a, b) => a - b);
    // The candidates are this chord's inversions — each rotation stacked upward from a
    // lowest note inside the octave above the tonic.
    const cands = pcs.map((_, r) => {
      const v = [];
      let last = -1;
      for (let i = 0; i < pcs.length; i++) {
        let n = pcs[(r + i) % pcs.length];
        while (n <= last) n += 12;
        v.push(n);
        last = n;
      }
      return v;
    });
    const cost = (v) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      if (!prev) return Math.abs(mean - center);
      let motion = 0;
      for (let i = 0; i < Math.min(v.length, prev.length); i++) motion += Math.abs(v[i] - prev[i]);
      return motion + Math.abs(mean - center) * 0.25; // drift back toward the middle over time
    };
    let best;
    if (ci === 0 && start != null) {
      best = cands[((start % cands.length) + cands.length) % cands.length];
    } else {
      const costs = cands.map(cost);
      const low = Math.min(...costs);
      const ok = cands.filter((_, i) => costs[i] <= low + slack);
      best = ok[Math.floor(rng() * ok.length)] || cands[costs.indexOf(low)];
    }
    prev = best;
    return best;
  });
}

// One realization's worth of choices, rolled per question: which inversion opens it,
// roughly which register it sits in, and how far it may stray from the smoothest path.
// slack 5 is measured, not guessed: it roughly doubles the number of distinct shapes
// while average motion only moves 11.0 → 11.9 (block voicing is 37), and no single
// voice ever leaps more than a major third.
export const randomVoicing = () => ({
  start: Math.floor(Math.random() * 3),
  center: 5 + Math.floor(Math.random() * 5),
  slack: 5,
});

// `forbid` rules a chord out for the REST of the progression once another has appeared —
// a whole-sequence rule, where `follow` only ever sees the previous chord. Needed because
// once the four has gone minor, a plain 4 later in the same loop undoes it, and that stays
// true whether the two are adjacent or three chords apart.
export function randomProgression(len, pool, home, weights, follow, forbid) {
  const banned = new Set();
  const ban = (c) => { if (forbid && forbid[c]) forbid[c].forEach((b) => banned.add(b)); };
  const seq = [home || weightedPick(pool, weights, null, follow, banned)];
  ban(seq[0]);
  while (seq.length < len) {
    const prev = seq[seq.length - 1];
    let c, guard = 0;
    do { c = weightedPick(pool, weights, prev, follow, banned); } while (c === prev && ++guard < 40);
    seq.push(c);
    ban(c);
  }
  return seq;
}
export function pickProgression(lvl, avoid) {
  if (lvl.gen === "curated") {
    const set = (lvl.curated || (lvl.mode === "minor" ? CURATED_4_MINOR : CURATED_4))[lvl.len];
    let p;
    do { p = set[Math.floor(Math.random() * set.length)]; } while (set.length > 1 && avoid && p.join() === avoid.join());
    return p;
  }
  return randomProgression(lvl.len, lvl.pool, lvl.anyStart ? null : lvl.home, lvl.weights, lvl.follow, lvl.forbid);
}
export function progRamp(chapter, mode, pool, home) {
  const cap = { chapter, mode, home };
  return [
    { ...cap, name: "Two-chord moves",      desc: "pairs",           len: 2, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Three-chord",          desc: "threes",          len: 3, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics",  desc: "the common ones", len: 4, gen: "curated", pool, keyMode: "fixed" },
    { ...cap, name: "Any order",            desc: "random · 4",      len: 4, gen: "random",  pool, keyMode: "fixed" },
    { ...cap, name: "Every key",            desc: "random · new key each Q", len: 4, gen: "random", pool, keyMode: "random" },
    // Same idea, and the widest possible net inside those four chords: anyStart
    // drops the always-begin-on-home rule, so the loop can be entered anywhere
    // (1645 or 4516 or 5164). That alone takes the reachable four-chord sequences
    // from 27 to 108 — the rotations are the point, not an accident.
    { ...cap, name: "Mastery · the big four · " + mode, desc: "every combination · any starting chord · every key", len: 4, gen: "random", pool, keyMode: "random", anyStart: true, qCount: FINAL_LEN },
  ];
}
// Same journey as allSevenChordRamp, one rung up: now you name the chords in time,
// in order. Mirrors progRamp's six rungs — curated pairs → threes → the classics,
// then random, then transposed — but over all seven chords.
export function allSevenProgRamp(chapter, mode, home) {
  const cap = { chapter, mode, home, pool: ALL_CHORDS };
  return [
    { ...cap, name: "Two-chord moves",     desc: "pairs · meet 7dim",        len: 2, gen: "curated", curated: CURATED_7, keyMode: "fixed" },
    { ...cap, name: "Three-chord",         desc: "threes · 2-5-1 and 7dim",  len: 3, gen: "curated", curated: CURATED_7, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics", desc: "the progressions songs use", len: 4, gen: "curated", curated: CURATED_7, keyMode: "fixed" },
    { ...cap, name: "Any order",           desc: "random · 4",               len: 4, gen: "random", keyMode: "fixed",  weights: PROG_WEIGHTS },
    { ...cap, name: "New key",             desc: "random · 4 · a new key",   len: 4, gen: "random", keyMode: "not-c",  weights: PROG_WEIGHTS },
    { ...cap, name: "Every key",           desc: "random · new key each Q",  len: 4, gen: "random", keyMode: "random", weights: PROG_WEIGHTS, qCount: FINAL_LEN },
  ];
}

/* ── 3D: the 3 chord turned dominant ── */
// Pool = the six chords songs actually lean on, plus 3D. 7dim is left out on
// purpose: it's rare, it's already taught in All seven, and every button here
// should earn its place. 3- stays in, because it's the whole lesson — 3- and 3D
// share a root and a slot, and differ by one note (5 → ♯5).
// 3D sits immediately after 3-, not at the end: they share a root, and the pad should
// put the twin it's confused with right next to it.
export const POOL_3D = ["I", "ii", "iii", "III7", "IV", "V", "vi"];
// 3D is the subject of the chapter, so it's common here rather than rare; 3- is
// boosted too, so the contrast keeps coming back around.
export const WEIGHTS_3D = { I: 4, ii: 3, iii: 4, IV: 4, V: 4, vi: 4, III7: 5 };
// 3D → 3- doesn't happen: once the 3 chord has been raised to a dominant, falling back to
// the plain minor on the same root is a backtrack, not a move. (3- → 3D is left alone —
// darkening a diatonic chord into a dominant is a real gesture.) Same shape as the 4- → 4
// ban, and a weight of 0 is a ban because weightAt reads it with ?? and not ||.
export const FOLLOW_3D = { III7: { iii: 0 } };
// Same rule across the whole progression, for the same reason as FORBID_4M.
export const FORBID_3D = { III7: ["iii"] };

// Deliberately paired: most of these are a progression the player already knows
// with exactly one chord swapped, so the drill is "which one did I just hear",
// not "what is this strange chord". 3D usually goes to 6-, but not always —
// 3D → 4 is real and stays in.
export const CURATED_3D = {
  2: [["III7", "vi"], ["iii", "vi"], ["I", "III7"], ["I", "iii"], ["III7", "IV"], ["vi", "III7"]],
  3: [["I", "III7", "vi"], ["I", "iii", "vi"], ["III7", "vi", "ii"], ["I", "III7", "IV"], ["ii", "III7", "vi"], ["vi", "III7", "IV"]],
  4: [
    ["III7", "vi", "ii", "V"], // 3D 6 2 5
    ["iii", "vi", "ii", "V"],  // 3  6 2 5 — its diatonic twin
    ["I", "III7", "vi", "IV"], // 1 3D 6 4
    ["I", "iii", "vi", "IV"],  // 1 3  6 4 — twin
    ["IV", "V", "III7", "vi"], // 4 5 3D 6 — the Royal Road, sharpened
    ["IV", "V", "iii", "vi"],  // 4 5 3  6 — twin
    ["I", "III7", "IV", "V"],  // 1 3D 4 5 — 3D that doesn't go to 6
    ["I", "vi", "III7", "IV"],
  ],
};

export function threeDeeProgRamp(chapter, mode, home) {
  const cap = { chapter, mode, home, pool: POOL_3D };
  return [
    { ...cap, name: "Meet 3D",             desc: "pairs · 3- against 3D",      len: 2, gen: "curated", curated: CURATED_3D, keyMode: "fixed" },
    { ...cap, name: "Three-chord",         desc: "threes · where 3D leads",    len: 3, gen: "curated", curated: CURATED_3D, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics", desc: "the same songs, sharpened",  len: 4, gen: "curated", curated: CURATED_3D, keyMode: "fixed" },
    { ...cap, name: "Any order",           desc: "random · 4",                 len: 4, gen: "random", keyMode: "fixed",  weights: WEIGHTS_3D, follow: FOLLOW_3D, forbid: FORBID_3D },
    { ...cap, name: "New key",             desc: "random · 4 · a new key",     len: 4, gen: "random", keyMode: "not-c",  weights: WEIGHTS_3D, follow: FOLLOW_3D, forbid: FORBID_3D },
    { ...cap, name: "Mastery · 3D",        desc: "every combination · any starting chord · every key", len: 4, gen: "random", keyMode: "random", weights: WEIGHTS_3D, follow: FOLLOW_3D, forbid: FORBID_3D, anyStart: true, qCount: FINAL_LEN },
  ];
}

/* ── 4-: the borrowed minor four ── */
// Unlike 3-/3D, which are alternatives, the two fours are usually heard side by side:
// 4 then 4-, with one voice dropping 6 → ♭6. That move is the lesson, so it's weighted
// by TRANSITION rather than frequency. 4- → 4 is rare enough to leave out entirely.
export const POOL_4M = ["I", "ii", "iii", "IV", "iv", "V", "vi"];
export const WEIGHTS_4M = { I: 4, ii: 3, iii: 3, IV: 5, iv: 4, V: 4, vi: 4 };
// 4 → 4- is the lesson, so it's heavily favoured. 4- → 4 is rare in real music
// (it brightens back up, which songs seldom do), so it's banned outright with a 0.
export const FOLLOW_4M = { IV: { iv: 8 }, iv: { IV: 0 } };
// ...and not three chords later either: once the four has gone minor, a plain 4 anywhere
// later in the same loop brightens it back, which songs essentially don't do.
export const FORBID_4M = { iv: ["IV"] };

// 4- goes home to 1 most of the time, to 6 or 3 when the progression wants to keep
// moving, and 2 → 4- is a real approach. Diatonic progressions are mixed in so the
// major 4 can't simply be assumed to darken.
export const CURATED_4M = {
  2: [["IV", "iv"], ["iv", "I"], ["iv", "vi"], ["iv", "iii"], ["ii", "iv"], ["iv", "V"], ["I", "iv"], ["I", "IV"]],
  3: [["IV", "iv", "I"], ["IV", "iv", "vi"], ["IV", "iv", "iii"], ["I", "IV", "iv"], ["ii", "iv", "I"], ["iv", "V", "I"], ["I", "iv", "I"], ["I", "IV", "I"]],
  4: [
    ["I", "IV", "iv", "I"],    // 1 4 4- 1 — the one everybody knows
    ["I", "IV", "iv", "vi"],   // ...keeping it going into 6
    ["I", "IV", "iv", "iii"],  // ...or into 3
    ["I", "vi", "IV", "iv"],
    ["IV", "iv", "I", "V"],
    ["ii", "iv", "I", "V"],
    ["I", "V", "IV", "iv"],
    ["I", "iv", "V", "I"],
    ["I", "V", "vi", "IV"],    // all-diatonic: the 4 stays major
    ["I", "vi", "ii", "V"],    // all-diatonic
  ],
};

export function minorFourProgRamp(chapter, mode, home) {
  const cap = { chapter, mode, home, pool: POOL_4M };
  return [
    { ...cap, name: "Meet 4-",             desc: "pairs · 4 against 4-",      len: 2, gen: "curated", curated: CURATED_4M, keyMode: "fixed" },
    { ...cap, name: "Three-chord",         desc: "threes · where 4- goes",    len: 3, gen: "curated", curated: CURATED_4M, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics", desc: "the same songs, darkened",  len: 4, gen: "curated", curated: CURATED_4M, keyMode: "fixed" },
    { ...cap, name: "Any order",           desc: "random · 4",                len: 4, gen: "random", keyMode: "fixed",  weights: WEIGHTS_4M, follow: FOLLOW_4M, forbid: FORBID_4M },
    { ...cap, name: "New key",             desc: "random · 4 · a new key",    len: 4, gen: "random", keyMode: "not-c",  weights: WEIGHTS_4M, follow: FOLLOW_4M, forbid: FORBID_4M },
    { ...cap, name: "Mastery · 4-",        desc: "every combination · any starting chord · every key", len: 4, gen: "random", keyMode: "random", weights: WEIGHTS_4M, follow: FOLLOW_4M, forbid: FORBID_4M, anyStart: true, qCount: FINAL_LEN },
  ];
}

/* ── colour chords: 3D and 4- together ── */
// Both altered chords live, each next to the twin it's confused with. Telling 3D from
// 4- is easy (different roots) — the difficulty, and the point, is holding BOTH fine
// discriminations at once: 3- or 3D, and 4 or 4-. That's what hearing a real song asks.
// As more borrowed chords arrive they join this pool; the teaching chapters stay separate.
export const POOL_COLOUR = ["I", "ii", "iii", "III7", "IV", "iv", "V", "vi"];
export const WEIGHTS_COLOUR = { I: 4, ii: 3, iii: 3, III7: 4, IV: 5, iv: 4, V: 4, vi: 4 };
// Same moves as the teaching chapters: 4 darkens to 4- and never brightens back, and 3D
// leans to 6- without being forced there.
export const FOLLOW_COLOUR = { IV: { iv: 6 }, iv: { IV: 0 }, III7: { vi: 3, iii: 0 } };
export const FORBID_COLOUR = { iv: ["IV"], III7: ["iii"] };

// 1 3D 4 4- is the one everybody knows, and it ships beside 1 3- 4 4- — the same shape
// with the plain 3, so the colour has to be heard rather than assumed. Fully diatonic
// progressions are in the mix for the same reason.
export const CURATED_COLOUR = {
  2: [["iii", "III7"], ["IV", "iv"], ["III7", "vi"], ["iv", "I"], ["I", "III7"], ["I", "iv"], ["I", "iii"], ["I", "IV"]],
  3: [["I", "III7", "vi"], ["I", "IV", "iv"], ["IV", "iv", "I"], ["iii", "III7", "vi"], ["I", "iii", "IV"], ["ii", "iv", "I"], ["III7", "vi", "IV"], ["I", "III7", "IV"]],
  4: [
    ["I", "III7", "IV", "iv"],  // 1 3D 4 4- — both colours, back to back
    ["I", "iii", "IV", "iv"],   // the same shape with a plain 3
    ["I", "III7", "IV", "V"],
    ["I", "IV", "iv", "I"],
    ["I", "III7", "vi", "IV"],
    ["III7", "vi", "ii", "V"],
    ["I", "vi", "IV", "iv"],
    ["IV", "iv", "I", "V"],
    ["I", "V", "vi", "IV"],     // fully diatonic
    ["iii", "vi", "ii", "V"],   // fully diatonic
  ],
};

export function colourChordProgRamp(chapter, mode, home) {
  const cap = { chapter, mode, home, pool: POOL_COLOUR };
  return [
    { ...cap, name: "Both colours",        desc: "pairs · 3D and 4-",          len: 2, gen: "curated", curated: CURATED_COLOUR, keyMode: "fixed" },
    { ...cap, name: "Three-chord",         desc: "threes · colour in context", len: 3, gen: "curated", curated: CURATED_COLOUR, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics", desc: "the songs that use both",    len: 4, gen: "curated", curated: CURATED_COLOUR, keyMode: "fixed" },
    { ...cap, name: "Any order",           desc: "random · 4",                 len: 4, gen: "random", keyMode: "fixed",  weights: WEIGHTS_COLOUR, follow: FOLLOW_COLOUR, forbid: FORBID_COLOUR },
    { ...cap, name: "New key",             desc: "random · 4 · a new key",     len: 4, gen: "random", keyMode: "not-c",  weights: WEIGHTS_COLOUR, follow: FOLLOW_COLOUR, forbid: FORBID_COLOUR },
    { ...cap, name: "Mastery · colour",    desc: "every combination · any starting chord · every key", len: 4, gen: "random", keyMode: "random", weights: WEIGHTS_COLOUR, follow: FOLLOW_COLOUR, forbid: FORBID_COLOUR, anyStart: true, qCount: FINAL_LEN },
  ];
}

/* ── 1D: the 1 chord turned dominant ── */
// Same lesson as 3D, one root over: home with a ♭7, the five-chord of 4. 1D sits right
// after 1 on the pad because they share a root and differ by one note — the ♭7.
export const POOL_1D = ["I", "I7", "ii", "iii", "IV", "V", "vi"];
export const WEIGHTS_1D = { I: 4, I7: 5, ii: 3, iii: 3, IV: 5, V: 4, vi: 4 };
// 1 → 1D is the move (home grows a ♭7), and 1D → 4 is where it almost always goes.
// 1D → 1 is a backtrack, so it's banned with a 0 — but only ADJACENT. Unlike 3D and 4-,
// there's no forbid: coming back home to 1 later in the loop isn't undoing anything, it's
// the whole point of 1 1D 4 1.
export const FOLLOW_1D = { I: { I7: 3 }, I7: { IV: 8, I: 0 } };

// Paired like 3D: most are a progression you know with one chord swapped. The twin
// can't be "the same loop with a plain 1" when 1D follows 1 (that'd be 1 1), so the
// pairs put 1D where a lone 1 would sit: 2 5 1D 4 against 2 5 1 4.
export const CURATED_1D = {
  2: [["I7", "IV"], ["I", "IV"], ["I", "I7"], ["V", "I7"], ["V", "I"], ["vi", "I7"]],
  3: [["I", "I7", "IV"], ["V", "I7", "IV"], ["V", "I", "IV"], ["I7", "IV", "I"], ["I7", "IV", "V"], ["I", "IV", "V"], ["ii", "V", "I7"], ["ii", "V", "I"]],
  4: [
    ["I", "I7", "IV", "V"],   // 1 1D 4 5
    ["I", "I7", "IV", "I"],   // 1 1D 4 1 — the blues move
    ["I", "I7", "IV", "vi"],  // 1D that lands on 4 and keeps going
    ["ii", "V", "I7", "IV"],  // 2 5 1D 4 — the turnaround that doesn't stop at home
    ["ii", "V", "I", "IV"],   // 2 5 1  4 — twin
    ["I", "V", "I7", "IV"],   // 1 5 1D 4
    ["I", "V", "I", "IV"],    // 1 5 1  4 — twin
    ["I", "vi", "IV", "V"],   // fully diatonic
  ],
};

/* ── 2D: the 2 chord turned dominant ── */
// The five-chord of 5: its ♯4 is 5's leading tone. 2D → 2- is left IN, unlike 3D → 3-,
// because 1 2D 2- 5 is a standard (Take the 'A' Train) — the dominant relaxing into the
// minor before the 5. It's just kept rare.
export const POOL_2D = ["I", "ii", "II7", "iii", "IV", "V", "vi"];
export const WEIGHTS_2D = { I: 4, ii: 4, II7: 5, iii: 2, IV: 4, V: 5, vi: 4 };
export const FOLLOW_2D = { II7: { V: 6, IV: 2, ii: 0.5 } };
export const CURATED_2D = {
  2: [["II7", "V"], ["ii", "V"], ["I", "II7"], ["I", "ii"], ["II7", "IV"], ["vi", "II7"]],
  3: [["I", "II7", "V"], ["I", "ii", "V"], ["II7", "V", "I"], ["ii", "V", "I"], ["I", "II7", "IV"], ["II7", "ii", "V"], ["vi", "II7", "V"], ["vi", "ii", "V"]],
  4: [
    ["I", "II7", "IV", "I"],   // 1 2D 4 1 — Eight Days a Week
    ["I", "II7", "ii", "V"],   // 1 2D 2- 5 — Take the 'A' Train
    ["I", "vi", "II7", "V"],   // 1 6 2D 5
    ["I", "vi", "ii", "V"],    // 1 6 2  5 — twin
    ["I", "IV", "II7", "V"],   // 1 4 2D 5
    ["I", "IV", "ii", "V"],    // 1 4 2  5 — twin
    ["I", "II7", "V", "I"],
    ["I", "ii", "V", "I"],     // twin
  ],
};

/* ── 6D: the 6 chord turned dominant ── */
// The five-chord of 2: its ♯1 is 2's leading tone. 1 6D 2 5 is the ragtime / rhythm-changes
// turnaround. 6D → 6- is a backtrack, same as 3D → 3-, so it's banned for the whole loop.
export const POOL_6D = ["I", "ii", "iii", "IV", "V", "vi", "VI7"];
export const WEIGHTS_6D = { I: 4, ii: 4, iii: 3, IV: 3, V: 4, vi: 4, VI7: 5 };
export const FOLLOW_6D = { VI7: { ii: 8, vi: 0 } };
export const FORBID_6D = { VI7: ["vi"] };
export const CURATED_6D = {
  2: [["VI7", "ii"], ["vi", "ii"], ["I", "VI7"], ["I", "vi"], ["vi", "VI7"], ["iii", "VI7"]],
  3: [["I", "VI7", "ii"], ["I", "vi", "ii"], ["VI7", "ii", "V"], ["vi", "ii", "V"], ["iii", "VI7", "ii"], ["iii", "vi", "ii"], ["vi", "VI7", "ii"], ["IV", "VI7", "ii"]],
  4: [
    ["I", "VI7", "ii", "V"],   // 1 6D 2 5 — the ragtime turnaround
    ["I", "vi", "ii", "V"],    // 1 6  2 5 — twin
    ["iii", "VI7", "ii", "V"], // 3 6D 2 5
    ["iii", "vi", "ii", "V"],  // 3 6  2 5 — twin
    ["vi", "VI7", "ii", "V"],  // 6- turning into 6D
    ["IV", "I", "VI7", "ii"],
    ["I", "vi", "IV", "V"],    // fully diatonic
  ],
};

/* ── secondary dominants: all four together ── */
// 1D 2D 3D 6D live at once, each banded onto the chord it shares a root with, so the pad
// is still six buttons. The new sound here is the CHAIN: dominants resolving into
// dominants, 3D → 6D → 2D → 5D, each one the five of the next.
export const POOL_SECDOM = ["I", "I7", "ii", "II7", "iii", "III7", "IV", "V", "vi", "VI7"];
export const WEIGHTS_SECDOM = { I: 4, I7: 3, ii: 3, II7: 3, iii: 2, III7: 3, IV: 4, V: 4, vi: 3, VI7: 3 };
export const FOLLOW_SECDOM = {
  I: { I7: 2 },
  I7: { IV: 6, I: 0 },
  II7: { V: 6, ii: 0.5 },
  III7: { vi: 4, VI7: 2, iii: 0 },
  VI7: { ii: 5, II7: 3, vi: 0 },
};
export const FORBID_SECDOM = { III7: ["iii"], VI7: ["vi"] };
export const CURATED_SECDOM = {
  2: [["I7", "IV"], ["II7", "V"], ["III7", "vi"], ["VI7", "ii"], ["I", "IV"], ["ii", "V"], ["iii", "vi"], ["vi", "ii"]],
  3: [["I", "I7", "IV"], ["I", "II7", "V"], ["I", "III7", "vi"], ["I", "VI7", "ii"], ["VI7", "II7", "V"], ["III7", "VI7", "ii"], ["I", "vi", "ii"], ["ii", "V", "I"]],
  4: [
    ["III7", "VI7", "II7", "V"], // the whole chain: every chord the five of the next
    ["I", "VI7", "II7", "V"],    // 1 6D 2D 5 — ragtime
    ["I", "VI7", "ii", "V"],
    ["I", "I7", "IV", "V"],
    ["I", "II7", "IV", "I"],
    ["I", "III7", "vi", "IV"],
    ["iii", "VI7", "ii", "V"],
    ["I", "vi", "ii", "V"],      // fully diatonic
  ],
};

// One ramp shape for every chapter in the section; the chord it teaches is `tag`.
function secDomRamp(chapter, tag, pool, curated, weights, follow, forbid, pairDesc) {
  const cap = { chapter, mode: "major", home: "I", pool };
  const rnd = { weights, follow, forbid };
  return [
    { ...cap, name: tag.startsWith("all") ? "Meet them all" : "Meet " + tag, desc: pairDesc, len: 2, gen: "curated", curated, keyMode: "fixed" },
    { ...cap, name: "Three-chord",         desc: "threes · where it leads",    len: 3, gen: "curated", curated, keyMode: "fixed" },
    { ...cap, name: "Four-chord classics", desc: "the songs, one chord swapped", len: 4, gen: "curated", curated, keyMode: "fixed" },
    { ...cap, name: "Any order",           desc: "random · 4",                 len: 4, gen: "random", keyMode: "fixed",  ...rnd },
    { ...cap, name: "New key",             desc: "random · 4 · a new key",     len: 4, gen: "random", keyMode: "not-c",  ...rnd },
    { ...cap, name: "Mastery · " + tag,    desc: "every combination · any starting chord · every key", len: 4, gen: "random", keyMode: "random", ...rnd, anyStart: true, qCount: FINAL_LEN },
  ];
}

/* ── borrowed from minor: ♭7, ♭6, ♭3, 2-7♭5 (4- has its own chapter already) ── */
// Each is taught against the diatonic chord it's mistaken for, the same way as 3D:
// ♭7 against 5D (both take you home), ♭6 against 6-, ♭3 against 3-, 2-7♭5 against 2-.
// Pools are listed in pitch order so the root pad reads low to high.

// ♭7 — Hey Jude's outro. Pairs swap it with 5D: same job, different route home.
export const POOL_B7 = ["I", "ii", "iii", "IV", "V", "vi", "♭VII"];
export const WEIGHTS_B7 = { I: 4, ii: 2, iii: 2, IV: 5, V: 4, vi: 3, "♭VII": 5 };
export const FOLLOW_B7 = { "♭VII": { I: 4, IV: 4 } };
export const CURATED_B7 = {
  2: [["♭VII", "I"], ["V", "I"], ["I", "♭VII"], ["I", "V"], ["♭VII", "IV"], ["IV", "♭VII"]],
  3: [["I", "♭VII", "IV"], ["I", "V", "IV"], ["IV", "♭VII", "I"], ["IV", "V", "I"], ["♭VII", "IV", "I"], ["V", "IV", "I"], ["I", "IV", "♭VII"]],
  4: [
    ["I", "♭VII", "IV", "I"],  // 1 ♭7 4 1 — Hey Jude's outro
    ["I", "V", "IV", "I"],     // 1 5  4 1 — twin
    ["I", "IV", "♭VII", "I"],  // 1 4 ♭7 1
    ["I", "IV", "V", "I"],     // 1 4 5  1 — twin
    ["I", "V", "♭VII", "IV"],
    ["I", "vi", "IV", "V"],    // fully diatonic
  ],
};

// ♭6 — nearly always on its way through ♭7 home (the "Mario" cadence), or down to 5D.
export const POOL_B6 = ["I", "ii", "IV", "V", "♭VI", "vi", "♭VII"];
export const WEIGHTS_B6 = { I: 4, ii: 2, IV: 3, V: 4, "♭VI": 5, vi: 4, "♭VII": 3 };
// ♭6 → 6- is a backtrack (same letter, brightened), so it's out.
export const FOLLOW_B6 = { "♭VI": { "♭VII": 6, V: 2, vi: 0 }, "♭VII": { I: 5 } };
export const CURATED_B6 = {
  2: [["♭VI", "♭VII"], ["♭VI", "V"], ["vi", "V"], ["I", "♭VI"], ["I", "vi"], ["♭VII", "I"]],
  3: [["♭VI", "♭VII", "I"], ["I", "♭VI", "♭VII"], ["♭VI", "V", "I"], ["vi", "V", "I"], ["I", "♭VI", "V"], ["I", "vi", "V"]],
  4: [
    ["I", "♭VI", "♭VII", "I"], // 1 ♭6 ♭7 1 — the Mario cadence
    ["I", "♭VI", "V", "I"],    // 1 ♭6 5 1
    ["I", "vi", "V", "I"],     // 1 6- 5 1 — twin
    ["♭VI", "♭VII", "I", "IV"],
    ["I", "V", "vi", "IV"],    // fully diatonic
    ["I", "vi", "IV", "V"],    // fully diatonic
  ],
};

// ♭3 — usually steps up to 4.
export const POOL_B3 = ["I", "ii", "♭III", "iii", "IV", "V", "vi"];
export const WEIGHTS_B3 = { I: 4, ii: 2, "♭III": 5, iii: 4, IV: 5, V: 4, vi: 3 };
export const FOLLOW_B3 = { "♭III": { IV: 5, iii: 0 } };
export const CURATED_B3 = {
  2: [["♭III", "IV"], ["iii", "IV"], ["I", "♭III"], ["I", "iii"], ["♭III", "I"]],
  3: [["I", "♭III", "IV"], ["I", "iii", "IV"], ["♭III", "IV", "I"], ["iii", "IV", "I"], ["IV", "♭III", "I"]],
  4: [
    ["I", "♭III", "IV", "I"],  // 1 ♭3 4 1
    ["I", "iii", "IV", "I"],   // 1 3- 4 1 — twin
    ["I", "♭III", "IV", "V"],
    ["I", "iii", "IV", "V"],   // twin
    ["I", "vi", "IV", "V"],    // fully diatonic
  ],
};

// 2-7♭5 — the minor key's 2, pushing into 5D harder than 2- does.
export const POOL_2HD = ["I", "ii", "iiø7", "iii", "IV", "V", "vi"];
export const WEIGHTS_2HD = { I: 4, ii: 4, "iiø7": 5, iii: 2, IV: 4, V: 5, vi: 4 };
export const FOLLOW_2HD = { "iiø7": { V: 8, ii: 0 } };
export const CURATED_2HD = {
  2: [["iiø7", "V"], ["ii", "V"], ["I", "iiø7"], ["I", "ii"], ["IV", "iiø7"], ["vi", "iiø7"]],
  3: [["iiø7", "V", "I"], ["ii", "V", "I"], ["I", "iiø7", "V"], ["I", "ii", "V"], ["vi", "iiø7", "V"], ["vi", "ii", "V"], ["IV", "iiø7", "V"], ["IV", "ii", "V"]],
  4: [
    ["I", "vi", "iiø7", "V"],
    ["I", "vi", "ii", "V"],    // twin
    ["iii", "vi", "iiø7", "V"],
    ["iii", "vi", "ii", "V"],  // twin
    ["I", "IV", "iiø7", "V"],
    ["I", "IV", "ii", "V"],    // twin
    ["iiø7", "V", "I", "IV"],
    ["ii", "V", "I", "IV"],    // twin — Kiss Me More
  ],
};

// All five borrowed chords, 4- included, beside the plain chords they're mistaken for.
export const POOL_BORROWED = ["I", "ii", "iiø7", "♭III", "iii", "IV", "iv", "V", "♭VI", "vi", "♭VII"];
export const WEIGHTS_BORROWED = { I: 4, ii: 2, "iiø7": 3, "♭III": 3, iii: 2, IV: 4, iv: 3, V: 3, "♭VI": 3, vi: 3, "♭VII": 4 };
export const FOLLOW_BORROWED = {
  IV: { iv: 5 }, iv: { IV: 0, I: 3, "♭VII": 2 },
  "♭VI": { "♭VII": 5, vi: 0 }, "♭VII": { I: 4, IV: 3 },
  "♭III": { IV: 4, iii: 0 }, "iiø7": { V: 8, ii: 0 },
};
export const FORBID_BORROWED = { iv: ["IV"] };
export const CURATED_BORROWED = {
  2: [["IV", "iv"], ["♭VI", "♭VII"], ["♭VII", "I"], ["iiø7", "V"], ["♭III", "IV"], ["iv", "I"], ["vi", "V"], ["ii", "V"]],
  3: [["IV", "iv", "I"], ["♭VI", "♭VII", "I"], ["I", "♭VII", "IV"], ["iiø7", "V", "I"], ["I", "♭III", "IV"], ["iv", "♭VII", "I"], ["I", "♭VI", "♭VII"], ["ii", "V", "I"]],
  4: [
    ["I", "♭VII", "IV", "I"],
    ["I", "♭VI", "♭VII", "I"],
    ["I", "IV", "iv", "I"],
    ["I", "♭III", "IV", "I"],
    ["I", "vi", "iiø7", "V"],
    ["IV", "iv", "♭VII", "I"],  // the four darkening, then the backdoor home
    ["I", "V", "vi", "IV"],     // fully diatonic
  ],
};

export const PROG_LEVELS = [
  ...progRamp("Major · 1 4 5 6", "major", FOUR, "I"),
  ...progRamp("Minor · 6 2 3 4", "minor", FOUR_MINOR, "vi"),
  ...allSevenProgRamp("All seven", "major", "I"),
  ...threeDeeProgRamp("3D · five of six", "major", "I"),
  ...minorFourProgRamp("4- · borrowed from minor", "major", "I"),
  ...colourChordProgRamp("Colour chords · 3D and 4-", "major", "I"),
  ...secDomRamp("1D · five of four", "1D", POOL_1D, CURATED_1D, WEIGHTS_1D, FOLLOW_1D, null, "pairs · 1 against 1D"),
  ...secDomRamp("2D · five of five", "2D", POOL_2D, CURATED_2D, WEIGHTS_2D, FOLLOW_2D, null, "pairs · 2- against 2D"),
  ...secDomRamp("6D · five of two", "6D", POOL_6D, CURATED_6D, WEIGHTS_6D, FOLLOW_6D, FORBID_6D, "pairs · 6- against 6D"),
  ...secDomRamp("Secondary dominants · all four", "all four", POOL_SECDOM, CURATED_SECDOM, WEIGHTS_SECDOM, FOLLOW_SECDOM, FORBID_SECDOM, "pairs · each D and where it goes"),
  ...secDomRamp("♭7 · flat seven", "♭7", POOL_B7, CURATED_B7, WEIGHTS_B7, FOLLOW_B7, null, "pairs · ♭7 against 5D"),
  ...secDomRamp("♭6 · flat six", "♭6", POOL_B6, CURATED_B6, WEIGHTS_B6, FOLLOW_B6, null, "pairs · ♭6 against 6-"),
  ...secDomRamp("♭3 · flat three", "♭3", POOL_B3, CURATED_B3, WEIGHTS_B3, FOLLOW_B3, null, "pairs · ♭3 against 3-"),
  ...secDomRamp("2-7♭5 · minor's two", "2-7♭5", POOL_2HD, CURATED_2HD, WEIGHTS_2HD, FOLLOW_2HD, null, "pairs · 2- against 2-7♭5"),
  ...secDomRamp("Borrowed from minor · all five", "all five", POOL_BORROWED, CURATED_BORROWED, WEIGHTS_BORROWED, FOLLOW_BORROWED, FORBID_BORROWED, "pairs · each borrowed chord in motion"),
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
  if (name.startsWith("Colour")) return "Both colour chords at once, each sitting next to the plain chord it's mistaken for. Telling 3D from 4- is the easy part — they have different roots. The work is holding both questions at the same time: was that a 3 or a 3D, and a 4 or a 4-. That's what naming the chords in a real song actually asks of you.";
  if (name.startsWith("4-")) return "Meet 4- — the 4 chord borrowed from minor, its 6 dropped to ♭6. It shares a root with the major 4, so the bass can't tell them apart: the whole difference is one voice falling a half step. You'll usually hear them back to back, 4 then 4-, going home to 1 — or on to 6 or 3 to keep moving.";
  if (name.startsWith("♭7")) return "Meet ♭7 — a major chord a whole step below home, borrowed from minor. It takes you home like 5D does, but without the leading tone, so it lands softer. You'll hear it as a plain chord or with a 7th on top: both are ♭7. On the pad, ♭7 is its own root.";
  if (name.startsWith("♭6")) return "Meet ♭6 — a major chord on the flat six, borrowed from minor. It's the big, bright chord that climbs through ♭7 back to 1. Its twin is 6-: same number, but one is minor in the key and the other is major from outside it.";
  if (name.startsWith("♭3")) return "Meet ♭3 — a major chord on the flat three, borrowed from minor. Where 3- sounds soft and inside the key, ♭3 sounds bold and a little rock and roll, and it usually steps straight up to 4.";
  if (name.startsWith("2-7♭5")) return "Meet 2-7♭5 — the minor key's 2 chord, with the 6 dropped to ♭6. It's darker than 2- and pushes harder into 5D. On the pad, tap 2, then the 7♭5 chip.";
  if (name.startsWith("Borrowed")) return "All the borrowed chords at once — 4-, ♭3, ♭6, ♭7 and 2-7♭5 — each beside the chord it's mistaken for. This is the colour that makes a major-key song sound bittersweet, heavy, or cinematic.";
  if (name.startsWith("2D")) return "Meet 2D — the 2 chord made major with a ♭7, the five-chord of 5. Its ♯4 is 5's leading tone, so where 2- drifts toward 5, 2D shoves. On the pad it sits in the band above 2-: same root, one note different.";
  if (name.startsWith("6D")) return "Meet 6D — the 6 chord made major with a ♭7, the five-chord of 2. Its ♯1 is 2's leading tone. 1 6D 2 5 is the old ragtime turnaround; hear it next to plain 1 6 2 5 and the difference is that one raised note.";
  if (name.startsWith("Secondary")) return "1D, 2D, 3D and 6D all live, each in the band above the chord it shares a root with. The new sound is the chain — 3D to 6D to 2D to 5D, every chord the five of the next, falling round the circle toward home.";
  if (name.startsWith("1D")) return "Meet 1D — home with a ♭7, the five-chord of 4. It shares a root with 1, so the bass won't warn you: listen for the one note on top that stops sounding like home and starts leaning into the 4. Most levels are a progression you know with one chord swapped.";
  if (name.startsWith("3D")) return "Meet 3D — the 3 chord turned dominant, the five-chord of 6. Its ♯5 is a note from outside the key, and it points at where the music is going. Most levels here are a progression you already know with one chord swapped, so the job is hearing which.";
  if (name.startsWith("All seven")) return mode === "chords"
    ? "The whole key, chord by chord. The big four left one chord unmet — 7dim — and it hides behind 5D, so you meet it alone, then beside 5D, before all seven open up."
    : "Name every diatonic chord in order, including the two the big four skipped. Hear where 7dim leads, and how 2- and 3- fill in the walks between the big chords.";
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
