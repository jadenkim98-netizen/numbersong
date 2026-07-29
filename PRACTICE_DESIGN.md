# Practice Architecture — design doc

Applying the methodology in *The Art of Practice* (Laido Dittmar) to Numbersong.
This is the map of what to build, in what order, and what to deliberately leave out.

Source: `~/Downloads/art-of-practice-coach-knowledge (1).md`.

> **Status (2026-07-28):** Phase 1 (the ear-log spine) and Phase 2 (feature **B**, the
> weak-link engine) are **built and verified** — see §6. Features A, C, D, E, F are
> still design only. §7's open question 1 was decided: the ear log records for gated
> players.

---

## 1. Why

The book's central claim: **plateaus are structure problems, not effort problems.**
"Naturals" aren't more talented — they structure practice differently, and the
structure is copyable.

Numbersong currently has excellent *content* (58 hand-authored levels across a
four-axis difficulty ramp) and essentially **no practice structure**. Worse, three
of its existing mechanics actively produce the failure mode the book names as the
enemy. That's the opportunity: the fixes are cheap, and they turn the app from a
content library into something that does the one thing a human teacher can't do
between lessons — hold the architecture of a student's practice and make the
invisible visible.

---

## 2. Diagnosis — where the current design fights the method

### 2.1 The player picks their own difficulty, with no guidance

Every level is tappable from the start; the only lock is the freemium wall
(`locked = gated && …`, `jsx:4652`). Region clear keys off the **capstone level
alone** (`stageClearedAdv`, `jsx:4002-4007`), so the ramp is already skippable.

The book's "Drift" says unsupervised practitioners slide into comfortable
structure without noticing. A 58-item list with no recommendation guarantees it.
Note the fix is *not* to add sequential locks — the book wants players testing
walls above them (§5, the Emotional Estimation Trap). The fix is to **make a
recommendation** so difficulty selection stops being the player's job.

### 2.2 The star economy pays for exactly the wrong thing

`starsForLevelBest` (`app-flow.mjs:27-34`):

| best first-tries (of 20) | stars |
|---|---|
| < 16 | 0 |
| 16 (the 80% pass) | ★ |
| 19 | ★★ |
| **20 (perfect)** | **★★★** |

So the entire reward gradient from 80% → 100% pays for polishing the last 10% —
which §4 says "takes 2–3× longer than the first 90% and no longer generates
enough stress to force adaptation. Advanced students plateau precisely because
they polish instead of climb."

Stars are also the Shop currency (`totalStarsForProgress` → `starBalance()`
`jsx:2570` → Coda skins, `SHOP` `jsx:151`), so this can't be changed in isolation.

### 2.3 The app is blind

The entire save format (`loadProgress`, `jsx:159-168`):

```js
{ melody: { [levelIdx]: bestFirstTries }, chords: {…}, progressions: {…} }
```

Three sparse maps of integer → integer. **No timestamps, no history, no
per-note accuracy, no response times.** Everything the app learns about a
player's ear is computed live and discarded when they leave the results screen.

Consequences: it cannot identify a weak link (§7), cannot schedule a step-back
(§4), cannot run the monthly difficulty-vs-variety audit (§7), cannot place a
skill in the Waterfall (§6). **Every advanced idea in the book requires a data
spine that does not exist.** This is the gating dependency.

### 2.4 There is no session architecture

A session = 20 questions (`SESSION_LEN`) at one frozen difficulty. No onramp, no
new-level-first ordering, no stabilization pass, no descending-difficulty tail.
The `pool`/`keyMode`/`octaves` are constants for the whole run.

### 2.5 What already works and should be kept

- **Keeper Duels are pressure-proofing (§9), already shipped.** Timer escalation,
  hearts, real stakes, no progress on loss (`boss.mjs`, `bossTimer:284`). The book
  asks for scheduled low-stakes exposure and failure-point analysis; the duel is
  the exposure. What's missing is the *analysis* — a lost duel currently teaches
  the player nothing (`bossLose` `jsx:3547` just kicks to the map).
- **Wrong-answer handling is already teaching, not just marking.** Echo the note
  they pressed → replay the target → after 2 misses reveal and name it
  (`jsx:3760-3776`). Good. Keep.
