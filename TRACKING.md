# Numbersong — error + usage tracking

Two tools, both **bundled offline into `index.html`** (no CDN), both **off by default**:

- **Sentry** — runtime crash reporting (stack traces, grouping). Errors only; no perf/replay.
- **PostHog** — light funnel/usage analytics. Explicit events only (no autocapture, no
  session recording, cookieless).

They share one **anonymous client id** (`numbersong-cid`, random, no PII) so a crash in
Sentry can be lined up with what the player did in PostHog.

## Turn it on (the only manual step)

Tracking no-ops until you fill three constants at the top of
`src/number-ear-trainer.jsx` (the config block, next to `CONVERTKIT_*`). Blank = the SDKs
aren't even bundled, so there's zero weight/cost when off.

1. **Sentry** → create a project (platform: *Browser / JavaScript*) → Settings → Client
   Keys (DSN) → copy the **DSN** → set `SENTRY_DSN`.
2. **PostHog** → create a project → Settings → **Project API Key** (starts `phc_`) → set
   `POSTHOG_KEY`. Set `POSTHOG_HOST` to `https://us.i.posthog.com` (US) or
   `https://eu.i.posthog.com` (EU) — whichever region you signed up in.
3. In PostHog project settings, enable **"Discard client IP data"** (IP is collected
   server-side by default; this keeps it anonymous / low-GDPR-risk).
4. `./build.sh` and deploy. That's it — the SDKs now inline and start reporting.

Both keys are **public client-side tokens** (safe to commit/inline, same as
`CONVERTKIT_KEY`). Free tiers cover thousands of users; watch Sentry's ~5k errors/mo (spike
protection is on by default).

## Events captured

`boot_advance` (→ tutorial|adventure) · `tutorial_drills_start` · `tutorial_skip` ·
`tutorial_complete` · `region_enter` · `session_start` · `session_finish`
(first_tries, passed) · `lead_submit` (outcome: sent|saved|invalid_email — **never the
email**) · `upsell_open` · `offer_click` · `unlock`. Errors are auto-captured by Sentry.

## Letting a Claude read it (the point)

Connect a Claude Code session to the **Sentry MCP** and **PostHog MCP**, then ask e.g.
"top unresolved Sentry issues with stack traces this week" or "PostHog funnel
region_enter → session_finish → lead_submit" and have it propose/apply fixes.

## Notes / future

- **Source maps:** the build isn't minified (`build.sh:18`), so stack traces already carry
  real function names. Precise line/col mapping (esbuild `--sourcemap` + Sentry release
  upload) is an optional later add.
- **`track()`** lives next to `savePref` in the JSX — a silent, never-throws wrapper over
  `posthog.capture`. Add a funnel event with one `track("name", {props})` line; never pass
  email or free-text PII as a property.
