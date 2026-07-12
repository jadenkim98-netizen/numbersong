# Onboarding Tier 2 — Celebration Copy Spec

Wireable replacement strings for the two biggest first-session moments (tutorial
graduation + first region win), plus light polish for the shared victory chrome.
Voice: WeJam / Harmonia codex — warm, playful, teacher-y; myth carrying the method.

**THE CODA RULE.** Coda never speaks. No dialogue, no captions in Coda's voice.
Coda appears and *hums only* — rendered as musical glyphs (♪ ♩ ♫) and/or a stage
direction. All words belong to Verda or to neutral screen chrome. Coda's beats
below are stage directions for the existing sprite (`window.CODA_VICTORY`).

---

## Hook A — Tutorial graduation (`done` state, after the 3 coached drills)

**Intent:** This is the first time in their life the player has named notes by
ear. Land the awe, hand them the one law, open the door. Replaces the current
"The map is yours" beat 1:1 — same three code elements, plus one Coda beat.

| Code element | Replacement string |
|---|---|
| **stage title** | `Home rang true` |
| **Verda's line** | `Do you feel that? You heard a note and knew its name — no page, no chart, just your own ear finding its way home. Travelers cross all of Harmonia without ever learning what you just did. The meadow is yours now: wander it, tap anything, and carry the one law with you — every note stands somewhere from 1, and 1 never moves.` |
| **button** | `Step into Harmonia ▸` |

**Coda beat** *(stage direction, plays with the title or as Verda finishes)*:

> *(Coda hops once, goes very still, and hums the 1 — low, warm, certain — a
> wordless blessing on the road ahead.)* ♪

---

## Hook B — First win screen (Region 1 / Staircase Meadows, first clear ever)

**Intent:** Highest-stakes moment in onboarding. Make it feel like the real
thing (because it was), let the myth do the celebrating, then hand off gently to
the free-PDF card below — a gift for the road, never a pitch. Per-keeper
**title** ("Verda's mark earned!") and **quote** ("Like you never left home.")
are untouched. Frag chip untouched.

**REPLACES existing chrome (first win only — later wins use Hook C):**

| Code element | First-win replacement |
|---|---|
| **kicker** | `✦ Your first fragment ✦` |
| **counter** | `1 / 8 — the blade begins` |

**NEW elements (first win only):**

| New element | String |
|---|---|
| **first-win line** *(new; renders under the frag chip, above the counter)* | `That wasn't practice. You stood in a real region of Harmonia and named its notes by ear — the same way you'll cross every region from here. Seven keepers just looked up.` |
| **hand-off line** *(new; renders directly above the email/PDF card)* | `Verda tucked one more thing into your pack for the road — it's just below.` |

**Coda beat** *(stage direction, on screen enter, with the victory sprite)*:

> *(Coda leaps onto the pommel gem and hums a tiny fanfare — 1, 3, 5, then home
> again on 1 — no words in it, none needed.)* ♪♫♪

*Optional future slot:* reserve a spot between the first-win line and the
counter for an embedded celebration video (not designed here).

---

## Hook C — Shared victory chrome polish (every region clear)

**Intent:** Light refresh only; keep it punchy and mythic. Per-keeper title and
quote stay exactly as written.

| Code element | Current | Replacement |
|---|---|---|
| **kicker** | `✦ Fragment forged ✦` | `✦ A piece comes home ✦` |
| **counter** | `{n} / 8 fragments` | `{n} / 8 — the blade remembers` |
| **score hint (passed)** | `Passed! This level is checked off.` | `Passed — this trial is yours for keeps.` |
| **score hint (not yet)** | `{n}% on first tries earns the check. Every rep counts.` | `{n}% on first tries earns the mark. Every listen sharpens the ear.` |

---

*Implementation notes:* Hook B's kicker/counter replacements apply only when
this is the player's first-ever region clear (the same condition that shows the
email card); all other clears fall through to Hook C strings. Coda beats are
presentation-only — sprite + glyphs, no text balloon, no VO.
