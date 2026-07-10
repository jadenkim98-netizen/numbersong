# Numbersong Soundtrack — chiptune score for Harmonia

Original compositions, Tone.js-ready. Four themes + a drill recommendation.
Everything lives in the C-major / A-minor world of the SFX and fanfares, and
every theme quotes or leans on the **♭VI–♭VII–I "Excalibar cadence"**
(Ab → Bb → C) so the music and the fanfares feel like one score.

## Sound direction at a glance

| # | Theme | Where | Key | BPM | Loop | Mood |
|---|-------|-------|-----|-----|------|------|
| 1 | **Excalibar Awaits** | boot / menu | C major | 104 | 8 bars (~18.5 s) | warm, inviting, quietly heroic |
| 2 | **Wind over Harmonia** | overworld map | C major (Mixolydian tint) | 92 | 16 bars (~41.7 s) | adventurous, gentle, non-fatiguing |
| 3 | **Still Water** | Dojo / Free Play | C pentatonic | 60 | 8 bars (32 s) | calm, meditative, mostly silence |
| 4 | **The Blade Remembers** | victory / results | C major | 120 | 8 bars one-shot (16 s) | triumphant, plagal afterglow |
| 5 | *(drill)* | sessions | — | — | — | **silence** (see last section) |

Instrument voices follow the house style: `triangle` for warmth, `square` for
lead sparkle, `sine` for bass/bells. All volumes sit at **−13 to −22 dB** so
music stays under the SFX (−17), the sung voice, and the piano (−2).

---

## Shared plumbing (for the `useMusic` hook)

- **Use `Tone.Transport`.** Nothing else in the app touches it (the path loop
  uses its own setTimeout clock; sessions use `sessTimer`), so the music
  engine can own it outright. Transport-scheduled `Tone.Part`s with exact
  `loopEnd` values are what make the loops seamless — never setTimeout.
- **One music bus.** Route every music synth through a single gain →
  destination. Ducking, crossfades, and the on/off toggle are then one ramp:

  ```js
  const musicBus = new Tone.Gain(0.9).toDestination();
  // duck:    musicBus.gain.rampTo(0.25, 0.4)
  // fade out: musicBus.gain.rampTo(0, 0.8) then Transport.stop(); dispose parts
  ```

- **Theme switch pattern:** ramp bus to 0 (0.5–0.8 s) → `Transport.stop()`,
  `Transport.cancel()`, dispose the old theme's synths/parts → set the new
  theme's `Transport.bpm.value` → build + `.start(0)` the new parts →
  `Transport.start("+0.05")` → ramp bus back up. (Same dispose-and-rebuild
  philosophy as `stopAll()`.)
- **Event format below:** `{ time, note, dur }` for `Tone.Part`
  (`time` is `"bar:beat:sixteenth"`, `note` may be an array for a block
  chord); plain note arrays with a subdivision for `Tone.Sequence`.
- **Generic player** (works for every theme in this file):

  ```js
  function playTheme(T) {
    Tone.Transport.bpm.value = T.bpm;
    const built = {};
    for (const [name, spec] of Object.entries(T.synths)) {
      built[name] = spec.poly
        ? new Tone.PolySynth(Tone.Synth, spec.opts).connect(musicBus)
        : new Tone.Synth(spec.opts).connect(musicBus);
      built[name].volume.value = spec.opts.volume;
    }
    const parts = Object.entries(T.parts).map(([name, events]) => {
      const p = new Tone.Part((t, ev) =>
        built[name].triggerAttackRelease(ev.note, ev.dur, t), events);
      p.loop = !!T.loopEnd; if (T.loopEnd) p.loopEnd = T.loopEnd;
      return p.start(0);
    });
    if (T.sequences) for (const [name, s] of Object.entries(T.sequences)) {
      const q = new Tone.Sequence((t, n) =>
        built[name].triggerAttackRelease(n, s.dur, t), s.notes, s.subdivision);
      q.loop = !!T.loopEnd; parts.push(q.start(0));
    }
    Tone.Transport.start("+0.05");
    return { built, parts }; // keep for dispose on switch
  }
  ```

---

## 1 · Title / menu — "Excalibar Awaits"

