# Bassil the Deep — Stage-4 Tutorial (Chords 6·2·3·4, la-based minor)

Design + implementation spec for the **minor-chord** tutorial, the dark twin of Sylva's
Glasswood chapter. Written to mirror `SYLVA_TUTORIAL_PLAN.md` and verified against
`src/theory.mjs` + the current tutorial chassis.

- **Keeper / region:** Bassil the Deep, adventure **node 4**, "Undertone Caves", sub
  "Chords · 6 2 3 4", reward = **Right wing** of Excalibar.
- **The lesson:** the **same** leap Sylva teaches (single notes → chords), but in the
  **minor** world — the four chords "gathered around **6**", read on the one ladder you
  already know. Home is 6 (Rue), chords are stacked numbers you walk then ring (Sylva).
- **Sprite:** `keepers/keeper_bassil_south.png` already exists → inline as
  `window.BASSIL_SPRITE`, mirroring `SYLVA_SPRITE`/`RUE_SPRITE`. No art gap.

## Where it sits (the 2×2)
|            | single notes            | chords                         |
|------------|-------------------------|--------------------------------|
| **major**  | 1 · Verda · Meadows     | 3 · Sylva · Glasswood (1·4·5·6) |
| **minor**  | 2 · Rue · Lowmoor Fen   | **4 · Bassil · Undertone Caves (6·2·3·4)** |

Bassil = "minor" (Rue's home-on-6) × "chord" (Sylva's stack). **It reuses Sylva's chord-drill
chassis with minor params, exactly as Rue reused Verda's note-drill chassis.** ⇒ integrate
*after* Stage 3 lands; then Stage 4 is mostly config + content + one new scene.

## Creative spine
Glass was *light* — seeing straight through every voice. The cave is *depth* — you can't
look, you **feel the floor**. Same chords, same ladder, but heard from below and gathered
round the minor home (6). Ear mechanic is identical: **walk it** (arpeggio low→high) then
**ring it** (block) — Bassil just frames it as descending into the dark.

---

## Teaching beats (8) — parallels Sylva's, mirrored to minor + cave

**1. The Cave That Hums** *(greet)*
"Careful on the steps — it's dark, but your ears don't need light. You've reached the
**Undertone Caves**, and I'm **Bassil**. Down here the chords go **dark** — the same four
friends from up in the light, only gathered around **6**. Listen deep."
*Stage:* cave scene + ▶ Hear it (the 6 chord — minor home — low, long ring).

**2. Nothing New in the Dark** *(Sylva + Rue callback)*
"Nothing new grows down here. **Chords are numbers, stacked** — Sylva showed you that in her
glass. And **home is 6** — Old Rue taught you that in the fen. Put them together and here's
the cave's first chord: **6, 1, 3**, ringing at once. Home itself, in the dark."
*Stage:* `GuideStack` of the **6** chord (vi = 6·1·3 circled), 6 glowing home; tap a number →
that voice, tap the name → the whole chord.

**3. One Ladder, Every Chord**
"Same ladder Verda gave you — seven rungs, no more. Every chord down here lands on it, same
as up in the light; a chord is only **which rungs ring**. Learn the ladder once and the dark
holds no new chords — only your seven, gathered differently."
*Stage:* the empty 7-rung stack; ▶ buttons light the four minor chords' rungs in turn
(6·1·3 → 2·4·6 → 3·5·7 → 4·6·1).

**4. Home Rings in the Dark** *(degrees, not intervals — minor mirror of Sylva beat 4)*
"Some folk name a chord's voices *root, third, fifth* — counted from the chord, never the
key — so they never hear **home** when it's hiding. Look at the **2 chord**: **2, 4, and 6**.
Count the old way and that last note's just 'the **fifth**' — a stranger. But the ladder
names it true: it's **6**. **Home**, ringing deep inside the 2 — and you'd never have known,
counting from the root."
*Stage:* the 2-chord stack (2·4·6 circled), the **6** glowing teal; a label on that voice
flips **"5th"** (struck) → **"6 · home"**.
> Identity ("that note **is 6**"), not positional — the fixed 7→1 stack draws 1 at the
> bottom regardless of role, so avoid "top/bottom voice" language (same caveat as Sylva).