- **The four difficulty axes are a real ladder** (pool → octaves → one new key →
  new key every question) and map cleanly onto §4's progression ladders.

---

## 3. The two enabling primitives

Almost everything below reduces to these. Build them once.

### 3.1 The ear log (data spine) — **prerequisite for features B, D, E, F**

New localStorage key `numbersong-ear`. Bounded and aggregate-only — never an
unbounded event list.

```js
{
  v: 1,
  // per-target rolling stats. n = melody (by pitch class), c = chords (by roman),
  // p = progressions (by roman, aggregated across slots)
  n: { "9": { seen: 41, first: 24, miss: { "7": 9, "11": 4 }, ms: 2100, last: <ts> } },
  c: { "V": { … } },
  p: { … },
  // per-level history — this is what makes step-backs and the waterfall possible
  lvl: { "melody:12": { last: <ts>, first: <ts>, best: 17, plays: 3 } },
  // last ~30 sessions, for the monthly ceiling audit
  s: [ { ts, mode, lvl, q, first, ceiling } ]
}
```

Two changes feed it:

1. **Record the wrong answer.** `jsx:3761` already knows the `pc` the player
   pressed and throws it away. Change `s.results.push({ target, firstTry })`
   (`jsx:3732`, `:3800`, `:3849`) to also carry `answered`, `key`, `octave`, `ms`.
2. **Persist an aggregate at `finishSession`** (`jsx:3630-3684`), next to the
   existing `mergeBestProgress` call.

**Rolling window / forgetting:** on write, if `seen > 40`, halve `seen`, `first`,
and every `miss` count. Cheap exponential decay so the weak link reflects the
player's *current* ear, not their first week.

**Constraint — gated players.** `canSave()` (`jsx:2584`) means progress only
persists after an email or unlock. Decide deliberately:
- *Recommended:* let the ear log write **regardless of `canSave()`**. It's
  anonymous, it's not "progress" (no stars, no stage clears), and it's what makes
  the free experience feel like a coach — which is the funnel's whole job. The
  email gate stays on stars/stage-clears exactly as today.
- Risk if we don't: a gated player never gets a weak-link diagnosis, so the single
  most differentiating feature is invisible to the audience we're trying to convert.

### 3.2 Difficulty as a function of question index — **prerequisite for A, B, C**

Today a level object's `pool` / `keyMode` / `octaves` are constants for all 20
questions. Make them resolvable per question:

```js
// src/practice.mjs (new pure module — same convention as theory/pitch/boss/app-flow)
export function shapeForQuestion(lvl, qNum, live) → { pool, keyMode, octaves }
```

Backed by an optional `lvl.phases = [{ n: 12, pool: [...] }, { n: 6, … }, …]`.
Call sites: `nextQuestion` (`jsx:3558-3615`), `pickMelodyTarget` /
`pickChordRoman` / `pickOctave` (`app-flow.mjs:102-118`), `chooseSessionKey`
(`app-flow.mjs:59`).

This one primitive unlocks the onramp, the 60/30/10 split, and live flow-zone
escalation. **No new session engine is needed for any of it** — `startSession(mode,
null, customLvl)` (`jsx:3395`) is already a fully general generator, as the Custom
builder proves (`jsx:4560`).

---

## 4. The features

Ordered by leverage. Each names the book principle it implements.

### A — "Today's practice": the inverted session  *(§3, the Naturals Method)*

**Principle.** The order IS the method, and it inverts what everyone does
naturally: long warm-up → comfortable material → new work last, when willpower is
gone. The book says installing the inverted order is *always the first habit*.

**What it is.** One button that builds the whole session. The player stops
choosing.

```
TODAY · ~6 min
────────────────────────────────
① Onramp        5q   climb fast to your ceiling, 90% per rung, perfect nothing
② NEW LEVEL     8q   ← the thing 10–15% above you, while energy is high
③ Stabilize     5q   60/30/10 on what you passed most recently
④ Routines      2q   mastered material, hardest first, descending
────────────────────────────────
→ "What can you do now that you couldn't this morning?"
```