C major, 104 bpm, 4/4, **8-bar seamless loop (~18.5 s)**. Three parts:
square lead, triangle bass, triangle arpeggio. The melody opens on **1-2-3-5**
(the teaching ramp itself — degrees climbing home to the dominant), and bars
7–8 walk the full **Ab → Bb → C** Excalibar cadence, so every loop "reforges
the sword" in miniature. Harmony: `C | Am | F | G | C | Am | Ab Bb | C`.

```js
const TITLE_THEME = {
  bpm: 104,
  loopEnd: "8:0:0",           // 8 bars, all parts loop here
  synths: {
    lead: { opts: { oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.3, release: 0.15 },
      volume: -16 } },
    bass: { opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.12 },
      volume: -14 } },
    arp:  { opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.09, sustain: 0.1, release: 0.1 },
      volume: -21 } },
  },
  parts: {
    lead: [
      // bar 0 (C) — the 1-2-3-5 motif
      { time: "0:0:0", note: "C5", dur: "4n" },
      { time: "0:1:0", note: "D5", dur: "4n" },
      { time: "0:2:0", note: "E5", dur: "4n" },
      { time: "0:3:0", note: "G5", dur: "4n" },
      // bar 1 (Am)
      { time: "1:0:0", note: "A5", dur: "4n." },
      { time: "1:1:2", note: "G5", dur: "8n" },
      { time: "1:2:0", note: "E5", dur: "2n" },
      // bar 2 (F)
      { time: "2:0:0", note: "F5", dur: "4n" },
      { time: "2:1:0", note: "G5", dur: "4n" },
      { time: "2:2:0", note: "A5", dur: "4n" },
      { time: "2:3:0", note: "C6", dur: "4n" },
      // bar 3 (G)
      { time: "3:0:0", note: "B5", dur: "2n" },
      { time: "3:2:0", note: "G5", dur: "4n" },
      { time: "3:3:0", note: "D5", dur: "4n" },
      // bar 4 (C) — motif restated
      { time: "4:0:0", note: "C5", dur: "4n" },
      { time: "4:1:0", note: "D5", dur: "4n" },
      { time: "4:2:0", note: "E5", dur: "4n" },
      { time: "4:3:0", note: "G5", dur: "4n" },
      // bar 5 (Am) — climbing
      { time: "5:0:0", note: "A5", dur: "4n" },
      { time: "5:1:0", note: "B5", dur: "4n" },
      { time: "5:2:0", note: "C6", dur: "2n" },
      // bar 6 (Ab | Bb) — the Excalibar cadence, rising thirds like the fanfare
      { time: "6:0:0", note: "Ab5", dur: "4n" },
      { time: "6:1:0", note: "C6",  dur: "4n" },
      { time: "6:2:0", note: "Bb5", dur: "4n" },
      { time: "6:3:0", note: "D6",  dur: "4n" },
      // bar 7 (C) — landing; beat 4 rests so the loop breathes
      { time: "7:0:0", note: "C6", dur: "2n." },
    ],
    bass: [
      { time: "0:0:0", note: "C2",  dur: "2n" }, { time: "0:2:0", note: "G2",  dur: "2n" },
      { time: "1:0:0", note: "A2",  dur: "2n" }, { time: "1:2:0", note: "E2",  dur: "2n" },
      { time: "2:0:0", note: "F2",  dur: "2n" }, { time: "2:2:0", note: "C3",  dur: "2n" },
      { time: "3:0:0", note: "G2",  dur: "2n" }, { time: "3:2:0", note: "B2",  dur: "2n" },
      { time: "4:0:0", note: "C3",  dur: "2n" }, { time: "4:2:0", note: "G2",  dur: "2n" },
      { time: "5:0:0", note: "A2",  dur: "2n" }, { time: "5:2:0", note: "E2",  dur: "2n" },
      { time: "6:0:0", note: "Ab2", dur: "2n" }, { time: "6:2:0", note: "Bb2", dur: "2n" },
      { time: "7:0:0", note: "C2",  dur: "1n" },
    ],
  },
  sequences: {
    // straight 8ths, one bar per line — 64 notes = 8 bars, loops with the parts
    arp: { subdivision: "8n", dur: "16n", notes: [
      "C4","E4","G4","E4","C4","E4","G4","E4",     // C
      "A3","C4","E4","C4","A3","C4","E4","C4",     // Am
      "F3","A3","C4","A3","F3","A3","C4","A3",     // F
      "G3","B3","D4","B3","G3","B3","D4","B3",     // G
      "C4","E4","G4","E4","C4","E4","G4","E4",     // C
      "A3","C4","E4","C4","A3","C4","E4","C4",     // Am
      "Ab3","C4","Eb4","C4","Bb3","D4","F4","D4",  // Ab | Bb
      "C4","E4","G4","C5","G4","E4","G4","C5",     // C — closing lift
    ] },
  },
};
```

