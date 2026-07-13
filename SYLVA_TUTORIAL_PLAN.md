# Sylva of the Glasswood — Stage-3 Tutorial (Chords 1·4·5·6)

Ship-ready design + implementation spec. Verified against `src/theory.mjs` and the current
`src/number-ear-trainer.jsx` tutorial chassis (post theory.mjs/pitch.mjs refactor).

- **Keeper / region:** Sylva of the Glasswood, adventure **node 3**, sub "Chords · 1 4 5 6",
  reward = "Left wing" of Excalibar.
- **The lesson:** the leap from single notes → **chords**. Not "hear harder" but *see each
  chord as numbers on the one tonal octave you already know* — read where **home** sits
  inside a chord, and which notes chords **share**.
- **Sprite:** `keepers/keeper_sylva_south.png` already exists (build.sh just needs to inline
  it as `window.SYLVA_SPRITE`, mirroring `RUE_SPRITE`). No art gap.

## Creative spine
Glass = you can see straight *through* to every voice. Sylva teaches reading a chord on the
seven-rung ladder: which numbers light, where home hides, which rungs two chords share.
The ear mechanic is **walk it** (arpeggio, low→high) then **ring it** (block chord).

---

## Teaching beats (8)

**1. The Forest That Rings** *(greet)*
"Hush, traveler — step lightly. You've reached the **Glasswood**, and I'm **Sylva**. Three
notes at once, and you can hear every one. Look through the chord like glass."
*Stage:* glasswood scene + ▶ Hear it (soft 1-chord, long ring; trunks shimmer).

**2. Nothing New Grows Here** *(Verda callback)*
"Do you remember what Verda told you? **Chords are just numbers, stacked** — nothing here
you haven't met. Only **1**ᵗ, **3**, and **5**, ringing at once. Old friends, standing close."
*Stage:* `GuideStack` of the **1** chord (1·3·5 circled); tap a number → that voice, tap the
name → the whole chord.

**3. One Ladder, Every Chord** *(the stack's advantage)*
"Here's why I write them **stacked**. This ladder holds all **seven numbers** of the octave —
the very ones Verda gave you. And *every* chord in the world lands right here on it; a chord
is only **which rungs light up**. Learn the ladder, and you never learn a 'new chord' again —
you just see which of your seven are **ringing**."
*Stage:* the empty 7-rung stack; ▶ buttons light different chords' rungs in turn (1·3·5,
then 4·6·1…) — chords read as shapes on one shared map.

**4. The Note That's Really Home** *(degrees, not intervals — CORRECTED)*
"Some folk name a chord's voices *root, third, fifth* — each counted from the chord itself,
never the key. And that hides where they truly live. Look at the **4 chord**: **4, 6, and 1**.
Count the old way and that last note is just 'the **fifth**' — a stranger. But the ladder
names it true: it's **1**ᵗ. **Home**, ringing right inside the 4 — and you'd never have known
it, counting from the root."
*Stage:* the 4-chord stack (4·6·1 circled), the **1** glowing teal; a small label on that
voice flips **"5th"** (struck through) → **"1 · home"**.
> Note: says "that last note **is 1**" (identity), NOT "the top voice" — the fixed 7→1 stack
> always draws 1 at the bottom regardless of its role, so avoid positional language here.

**5. Walk It, Then Ring It** *(the ear mechanic the drills use)*
"Never meet a chord head-on. **Walk** it first — one trunk at a time, low to high — then let
it **ring**, all together. Nothing changed between the two; you simply stopped walking. Your
ear does the rest."
*Stage:* the 1-chord stack with paired buttons ▶ Walk it (arpeggio, each rung lighting in
turn) / ▶ Ring it (block). Must press both to advance.