**Implementation.** `planSession(earLog, progress) → [{ kind, lvl, n }]` in
`src/practice.mjs`, pure and unit-tested. Each entry is a `customLvl`; the phases
concatenate into one 20-question run via §3.2, so it's a single session, one
results screen.

**In-world.** The Dojo tile already exists on the map (`jsx:1602`, `:1952`) and
currently opens Free Play. Make the Dojo the training hall: "Today's practice" on
top, Free Play below it.

**Cost.** Medium. The planner is the new logic; the session engine is untouched.

---

### B — The weak-link engine  *(§7, Skill Deconstruction + the 60/30/10 split)*

**Principle.** When a skill stalls, break it into components, find the weak link,
and train **60% isolated / 30% integration / 10% whole-skill**. "Practicing the
whole skill lets strengths mask the real problem."

**Why this is the highest-value idea in the book for us.** Finding a weak link is
the hardest part of the method — the book's own answers are video review and
expert feedback, both slow and unavailable between lessons. In ear training the
app can compute it exactly, from data it already generates and throws away:

> **Your weak link: 6.** You hear it as 5, 41% of the time.

No human teacher can produce that from memory. This is the most defensible thing
Numbersong could ship.

**Selection.** Among targets with `seen ≥ 8`, lowest `first/seen`; confuser =
argmax of the `miss` map. Ties broken by recency.

**The drill** (20 questions, generated as a phased `customLvl`):

**Stimulus ≠ response.** Narrowing what can be *answered* is the trap: offer two
notes and two pads and a coin flip scores 50%, so the task stops being "name it
among seven" and becomes binary discrimination — easier, different, and it doesn't
transfer. So the answer surface is always the full pool, and the phases weight only
what gets *played*. Oversampling rather than restricting also keeps the weak note
interleaved with the others, which retains better than a blocked run of one note.

| Phase | n | What's played |
|---|---|---|
| Compare | 12 | 75% of questions are the weak note or its confuser |
| Integrate | 6 | 35% are the weak note; everything else fills the rest |
| Whole | 2 | the level's own distribution, unassisted |

**Then track the shift.** §7: "When the weak link is fixed, the next-weakest
becomes the target — track that shift per skill." Keep a short history of resolved
weak links; it's the most motivating progress artifact in the whole design
("you used to confuse 6 and 5 — that's gone").

**In-world.** A keeper diagnoses your *cracked note*. Verda hears it in the
meadow; Bassil hears it in the caves. Fits the existing keeper-as-teacher frame
exactly.

**Also fixes the lost duel.** `bossLose` currently teaches nothing. Give it the
failure-point analysis the book asks for (§9): "You lost your footing on 7 — three
times." A loss becomes diagnostic instead of just punitive.

**Cost.** Medium — but it's mostly the §3.1 spine, which is needed anyway.

---

### C — Reprice the stars + the 90% push  *(§4, the 90% Consistency Rule)*

**Principle.** Practice to ~90%, then move up 10–15%. The last 10% resolves
almost free later, via the step-back (§4) and the Preservation Paradox (§2).

**Change.**

**✅ BUILT** (`STAR3_RATE` in `app-flow.mjs`). The curve, verified in the app:

| best (of 20) | stars before | stars now |
|---|---|---|
| 15 (75%) | 0 | 0 |
| 16 (80%) | ★ | ★ |
| 17 (85%) | ★ | ★★ |
| 18 (90%) | ★ | **★★★** |
| 19 (95%) | ★★ | ★★★ |
| 20 (100%) | ★★★ | ★★★ — polishing earns nothing extra |

Star 2 sits halfway between the pass bar and 90%. Thresholds are clamped so the
curve stays monotonic on the 3-question TEST/JOJO sessions where the rates collide.

**Shop rebalance (done in the same change).** Stars are Shop currency and
`starBalance()` is *derived* from progress, so the new curve retroactively raises
every existing player's balance. Measured against a spread of scores, income rose
exactly **+50%**, so prices rose to match: Gilded 12 → 18, others 8 → 12. Retune
`SHOP` and `STAR3_RATE` together or neither.

**Still not built (the other half of C):** the *climb* reward — a bonus star the
first time you clear the next rung up. Repricing removes the bad incentive; that
would add the good one.