**Transitions:** starts after the boot chime finishes (~1.4 s delay reads as
"the cartridge booted, now the title screen sings"). Crossfade to the map
theme on entering the overworld (0.6 s out / 0.6 s in).

---

## 2 · Map — "Wind over Harmonia"

The most-heard track, so it is deliberately **soft-edged and long**: triangle
lead (no square buzz to fatigue the ear), walking triangle bass, and a
whisper-quiet square "wind chime" that only answers in the melody's rests.
C major, 92 bpm, **16-bar seamless loop (~41.7 s)** — long enough that the
repeat doesn't register. Bar 14's **Bb (♭VII)** is the wanderer's chord: one
foot outside the key, the way the fanfare comes home from outside.

Harmony (1 chord/bar):
`C G Am F | C Em F G | Am Em F C | Dm Bb Gsus4→G C`

```js
const MAP_THEME = {
  bpm: 92,
  loopEnd: "16:0:0",
  synths: {
    lead:  { opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.3 },
      volume: -15 } },
    bass:  { opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.55, release: 0.2 },
      volume: -17 } },
    chime: { opts: { oscillator: { type: "square" },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0, release: 0.2 },
      volume: -22 } },
  },
  parts: {
    lead: [
      // phrase A (bars 0–3): question…
      { time: "0:0:0",  note: "E5", dur: "4n." },
      { time: "0:1:2",  note: "G5", dur: "8n" },
      { time: "0:2:0",  note: "A5", dur: "4n" },
      { time: "0:3:0",  note: "G5", dur: "4n" },
      { time: "1:0:0",  note: "D5", dur: "2n." },          // …breathe (chime answers)
      { time: "2:0:0",  note: "C5", dur: "4n." },
      { time: "2:1:2",  note: "D5", dur: "8n" },
      { time: "2:2:0",  note: "E5", dur: "4n" },
      { time: "2:3:0",  note: "G5", dur: "4n" },
      { time: "3:0:0",  note: "A5", dur: "2n." },
      // phrase A' (bars 4–7): the answer, falling home
      { time: "4:0:0",  note: "G5", dur: "4n." },
      { time: "4:1:2",  note: "E5", dur: "8n" },
      { time: "4:2:0",  note: "D5", dur: "4n" },
      { time: "4:3:0",  note: "C5", dur: "4n" },
      { time: "5:0:0",  note: "B4", dur: "2n." },
      { time: "6:0:0",  note: "A4", dur: "4n." },
      { time: "6:1:2",  note: "C5", dur: "8n" },
      { time: "6:2:0",  note: "D5", dur: "4n" },
      { time: "6:3:0",  note: "E5", dur: "4n" },
      { time: "7:0:0",  note: "D5", dur: "2n." },
      // phrase B (bars 8–11): over the hills
      { time: "8:0:0",  note: "A5", dur: "4n." },
      { time: "8:1:2",  note: "G5", dur: "8n" },
      { time: "8:2:0",  note: "E5", dur: "4n" },
      { time: "8:3:0",  note: "G5", dur: "4n" },
      { time: "9:0:0",  note: "B5", dur: "2n." },
      { time: "10:0:0", note: "A5", dur: "4n." },
      { time: "10:1:2", note: "G5", dur: "8n" },
      { time: "10:2:0", note: "F5", dur: "4n" },
      { time: "10:3:0", note: "E5", dur: "4n" },
      { time: "11:0:0", note: "G5", dur: "2n." },
      // phrase B' (bars 12–15): the wanderer's turn (Bb) and home
      { time: "12:0:0", note: "F5", dur: "4n." },
      { time: "12:1:2", note: "E5", dur: "8n" },
      { time: "12:2:0", note: "D5", dur: "4n" },
      { time: "12:3:0", note: "F5", dur: "4n" },
      { time: "13:0:0", note: "D5", dur: "4n." },          // Bb bar
      { time: "13:1:2", note: "C5", dur: "8n" },
      { time: "13:2:0", note: "Bb4", dur: "4n" },
      { time: "13:3:0", note: "D5", dur: "4n" },
      { time: "14:0:0", note: "C5", dur: "2n" },           // Gsus4…
      { time: "14:2:0", note: "B4", dur: "2n" },           // …resolves
      { time: "15:0:0", note: "C5", dur: "2n." },          // home; beat 4 rests
    ],
    bass: [
      // root (dotted half) + walking note (beat 4) per bar
      { time: "0:0:0",  note: "C2",  dur: "2n." }, { time: "0:3:0",  note: "G2", dur: "4n" },
      { time: "1:0:0",  note: "G2",  dur: "2n." }, { time: "1:3:0",  note: "B2", dur: "4n" },
      { time: "2:0:0",  note: "A2",  dur: "2n." }, { time: "2:3:0",  note: "E2", dur: "4n" },
      { time: "3:0:0",  note: "F2",  dur: "2n." }, { time: "3:3:0",  note: "C3", dur: "4n" },
      { time: "4:0:0",  note: "C3",  dur: "2n." }, { time: "4:3:0",  note: "G2", dur: "4n" },
      { time: "5:0:0",  note: "E2",  dur: "2n." }, { time: "5:3:0",  note: "B2", dur: "4n" },
      { time: "6:0:0",  note: "F2",  dur: "2n." }, { time: "6:3:0",  note: "C3", dur: "4n" },
      { time: "7:0:0",  note: "G2",  dur: "2n." }, { time: "7:3:0",  note: "D3", dur: "4n" },
      { time: "8:0:0",  note: "A2",  dur: "2n." }, { time: "8:3:0",  note: "E3", dur: "4n" },
      { time: "9:0:0",  note: "E3",  dur: "2n." }, { time: "9:3:0",  note: "B2", dur: "4n" },
      { time: "10:0:0", note: "F2",  dur: "2n." }, { time: "10:3:0", note: "C3", dur: "4n" },
      { time: "11:0:0", note: "C3",  dur: "2n." }, { time: "11:3:0", note: "D3", dur: "4n" },
      { time: "12:0:0", note: "D3",  dur: "2n." }, { time: "12:3:0", note: "C3", dur: "4n" },
      { time: "13:0:0", note: "Bb2", dur: "2n." }, { time: "13:3:0", note: "A2", dur: "4n" },
      { time: "14:0:0", note: "G2",  dur: "2n." }, { time: "14:3:0", note: "B2", dur: "4n" },
      { time: "15:0:0", note: "C2",  dur: "1n" },
    ],
    chime: [
      // tiny high answers, only in melody rests — the wind over the grass
      { time: "1:2:0",  note: "E6", dur: "8n" }, { time: "1:3:0",  note: "D6", dur: "8n" },
      { time: "5:2:0",  note: "D6", dur: "8n" }, { time: "5:3:0",  note: "B5", dur: "8n" },
      { time: "7:2:0",  note: "G6", dur: "8n" },
      { time: "11:2:0", note: "E6", dur: "8n" }, { time: "11:3:0", note: "G6", dur: "8n" },
      { time: "15:2:0", note: "C6", dur: "8n" },
    ],
  },
};
```

