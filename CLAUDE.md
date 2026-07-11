# Numbersong

A functional ear-training web app built around Jojo's teaching method: every note
and chord is heard, named, and seen as a NUMBER of the current key (scale degree),
never as an interval from a chord root. "Home never moves."

## Project layout

- `src/number-ear-trainer.jsx` — the app: one React component file (data, audio
  engine, screens, CSS-in-JS = the "Boring mode" base skin). Most edits land here.
- `retro/retro.css` — the retro/GBA skin, layered on the app's real class names and
  gated under a `.retro` root. `build.sh` inlines it into `<head>` as
  `<style id="retro-skin">`; the pixel font is embedded from `retro/pixelfont.b64`.
  **This is a real, separately-edited file** — the boot/intro art, per-answer reward,
  celebrations, and freemium UI (upsell/CTA/locks) live here, NOT in the JSX. (The old
  "only file you edit is the JSX" note was wrong.)
- `retro/soundtrack.js` — the chiptune soundtrack data. `adventure/assets.js` — the
  Harmonia world-map / keeper data (`window.HARMONIA`). Both inlined by build.sh.
- `voice/0/`, `voice/4/`, `voice/8/` — Jojo's voice singing numbers 1–7 plus a
  high "one" (file `8.mp3`), pitch-corrected. Folder names are the semitone base
  of the recorded key: 0 = C major, 4 = E major, 8 = Ab major. At runtime the app
  picks the set nearest the current key so the voice never shifts more than
  2 semitones.
- `build.sh` — compiles the JSX with esbuild and assembles a fully standalone
  `index.html` with the voice mp3s embedded as base64. Run it after every edit.
- `index.html` — the build output. This single file IS the deployable app.

## Build & preview

```
./build.sh          # rebuild index.html
open index.html     # view in browser
```

Requires node (npx fetches esbuild automatically) and python3. No npm install,
no dev server, no package.json — deliberately.

## Architecture notes

- Runtime libraries (React 18 UMD, ReactDOM, Tone.js 14) are vendored into
  `vendor/` (committed) and inlined into index.html by build.sh — NOT loaded from
  a CDN — so the app works offline and on networks that block cdnjs. A service
  worker (`src/sw.js`, emitted to the site root with a per-build timestamp
  version) caches the shell for full offline use; it also runtime-caches the
  cross-origin piano samples best-effort. Piano = Tone.Sampler with
  Salamander samples fetched from tonejs.github.io; falls back to a synth offline.
  Sample buffers are cached as NATIVE AudioBuffers in `buffersRef` so the
  instrument can be disposed & rebuilt by `stopAll()` (that rebuild is how
  scheduled-but-unplayed notes get cancelled when the user quits a session).
- Sung voice is monophonic by design: each new number stops the previous player.
- Session engine: `sess` ref holds mutable state; ALL session timeouts must go
  through `sessTimer()` so `killSession()` can clear them. Never use a bare
  setTimeout for anything that plays audio or advances a session.
- Screens: home | guide | levels | session | results | learn (= "Free play").
- Progress persists in localStorage key `numbersong-progress` (wrapped in
  try/catch; must degrade gracefully where storage is unavailable).
- Melody levels follow the FET-style progression: C-major-only → any octave →
  one random non-C key per session → new random key every question.
- Chord sessions display "stack notation" (degrees 7→1 vertically, chord tones
  circled), NOT the tonal map. Melody sessions use the proportional tonal map
  (degrees at true semitone positions, dots = chromatic gaps).
- Sing tuner (Free Play → "7 worlds" tab, "🎤 Sing" toggle): live mic feedback
  layered onto the same pads. `toggleMic` requests getUserMedia ON THE TAP (iOS
  requires the user gesture) and hangs an AnalyserNode off Tone's own
  `getContext().rawContext` — never routed to the destination, so no feedback
  loop. A rAF loop (throttled to ~18/s; the ACF is O(n²), don't run it every
  frame) calls `detectPitch` (autocorrelation + parabolic interpolation, no new
  library — keeps the single-file rule) then `pitchToDegree`, which maps Hz →
  nearest scale degree of the current key + cents, OCTAVE-AGNOSTIC (a low 3 and a
  high 3 both light the 3 pad). The sung degree lights its pad(s) via `singDeg`/
  `singInTune` props threaded through both `ExploreMap` and `PianoMap` (`.singing
  .in` green ring ≤±25¢, `.singing.off` orange), plus a cents readout. `stopMic`
  stops the tracks + cancels the rAF; it's called on toggle-off, on leaving
  Free Play or the 7-worlds tab, and on unmount — same teardown discipline as
  sessions. Denied permission sets `micErr` and shows an inline note, no crash.