**Explicitly dropped:** a keeper line scolding the player for replaying a level
they're already at ≥90% on. The book's coach talks that way to a student who asked
for a coach; a game that nags you for enjoying a level you're good at just reads as
rude. The scoring curve already makes the point without saying it out loud.

---

### D — Step-backs as map quests  *(§4, Two Steps Forward One Step Back)*

**Principle.** After pushing a harder skill to 90%, return to the earlier one —
its impossible last 10% now resolves nearly on its own. Step-backs are
**scheduled, not optional**; students always forget them, so the coach flags them.

**What it is.** Needs only the `lvl.last` timestamp from §3.1. When a level was
passed 2–3 weeks ago and the player has since cleared two rungs above it, the map
surfaces a summons:

> **Return to Lowmoor Fen.** The wall you couldn't pass is now a doorway.

The player collects a near-free win and *feels* the Preservation Paradox rather
than being told it. This is the single best fit between the book and the JRPG
frame — it makes revisiting a region a quest instead of backtracking.

**Cost.** Small, once §3.1 exists. Renders on the existing adventure map
(`jsx:4177`).

---

### E — Flow-zone escalation inside a session  *(§5 + §2, the 99% Theory)*

**Principle.** Flow sits ~10–15% above current skill. Below it: boredom and zero
adaptation. And: "if 99% of today's practice matches yesterday's, improvement is
~1% a day at best."

**What it is.** Difficulty stops being frozen for 20 questions. Four first-tries
in a row → widen the pool, or jump octave, or change key *mid-session*. Two misses
in a row → narrow back. Every session self-tunes toward the player's real edge,
and no two sessions are identical.

This also fixes something structural: the four difficulty axes are currently
authored as 8 discrete rungs per world. Live escalation makes the ladder
continuous, so a player is never stuck between two rungs.

**Cost.** Small-medium, given §3.2 (`shapeForQuestion(lvl, qNum, live)` already
takes `live`).

---

### F — The results screen answers the Natural's Question  *(§2, Progress Mindset + the Memory Trap)*

**Principle.** "Never measure practice in time. The only end-of-session question
that counts: *what can you do now that you couldn't do this morning?*" And: judge
progress **monthly, never daily** — daily results are noise.

**Change.** The results screen (`jsx:5140-5317`) currently leads with `17/20 ·
85%`. Lead instead with the capability delta:

> **You can now name 7 in any key.** You couldn't this morning.