**Transitions:** the default state — everything crossfades back to this.
Keep it playing under the encounter card (the Keeper speaks over it); fade it
fully out (0.8 s) the moment a session starts. `sfx()` blips sit fine on top.

---

## 3 · Dojo / Free Play — "Still Water"

Two parts only, and more silence than sound. A sine "kalimba" noodles the
C-pentatonic scale (C D E G A — every note the student can play in C sits
comfortably over it); a triangle pad breathes open fifths underneath.
60 bpm, **8-bar loop (32 s)**. This is a room, not a song.

```js
const DOJO_THEME = {
  bpm: 60,
  loopEnd: "8:0:0",
  synths: {
    pluck: { opts: { oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.4 },
      volume: -16 } },
    pad:   { poly: true, opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 1.5 },
      volume: -22 } },
  },
  parts: {
    pluck: [
      { time: "0:0:0", note: "E4", dur: "4n" },
      { time: "0:1:0", note: "G4", dur: "4n" },
      { time: "0:2:0", note: "A4", dur: "2n" },
      { time: "1:2:0", note: "G4", dur: "4n" },
      { time: "1:3:0", note: "E4", dur: "4n" },
      { time: "2:0:0", note: "D4", dur: "2n" },
      { time: "3:1:0", note: "C4", dur: "4n" },
      { time: "3:2:0", note: "D4", dur: "4n" },
      { time: "3:3:0", note: "E4", dur: "2n" },
      { time: "4:0:0", note: "G4", dur: "2n" },
      { time: "4:2:0", note: "A4", dur: "4n" },
      { time: "4:3:0", note: "C5", dur: "4n" },
      { time: "5:0:0", note: "A4", dur: "2n." },
      { time: "6:0:0", note: "G4", dur: "4n" },
      { time: "6:1:0", note: "E4", dur: "4n" },
      { time: "6:2:0", note: "D4", dur: "2n" },
      { time: "7:0:0", note: "C4", dur: "2n." },   // home; last beat is silence
    ],
    pad: [
      // open fifths, two bars each — four gentle breaths per loop
      { time: "0:0:0", note: ["C3", "G3"], dur: "1n" },
      { time: "1:0:0", note: ["C3", "G3"], dur: "1n" },
      { time: "2:0:0", note: ["A2", "E3"], dur: "1n" },
      { time: "3:0:0", note: ["A2", "E3"], dur: "1n" },
      { time: "4:0:0", note: ["F2", "C3"], dur: "1n" },
      { time: "5:0:0", note: ["F2", "C3"], dur: "1n" },
      { time: "6:0:0", note: ["C3", "G3"], dur: "1n" },
      { time: "7:0:0", note: ["C3", "G3"], dur: "1n" },
    ],
  },
};
```

