// Numbersong — Keeper Duel (boss) model. Pure: no React / Tone / window, so it's
// unit-tested directly like theory.mjs / pitch.mjs and inlined by build.sh.
//
// A duel REPLACES a region's final (mastery-capstone) level. It reuses the normal
// session engine verbatim — same content, same audio, same grading handlers — and
// derives the whole fight from the session's `results` array (each entry carries
// `firstTry: bool`). Nothing here touches app state; the JSX reads these values to
// draw the HUD and to decide continue / win / lose.
//
//   • Keeper HP  = maxHp − Σ damage         (first-try correct hits harder)
//   • Player HP  = hearts − misses          (EVERY wrong answer costs a heart, right
//                                            away — several wrong guesses on one
//                                            question spend several hearts)
//   • win  when keeper HP reaches 0   → force-pass the capstone → fragment forged
//   • lose when hearts reach 0        → kicked back to the map
//
// HP only drops on a CORRECT answer; hearts only drop on a WRONG one — so win and lose
// are triggered by different events (the correct-path and the wrong-path in the JSX),
// and `misses` is tracked live rather than derived from completed questions.

// Per-region duel config, keyed by HARMONIA node id. Only the keepers we've wired are
// listed; `bossConfigFor` falls back to DEFAULT_BOSS for anything not tuned yet, and
// `isBossRegion` gates which nodes actually launch a duel.
export const BOSS = {
  // Verda — Staircase Meadows (node 1, diatonic major, the free funnel entry). Tuned
  // gentle: this is most players' FIRST boss, and losing kicks them to the map, so it
  // must stay winnable. 4 clean first-try hits fell her; 4 hearts of slack.
  1: {
    hp: 100,
    hearts: 4,
    dmgFirst: 25,     // a first-try correct answer — a clean strike
    dmgRecover: 10,   // correct, but only after a miss — a glancing blow
    name: "Verda",
    title: "the Meadow Keeper",
    // Escalating tempo: seconds to name each note, shrinking as she weakens (the fight
    // speeds toward a frenzied climax). Gentle for the first keeper.
    timer: { full: 8, mid: 6, low: 4 },
    // Short duel-flavored lines (the modal greeting/win already live in HARMONIA;
    // these are the in-fight beats).
    taunts: {
      intro: "Up the steps, friend — I love you too much to go easy.",
      // `hits` — she reacts to being struck; picked in turn so it varies each correct answer.
      hits: [
        "Oh! Well heard — you took that step like you built it.",
        "That's the one — clean as a bell.",
        "Ha! Right underfoot, just like home.",
        "Yes — the meadow's singing your name now.",
        "Mm! That step rang true.",
        "There — you didn't even look down.",
      ],
      low: "Almost home now — I can hear it ringing under your feet.",
      playerHurt: "Just a stumble. Home hasn't moved — listen for it.",
      win: "There it is. Take my mark — you climbed all the way home.",
      lose: "The steps will keep, dear. Rest your ears, then climb again.",
    },
  },
};

// Sensible default for regions whose duel isn't hand-tuned yet (so enabling one later
// is a one-line change in isBossRegion, not a data scramble).
export const DEFAULT_BOSS = {
  hp: 120,
  hearts: 3,
  dmgFirst: 25,
  dmgRecover: 10,
  timer: { full: 7, mid: 5, low: 3 },
  name: "Keeper",
  title: "",
  taunts: {
    intro: "Show me your ears.",
    hits: ["A clean hit.", "Well struck.", "You heard that true.", "Sharp — again."],
    low: "You're nearly through my guard…",
    playerHurt: "You faltered. Listen again.",
    win: "Well heard.",
    lose: "Not yet. Come back sharper.",
  },
};

// Which nodes currently launch a Keeper Duel instead of a normal capstone session.
// Start with Verda only; add ids here (and tune in BOSS) to roll the duel out.
const ENABLED = new Set([1]);
export const isBossRegion = (id) => ENABLED.has(id);

export function bossConfigFor(id) {
  return BOSS[id] || DEFAULT_BOSS;
}

// Damage a single correct answer deals, given whether it was a first-try hit.
export function bossDamage(firstTry, cfg) {
  return firstTry ? cfg.dmgFirst : cfg.dmgRecover;
}

// Seconds allowed to name the current note, escalating with the keeper's HP: full clock
// above 66%, tighter through the mid third, frantic in the last third. Drives the timed
// turn — timing out is a whiff (a wrong answer) and costs a heart.
const DEFAULT_TIMER = { full: 7, mid: 5, low: 3 };
export function bossTimer(hpPct, cfg) {
  const t = (cfg && cfg.timer) || DEFAULT_TIMER;
  if (hpPct > 66) return t.full;
  if (hpPct > 33) return t.mid;
  return t.low;
}

// Derive the live duel state. `results` is the array the grading handlers push to
// ([{ target, firstTry }, ...]) — one entry per question the player answered correctly,
// used only for keeper damage (first-try hits harder). `misses` is the running count of
// WRONG answers across the whole duel — each one costs a heart the moment it happens, so
// several wrong guesses on a single question drain several hearts.
export function evalBoss(results, misses, cfg) {
  let damage = 0;
  for (const r of results) damage += bossDamage(r.firstTry, cfg);
  const hp = Math.max(0, cfg.hp - damage);
  const hearts = Math.max(0, cfg.hearts - (misses || 0));
  let outcome = "ongoing";
  if (hp <= 0) outcome = "win";          // killing blow (a correct answer) wins
  else if (hearts <= 0) outcome = "lose"; // hearts gone (a wrong answer) loses
  return {
    hp,
    hpMax: cfg.hp,
    hpPct: Math.round((hp / cfg.hp) * 100),
    hearts,
    heartsMax: cfg.hearts,
    damage,
    misses: misses || 0,
    outcome,
  };
}
