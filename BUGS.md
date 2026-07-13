# Numbersong — Known Bug Backlog

From the 2026-07-12 Fable adversarial audit of `src/number-ear-trainer.jsx` (four finder
agents, several cross-confirmed). **Line numbers drift as the file changes — locate by
function name / symptom, not line.** Fix these on Opus; the Fable audit already spent that budget.

---

## ✅ Fixed & shipped (Tier 1 — launch-blockers)
1. Results **"Next level →" paywall bypass** → now gated (mirrors the level-row rule).
2. **Hot mic** — `toggleMic` re-tap during the permission prompt leaked a live stream → added `micBusyRef` in-flight guard (2nd tap cancels).
3. **Custom-drill builder ungated** → gated.
4. **`FREE.freePlayPaths` never enforced** → Paths preset dropdown now locks past the free count.
5. **Converted lead re-nagged / double-subscribe** → `submitLead` persists the `onboarded` pref.

---

## ✅ Fixed (Tier 2 — real correctness bugs / leaks) · 2026-07-13, Opus
6. **`ensure()` has no in-flight guard** (in `useAudio`) → heavy one-time init (Salamander fetch + voice decode) memoised behind `initRef`; concurrent callers share one load. `Tone.start`/`resume` still run every call; a failed init resets the ref to allow retry.
7. **`checkChordSession` / `checkProgression` register `advance()` after an `await` with no `sessGenRef` check** → capture `gen` at the top, bail after the await before scheduling `advance()` (mirrors `nextQuestion`).
8. **Quit-during-load cadence escapes `stopAll`** → added `audioGenRef`, bumped by `stopAll`; `playCadence`/`playChord`/`playProgression` capture it before `await ensure()` and return `0` if it changed, so a quit during load can't play onto a dead session.
9. **Stale-`unlocked` boot listener** → added `unlocked` to the boot effect deps so a `?unlock=<CODE>` student re-registers a fresh `bootAdvance` and routes to the map, not the tutorial.
10. **`stopMusic` dispose race** → its delayed teardown now bails if `nameRef.current !== null` (a `playTheme` landed during the fade), so it can't dispose a freshly-built theme and strand `nameRef` → no more permanently-silent map music.

_Committed to `main` on Opus; deploys on the next push + `docs/` rebuild._

---

## ✅ Fixed (Tier 3 — minor / polish) · 2026-07-13, Opus
11. **Magic-link unlock case-sensitive + code left in URL on mismatch** → `?unlock=` now compares case-insensitively (matches the Settings unlock) and strips the code from the URL even on a mismatch.
12. **Enter-key double-submit on the lead email** → `submitLead` guards on a `leadBusyRef` in-flight flag, so repeat Enter / double-tap can't fire two ConvertKit POSTs. _(landed on `main` via the parallel unlock/UX work)_
13. **Lead "sending" resend flipped the saved card back to the entry form** → the saved card persists during a resend (`leadSavedRef`), instead of falling through to the form mid-retry. _(landed with #12)_
14. **Quick correct-after-miss replayed the target over the resolution** → `replayTarget` now tests live `phaseRef`/`busyRef`, so a correct answer within 0.65s cancels the pending miss-replay instead of playing the note over the walk-home.
15. **Tutorial-drill timer/audio leak** → added `tutGenRef` (bumped on skip/graduate) so an in-flight `startTutDrill` bails after the cadence await (no note/timer leaking onto the map); the post-win advance is derived from the real resolution length (`resolutionSemis…×resStep+0.7`) instead of a too-short fixed 2900ms.

_#11/#14/#15 fixed on Opus via the `tier3` worktree (merged clean); #12/#13 via the parallel unlock/UX branch. Deploys on the next push + `docs/` rebuild._

## 🚫 Won't-fix
16. **`stopAll` doesn't dispose `sfx`/`fanfare`/`boot` synths** — their future-scheduled notes survive teardown. **Intended** (product call, 2026-07-13): these are short one-shot celebration sounds; the brief bleed reads as the celebration finishing, and disposing them would cut a fanfare off mid-cheer. The session-audio bleed that *did* matter is handled by the piano rebuild + the Tier 2 `audioGenRef` guard.

**Dropped (won't-fix):** a `retro` `classList.toggle(undefined)` when `window.HARMONIA` is absent — unreachable in shipped builds (`build.sh` always inlines HARMONIA).