Keep the score below the fold. The per-target bars already computed at
`jsx:5167-5173` become permanent (they're currently discarded), and a monthly
view shows the **difficulty ceiling** trend — which doubles as §7's
difficulty-vs-variety audit: *did your ceiling actually rise, or did you add
sideways variety?* The app can compute that honestly, because `ceiling` is in the
session log.

**Cost.** Small-medium. Mostly copy and one new view.

---

## 5. Deliberately NOT taking from the book

- **Daily streaks.** Tempting and conventional, but §2's Memory Trap argues
  directly against daily judgment ("the bamboo grows roots for years, then three
  feet a day"). A broken streak also punishes the rest day the book endorses.
  Monthly progress views instead.
- **The goal-setting onboarding interrogation (§10).** The methodology wants a
  dated, ≥8/10-intensity goal *before* anything else. We know from PostHog that
  **43% of first-run players already quit during the 9-beat cutscene** (commit
  `7879d4b`). Front-loading questions would deepen the leak we're currently trying
  to close. If goal-setting ever ships, it goes *after* the first win — where the
  email card already sits (`jsx:5269`).
- **Time-budgeted session templates (§3's 60/30 min tables).** Numbersong sessions
  are ~5 minutes on a phone. Port the *order*, not the clock.
- **The full coach persona.** The book's coach is a chat partner. Numbersong's
  equivalent is the keepers, who should stay in character and terse. Diagnosis
  delivered as keeper dialogue, not as a dashboard lecture.

---

## 6. Phasing

**Phase 1 — the spine. ✅ BUILT.** §3.1 ear log + §3.2 per-question shape, both in
`src/practice.mjs` with 26 unit tests in `test/practice.test.mjs`.

**Phase 2 — the weak-link engine (B). ✅ BUILT.** Diagnosis card on the results screen
and at the top of Basic Training; the 60/30/10 drill ("Mending 6"); the in-session
phase caption; the lost-duel fold (`foldEarLog` is called from `bossLose`, so a defeat
now teaches). Plus the **"Your ear" screen** — the full breakdown behind the headline:
every note and chord worst-first with its confusion, and a Mend button per row so the
player can drill any target rather than only the diagnosed one. Keeper-voiced delivery
is the deferred half — currently plain app voice.

Two things worth knowing for whoever picks this up:

- **The stimulus/response trap, twice.** First the pads read the static `lvl.pool`
  while targets came from the phase pool, so a focused target landed on a disabled pad
  and wedged the question. The fix — point the pads at the phase pool — was wrong in
  the other direction: it shrank the answer surface to two options and made the drill
  a coin flip. The real answer is that these are *different pools*: pads always full,
  stimulus weighted. Any future phased content (the onramp in A, escalation in E) must
  weight the stimulus and leave the response alone.
- **`TEST_MODE` is forced true on localhost** (`jsx:141`), so a local session is 3
  questions, not 20. Use `?notest` to see real session lengths. This also means
  `splitPhases` must degrade cleanly below 3 questions — it does, and it's tested.

**Phase 3 — "Today's practice" (A).** The behavior change: players stop choosing.
Needs Phase 1's data to pick a New Level target sensibly.

**Phase 4 — star reprice (C) ✅ BUILT** (threshold + Shop rebalance; the climb bonus
and the grinding nudge are still open). **Step-backs (D)** remain — small, and the
`lvl.last` timestamp they need is already being written by the ear log.

**Phase 5 — flow-zone escalation (E) + the monthly view (F).**

**Next up, and the highest-value remaining use of the ear log:** weight *ordinary*
sessions toward weak notes, not just drills. Same `drawPoolForQuestion` mechanism
with a gentle share (~15–20%), applied to every level. No new UI — sessions just
quietly ask you 6 more often until 6 stops being a problem, which turns the ear log
from a report you visit into something that shapes practice on its own. After that:
Keeper Duels drawing their questions from your weak notes, and a scheduled *recheck*
a few days after a drill (§4's step-back, applied to notes instead of levels).

C is the cheapest and could jump the queue if we want a quick win — it's the only
item that removes an incentive currently working *against* the goal.

---

## 7. Open questions

1. **Does the ear log write for gated players?** (§3.1) Recommendation: yes.
   Needs an explicit call — it's a funnel decision, not a technical one.
2. **Does "Today's practice" replace level-picking or sit beside it?** The book
   would say replace (the Drift lives in the choice). Safer: make it the default
   and prominent, keep the list one tap away.
3. **Shop rebalance under the new star curve** — inflate prices, or convert to a
   separate "climb" currency?
4. **Do regions 5–8 need weak-link support before or after the four tutorial
   regions?** Only regions 1–4 have keepers who could deliver a diagnosis in
   character; 5–8 have duels but no tutorial voice.
5. **localStorage budget.** The ear log is a few KB — fine — but `numbersong-progress`
   and the ear log should share a migration path with a `v` field from day one.

---

## 8. How to verify (per phase)

- `./test.sh` — `src/practice.mjs` gets a `test/practice.test.mjs` alongside the
  existing pure-module suites. The planner and weak-link selector are pure
  functions with obvious table-driven tests (feed a synthetic ear log, assert the
  chosen weak link and the 12/6/2 phase split).
- `./build.sh && open index.html` — the standard loop.
- `?test` for 3-question sessions while checking session shape; `?jojomode` for a
  pre-filled progress state to exercise step-backs and the waterfall without
  playing 58 levels.
- Seed a synthetic `numbersong-ear` in the console to test diagnoses without
  grinding misses by hand.
- **Clear the gate flags after browser testing** — `numbersong-unlocked`,
  `numbersong-onboarded`, `numbersong-saveok`, `numbersong-tut*`. A leftover
  `unlocked=1` silently changes what the funnel renders. `?lock` does the full
  reset (`jsx:2692`).
- PostHog: new events should mirror the existing naming
  (`weak_link_shown`, `practice_today_start`, `stepback_accept`), and
  `TRACKING.md` is already stale by 5 events — update it in the same pass.