**Transitions — important:** Still Water is pinned to C, but Free Play lets
the student change key, start the drone, or run a Path loop. So: play it on
*entering* the Dojo, then **fade it out (0.6 s) the moment the student makes
sound** — first held note, `startDrone`, or `startPathLoop` — and optionally
fade back in after ~10 s of idle. It's the sound of the empty dojo; when the
student plays, the room goes quiet and listens.

---

## 4 · Victory — "The Blade Remembers"

**One-shot cue, 8 bars at 120 bpm (~16 s), no loop.** Opens by singing the
Excalibar cadence itself (Ab → Bb → C) as a melody this time, then takes a
warm victory lap through F and A minor and lands on a whole-note high C.
Plays on the results screen *after* `fanfare()` / `grandFanfare()` has rung
out (delay ~2.5 s so they never overlap), then crossfades back to the map
theme. If you'd rather have results-screen bed music, bars 4–7 loop cleanly
on their own (`loopStart:"4:0:0"`, `loopEnd:"8:0:0"`).

```js
const VICTORY_THEME = {
  bpm: 120,
  loopEnd: null,               // one-shot; do not loop parts
  synths: {
    lead: { opts: { oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.35, release: 0.3 },
      volume: -14 } },
    harm: { poly: true, opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.5, release: 0.6 },
      volume: -18 } },
    bass: { opts: { oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
      volume: -13 } },
  },
  parts: {
    lead: [
      // bars 0–2: the cadence, sung — Ab rise, Bb rise, land on 5
      { time: "0:0:0", note: "Ab4", dur: "4n" },
      { time: "0:1:0", note: "C5",  dur: "4n" },
      { time: "0:2:0", note: "Eb5", dur: "2n" },
      { time: "1:0:0", note: "Bb4", dur: "4n" },
      { time: "1:1:0", note: "D5",  dur: "4n" },
      { time: "1:2:0", note: "F5",  dur: "2n" },
      { time: "2:0:0", note: "G5",  dur: "1n" },
      // bar 3: pickup run into the lap
      { time: "3:2:0", note: "G4", dur: "8n" },
      { time: "3:2:2", note: "A4", dur: "8n" },
      { time: "3:3:0", note: "B4", dur: "8n" },
      { time: "3:3:2", note: "D5", dur: "8n" },
      // bars 4–7: victory lap — F, Am, F→G, big C
      { time: "4:0:0", note: "C5", dur: "4n." },
      { time: "4:1:2", note: "A4", dur: "8n" },
      { time: "4:2:0", note: "F5", dur: "2n" },
      { time: "5:0:0", note: "E5", dur: "4n." },
      { time: "5:1:2", note: "D5", dur: "8n" },
      { time: "5:2:0", note: "C5", dur: "2n" },
      { time: "6:0:0", note: "F5", dur: "4n" },
      { time: "6:1:0", note: "A5", dur: "4n" },
      { time: "6:2:0", note: "B5", dur: "4n" },
      { time: "6:3:0", note: "D6", dur: "4n" },
      { time: "7:0:0", note: "C6", dur: "1n" },
    ],
    harm: [
      { time: "0:0:0", note: ["Ab3", "C4", "Eb4"], dur: "1n" },
      { time: "1:0:0", note: ["Bb3", "D4", "F4"],  dur: "1n" },
      { time: "2:0:0", note: ["C4", "E4", "G4"],   dur: "1n" },
      { time: "3:0:0", note: ["C4", "E4", "G4"],   dur: "2n" },  // clears for the run
      { time: "4:0:0", note: ["F3", "A3", "C4"],   dur: "1n" },
      { time: "5:0:0", note: ["A3", "C4", "E4"],   dur: "1n" },
      { time: "6:0:0", note: ["F3", "A3", "C4"],   dur: "2n" },
      { time: "6:2:0", note: ["G3", "B3", "D4"],   dur: "2n" },
      { time: "7:0:0", note: ["C4", "E4", "G4", "C5"], dur: "1n" },
    ],
    bass: [
      { time: "0:0:0", note: "Ab2", dur: "1n" },
      { time: "1:0:0", note: "Bb2", dur: "1n" },
      { time: "2:0:0", note: "C2",  dur: "1n" },
      { time: "3:0:0", note: "C2",  dur: "2n" },
      { time: "4:0:0", note: "F2",  dur: "1n" },
      { time: "5:0:0", note: "A2",  dur: "1n" },
      { time: "6:0:0", note: "F2",  dur: "2n" },
      { time: "6:2:0", note: "G2",  dur: "2n" },
      { time: "7:0:0", note: "C2",  dur: "1n" },
    ],
  },
};
```