**5. Feel the Floor, Then Let It Ring** *(the ear mechanic the drills use)*
"Down here you don't look — you **feel**. Never meet a chord head-on. **Walk** it first, foot
by foot from the floor up — then stand still and let it **ring**, all at once. Nothing
changed between the two; you just stopped walking. The dark does the rest."
*Stage:* the 6-chord stack, paired ▶ Walk it (arpeggio low→high) / ▶ Ring it (block). Must
press both to advance.

**6. Kin, Even in the Dark** *(shared notes)*
"The ladder's deep gift: you can feel a chord's **family**. Set **home** — the 6 — beside the
**4**. Two of their three rungs land on the same numbers: **6 and 1**. They share their
blood; move a single voice of home and you **have** the 4. Even down here, chords aren't
strangers — they're **kin**, and the dark can't hide how close."
*Stage:* the 6-stack and 4-stack side by side, a glowing strand linking their shared **6 and
1**; those rungs pulse in sync.

**7. The Four Deep Chords, and How They Lean** *(the 6·2·3·4 feel + Sylva nod)*
"Four chords do the singing in the dark: **6**, **2**, **3**, **4**. The **6** rests —
**home**, low and easy. **2** steps out into the deep and waits. **3** leans hardest for home
— the held breath before you walk back in. And **4** — the one that carries a little **light**
down with it; Sylva's kind of chord, wandered below. The bright grove in a dark wood — home
lives right inside it."
*Stage:* the four stacks (6·1·3 / 2·4·6 / 3·5·7 / 4·6·1) + ▶ 6→2→6 and ▶ 3→6 (home glows teal
on arrival).
> **4 (IV)** is the lone *major* chord in the minor set — the "light." **3 (iii = the minor
> v)** is the strongest pull home. Identity language again ("home lives inside it").

**8. Read the Dark** *(drill intro)*
"Enough talk — the dark's for listening. I'll **walk** a chord, then **ring** it, and you'll
answer on the **stack**: tap the numbers you feel. Wrong trunks cost nothing; the cave
forgives — it only asks you to listen deeper. Three tries with me, and we start at **home**."
*Stage:* demo — Bassil plays the 6 chord (walk + ring); the stack circles 6·1·3 by itself.

---

## The 3 coached drills
**Mechanic:** identical to Sylva's, pool = **{6, 2, 3, 4}** (`FOUR_MINOR`), over a **minor**
cadence (home on 6). Walk (arp low→high) then ring (block) in drills 1–2; answer on a
`SessionStack` (tap degrees). Forgiving reveal (true tones glow, chord re-walks); replays
never count. **Ramp: root only → two upper voices (root given) → all three from the block.**
> Root-position voicing ⇒ the **lowest / first note of the walk is the root** (6 for the 6
> chord, 2 for the 2 chord, …). Drill-1 copy points at the note **heard first / lowest**, not
> the stack's visual bottom (always 1). First drill starts on **home (the 6 chord)**.

**Drill 1 — The Ground Voice** *(pool 6/2/3 · walk→ring · tap ONE: the root)*
- Listen: "Softly. I'll **walk** it from the floor up, then let it **ring**. Fix on the
  **first voice** — the lowest, the stone the rest are stacked on."
- Prompt: "Which number sang **first and lowest**? That's the **root** — tap it."
- Wrong: "Not that stone — no shame; the cave only asks you to listen again. The first,
  lowest voice is glowing. Let your ear sink **down** to it."
- Win: "You found the floor — and the floor is the chord's **name**, measured from home."

**Drill 2 — Two Stones Up** *(pool 6/2/3/4 · root pre-circled "given" · tap the OTHER TWO)*
- Listen: "This time I give you the floor — see it, already circled. **Walk** with me, then
  stand in the ring and find the **two voices above it**."
- Prompt: "Two rungs are still dark. Which two numbers are ringing? Tap them both."
- Wrong: "Close — one voice slipped into the dark. Here it is alone… now inside the chord.
  Hear it was there all along?"
- Win: "Both, clean. You're not guessing — you're **standing inside the chord**, turning your ear."

**Drill 3 — Deep and Clear** *(all four · BLOCK first, ▶ Walk it help, no penalty · tap all THREE)*
- Listen: "Last one — I'll ring it **all at once**, the way songs give it. If the dark blurs,
  don't fight it: tap **Walk it** and I'll take you down, stone by stone."
- Prompt: "Three voices, each in its place. Tap **all three numbers**."
- Wrong: "Almost — one stone's still in shadow. Listen while I walk it; the missing voice is
  glowing. Breathe, and feel again."