**6. Chords Are Kin** *(shared notes — "shared DNA" metaphor)*
"Now the ladder's finest gift: you can see a chord's **family**. Set the **1** beside the
**6** — look close. Two of their three rungs land on the *same numbers*: **1 and 3**. They
share most of their **DNA** — change a single voice of home and you *have* the 6. That's why
it never sounds far off: it's home's own blood, wearing shadow. Chords aren't strangers,
traveler — they're **kin**, and the ladder shows you exactly how close."
*Stage:* the 1-stack and 6-stack side by side, a faint glowing **strand** linking their
shared **1** and **3** across the gap; those two rungs pulse in sync.

**7. The Four Groves, and How They Lean** *(the 1·4·5·6 feel + Rue nod)*
"Four groves do most of the singing: **1**ᵗ, **4**, **5**, **6**. The **1** rests — **home**ᵗ,
at ease. **4** and **5** are the bright roads *away*: 4 steps out and breathes; **5** leans
hard for home, a held breath before you walk back in. And **6** — the **tender cousin**,
softer-lit; Old Rue would nod. Home lives right inside it (its **1** and **3**), which is why
6 never sounds lost, only tender."
*Stage:* the four stacks (1·3·5 / 4·6·1 / 5·7·2 / 6·1·3) + ▶ 1→4→1 and ▶ 5→1 (home glows
teal on arrival).
> Note: "home lives inside it (its 1 and 3)" — identity again, not "middle trunk" (which
> conflicts with the diagram). Ties straight back to Beat 6.

**8. Read the Grove** *(drill intro)*
"Enough talk — glass is for looking *through*. I'll **walk** a chord, then **ring** it, and
you'll answer on the **stack**: tap the numbers you hear. Wrong trunks cost nothing here;
glass forgives — it only asks you to look again. Three tries with me, and we start low."
*Stage:* demo — Sylva plays the 1 chord (walk + ring); the stack circles 1·3·5 by itself.

---

## The 3 coached drills
**Mechanic:** Sylva plays a chord from {1, 4, 5, 6} — **walk (arpeggio low→high), then ring
(block)** in drills 1–2. Player answers on a `SessionStack` (tap degrees to circle them).
Wrong picks trigger the forgiving reveal (true tones glow, chord re-walks); replays never
count. **Ramp: root only → the two upper voices (root given) → all three from the block.**

> Correctness note: because `playChord` voices chords in **root position**, the **lowest /
> first note of the walk is always the root** (4 for the 4-chord, 6 for the 6-chord, etc.).
> Drill 1 copy must point at the note **heard first / lowest**, NOT "the bottom of the stack"
> (which is always degree 1). Wording below is written to that.

**Drill 1 — The Ground Voice** *(pool 1/4/5 · walk→ring · tap ONE: the root)*
- Listen: "Softly now. I'll **walk** it low to high, then let it **ring**. Fix on the **first
  voice** — the lowest one, the trunk the others grow from."
- Prompt: "Which number sang **first and lowest**? That's the **root** — tap it on the stack."
- Wrong: "Not that trunk — no shame; glass only asks you to look again. Hear it once more —
  the first, lowest voice is glowing. Let your ear rest **down**."
- Win: "You found the ground — and the ground is the chord's **name**, measured from home.
  The rest is just looking up."

**Drill 2 — Two Trunks Up** *(pool 1/4/5/6 · root pre-circled as "given" · tap the OTHER TWO)*
- Listen: "This time I give you the ground — see it, already circled. **Walk** with me, then
  stand in the ring and find the **two voices above it**."
- Prompt: "Two rungs are still dark. Which two numbers are ringing? Tap them both."
- Wrong: "Close — one voice slipped behind another. Here it is alone… now inside the chord.
  Hear how it was there all along?"
- Win: "Both of them, clean. You're not guessing — you're **standing inside the chord** and
  turning your head."

**Drill 3 — Clear as Glass** *(all four · BLOCK first, ▶ Walk it help button, no penalty · tap all THREE)*
- Listen: "Last one — I'll ring it **all at once**, the way songs will give it to you. If the
  blur comes, don't fight it: tap **Walk it** and I'll take you through, trunk by trunk."
- Prompt: "Three voices, each in its own place. Tap **all three numbers**."
- Wrong: "Almost through — one pane's fogged. Watch while I walk it; the missing voice is
  glowing. Breathe, and look again."
