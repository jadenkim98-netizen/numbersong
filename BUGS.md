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

## 🟠 Open — Tier 2 (real correctness bugs / leaks)
6. **`ensure()` has no in-flight guard** (in `useAudio`) · MED — concurrent callers (boot tap + the warm effect ~400ms later) both pass `!synthRef.current` during the multi-second Salamander sample fetch → 13 mp3s fetched twice, an orphan `Tone.Sampler` left connected forever (leak), and the SUNG_NUMBERS/MINOR_VOICE base64→decode pass runs twice.
7. **`checkChordSession` / `checkProgression` register the `advance()` timer only after an `await`, with no `sessGenRef` staleness check** (unlike `nextQuestion`, which was hardened) · MED — answer correctly while the AudioContext is suspended (iOS call/Siri), then hit Quit → the answer chord plays post-quit and `advance()` fires into the dead session (teleport to results / corrupt a freshly restarted session).
8. **Quit-during-load cadence escapes `stopAll`** · MED — `playCadence` schedules its chords before the gen-token check can run, and `stopAll` can't cancel because `synthRef.current` is still null at quit → cadence plays ~2.4s over the menu/map on a dead session.
9. **Stale-`unlocked` boot listener** · MED — the boot `keydown`/`pointerdown` listeners capture the first-render `bootAdvance`, whose `unlocked` is stale (deps `[screen, sfx]` never change; `grantUnlock` never sets the `tut` pref). A student opening `?unlock=<CODE>` who taps the boot screen is routed into Verda's beginner tutorial instead of the map.
10. **`stopMusic` dispose race** · LOW-MED — its 720ms delayed dispose doesn't check `nameRef`, so it can stop/dispose a theme that `playTheme` built in the meantime (build fires ~+520ms), leaving `nameRef` set so subsequent `playTheme("map")` calls early-return → map/levels music goes permanently silent after a fast screen double-tap, until some other `stopMusic` resets `nameRef`.

---

## 🟡 Open — Tier 3 (minor / polish)
11. Magic-link unlock is **case-sensitive** (`code === UNLOCK_CODE`) and leaves the code in the URL on mismatch, while the typed-in-Settings unlock is case-insensitive.
12. **Enter-key double-submit** on the lead email input — only the button is disabled, so Enter (no `leadStatus === "sending"` guard) can fire two ConvertKit POSTs.
13. Lead **"sending" state** during a resend from the "saved" card matches neither the done nor saved branch → the card flips back to the entry form mid-retry.
14. **Quick correct-after-miss replays the target over the resolution** — the miss path schedules `replayTarget()` at 650ms with a stale `phase`/`busy` closure; a correct answer within 0.65s replays the note over the walk-home and unsets `busy` mid-resolution.
15. **Tutorial-drill timer/audio leak** — no abort check across the `playCadence` await, and a fixed 2900ms advance vs the `3×resStep+0.7s` (≥3.1s) resolution → Skip during "Listen…" still plays and re-arms `tutTimerRef`; a correct degree-3 drill starts the next cadence ~200ms before the resolution finishes (worse at Slow speed).
16. **`stopAll` doesn't dispose `sfx`/`fanfare`/`boot` synths** — their future-scheduled notes survive teardown (fanfare plays over the next screen). Possibly intended so celebrations finish — product call.

**Dropped (won't-fix):** a `retro` `classList.toggle(undefined)` when `window.HARMONIA` is absent — unreachable in shipped builds (`build.sh` always inlines HARMONIA).
