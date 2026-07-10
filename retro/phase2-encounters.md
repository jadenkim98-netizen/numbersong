# Phase 2 — Session Game-Framing ("Encounters")

Design for three pieces of light game framing, gated under `.retro`:
region encounter intro (levels screen), trial gauge (session screen),
victory + fragment flourish (results screen → map).

**Housekeeping found while grounding:** `HARMONIA.nodes[].sub` in
`adventure/assets.js` is stale — the regions were reordered to the teaching
spine (`ADV_STAGES`: diatonic → chords → progressions → chromatic) but node 3
still says "Chromatic major", node 5 "Chords 1·4·5·6", etc. The table in
section 4 gives corrected subs (and one suggested rename). Fix these
regardless of which direction Jaden picks.

---

## 1 · Three tonal directions (Region 1 mockups)

Region 1 = **Staircase Meadows**, Diatonic · major, fragment = **Pommel gem**.
The teaching text ("Hear any of the seven degrees…") appears **verbatim** in
all three — it is never rewritten, only framed.

### Direction A — "Guardians of the Broken Blade" (battle-lite)

Each region is held by a guardian. Passing the drills "bests" them; the
fragment drops on the win. Fire-Emblem energy, highest stakes.

**Encounter card:**

```
┌─────────────────────────────────────────┐
│ 🌾  REGION 1 · HARMONIA        ◆ POMMEL │
│     STAIRCASE MEADOWS              GEM  │
│     DIATONIC · MAJOR                    │
│─────────────────────────────────────────│
│ VERDA, KEEPER OF THE SEVEN STEPS        │
│ “None cross my meadow who cannot name   │
│  its notes. Prove your ear, traveler.”  │
│─────────────────────────────────────────│
│ Hear any of the seven degrees (1–7) in  │
│ a major key and name it by number —     │
│ building from 1·2·3 up to the full key, │
│ then any octave, then any key.          │
│ 6 LEVELS · BEST VERDA TO CLAIM THE GEM  │
└─────────────────────────────────────────┘
        [⚔ CHALLENGE VERDA]
```

**Bar during drill:** `VERDA'S GUARD` — a gauge you *deplete* by answering
right (fills toward the pass mark). Wrong answers do nothing to you; the
guardian simply "holds".

**Victory line:** `VERDA YIELDS!` / *"Your ear is true. The Pommel gem is
yours — go, mend the blade."*

**Risk:** "defeating" figures who are, functionally, music teachers reads
strange next to the warm brand voice; and any battle metaphor makes a wrong
answer feel like taking a hit even if numerically it isn't.

### Direction B — "The Eight Keepers" (mentors who set trials) ★ recommended

Same eight characters, but they are **friendly masters**. Each Keeper
*teaches* their region and sets a **Trial** — you're not fighting them,
you're earning their mark. The fragment is a gift, not loot. Adventure shape
(a character, a trial, a reward) with a teacher's heart.

**Encounter card:**

```
┌─────────────────────────────────────────┐
│ 🌾  REGION 1 · HARMONIA        ◆ POMMEL │
│     STAIRCASE MEADOWS              GEM  │
│     DIATONIC · MAJOR                    │
│─────────────────────────────────────────│
│ VERDA, THE MEADOW KEEPER                │
│ “Every song in this meadow climbs the   │
│  same seven steps. Walk them with your  │
│  ears — I'll be right beside you.”      │
│─────────────────────────────────────────│
│ Hear any of the seven degrees (1–7) in  │
│ a major key and name it by number —     │
│ building from 1·2·3 up to the full key, │
│ then any octave, then any key.          │
│ 6 LEVELS · EARN VERDA'S MARK →  ◆       │
└─────────────────────────────────────────┘
        [▶ BEGIN THE TRIAL]
```

**Bar during drill:** `TRIAL` — a segmented gauge, one cell per question,
that only ever *fills* (green per first-try correct) toward a gold
**Keeper's mark** at the pass threshold. A miss leaves a quiet notch, costs
nothing. Streaks make the leading cell glow + a `COMBO ×N` tag.

**Victory line:** `VERDA'S MARK EARNED!` / *"Like you never left home."* /
`◆ Pommel gem — forged into Excalibar`