- Win: "You heard every voice in the chord. **Clear as glass.**" *(her canon win line)*

## Send-off
"The **Glasswood** is yours to wander, traveler. **Walk** when you must, **ring** when you're
ready — and when every grove shows you clean through, the **Left Wing of Excalibar** will
catch the light like nothing else in this forest."

---

## Implementation plan (verified against current source)

**Chassis (small, mirrors how Rue's chapter was added):**
- Add a 3rd `TUT_CFG` entry (~L1945): `chords: { key:"C", mode:"major", flag:"tut3",
  kind:"chord", pool:["I","IV","V","vi"], spriteAlt:"Sylva", sceneClass:"tut-glass",
  nameTab:"Sylva of the Glasswood", loc:"the Glasswood" }`. Add a `kind` field to all three
  ("note" for major/minor, "chord" for Sylva) to branch the drill logic.
- Gate (`enterStage`, ~L3071): add `if (n.id === 3 && loadPref("tut3","0") !== "1") {
  startTutorial("chords", 3); return; }` right after Rue's node-2 gate.
- Beats: add a `sylvaBeats` array (the 8 above); change `const beats = isMinor ? rueBeats :
  verdaBeats` (~L4250) to a 3-way switch on `tutChapter`.
- Replay list `TUTS` (~L3175): add `{ chapter:"chords", flag:"tut3", icon:"🌲", title:"The
  Glasswood", sub:"Sylva · chords — 1·4·5·6" }`.
- `build.sh` (~L69/L229): inline `keepers/keeper_sylva_south.png` → `window.SYLVA_SPRITE`;
  the tutorial keeperSrc pick (~L4147) selects it for `tutChapter === "chords"`.

**Reused as-is:** `GuideStack` (L1143), `SessionStack` (L1200, has picked/correct/wrong),
`playChord` (L389, block+arp), `playChordStack`/`playStackNote` (L2368), `playProgression`
(beat 7's 1→4→1 / 5→1), `chordTones` + `CHORDS` (theory.mjs), and the whole coached-drill
shell (gen-guard, forgiving reveal, celebration, advance — L1970-2015).

**The one genuinely new piece — the CHORD drill path.** Today's `startTutDrill`/`answerTutDrill`
are single-note (`playSemi` + single-pc answer). Branch on `tutCfg.kind === "chord"`:
- target = a roman from the pool; play `playCadence` then **walk+ring** via `playChord`
  (needs an arp-first-then-block ordering — a small `playChord` option or a two-call helper).
- answer surface = `SessionStack` + the degree numpad; reuse the real chord session's
  pick/toggle + set-comparison (`chPicked` / `toggleChordPick` / the `checkChordSession`
  compare) — the tutorial drill is literally a gentle, coached round of the chord session the
  player is about to enter. Ramp = required-pick count (1 → 2 with root pre-circled → 3).
- This is the bulk of the work but it's WIRING existing chord-session machinery into the
  drill mode, not new logic.

**Small new visuals:** (a) beat 6 side-by-side kin stacks + shared-rung strand; (b) beat 4
"5th → 1·home" label toggle; (c) `home`/`highlight` degree-glow on `GuideStack` (beats 4/6/7
— `ExploreMap` already has a `home` prop to copy); (d) beat 3 multi-chord ladder cycler.
None require new audio.

## Theory check (all verified against src/theory.mjs CHORDS)
1=[1,3,5] · 4=[4,6,1] · 5=[5,7,2] · 6=[6,1,3]; `FOUR = ["I","IV","V","vi"]` = the taught set.
- Beat 4: 1 is the **fifth** of the 4 chord (IV = F·A·C, C=1). ✓
- Beat 6: 1 ∩ 6 = **{1,3}** (two shared); drop the 5, add the 6 → home becomes the 6 chord. ✓
- Beat 7: home lives inside 6 as its **1 and 3**. ✓
- Drills: root = lowest/first voice heard (root-position voicing) — copy points at audio, not
  the stack's visual bottom. ✓