- Win: "**Deep ears. The caves will sing about this.**" *(his canon win line)*

## Send-off
"The **Undertone Caves** are yours to wander, traveler. **Walk** when the dark blurs, **let it
ring** when you're steady — and when you feel every voice in its floor, the **Right Wing of
Excalibar** waits below, cool and heavy: the blade's other half. No edge is balanced by its
bright side alone."

---

## Implementation plan

> **DEPENDENCY:** land Stage 3 (Sylva) first. It introduces the `kind: "chord"` chassis, the
> chord-drill path (walk+ring target + `SessionStack` answer), and turns the beats selector
> into a switch on `tutChapter`. Stage 4 is then the **minor reuse** of all of it — the same
> relationship Rue → Verda. Do **not** race Claude 1 in `number-ear-trainer.jsx`; this file is
> the spec to apply once Stage 3 is merged.

**Chassis (mirrors Sylva's additions):**
- 4th `TUT_CFG` entry: `chordsMinor: { key:"C", mode:"minor", homePc:9, flag:"tut4",
  kind:"chord", pool: FOUR_MINOR, spriteAlt:"Bassil", sceneClass:"tut-cave",
  nameTab:"Bassil the Deep", loc:"Undertone Caves" }`. (`FOUR_MINOR` = `["vi","ii","iii","IV"]`,
  already in theory.mjs.)
- Gate (`enterStage`): `if (n.id === 4 && loadPref("tut4","0") !== "1") {
  startTutorial("chordsMinor", 4); return; }` — right after Sylva's node-3 gate.
- Beats: add `bassilBeats`; extend the `tutChapter` beats switch to include it.
- Replay `TUTS` list: `{ chapter:"chordsMinor", flag:"tut4", icon:"🕯", title:"Undertone
  Caves", sub:"Bassil · minor chords — 6·2·3·4" }`.
- `build.sh`: inline `keepers/keeper_bassil_south.png` → `window.BASSIL_SPRITE`; the
  `keeperSrc` pick selects it for `tutChapter === "chordsMinor"`.

**Reused as-is (on top of Stage-3 reuse):** the chord-drill path Sylva adds — fed
`mode:"minor"` + `pool: FOUR_MINOR` + `homePc: 9`, so the tutorial drill is a gentle coached
round of the **minor** chord session the player is about to enter (`CHORD_CHAPTERS` gi 1
already exists and the whole chord-session machinery supports minor: `playCadence(key,"minor")`,
`chordTones`, the pick/toggle + set-compare). Also `GuideStack`, `playChord` (walk+ring),
`playProgression` (beat 7), and the coached-drill shell (gen-guard / forgiving reveal /
celebration / advance).

**New for Stage 4 (small):**
- **Cave scene** `.tut-cave` — the dark counterpart to `.tut-glass`/`.tut-fen`: near-black
  rock, a low pool, slow **drip**s, faint **crystal** glints (teal, the tonic's colour),
  maybe a lantern pool of light. Same layered `.tut-scene` structure; `prefers-reduced-motion`
  guard. Good Fable task.
- Beat-specific visuals are the **same** widgets as Sylva (kin strand, "5th → home" label
  toggle, GuideStack home-glow via the `home` prop, multi-chord ladder cycler) — just with
  **home = 6** and the minor chord set. If Sylva's are parameterized by home/pool, Stage 4
  gets them for free.

## Theory check (verified vs src/theory.mjs `CHORDS` / `FOUR_MINOR`)
`FOUR_MINOR = ["vi","ii","iii","IV"]` = roots **6·2·3·4** = **i·iv·v·VI** of la-based minor.
vi=6·1·3 · ii=2·4·6 · iii=3·5·7 · IV=4·6·1.
- Beat 2/8/drill-1 home chord: **vi = 6·1·3** (minor tonic). ✓
- Beat 4: **6 is the fifth of the ii chord** (2·4·6, root 2) — home hiding, mirrors Sylva's
  "1 is the fifth of the IV chord." ✓
- Beat 6: **vi ∩ IV = {6,1}** (two shared); swap the 3 for the 4 and home becomes the 4 chord. ✓
- Beat 7: **IV (4)** is the lone major chord in the set (the "light"); **iii (3)** is the
  minor-key dominant, the strongest pull home. ✓
- Drills: root = lowest/first voice heard (root-position voicing) — copy points at audio, not
  the stack's visual bottom. ✓