### Direction C — "The Long Road" (places, no characters)

Regions are just locations; the framing is atmosphere. Cleanest to build,
zero lore to maintain, but no one to *deliver* the warm voice — the copy has
to float unattributed.

**Encounter card:**

```
┌─────────────────────────────────────────┐
│ 🌾  YOU ARRIVE AT                       │
│     STAIRCASE MEADOWS                   │
│     Wind combs the grass in sevenths.   │
│─────────────────────────────────────────│
│ Hear any of the seven degrees (1–7)…    │
│ 6 LEVELS · CLEAR ALL TO FORGE ◆ POMMEL  │
└─────────────────────────────────────────┘
          [▶ SET OUT]
```

**Bar during drill:** `MOMENTUM` — same fill-only gauge, neutral label.

**Victory line:** `REGION CLEARED` / *"The meadow hums behind you."* /
`◆ Pommel gem — forged into Excalibar`

### Recommendation: **B — The Eight Keepers**

1. It resolves the brand tension instead of picking a side: Fire-Emblem
   *shape* (named character, trial, reward) carrying the teacher-y *voice*
   (the Keepers literally speak the warm lines — "I'll be right beside you").
2. Characters give each region a personality and give the teaching text a
   speaker — the "what you'll learn" copy lands better introduced by someone.
3. Nothing to lose to: no combat metaphor means a miss can't be read as
   damage, which honors the "never punish learning" constraint at the
   *fiction* level, not just the mechanics level.
4. Keepers are future sprite slots (same swappable pattern as Coda) and
   future voice-line slots.
