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
//   • Player HP  = hearts − fumbled questions (a "fumble" = a not-first-try answer)
//   • win  when keeper HP reaches 0   → force-pass the capstone → fragment forged
//   • lose when hearts reach 0        → kicked back to the map
//
// Win takes precedence over lose on the same exchange (landing the killing blow on a
// recovered answer that would also spend your last heart still wins — deliberately
// generous).

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
    // Short duel-flavored lines (the modal greeting/win already live in HARMONIA;
    // these are the in-fight beats).
    taunts: {
      intro: "Up the steps, friend — I love you too much to go easy.",
      hurt: "Oh! Well heard — you took that step like you built it.",
      low: "You've nearly climbed me… the last steps are the sweetest.",
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
  name: "Keeper",
  title: "",
  taunts: {
    intro: "Show me your ears.",
    hurt: "A clean hit.",
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

// Derive the live duel state from the session results so far. `results` is the same
// array the grading handlers push to: [{ target, firstTry }, ...]. Every entry is a
// question the player ultimately answered correctly (the engine re-asks until right),
// so a `firstTry === false` entry means the keeper landed a blow.
export function evalBoss(results, cfg) {
  let damage = 0;
  let fumbles = 0;
  for (const r of results) {
    damage += bossDamage(r.firstTry, cfg);
    if (!r.firstTry) fumbles++;
  }
  const hp = Math.max(0, cfg.hp - damage);
  const hearts = Math.max(0, cfg.hearts - fumbles);
  let outcome = "ongoing";
  if (hp <= 0) outcome = "win";          // killing blow wins even if it cost the last heart
  else if (hearts <= 0) outcome = "lose";
  return {
    hp,
    hpMax: cfg.hp,
    hpPct: Math.round((hp / cfg.hp) * 100),
    hearts,
    heartsMax: cfg.hearts,
    damage,
    fumbles,
    outcome,
  };
}