**Sequencing on a region clear:** `fanfare()`/`grandFanfare()` fires exactly
as today (it's the moment of forging) → ~2.5 s later this cue plays once at
the results screen → on "← To the map", crossfade into "Wind over Harmonia".
On a *non*-clear results screen, skip the cue; just return to the map theme.

---

## 5 · Drill sessions — the recommendation is **silence**

Don't put a bed under the drills. Three reasons, in order of weight:

1. **Sessions transpose.** Level 5+ melody drills move to random keys every
   session (or every *question*). Any pitched bed lives in one key; a C-major
   bed under an Eb-major question actively fights the tonal center the
   cadence just planted. That's not neutral — it's anti-teaching.
2. **The signal IS audio.** The student is discriminating one piano note and
   one sung number. Every added spectrum masks a little of both, and triangle
   and sine — our whole palette — sit in exactly the piano's register.
3. **Silence is the game feel.** In the encounter fiction, the map music
   fading out as the Trial begins *is* the drama: the meadow goes quiet, the
   Keeper listens. The trial gauge, blips, and fanfare carry the arc.

So: fade the map theme fully out (~0.8 s) before `playCadence`, keep music
off for the whole session, and let the fanfare/victory cue be the first
music the student hears again. The contrast makes the victory land harder.

**If some sound is ever wanted** (teacher toggle, "focus pulse"), the only
safe option is unpitched and nearly subliminal — never on by default:

```js
// optional, default OFF — a heartbeat, not music (no pitch content to clash)
const FOCUS_PULSE = {
  synth: { type: "MembraneSynth", opts: { octaves: 2, pitchDecay: 0.03, volume: -32 } },
  pattern: "quarter notes at 72 bpm, velocity 0.4, only while streak >= 5",
};
```

---

## Transition map (summary for `useMusic`)

```
boot chime ─▶ TITLE (menu, loops)
   menu → map .......... crossfade 0.6s → MAP (loops; stays under encounter card)
   map → session ....... MAP fades out 0.8s BEFORE playCadence → SILENCE
   session → results ... (region cleared) fanfare/grandFanfare → +2.5s VICTORY once
                         (not cleared)   stay silent
   results → map ....... crossfade → MAP
   menu/map → dojo ..... crossfade 0.6s → DOJO (loops)
   dojo: student makes sound (hold note / drone / path loop) → DOJO fades 0.6s;
         optionally returns after ~10s idle
   music toggle OFF .... musicBus.gain.rampTo(0, 0.4); Transport keeps or stops — either
```

All four themes share the C-major/A-minor world of the SFX, so any blip,
cadence, or fanfare landing on top of them is consonant by construction.
