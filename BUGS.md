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

## 🟡 Open — Tier 3 (minor / polish)
11. Magic-link unlock is **case-sensitive** (`code === UNLOCK_CODE`) and leaves the code in the URL on mismatch, while the typed-in-Settings unlock is case-insensitive.
12. **Enter-key double-submit** on the lead email input — only the button is disabled, so Enter (no `leadStatus === "sending"` guard) can fire two ConvertKit POSTs.
13. Lead **"sending" state** during a resend from the "saved" card matches neither the done nor saved branch → the card flips back to the entry form mid-retry.
14. **Quick correct-after-miss replays the target over the resolution** — the miss path schedules `replayTarget()` at 650ms with a stale `phase`/`busy` closure; a correct answer within 0.65s replays the note over the walk-home and unsets `busy` mid-resolution.
15. **Tutorial-drill timer/audio leak** — no abort check across the `playCadence` await, and a fixed 2900ms advance vs the `3×resStep+0.7s` (≥3.1s) resolution → Skip during "Listen…" still plays and re-arms `tutTimerRef`; a correct degree-3 drill starts the next cadence ~200ms before the resolution finishes (worse at Slow speed).
16. **`stopAll` doesn't dispose `sfx`/`fanfare`/`boot` synths** — their future-scheduled notes survive teardown (fanfare plays over the next screen). Possibly intended so celebrations finish — product call.

**Dropped (won't-fix):** a `retro` `classList.toggle(undefined)` when `window.HARMONIA` is absent — unreachable in shipped builds (`build.sh` always inlines HARMONIA).