## Design conventions (WeJam brand)

- Palette: bg #383D3B, card #424845, line #565D59, text #EDF2EE,
  green #6ABF5E (correct/GO), blue #7CADD1 (selection/chord tones),
  teal #57C6C4 (tonic — always wears the ✳ star), wrong #E07856.
- Type: Archivo Black for numbers/headings, Archivo for UI.
- The tonic is visually special everywhere (teal + star). Chord tones of the
  selected "world" show blue. Upper octave displays as "1", never "8"
  (degree 8/9 exist only internally for audio math).
- Voice & tone of UI copy: warm, playful, teacher-y ("Like we never left home.").

## Freemium funnel (public app vs. students)

The public app is the top of a lead-gen funnel for the "Effortless Improvisation
Accelerator"; paying students run the SAME build fully unlocked. All tunables are one
config block near the top of `src/number-ear-trainer.jsx`:

- `OFFER_URL` — the VSL/booking link (the upsell + "Want more?" CTA open it).
- `UNLOCK_CODE` — students unlock via `?unlock=<CODE>` (magic link, strips itself from
  the URL) or by typing it in Settings → "Full access". Both set `numbersong-unlocked`
  AND `numbersong-onboarded` in localStorage. Soft gate (client-side, bypassable) — by
  design; hard entitlement would need accounts + a backend.
- `CONVERTKIT_FORM` + `CONVERTKIT_KEY` — the public api_key (safe client-side) for the
  ConvertKit v3 `/forms/{id}/subscribe` POST. **If blank, the email step stores the
  lead in `numbersong-lead` locally and skips the network** — those leads never reach
  you, so set these before driving real traffic.
- `FREE` — what a gated player can reach: `melodyGroups` (Single-Notes groups from the
  start; group 0 = Diatonic·major), `adventureRegions`, `freePlayPaths`.

Entitlement helpers in the component: `unlocked`/`onboarded` state, `gated` (= !unlocked),
`isMelodyFree(idx)`, `isRegionFree(nodeIdx)`. Gating lives at navigation ENTRY points
(level rows, world/chapter pickers, adventure `onTapNode`, Free-Play Build) — never in
the session engine, so a free Adventure region can still launch a drill that's locked in
Basic Training. Locked taps call `openUpsell()`; the upsell modal + CTA + all locks
render only when `gated`.

First-run flow (new game-mode player): animated boot/intro ("The Map Sings" + Coda) →
`bootAdvance()` routes a fresh public player into **Verda's tutorial** (`screen==="tutorial"`,
gated on the `numbersong-tut` flag; unlocked students & returning players skip to
`adventure`). The tutorial (Fable "JRPG Cutscene" look; `VERDA_SPRITE` = green-robe
`verda.png`, inlined by build.sh) = 6 teaching beats reusing the guide widgets
(`DegreeLadder`/`GuideStack`/`playPhrase`/`playTwoFiveOne`) → **3 coached in-cutscene
drills** (`tutMode==="drill"`: play a note via `playCadence`+`playSemi`, listen→feel→
name, forgiving reveal, celebration) → out to the **map**. Then the normal loop: play a
region → a one-time skippable email card on the FIRST `results` screen (win-first) →
`onboarded`. `?lock` also clears `tut`. (The old session-Q1 `tutorialActive` coaching is
now dead/unused — the in-cutscene drills replaced it.)

## Deploying

Live on GitHub Pages at https://jadenkim98-netizen.github.io/numbersong/,
served from the committed `docs/` folder on `main`. `build.sh` rebuilds the
standalone `index.html` and copies it (with `manifest.json`, `icon.png`, and a
`.nojekyll` marker) into `docs/`; commit and push to `main` and Pages redeploys
itself — no manual upload. Root `index.html`/`manifest.json` are gitignored;
the tracked build copies live in `docs/` (GitHub Pages) and `dist/` (kept as a
pre-built drag-drop copy for any static host). The build is fully self-contained
(libraries and assets inlined) plus a service worker, so after one online load
the app boots and runs with zero internet; the sampled piano caches after one
online session, otherwise it falls back to the synth.

## Known future directions (discussed, not built)

- Onboarding Tier 2: a guided, Coda/keeper-narrated dialogue tutorial (coach marks,
  scripted first encounter) + a polished win screen with an embedded video.
- Solfège voice recordings as an alternative to numbers
- Tappable stack as the chord-answer input
- Accounts/backend for real (server-side) entitlement + teacher-visible student
  progress — would replace the current soft client-side unlock.

(Done since first draft: level locking + freemium funnel; the intro/boot glow-up;
minor keys, chromatic, chord tones, chord progressions.)