5. A drops cleanly out of B later if Jaden wants more edge — Keepers can
   "test you sternly" per region (Anvil Peak's Forgemaster can be gruff)
   without changing any structure.

Everything below implements **B**. (The CSS is 95% direction-agnostic — only
label strings and the keeper block differ.)

---

## 2 · Final CSS (append to `retro/retro.css`)

This **supersedes** the v1 first-pass `.encounter` / `.hpbar` / `.victory`
blocks in retro.css (lines ~147–190). Delete those three blocks and the
`.hearts` variant (unused — we're not doing lives) and append this. The
keyframes `rt-pop`, `rt-bob`, `rt-blink`, `rt-flash`, `rt-shake` and the
`.streak`, `.burst`, `.blink` rules stay as-is.

```css
/* =====================  PHASE 2 — ENCOUNTERS  ============================= */

/* ---- 1) region encounter card (levels screen, adventure entry) ----------
   Replaces the plain .stage-intro when .retro + fromAdventure. Titles are
   pixel; the keeper's speech and the teaching text stay --sans (sacred). */
.retro .encounter{
  clip-path:var(--notch); background:var(--card); padding:0; text-align:left;
  box-shadow:inset 0 0 0 2px var(--em,var(--teal)),inset 0 0 0 4px rgba(0,0,0,.3);
  margin:0 0 14px; animation:rt-pop .32s cubic-bezier(.2,1.3,.4,1);
}
/* per-region mood tint (drives the frame + emblem color) */
.retro .encounter.mood-major { --em:var(--green); }
.retro .encounter.mood-minor { --em:var(--blue);  }
.retro .encounter.mood-mystic{ --em:var(--teal);  }
.retro .encounter.mood-cave  { --em:#9b8ec4;      }  /* crystal violet */
.retro .encounter.mood-coast { --em:var(--blue);  }
.retro .encounter.mood-bridge{ --em:var(--gold);  }
.retro .encounter.mood-forge { --em:var(--wrong); }  /* ember */

.retro .enc-head{
  display:flex; align-items:center; gap:12px; padding:12px 14px;
  background:rgba(0,0,0,.22); box-shadow:inset 0 -2px 0 0 var(--line);
}
/* emblem: emoji placeholder today, keeper sprite tomorrow (one-spot swap:
   replace the emoji text node with an <img class="enc-emblem-img">) */
.retro .enc-emblem{
  flex:0 0 auto; width:44px; height:44px; display:flex; align-items:center;
  justify-content:center; font-size:24px; clip-path:var(--notch);
  background:var(--bg); box-shadow:inset 0 0 0 2px var(--em,var(--teal));
  image-rendering:pixelated;
}
.retro .enc-emblem img{ width:32px; height:32px; image-rendering:pixelated; }
.retro .enc-titles{ flex:1 1 auto; min-width:0; }
.retro .enc-titles .kicker{ display:block; font-size:8px; margin-bottom:3px; }
.retro .encounter-title{
  color:var(--em,var(--teal)); font-size:15px; line-height:1.2; margin:0;
  text-shadow:2px 2px 0 var(--ink);
}
.retro .encounter-sub{ display:block; color:var(--text); opacity:.65; font-size:9px; margin:4px 0 0; }
/* fragment reward tag (top-right) */
.retro .enc-frag{
  flex:0 0 auto; font-family:var(--pf); font-size:9px; letter-spacing:1px;
  text-transform:uppercase; color:var(--gold); text-align:right; line-height:1.6;
}
.retro .enc-frag .gem{ display:block; font-size:14px; animation:rt-bob 1.4s ease-in-out infinite; }

/* keeper speech — --sans, readable, quoted */
.retro .keeper-line{
  margin:0; padding:12px 14px 0; font-family:var(--sans); font-size:.95rem;
  line-height:1.5; color:var(--text); text-transform:none; letter-spacing:normal;
}
.retro .keeper-name{
  display:block; font-family:var(--pf); font-size:10px; letter-spacing:1px;
  text-transform:uppercase; color:var(--em,var(--teal)); margin-bottom:5px;
}
.retro .keeper-line q{ quotes:"\201C" "\201D"; font-style:italic; opacity:.95; }

/* teaching text — untouched .stage-goal / .stage-meta, just placed inside */
.retro .encounter .stage-goal{
  margin:0; padding:10px 14px 0; font-family:var(--sans); font-size:.92rem;
  line-height:1.5; text-transform:none; letter-spacing:normal;
}
.retro .encounter .stage-meta{
  display:block; padding:10px 14px 13px; font-family:var(--pf); font-size:8px;
  letter-spacing:1px; text-transform:uppercase; color:var(--text); opacity:.55;
}

/* ---- 2) TRIAL gauge (session screen) -------------------------------------
   One cell per question; fills green on first-try corrects, quiet notch on
   misses, gold Keeper's-mark tick at the pass threshold. Fill-only: nothing
   ever drains. Replaces the rounded .progressbar in retro mode. */
.retro .progressbar{ display:none; }        /* the gauge subsumes it */
.retro .hpbar{ display:flex; align-items:center; gap:8px; margin:2px 0; }
.retro .hp-label{
  font-family:var(--pf); font-size:9px; letter-spacing:1px;
  text-transform:uppercase; color:var(--text); opacity:.7; flex:0 0 auto;
}
.retro .trial-cells{
  flex:1 1 auto; display:flex; gap:3px; height:14px; padding:3px;
  background:var(--bg); clip-path:var(--notch);
  box-shadow:inset 0 0 0 2px var(--line);
}
.retro .trial-cells .cell{ flex:1 1 0; background:rgba(237,242,238,.07); position:relative; }
.retro .trial-cells .cell.hit{
  background:var(--green);
  box-shadow:inset 0 -2px 0 rgba(0,0,0,.3),inset 0 2px 0 rgba(255,255,255,.25);
}
.retro .trial-cells .cell.miss{ background:var(--line); opacity:.55; } /* quiet, never red */
/* the Keeper's mark: gold tick on the pass-threshold cell's right edge */
.retro .trial-cells .cell.mark::after{
  content:""; position:absolute; top:-5px; bottom:-5px; right:-2.5px; width:2px;
  background:var(--gold); box-shadow:0 0 4px var(--gold);
}
/* leading cell pulses while a streak is alive */
.retro .trial-cells .cell.hot{ animation:rt-hot .7s steps(2) infinite; }
@keyframes rt-hot{ 50%{ filter:brightness(1.5); } }
/* combo tag (right of the gauge; only rendered when streak >= 2) */
.retro .combo{
  font-family:var(--pf); font-size:10px; letter-spacing:1px; color:var(--gold);
  flex:0 0 auto; animation:rt-pop .25s cubic-bezier(.2,1.4,.4,1);
}
/* the existing header score keeps working; just pixel-tag the flame */
.retro .session-score{ font-family:var(--pf); font-size:11px; letter-spacing:1px; }
.retro .session-score .streak{ margin-right:8px; }

/* ---- 3) victory + fragment flourish (results screen) --------------------
   Shown above .score-big when a region was JUST fully cleared. */
.retro .victory{
  clip-path:var(--notch); background:var(--card); width:100%;
  padding:18px 16px 16px; text-align:center;
  box-shadow:inset 0 0 0 2px var(--gold),inset 0 0 0 4px rgba(0,0,0,.3);
  animation:rt-pop .4s cubic-bezier(.2,1.4,.4,1);
}
.retro .victory-title{
  font-family:var(--pf); color:var(--gold); font-size:17px; margin:0;
  letter-spacing:1px; text-transform:uppercase; text-shadow:2px 2px 0 var(--ink);
  animation:rt-flash 1.2s ease-out;
}
.retro .victory-quote{
  display:block; margin:10px 0 0; font-family:var(--sans); font-size:.95rem;
  line-height:1.5; color:var(--text); text-transform:none; letter-spacing:normal;
}
.retro .victory .frag-chip{
  display:inline-flex; align-items:center; gap:8px; margin-top:14px;
  padding:8px 14px; clip-path:var(--notch); background:var(--bg);
  box-shadow:inset 0 0 0 2px var(--teal);
  font-family:var(--pf); font-size:10px; letter-spacing:1px;
  text-transform:uppercase; color:var(--teal);
}
.retro .victory .frag-chip .gem{ font-size:16px; color:var(--gold); animation:rt-bob .9s ease-in-out infinite; }
.retro .victory .forge-count{
  display:block; margin-top:10px; font-family:var(--pf); font-size:9px;
  letter-spacing:1px; text-transform:uppercase; color:var(--text); opacity:.6;
}
/* back on the map: flash the forge when a fragment was just added */
.retro .adv-sword-mini.burst{ animation:rt-flash 1.4s ease-out; }
```

---

## 3 · Markup structure (translate to JSX)

### 3a — Region encounter card

Levels screen. **Retro + fromAdventure:** render this *instead of* the plain
`.stage-intro`. **Boring mode (or non-adventure entry):** keep the existing
`.stage-intro` exactly as-is.

```html
<div class="encounter mood-major">            <!-- mood-{node.mood} -->
  <div class="enc-head">
    <span class="enc-emblem" aria-hidden="true">🌾</span>   <!-- EMBLEM[mood] -->
    <div class="enc-titles">
      <span class="kicker">Region 1 · Harmonia</span>       <!-- node.id -->
      <h2 class="encounter-title">Staircase Meadows</h2>    <!-- node.name -->
      <span class="encounter-sub">Diatonic · major</span>   <!-- node.sub -->
    </div>
    <span class="enc-frag"><span class="gem">◆</span>Pommel gem</span>
                              <!-- fragLabel[stageFrag[node.id]] -->
  </div>
  <p class="keeper-line">
    <b class="keeper-name">Verda, the Meadow Keeper</b>
    <q>Every song in this meadow climbs the same seven steps. Walk them
    with your ears — I'll be right beside you.</q>
  </p>
  <p class="stage-goal"><!-- stageGoal(mode, title) — VERBATIM --></p>
  <span class="stage-meta">6 levels · single notes · earn Verda's mark → ◆</span>
</div>
<!-- the level list below IS the “Begin” — no extra button needed.
     Optional nicety: keep the header title as the region name too. -->
```

### 3b — Trial gauge

Session screen, directly replacing the `.progressbar` row (retro hides
`.progressbar` via CSS, so it's safe to render both; cleaner to render the
gauge only when `!boringMode`). Cells derive from `sessionResults` + `qCountOf(lvl)`.

```html
<div class="hpbar">
  <span class="hp-label">Trial</span>
  <div class="trial-cells">
    <!-- one <i> per question, i = 0..qCount-1:
         class = "cell"
           + (sessionResults[i] ? (sessionResults[i].firstTry ? " hit" : " miss") : "")
           + (i === passCountFor(lvl) - 1 ? " mark" : "")
           + (streak >= 2 && i === sessionResults.length - 1 && sessionResults[i].firstTry ? " hot" : "") -->
    <i class="cell hit"></i><i class="cell hit"></i><i class="cell miss"></i>
    <i class="cell hit hot"></i><i class="cell"></i><i class="cell"></i>
    <i class="cell hit mark"></i><i class="cell"></i><i class="cell"></i><i class="cell"></i>
  </div>
  <span class="combo">×3</span>   <!-- only when streak >= 2: `×${streak}` -->
</div>
```

The existing header `🔥{streak} {score} ✓` in `.session-score` stays; retro
just restyles it. `.qcount` stays (readable sans by default — leave it).

### 3c — Victory + fragment flourish

Results screen, inserted at the top of `.results` (above `.score-big`),
**only when a region was just cleared** (see checklist). The normal results
content still renders below — the stats are the lesson debrief.

```html
<div class="victory">
  <h3 class="victory-title">Verda's mark earned!</h3>
  <span class="victory-quote">“Like you never left home.”</span>
  <span class="frag-chip"><span class="gem">◆</span>Pommel gem — forged into Excalibar</span>
  <span class="forge-count">1 / 8 fragments</span>
</div>
<!-- and: swap the “← Levels” back button for “← To the map”, returning to
     the adventure screen with class "burst" applied once to .adv-sword-mini -->
```

---

## 4 · Copy strings

**Source of truth:** region `name` / `sub` / `mood` come from
`window.HARMONIA.nodes[]` (adventure/assets.js); fragment names from
`HARMONIA.fragLabel[HARMONIA.stageFrag[id]]`; teaching text from
`stageGoal()` in the jsx (verbatim, never duplicated). Keeper names,
greetings, victory quotes, and emblems are NEW — put them in one place:
extend each node in assets.js with `keeper`, `greet`, `win` (preferred, keeps
lore with the map data), or a `KEEPERS[1..8]` map in the jsx.

**Corrected subs** (stale after the reorder) and the full Keeper cast:

| # | Region (node.name) | sub (CORRECTED) | mood | Keeper | Emblem | Fragment |
|---|---|---|---|---|---|---|
| 1 | Staircase Meadows | Diatonic · major | major | Verda, the Meadow Keeper | 🌾 | Pommel gem |
| 2 | Lowmoor Fen | Diatonic · minor | minor | Old Rue of the Fen | 🌙 | Grip |
| 3 | Glasswood | Chords: 1·4·5·6 | mystic | Sylva of the Glasswood | 🌲 | Left wing |
| 4 | Undertone Caves | Chords: 6·2·3·4 | cave | Bassil the Deep | 💎 | Right wing |
| 5 | Pillar Coast | Progressions · major | coast | Marin of the Pillars | 🌊 | Blade — lower |
| 6 | Sixstone Hollow | Progressions · minor | minor | Sable of Sixstone | 🪨 | Blade — mid |
| 7 | Halfstep Crossing* | Chromatic · major | bridge | Chroma the Wanderer | 🌉 | Blade — upper |
| 8 | Anvil Peak | Chromatic · minor | forge | Ferro, the Forgemaster | ⚒ | The tip |

\* rename suggestion: "Cadence Road" fit progressions, but node 7 now hosts
chromatic content; "Halfstep Crossing" fits both the bridge terrain and the
half-step color notes. Keeping "Cadence Road" is fine if Jaden prefers —
it's just a string in assets.js.

**Keeper greetings** (`keeper-line`, one per region):

1. Verda: "Every song in this meadow climbs the same seven steps. Walk them with your ears — I'll be right beside you."
2. Old Rue: "The fen sounds sadder, but nothing moved. Home just lives at 6 down here. Come — rest your ear on it."
3. Sylva: "Three notes at once, and you can hear every one. Look through the chord like glass."
4. Bassil: "Down here the chords go dark — same four friends, gathered around 6. Listen deep."
5. Marin: "Songs travel chord to chord, like stepping pillar to pillar. Name each one as you cross."
6. Sable: "The minor road walks the same stones in dimmer light. Keep count — home is still home."
7. Chroma: "Between every step hides a color. Twelve notes, one home. Cross slowly."
8. Ferro: "The last piece is earned in the dark — all twelve notes around a minor home. Show me everything, and I'll finish the blade."

**Victory quotes** (`victory-quote`; title is always "`{Keeper first name}'s
mark earned!`", except 8):

1. Verda: "Like you never left home."
2. Old Rue: "You found 6 in the dark. That's the whole trick."
3. Sylva: "You heard every voice in the chord. Clear as glass."
4. Bassil: "Deep ears. The caves will sing about this."
5. Marin: "You crossed without looking down. The changes are yours."
6. Sable: "Stone by stone, and you never lost home."
7. Chroma: "Twelve colors, and you named them all."
8. Ferro (title: "The blade is whole!"): "Eight trials, eight pieces. Excalibar sings again — and so do you."

**Gauge labels:** `Trial` (hp-label) · `×{streak}` (combo, streak ≥ 2).
Direction A would use "{Keeper}'s guard"; C would use "Momentum" — same CSS.

**Meta line:** `{n} levels · {single notes | chord tones | chord progressions} · earn {Keeper first name}'s mark → ◆`

**Fragment chip:** `{fragLabel} — forged into Excalibar` · `{have} / 8 fragments`
(region 8: `Excalibar reforged!` — matches the map HUD string).

---

## 5 · Integration checklist (for the main agent)

1. **assets.js** — update `nodes[]`: corrected `sub` values (table above),
   optional node-7 rename, and add `keeper`, `greet`, `win` strings per node.
   Emblems: a tiny `EMBLEM = {major:"🌾", minor:"🌙", mystic:"🌲", cave:"💎",
   coast:"🌊", bridge:"🌉", forge:"⚒"}` map in the jsx (note: node 6's table
   emblem 🪨 — either add a distinct mood or just key emblems by node id).
2. **retro.css** — delete the v1 `.encounter`/`.hpbar`+`.hearts`/`.victory`
   blocks (lines ~147–190); append section 2 CSS.
3. **Levels screen** (`screen === "levels"`, `src/number-ear-trainer.jsx`
   ~line 2124): when `fromAdventure && !boringMode`, render the
   `.encounter` card (3a) instead of `.stage-intro`; needs the entered
   node — store `advStageId` in `enterStage()` (currently only sets
   mode/group). Reads: `HARMONIA.nodes[advStageId-1]`, `stageGoal(mode,
   title)`, `fragLabel[stageFrag[advStageId]]`, `list.length`.
4. **Session screen** (~line 2192): when `!boringMode`, render the
   `.hpbar` gauge (3b) after `.top-slim` (the CSS hides `.progressbar`
   under `.retro` regardless). Reads: `sessionResults`, `qCountOf(lvl)`,
   `passCountFor(lvl)`, `streak`. No new state, no timers — pure render.
5. **Results screen** (~line 2370): region-clear detection — in
   `startSession` (or `enterStage`) snapshot `wasCleared =
   stageClearedAdv(advStageId)`; on results, `justCleared = fromAdventure &&
   passed && !wasCleared && stageClearedAdv(advStageId)` (progress already
   saved by then). If `justCleared`: render `.victory` (3c) above
   `.score-big`, and make the back button "← To the map" →
   `setScreen("adventure")` with a one-shot flag that puts `burst` on
   `.adv-sword-mini` (clear the flag after mount/animation).
   Gate the victory card's *retro styling* under `.retro` as usual; in
   boring mode either skip it or let it render unstyled-plain — skipping is
   simpler and honors "boring stays plain".
6. **Sfx hook (optional, free):** `sfx("select")` on encounter mount,
   existing success sfx on victory — both already exist.
7. **No changes** to: teaching copy, `.qcount`, numpad, DegreeLadder,
   `.session-score` markup (CSS-only restyle), boring-mode anything.

Art-swap path (later): `.enc-emblem` emoji → 32×32 keeper sprite `<img>`;
`.frag-chip .gem` ◆ → cropped fragment from the sword sheet via the existing
part-mask. Both are single-element swaps, same pattern as Coda.
