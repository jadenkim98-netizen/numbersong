import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import * as Tone from "tone";
import {
  KEYS,
  DEGREE_SEMITONES,
  SOLFEGE,
  NUMBER_WORDS,
  degreeLabel,
  NOTE_LABELS,
  NOTE_SOLFEGE,
  ALTERED_PCS,
  NAT_PCS,
  ALL12,
  PC_TO_DEGREE,
  DEGREE_TO_PC,
  mod12,
  tonicPcOf,
  CADENCES,
  CHORDS,
  DEGREE_QUIPS,
  RES_MAJOR,
  RES_MINOR,
  resolutionSemis,
  ALT_QUIPS,
  DEGREE_QUIPS_MINOR,
  ALT_QUIPS_MINOR,
  CHORD_INSIGHTS,
  SESSION_LEN,
  FINAL_LEN,
  PASS_RATE,
  buildGroup,
  MELODY_LEVELS,
  MELODY_GROUPS,
  groupIndexOf,
  levelTags,
  randKey,
  chordTones,
  CHORD_QUALITY,
  SEVENTH_SYMBOL,
  chordSymbol,
  chordQuality,
  CHORD_NUMBER,
  CHORD_NUMBER_7,
  chordNumber,
  ALL_CHORDS,
  chordByRoman,
  FOUR,
  FOUR_MINOR,
  chordRamp,
  CHORD_LEVELS,
  CHORD_CHAPTERS,
  chordChapterIndexOf,
  CURATED_4,
  CURATED_4_MINOR,
  randomProgression,
  pickProgression,
  progRamp,
  PROG_LEVELS,
  PROG_CHAPTERS,
  progChapterIndexOf,
  ADV_STAGES,
  advGroupOf,
  stageGoal,
  PATH_PRESETS,
  PATH_ROWS,
  PATH_SPEEDS,
  KEY_MAP,
  levelsFor,
} from "./theory.mjs";
import { detectPitch, pitchToDegree } from "./pitch.mjs";



/* ─────────────────────────  FUNNEL / FREEMIUM CONFIG  ─────────────────────────
   The public app is a lead-gen funnel; paying students flip an "unlocked" flag
   (magic link ?unlock=<CODE>, or the code typed in Settings) to get the full,
   funnel-free app. Everything below is meant to be retuned freely.
     FREE.melodyGroups     — how many Single-Notes groups are free (group 0 =
                             Diatonic·major = the 8 C-major-based levels).
     FREE.adventureRegions — how many Adventure regions (from the start) are free.
     FREE.freePlayPaths    — how many preset Free-Play "Paths" are free.
   ConvertKit lead capture is optional: leave the form id/key blank and the email
   step just stores the lead locally and skips the network (see the results screen). */
const OFFER_URL = "https://wejamimprovisation.com/strategy?utm_source=numbersong";
const UNLOCK_CODE = "effortless1";   // students: ?unlock=effortless1  OR type it in Settings
const CONVERTKIT_FORM = "9671626";                 // ConvertKit form id — delivers leads
const CONVERTKIT_KEY = "6U4Fr68yjt_ESeBxKgXXpQ";   // ConvertKit PUBLIC api_key (safe client-side)
const FREE = { melodyGroups: 1, adventureRegions: 4, freePlayPaths: 1, freePlayWorlds: 2 };
/* Tracking (optional, like ConvertKit above): error reporting via Sentry + light usage
   via PostHog, both bundled offline by build.sh. All three are PUBLIC client-side tokens
   (safe to inline). LEAVE BLANK and tracking silently no-ops — no network, no errors — so
   the app ships fine before the projects exist. Fill them in to turn tracking on:
     SENTRY_DSN   — from Sentry → Project → Client Keys (DSN). Errors only when set.
     POSTHOG_KEY  — from PostHog → Project Settings → Project API Key (starts "phc_").
     POSTHOG_HOST — PostHog API host: "https://us.i.posthog.com" or "https://eu.i.posthog.com". */
const SENTRY_DSN = "https://48feaac72c065e5df74a5fdea19d08fe@o4511726387134464.ingest.us.sentry.io/4511726390870016";
const POSTHOG_KEY = "phc_ky5DGTUrbsY3FfiqV6bgk7w9BJcXg9UENafMJzaXepSb";
const POSTHOG_HOST = "https://us.i.posthog.com";


// Testing mode = 3-Q sessions + eased gates. On for: localhost, OR the URL flag
// `?test` (which sticks for the session so it survives reloads — use `?notest` to
// clear it). Real visitors of the deployed site (no flag) always get full 20-Q
// (30 for finals) sessions. Lets you test the LIVE locked funnel fast in incognito.
const TEST_MODE = (() => {
  if (typeof window === "undefined") return false;
  try {
    const s = window.location.search + " " + (window.location.hash || "");
    if (/[?&#]notest\b/.test(s)) { window.localStorage.removeItem("numbersong-test"); return false; }
    if (/[?&#]test\b/.test(s)) { window.localStorage.setItem("numbersong-test", "1"); return true; }
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)) return true;
    return window.localStorage.getItem("numbersong-test") === "1";
  } catch (e) {
    return typeof window !== "undefined" && window.location.hostname === "localhost";
  }
})();
// "jojomode" — a dev/testing unlock (typed in Settings or ?unlock=jojomode). It fills
// every level as complete except the FINAL adventure region, and shrinks any session to
// 3 questions with a 1-answer pass bar, so the whole ending (Excalibar reforged) is one
// short drill away. Module-level mirror of TEST_MODE; flipped by grantJojo() at runtime.
let JOJO_MODE = (() => {
  try { return typeof window !== "undefined" && window.localStorage.getItem("numbersong-jojo") === "1"; }
  catch (e) { return false; }
})();
const qCountOf = (lvl) => (TEST_MODE || JOJO_MODE) ? 3 : ((lvl && lvl.qCount) || SESSION_LEN);
const passRateOf = (lvl) => TEST_MODE ? 0.6 : ((lvl && lvl.pass) || PASS_RATE);
const passCountFor = (lvl) => JOJO_MODE ? 1 : Math.ceil(passRateOf(lvl) * qCountOf(lvl));

// Shop: spend earned stars on Coda skins. "default" is free/always-equipped.
const SHOP = [
  { id: "gold",    type: "skin", name: "Gilded Coda",  cost: 12, tint: "#D9B45B", desc: "A hero forged in gold." },
  { id: "shadow",  type: "skin", name: "Shadow Coda",  cost: 8,  tint: "#2f3b45", desc: "Cloaked in dusk." },
  { id: "crimson", type: "skin", name: "Crimson Coda", cost: 8,  tint: "#E07856", desc: "Ember-touched." },
  { id: "violet",  type: "skin", name: "Violet Coda",  cost: 8,  tint: "#9b8ec4", desc: "Crystal-kissed." },
];

// Progress is a per-level best-score map: { melody: {levelIdx: bestFirstTries}, chords: {…} }.
function loadProgress() {
  try {
    const raw = window.localStorage.getItem("numbersong-progress");
    const p = raw ? JSON.parse(raw) : {};
    const norm = (m) => (m && typeof m === "object" ? m : {}); // migrate old numeric format → {}
    return { melody: norm(p.melody), chords: norm(p.chords), progressions: norm(p.progressions) };
  } catch (e) {
    return { melody: {}, chords: {}, progressions: {} };
  }
}
function saveProgress(p) {
  try { window.localStorage.setItem("numbersong-progress", JSON.stringify(p)); } catch (e) {}
}

// Preferences (theme + how fast the "walk home" resolution plays), persisted.
const RES_SPEEDS = [
  { label: "Slow",    step: 1.0 },
  { label: "Normal",  step: 0.8 },
  { label: "Fast",    step: 0.55 },
  { label: "Fastest", step: 0.38 },
];
const PROG_SPEEDS = [
  { label: "Slow",    beat: 1.3 },
  { label: "Normal",  beat: 1.0 },
  { label: "Fast",    beat: 0.72 },
  { label: "Fastest", beat: 0.5 },
];
// Question tempo — a continuous speed factor for the "establish home" cadence at
// the start of each question. 1 = normal; >1 faster, <1 slower (slider-driven).
const TEMPO_MIN = 0.6, TEMPO_MAX = 2.0;
function loadPref(key, fallback) {
  try {
    const v = window.localStorage.getItem("numbersong-" + key);
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function savePref(key, val) {
  try { window.localStorage.setItem("numbersong-" + key, String(val)); } catch (e) {}
}

/* ── Tracking: error reporting (Sentry) + light usage (PostHog) ──────────────
   The SDKs are inlined by build.sh as window.Sentry / window.posthog (ONLY when the
   config keys above are set — blank keys = not inlined = these globals are undefined and
   everything below no-ops). We init here so config + init live in one file. A stable
   anonymous client id (random, no PII) is shared by both so a crash can be lined up with
   what the player did. Never throws; tracking failures must never surface in #errbox or
   break audio. NEVER pass email / free-text PII as an event property. */
const trackCid = (() => {
  try {
    let id = loadPref("cid", "");
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
         : "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      savePref("cid", id);
    }
    return id;
  } catch (e) { return ""; }
})();
let trackOn = false;
try {
  if (SENTRY_DSN && window.Sentry) {
    window.Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,               // no IP/cookies attached to error events
      initialScope: { user: { id: trackCid } },
    });
  }
  if (POSTHOG_KEY && window.posthog) {
    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false, capture_pageview: false, capture_pageleave: false,
      disable_session_recording: true,     // light + private: explicit events only
      persistence: "localStorage",         // cookieless
      person_profiles: "identified_only",  // anonymous unless we ever identify() (we don't)
      advanced_disable_decide: true,       // no feature-flag/remote-config fetch — we hardcode config, keeps it offline-clean
      disable_surveys: true,
      bootstrap: { distinctID: trackCid },
    });
    trackOn = true;
  }
} catch (e) { trackOn = false; }

// Fire a light usage event. Silent no-op until PostHog is configured; never throws.
function track(event, props) {
  try { if (trackOn && window.posthog) window.posthog.capture(event, props || {}); } catch (e) {}
}

/* ─────────────────────────────  AUDIO ENGINE  ───────────────────────────── */

function degreeToNote(key, degree, octave = 4) {
  const base = Tone.Frequency(key + octave).toMidi();
  return Tone.Frequency(base + DEGREE_SEMITONES[degree], "midi").toNote();
}



function buildInstrument(buffers) {
  if (buffers) {
    return new Tone.Sampler({ urls: buffers, release: 1.2 }).toDestination();
  }
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.5, release: 0.8 },
    volume: -2,
  }).toDestination();
}

// Sustaining synth voices for Free Play (piano is handled by the sampler instead).
function buildSusSynth(name) {
  const P = {
    pad:     [Tone.Synth,     { oscillator: { type: "triangle" },                          envelope: { attack: 0.35, decay: 0.2, sustain: 0.85, release: 0.9 } }, -12],
    lead:    [Tone.MonoSynth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.25 }, filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.6, baseFrequency: 350, octaves: 3.2 } }, -15],
    strings: [Tone.Synth,     { oscillator: { type: "fatsawtooth", count: 3, spread: 22 }, envelope: { attack: 0.3, decay: 0.2, sustain: 0.9, release: 0.6 } }, -19],
  }[name] || null;
  if (!P) return null;
  const s = new Tone.PolySynth(P[0], P[1]).toDestination();
  s.volume.value = P[2];
  return s;
}

function useAudio() {
  const synthRef = useRef(null);
  const padRef = useRef(null);
  const voicesRef = useRef(null);
  const minorVoiceRef = useRef(null); // pitch-keyed minor scale (Jojo's A-minor 2-octave take), base 0 = C
  const buffersRef = useRef(null);
  const voicePlayersRef = useRef([]);
  const initRef = useRef(null); // memoised heavy one-time init promise (dedupes concurrent callers)
  // Bumped by stopAll. Session play-primitives capture it before `await ensure()` and
  // bail if it changed — so a quit DURING the multi-second first load (synthRef still
  // null, nothing for stopAll to dispose) can't let the just-loaded cadence/chord play
  // over the menu on a dead session.
  const audioGenRef = useRef(0);

  const ensure = useCallback(async () => {
    // Swallow start/resume errors: some webviews (Instagram's in-app browser) reject
    // resume() with "Failed to start the audio device" even when audio is actually fine
    // — an unhandled rejection there trips the global error overlay. A retry lands on the
    // next gesture, so proceeding is safe.
    try {
      await Tone.start();
      if (Tone.context.state !== "running") await Tone.context.resume();
    } catch (e) {}
    // The heavy one-time init (13 Salamander mp3s + the sung-number/minor-voice
    // base64 decode) is memoised behind initRef so concurrent callers — e.g. the boot
    // tap and the background warm effect ~400ms later, both arriving during the
    // multi-second fetch — SHARE one load. Without this both pass the `!synthRef.current`
    // check below and double-fetch, leaking an orphan Sampler and decoding twice.
    if (!initRef.current) {
      initRef.current = (async () => {
        if (!synthRef.current) {
          // Sampled grand piano (Salamander). Buffers are cached so the instrument
          // can be torn down and rebuilt instantly (that's how stopAll cancels
          // notes that were already scheduled into the future).
          const PIANO_URLS = {
            C2: "C2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3",
            C3: "C3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3",
            C4: "C4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3",
            C5: "C5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3",
            C6: "C6.mp3",
          };
          const BASE = "https://tonejs.github.io/audio/salamander/";
          const loaded = await Promise.race([
            Promise.all(Object.entries(PIANO_URLS).map(([n, f]) =>
              new Promise((res) => {
                const b = new Tone.ToneAudioBuffer(BASE + f, () => res([n, b]), () => res(null));
              })
            )),
            new Promise((res) => setTimeout(() => res(null), 8000)),
          ]);
          if (Array.isArray(loaded)) {
            // Keep whatever loaded — one 404 shouldn't drop the whole piano to a synth;
            // Tone.Sampler interpolates from a sparse map. Store native AudioBuffers so
            // disposing a sampler can't destroy them (rebuilt instruments stay healthy).
            const ok = loaded.filter(Boolean);
            if (ok.length) buffersRef.current = Object.fromEntries(ok.map(([n, b]) => [n, b.get()]));
            if (ok.length < loaded.length) console.warn("[numbersong] piano: only " + ok.length + "/" + loaded.length + " samples loaded — using a sparser sampler.");
          } else {
            console.warn("[numbersong] piano samples unavailable (offline or timed out) — using the synth fallback.");
          }
          synthRef.current = buildInstrument(buffersRef.current);
          padRef.current = synthRef.current;
        }
        // Decode embedded sung numbers (Jojo's voice), once.
        // Sets are keyed by semitone base: 0 = C major, 4 = E major, 8 = Ab major.
        if (!voicesRef.current && window.SUNG_NUMBERS) {
          try {
            const out = {};
            for (const [base, set] of Object.entries(window.SUNG_NUMBERS)) {
              out[base] = {};
              for (const [d, b64] of Object.entries(set)) {
                const bin = atob(b64);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                out[base][d] = await Tone.getContext().rawContext.decodeAudioData(arr.buffer);
              }
            }
            voicesRef.current = out;
          } catch (e) {
            voicesRef.current = null; // fall back to speech synthesis
          }
        }
        // Decode the pitch-keyed minor-scale voice (A-minor 2-octave take), keyed by MIDI.
        if (!minorVoiceRef.current && window.MINOR_VOICE) {
          try {
            const out = {};
            for (const [base, set] of Object.entries(window.MINOR_VOICE)) {
              out[base] = {};
              for (const [midi, b64] of Object.entries(set)) {
                const bin = atob(b64); const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                out[base][midi] = await Tone.getContext().rawContext.decodeAudioData(arr.buffer);
              }
            }
            minorVoiceRef.current = out;
          } catch (e) { minorVoiceRef.current = null; }
        }
      })().catch((e) => { initRef.current = null; throw e; }); // a failed one-time init can retry
    }
    await initRef.current;
  }, []);

  // Cadence to anchor the ear in the key — major (I–IV–V–I) or minor (i–iv–V–i).
  // cadSpeedRef scales its timing (set from the Test-settings tempo slider; <1 = faster).
  const cadSpeedRef = useRef(1 / (parseFloat(loadPref("tempo", "1")) || 1));
  const setCadenceSpeed = useCallback((tempo) => { cadSpeedRef.current = tempo > 0 ? 1 / tempo : 1; }, []);
  const playCadence = useCallback(async (key, mode = "major") => {
    const g = audioGenRef.current;
    await ensure();
    if (g !== audioGenRef.current) return 0; // stopAll ran during load → don't play onto a dead session
    const now = Tone.now();
    const sp = cadSpeedRef.current;
    const base = Tone.Frequency(key + "4").toMidi();
    const noteAt = (semi) => Tone.Frequency(base + semi, "midi").toNote();
    (CADENCES[mode] || CADENCES.major).forEach((ch, i) => {
      const t = i * 0.55 * sp;
      padRef.current.triggerAttackRelease(ch.semis.map(noteAt), 0.5 * sp, now + t, 0.45);
      // bass: the chord's root an octave below, slightly stronger
      padRef.current.triggerAttackRelease(noteAt(ch.bass - 12), 0.6 * sp, now + t, 0.6);
    });
    return 2.4 * sp; // total seconds
  }, [ensure]);

  const playDegree = useCallback(async (key, degree, delay = 0, octave = 4) => {
    await ensure();
    synthRef.current.triggerAttackRelease(
      degreeToNote(key, degree, octave), 0.9, Tone.now() + delay
    );
  }, [ensure]);

  const playChord = useCallback(async (key, tones, delay = 0, arp = true) => {
    const g = audioGenRef.current;
    await ensure();
    if (g !== audioGenRef.current) return 0; // stopAll ran during load → don't play onto a dead session
    const now = Tone.now() + delay;
    // Voice ascending from degree order, wrapping up an octave when needed
    let lastMidi = -1;
    const notes = tones.map((d) => {
      let midi = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
      while (midi <= lastMidi) midi += 12;
      lastMidi = midi;
      return Tone.Frequency(midi, "midi").toNote();
    });
    // Block chord, then (optionally) a gentle arpeggio so each tone is audible
    synthRef.current.triggerAttackRelease(notes, arp ? 1.1 : 1.5, now);
    if (arp) {
      notes.forEach((n, i) =>
        synthRef.current.triggerAttackRelease(n, 0.45, now + 1.35 + i * 0.4)
      );
      return 1.35 + notes.length * 0.4 + 0.5;
    }
    return 1.6;
  }, [ensure]);

  // Chord playback for the Sylva tutorial: "walk" (arpeggio low→high), "ring" (block), or
  // "both" (walk then ring). Voices ascending like playChord so the ROOT is the lowest note.
  const playChordWR = useCallback(async (key, tones, mode = "both", delay = 0) => {
    const g = audioGenRef.current;
    await ensure();
    if (g !== audioGenRef.current) return 0;
    const now = Tone.now() + delay; // delay lets the chord start AFTER the cadence, not on top of it
    let lastMidi = -1;
    const notes = tones.map((d) => {
      let midi = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
      while (midi <= lastMidi) midi += 12;
      lastMidi = midi;
      return Tone.Frequency(midi, "midi").toNote();
    });
    const step = 0.5;
    let t = now;
    if (mode === "walk" || mode === "both") {
      notes.forEach((n, i) => synthRef.current.triggerAttackRelease(n, 0.42, now + i * step));
      t = now + notes.length * step + 0.12;
    }
    if (mode === "ring" || mode === "both") {
      synthRef.current.triggerAttackRelease(notes, 1.5, t);
      t += 1.5;
    }
    return t - now; // total seconds
  }, [ensure]);

  const playSemi = useCallback(async (key, semi, delay = 0, octave = 4) => {
    await ensure();
    const midi = Tone.Frequency(key + octave).toMidi() + semi;
    synthRef.current.triggerAttackRelease(
      Tone.Frequency(midi, "midi").toNote(), 0.9, Tone.now() + delay
    );
  }, [ensure]);

  // Retro menu SFX (chiptune blips) — spec from the design pass.
  const sfxRef = useRef(null);
  const sfx = useCallback(async (name) => {
    await ensure();
    if (!sfxRef.current) sfxRef.current = new Tone.Synth({ envelope: { attack: 0.006, decay: 0.08, sustain: 0, release: 0.05 }, volume: -17 }).toDestination();
    // +0.05s lead so the FIRST sound after audio-unlock (the boot chime) isn't
    // dropped while the just-resumed AudioContext spins up.
    const s = sfxRef.current, now = Tone.now() + 0.05;
    const beep = (freq, dur, t, type) => { s.oscillator.type = type; try { s.triggerAttackRelease(freq, dur, now + t); } catch (e) {} };
    if (name === "move") beep(494, 0.045, 0, "square");
    else if (name === "select") { beep(659, 0.055, 0, "square"); beep(988, 0.06, 0.06, "square"); }
    else if (name === "back") { beep(392, 0.06, 0, "square"); beep(294, 0.065, 0.065, "square"); }
    else if (name === "boot") [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.15, i * 0.07, "triangle"));
    else if (name === "correct") { beep(880, 0.09, 0, "triangle"); beep(1319, 0.1, 0.09, "triangle"); }
    else if (name === "victory") [659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.18, i * 0.095, "triangle"));
    else if (name === "twinkle") [2093, 2637, 3136, 2349, 1760].forEach((fr, i) => beep(fr, 0.11, i * 0.05, "triangle"));
  }, [ensure]);

  // big triumphant fanfare for forging a fragment — layered: lead run + chord,
  // a deep bass boom, a soft choir "aah" swell, and bright bell sparkles.
  const fanfareRef = useRef(null);
  const fanfare = useCallback(async () => {
    await ensure();
    if (!fanfareRef.current) {
      fanfareRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.008, decay: 0.18, sustain: 0.35, release: 0.7 }, volume: -9 }).toDestination(),
        bass:  new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.9 }, volume: -5 }).toDestination(),
        choir: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.35, decay: 0.2, sustain: 0.7, release: 1.3 }, volume: -15 }).toDestination(),
        bell:  new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.6 }, volume: -11 }).toDestination(),
      };
    }
    const f = fanfareRef.current, t = Tone.now() + 0.06;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    // pickup, then the Super-Mario course-clear cadence: ♭VI – ♭VII – I
    // (in C: Ab → Bb → C). Each chord is held so it breathes, landing on a long tonic.
    P(f.lead, "G4", 0.12, 0.00); P(f.lead, "C5", 0.14, 0.12);
    P(f.lead, ["Ab4", "C5", "Eb5"], 0.46, 0.28); P(f.bass, "Ab2", 0.48, 0.28);   // ♭VI (held)
    P(f.lead, ["Bb4", "D5", "F5"], 0.46, 0.78);  P(f.bass, "Bb2", 0.48, 0.78);   // ♭VII (held)
    P(f.lead, ["C5", "E5", "G5", "C6"], 2.4, 1.28); P(f.bass, "C2", 2.6, 1.28);   // I — landing, long hold
    // choir swell + bell sparkles on the landing
    P(f.choir, ["C4", "E4", "G4", "C5"], 2.8, 1.26);
    P(f.bell, "E6", 0.4, 1.34); P(f.bell, "G6", 0.5, 1.5); P(f.bell, "C7", 1.3, 1.7);
  }, [ensure]);

  // EPIC finale — reforging the WHOLE sword. The ♭VI–♭VII rise happens three
  // times, climbing an octave each round, then lands on the biggest, widest,
  // longest C-major chord of all time.
  const grandFanfare = useCallback(async () => {
    await ensure();
    if (!fanfareRef.current) {
      fanfareRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.008, decay: 0.18, sustain: 0.35, release: 0.7 }, volume: -9 }).toDestination(),
        bass:  new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.9 }, volume: -5 }).toDestination(),
        choir: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.35, decay: 0.2, sustain: 0.7, release: 1.3 }, volume: -15 }).toDestination(),
        bell:  new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.6 }, volume: -11 }).toDestination(),
      };
    }
    const f = fanfareRef.current, t = Tone.now() + 0.06;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    const rounds = [
      { six: ["Ab3", "C4", "Eb4"], sev: ["Bb3", "D4", "F4"], r6: "Ab2", r7: "Bb2" },
      { six: ["Ab4", "C5", "Eb5"], sev: ["Bb4", "D5", "F5"], r6: "Ab2", r7: "Bb2" },
      { six: ["Ab5", "C6", "Eb6"], sev: ["Bb5", "D6", "F6"], r6: "Ab3", r7: "Bb3" },
    ];
    let at = 0; const step = 0.42;
    rounds.forEach((r) => {
      P(f.lead, r.six, step * 0.9, at); P(f.bass, r.r6, step, at); at += step;
      P(f.lead, r.sev, step * 0.9, at); P(f.bass, r.r7, step, at); at += step;
    });
    // rising run into the landing
    P(f.lead, "F6", 0.1, at); P(f.lead, "G6", 0.1, at + 0.1); P(f.lead, "A6", 0.1, at + 0.2); P(f.lead, "B6", 0.12, at + 0.3);
    at += 0.46;
    // THE biggest I chord of all time — C major across the whole range, very long
    P(f.lead, ["C5", "E5", "G5", "C6", "E6", "G6"], 4.6, at);
    P(f.bass, "C2", 5.2, at);
    P(f.choir, ["C3", "G3", "C4", "E4", "G4", "C5"], 5.2, at);
    P(f.bell, "C6", 1.2, at + 0.1); P(f.bell, "E6", 1.0, at + 0.3); P(f.bell, "G6", 1.0, at + 0.5); P(f.bell, "C7", 3.2, at + 0.75);
  }, [ensure]);

  // robust "power on" chime for the Press-Any-Key boot: rising arpeggio into a
  // bright major chord with a sparkle up top.
  const bootRef = useRef(null);
  const bootChime = useCallback(async () => {
    await ensure();
    if (!bootRef.current) {
      bootRef.current = {
        lead:  new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.25, release: 0.6 }, volume: -9 }).toDestination(),
        spark: new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.5 }, volume: -13 }).toDestination(),
      };
    }
    const s = bootRef.current, t = Tone.now() + 0.09;
    const P = (inst, notes, dur, at) => { try { inst.triggerAttackRelease(notes, dur, t + at); } catch (e) {} };
    P(s.lead, "C4", 0.1, 0.00); P(s.lead, "E4", 0.1, 0.08); P(s.lead, "G4", 0.1, 0.16); P(s.lead, "C5", 0.12, 0.24);
    P(s.lead, ["C5", "E5", "G5", "C6"], 0.95, 0.36);
    P(s.spark, "E6", 0.25, 0.42); P(s.spark, "G6", 0.3, 0.56); P(s.spark, "C7", 0.6, 0.7);
  }, [ensure]);

  // Sustaining voice (Free Play): attack on hold, release on let-go. "piano" reuses
  // the loaded Salamander sampler (synthRef); the others are dedicated synths.
  const susRef = useRef(null);
  const susVoiceRef = useRef("piano");
  const susInst = () => (susVoiceRef.current === "piano" ? synthRef.current : susRef.current);
  const setSustainVoice = useCallback(async (name) => {
    await ensure();
    susVoiceRef.current = name;
    if (susRef.current) { try { susRef.current.releaseAll(); susRef.current.dispose(); } catch (e) {} susRef.current = null; }
    if (name !== "piano") susRef.current = buildSusSynth(name);
  }, [ensure]);
  const holdNote = useCallback(async (note) => {
    await ensure();
    if (susVoiceRef.current !== "piano" && !susRef.current) susRef.current = buildSusSynth(susVoiceRef.current);
    try { susInst()?.triggerAttack(note); } catch (e) {}
  }, [ensure]);
  const releaseNote = useCallback((note) => {
    try { susInst()?.triggerRelease(note); } catch (e) {}
  }, []);
  const releaseAllNotes = useCallback(() => {
    try { susInst()?.releaseAll?.(); } catch (e) {}
  }, []);

  // Play a progression: each chord as a block, in tempo, with a bass root below.
  const playProgression = useCallback(async (key, chordsTones, delay = 0, beat = 1.0) => {
    const g = audioGenRef.current;
    await ensure();
    if (g !== audioGenRef.current) return 0; // stopAll ran during load → don't play onto a dead session
    const now = Tone.now() + delay;
    chordsTones.forEach((tones, i) => {
      let lastMidi = -1;
      const notes = tones.map((d) => {
        let midi = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
        while (midi <= lastMidi) midi += 12;
        lastMidi = midi;
        return Tone.Frequency(midi, "midi").toNote();
      });
      const t = now + i * beat;
      synthRef.current.triggerAttackRelease(notes, beat * 0.92, t);
      const bass = Tone.Frequency(key + 3).toMidi() + DEGREE_SEMITONES[tones[0]];
      synthRef.current.triggerAttackRelease(Tone.Frequency(bass, "midi").toNote(), beat * 0.95, t, 0.6);
    });
    return chordsTones.length * beat + 0.3;
  }, [ensure]);

  // Looping soft-pad backing (Melody Paths jam): count-in clicks, then each chord
  // sustains as a pad in tempo, calling back so the UI can light the current chord.
  const pathRef = useRef({ active: false, timers: [], pad: null, click: null });
  const stopPathLoop = useCallback(() => {
    const p = pathRef.current;
    p.active = false;
    p.timers.forEach(clearTimeout);
    p.timers = [];
    ["pad", "click", "kick", "snare", "hat", "bass"].forEach((k) => {
      if (p[k]) { try { p[k].dispose(); } catch (e) {} p[k] = null; }
    });
  }, []);
  const startPathLoop = useCallback(async (key, chordsTones, beat, cb, countIn = 4, getDrums = () => false) => {
    await ensure();
    stopPathLoop();
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.09, decay: 0.3, sustain: 0.55, release: 0.7 },
      volume: -19,
    }).toDestination();
    const click = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 }, volume: -20,
    }).toDestination();
    const kick = new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.05, volume: -6 }).toDestination();
    const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.13, sustain: 0 }, volume: -15 }).toDestination();
    const hat = new Tone.MetalSynth({ frequency: 260, envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.4, volume: -30 }).toDestination();
    const bass = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.3 },
      filterEnvelope: { attack: 0.02, decay: 0.12, sustain: 0.5, baseFrequency: 110, octaves: 2.6 },
      volume: -9,
    }).toDestination();
    const p = (pathRef.current = { active: true, timers: [], pad, click, kick, snare, hat, bass });
    const B = () => (typeof beat === "function" ? beat() : beat); // live tempo (seconds per bar)
    const notesFor = (tones) => {
      let last = -1;
      return tones.map((d) => {
        let m = Tone.Frequency(key + 4).toMidi() + DEGREE_SEMITONES[d];
        while (m <= last) m += 12;
        last = m;
        return Tone.Frequency(m, "midi").toNote();
      });
    };
    const bassNote = (d) => Tone.Frequency(Tone.Frequency(key + 2).toMidi() + DEGREE_SEMITONES[d], "midi").toNote();
    let curTones = null;
    // One quarter-note clock drives both drums and chord changes (locked, no drift).
    // A bar = 4 quarters = 1 chord. Count-in = one bar of clicks.
    let q = -countIn, ci = 0;
    const tick = () => {
      if (!p.active) return;
      const qDur = B() / 4;
      const t = Tone.now();
      if (q < 0) {
        click.triggerAttackRelease(q === -countIn ? "C6" : "C5", 0.05, t);
        cb({ phase: "count", n: -q });
      } else {
        if (getDrums()) {
          hat.triggerAttackRelease("32n", t, 0.5);
          if (q % 4 === 0 || q % 4 === 2) kick.triggerAttackRelease("C1", "8n", t);
          if (q % 4 === 1 || q % 4 === 3) snare.triggerAttackRelease("8n", t);
        }
        if (q % 4 === 0) {
          const idx = ci % chordsTones.length;
          curTones = chordsTones[idx];
          pad.triggerAttackRelease(notesFor(curTones), qDur * 4 * 0.95, t);
          bass.triggerAttackRelease(bassNote(curTones[0]), qDur * 2 * 0.9, t); // root on beat 1
          cb({ phase: "play", i: idx });
          ci++;
        } else if (q % 4 === 2 && curTones) {
          bass.triggerAttackRelease(bassNote(curTones[2] || curTones[0]), qDur * 2 * 0.9, t); // fifth on beat 3
        }
      }
      q++;
      p.timers.push(setTimeout(tick, qDur * 1000));
    };
    tick();
  }, [ensure, stopPathLoop]);

  // Sing a number: three recorded sets (C, E, Ab major). Pick the set nearest
  // the current key, so the voice is never repitched more than 2 semitones.
  const lastVoiceRef = useRef(null);
  // octShift lifts the sung clip by whole octaves — the recorded voice only covers one
  // octave (plus a high "1" = clip "8"), so an upper-octave degree with no high take is
  // repitched up instead of singing an octave below the note it's naming.
  const sing = useCallback(async (key, degree, enabled, delay = 0, cutAfter = null, octShift = 0) => {
    if (!enabled) return;
    await ensure();
    if (!voicesRef.current) { speak(NUMBER_WORDS[parseInt(degree, 10)], enabled); return; }
    const idx = KEYS.indexOf(key);
    // nearest recorded base that ACTUALLY has this clip — so a key still missing
    // 6L/7L borrows the low la/ti from a neighbouring key (shifted) instead of
    // dropping to robotic speech synthesis.
    const cands = Object.keys(voicesRef.current).map(Number).map((base) => {
      let s = idx - base; if (s > 6) s -= 12; if (s < -6) s += 12; return { base, s };
    }).sort((a, z) => Math.abs(a.s) - Math.abs(z.s));
    const pick = cands.find((c) => voicesRef.current[c.base][degree]);
    if (!pick) { speak(NUMBER_WORDS[parseInt(degree, 10)], enabled); return; }
    const player = new Tone.Player(voicesRef.current[pick.base][degree]).toDestination();
    player.playbackRate = Math.pow(2, pick.s / 12 + octShift);
    player.fadeOut = 0.12; // gentle release when cut short
    const t = Tone.now() + delay;
    // one voice at a time: the previous number stops the moment this one starts
    if (lastVoiceRef.current) {
      try { lastVoiceRef.current.stop(t); } catch (e) {}
    }
    lastVoiceRef.current = player;
    voicePlayersRef.current.push(player);
    player.start(t);
    if (cutAfter) player.stop(t + cutAfter);
    setTimeout(() => {
      player.dispose();
      voicePlayersRef.current = voicePlayersRef.current.filter((p) => p !== player);
    }, (delay + 4) * 1000);
  }, [ensure]);

  // Sing a minor number at an EXACT target pitch (MIDI) so the voice tracks the synth
  // and never drifts an octave. Uses the pitch-keyed minor set (base 0 = C / A-minor),
  // shifted into the current key, picking the recorded octave nearest the target.
  const singMinor = useCallback(async (key, targetMidi, enabled, delay = 0, cutAfter = null) => {
    if (!enabled) return;
    await ensure();
    const set = minorVoiceRef.current && minorVoiceRef.current["0"];
    if (!set) return;
    let ks = KEYS.indexOf(key); if (ks > 6) ks -= 12; // shift the C-base take into the current key
    const cbase = targetMidi - ks;
    const pc = ((cbase % 12) + 12) % 12;
    let recMidi = null, bestD = 1e9;
    for (const m of Object.keys(set)) {
      const mm = +m;
      if (((mm % 12) + 12) % 12 !== pc) continue;     // same scale degree (pitch class)
      const d = Math.abs(mm - cbase);
      if (d < bestD) { bestD = d; recMidi = mm; }
    }
    if (recMidi == null) return;
    const player = new Tone.Player(set[recMidi]).toDestination();
    player.playbackRate = Math.pow(2, (targetMidi - recMidi) / 12);
    player.fadeOut = 0.12;
    const t = Tone.now() + delay;
    if (lastVoiceRef.current) { try { lastVoiceRef.current.stop(t); } catch (e) {} }
    lastVoiceRef.current = player;
    voicePlayersRef.current.push(player);
    player.start(t);
    if (cutAfter) player.stop(t + cutAfter);
    setTimeout(() => {
      player.dispose();
      voicePlayersRef.current = voicePlayersRef.current.filter((p) => p !== player);
    }, (delay + 4) * 1000);
  }, [ensure]);

  // Semitones the minor take must shift to hit this target. Small only for keys near
  // the recorded one (C / A-minor); used to gate pitch-tracking vs the fallback.
  const minorShift = useCallback((key, targetMidi) => {
    const set = minorVoiceRef.current && minorVoiceRef.current["0"];
    if (!set) return 999;
    let ks = KEYS.indexOf(key); if (ks > 6) ks -= 12;
    const cbase = targetMidi - ks; const pc = ((cbase % 12) + 12) % 12;
    let rec = null, bd = 1e9;
    for (const m of Object.keys(set)) { const mm = +m; if (((mm % 12) + 12) % 12 !== pc) continue; const d = Math.abs(mm - cbase); if (d < bd) { bd = d; rec = mm; } }
    return rec == null ? 999 : Math.abs(targetMidi - rec);
  }, []);

  const droneRef = useRef(null);
  const startDrone = useCallback(async (key, degree = 1, vol = -8) => {
    await ensure();
    if (droneRef.current) { droneRef.current.synth.dispose(); droneRef.current.limiter.dispose(); droneRef.current = null; }
    // A limiter after the synth lets the drone be pushed genuinely loud — to
    // ride over the output ducking phones apply while the mic is open — without
    // hard-clipping the sine into buzz. It soft-catches peaks near full scale.
    const limiter = new Tone.Limiter(-1).toDestination();
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.5 },
      volume: vol,
    }).connect(limiter);
    synth.triggerAttack(degreeToNote(key, degree, degree >= 5 ? 2 : 3));
    droneRef.current = { synth, limiter };
  }, [ensure]);
  // Adjust a running drone's loudness (dB) without re-attacking it.
  const setDroneVolume = useCallback((vol) => {
    if (droneRef.current) droneRef.current.synth.volume.rampTo(vol, 0.1);
  }, []);
  const stopDrone = useCallback(() => {
    if (!droneRef.current) return;
    const { synth, limiter } = droneRef.current;
    droneRef.current = null;
    synth.triggerRelease();
    setTimeout(() => { synth.dispose(); limiter.dispose(); }, 2000);
  }, []);

  const stopAll = useCallback(() => {
    audioGenRef.current++; // cancel any play-primitive still awaiting ensure() (see audioGenRef)
    stopPathLoop();
    releaseAllNotes();
    voicePlayersRef.current.forEach((p) => { try { p.stop(); p.dispose(); } catch (e) {} });
    voicePlayersRef.current = [];
    lastVoiceRef.current = null;
    if (synthRef.current) {
      try { synthRef.current.dispose(); } catch (e) {}
      try {
        synthRef.current = buildInstrument(buffersRef.current);
      } catch (e) {
        synthRef.current = buildInstrument(null); // fallback synth, never silent
      }
      padRef.current = synthRef.current;
    }
  }, []);

  return { playCadence, setCadenceSpeed, playDegree, playChord, playChordWR, playProgression, playSemi, sing, singMinor, minorShift, minorVoiceRef, sfx, fanfare, grandFanfare, bootChime, startDrone, stopDrone, setDroneVolume, startPathLoop, stopPathLoop, setSustainVoice, holdNote, releaseNote, releaseAllNotes, stopAll, warm: ensure };
}

// Background music engine (Fable's soundtrack). Owns Tone.Transport; routes
// every theme through one gain bus for one-ramp crossfades / ducking / toggle.
function useMusic() {
  const busRef = useRef(null);
  const curRef = useRef({ built: null, parts: [] });
  const nameRef = useRef(null);
  const onRef = useRef(loadPref("music", "1") === "1");
  const bus = () => {
    if (!busRef.current) busRef.current = new Tone.Gain(onRef.current ? 0.06 : 0).toDestination();
    return busRef.current;
  };
  const disposeCur = () => {
    (curRef.current.parts || []).forEach((p) => { try { p.stop(); p.dispose(); } catch (e) {} });
    if (curRef.current.built) Object.values(curRef.current.built).forEach((sy) => { try { sy.dispose(); } catch (e) {} });
    curRef.current = { built: null, parts: [] };
  };
  const build = (T) => {
    const g = bus();
    Tone.Transport.bpm.value = T.bpm;
    const built = {};
    for (const k of Object.keys(T.synths)) {
      const spec = T.synths[k];
      built[k] = spec.poly ? new Tone.PolySynth(Tone.Synth, spec.opts).connect(g) : new Tone.Synth(spec.opts).connect(g);
      built[k].volume.value = spec.opts.volume;
    }
    const parts = [];
    for (const k of Object.keys(T.parts || {})) {
      const p = new Tone.Part((t, ev) => { try { built[k].triggerAttackRelease(ev.note, ev.dur, t); } catch (e) {} }, T.parts[k]);
      p.loop = !!T.loopEnd; if (T.loopEnd) p.loopEnd = T.loopEnd;
      p.start(0); parts.push(p);
    }
    if (T.sequences) for (const k of Object.keys(T.sequences)) {
      const sq = T.sequences[k];
      const q = new Tone.Sequence((t, note) => { try { built[k].triggerAttackRelease(note, sq.dur, t); } catch (e) {} }, sq.notes, sq.subdivision);
      q.loop = !!T.loopEnd; q.start(0); parts.push(q);
    }
    curRef.current = { built, parts };
  };
  const playTheme = useCallback(async (name, T) => {
    if (nameRef.current === name) return;
    nameRef.current = name;
    try { await Tone.start(); } catch (e) {}
    const g = bus();
    try { g.gain.rampTo(0, 0.5); } catch (e) {}
    setTimeout(() => {
      if (nameRef.current !== name) return; // superseded by a newer switch
      try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch (e) {}
      disposeCur();
      if (T) {
        build(T);
        try { Tone.Transport.start("+0.06"); } catch (e) {}
        try { g.gain.rampTo(onRef.current ? 0.06 : 0, 0.6); } catch (e) {}
      }
    }, 520);
  }, []);
  const stopMusic = useCallback((fast) => {
    nameRef.current = null;
    const g = busRef.current; if (g) try { g.gain.rampTo(0, fast ? 0.06 : 0.7); } catch (e) {}
    setTimeout(() => {
      // If a playTheme landed during the fade it will have set nameRef to its theme —
      // don't tear down the instrument it just built (that would strand nameRef set,
      // making every later playTheme(name) early-return → music silent forever).
      if (nameRef.current !== null) return;
      try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch (e) {} disposeCur();
    }, fast ? 320 : 720);
  }, []);
  const setMusicOn = useCallback((on) => {
    onRef.current = on; savePref("music", on ? "1" : "0");
    const g = busRef.current; if (g) try { g.gain.rampTo(on ? 0.06 : 0, 0.4); } catch (e) {}
  }, []);
  return { playTheme, stopMusic, setMusicOn };
}

function speak(text, enabled) {
  if (!enabled || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/* ─────────────────────────────  DEGREE LADDER  ───────────────────────────── */

/* ─────────────────────────  TONAL MAP  ─────────────────────────
   Degrees sit at their true semitone positions across the octave;
   dots mark the chromatic notes in the whole-step gaps, so 3–4 and
   7–1 visibly touch while the others have space between. */

const CHROMATIC_GAPS = [1, 3, 6, 8, 10];

// The tonal map is drawn RELATIVE TO HOME: major reads 1 2 3 4 5 6 7 1, la-based
// minor reads 6 7 1 2 3 4 5 6. Columns are semitones above the mode's tonic.
// Highlights (active/correct/wrong) and pool are pitch-classes (0–11); showChrom
// reveals the five altered positions as small, lightable rungs instead of dots.
const MINOR_SCALE_STEPS = [0, 2, 3, 5, 7, 8, 10, 12]; // natural minor above 6
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

function DegreeLadder({ active, correct, wrong, tonicPc = 0, pool, showChrom }) {
  const inPool = (pc) => !pool || pool.includes(pc);
  const steps = tonicPc === 9 ? MINOR_SCALE_STEPS : MAJOR_SCALE_STEPS;
  const lit = (pc) => [
    active?.includes(pc) && "active",
    correct?.includes(pc) && "correct",
    wrong?.includes(pc) && "wrong",
  ];
  const cells = [];
  steps.forEach((pos) => {
    const pc = mod12(tonicPc + pos);
    const cls = ["rung", pc === tonicPc && "tonic", !inPool(pc) && "dim", ...lit(pc)].filter(Boolean).join(" ");
    cells.push(
      <div key={"n" + pos} className={cls} style={{ gridColumn: pos + 1, gridRow: 1 }}>
        <span className="rung-num">{NOTE_LABELS[pc]}</span>
      </div>
    );
  });
  for (let pos = 1; pos < 12; pos++) {
    if (steps.includes(pos)) continue;
    const pc = mod12(tonicPc + pos);
    if (showChrom) {
      const cls = ["rung", "alt-rung", !inPool(pc) && "dim", ...lit(pc)].filter(Boolean).join(" ");
      cells.push(
        <div key={"a" + pos} className={cls} style={{ gridColumn: pos + 1, gridRow: 1 }}>
          <span className="rung-num alt">{NOTE_LABELS[pc]}</span>
        </div>
      );
    } else {
      cells.push(<div key={"a" + pos} className="gap-dot" style={{ gridColumn: pos + 1, gridRow: 1 }} />);
    }
  }
  return (
    <div className="ladder" role="img" aria-label="Tonal map of the octave">
      {cells}
    </div>
  );
}

/* ────────────────────  EXPLORE MAP (playable window)  ────────────────────
   A slice of the tonal map: starts on any degree, 3–7 notes long, degrees
   at true semitone spacing (wrapping past 7 back to 1). Stages fade it:
   0 = numbers shown, 1 = blank pads, 2 = invisible buttons. */

function exploreNotes(start, count) {
  const notes = [];
  for (let i = 0; i < count; i++) {
    const raw = start + i;                 // 1..13
    const label = ((raw - 1) % 7) + 1;     // display degree
    const upper = raw > 7;                 // wrapped into the next octave
    const semi = DEGREE_SEMITONES[label] + (upper ? 12 : 0);
    notes.push({ raw, label, upper, semi });
  }
  return notes;
}

// The world's chord skeleton: root, 3rd, 5th, 7th above it (as key degrees)
function worldChordTones(w) {
  return [0, 2, 4, 6].map((k) => ((w - 1 + k) % 7) + 1);
}

function ExploreMap({ start, count, stage, octaves, world, home, active, hi, litDeg, singDeg, singInTune, onPlay, onDown, onUp, staircase }) {
  const evts = (n, row) => onDown // guide taps (onPlay); Free Play holds (onDown/onUp)
    ? { onPointerDown: (e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(n, row); }, onPointerUp: () => onUp(n, row) }
    : { onClick: () => onPlay(n, row) };
  const notes = exploreNotes(start, count);
  const s0 = notes[0].semi, s1 = notes[notes.length - 1].semi;
  const chordal = world ? worldChordTones(world) : [];
  // The starred "home" pad: an explicit `home` wins (Rue's minor map passes home=6 so the
  // same 1–8 map reads with 6 as home); else it follows the selected world; else 1.
  const homeDeg = home || world || 1;
  const cells = [];
  for (let row = 0; row < octaves; row++) {
    notes.forEach((n, i) => {
      const isTonic = n.label === homeDeg;
      const isChordal = chordal.includes(n.label);
      const isRoot = n.label === world;
      const cls = [
        "rung", "explore-pad",
        isTonic && "tonic",
        isChordal && "chordal",
        isRoot && "world-root",
        stage === 1 && "blank",
        active?.includes(n.raw + row * 100) && "active",
        hi?.includes(n.raw + row * 100) && "hl",
        litDeg?.includes(n.label) && "chord-lit",
        staircase && "stair",
        n.label === singDeg && (singInTune ? "singing in" : "singing off"),
      ].filter(Boolean).join(" ");
      const st = { gridColumn: n.semi - s0 + 1, gridRow: row + 1 };
      if (staircase) { st["--rise"] = n.semi - s0; st["--delay"] = (i * 0.09).toFixed(2) + "s"; }  // lift by pitch, cascade
      cells.push(
        <button key={"n" + n.raw + "r" + row} className={cls} style={st}
          {...evts(n, row)}
          aria-label={"degree " + n.label + (row > 0 ? " upper octave" : "")}>
          <span className="rung-num">{stage === 0 ? n.label : "\u00A0"}</span>
          {stage === 0 && !staircase && <span className="rung-sol">{SOLFEGE[n.label]}</span>}
        </button>
      );
    });
    if (!staircase) for (let s = s0; s <= s1; s++) {
      if (!notes.some((n) => n.semi === s)) {
        cells.push(<div key={"g" + s + "r" + row} className="gap-dot" style={{ gridColumn: s - s0 + 1, gridRow: row + 1 }} />);
      }
    }
  }
  return (
    <div className={"ladder explore" + (staircase ? " staircase" : "")} style={{ gridTemplateColumns: `repeat(${s1 - s0 + 1}, 1fr)`, rowGap: "10px" }}
      role="group" aria-label="Playable tonal map">
      {cells}
    </div>
  );
}

/* Tonal gravity as a solar system: every degree orbits home (1). Uses CSS motion
   paths so the number labels stay upright while circling. */
const SOLAR_CSS = `
.solar { position: relative; width: 260px; height: 260px; margin: 6px auto 2px; }
.solar-ring { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  border:1px dashed rgba(159,178,168,.30); border-radius:50%; }
.solar-sun { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:58px; height:58px; border-radius:50%;
  background: radial-gradient(circle at 38% 32%, #c6f2ef, #57C6C4 58%, #3a9c9a);
  color:#0f1c1a; display:grid; place-items:center; font-family:'Archivo Black',sans-serif; font-size:1.6rem;
  box-shadow:0 0 26px 8px rgba(87,198,196,.5); z-index:3; }
.solar-planet { position:absolute; left:0; top:0; width:28px; height:28px; border-radius:50%;
  background:#3b413e; border:1.5px solid #7CADD1; color:#EDF2EE; display:grid; place-items:center;
  font-family:'Archivo Black',sans-serif; font-size:.82rem; offset-rotate:0deg; z-index:2;
  animation: solar-orbit var(--dur) linear infinite; animation-delay: var(--delay);
  box-shadow:0 2px 6px rgba(0,0,0,.35); }
@keyframes solar-orbit { to { offset-distance: 100%; } }
@media (prefers-reduced-motion: reduce) { .solar-planet { animation-play-state: paused; } }
`;
function SolarSystem({ home = 1 }) {
  const C = 130; // container center
  // Major (home=1) keeps Verda's exact arrangement. Minor (home=6) puts 6 at the center
  // and swaps the former "6" planet for "1" — same orbits, gravity re-centered on 6.
  const major = [
    { d: 5, r: 52, dur: 9, delay: 0 }, { d: 7, r: 52, dur: 9, delay: -4.5 },
    { d: 3, r: 86, dur: 15, delay: -2 }, { d: 6, r: 86, dur: 15, delay: -9.5 },
    { d: 2, r: 118, dur: 22, delay: -3 }, { d: 4, r: 118, dur: 22, delay: -14 },
  ];
  const planets = home === 6 ? major.map((p) => (p.d === 6 ? { ...p, d: 1 } : p)) : major;
  return (
    <div className="solar" role="img" aria-label={"The seven degrees orbiting home, " + home}>
      <style>{SOLAR_CSS}</style>
      {[104, 172, 236].map((d) => <div key={d} className="solar-ring" style={{ width: d, height: d }} />)}
      {planets.map((p, i) => (
        <div key={i} className="solar-planet"
          style={{ offsetPath: `circle(${p.r}px at ${C}px ${C}px)`, "--dur": p.dur + "s", "--delay": p.delay + "s" }}>{p.d}</div>
      ))}
      <div className="solar-sun">{home}</div>
    </div>
  );
}

/* Half-step visual aids: on a piano two adjacent keys, on a guitar two adjacent frets. */
const HALFSTEP_CSS = `
.hs-diagrams { display:flex; flex-wrap:nowrap; gap:10px; justify-content:center; align-items:flex-end; margin-top:8px; }
.hs-fig { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1 1 0; min-width:0; max-width:150px; }
.hs-fig svg { display:block; width:100%; height:auto; }
.hs-cap { font-family:'Archivo Black',sans-serif; font-size:.56rem; letter-spacing:.3px; text-transform:uppercase; color:#57C6C4; text-align:center; }
`;
function HalfStepDiagrams() {
  const wk = [0, 1, 2, 3, 4, 5, 6];              // C D E F G A B
  const on = [2, 3];                             // E, F — adjacent whites, no black between = half step
  const bk = [22, 54, 118, 150, 182];            // black-key x offsets
  return (
    <div className="hs-diagrams">
      <style>{HALFSTEP_CSS}</style>
      <div className="hs-fig">
        <svg width="196" height="120" viewBox="0 0 224 132" aria-label="Piano: two adjacent keys are a half step">
          {wk.map((i) => (
            <rect key={i} x={i * 32} y="0" width="32" height="96" rx="3"
              fill={on.includes(i) ? "#57C6C4" : "#EDF2EE"} stroke="#565D59" strokeWidth="1.5" />
          ))}
          {bk.map((x, i) => <rect key={i} x={x} y="0" width="20" height="60" rx="2.5" fill="#232825" />)}
          <path d="M64 104 L64 108 L128 108 L128 104" fill="none" stroke="#57C6C4" strokeWidth="2" />
          <text x="96" y="126" textAnchor="middle" fontSize="11" fontWeight="700" fill="#57C6C4">half step</text>
        </svg>
        <span className="hs-cap">Piano · next-door keys</span>
      </div>
      <div className="hs-fig">
        <svg width="196" height="120" viewBox="0 0 224 132" aria-label="Guitar: two adjacent frets are a half step">
          <rect x="6" y="6" width="212" height="82" rx="4" fill="#4a3a29" stroke="#2b2114" strokeWidth="2" />
          {[8, 52, 96, 140, 184].map((x, i) => <line key={i} x1={x} y1="6" x2={x} y2="88" stroke={i === 0 ? "#cbb892" : "#8a7a5e"} strokeWidth={i === 0 ? 5 : 2} />)}
          {[16, 28, 40, 52, 64, 76].map((y, i) => <line key={i} x1="8" y1={y} x2="216" y2={y} stroke="#d8cba8" strokeWidth="1" opacity="0.7" />)}
          <circle cx="30" cy="52" r="8" fill="#57C6C4" stroke="#0f1c1a" strokeWidth="1.5" />
          <circle cx="74" cy="52" r="8" fill="#57C6C4" stroke="#0f1c1a" strokeWidth="1.5" />
          <path d="M30 100 L30 104 L74 104 L74 100" fill="none" stroke="#57C6C4" strokeWidth="2" />
          <text x="52" y="126" textAnchor="middle" fontSize="11" fontWeight="700" fill="#57C6C4">half step</text>
        </svg>
        <span className="hs-cap">Guitar · next-door frets</span>
      </div>
    </div>
  );
}

/* ────────────────────  PIANO (two octaves from the tonic)  ────────────────────
   A real chromatic keyboard anchored on the current key's tonic. Every key
   plays; the explore window's numbers sit on their corresponding keys, in
   both octaves. World chord tones show in blue, the tonic wears the star. */

function PianoMap({ start, count, stage, world, musicKey, active, singDeg, singInTune, onDown, onUp }) {
  const evts = (k) => ({ onPointerDown: (e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(k); }, onPointerUp: () => onUp(k) });
  const baseMidi = Tone.Frequency(musicKey + "4").toMidi();
  const BLACK_PCS = [1, 3, 6, 8, 10];

  // number labels: window notes plus their octave-up copies
  const labels = {};
  exploreNotes(start, count).forEach((n) => {
    labels[n.semi] = n.label;
    if (n.semi + 12 <= 24) labels[n.semi + 12] = n.label;
  });
  const chordal = worldChordTones(world);

  const isBlack = (s) => BLACK_PCS.includes((((baseMidi + s) % 12) + 12) % 12);
  let sStart = 0, sEnd = 24;
  while (isBlack(sStart)) sStart--;   // extend down to a white key
  while (isBlack(sEnd)) sEnd++;       // extend up to a white key
  const keys = [];
  let whiteIdx = -1;
  for (let s = sStart; s <= sEnd; s++) {
    const black = isBlack(s);
    if (!black) whiteIdx++;
    keys.push({ s, black, whiteBefore: whiteIdx });
  }
  const nWhites = whiteIdx + 1;
  const wW = 100 / nWhites;
  const bW = wW * 0.62;

  const singCls = (s) => labels[s] != null && labels[s] === singDeg
    ? (singInTune ? " singing in" : " singing off") : "";

  const homeDeg = world || 1; // starred home follows the selected world (1 only in world 1)
  const keyLabel = (s) => {
    const lab = labels[s];
    if (lab == null || stage === 1) return null;
    const cls = ["pk-label",
      lab === homeDeg && "tonic",
      chordal.includes(lab) && "chordal",
      lab === world && "world-root",
    ].filter(Boolean).join(" ");
    return <span className={cls}>{lab}{lab === homeDeg ? <span className="pk-star">★</span> : null}</span>;
  };

  return (
    <div className="piano" role="group" aria-label="Two-octave piano from the tonic">
      {keys.filter((k) => !k.black).map((k) => (
        <button key={k.s}
          className={"pk white" + (active?.includes("p" + k.s) ? " active" : "") + singCls(k.s)}
          style={{ left: `${k.whiteBefore * wW}%`, width: `${wW}%` }}
          {...evts(k)}
          aria-label={"piano key " + (labels[k.s] ? "degree " + labels[k.s] : "")}>
          {keyLabel(k.s)}
        </button>
      ))}
      {keys.filter((k) => k.black).map((k) => (
        <button key={k.s}
          className={"pk black" + (active?.includes("p" + k.s) ? " active" : "") + singCls(k.s)}
          style={{ left: `${(k.whiteBefore + 1) * wW - bW / 2}%`, width: `${bW}%` }}
          {...evts(k)}
          aria-label={"piano key " + (labels[k.s] ? "degree " + labels[k.s] : "")}>
          {keyLabel(k.s)}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────  GUIDE CHORD STACK  ────────────────────
   His slide notation: the seven degrees stacked, the chord's tones circled. */

function GuideStack({ label, world, tones: tonesProp, hi, home, onPlay, onNote }) {
  // Default = the world's 7th-chord skeleton; pass `tones` to show an exact chord (e.g. a
  // triad). `hi` glows specific degrees (shared voices), `home` stars one (the tonic).
  const tones = tonesProp || worldChordTones(world);
  return (
    <div className="stack">
      {[7, 6, 5, 4, 3, 2, 1].map((d) => {
        const cls = "stack-note" + (tones.includes(d) ? " on" : "")
          + (hi?.includes(d) ? " hi" : "") + (home === d ? " home" : "");
        return onNote
          ? <button key={d} type="button" className={cls + " sn-play"} onClick={() => onNote(d)} aria-label={"Play note " + d}>{d}</button>
          : <span key={d} className={cls}>{d}</span>;
      })}
      {onPlay
        ? <button type="button" className="stack-label sl-play" onClick={() => onPlay(world, tones)} aria-label={"Play the " + label + " chord"}>{label}</button>
        : <span className="stack-label">{label}</span>}
    </div>
  );
}

/* ────────────────────  MARY NOTATION  ────────────────────
   A tiny "number-notation" of a melody: numbers laid out left→right, each sitting
   at a HEIGHT matching its scale degree (the melodic contour) and a WIDTH matching
   its note length (the rhythm), grouped into measure boxes, lyric under each note.
   The note at `active` lights up as the phrase plays; every note is tap-to-hear. */
function MaryNotation({ notes, active, onNote }) {
  const degs = notes.map((n) => n.deg);
  const lo = Math.min(...degs), hi = Math.max(...degs);
  const yOf = (d) => (hi === lo ? 45 : 8 + ((d - lo) / (hi - lo)) * 74); // bottom %
  const measures = [];
  let cur = [], acc = 0;
  notes.forEach((n, i) => {
    cur.push({ ...n, i });
    acc += n.dur;
    if (acc >= 4 - 0.001) { measures.push(cur); cur = []; acc = 0; }
  });
  if (cur.length) measures.push(cur);
  return (
    <div className="mary-notation">
      {measures.map((m, mi) => (
        <div className="mary-measure" key={mi}>
          {m.map((n) => (
            <button key={n.i} type="button"
              className={"mary-note" + (n.deg === 1 ? " tonic" : "") + (active === n.i ? " on" : "")}
              style={{ flexGrow: n.dur }} onClick={onNote ? () => onNote(n.deg) : undefined}
              aria-label={"Play note " + n.deg + " (" + n.lyric + ")"}>
              <span className="mn-slot"><b className="mn-num" style={{ bottom: yOf(n.deg) + "%" }}>{n.deg}</b></span>
              <span className="mn-lyric">{n.lyric}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────  SESSION STACK  ────────────────────
   Chord sessions show stack notation instead of the tonal map:
   the seven degrees stacked 7-down-to-1, picks and answers circled. */

function SessionStack({ picked, correct, wrong, label }) {
  return (
    <div className="stack session-stack">
      {[7, 6, 5, 4, 3, 2, 1].map((d) => {
        const cls = ["stack-note",
          picked?.includes(d) && "picked",
          correct?.includes(d) && "on-correct",
          wrong?.includes(d) && "on-wrong",
        ].filter(Boolean).join(" ");
        return <span key={d} className={cls}>{d}</span>;
      })}
      <span className="stack-label">{label || "?"}</span>
    </div>
  );
}

// A mini stack for one chord in a progression: 7 degrees stacked, its tones
// circled, labelled with its number notation — so the voice movement is visible.
function ProgStack({ roman, tonic, active, wrong }) {
  const tones = roman ? chordByRoman(roman).tones : [];
  const on = new Set(tones.map((d) => (d === 8 ? 1 : d)));
  return (
    <div className={"stack prog-stack" + (roman ? " filled" : "") + (active ? " active" : "") + (wrong ? " wrong" : "")}>
      {[7, 6, 5, 4, 3, 2, 1].map((d) => (
        <span key={d} className={"stack-note" + (on.has(d) ? " on" : "") + (d === tonic ? " home" : "")}>{d}</span>
      ))}
      <span className="stack-label">{roman ? chordNumber(roman, false) : "?"}</span>
    </div>
  );
}

// Melody Paths: one chord's column — the degree grid with its chord tones circled,
// each note tappable to solo over the loop. Lights up when it's the current chord.
function PathColumn({ roman, col, current, lit, onDown, onUp, sevenths }) {
  const tones = new Set(chordTones(chordByRoman(roman), sevenths).map((d) => (d === 8 ? 1 : d)));
  return (
    <div className={"path-col" + (current ? " current" : "")}>
      {PATH_ROWS.map((row, ri) => {
        const id = col + "-" + ri;
        const cls = ["path-note",
          tones.has(row.d) && "on",
          row.d === 1 && row.oct === 4 && "home",
          lit.includes(id) && "lit",
        ].filter(Boolean).join(" ");
        return (
          <button key={ri} className={cls}
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {} onDown(col, ri); }}
            onPointerUp={() => onUp(col, ri)}>
            {row.d}
          </button>
        );
      })}
      <span className="path-label">{chordNumber(roman, sevenths)}</span>
    </div>
  );
}

// FET-style progress row: one square per session question, filled by best score.
function ProgressSquares({ best, total = SESSION_LEN }) {
  return (
    <span className="squares" aria-label={`best ${best} of ${total} on first try`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={"sq" + (i < best ? " on" : "")} />
      ))}
    </span>
  );
}

/* ─────────────────────────  ADVENTURE MAP (Harmonia)  ─────────────────────────
   Pixel world-map layer on Fable's original tile/sword asset pack (window.HARMONIA).
   The hero is a clean placeholder marker until a real sprite PNG is dropped in:
   swap the drawHero() block for ctx.drawImage(codaImg, ...). */

// cx,cy = the current node's CENTER. Coda stands on the node facing the viewer.
function drawHero(ctx, cx, cy, coda, bob) {
  ctx.save();                                                            // soft ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (coda) {
    // Draw at the sprites' NATIVE ~30px (not 26) so the 1px eye highlights survive —
    // downscaling to 26 dropped them and Coda looked closed-eyed. Also reads a touch bigger.
    const dh = 30, dw = coda.width * (dh / coda.height);
    ctx.save();
    ctx.shadowColor = "rgba(87,198,196,0.7)"; ctx.shadowBlur = 5;        // faint teal aura
    ctx.drawImage(coda, cx - dw / 2, cy + 3 - dh - (bob || 0), dw, dh);  // feet just below node center; bob while walking
    ctx.restore();
    return;
  }
  const y = cy - 12 - (bob || 0);                                        // fallback marker until sprite loads
  ctx.save();
  ctx.shadowColor = "#57C6C4"; ctx.shadowBlur = 6;
  ctx.fillStyle = "#6ABF5E"; ctx.fillRect(cx - 3, y + 2, 6, 7);
  ctx.fillStyle = "#57C6C4"; ctx.beginPath(); ctx.arc(cx, y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#EDF2EE"; ctx.fillRect(cx - 1.5, y - 1.5, 2, 2);
  ctx.restore();
}

// deterministic confetti pieces for the forge celebration (stable across re-renders)
const CONFETTI = Array.from({ length: 140 }, (_, i) => ({
  left: (i * 41) % 100,
  delay: ((i * 7) % 24) / 10,       // 0 – 2.3s staggered (rains for several seconds)
  dur: 3.4 + ((i * 13) % 34) / 10,  // 3.4 – 6.7s slow fall so it lingers
  color: ["var(--gold)", "var(--teal)", "var(--green)", "var(--blue)", "#fff", "var(--wrong)"][i % 6],
  drift: (((i * 17) % 13) - 6) * 16,
}));

// Confetti overlay that FADES OUT before unmounting (instead of vanishing mid-fall
// when the celebration state clears). Keeps itself mounted for a short fade.
function Confetti({ show }) {
  const [render, setRender] = useState(show);
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (show) { setRender(true); setOut(false); return; }
    if (!render) return;
    setOut(true); // add the .out class → CSS fades the container to transparent
    const t = setTimeout(() => setRender(false), 650);
    return () => clearTimeout(t);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!render) return null;
  return (
    <div className={"confetti" + (out ? " out" : "")} aria-hidden="true">
      {CONFETTI.map((cf, i) => (
        <i key={i} style={{ left: cf.left + "%", background: cf.color, "--drift": cf.drift + "px", "--dur": cf.dur + "s", "--delay": cf.delay + "s" }} />
      ))}
    </div>
  );
}

// "NUMBERSONG" cover shown over the Adventure screen while the map image + sprites
// load, so the player never sees the raw HUD/logo reflow flash on the way in. Holds
// for a beat once `ready`, then fades out and unmounts.
function AdvSplash({ ready }) {
  const [render, setRender] = useState(true);
  const [out, setOut] = useState(false);
  const startRef = useRef(Date.now());
  useEffect(() => {
    if (!ready) return;
    const hold = Math.max(0, 420 - (Date.now() - startRef.current)); // guarantee it's visible, never itself a flash
    const t1 = setTimeout(() => setOut(true), hold);
    const t2 = setTimeout(() => setRender(false), hold + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ready]);
  if (!render) return null;
  return (
    <div className={"adv-splash" + (out ? " out" : "")} aria-hidden="true">
      <h1 className="adv-splash-logo"><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
    </div>
  );
}

// Excalibar rendered from the sword sheet; collected parts are solid, the rest ghosted.
function ForgeSword({ collected, className }) {
  const H = window.HARMONIA;
  const ref = useRef(null);
  const [img, setImg] = useState(null);
  useEffect(() => { const b = new Image(); b.onload = () => setImg(b); b.src = H.sword; }, []);
  useEffect(() => {
    if (!img) return; const cv = ref.current; if (!cv) return;
    cv.width = H.swordW; cv.height = H.swordH;
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const mask = window.HARMONIA_decodeMask(H);
    for (let i = 0; i < mask.length; i++) {
      const part = mask[i] - 1;
      if (part < 0) continue;
      if (!collected.has(part)) { const p = i * 4; data.data[p] = 60; data.data[p + 1] = 66; data.data[p + 2] = 63; data.data[p + 3] = 95; }
    }
    ctx.putImageData(data, 0, 0);
  }, [img, collected]);
  return <canvas ref={ref} className={className} aria-label="Excalibar" />;
}

// The Dojo = Free Play as an actual place on the map (sits on the home-hearth tile).
const DOJO = { c: 2, r: 20, name: "The Dojo" };
function drawDojo(ctx, cx, cy, img) {
  if (img) {                                                               // pixel-art pagoda sprite
    ctx.save();
    ctx.shadowColor = "#7CADD1"; ctx.shadowBlur = 8;
    ctx.imageSmoothingEnabled = false;
    const h = 32, w = h * (img.width / img.height);
    ctx.drawImage(img, cx - w / 2, cy + 10 - h, w, h);                     // base sits ~on the tile
    ctx.restore();
  } else {                                                                 // vector fallback (sprite not loaded)
    ctx.save();
    ctx.shadowColor = "#7CADD1"; ctx.shadowBlur = 9;
    ctx.fillStyle = "#39474f"; ctx.fillRect(cx - 10, cy - 1, 20, 11);      // body
    ctx.fillStyle = "#7CADD1";                                            // pagoda roof
    ctx.beginPath(); ctx.moveTo(cx - 15, cy + 1); ctx.lineTo(cx, cy - 12); ctx.lineTo(cx + 15, cy + 1); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 15, cy + 1, 30, 2);                                  // eaves
    ctx.restore();
    ctx.fillStyle = "#1a2422"; ctx.fillRect(cx - 3, cy + 2, 6, 8);         // door
  }
  ctx.font = "bold 10px 'Archivo Black', Archivo, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = "#12201d"; ctx.fillText("DOJO", cx + 1, cy + 14);        // label shadow
  ctx.fillStyle = "#EDF2EE"; ctx.fillText("DOJO", cx, cy + 13);            // label
}

// First-time map tour: Verda walks a new player around the world map (coach marks).
const MAP_TOUR = [
  { sel: null, title: "Welcome to Harmonia", text: "This whole world is your training ground. Every glowing marker is a place to sharpen your ear." },
  { sel: "dojo", title: "The Dojo", text: "That little pagoda is the Dojo. Apps and tests alone can't truly train your ears — you have to improvise and create with these sounds too. Drop in any time to play freely, and feel free to follow along on your own instrument." },
  { sel: ".adv-map", markers: true, title: "Your journey", text: "Tap a marker to meet its Keeper and take on their challenge. Clear it and you earn a piece of the blade." },
  { sel: ".adv-sword-mini", title: "The blade", text: "Eight Keepers, eight pieces. Reforge Excalibar and all of Harmonia sings again." },
  { sel: ".adv-hud-actions", title: "Need a refresher?", text: "Tap 📖 down here any time to review how the numbers work. It's always there when you want it." },
  { sel: ".gear-settings", title: "Settings", text: "And ⚙ up here for sound, themes, and anything else you need." },
  { sel: null, title: "Little and often", text: "One more thing — just 5 to 10 minutes a day is enough. Short, steady practice is what turns these numbers into real ears; little and often beats long and rare." },
  { sel: null, title: "Off you go", text: "That's the whole game. Follow your ears — I'll be right beside you. 💛" },
];

const MAPTOUR_CSS = `
.maptour { position: fixed; inset: 0; z-index: 60; }
.maptour-scrim { position: absolute; inset: 0; background: rgba(15,20,18,.7); animation: maptour-fade .2s steps(3) both; }
.maptour-ring { position: absolute; border: 3px solid var(--teal,#57C6C4); box-shadow: 0 0 0 2px var(--ink,#12201d); clip-path: var(--notch); pointer-events: none;
  transition: left .18s steps(4), top .18s steps(4), width .18s steps(4), height .18s steps(4); animation: maptour-blink .9s steps(2) infinite; }
.maptour-box { position: absolute; left: 50%; bottom: max(env(safe-area-inset-bottom,0px), 16px); transform: translateX(-50%); width: min(432px, calc(100vw - 24px));
  display: flex; gap: 12px; align-items: flex-start; background: var(--card,#424845); clip-path: var(--notch);
  box-shadow: inset 2px 2px 0 var(--hl,rgba(255,255,255,.08)), inset -2px -2px 0 var(--sh,rgba(0,0,0,.4)), 0 6px 0 rgba(0,0,0,.45); padding: 14px 15px; }
.maptour-box.top { bottom: auto; top: max(env(safe-area-inset-top,0px), 16px); }
.maptour-face { width: 56px; height: 56px; image-rendering: pixelated; clip-path: var(--notch); border: 2px solid var(--line,#565D59); background: var(--bg,#383D3B); flex: 0 0 auto; }
.maptour-body { flex: 1 1 auto; min-width: 0; }
.maptour-title { font-family: var(--pf,'Courier New',monospace); text-transform: uppercase; letter-spacing: 1px; color: var(--teal,#57C6C4); font-size: 12px; text-shadow: 2px 2px 0 var(--ink,#12201d); margin-bottom: 7px; }
.maptour-text { font-family: var(--sans,Archivo,sans-serif); color: var(--text,#EDF2EE); font-size: 13.5px; line-height: 1.5; margin: 0 0 11px; }
.maptour-actions { display: flex; align-items: center; gap: 10px; }
.maptour-skip { background: transparent; border: 0; font-family: var(--pf,monospace); text-transform: uppercase; letter-spacing: 1px; color: var(--text,#EDF2EE); opacity: .5; font-size: 9px; cursor: pointer; padding: 4px; }
.maptour-dots { flex: 1; display: flex; gap: 5px; justify-content: center; }
.maptour-dots i { width: 6px; height: 6px; background: var(--line,#565D59); }
.maptour-dots i.on { background: var(--teal,#57C6C4); }
.maptour-back { font-family: var(--pf,monospace); font-size: 12px; background: transparent; color: var(--teal,#57C6C4); border: 0; cursor: pointer; padding: 8px 6px; line-height: 1; }
.maptour-next { font-family: var(--pf,monospace); text-transform: uppercase; letter-spacing: 1px; font-size: 10px; background: var(--teal,#57C6C4); color: #12201d; border: 0; clip-path: var(--notch);
  box-shadow: inset 2px 2px 0 rgba(255,255,255,.3), inset -2px -2px 0 rgba(0,0,0,.25); padding: 10px 14px; cursor: pointer; }
@keyframes maptour-fade { from { opacity: 0; } }
@keyframes maptour-blink { 0%,100% { border-color: var(--teal,#57C6C4); } 50% { border-color: var(--gold,#D9B45B); } }
.maptour-marker { position: absolute; width: 26px; height: 26px; transform: translate(-50%,-50%); border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(87,198,196,.75), rgba(87,198,196,0) 70%); box-shadow: 0 0 9px 3px var(--teal,#57C6C4);
  animation: maptour-mglow 1.1s ease-in-out infinite; }
@keyframes maptour-mglow { 0%,100% { transform: translate(-50%,-50%) scale(.8); opacity: .5; } 50% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .maptour-scrim, .maptour-marker { animation: none; } .maptour-ring { animation: none; transition: none; } }
`;

function MapTour({ onClose, onSfx }) {
  const [step, setStep] = useState(0);
  const beep = (n) => { try { onSfx && onSfx(n); } catch (e) {} };
  const [rect, setRect] = useState(null);
  const [markers, setMarkers] = useState([]);
  const cur = MAP_TOUR[step];
  const last = step === MAP_TOUR.length - 1;

  const measure = useCallback(() => {
    const s = MAP_TOUR[step];
    const map = document.querySelector(".adv-map");
    // region markers (canvas-painted) glow on the "tap a marker" step
    if (s && s.markers && map && window.HARMONIA) {
      const r = map.getBoundingClientRect(), sx = r.width / 256, sy = r.height / 416;
      setMarkers(window.HARMONIA.nodes.map((n) => ({ x: r.left + (n.c + 0.5) * 16 * sx, y: r.top + (n.r + 0.5) * 16 * sy })));
    } else setMarkers([]);
    if (!s || !s.sel) { setRect(null); return; }
    if (s.sel === "dojo") {                        // Dojo is canvas-painted: derive from tile (2,20)
      if (!map) { setRect(null); return; }
      const r = map.getBoundingClientRect(), sx = r.width / 256, sy = r.height / 416;
      setRect({ left: r.left + (2 + 0.5) * 16 * sx - 12, top: r.top + (20 + 0.5) * 16 * sy - 14, width: 24, height: 28 });
      return;
    }
    const el = document.querySelector(s.sel);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const pad = s.sel === ".adv-map" ? 0 : 6;
    setRect({ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [step]);

  useEffect(() => {
    measure();
    const on = () => measure();
    window.addEventListener("resize", on);
    const sc = document.querySelector(".adv-scroll");
    sc && sc.addEventListener("scroll", on);
    return () => { window.removeEventListener("resize", on); sc && sc.removeEventListener("scroll", on); };
  }, [measure]);

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const boxTop = rect && (rect.top + rect.height / 2) > vh * 0.55;
  const portrait = typeof window !== "undefined" ? window.VERDA_PORTRAIT : "";

  return (
    <div className="maptour">
      <style>{MAPTOUR_CSS}</style>
      <div className="maptour-scrim" />
      {markers.map((m, i) => <div key={i} className="maptour-marker" style={{ left: m.x, top: m.y }} />)}
      {rect && <div className="maptour-ring" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />}
      <div className={"maptour-box" + (boxTop ? " top" : "")}>
        {portrait && <img className="maptour-face" src={portrait} alt="Verda" />}
        <div className="maptour-body">
          <div className="maptour-title">{cur.title}</div>
          <p className="maptour-text">{cur.text}</p>
          <div className="maptour-actions">
            {!last && <button className="maptour-skip" onClick={() => { beep("move"); onClose(); }}>Skip</button>}
            <span className="maptour-dots">{MAP_TOUR.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}</span>
            {step > 0 && <button className="maptour-back" onClick={() => { beep("move"); setStep(step - 1); }} aria-label="Back">◂</button>}
            <button className="maptour-next" onClick={() => { beep(last ? "select" : "move"); last ? onClose() : setStep(step + 1); }}>{last ? "Let's go!" : "Next ▸"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdventureMap({ nodes, currentId, collected, onEnter, onMenu, onSettings, onGuide, onFree, onForge, onShop, burst, boringMode, celebrateNode, onCelebrateDone, skinId, onReady }) {
  const H = window.HARMONIA;
  const mapRef = useRef(null);
  const swordRef = useRef(null);
  const scrollRef = useRef(null);
  const [tileset, setTileset] = useState(null);
  const [swordImg, setSwordImg] = useState(null);
  const [codaImg, setCodaImg] = useState(null);
  const [dojoImg, setDojoImg] = useState(null);
  const [bakedMap, setBakedMap] = useState(null);
  // Equipped skin as 4 directional frames {s,n,e,w} so the hero faces the way he
  // walks. faceRef holds the current facing ("s" while idle → faces the viewer).
  const [heroFrames, setHeroFrames] = useState(null);
  const faceRef = useRef("s");
  useEffect(() => {
    const set = (typeof window !== "undefined" && window.CODA_SKINS && window.CODA_SKINS[skinId]) || null;
    if (!set) { setHeroFrames(null); return; }
    const out = {}; let pending = 0; let cancelled = false;
    ["s", "n", "e", "w"].forEach((d) => {
      if (!set[d]) return;
      pending++;
      const im = new Image();
      im.onload = () => { out[d] = im; if (--pending === 0 && !cancelled) setHeroFrames({ ...out }); };
      im.src = set[d];
    });
    if (pending === 0) setHeroFrames(null);
    return () => { cancelled = true; };
  }, [skinId]);
  // Signal the parent once the map bg + a hero sprite are loaded, so the NUMBERSONG
  // cover can fade out onto a drawn map instead of a blank/loading frame.
  const readyFiredRef = useRef(false);
  useEffect(() => {
    if (readyFiredRef.current || !onReady) return;
    if ((bakedMap || tileset) && codaImg) { readyFiredRef.current = true; onReady(); }
  }, [bakedMap, tileset, codaImg, onReady]);
  const codaRef = useRef(null);   // Coda's live tile position {c,r} (floats while walking)
  const standRef = useRef(null);  // the tile Coda is resting on (persists across re-renders, so he stays where he last walked)
  const walkRef = useRef(false);  // true while a walk animation is in flight
  const rafRef = useRef(0);

  useEffect(() => {
    const a = new Image(); a.onload = () => setTileset(a); a.src = H.tileset;
    const b = new Image(); b.onload = () => setSwordImg(b); b.src = H.sword;
    if (typeof window !== "undefined" && window.CODA_SPRITE) {
      const c = new Image(); c.onload = () => setCodaImg(c); c.src = window.CODA_SPRITE;
    }
    if (typeof window !== "undefined" && window.DOJO_SPRITE) {
      const d = new Image(); d.onload = () => setDojoImg(d); d.src = window.DOJO_SPRITE;
    }
    if (typeof window !== "undefined" && window.MAP_BAKED) {
      const m = new Image(); m.onload = () => setBakedMap(m); m.src = window.MAP_BAKED;
    }
  }, []);

  // center the view on the hero / current node once the map is drawn
  useEffect(() => {
    const sc = scrollRef.current, cv = mapRef.current;
    if (!sc || !cv || !tileset) return;
    const cn = nodes.find((n) => n.id === currentId);
    if (!cn) return;
    const mapH = cv.getBoundingClientRect().height;
    sc.scrollTop = Math.max(0, ((cn.r + 0.5) / H.gr) * mapH - sc.clientHeight * 0.5);
  }, [tileset, currentId]);

  // full map paint with Coda at tile (codaC,codaR); reused by the static render and the walk loop
  const draw = useCallback((codaC, codaR, bob) => {
    if (!tileset && !bakedMap) return;
    const cv = mapRef.current; if (!cv) return;
    const T = H.tile;
    if (cv.width !== H.gc * T) { cv.width = H.gc * T; cv.height = H.gr * T; }
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (bakedMap) {                                    // pre-rendered seamless map (static layout)
      ctx.drawImage(bakedMap, 0, 0);
    } else for (let r = 0; r < H.gr; r++) for (let c = 0; c < H.gc; c++) {  // fallback: index-paint tiles
      const idx = H.grid[r][c];
      if (!idx) continue;
      ctx.drawImage(tileset, (idx % H.scols) * T, ((idx / H.scols) | 0) * T, T, T, c * T, r * T, T, T);
    }
    nodes.forEach((n) => {
      const x = (n.c + 0.5) * T, y = (n.r + 0.5) * T;
      const cleared = collected.has(H.stageFrag[n.id]);
      const cur = n.id === currentId;
      ctx.save();
      if (cur) { ctx.shadowColor = "#6ABF5E"; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = cleared ? "#57C6C4" : cur ? "#6ABF5E" : "#4a524d";
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#EDF2EE"; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = cleared ? "#12201d" : cur ? "#23302A" : "#9aa39c";
      ctx.font = "bold 8px Archivo, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(cleared ? "★" : String(n.id), x, y + 0.5);
    });
    drawDojo(ctx, (DOJO.c + 0.5) * T, (DOJO.r + 0.5) * T, dojoImg);
    if (collected.size >= 8 && swordImg) {            // post-game: Excalibar rests, glowing, at home
      const mx = (2 + 0.5) * T, my = (24 + 0.5) * T;
      ctx.save();
      ctx.shadowColor = "#D9B45B"; ctx.shadowBlur = 13;
      const sh = 30, sw = swordImg.width * (sh / swordImg.height);
      ctx.drawImage(swordImg, mx - sw / 2, my + 5 - sh, sw, sh);
      ctx.restore();
    }
    const frame = heroFrames ? (heroFrames[faceRef.current] || heroFrames.s) : null;
    drawHero(ctx, (codaC + 0.5) * T, (codaR + 0.5) * T, frame || codaImg, bob);
  }, [tileset, nodes, currentId, collected, codaImg, heroFrames, swordImg, dojoImg, bakedMap]);

  // static render: Coda rests on the tile he last walked to (his standing tile), so a
  // re-render (opening/closing an encounter, coming back from a stage) doesn't snap him
  // back to the current-progression node. First mount seeds the standing tile from currentId.
  useEffect(() => {
    if (walkRef.current) return;
    if (!standRef.current) {
      const cn = nodes.find((n) => n.id === currentId);
      if (cn) standRef.current = { c: cn.c, r: cn.r };
    }
    if (!standRef.current) return;
    codaRef.current = { c: standRef.current.c, r: standRef.current.r };
    draw(standRef.current.c, standRef.current.r, 0);
  }, [draw, currentId, nodes]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // "region cleared" banner auto-dismisses after a beat
  useEffect(() => {
    if (!celebrateNode) return;
    const t = setTimeout(() => onCelebrateDone && onCelebrateDone(), 2800);
    return () => clearTimeout(t);
  }, [celebrateNode]);

  useEffect(() => {
    if (!swordImg) return;
    const cv = swordRef.current; if (!cv) return;
    cv.width = H.swordW; cv.height = H.swordH;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(swordImg, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const mask = window.HARMONIA_decodeMask(H);
    for (let i = 0; i < mask.length; i++) {
      const part = mask[i] - 1;
      if (part < 0) continue;
      if (!collected.has(part)) {
        const p = i * 4;
        data.data[p] = 60; data.data[p + 1] = 66; data.data[p + 2] = 63; data.data[p + 3] = 95;
      }
    }
    ctx.putImageData(data, 0, 0);
  }, [swordImg, collected]);

  // BFS a route from tile (sc,sr) to (tc,tr) over walkable path/clearing tiles
  const WALKABLE = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  const buildRoute = (start, tc, tr) => {
    const sc = Math.round(start.c), sr = Math.round(start.r);
    const key = (c, r) => r * H.gc + c;
    const okTile = (c, r) => c >= 0 && c < H.gc && r >= 0 && r < H.gr && WALKABLE.has(H.grid[r][c]);
    const q = [[sc, sr]]; const prev = new Map([[key(sc, sr), null]]);
    let found = false;
    while (q.length) {
      const [c, r] = q.shift();
      if (c === tc && r === tr) { found = true; break; }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr, k = key(nc, nr);
        if (prev.has(k) || !okTile(nc, nr)) continue;
        prev.set(k, [c, r]); q.push([nc, nr]);
      }
    }
    if (!found) return [{ c: sc, r: sr }, { c: tc, r: tr }]; // fallback: straight hop
    const route = []; let cur = [tc, tr];
    while (cur) { route.push({ c: cur[0], r: cur[1] }); cur = prev.get(key(cur[0], cur[1])); }
    return route.reverse();
  };

  // walk Coda along the road to a node, then fire done()
  const walkTo = (target, done) => {
    const start = codaRef.current || { c: target.c, r: target.r };
    const route = buildRoute(start, target.c, target.r);
    if (route.length < 2) { done && done(); return; }
    walkRef.current = true;
    // keep the walk time roughly constant regardless of distance: a long route
    // (e.g. stage 1 → 7) walks proportionally faster so it doesn't drag; short
    // hops stay natural. Duration lands ~0.9–2.0s either way.
    const len = route.reduce((a, p, i) => (i ? a + Math.hypot(p.c - route[i - 1].c, p.r - route[i - 1].r) : 0), 0);
    const dur = Math.min(2.0, Math.max(0.9, len / 13)); // tiles per second
    const SPEED = len / dur; // tiles per second
    let seg = 1, prevTs = 0;
    const step = (ts) => {
      if (!prevTs) prevTs = ts;
      let remain = SPEED * (ts - prevTs) / 1000; prevTs = ts;
      while (remain > 0 && seg < route.length) {
        const b = route[seg], cur = codaRef.current;
        const dc = b.c - cur.c, dr = b.r - cur.r, dist = Math.hypot(dc, dr);
        if (dist > 1e-4) faceRef.current = Math.abs(dc) >= Math.abs(dr) ? (dc > 0 ? "e" : "w") : (dr > 0 ? "s" : "n");
        if (dist <= remain || dist < 1e-4) { codaRef.current = { c: b.c, r: b.r }; remain -= dist; seg++; }
        else { codaRef.current = { c: cur.c + dc / dist * remain, r: cur.r + dr / dist * remain }; remain = 0; }
      }
      draw(codaRef.current.c, codaRef.current.r, Math.abs(Math.sin(ts / 95)) * 2.5);
      if (seg < route.length) { rafRef.current = requestAnimationFrame(step); }
      else { walkRef.current = false; faceRef.current = "s"; standRef.current = { c: target.c, r: target.r }; draw(target.c, target.r, 0); done && done(); }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const tapMap = (e) => {
    if (walkRef.current) return; // ignore taps mid-walk
    const cv = mapRef.current; const rect = cv.getBoundingClientRect();
    const nx = (e.clientX - rect.left) * (cv.width / rect.width);
    const ny = (e.clientY - rect.top) * (cv.height / rect.height);
    const T = H.tile;
    const dojoD = ((DOJO.c + 0.5) * T - nx) ** 2 + ((DOJO.r + 0.5) * T - ny) ** 2;
    let best = null, bd = 1e9;
    nodes.forEach((n) => {
      const d = ((n.c + 0.5) * T - nx) ** 2 + ((n.r + 0.5) * T - ny) ** 2;
      if (d < bd) { bd = d; best = n; }
    });
    if (dojoD < 22 * 22 && dojoD <= bd) { // the dojo (Free Play) was tapped
      const c0 = codaRef.current;
      const atDojo = c0 && Math.round(c0.c) === DOJO.c && Math.round(c0.r) === DOJO.r;
      if (boringMode || atDojo) onFree(); else walkTo(DOJO, () => onFree());
      return;
    }
    if (!best || bd >= 16 * 16) return;
    const cur = codaRef.current;
    const atNode = cur && Math.round(cur.c) === best.c && Math.round(cur.r) === best.r;
    if (boringMode || atNode) onEnter(best);
    else walkTo(best, () => onEnter(best));
  };

  const have = collected.size;
  const restored = have >= 8; // whole sword reforged → post-game state
  const next = nodes.find((n) => !collected.has(H.stageFrag[n.id]));
  return (
    <div className={"adv-screen" + (restored ? " restored" : "")}>
      <style>{CSS}</style>
      <div className="adv-hud adv-hud-top">
        <img className="adv-logo" width="32" height="24" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
        <span className="adv-title"><span className="w1">NUMBER</span><span className="w2">SONG</span>{restored && <em className="adv-restored-tag"> · restored</em>}</span>
        <button className="gear" onClick={onMenu} aria-label="Main menu">☰</button>
        <button className="gear gear-settings" onClick={onSettings} aria-label="Settings">⚙</button>
      </div>
      <div className="adv-scroll" ref={scrollRef}>
        <canvas ref={mapRef} className="adv-map" onClick={tapMap} role="img" aria-label="Harmonia world map" />
      </div>
      {celebrateNode && H.nodes[celebrateNode - 1] && (
        <div className="map-cleared" aria-hidden="true">
          <span className="map-cleared-star">★</span>
          <span className="map-cleared-text">{H.nodes[celebrateNode - 1].name}<em>region cleared</em></span>
        </div>
      )}
      <div className="adv-hud adv-hud-bottom">
        <div className="adv-forge-chip">
          <canvas ref={swordRef} className={"adv-sword-mini" + (burst ? " burst" : "")} onClick={onForge} role="button" tabIndex={0} aria-label="View Excalibar fragments" />
          <div className="adv-forge-txt">
            <b>{have} / 8</b> fragments
            <span>{have === 8 ? "Excalibar reforged!" : next ? "Next: " + H.fragLabel[H.stageFrag[next.id]] : ""}</span>
          </div>
        </div>
        <div className="adv-hud-actions">
          <button className="ghost shop-btn" onClick={onShop} aria-label="Shop">★</button>
          <button className="ghost" onClick={onGuide} aria-label="How music works">📖</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  APP  ───────────────────────────── */

export default function NumberEarTrainer() {
  const { playCadence, setCadenceSpeed, playDegree, playChord, playChordWR, playProgression, playSemi, sing, singMinor, minorShift, minorVoiceRef, sfx, fanfare, grandFanfare, bootChime, startDrone, stopDrone, setDroneVolume, startPathLoop, stopPathLoop, setSustainVoice, holdNote, releaseNote, releaseAllNotes, stopAll, warm } = useAudio();
  const { playTheme, stopMusic, setMusicOn } = useMusic();
  const [musicPref, setMusicPref] = useState(() => loadPref("music", "1") === "1");

  const [boringMode, setBoringMode] = useState(() => loadPref("boring", "0") === "1"); // classic UI vs Adventure
  const [screen, setScreen] = useState(() => (window.HARMONIA && loadPref("boring", "0") === "0" ? "boot" : "home")); // boot | menu | training | home | adventure | levels | session | results | learn | guide | settings
  // First-time map tour: Verda walks a new player around once, right after the tutorial.
  const [mapTour, setMapTour] = useState(false);
  // Inject the base stylesheet ONCE into <head> so it's ALWAYS present. Every screen also
  // renders its own <style>{CSS}</style>, which React removes+re-adds on each screen swap —
  // and re-parsing that big block cost a one-frame flash of unstyled content (raw serif
  // header, everything in document flow), most visibly on level → map. A persistent head
  // copy keeps the styles applied continuously through the transition, so nothing flashes.
  useLayoutEffect(() => {
    if (typeof document === "undefined" || document.getElementById("ns-base-css")) return;
    const s = document.createElement("style");
    s.id = "ns-base-css";
    s.textContent = CSS;
    const retro = document.getElementById("retro-skin"); // keep base BEFORE retro so .retro still wins
    if (retro && retro.parentNode) retro.parentNode.insertBefore(s, retro);
    else document.head.appendChild(s);
  }, []);
  const [mapReady, setMapReady] = useState(false); // false while the map loads → NUMBERSONG splash covers the entry
  // useLayoutEffect (not useEffect) so mapReady resets to false BEFORE the browser
  // paints the re-entry frame — otherwise the NUMBERSONG cover stays hidden (.out)
  // from the previous visit for one frame, flashing the undrawn map underneath.
  useLayoutEffect(() => {
    if (screen !== "adventure") return;
    setMapReady(false); // AdventureMap re-mounts on each entry and re-fires onReady
    if (loadPref("tut", "0") === "1" && loadPref("maptour", "0") !== "1") {
      savePref("maptour", "1"); setMapTour(true);
    }
  }, [screen]);
  // Freemium/funnel entitlement. `unlocked` students see no gates or CTAs; `onboarded`
  // marks a player who has been through the first-run funnel (or unlocked past it).
  const [unlocked, setUnlocked] = useState(() => loadPref("unlocked", "0") === "1");
  const [onboarded, setOnboarded] = useState(() => loadPref("onboarded", "0") === "1");
  const [tutStep, setTutStep] = useState(0);          // current beat of the tutorial
  const [tutChapter, setTutChapter] = useState("major"); // "major" (Verda / Staircase Meadows) | "minor" (Rue / Lowmoor Fen)
  const tutThenEnterRef = useRef(null);               // node id to enter after a mid-game tutorial (Rue → Lowmoor Fen); null = go to the map
  const [tutMode, setTutMode] = useState("teach");    // "teach" (dialogue beats) | "drill" (3 coached in-cutscene drills)
  const [tutDrillN, setTutDrillN] = useState(0);      // which of the 3 cutscene drills (0..2)
  const [tutDrillTarget, setTutDrillTarget] = useState(null); // pitch-class being tested (note chapters)
  const [tutDrillPhase, setTutDrillPhase] = useState("play"); // play | answer | win
  // Chord-chapter (Sylva) drill state: the target chord's degrees, the goal set the player
  // must tap (root only → the two upper voices → all three), any pre-given degree (drill 2's
  // root), and the player's current picks.
  const [tutChordTones, setTutChordTones] = useState([]); // the target chord's degrees, e.g. [4,6,1]
  const [tutPicks, setTutPicks] = useState([]);           // degrees the player has tapped
  const tutTimerRef = useRef(null);
  const tutGenRef = useRef(0); // bumped when the tutorial is skipped/graduated — an in-flight startTutDrill await checks it and bails (no note/timer leaking onto the map)
  const tutChordRomanRef = useRef(null); // last chord drilled (avoid an immediate repeat)
  const [tutorialActive, setTutorialActive] = useState(false); // (legacy) session Q1 coaching — unused now
  const [tutReveal, setTutReveal] = useState(false);  // reveal the target pad after a wrong tap
  const [revealPc, setRevealPc] = useState(null);     // real-drill: pc of the target, revealed after repeated misses so a stuck learner isn't left guessing
  const [tutCelebrate, setTutCelebrate] = useState(false); // win flash/confetti overlay
  const gated = !unlocked;
  const isMelodyFree = (idx) => unlocked || groupIndexOf(idx) < FREE.melodyGroups;
  const isRegionFree = (nodeIdx) => unlocked || nodeIdx < FREE.adventureRegions;
  const grantUnlock = () => { savePref("unlocked", "1"); savePref("onboarded", "1"); setUnlocked(true); setOnboarded(true); enableSaves(); track("unlock"); };
  // "jojomode" testing unlock: unlock the app, mark every level complete EXCEPT the final
  // adventure region's capstone, and drop the player straight into that last region's level
  // list — so the Excalibar-reforged ending is one short (3-question) drill away. The finale
  // still fires because we enter with the adventure context set (fromAdventure + advStageId),
  // exactly as tapping the node on the map would. See JOJO_MODE up top.
  const grantJojo = () => {
    grantUnlock();
    try { window.localStorage.setItem("numbersong-jojo", "1"); } catch (e) {}
    JOJO_MODE = true; // module flag → sessions run 3 questions, pass on 1
    // the single level to leave unfinished = the capstone of the LAST adventure stage
    const lastStageId = ADV_STAGES.length;                 // node id of the final region
    const lastStage = ADV_STAGES[lastStageId - 1];
    const lastLevels = advGroupOf(lastStage).levels;
    const finaleIdx = lastLevels[lastLevels.length - 1].idx;
    const filled = { melody: {}, chords: {}, progressions: {} };
    ["melody", "chords", "progressions"].forEach((m) => {
      levelsFor(m).forEach((_, i) => {
        if (m === lastStage.mode && i === finaleIdx) return; // leave the finale region clearable
        filled[m][i] = 999; // way past any pass bar → 3 stars everywhere else
      });
    });
    setProgress(filled); saveProgress(filled);
    setBoringMode(false); savePref("boring", "0"); // the finale screen only renders in game mode
    // enter the final region's level list (mirrors enterStage for the last node)
    setFromAdventure(true); setAdvStageId(lastStageId); setMode(lastStage.mode); setMelGroup(lastStage.gi);
    setScreen("levels");
  };
  const finishOnboarding = () => { savePref("onboarded", "1"); setOnboarded(true); };
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  // First-run lead capture (shown once on the first results screen for public players).
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState("idle"); // idle | sending | done | saved | error
  const leadBusyRef = useRef(false);  // in-flight guard: Enter can fire again before the "sending" state lands
  const leadSavedRef = useRef(false); // saved-not-delivered → a resend keeps the saved card, not the entry form
  const submitLead = async () => {
    if (leadBusyRef.current) return; // a POST is already in flight (repeat Enter / double-tap) — ignore
    const email = leadEmail.trim();
    if (!/.+@.+\..+/.test(email)) { track("lead_submit", { outcome: "invalid_email" }); setLeadStatus("error"); return; }
    leadBusyRef.current = true;
    setLeadStatus("sending");
    const first_name = leadName.trim();
    const saveLocal = () => { try { window.localStorage.setItem("numbersong-lead", JSON.stringify({ email, first_name })); } catch (e) {} };
    let delivered = false; // only true when the subscribe actually succeeds — otherwise don't promise an email
    try {
      if (CONVERTKIT_FORM && CONVERTKIT_KEY) {
        const res = await fetch("https://api.convertkit.com/v3/forms/" + CONVERTKIT_FORM + "/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: CONVERTKIT_KEY, email, first_name }),
        });
        delivered = res.ok;
        if (!delivered) saveLocal(); // 4xx (already subscribed / bad address) — keep it, don't claim inbox
      } else {
        saveLocal(); // no provider wired — stash locally, no email will arrive
      }
    } catch (e) {
      saveLocal(); // offline / network error: keep the lead rather than losing it
    } finally {
      leadBusyRef.current = false;
    }
    enableSaves(); // giving your email is what actually saves your progress
    savePref("onboarded", "1"); // persist so a reload never re-nags a converted lead (or double-subscribes) — the confirmation card still shows this session since onboarded STATE stays false
    leadSavedRef.current = !delivered; // so a "sending" resend from the saved card keeps showing the saved card
    track("lead_submit", { outcome: delivered ? "sent" : "saved" }); // outcome only — never the email (PII)
    setLeadStatus(delivered ? "done" : "saved"); // "saved" = progress kept, but no email promise
  };
  const openUpsell = () => { try { sfx("select"); } catch (e) {} setUpsellOpen(true); track("upsell_open"); };
  // The VSL/offer CTAs are now real <a target="_blank"> anchors (class "offer-link")
  // rendered inline — a genuine link tap opens a new tab / in-app browser without
  // navigating the game away, so audio isn't torn down the way a programmatic
  // window.open/anchor-click was in a standalone PWA webview.
  const tryUnlock = () => {
    const code = codeInput.trim().toLowerCase();
    if (code === "jojomode") {
      setCodeErr(false); grantJojo();
      try { sfx("select"); } catch (e) {}
      try { fanfare(); } catch (e) {}
    } else if (code === UNLOCK_CODE.toLowerCase()) {
      setCodeErr(false); grantUnlock();
      try { sfx("select"); } catch (e) {}
      try { fanfare(); } catch (e) {}   // triumphant unlock chime
    } else {
      setCodeErr(true);
      try { sfx("wrong"); } catch (e) {}
    }
  };
  // Leaving the boot/intro screen: unlock audio (iOS gesture), then first-run players
  // drop straight into Adventure for immersion; returning players go to the menu.
  // Guarded so the CTA's click + the global pointerdown listener don't double-fire.
  const bootAdvancedRef = useRef(false);
  const bootAdvance = () => {
    if (bootAdvancedRef.current) return;
    bootAdvancedRef.current = true;
    try { bootChime(); } catch (e) {}
    try { haptic(false); } catch (e) {}
    // Everyone sees Verda's first-run tutorial once (gated only on the "tut" flag, like
    // the mid-game keeper tutorials) — so paid students meet Verda too, and Rue/Sylva/
    // Bassil's callbacks to her never dangle. Returning players (tut seen) skip to the map.
    const toTutorial = loadPref("tut", "0") !== "1";
    track("boot_advance", { to: toTutorial ? "tutorial" : "adventure", unlocked });
    if (toTutorial) startTutorial("major");
    else setScreen("adventure");
  };
  // Verda's tutorial. Skip jumps to the map. After the teaching beats she runs 3 coached
  // in-cutscene drills (play a note → feel it → tap the number), then hands into the REAL
  // Region-1 First Steps session (the "actual" ear training; no more coaching).
  const TUT_DRILLS = 3;
  // Per-chapter config. Both tutorials teach in C's note-set: major home = 1 (C), minor
  // home = 6 (A, the relative minor) — "same notes, home moved". pool = the pitch-classes
  // the coached drills quiz (major 1·2·3; minor 6·7·1 — home + its neighbours). flag = the localStorage
  // "seen it" pref so each tutorial only auto-shows once.
  const TUT_CFG = {
    major: { key: "C", mode: "major", homePc: 0, pool: [0, 2, 4], flag: "tut", kind: "note",
      spriteAlt: "Verda", sceneClass: "", nameTab: "Verda, the Meadow Keeper", loc: "Staircase Meadows" },
    minor: { key: "C", mode: "minor", homePc: 9, pool: [9, 11, 0], flag: "tut2", kind: "note",
      spriteAlt: "Rue", sceneClass: "tut-fen", nameTab: "Old Rue of the Fen", loc: "Lowmoor Fen" },
    // Sylva / chords (Glasswood, node 3). pool = the workhorse triads by roman; the coached
    // drills quiz these as chords (hear → tap the degrees on the stack), not single notes.
    chords: { key: "C", mode: "major", homePc: 0, pool: ["I", "IV", "V", "vi"], flag: "tut3", kind: "chord",
      spriteAlt: "Sylva", sceneClass: "tut-glass", nameTab: "Sylva of the Glasswood", loc: "the Glasswood" },
  };
  const tutCfg = TUT_CFG[tutChapter];
  // Where to go when a tutorial ends: a mid-game tutorial (Rue) drops you INTO its region;
  // the first-run tutorial (Verda) just opens the map.
  const finishTut = () => {
    const node = tutThenEnterRef.current; tutThenEnterRef.current = null;
    if (node != null) enterStage({ id: node }); else setScreen("adventure");
  };
  const skipTutorial = () => { tutGenRef.current++; savePref(tutCfg.flag, "1"); if (tutTimerRef.current) clearTimeout(tutTimerRef.current); try { sfx("select"); } catch (e) {} track("tutorial_skip", { chapter: tutChapter, step: tutStep }); finishTut(); };
  const graduateTutorial = () => { tutGenRef.current++; savePref(tutCfg.flag, "1"); setTutMode("teach"); if (tutTimerRef.current) clearTimeout(tutTimerRef.current); try { sfx("select"); } catch (e) {} track("tutorial_complete", { chapter: tutChapter }); finishTut(); };
  // Enter a tutorial fresh (resets its cutscene state). thenEnter = node id to open after it (Rue), or null (Verda → map).
  const startTutorial = (chapter, thenEnter = null) => {
    tutGenRef.current++;
    setTutChapter(chapter); tutThenEnterRef.current = thenEnter;
    setTutStep(0); setTutMode("teach"); setTutDrillN(0);
    setTutDrillTarget(null); setTutDrillPhase("play"); setTutReveal(false);
    setScreen("tutorial");
  };
  // Replay the current chapter's tutorial from the top (from the menu) — don't touch its flag.
  const replayTutorial = () => { try { sfx("select"); } catch (e) {} startTutorial(tutChapter, tutThenEnterRef.current); };
  // Sylva's chord drills mirror the real chord level (hear a chord → tap its degrees → check).
  // Same task each time (name all three); the ramp is the chord pool getting harder.
  const CHORD_DRILLS = [{ pool: ["I", "IV"] }, { pool: ["I", "IV", "V"] }, { pool: ["I", "IV", "V", "vi"] }];
  const startTutDrill = async (n) => {
    const gen = tutGenRef.current;
    if (tutCfg.kind === "chord") {
      const cfg = CHORD_DRILLS[n];
      let roman; do { roman = cfg.pool[Math.floor(Math.random() * cfg.pool.length)]; } while (roman === tutChordRomanRef.current && cfg.pool.length > 1);
      tutChordRomanRef.current = roman;
      const tones = chordTones(chordByRoman(roman)); // triad [root, third, fifth]
      setTutChordTones(tones); setTutPicks([]); setTutReveal(false); setTutDrillPhase("play");
      try {
        const t = (await playCadence("C", "major")) + 0.25; // establish home, THEN the chord —
        if (gen !== tutGenRef.current) return;                //   delayed by `t` so they don't overlap
        const dur = await playChordWR("C", tones, "both", t);
        if (tutTimerRef.current) clearTimeout(tutTimerRef.current);
        tutTimerRef.current = setTimeout(() => { if (gen === tutGenRef.current) setTutDrillPhase("answer"); }, (t + dur + 0.1) * 1000);
      } catch (e) { if (gen === tutGenRef.current) setTutDrillPhase("answer"); }
      return;
    }
    const pool = tutCfg.pool; // major 1·2·3, minor 6·7·1
    // The minor test opens on 6 (home) so the first note the player names is the fen's
    // resting place; the rest of the drills stay random from the pool.
    let pc;
    if (tutChapter === "minor" && n === 0) pc = tutCfg.homePc;
    else { do { pc = pool[Math.floor(Math.random() * pool.length)]; } while (pc === tutDrillTarget && pool.length > 1); }
    setTutDrillTarget(pc); setTutReveal(false); setTutDrillPhase("play");
    try {
      const t = (await playCadence(tutCfg.key, tutCfg.mode)) + 0.25; // establish "home", then the note
      if (gen !== tutGenRef.current) return; // Skip/graduate landed during the cadence → don't play the note or re-arm the timer
      playSemi(tutCfg.key, pc, t, 4);
      if (tutTimerRef.current) clearTimeout(tutTimerRef.current);
      tutTimerRef.current = setTimeout(() => { if (gen === tutGenRef.current) setTutDrillPhase("answer"); }, (t + 0.25) * 1000);
    } catch (e) { if (gen === tutGenRef.current) setTutDrillPhase("answer"); }
  };
  const enterTutDrills = () => { try { sfx("select"); } catch (e) {} track("tutorial_drills_start", { chapter: tutChapter }); setTutMode("drill"); setTutDrillN(0); startTutDrill(0); };
  const replayTutNote = () => {
    try {
      if (tutCfg.kind === "chord") { playChordWR("C", tutChordTones, "both"); return; } // walk, then ring — no cadence on replay
      playCadence(tutCfg.key, tutCfg.mode).then((t) => playSemi(tutCfg.key, tutDrillTarget, t + 0.2, 4));
    } catch (e) {}
  };
  const playTutCadenceMinor = () => { if (busy) return; try { playCadence("C", "minor"); } catch (e) {} }; // Rue's "hear home settle on 6"
  const answerTutDrill = (pc) => {
    if (tutDrillPhase !== "answer") return;
    if (pc === tutDrillTarget) {
      const gen = tutGenRef.current;
      setTutDrillPhase("win"); setTutReveal(false);
      try { haptic(false); } catch (e) {}
      setTutCelebrate(true);
      try { playResolution(tutCfg.key, 4, tutDrillTarget, tutCfg.mode, false, () => {}); } catch (e) {}
      // Wait for the walk-home resolution to actually finish before advancing. The old
      // fixed 2900ms was shorter than a degree-3 resolution (3×resStep+0.7s ≥ 3.1s, more
      // at Slow speed), so the next cadence started over its tail. Derive from resStep.
      const resMs = (resolutionSemis(tutDrillTarget, tutCfg.mode).length * resStep + 0.7) * 1000;
      if (tutTimerRef.current) clearTimeout(tutTimerRef.current);
      tutTimerRef.current = setTimeout(() => {
        if (gen !== tutGenRef.current) return; // skipped/graduated during the celebration
        setTutCelebrate(false);
        if (tutDrillN + 1 < TUT_DRILLS) { setTutDrillN((k) => k + 1); startTutDrill(tutDrillN + 1); }
        else {
          // done — a short graduation beat (the keeper's send-off) before entering
          savePref(tutCfg.flag, "1"); setTutDrillN(0); setTutMode("done");
        }
      }, resMs + (tutDrillN + 1 < TUT_DRILLS ? 500 : 200));
    } else {
      setTutReveal(true); // reveal the target — "feel it again, it's the glowing one"
      try { playSemi(tutCfg.key, pc, 0, 4); } catch (e) {}
    }
  };
  // Sylva chord drill (matches the real chord level): tap degrees to build the answer, then Check.
  const toggleTutPick = (d) => {
    if (tutDrillPhase !== "answer") return;
    setTutReveal(false);
    setTutPicks((p) => p.includes(d) ? p.filter((x) => x !== d) : (p.length < tutChordTones.length ? [...p, d] : p));
  };
  const checkTutChord = () => {
    if (tutDrillPhase !== "answer" || tutPicks.length !== tutChordTones.length || busy) return;
    const gen = tutGenRef.current;
    const ok = tutChordTones.every((d) => tutPicks.includes(d));
    if (ok) {
      setTutDrillPhase("win"); setTutReveal(false);
      try { haptic(false); } catch (e) {}
      setTutCelebrate(true);
      try { playChordWR("C", tutChordTones, "ring"); } catch (e) {} // triumphant ring of the whole chord
      if (tutTimerRef.current) clearTimeout(tutTimerRef.current);
      tutTimerRef.current = setTimeout(() => {
        if (gen !== tutGenRef.current) return; // skipped/graduated during the celebration
        setTutCelebrate(false);
        if (tutDrillN + 1 < TUT_DRILLS) { setTutDrillN((k) => k + 1); startTutDrill(tutDrillN + 1); }
        else { savePref(tutCfg.flag, "1"); setTutDrillN(0); setTutMode("done"); }
      }, 1900);
    } else {
      // wrong → glow the true tones, re-walk the chord, then clear picks to retry
      setTutReveal(true);
      try { playChordWR("C", tutChordTones, "walk"); } catch (e) {}
      if (tutTimerRef.current) clearTimeout(tutTimerRef.current);
      tutTimerRef.current = setTimeout(() => { if (gen === tutGenRef.current) { setTutPicks([]); setTutReveal(false); } }, (tutChordTones.length * 0.5 + 0.6) * 1000);
    }
  };
  const [mode, setMode] = useState("melody");     // melody | chords
  const [levelIdx, setLevelIdx] = useState(0);
  const [melGroup, setMelGroup] = useState(null);  // which of the 4 melody worlds is open (null = world picker)
  const [chordChapter, setChordChapter] = useState(null); // which chord chapter is open (null = chapter picker)
  const [progChapter, setProgChapter] = useState(null);   // which progression chapter is open
  const [fromAdventure, setFromAdventure] = useState(false); // entered a stage from the map? (back → map)
  const [advStageId, setAdvStageId] = useState(null);        // region node entered from the map (encounter/victory)
  const [encounterNode, setEncounterNode] = useState(null);  // region id whose encounter modal is open on the map
  const [auxReturn, setAuxReturn] = useState(null);          // where guide/free-play/settings back should go (e.g. "adventure")
  const [forgeOpen, setForgeOpen] = useState(false);         // Excalibar fragment inventory modal (on the map)
  // overlay-modal a11y: panel refs for focus-move-in / focus-trap
  const upsellPanelRef = useRef(null);
  const forgePanelRef = useRef(null);
  const encPanelRef = useRef(null);
  const [mapCelebrateNode, setMapCelebrateNode] = useState(null); // node to play a "region cleared!" flourish on next map view
  const [swordBurst, setSwordBurst] = useState(false);       // one-shot forge flash after earning a fragment
  const sessWasClearedRef = useRef(false);                   // was the region already cleared before this session?
  const [melTab, setMelTab] = useState("stages");  // stages | custom
  const [sessLvl, setSessLvl] = useState(null);     // the level object being played (may be a custom one)

  // custom-level builder
  const [cuMode, setCuMode] = useState("major");
  const [cuKey, setCuKey] = useState("c");          // c | not-c | random
  const [cuOct, setCuOct] = useState(false);        // many octaves?
  const [cuNotes, setCuNotes] = useState([0, 2, 4, 5, 7, 9, 11]); // selected pitch-classes

  const bestOf = (m, idx) => (progress[m] && progress[m][idx]) || 0;
  const isPassed = (m, idx) => {
    const lv = levelsFor(m)[idx];
    return lv ? bestOf(m, idx) >= passCountFor(lv) : false;
  };
  // 3-star rating per level: passed = 1, one miss = 2, perfect = 3.
  const starsFor = (m, idx) => {
    const lv = levelsFor(m)[idx]; if (!lv) return 0;
    const best = bestOf(m, idx), q = qCountOf(lv), pass = passCountFor(lv);
    if (best < pass) return 0;
    if (best >= q) return 3;
    if (best >= q - 1) return 2;
    return 1;
  };
  const totalStars = () => {
    let t = 0;
    ["melody", "chords", "progressions"].forEach((m) => { levelsFor(m).forEach((_, i) => { t += starsFor(m, i); }); });
    return t;
  };
  const [shop, setShop] = useState(() => {
    try { const v = JSON.parse(loadPref("shop", "")); return (v && v.owned) ? v : { owned: [], skin: "default" }; }
    catch (e) { return { owned: [], skin: "default" }; }
  });
  const saveShop = (v) => { setShop(v); savePref("shop", JSON.stringify(v)); };
  const spentStars = () => shop.owned.reduce((a, id) => a + ((SHOP.find((x) => x.id === id) || {}).cost || 0), 0);
  const starBalance = () => totalStars() - spentStars();
  const buyItem = (item) => {
    if (shop.owned.includes(item.id) || starBalance() < item.cost) return;
    saveShop({ ...shop, owned: [...shop.owned, item.id], skin: item.type === "skin" ? item.id : shop.skin });
    sfx("select");
  };
  const equipSkin = (id) => { saveShop({ ...shop, skin: id }); sfx("move"); };
  const skinId = shop.skin || "default";
  const [progress, setProgress] = useState(loadProgress);
  // Progress only PERSISTS (survives reload) once the player has "saved" — i.e. given
  // their email on the results card, or unlocked the full app. It still updates
  // in-memory during a session (stars show) but a gated skipper loses it on reload.
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const canSave = () => unlocked || loadPref("saveok", "0") === "1";
  const enableSaves = () => { savePref("saveok", "1"); try { saveProgress(progressRef.current); } catch (e) {} };

  const [musicKey, setMusicKey] = useState("C");
  const [voiceOn, setVoiceOn] = useState(true);
  const [busy, setBusy] = useState(false);

  // preferences
  const [theme, setTheme] = useState(() => loadPref("theme", "dark"));
  const [testCfgOpen, setTestCfgOpen] = useState(false); // in-session quick settings (tempo/resolution/theme)
  const [resStep, setResStep] = useState(() => parseFloat(loadPref("resstep", "0.8")) || 0.8);
  const [progBeat, setProgBeat] = useState(() => parseFloat(loadPref("progbeat", "1.0")) || 1.0);
  const [testTempo, setTestTempo] = useState(() => parseFloat(loadPref("tempo", "1")) || 1); // question-cadence speed (slider; >1 faster)
  const [chordSevenths, setChordSevenths] = useState(() => loadPref("sevenths", "0") === "1");
  const [showRef, setShowRef] = useState(() => loadPref("chordref", "1") === "1"); // chord-tones reference chart
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    savePref("theme", theme);
  }, [theme]);
  // Keep audio alive across backgrounding. A standalone PWA (or any tab switch,
  // incoming call, or opening the VSL) suspends the AudioContext, and nothing
  // else resumes it — so ambient music goes silent. Resume it on return to front.
  useEffect(() => {
    // We DON'T guard on Tone.context.state here: iOS Safari has a bug where, after an
    // interruption (opening a link, a call, another audio app), the context reports
    // "running" while producing NO sound — so a state-guarded resume() skips it and the
    // game stays silent forever. Always resume on return; and on the first user gesture
    // after backgrounding, do the full Tone.start() unlock (plays a silent buffer, which
    // re-establishes the audio output the "silent-but-running" state has lost).
    let wasHidden = false;
    // resume()/suspend()/start() return PROMISES that can reject (e.g. Instagram's in-app
    // browser rejects with "Failed to start the audio device" even when audio is fine).
    // A bare call would leave that rejection unhandled → the global error overlay pops.
    // quiet() swallows both the sync throw and the async rejection.
    const quiet = (p) => { try { if (p && typeof p.catch === "function") p.catch(() => {}); } catch (e) {} };
    const ctxResume = () => { try { quiet(Tone.context.resume()); } catch (e) {} };
    // Play a 1-sample silent buffer on the raw context — the classic iOS unlock that
    // re-establishes audio output even when the context wrongly reports "running".
    // (Tone.start() skips its own silent buffer in that state, so do it explicitly.)
    const kick = () => {
      try {
        const raw = (Tone.getContext && Tone.getContext().rawContext) || Tone.context.rawContext;
        if (!raw) return;
        if (raw.state !== "running") quiet(raw.resume());
        const b = raw.createBuffer(1, 1, 22050);
        const s = raw.createBufferSource();
        s.buffer = b; s.connect(raw.destination); s.start(0);
      } catch (e) {}
    };
    // Leaving the game (opening the VSL, switching tabs, home screen, another app):
    // pause the audio so the game's music doesn't keep bleeding out. Desktop browsers
    // won't auto-suspend a tab that's actively playing, and even on mobile the pause
    // wasn't reliable — so we suspend it ourselves on every "we're going away" signal.
    const pause = () => { wasHidden = true; try { quiet(Tone.context.rawContext.suspend()); } catch (e) {} };
    const onVis = () => { document.visibilityState === "hidden" ? pause() : ctxResume(); };
    const onGesture = () => {
      ctxResume();
      if (wasHidden) { kick(); wasHidden = false; }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", pause);
    window.addEventListener("focus", ctxResume);
    window.addEventListener("pageshow", ctxResume);
    window.addEventListener("pointerdown", onGesture, true);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("focus", ctxResume);
      window.removeEventListener("pageshow", ctxResume);
      window.removeEventListener("pointerdown", onGesture, true);
    };
  }, []);
  // Installed-to-home-screen? Reserve a top buffer for the status bar ourselves,
  // since some iOS versions don't resolve env(safe-area-inset-top) in a web app.
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      if (standalone) document.documentElement.setAttribute("data-standalone", "1");
    } catch (e) {}
  }, []);
  // retro game skin is on unless the player is in Boring mode
  useEffect(() => {
    document.documentElement.classList.toggle("retro", window.HARMONIA && !boringMode);
  }, [boringMode]);
  // Student unlock via magic link (?unlock=<CODE> or #unlock=<CODE>). Flips to the
  // full, funnel-free app and strips the code from the URL so it isn't left visible.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const code = q.get("unlock") || h.get("unlock");
      if (code) {
        // Case-insensitive (matches the typed-in-Settings unlock), and strip the code
        // from the URL EVEN ON A MISMATCH so a mistyped-case link doesn't leave the code
        // sitting in the address bar.
        const c = code.trim().toLowerCase();
        if (c === "jojomode") grantJojo();       // dev/testing: jump to the ending
        else if (c === UNLOCK_CODE.toLowerCase()) grantUnlock();
        window.history.replaceState(null, "", window.location.pathname);
      } else if (q.has("lock") || h.has("lock")) {
        // ?lock — reset this device to a FRESH PUBLIC visitor (gated + not onboarded),
        // for testing the locked funnel. Inverse of the unlock magic link. Also clears
        // jojomode so a jojo device can return to a normal locked funnel.
        try { ["unlocked", "onboarded", "saveok", "progress", "tut", "jojo"].forEach((k) => window.localStorage.removeItem("numbersong-" + k)); } catch (e) {}
        JOJO_MODE = false;
        setUnlocked(false); setOnboarded(false); setProgress({ melody: {}, chords: {}, progressions: {} });
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (e) {}
  }, []);
  // twinkle when landing on the map right after clearing a region
  useEffect(() => {
    if (screen === "adventure" && mapCelebrateNode) sfx("twinkle");
  }, [screen, mapCelebrateNode]);

  // Haptics: navigator.vibrate (Android) + a hidden iOS <input switch> whose
  // toggle produces a light haptic on iOS 17.4+ (best effort; iOS blocks vibrate).
  const hapticRef = useRef(null);
  useEffect(() => {
    const inp = document.createElement("input");
    inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.setAttribute("aria-hidden", "true"); inp.tabIndex = -1;
    inp.style.cssText = "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(inp); hapticRef.current = inp;
    return () => { try { document.body.removeChild(inp); } catch (e) {} };
  }, []);
  const haptic = (big) => {
    try { if (navigator.vibrate) navigator.vibrate(big ? [90, 60, 90, 60, 90, 60, 320] : 55); } catch (e) {}
    try {
      const el = hapticRef.current;
      if (el) { el.click(); if (big) { setTimeout(() => el.click(), 130); setTimeout(() => el.click(), 270); setTimeout(() => el.click(), 430); } }
    } catch (e) {}
  };
  // one-shot forge flash after earning a fragment (clears itself)
  useEffect(() => {
    if (!swordBurst) return;
    const t = setTimeout(() => setSwordBurst(false), 1500);
    return () => clearTimeout(t);
  }, [swordBurst]);
  // boot screen: any key / tap starts the game (and unlocks audio)
  useEffect(() => {
    if (screen !== "boot") return;
    bootAdvancedRef.current = false;
    window.addEventListener("keydown", bootAdvance, { once: true });
    window.addEventListener("pointerdown", bootAdvance, { once: true });
    return () => { window.removeEventListener("keydown", bootAdvance); window.removeEventListener("pointerdown", bootAdvance); };
    // `unlocked` is in the deps so a ?unlock=<CODE> student who flips to unlocked AFTER
    // this effect first ran re-registers a fresh bootAdvance (whose closure sees the
    // new value) → boot tap routes them to the map, not Verda's beginner tutorial.
  }, [screen, sfx, unlocked]);
  // Warm the piano sampler in the background once the player is past boot (audio is unlocked),
  // so the FIRST drill doesn't stall while 13 samples download. Runs at most once.
  const warmedRef = useRef(false);
  useEffect(() => {
    if (warmedRef.current || screen === "boot") return;
    warmedRef.current = true;
    const t = setTimeout(() => { try { warm && warm(); } catch (e) {} }, 400);
    return () => clearTimeout(t);
  }, [screen, warm]);

  // ladder highlights
  const [litActive, setLitActive] = useState([]);
  const [playIdx, setPlayIdx] = useState(-1); // which note index of a tutorial phrase is sounding (for MaryNotation)
  const [chromLit, setChromLit] = useState(-1); // which chromatic-map pad is flashing (tutorial 12-pitches beat)
  const [litCorrect, setLitCorrect] = useState([]);
  const [litWrong, setLitWrong] = useState([]);
  const [hitPad, setHitPad] = useState(null); // pc of a just-answered-correct pad, for the reward pop

  // session UI state
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("idle");     // idle | playing | answer | resolving
  // Live mirrors of phase/busy so a DELAYED callback (e.g. the miss path's 650ms
  // replayTarget) tests the CURRENT phase, not the stale closure it captured — a
  // correct answer landing first must cancel the pending replay, not play over it.
  const phaseRef = useRef(phase); const busyRef = useRef(busy);
  useEffect(() => { phaseRef.current = phase; busyRef.current = busy; }, [phase, busy]);
  const [feedback, setFeedback] = useState(null); // string or {roman}
  const [chPicked, setChPicked] = useState([]);
  const [progAnswer, setProgAnswer] = useState([]); // romans tapped so far
  const [progWrong, setProgWrong] = useState([]);   // wrong slot indices
  const [progActive, setProgActive] = useState(-1); // chord index lit during replay
  const [streak, setStreak] = useState(0);          // live first-try streak
  const [sessionResults, setSessionResults] = useState([]);
  const [sessKey, setSessKey] = useState("C");

  const sess = useRef({});
  const nextQuestionRef = useRef(() => {});
  const sessTimersRef = useRef([]);
  const sessTimer = (fn, ms) => { sessTimersRef.current.push(setTimeout(fn, ms)); };
  // Generation token: bumped on every teardown/restart. An async nextQuestion() that
  // was mid-await (e.g. waiting on the first-question audio context) checks this after
  // each await and bails — so quitting during load can't leak a note or set phase on a
  // dead session.
  const sessGenRef = useRef(0);
  const killSession = () => {
    sessGenRef.current++;
    sessTimersRef.current.forEach(clearTimeout);
    sessTimersRef.current = [];
    stopAll();
  };

  // ── overlay-modal accessibility (upsell / forge / encounter) ──
  // One effect covers all three: role="dialog"+aria-modal are on the panels; here we
  // move focus into the panel on open, trap Tab inside it, close on Escape, lock body
  // scroll, and restore focus to the trigger on close.
  useEffect(() => {
    let panelRef = null, close = null;
    if (upsellOpen) { panelRef = upsellPanelRef; close = () => setUpsellOpen(false); }
    else if (forgeOpen) { panelRef = forgePanelRef; close = () => setForgeOpen(false); }
    else if (encounterNode) { panelRef = encPanelRef; close = () => setEncounterNode(null); }
    if (!close) return;
    const prevFocus = typeof document !== "undefined" ? document.activeElement : null;
    const panel = panelRef && panelRef.current;
    if (panel) { try { panel.focus(); } catch (e) {} }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab" && panel) {
        const list = Array.from(panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!list.length) { e.preventDefault(); return; }
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {} }
    };
  }, [upsellOpen, forgeOpen, encounterNode]);

  // guide
  const [guidePage, setGuidePage] = useState(0);

  const playPhrase = (degs) => {
    if (busy) return;
    setBusy(true);
    const step = 0.55;
    degs.forEach((d, i) => {
      playDegree(musicKey, d, i * step);
      sing(musicKey, d, voiceOn, i * step, i < degs.length - 1 ? step : null);
      setTimeout(() => setLitActive([DEGREE_SEMITONES[d]]), i * step * 1000);
    });
    setTimeout(() => { setLitActive([]); setBusy(false); }, (degs.length * step + 0.8) * 1000);
  };

  // Tutorial phrase player: lights the ExploreMap (whose active id = degree in the
  // 1..8 window, so raw === degree) AND honours per-note rhythm — durs are relative
  // note lengths (default even). This is why the map now animates in step with the
  // melody and why "Mary" swings on the real tune instead of a flat pulse.
  const playTutPhrase = (degs, durs) => {
    if (busy) return;
    setBusy(true);
    const beat = 0.52; // seconds per unit length
    let t = 0;
    const onset = degs.map((d, i) => { const at = t; t += (durs ? durs[i] : 1) * beat; return at; });
    degs.forEach((d, i) => {
      const gap = (durs ? durs[i] : 1) * beat;
      playDegree(musicKey, d, onset[i]);
      sing(musicKey, d, voiceOn, onset[i], i < degs.length - 1 ? gap : null);
      setTimeout(() => { setLitActive([d]); setPlayIdx(i); }, onset[i] * 1000);
    });
    setTimeout(() => { setLitActive([]); setPlayIdx(-1); setBusy(false); }, (t + 0.8) * 1000);
  };

  // Play a single scale degree (tapping one note in a chord stack or the notation).
  // No busy-lock so a curious player can tap around freely, like the map.
  const playStackNote = (d) => { try { playDegree(musicKey, d, 0); sing(musicKey, d, voiceOn); } catch (e) {} };

  const playTwoFiveOne = () => {
    if (busy) return;
    setBusy(true);
    const seq = [{ degs: [2, 4, 6], root: 2 }, { degs: [5, 7, 9], root: 5 }, { degs: [1, 3, 5], root: 1 }];
    seq.forEach(({ degs, root }, i) => {
      degs.forEach((d) => playDegree(musicKey, d, i * 0.9));
      playDegree(musicKey, root, i * 0.9, 3);
    });
    setTimeout(() => setBusy(false), 3400);
  };

  // Play one chord stack (a triad voiced above its root) — used by the clickable
  // 2-5-1 stacks in the tutorial.
  const playChordStack = (world) => {
    if (busy) return;
    setBusy(true);
    [world, world + 2, world + 4].forEach((d) => playDegree(musicKey, d, 0));
    playDegree(musicKey, world, 0, 3);
    setTimeout(() => setBusy(false), 1300);
  };

  // free explore
  const [exStart, setExStart] = useState(1);
  const [exCount, setExCount] = useState(3);
  const [exStage, setExStage] = useState(0);
  const [exWorld, setExWorld] = useState(1);
  const [exOctaves, setExOctaves] = useState(1);
  const [exView, setExView] = useState("map"); // map | piano
  const [droneOn, setDroneOn] = useState(false);
  const [droneVol, setDroneVol] = useState(() => { // drone loudness in dB, remembered
    const v = parseFloat(loadPref("dronevol", "-8"));
    return Number.isFinite(v) ? v : -8;
  });

  // Sing tuner (7-worlds tab): live mic pitch → the number you're singing.
  const [micOn, setMicOn] = useState(false);
  const [micReq, setMicReq] = useState(false);    // asking for permission (await in flight)
  const [micErr, setMicErr] = useState(false);    // permission denied / no device
  const [singDeg, setSingDeg] = useState(null);   // 1..7 you're currently singing, or null
  const [singCents, setSingCents] = useState(0);  // ± cents off that degree (− flat, + sharp)
  const [singInTune, setSingInTune] = useState(false);
  const [singLevel, setSingLevel] = useState(0);  // input loudness 0..1, so "mic is alive" is visible
  const micRef = useRef(null); // { stream, source, analyser, buf, raf, last }

  // Free Play: Melody Paths jam
  const [fpTab, setFpTab] = useState("notes");         // notes | paths
  const [fpOptionsOpen, setFpOptionsOpen] = useState(false); // landscape focus mode: reveal the tucked-away secondary controls
  const [pathProg, setPathProg] = useState(["I", "V", "vi", "IV"]);
  const [pathIdx, setPathIdx] = useState(-1);          // current chord in the loop (-1 stopped)
  const [pathCount, setPathCount] = useState(0);       // count-in number showing (0 = none)
  const [pathPlaying, setPathPlaying] = useState(false);
  const [pathBuild, setPathBuild] = useState(false);   // building a custom progression
  const [litPath, setLitPath] = useState([]);          // note cells lit when tapped
  const [pathBeat, setPathBeat] = useState(1.6);       // seconds per bar/chord
  const [pathSevenths, setPathSevenths] = useState(false);
  const [pathDrums, setPathDrums] = useState(true);
  const [pathVoice, setPathVoice] = useState(false); // singing off by default in Paths
  const [susVoice, setSusVoice] = useState("piano"); // Free Play sustain instrument
  const keyHeldRef = useRef({}); // held keyboard keys → { note, litId, litSet }
  const pathBeatRef = useRef(1.6);                     // live tempo for the running loop
  const pathDrumsRef = useRef(true);                   // live drums on/off
  const pathIdxRef = useRef(-1);                       // current column, for keyboard play

  useEffect(() => {
    if (droneOn && screen === "learn") startDrone(musicKey, exWorld, droneVol);
    else stopDrone();
    return () => stopDrone();
    // droneVol deliberately excluded — volume changes are applied live below,
    // without re-attacking the drone.
  }, [droneOn, musicKey, exWorld, screen, startDrone, stopDrone]);
  // Live drone-volume changes (no restart) + remember the setting.
  useEffect(() => {
    setDroneVolume(droneVol);
    savePref("dronevol", String(droneVol));
  }, [droneVol, setDroneVolume]);

  // Sing tuner: tear down the mic (stop tracks + cancel the detect loop). Safe to
  // call anytime; mirrors the app's killSession discipline so nothing keeps the
  // mic warm after you leave.
  const micWantRef = useRef(false); // false = mic no longer wanted (toggled off / unmounting)
  const micBusyRef = useRef(false); // true while a getUserMedia request is in flight
  const stopMic = useCallback(() => {
    micWantRef.current = false;
    const m = micRef.current;
    if (m) {
      if (m.raf) cancelAnimationFrame(m.raf);
      try { m.source.disconnect(); } catch (_) {}
      try { m.gain?.disconnect(); } catch (_) {}
      try { m.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      micRef.current = null;
    }
    setMicOn(false); setSingDeg(null); setSingInTune(false); setSingCents(0); setSingLevel(0);
  }, []);

  // Toggle listening. Must run on the user's tap so iOS grants mic access; the
  // analyser hangs off Tone's own AudioContext and is never routed to the
  // speakers, so there's no feedback loop.
  const toggleMic = useCallback(async () => {
    // A request is already in flight (e.g. the permission prompt is up) — a second
    // tap cancels it instead of starting a duplicate stream (the in-flight await
    // sees micWantRef go false and releases its stream). Without this, re-tapping
    // Sing during the prompt leaks a live mic track (OS indicator stays on).
    if (micBusyRef.current) { micWantRef.current = false; setMicReq(false); return; }
    if (micRef.current) { stopMic(); return; }
    micWantRef.current = true; micBusyRef.current = true;
    setMicErr(false); setMicReq(true);
    try {
      await Tone.start();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      // If we were toggled off (or the component unmounted) during the await, don't
      // wire up or store the stream — just release it, or it leaks as a live mic track.
      if (!micWantRef.current) { try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {} return; }
      const ctx = Tone.getContext().rawContext;
      const source = ctx.createMediaStreamSource(stream);
      // Boost the input so a normal voice at arm's length registers — no need to
      // sing right into the mic. Feeds the analyser only, never the speakers.
      const gain = ctx.createGain();
      gain.gain.value = 2.5;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(gain);
      gain.connect(analyser);
      micRef.current = { stream, source, gain, analyser, buf: new Float32Array(analyser.fftSize), raf: 0, last: 0 };
      setMicOn(true);
    } catch (e) {
      setMicErr(true); setMicOn(false);
    } finally {
      micBusyRef.current = false;
      setMicReq(false);
    }
  }, [stopMic]);

  // The detection loop: while listening, sample the mic ~18×/s, find the pitch,
  // and map it to the number you're singing in the current key.
  useEffect(() => {
    if (!micOn) return;
    const m = micRef.current;
    if (!m) return;
    const sr = Tone.getContext().rawContext.sampleRate;
    let alive = true;
    const tick = (t) => {
      const mm = micRef.current;
      if (!alive || !mm) return;
      mm.raf = requestAnimationFrame(tick);
      if (t - mm.last < 55) return; // throttle: ACF is O(n²), don't run every frame
      mm.last = t;
      mm.analyser.getFloatTimeDomainData(mm.buf);
      // input loudness (so the meter reacts to any sound — proves the mic is live)
      let sum = 0;
      for (let i = 0; i < mm.buf.length; i++) sum += mm.buf[i] * mm.buf[i];
      setSingLevel(Math.min(1, Math.sqrt(sum / mm.buf.length) * 2.5));
      const hz = detectPitch(mm.buf, sr);
      if (hz < 0) { setSingDeg(null); setSingInTune(false); return; }
      const { deg, cents } = pitchToDegree(hz, musicKey);
      setSingDeg(deg); setSingCents(cents); setSingInTune(Math.abs(cents) <= 25);
    };
    m.last = 0;
    m.raf = requestAnimationFrame(tick);
    return () => { alive = false; if (m.raf) cancelAnimationFrame(m.raf); };
  }, [micOn, musicKey]);

  // Drop the mic whenever we leave Free Play or the 7-worlds tab, and on unmount.
  useEffect(() => {
    if (screen !== "learn" || fpTab !== "notes") stopMic();
  }, [screen, fpTab, stopMic]);
  useEffect(() => () => stopMic(), [stopMic]);

  // background music per screen (drills are silent by design; dojo hushes when you play)
  useEffect(() => {
    const S = (typeof window !== "undefined") && window.SOUNDTRACK;
    if (!S) return;
    // The tutorial's coached ear-training drills must be silent — kill the meadow
    // theme the moment we enter drill mode so nothing competes with the note.
    if (screen === "tutorial" && tutMode === "drill") { stopMusic(true); return; }
    if (screen === "adventure" || screen === "levels" || screen === "tutorial") { playTheme("map", S.map); return; }
    if (screen === "boot" || screen === "menu" || screen === "training" || screen === "home" || screen === "shop") { playTheme("title", S.title); return; }
    // dojo/Free Play (explore sounds freely), How-music-works + Settings (audio demos),
    // sessions, results, boot → silent.
    stopMusic(screen === "session");
  }, [screen, tutMode]);

  // Stop the paths loop whenever we leave Free Play or the paths tab.
  useEffect(() => {
    if (screen !== "learn" || fpTab !== "paths") {
      stopPathLoop(); setPathPlaying(false); setPathIdx(-1); setPathCount(0);
    }
    return () => stopPathLoop();
  }, [screen, fpTab, stopPathLoop]);

  // Type the number row to play degrees; the note holds while the key is down.
  useEffect(() => {
    if (screen !== "learn") return;
    const held = keyHeldRef.current;
    const down = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const m = KEY_MAP[e.key];
      if (!m || held[e.key]) return;
      e.preventDefault();
      const note = noteOf(m.d, m.oct);
      holdNote(note);
      singOct(m.d, m.oct - 4, fpTab === "paths" ? pathVoice : voiceOn);
      let litId = null, litSet = null;
      if (fpTab === "paths" && m.oct === 4) {
        const col = pathIdxRef.current >= 0 ? pathIdxRef.current : 0;
        const ri = PATH_ROWS.findIndex((r) => r.d === m.d && r.oct === 4);
        if (col < pathProg.length && ri >= 0) { litId = col + "-" + ri; litSet = setLitPath; setLitPath((a) => (a.includes(litId) ? a : [...a, litId])); }
      }
      held[e.key] = { note, litId, litSet };
    };
    const up = (e) => {
      const h = held[e.key];
      if (!h) return;
      releaseNote(h.note);
      if (h.litSet && h.litId) h.litSet((a) => a.filter((x) => x !== h.litId));
      delete held[e.key];
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      Object.values(held).forEach((h) => releaseNote(h.note));
      keyHeldRef.current = {};
    };
  }, [screen, fpTab, musicKey, voiceOn, pathVoice, pathProg]);

  useEffect(() => { setSustainVoice(susVoice); }, [susVoice, setSustainVoice]);

  const setProg = (prog) => { stopPath(); setPathProg(prog); };
  const startPath = async () => {
    if (pathProg.length === 0) return;
    setPathPlaying(true);
    const tones = pathProg.map((r) => chordTones(chordByRoman(r), pathSevenths));
    startPathLoop(musicKey, tones, () => pathBeatRef.current, (s) => {
      if (s.phase === "count") { setPathCount(s.n); setPathIdx(-1); pathIdxRef.current = -1; }
      else { setPathCount(0); setPathIdx(s.i); pathIdxRef.current = s.i; }
    }, 4, () => pathDrumsRef.current);
  };
  const stopPath = () => { stopPathLoop(); setPathPlaying(false); setPathIdx(-1); pathIdxRef.current = -1; setPathCount(0); };
  const setTempo = (b) => { setPathBeat(b); pathBeatRef.current = b; };
  const toggleDrums = () => { const v = !pathDrums; setPathDrums(v); pathDrumsRef.current = v; };
  const noteOf = (d, oct) => Tone.Frequency(Tone.Frequency(musicKey + oct).toMidi() + DEGREE_SEMITONES[d], "midi").toNote();
  // Sing a degree `up` whole octaves above the recorded base. Only "1" has a high take
  // (clip 8); every other degree gets repitched up so an upper-octave note is sung at
  // its real pitch instead of an octave below (keeps each world a consistent rising scale).
  const singOct = (label, up, on, delay = 0, cut = null) => {
    const useHigh = label === 1 && up >= 1;
    sing(musicKey, useHigh ? 8 : label, on, delay, cut, useHigh ? up - 1 : up);
  };
  const pathDown = (col, ri) => {
    const row = PATH_ROWS[ri];
    const id = col + "-" + ri;
    setLitPath((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(noteOf(row.d, row.oct));
    singOct(row.d, row.oct - 4, pathVoice);
  };
  const pathUp = (col, ri) => {
    const row = PATH_ROWS[ri];
    setLitPath((a) => a.filter((x) => x !== col + "-" + ri));
    releaseNote(noteOf(row.d, row.oct));
  };

  const clearLadder = () => { setLitActive([]); setLitCorrect([]); setLitWrong([]); setHitPad(null); setRevealPc(null); };

  const levels = mode === "melody" ? MELODY_LEVELS : mode === "chords" ? CHORD_LEVELS : PROG_LEVELS;

  /* ── shared actions ── */

  const hearKey = async () => {
    if (busy) return;
    setBusy(true);
    const dur = await playCadence(musicKey);
    setTimeout(() => setBusy(false), dur * 1000);
  };

  const playResolution = (key, octave, targetPc, mode, canSing, onDone) => {
    const path = resolutionSemis(targetPc, mode);
    const step = resStep;
    setBusy(true);
    path.forEach((semi, i) => {
      const isLast = i === path.length - 1;
      playSemi(key, semi, i * step, octave);
      const deg = PC_TO_DEGREE[mod12(semi)];
      if (canSing && deg != null) {
        const targetMidi = Tone.Frequency(key + octave).toMidi() + semi;
        if (mode === "minor" && minorVoiceRef.current && minorShift(key, targetMidi) <= 3) {
          // close to the recorded minor key → sing at the synth's exact pitch (no octave drift)
          singMinor(key, targetMidi, voiceOn, i * step, isLast ? null : step);
        } else {
          // fallback (major, far minor key, or take not loaded): degree-based, low la/ti on descent
          const vdeg = semi >= 12 && deg === 1 ? 8 : ((deg === 6 || deg === 7) && semi < 0 ? deg + "L" : deg);
          sing(key, vdeg, voiceOn, i * step, isLast ? null : step);
        }
      }
      sessTimer(() => setLitCorrect([mod12(semi)]), i * step * 1000);
    });
    sessTimer(() => { setBusy(false); if (onDone) onDone(); }, (path.length * step + 0.7) * 1000);
  };

  /* ── session engine ── */

  const startSession = (m, li, customLvl = null) => {
    killSession();
    track("session_start", { mode: m, level: li, custom: !!customLvl });
    const baseLvl = customLvl || (m === "melody" ? MELODY_LEVELS[li] : m === "chords" ? CHORD_LEVELS[li] : PROG_LEVELS[li]);
    const lvl = m === "chords" ? { ...baseLvl, sevenths: chordSevenths } : baseLvl;
    setMode(m); setLevelIdx(li); setSessLvl(lvl);
    if (m === "melody" && li != null) setMelGroup(groupIndexOf(li));
    if (m === "chords" && li != null) setChordChapter(chordChapterIndexOf(li));
    if (m === "progressions" && li != null) setProgChapter(progChapterIndexOf(li));
    let key = musicKey;
    if (m === "melody") {
      const km = lvl.keyMode;
      key = km === "c" ? "C" : km === "not-c" ? randKey(["C"]) : randKey([]);
    } else {
      key = lvl.keyMode === "not-c" ? randKey([musicKey]) : lvl.keyMode === "random" ? randKey([]) : musicKey;
    }
    setSessKey(key);
    sess.current = { mode: m, lvl, levelIdx: li, key, octave: 4, qNum: 0, qCount: qCountOf(lvl), results: [], attempted: false, target: null, sevenths: m === "chords" && chordSevenths };
    setQNum(0); setScore(0); setStreak(0); setSessionResults([]);
    setChPicked([]); setProgAnswer([]); setProgWrong([]);
    clearLadder(); setFeedback(null); setPhase("idle");
    setScreen("session");
    sessTimer(() => nextQuestionRef.current(true), 350);
  };

  const nextQuestion = async (isFirst = false) => {
    const s = sess.current;
    const gen = sessGenRef.current; // capture; if the session is quit/restarted mid-await this goes stale
    clearLadder(); setChPicked([]); setProgAnswer([]); setProgWrong([]); setProgActive(-1); setFeedback(null);
    s.attempted = false; s.misses = 0;
    setPhase("playing"); setBusy(true);

    try {
    if (s.mode === "progressions") {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      const prog = pickProgression(lvl, s.target);
      s.target = prog;
      const cad = (await playCadence(s.key, lvl.mode)) + 0.35;
      if (gen !== sessGenRef.current) return; // quit during audio load → don't play/schedule on a dead session
      const dur = await playProgression(s.key, prog.map((r) => chordByRoman(r).tones), cad, progBeat);
      if (gen !== sessGenRef.current) return;
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (cad + dur + 0.2) * 1000);
    } else if (s.mode === "melody") {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      const oct = lvl.octaves[Math.floor(Math.random() * lvl.octaves.length)];
      s.octave = oct;
      let pc;
      do { pc = lvl.pool[Math.floor(Math.random() * lvl.pool.length)]; }
      while (lvl.pool.length > 1 && pc === s.target);
      s.target = pc;
      const t = (await playCadence(s.key, lvl.mode)) + 0.25;
      if (gen !== sessGenRef.current) return; // quit during audio load → bail before the target note leaks
      playSemi(s.key, pc, t, oct);
      // open answering the moment the pitch sounds (note keeps ringing) — don't
      // make them wait for it to finish. Tiny lead so the attack is clearly heard.
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (t + 0.2) * 1000);
    } else {
      const lvl = s.lvl;
      if (lvl.keyMode === "random" && !isFirst) {
        s.key = randKey([s.key]);
        setSessKey(s.key);
      }
      let c;
      do {
        const pick = lvl.pool[Math.floor(Math.random() * lvl.pool.length)];
        c = CHORDS.find((x) => x.roman === pick);
      } while (lvl.pool.length > 1 && s.target && c.roman === s.target.roman);
      s.target = c;
      const cad = (await playCadence(s.key, lvl.mode)) + 0.25;
      if (gen !== sessGenRef.current) return; // quit during audio load → bail
      await playChord(s.key, chordTones(c, s.sevenths), cad); // block + arpeggio
      if (gen !== sessGenRef.current) return;
      sessTimer(() => { setPhase("answer"); setBusy(false); }, (cad + 0.7) * 1000); // but answer as soon as it sounds
    }
    } catch (e) {
      // Audio playback threw (e.g. a fully closed/interrupted AudioContext where
      // triggerAttackRelease itself rejects — ensure() already swallows start/resume
      // rejection, this covers the extreme case). The target is already chosen, so don't
      // soft-lock the session on "Listen…" — open answering anyway, unless the session was
      // quit mid-await. The player can still respond (silently) or quit cleanly.
      if (gen === sessGenRef.current) sessTimer(() => { setPhase("answer"); setBusy(false); }, 400);
    }
  };
  nextQuestionRef.current = nextQuestion;

  const advance = () => {
    const s = sess.current;
    s.qNum += 1;
    if (s.qNum >= s.qCount) {
      finishSession();
    } else {
      setQNum(s.qNum);
      sessTimer(() => nextQuestionRef.current(false), 750);
    }
  };

  const finishSession = () => {
    const s = sess.current;
    const firstTries = s.results.filter((r) => r.firstTry).length;
    track("session_finish", { mode: s.mode, level: s.levelIdx, first_tries: firstTries, questions: s.results.length, passed: firstTries >= passCountFor(s.lvl) });
    // snapshot region-clear state BEFORE saving this session's progress (for the victory flourish)
    sessWasClearedRef.current = (fromAdventure && advStageId != null) ? stageClearedAdv(advStageId) : false;
    if (s.levelIdx != null) { // custom sessions aren't recorded
      setProgress((prev) => {
        const cur = (prev[s.mode] && prev[s.mode][s.levelIdx]) || 0;
        if (firstTries <= cur) return prev;
        const next = { ...prev, [s.mode]: { ...prev[s.mode], [s.levelIdx]: firstTries } };
        if (canSave()) saveProgress(next); // only persist once saving is unlocked (email/paid)
        return next;
      });
    }
    // the moment a region is newly cleared: fanfare (or the GRAND finale on the 8th),
    // and flag the map so it plays a "region cleared" flourish when you return.
    let bigClear = false;
    if (fromAdventure && advStageId != null && !sessWasClearedRef.current) {
      const lv = advGroupOf(ADV_STAGES[advStageId - 1]).levels;
      const lastIdx = lv[lv.length - 1].idx;
      const clears = TEST_MODE ? (firstTries >= passCountFor(s.lvl)) : (s.levelIdx === lastIdx && firstTries >= passCountFor(s.lvl));
      if (clears) {
        bigClear = true;
        setMapCelebrateNode(advStageId);
        const others = advNodes.filter((n) => n.id !== advStageId && stageClearedAdv(n.id)).length;
        if (others >= 7) { grandFanfare(); haptic(true); }
        else { fanfare(); haptic(false); }
        sessTimer(() => { const S = window.SOUNDTRACK; if (S) playTheme("victory", S.victory); }, 2500);
      }
    }
    // a nice little "level complete" jingle whenever you PASS a level — unless the big
    // region-clear fanfare already fired above (don't stack the two).
    if (!bigClear && s.levelIdx != null && firstTries >= passCountFor(s.lvl)) {
      try { sfx("victory"); haptic(false); } catch (e) {}
    }
    setPhase("idle");
    setScreen("results");
  };

  // ♪ — replay just the sound to identify
  const replayTarget = async () => {
    if (phaseRef.current !== "answer" || busyRef.current) return; // live phase/busy — a scheduled miss-replay must not fire once a correct answer moved us to "resolving"
    const s = sess.current;
    setBusy(true);
    if (s.mode === "progressions") {
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), 0, progBeat);
      sessTimer(() => setBusy(false), dur * 1000);
    } else if (s.mode === "melody") {
      playSemi(s.key, s.target, 0, s.octave);
      sessTimer(() => setBusy(false), 1000);
    } else {
      const dur = await playChord(s.key, chordTones(s.target, s.sevenths));
      sessTimer(() => setBusy(false), dur * 1000);
    }
  };

  // ↻ Repeat — replay the whole question: cadence, then the sound to identify
  const replayFull = async () => {
    if (phase !== "answer" || busy) return;
    const s = sess.current;
    setBusy(true);
    if (s.mode === "progressions") {
      const cad = (await playCadence(s.key, s.lvl.mode)) + 0.35;
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), cad, progBeat);
      sessTimer(() => setBusy(false), (cad + dur + 0.2) * 1000);
    } else if (s.mode === "melody") {
      const t = (await playCadence(s.key, s.lvl.mode)) + 0.25;
      playSemi(s.key, s.target, t, s.octave);
      sessTimer(() => setBusy(false), (t + 1.15) * 1000);
    } else {
      const cad = (await playCadence(s.key, s.lvl.mode)) + 0.25;
      const dur = await playChord(s.key, chordTones(s.target, s.sevenths), cad);
      sessTimer(() => setBusy(false), (cad + dur + 0.3) * 1000);
    }
  };

  /* ── melody answers ── */

  const answerMelodySession = (pc) => {
    if (phase !== "answer" || busy) return;
    const s = sess.current;
    const lvl = s.lvl;
    if (pc === s.target) {
      const first = !s.attempted;
      s.results.push({ target: s.target, firstTry: first });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setLitWrong([]); setRevealPc(null);
      setHitPad(pc);
      setPhase("resolving");
      const deg = PC_TO_DEGREE[pc];
      if (tutorialActive) {
        // Verda's first win — cheer + celebrate, then coaching fades (Q2+ is a normal
        // First Steps session that flows to results/email/map).
        setFeedback("That's it — you're hearing in numbers!");
        setTutorialActive(false); setTutReveal(false);
        setTutCelebrate(true); sessTimer(() => setTutCelebrate(false), 1400);
        try { haptic(true); } catch (e) {}
      } else {
        const dq = lvl.mode === "minor" ? DEGREE_QUIPS_MINOR : DEGREE_QUIPS;
        const aq = lvl.mode === "minor" ? ALT_QUIPS_MINOR : ALT_QUIPS;
        setFeedback(deg != null ? dq[deg] : aq[pc]);
      }
      // Sing the resolution even in chromatic levels: playResolution skips any note
      // with no scale degree (the chromatic ones) per-note, so diatonic notes get the
      // voice and chromatic notes just play with no voice.
      playResolution(s.key, s.octave, s.target, lvl.mode, true, advance);
    } else {
      s.attempted = true;
      s.misses = (s.misses || 0) + 1;
      setStreak(0);
      setLitWrong([pc]);
      playSemi(s.key, pc, 0, s.octave); // echo the note they actually pressed
      if (tutorialActive) { setTutReveal(true); setFeedback("Almost — hear it again, then tap the glowing number."); }
      else if (s.misses >= 2) {
        // don't leave a stuck learner brute-forcing: reveal + name the target, then replay it
        const tdeg = PC_TO_DEGREE[s.target];
        setRevealPc(s.target);
        setFeedback("It's the " + (tdeg != null ? tdeg : NOTE_LABELS[s.target]) + " — hear it, then tap it.");
        sessTimer(() => replayTarget(), 650);
      } else {
        // a miss should teach: re-play the TARGET (not just the note pressed) so they can compare
        setFeedback("Not that one — that's what you played. Here's the note again…");
        sessTimer(() => replayTarget(), 650);
      }
    }
  };

  /* ── chord answers ── */

  const toggleChordPick = (d) => {
    if (phase !== "answer") return;
    const need = sess.current.sevenths ? 4 : 3;
    setLitWrong([]); setFeedback(null);
    setChPicked((p) =>
      p.includes(d) ? p.filter((x) => x !== d) : p.length < need ? [...p, d] : p
    );
  };

  const checkChordSession = async () => {
    const s = sess.current;
    const gen = sessGenRef.current; // quit/restart during the resolution await → bail (mirrors nextQuestion)
    const tones = chordTones(s.target, s.sevenths);
    if (phase !== "answer" || chPicked.length !== tones.length || busy) return;
    const t = new Set(tones.map((d) => (d === 8 ? 1 : d)));
    const right = chPicked.every((d) => t.has(d));
    if (right) {
      const first = !s.attempted;
      s.results.push({ target: s.target.roman, firstTry: first });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setLitCorrect(tones); setLitWrong([]);
      setPhase("resolving");
      setFeedback({ roman: s.target.roman, sym: chordSymbol(s.target.roman, s.sevenths), num: chordNumber(s.target.roman, s.sevenths), quality: chordQuality(s.target.roman, s.sevenths), tones });
      setBusy(true);
      const dur = await playChord(s.key, tones);
      if (gen !== sessGenRef.current) return; // quit during the resolution → don't advance a dead session
      sessTimer(() => { setBusy(false); advance(); }, (dur + 1.4) * 1000);
    } else {
      s.attempted = true;
      setStreak(0);
      setLitWrong(chPicked.filter((d) => !t.has(d)));
      setFeedback("Close — the marked degrees aren't in it. Adjust and check again.");
    }
  };

  /* ── progression answers ── */

  const tapChord = (roman) => {
    if (phase !== "answer" || busy) return;
    setProgWrong([]); setFeedback(null);
    setProgAnswer((p) => (p.length < sess.current.target.length ? [...p, roman] : p));
  };
  const backspaceChord = () => {
    if (phase !== "answer" || busy) return;
    setProgWrong([]); setFeedback(null);
    setProgAnswer((p) => p.slice(0, -1));
  };

  const checkProgression = async () => {
    const s = sess.current;
    const gen = sessGenRef.current; // quit/restart during the resolution await → bail (mirrors nextQuestion)
    if (phase !== "answer" || busy || progAnswer.length !== s.target.length) return;
    const wrong = s.target.map((r, i) => (progAnswer[i] === r ? -1 : i)).filter((i) => i >= 0);
    if (wrong.length === 0) {
      const first = !s.attempted;
      s.results.push({ target: s.target.join("–"), firstTry: first, prog: [...s.target] });
      setSessionResults([...s.results]);
      if (first) { setScore((sc) => sc + 1); setStreak((x) => x + 1); }
      setPhase("resolving");
      setFeedback({ prog: [...s.target] });
      setBusy(true);
      const dur = await playProgression(s.key, s.target.map((r) => chordByRoman(r).tones), 0, progBeat);
      if (gen !== sessGenRef.current) return; // quit during the resolution → don't advance a dead session
      s.target.forEach((_, i) => sessTimer(() => setProgActive(i), i * progBeat * 1000));
      sessTimer(() => setProgActive(-1), s.target.length * progBeat * 1000);
      sessTimer(() => { setBusy(false); advance(); }, (dur + 0.4) * 1000);
    } else {
      s.attempted = true;
      setStreak(0);
      setProgWrong(wrong);
      setFeedback("Not quite — the marked chords are off. Fix them and check again.");
    }
  };

  /* ── free explore ── */

  const pianoNote = (k) => Tone.Frequency(Tone.Frequency(musicKey + "4").toMidi() + k.s, "midi").toNote();
  const pianoLabelOf = (k) => {
    const labs = {};
    exploreNotes(exStart, exCount).forEach((n) => {
      labs[n.semi] = n.label;
      if (n.semi + 12 <= 24) labs[n.semi + 12] = n.label;
    });
    return labs[k.s];
  };
  const pianoDown = (k) => {
    const id = "p" + k.s;
    setLitActive((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(pianoNote(k));
    const label = pianoLabelOf(k);
    if (label != null) singOct(label, Math.floor(k.s / 12), voiceOn);
  };
  const pianoUp = (k) => {
    setLitActive((a) => a.filter((x) => x !== "p" + k.s));
    releaseNote(pianoNote(k));
  };

  // Guide keeps a simple tap; Free Play holds the note (down/up) on the sustain voice.
  const playExplore = async (n, row = 0) => {
    const id = n.raw + row * 100;
    setLitActive((a) => [...a, id]);
    playDegree(musicKey, n.label, 0, 4 + (n.upper ? 1 : 0) + row);
    singOct(n.label, (n.upper ? 1 : 0) + row, voiceOn);
    setTimeout(() => setLitActive((a) => a.filter((x) => x !== id)), 550);
  };
  const exploreDown = (n, row = 0) => {
    const id = n.raw + row * 100, oct = 4 + (n.upper ? 1 : 0) + row;
    setLitActive((a) => (a.includes(id) ? a : [...a, id]));
    holdNote(noteOf(n.label, oct));
    // sing the number when Voice is on — Paths uses its own pathVoice toggle, others voiceOn
    singOct(n.label, (n.upper ? 1 : 0) + row, fpTab === "paths" ? pathVoice : voiceOn);
  };
  const exploreUp = (n, row = 0) => {
    const id = n.raw + row * 100, oct = 4 + (n.upper ? 1 : 0) + row;
    setLitActive((a) => a.filter((x) => x !== id));
    releaseNote(noteOf(n.label, oct));
  };

  /* ── render helpers ── */

  const keyRow = (
    <div className="key-row">
      <label className="key-label">
        Key
        <select value={musicKey} onChange={(e) => { setMusicKey(e.target.value); e.target.blur(); }}>
          {KEYS.map((k) => <option key={k} value={k}>{k} major</option>)}
        </select>
      </label>
      <label className="key-label">
        Sound
        <select value={susVoice} onChange={(e) => { setSusVoice(e.target.value); e.target.blur(); }}>
          <option value="piano">Piano</option>
          <option value="pad">Pad</option>
          <option value="lead">Lead</option>
          <option value="strings">Strings</option>
        </select>
      </label>
      {(() => {
        const on = fpTab === "paths" ? pathVoice : voiceOn;
        const set = fpTab === "paths" ? setPathVoice : setVoiceOn;
        return (
          <button className={"ghost voice fp-keyrow-voice" + (on ? " on" : "")} onClick={() => set(!on)} aria-pressed={on}>
            {on ? "Voice on" : "Voice off"}
          </button>
        );
      })()}
    </div>
  );

  const brand = (
    <div className="brand">
      <div className="brand-line">
        <h1><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <img className="wejam-logo" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
      </div>
      <p>Learn to speak and understand the true language of music</p>
    </div>
  );

  /* ── adventure (Harmonia) — nodes derived from real progress ── */
  const advNodes = (window.HARMONIA && window.HARMONIA.nodes) || [];
  // a region's fragment is earned by passing its FINAL level (the mastery capstone);
  // you don't have to pass every level along the way.
  const stageClearedAdv = (id) => {
    const s = ADV_STAGES[id - 1]; if (!s) return false;
    const lv = advGroupOf(s).levels;
    if (TEST_MODE) return lv.some((l) => isPassed(s.mode, l.idx)); // testing: any level clears it
    return isPassed(s.mode, lv[lv.length - 1].idx);
  };
  const advCollected = new Set(advNodes.filter((n) => stageClearedAdv(n.id)).map((n) => window.HARMONIA.stageFrag[n.id]));
  const advCurrentId = (advNodes.find((n) => !stageClearedAdv(n.id)) || advNodes[advNodes.length - 1] || {}).id;
  const enterStage = (n) => {
    const s = ADV_STAGES[n.id - 1]; if (!s) return;
    // Before the FIRST minor region (Lowmoor Fen, node 2): Rue's la-based-minor tutorial,
    // once. graduate/skip sets the tut2 flag and re-enters this stage via tutThenEnterRef.
    if (n.id === 2 && loadPref("tut2", "0") !== "1") { startTutorial("minor", 2); return; }
    // Before the FIRST chord region (Glasswood, node 3): Sylva's chord tutorial, once.
    if (n.id === 3 && loadPref("tut3", "0") !== "1") { startTutorial("chords", 3); return; }
    setFromAdventure(true);
    setAdvStageId(n.id);
    setMode(s.mode);
    if (s.mode === "melody") setMelGroup(s.gi);
    else if (s.mode === "chords") setChordChapter(s.gi);
    else setProgChapter(s.gi);
    setScreen("levels");
  };
  const setBoring = (v) => { setBoringMode(v); savePref("boring", v ? "1" : "0"); setScreen(v ? "home" : "menu"); };

  /* ── screens ── */

  if (screen === "boot") {
    const map = [
      { d: "d1", n: "1", sol: "do", tonic: true },
      { gap: true },
      { d: "d2", n: "2", sol: "re" },
      { gap: true },
      { d: "d3", n: "3", sol: "mi" },
      { d: "d4", n: "4", sol: "fa" },
      { gap: true },
      { d: "d5", n: "5", sol: "sol" },
      { gap: true },
      { d: "d6", n: "6", sol: "la" },
      { gap: true },
      { d: "d7", n: "7", sol: "ti" },
      { d: "d8", n: "1", sol: "do", tonic: true },
    ];
    return (
      <div className="app boot-screen">
        <style>{CSS}</style>
        <div className="bi-presents">WE✱JAM PRESENTS</div>
        <h1 className="boot-title"><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <img className="boot-star" src={typeof window !== "undefined" ? window.WEJAM_LOGO : ""} alt="WeJam" />
        <p className="bi-tag">HEAR THE NUMBERS · SING THE MAP</p>
        <div className="bi-hero">
          <div className="bi-mapwrap">
            <div className="bi-map">
              {map.map((c, i) => c.gap
                ? <div key={i} className="bi-cl bi-gap"><i className="bi-st"></i><span className="bi-mid"><s></s></span><u className="bi-sol"></u></div>
                : <div key={i} className={"bi-cl " + c.d + (c.tonic ? " tonic" : "")}><i className="bi-st">{c.tonic ? "✱" : ""}</i><b className="bi-pad">{c.n}</b><u className="bi-sol">{c.sol}</u></div>
              )}
            </div>
          </div>
          <div className="bi-wave">{Array.from({ length: 24 }).map((_, i) => <i key={i} />)}</div>
        </div>
        <img className="bi-coda" src={typeof window !== "undefined" ? window.CODA_VICTORY : ""} alt="" aria-hidden="true" />
        <button className="bi-cta" onClick={bootAdvance}>START YOUR EAR QUEST</button>
        <div className="bi-foot">EVERY NOTE IS ON THE MAP</div>
      </div>
    );
  }

  // Upsell modal — shown when a gated (public) player taps locked content. Reuses the
  // forge/encounter modal styling. `position:fixed` so it overlays whatever screen
  // includes it; drop {upsellModal} into each screen that can trigger it.
  const upsellModal = upsellOpen ? (
    <div className="forge-modal upsell-modal" onClick={() => setUpsellOpen(false)}>
      <div className="forge-panel upsell-panel" role="dialog" aria-modal="true" aria-label="Keep going — the full program" tabIndex={-1} ref={upsellPanelRef} onClick={(e) => e.stopPropagation()}>
        <span className="forge-kicker">✦ Keep going ✦</span>
        <h2 className="forge-title">This is where it gets good</h2>
        <p className="upsell-copy">You've got the ears. Next is turning them into real playing — hearing any chord, finding any melody, soloing over songs you love. That's what we build together in the full program.</p>
        <div className="enc-actions">
          <button className="ghost" onClick={() => setUpsellOpen(false)}>Maybe later</button>
          <a className="primary offer-link" href={OFFER_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("offer_click", { where: "upsell" })}>Show me how →</a>
        </div>
      </div>
    </div>
  ) : null;

  if (screen === "menu") {
    const item = (icon, label, go) => (
      <button className="menu-item" onClick={() => { sfx("select"); setAuxReturn(null); go(); }} onMouseEnter={() => sfx("move")}>
        <span className="mi-icon">{icon}</span> {label}
      </button>
    );
    return (
      <div className="app menu-screen">
        <style>{CSS}</style>
        <h1 className="menu-logo"><span className="w1">NUMBER</span><span className="w2">SONG</span></h1>
        <div className="menu-list">
          {item("⚔", "Adventure", () => setScreen("adventure"))}
          {item("🎯", "Basic Training", () => setScreen("training"))}
          {item("📖", "How music works", () => { setGuidePage(0); setScreen("guide"); })}
          {item("★", "Shop (" + starBalance() + ")", () => setScreen("shop"))}
          {item("🎓", "Tutorials", () => setScreen("tutorials"))}
          {item("⚙", "Settings", () => setScreen("settings"))}
        </div>
        {gated && (
          <a className="cta-more offer-link" href={OFFER_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => { try { sfx("select"); } catch (e) {} track("offer_click", { where: "cta_more" }); }}>
            Want more than the game?<span className="cta-sub">See the 16-week roadmap →</span>
          </a>
        )}
        <footer className="foot">One map to rule them all.</footer>
      </div>
    );
  }

  if (screen === "tutorials") {
    // A library of the keeper-taught tutorials the player has already been through
    // (gated on each chapter's "seen" flag). Tap one to replay it start to finish.
    const TUTS = [
      { chapter: "major", flag: "tut",  icon: "🌱", title: "Staircase Meadows", sub: "Verda · the major map — home is 1" },
      { chapter: "minor", flag: "tut2", icon: "🌙", title: "Lowmoor Fen", sub: "Old Rue · la-based minor — home is 6" },
      { chapter: "chords", flag: "tut3", icon: "🌲", title: "The Glasswood", sub: "Sylva · chords — 1 · 4 · 5 · 6" },
    ];
    const passed = TUTS.filter((t) => loadPref(t.flag, "0") === "1");
    return (
      <div className="app menu-screen">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { sfx("back"); setScreen("menu"); }}>← Menu</button>
          <h2 className="screen-title">Tutorials</h2>
        </header>
        <div className="menu-list">
          {passed.length === 0
            ? <p className="set-desc" style={{ textAlign: "center", padding: "20px 8px" }}>No lessons yet — a keeper teaches you the first time you reach a new kind of world.</p>
            : passed.map((t) => (
                <button key={t.chapter} className="menu-item" onClick={() => { sfx("select"); startTutorial(t.chapter); }} onMouseEnter={() => sfx("move")}>
                  <span className="mi-icon">{t.icon}</span>
                  <span className="tut-lib-txt">
                    <b>{t.title}</b>
                    <span className="tut-lib-sub">{t.sub}</span>
                  </span>
                </button>
              ))}
        </div>
        <footer className="foot">Replay any lesson you've cleared.</footer>
      </div>
    );
  }

  if (screen === "training") {
    const sec = (title, desc, go) => (
      <button className="card" onClick={() => { sfx("select"); go(); }}>
        <span className="card-title">{title}</span>
        <span className="card-desc">{desc}</span>
      </button>
    );
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { sfx("back"); setScreen("menu"); }}>← Menu</button>
          <h2 className="screen-title">Basic Training</h2>
        </header>
        <div className="cards">
          {sec("Single notes", `Hear a note, name its degree. ${MELODY_GROUPS.length} stages.`, () => { setMode("melody"); setMelGroup(null); setScreen("levels"); })}
          {sec("Chord tones", `Hear a chord, find its degrees. ${CHORD_CHAPTERS.length} chapters.`, () => { setMode("chords"); setChordChapter(null); setScreen("levels"); })}
          {sec("Chord progressions", `Name each chord in order. ${PROG_CHAPTERS.length} chapters.`, () => { setMode("progressions"); setProgChapter(null); setScreen("levels"); })}
        </div>
        <footer className="foot">Sharpen your ear — every rep forges Excalibar.</footer>
      </div>
    );
  }

  if (screen === "adventure") {
    // in game mode a tap opens the Keeper encounter modal; boring mode goes straight in
    const onTapNode = (n) => {
      if (gated && !isRegionFree(n.id - 1)) return openUpsell();
      track("region_enter", { region: n.id });
      if (boringMode) { enterStage(n); } else { sfx("select"); setEncounterNode(n.id); }
    };
    const en = encounterNode && window.HARMONIA ? window.HARMONIA.nodes[encounterNode - 1] : null;
    const enStage = encounterNode ? ADV_STAGES[encounterNode - 1] : null;
    const enTitle = enStage ? advGroupOf(enStage).name : "";
    const enMode = enStage ? enStage.mode : "melody";
    const enLevels = enStage ? advGroupOf(enStage).levels.length : 0;
    const enFrag = en ? window.HARMONIA.fragLabel[window.HARMONIA.stageFrag[encounterNode]] : "";
    const enModeLabel = enMode === "melody" ? "single notes" : enMode === "chords" ? "chord tones" : "chord progressions";
    return (
      <>
        <AdventureMap
          nodes={advNodes} currentId={advCurrentId} collected={advCollected} onEnter={onTapNode} skinId={skinId}
          burst={swordBurst} boringMode={boringMode} onForge={() => { sfx("select"); setForgeOpen(true); }}
          celebrateNode={mapCelebrateNode} onCelebrateDone={() => setMapCelebrateNode(null)}
          onShop={() => { setAuxReturn("adventure"); setScreen("shop"); }}
          onMenu={() => setScreen(boringMode ? "home" : "menu")}
          onSettings={() => { setAuxReturn("adventure"); setScreen("settings"); }}
          onGuide={() => { setAuxReturn("adventure"); setGuidePage(0); setScreen("guide"); }}
          onFree={() => { setAuxReturn("adventure"); setFpTab("notes"); setScreen("learn"); }}
          onReady={() => setMapReady(true)} />
        {en && (
          <div className="encounter-modal" onClick={() => setEncounterNode(null)}>
            <div className={"encounter mood-" + en.mood} role="dialog" aria-modal="true" aria-label={"Keeper of " + en.name} tabIndex={-1} ref={encPanelRef} onClick={(e) => e.stopPropagation()}>
              <div className="enc-head">
                <span className="enc-emblem" aria-hidden="true">
                  {window.KEEPER_ART && window.KEEPER_ART[encounterNode]
                    ? <img src={window.KEEPER_ART[encounterNode]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", imageRendering: "pixelated" }} />
                    : en.emblem}
                </span>
                <div className="enc-titles">
                  <span className="kicker">Region {encounterNode} · Harmonia</span>
                  <h2 className="encounter-title">{en.name}</h2>
                  <span className="encounter-sub">{enTitle}</span>
                </div>
                <span className="enc-frag"><span className="gem">◆</span>{enFrag}</span>
              </div>
              <p className="keeper-line">
                <b className="keeper-name">{en.keeper}</b>
                <q>{en.greet}</q>
              </p>
              <p className="stage-goal">{stageGoal(enMode, enTitle)}</p>
              <span className="stage-meta">{enLevels} levels · {enModeLabel} · earn {en.short}'s mark → ◆</span>
              <div className="enc-actions">
                <button className="ghost" onClick={() => setEncounterNode(null)}>Not yet</button>
                <button className="primary" onClick={() => { const id = encounterNode; sfx("select"); setEncounterNode(null); enterStage({ id }); }}>Continue →</button>
              </div>
            </div>
          </div>
        )}
        {forgeOpen && window.HARMONIA && (
          <div className="forge-modal" onClick={() => setForgeOpen(false)}>
            <div className="forge-panel" role="dialog" aria-modal="true" aria-label="Excalibar — fragment inventory" tabIndex={-1} ref={forgePanelRef} onClick={(e) => e.stopPropagation()}>
              <span className="forge-kicker">The legendary blade</span>
              <h2 className="forge-title">Excalibar</h2>
              <ForgeSword collected={advCollected} className="forge-sword-big" />
              <span className="forge-tally">{advCollected.size} / 8 fragments</span>
              <ul className="frag-list">
                {window.HARMONIA.nodes.map((nd) => {
                  const fid = window.HARMONIA.stageFrag[nd.id];
                  const have = advCollected.has(fid);
                  return (
                    <li key={nd.id} className={"frag-row" + (have ? " got" : " locked")}>
                      <span className="frag-mark">{have ? "◆" : "◇"}</span>
                      <span className="frag-name">{window.HARMONIA.fragLabel[fid]}</span>
                      <em className="frag-src">{have ? nd.name : "— locked"}</em>
                    </li>
                  );
                })}
              </ul>
              <button className="primary" onClick={() => setForgeOpen(false)}>Close</button>
            </div>
          </div>
        )}
        {upsellModal}
        {mapTour && mapReady && <MapTour onClose={() => setMapTour(false)} onSfx={sfx} />}
        <AdvSplash ready={mapReady} />
      </>
    );
  }

  if (screen === "home") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top">
          <div className="brand-row">
            {brand}
            <button className="gear" onClick={() => { setAuxReturn(null); setScreen("settings"); }} aria-label="Settings">⚙</button>
          </div>
        </header>
        <div className="cards">
          {window.HARMONIA && (
            <button className="card adventure" onClick={() => setScreen("adventure")}>
              <span className="card-title">⚔ Adventure — Harmonia</span>
              <span className="card-desc">Travel the world, clear each region, and forge Excalibar — the tonal-map blade.</span>
              <span className="card-progress">{advCollected.size} of 8 fragments forged</span>
            </button>
          )}
          <button className="card start" onClick={() => { setAuxReturn(null); setGuidePage(0); setScreen("guide"); }}>
            <span className="card-title">Start here — how music works</span>
            <span className="card-desc">Why music is simpler than you think. The tonal map, the matrix of music, and the secret behind playing what you hear.</span>
          </button>
          <button className="card" onClick={() => { setMode("melody"); setMelGroup(null); setScreen("levels"); }}>
            <span className="card-title">Single notes</span>
            <span className="card-desc">Hear a note, name its degree. {MELODY_GROUPS.length} stages.</span>
            <span className="card-progress">{(() => {
              const done = MELODY_GROUPS.filter((g) => g.levels.every((l) => isPassed("melody", l.idx))).length;
              return done > 0 ? `${done} of ${MELODY_GROUPS.length} stages passed` : `${MELODY_GROUPS.length} stages`;
            })()}</span>
          </button>
          <button className="card" onClick={() => { setMode("chords"); setChordChapter(null); setScreen("levels"); }}>
            <span className="card-title">Chord tones</span>
            <span className="card-desc">Hear a chord, find its degrees in the key. {CHORD_CHAPTERS.length} chapters.</span>
            <span className="card-progress">{(() => {
              const done = CHORD_LEVELS.filter((_, i) => isPassed("chords", i)).length;
              return done > 0 ? `${done} of ${CHORD_LEVELS.length} levels passed` : `${CHORD_LEVELS.length} levels`;
            })()}</span>
          </button>
          <button className="card" onClick={() => { setMode("progressions"); setProgChapter(null); setScreen("levels"); }}>
            <span className="card-title">Chord progressions</span>
            <span className="card-desc">Hear a progression, name each chord in order. {PROG_CHAPTERS.length} chapters.</span>
            <span className="card-progress">{(() => {
              const done = PROG_LEVELS.filter((_, i) => isPassed("progressions", i)).length;
              return done > 0 ? `${done} of ${PROG_LEVELS.length} levels passed` : `${PROG_LEVELS.length} levels`;
            })()}</span>
          </button>
          <button className="card quiet" onClick={() => { setAuxReturn(null); setScreen("learn"); }}>
            <span className="card-title">Free play</span>
            <span className="card-desc">Improvise and explore with the raw materials of music.</span>
          </button>
        </div>
        <footer className="foot">Every sound relates to home. One map to rule them all.</footer>
      </div>
    );
  }

  if (screen === "settings") {
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => setScreen(auxReturn || (boringMode ? "home" : "menu"))}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">Settings</h2>
        </header>
        <div className="settings">
          <div className="set-block">
            <span className="set-label">Theme</span>
            <div className="seg">
              <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Dark</button>
              <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>Light</button>
            </div>
          </div>
          <div className="set-block">
            <span className="set-label">Music</span>
            <p className="set-desc">Chiptune soundtrack on the menu, map and dojo (drills stay silent).</p>
            <div className="seg">
              <button className={musicPref ? "on" : ""} onClick={() => { setMusicPref(true); setMusicOn(true); }}>On</button>
              <button className={!musicPref ? "on" : ""} onClick={() => { setMusicPref(false); setMusicOn(false); }}>Off</button>
            </div>
          </div>
          {window.HARMONIA && (
            <div className="set-block">
              <span className="set-label">Home screen</span>
              <p className="set-desc">Adventure = the Harmonia world map. Boring mode = the plain menu.</p>
              <div className="seg">
                <button className={!boringMode ? "on" : ""} onClick={() => setBoring(false)}>⚔ Adventure</button>
                <button className={boringMode ? "on" : ""} onClick={() => setBoring(true)}>Boring mode</button>
              </div>
            </div>
          )}
          <div className="set-block">
            <style>{`
              .tempo-row{ display:flex; align-items:center; gap:12px; }
              .tempo-row input[type=range]{ flex:1; accent-color:var(--teal,#57C6C4); height:24px; }
              .tempo-val{ font-variant-numeric:tabular-nums; min-width:3.4em; text-align:right; font-weight:700; color:var(--teal,#57C6C4); }
              .retro .tempo-val{ font-family:var(--pf); font-size:11px; }
            `}</style>
            <span className="set-label">Tempo</span>
            <p className="set-desc">How fast the cadence plays at the start of each question.</p>
            <div className="tempo-row">
              <input type="range" min={TEMPO_MIN} max={TEMPO_MAX} step={0.05} value={testTempo} aria-label="Question tempo"
                onChange={(e) => { const v = parseFloat(e.target.value); setTestTempo(v); savePref("tempo", v); setCadenceSpeed(v); }} />
              <span className="tempo-val">{testTempo.toFixed(2)}×</span>
            </div>
          </div>
          <div className="set-block">
            <span className="set-label">Resolution speed</span>
            <p className="set-desc">How fast the notes walk home after a correct answer.</p>
            <div className="seg">
              {RES_SPEEDS.map((s) => (
                <button key={s.label}
                  className={Math.abs(resStep - s.step) < 0.001 ? "on" : ""}
                  onClick={() => { setResStep(s.step); savePref("resstep", s.step); }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button className="ghost" style={{ marginTop: 10 }}
              onClick={() => playResolution(musicKey, 4, 4, "major", voiceOn, null)}
              disabled={busy}>
              ♪ Hear resolution
            </button>
          </div>
          <div className="set-block">
            <span className="set-label">Progression speed</span>
            <p className="set-desc">How fast chords play in a progression.</p>
            <div className="seg">
              {PROG_SPEEDS.map((s) => (
                <button key={s.label}
                  className={Math.abs(progBeat - s.beat) < 0.001 ? "on" : ""}
                  onClick={() => { setProgBeat(s.beat); savePref("progbeat", s.beat); }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button className="ghost" style={{ marginTop: 10 }}
              onClick={() => playProgression(musicKey, [["I"], ["V"], ["vi"], ["IV"]].map(([r]) => chordByRoman(r).tones), 0, progBeat)}
              disabled={busy}>
              ♪ Hear a progression
            </button>
          </div>
          <div className="set-block">
            <span className="set-label">Progress</span>
            <p className="set-desc">Clears your ✓ marks and best scores on this device.</p>
            <button className="ghost" style={{ alignSelf: "flex-start" }}
              onClick={() => {
                if (window.confirm("Reset all progress on this device? This can't be undone.")) {
                  try { window.localStorage.removeItem("numbersong-progress"); } catch (e) {}
                  setProgress({ melody: {}, chords: {}, progressions: {} });
                }
              }}>
              Reset progress
            </button>
          </div>
          <div className="set-block">
            <span className="set-label">Full access</span>
            {unlocked ? (
              <>
                <p className="set-desc">✓ Unlocked — you have the full app on this device. Share this link to unlock another device:</p>
                <input className="set-input" readOnly onFocus={(e) => e.target.select()}
                  value={(typeof window !== "undefined" ? window.location.origin + window.location.pathname : "") + "?unlock=" + UNLOCK_CODE} />
              </>
            ) : (
              <>
                <p className="set-desc">Have an access code from the Accelerator? Enter it to unlock every level and remove the prompts.</p>
                <div className="set-row">
                  <input className="set-input" value={codeInput} placeholder="access code"
                    onChange={(e) => { setCodeInput(e.target.value); if (codeErr) setCodeErr(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }} />
                  <button className="primary" onClick={tryUnlock}>Unlock</button>
                </div>
                {codeErr && (
                  <p className="set-desc" style={{ color: "#E07856" }}>✕ That code doesn't exist — check it and try again.</p>
                )}
              </>
            )}
          </div>
        </div>
        <footer className="foot">Preferences are saved on this device.</footer>
      </div>
    );
  }

  if (screen === "levels") {
    // Melody world picker (with Stages / Custom tabs), then a world's ramp.
    if (mode === "melody" && melGroup === null) {
      return (
        <div className="app">
          <style>{CSS}</style>
          <header className="top-slim">
            <button className="back" onClick={() => setScreen(boringMode ? "home" : "menu")}>{boringMode ? "← Home" : "← Menu"}</button>
            <h2 className="screen-title">Single notes</h2>
          </header>
          <div className="tabs">
            <button className={"tab" + (melTab === "stages" ? " on" : "")} onClick={() => setMelTab("stages")}>Stages</button>
            <button className={"tab" + (melTab === "custom" ? " on" : "")} onClick={() => setMelTab("custom")}>Custom</button>
          </div>
          {melTab === "stages" ? (
            <>
              <div className="levels">
                {MELODY_GROUPS.map((g, gi) => {
                  const done = g.levels.filter((l) => isPassed("melody", l.idx)).length;
                  const locked = gated && gi >= FREE.melodyGroups;
                  return (
                    <button key={gi} className={"level world" + (locked ? " locked" : "")}
                      onClick={() => { if (locked) return openUpsell(); setFromAdventure(false); setMelGroup(gi); }}>
                      <span className="level-num">{gi + 1}</span>
                      <span className="level-body">
                        <span className="level-name">{g.name}</span>
                        <span className="level-desc">{done} of {g.levels.length} passed</span>
                      </span>
                      <span className="level-state">{locked ? "🔒" : done === g.levels.length ? "✓" : "›"}</span>
                    </button>
                  );
                })}
              </div>
              <p className="hint center">{SESSION_LEN} questions per session · {Math.round(PASS_RATE * 100)}% on first tries earns the ✓</p>
            </>
          ) : (
            <div className="custom-builder">
              <div className="cu-row">
                <span className="cu-label">Feel</span>
                <div className="seg">
                  <button className={cuMode === "major" ? "on" : ""} onClick={() => setCuMode("major")}>Major</button>
                  <button className={cuMode === "minor" ? "on" : ""} onClick={() => setCuMode("minor")}>Minor</button>
                </div>
              </div>
              <div className="cu-row">
                <span className="cu-label">Key</span>
                <div className="seg">
                  <button className={cuKey === "c" ? "on" : ""} onClick={() => setCuKey("c")}>{cuMode === "minor" ? "A minor" : "C major"}</button>
                  <button className={cuKey === "not-c" ? "on" : ""} onClick={() => setCuKey("not-c")}>New key</button>
                  <button className={cuKey === "random" ? "on" : ""} onClick={() => setCuKey("random")}>Every key</button>
                </div>
              </div>
              <div className="cu-row">
                <span className="cu-label">Octaves</span>
                <div className="seg">
                  <button className={!cuOct ? "on" : ""} onClick={() => setCuOct(false)}>One</button>
                  <button className={cuOct ? "on" : ""} onClick={() => setCuOct(true)}>Many</button>
                </div>
              </div>
              <div className="cu-notes-head">
                <span className="cu-label">Notes ({cuNotes.length})</span>
                <div className="cu-presets">
                  <button onClick={() => setCuNotes([...NAT_PCS])}>Scale</button>
                  <button onClick={() => setCuNotes([...ALL12])}>All 12</button>
                </div>
              </div>
              <div className="cu-notes">
                {ALL12.map((pc) => {
                  const on = cuNotes.includes(pc);
                  return (
                    <button key={pc}
                      className={"cu-note" + (on ? " on" : "") + (pc === tonicPcOf(cuMode) ? " tonic" : "") + (ALTERED_PCS.includes(pc) ? " alt" : "")}
                      onClick={() => setCuNotes((p) => p.includes(pc) ? p.filter((x) => x !== pc) : [...p, pc])}>
                      {NOTE_LABELS[pc]}
                    </button>
                  );
                })}
              </div>
              <button className="primary wide" disabled={cuNotes.length < 2}
                onClick={() => gated ? openUpsell() : startSession("melody", null, {
                  name: "Custom", group: null, mode: cuMode,
                  chromatic: cuNotes.some((pc) => ALTERED_PCS.includes(pc)),
                  pool: [...cuNotes].sort((a, b) => a - b),
                  keyMode: cuKey, octaves: cuOct ? [3, 4, 5] : [4],
                })}>
                Start custom session{gated && " 🔒"}
              </button>
              <p className="hint center">Pick your notes and key — custom runs aren't scored toward stages.</p>
            </div>
          )}
          {upsellModal}
        </div>
      );
    }

    // Chords / progressions: pick a chapter (Major 1-4-5-6 / Minor 6-2-3-4) first.
    const chapters = mode === "chords" ? CHORD_CHAPTERS : PROG_CHAPTERS;
    const activeChapter = mode === "chords" ? chordChapter : progChapter;
    const setChapter = mode === "chords" ? setChordChapter : setProgChapter;
    if ((mode === "chords" || mode === "progressions") && activeChapter === null) {
      return (
        <div className="app">
          <style>{CSS}</style>
          <header className="top-slim">
            <button className="back" onClick={() => setScreen(boringMode ? "home" : "menu")}>{boringMode ? "← Home" : "← Menu"}</button>
            <h2 className="screen-title">{mode === "chords" ? "Chord tones" : "Chord progressions"}</h2>
          </header>
          <div className="levels">
            {chapters.map((c, ci) => {
              const done = c.levels.filter((l) => isPassed(mode, l.idx)).length;
              const locked = gated; // all chords/progressions are behind the offer
              return (
                <button key={ci} className={"level world" + (locked ? " locked" : "")}
                  onClick={() => { if (locked) return openUpsell(); setFromAdventure(false); setChapter(ci); }}>
                  <span className="level-num">{ci + 1}</span>
                  <span className="level-body">
                    <span className="level-name">{c.name}</span>
                    <span className="level-desc">{done} of {c.levels.length} passed</span>
                  </span>
                  <span className="level-state">{locked ? "🔒" : done === c.levels.length ? "✓" : "›"}</span>
                </button>
              );
            })}
          </div>
          <p className="hint center">Master the four chords of a key. Minor is the same four, centered on 6.</p>
          {upsellModal}
        </div>
      );
    }

    const list = mode === "melody"
      ? MELODY_GROUPS[melGroup].levels
      : chapters[activeChapter].levels;
    const title = mode === "melody" ? MELODY_GROUPS[melGroup].name : chapters[activeChapter].name;
    const onBack = fromAdventure
      ? () => { setFromAdventure(false); setScreen("adventure"); }
      : mode === "melody" ? () => setMelGroup(null) : () => setChapter(null);
    const backLabel = fromAdventure ? "← Map" : mode === "melody" ? "← Worlds" : "← Chapters";
    const modeLabel = mode === "melody" ? "single notes" : mode === "chords" ? "chord tones" : "chord progressions";
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={onBack}>{backLabel}</button>
          <h2 className="screen-title">{title}</h2>
        </header>
        <div className="stage-intro">
          <p className="stage-goal">{stageGoal(mode, title)}</p>
          <span className="stage-meta">{list.length} levels · {modeLabel}</span>
        </div>
        {mode === "chords" && (
          <div className="key-row">
            <label className="key-label">
              Key
              <select value={musicKey} onChange={(e) => { setMusicKey(e.target.value); e.target.blur(); }}>
                {KEYS.map((k) => <option key={k} value={k}>{k} major</option>)}
              </select>
            </label>
            <button className={"ghost voice" + (chordSevenths ? " on" : "")}
              onClick={() => { const v = !chordSevenths; setChordSevenths(v); savePref("sevenths", v ? "1" : "0"); }}
              aria-pressed={chordSevenths}>
              {chordSevenths ? "Sevenths on" : "Sevenths off"}
            </button>
          </div>
        )}
        <div className="levels">
          {list.map((lvl, i) => {
            const best = bestOf(mode, lvl.idx);
            const passed = isPassed(mode, lvl.idx);
            // Reached via a free Adventure region? the region gate already vetted access,
            // so never lock the rows there (region 3/4 are chord/minor stages).
            const locked = gated && !fromAdventure && !(mode === "melody" && isMelodyFree(lvl.idx));
            return (
              <button key={lvl.idx} className={"level" + (locked ? " locked" : "")}
                onClick={() => locked ? openUpsell() : startSession(mode, lvl.idx)}>
                <span className="level-num">{i + 1}</span>
                <span className="level-body">
                  <span className="level-name">{lvl.name}</span>
                  {mode === "melody" ? (
                    <span className="level-tags">
                      {levelTags(lvl).map((t, ti) => <span key={ti} className="tag">{t}</span>)}
                    </span>
                  ) : (
                    <span className="level-desc">{lvl.desc}</span>
                  )}
                  <ProgressSquares best={best} total={qCountOf(lvl)} />
                </span>
                <span className="level-state">
                  <span className="level-stars">{[1, 2, 3].map((n) => <span key={n} className={"lvl-star" + (starsFor(mode, lvl.idx) >= n ? " on" : "")}>★</span>)}</span>
                  <span className={"level-pct" + (passed ? " pass" : "")}>{Math.round((best / qCountOf(lvl)) * 100)}%</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint center">{SESSION_LEN} questions per session · {Math.round(PASS_RATE * 100)}% on first tries earns the ✓</p>
        {upsellModal}
      </div>
    );
  }

  if (screen === "session") {
    const lvl = sessLvl || levels[levelIdx];
    const pool = mode === "melody" ? lvl.pool : null;
    const isMinor = mode === "melody" && lvl.mode === "minor";
    const tonicPc = isMinor ? 9 : 0;
    const chordTonic = lvl.mode === "minor" ? 6 : 1; // home degree for chord chapters
    const displayKey = lvl.mode === "minor" ? `${KEYS[mod12(KEYS.indexOf(sessKey) + 9)]} minor` : `${sessKey} major`;
    // pads climb from home: minor starts on 6, major on 1 (matches the tonal map)
    const diaOrder = isMinor ? [6, 7, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
    const chromOrder = ALL12.map((i) => mod12(tonicPc + i));
    // Verda coaching on the tutorial's first drill question
    const tutCoach = tutorialActive && mode === "melody";
    const tutTarget = tutCoach && tutReveal && sess.current ? sess.current.target : null;
    return (
      <div className={"app app-wide" + (lvl.mode === "minor" ? " sess-minor" : "")}>
        <style>{CSS}</style>
        {tutCelebrate && <div className="fx-flash" aria-hidden="true" />}
        <Confetti show={tutCelebrate} />
        <header className="top-slim">
          <button className="back" onClick={() => { killSession(); setPhase("idle"); setBusy(false); setScreen("levels"); }}>← Quit</button>
          <h2 className="screen-title">{lvl.name}</h2>
          <span className="session-score">{streak >= 2 && <span key={streak} className="streak">🔥{streak}</span>}{score} ✓</span>
          <button className="sess-gear" onClick={() => setTestCfgOpen(true)} aria-label="Test settings"
            style={{ background: "none", border: 0, color: "var(--text)", fontSize: "1.15rem", lineHeight: 1, cursor: "pointer", padding: "2px 6px" }}>⚙</button>
        </header>
        {testCfgOpen && (
          <div className="test-cfg-backdrop" onClick={() => setTestCfgOpen(false)}>
            <style>{`
              .test-cfg-backdrop{ position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.55); }
              .test-cfg{ width:100%; max-width:380px; max-height:85vh; overflow-y:auto; background:var(--card,#424845); color:var(--text,#EDF2EE); border-radius:14px; padding:18px 18px 20px; display:flex; flex-direction:column; gap:16px; }
              .retro .test-cfg{ clip-path:var(--notch); border-radius:0; box-shadow:inset 0 0 0 2px var(--line),inset 0 0 0 4px rgba(0,0,0,.25); }
              .test-cfg .tc-title{ font-weight:800; font-size:1.05rem; margin:0; }
              .retro .test-cfg .tc-title{ font-family:var(--pf); font-size:12px; letter-spacing:1px; text-transform:uppercase; color:var(--gold); }
              .test-cfg .set-block{ display:flex; flex-direction:column; gap:8px; }
              .test-cfg .tempo-row{ display:flex; align-items:center; gap:12px; }
              .test-cfg .tempo-row input[type=range]{ flex:1; accent-color:var(--teal,#57C6C4); height:24px; }
              .test-cfg .tempo-val{ font-variant-numeric:tabular-nums; min-width:3.4em; text-align:right; font-weight:700; color:var(--teal,#57C6C4); }
              .retro .test-cfg .tempo-val{ font-family:var(--pf); font-size:11px; }
            `}</style>
            <div className="test-cfg" onClick={(e) => e.stopPropagation()}>
              <p className="tc-title">Test settings</p>
              <div className="set-block">
                <span className="set-label">Tempo</span>
                <p className="set-desc">How fast the cadence plays at the start of each question.</p>
                <div className="tempo-row">
                  <input type="range" min={TEMPO_MIN} max={TEMPO_MAX} step={0.05} value={testTempo} aria-label="Question tempo"
                    onChange={(e) => { const v = parseFloat(e.target.value); setTestTempo(v); savePref("tempo", v); setCadenceSpeed(v); }} />
                  <span className="tempo-val">{testTempo.toFixed(2)}×</span>
                </div>
              </div>
              <div className="set-block">
                <span className="set-label">Resolution speed</span>
                <p className="set-desc">How fast the notes walk home after a correct answer.</p>
                <div className="seg">
                  {RES_SPEEDS.map((s) => (
                    <button key={s.label} className={Math.abs(resStep - s.step) < 0.001 ? "on" : ""}
                      onClick={() => { setResStep(s.step); savePref("resstep", s.step); }}>{s.label}</button>
                  ))}
                </div>
              </div>
              {mode === "progressions" && (
                <div className="set-block">
                  <span className="set-label">Progression speed</span>
                  <p className="set-desc">How fast the chords play in a progression.</p>
                  <div className="seg">
                    {PROG_SPEEDS.map((s) => (
                      <button key={s.label} className={Math.abs(progBeat - s.beat) < 0.001 ? "on" : ""}
                        onClick={() => { setProgBeat(s.beat); savePref("progbeat", s.beat); }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="set-block">
                <span className="set-label">Theme</span>
                <p className="set-desc">Light currently reskins Boring mode; the Adventure skin stays dark.</p>
                <div className="seg">
                  <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>Light</button>
                </div>
              </div>
              <button className="primary" onClick={() => setTestCfgOpen(false)}>Done</button>
            </div>
          </div>
        )}
        <div className="progressbar"><div className="fill" style={{ width: `${(qNum / qCountOf(lvl)) * 100}%` }} /></div>
        {!boringMode && (
          <div className="hpbar">
            <span className="hp-label">Trial</span>
            <div className="trial-cells">
              {Array.from({ length: qCountOf(lvl) }).map((_, i) => {
                const r = sessionResults[i];
                const cls = "cell"
                  + (r ? (r.firstTry ? " hit" : " miss") : "")
                  + (i === passCountFor(lvl) - 1 ? " mark" : "")
                  + (streak >= 2 && i === sessionResults.length - 1 && r && r.firstTry ? " hot" : "");
                return <i key={i} className={cls} />;
              })}
            </div>
            {streak >= 2 && <span className="combo">×{streak}</span>}
          </div>
        )}
        <p className="qcount">Question {Math.min(qNum + 1, qCountOf(lvl))} of {qCountOf(lvl)} · {displayKey}{lvl.keyMode === "random" ? " (changes every question)" : ""}</p>

        {/* drill-stage = display:contents in portrait (no change); a two-column flex row in phone-landscape */}
        <div className={"drill-stage drill-" + mode}>
        {mode === "melody" && (
          <DegreeLadder active={litActive} correct={litCorrect} wrong={litWrong}
            tonicPc={tonicPc} pool={pool} showChrom={lvl.chromatic} />
        )}

        <section className="panel">
          <div className="quiz-bar">
            <div className="replay-group">
              <button className="ghost" onClick={replayFull} disabled={phase !== "answer" || busy}>↻ Repeat</button>
              <button className="ghost note" onClick={replayTarget} disabled={phase !== "answer" || busy}
                aria-label="Play just the sound to identify">♪</button>
            </div>
            {mode === "melody" && (
              <button className={"ghost voice" + (voiceOn ? " on" : "")}
                onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn}>
                {voiceOn ? "Voice on" : "Voice off"}
              </button>
            )}
            {mode === "chords" && (
              <button className={"ghost voice" + (showRef ? " on" : "")}
                onClick={() => { const v = !showRef; setShowRef(v); savePref("chordref", v ? "1" : "0"); }}
                aria-pressed={showRef}>
                Chord chart
              </button>
            )}
            <p className={"hint grow" + (tutCoach ? " tut-coach-line" : "")} role="status" aria-live="polite">
              {phase === "playing" ? (tutCoach ? "Verda plays a number… listen." : "Listen…")
                : feedback && feedback.roman
                  ? <span><strong>{feedback.sym}</strong> <em className="numlabel">{feedback.num}</em> · {feedback.quality}. {CHORD_INSIGHTS[feedback.roman]}</span>
                : feedback && feedback.prog
                  ? <span><strong>{feedback.prog.join("–")}</strong> — nailed the changes.</span>
                : feedback ? feedback
                : mode === "melody" ? (tutCoach ? "Which number was that? Tap it below." : "Which number did you hear?")
                : mode === "chords" ? `Select ${lvl.sevenths ? 4 : 3} degrees (${chPicked.length}/${lvl.sevenths ? 4 : 3}), then check.`
                : "Tap the chords you heard, in order."}
            </p>
          </div>
          {mode === "melody" ? (
            lvl.chromatic ? (
              <div className="numpad chromatic">
                {chromOrder.map((pc) => {
                  const out = !pool.includes(pc);
                  return (
                    <button key={pc}
                      className={"num chrom" + (pc === tonicPc ? " tonic" : "") + (ALTERED_PCS.includes(pc) ? " alt" : "") + (out ? " dim" : "") + (hitPad === pc ? " just" : "") + (litWrong.includes(pc) ? " wrong" : "") + (revealPc === pc ? " coach-target" : "")}
                      onClick={() => answerMelodySession(pc)}
                      disabled={phase !== "answer" || out}>
                      {NOTE_LABELS[pc]}<span className="num-sol">{NOTE_SOLFEGE[pc]}</span>
                      {hitPad === pc && <span className="num-mark" aria-hidden="true">✓</span>}
                      {litWrong.includes(pc) && <span className="num-mark" aria-hidden="true">✕</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={"numpad" + (tutCoach && phase === "answer" ? " coach" : "")}>
                {diaOrder.map((deg) => {
                  const pc = DEGREE_TO_PC[deg];
                  const out = !pool.includes(pc);
                  return (
                    <button key={deg}
                      className={"num" + (pc === tonicPc ? " tonic" : "") + (out ? " dim" : "") + (hitPad === pc ? " just" : "") + (litWrong.includes(pc) ? " wrong" : "") + (tutTarget === pc || revealPc === pc ? " coach-target" : "")}
                      onClick={() => answerMelodySession(pc)}
                      disabled={phase !== "answer" || out}>
                      {deg}<span className="num-sol">{SOLFEGE[deg]}</span>
                      {hitPad === pc && <span className="num-mark" aria-hidden="true">✓</span>}
                      {litWrong.includes(pc) && <span className="num-mark" aria-hidden="true">✕</span>}
                    </button>
                  );
                })}
              </div>
            )
          ) : mode === "chords" ? (
            <>
            {showRef && (
              <div className="chord-ref">
                {lvl.pool.map((r) => {
                  const tones = chordTones(chordByRoman(r), lvl.sevenths);
                  return (
                    <div key={r} className="cr-row">
                      <span className="cr-sym">{chordSymbol(r, lvl.sevenths)}</span>
                      <span className="cr-num">{chordNumber(r, lvl.sevenths)}</span>
                      <span className="cr-tones">{tones.map(degreeLabel).join(" · ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="chord-layout">
              <SessionStack picked={chPicked} correct={litCorrect} wrong={litWrong}
                label={feedback && feedback.roman ? feedback.sym : null} />
              <div className="chord-right">
                <div className="numpad">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button key={d}
                      className={"num" + (d === chordTonic ? " tonic" : "") + (chPicked.includes(d) ? " picked" : "")}
                      onClick={() => toggleChordPick(d)}
                      disabled={phase !== "answer"}>
                      {d}<span className="num-sol">{SOLFEGE[d]}</span>
                    </button>
                  ))}
                </div>
                <button className="primary wide" onClick={checkChordSession}
                  disabled={phase !== "answer" || chPicked.length !== (lvl.sevenths ? 4 : 3) || busy}>
                  Check answer
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="prog-layout">
              <div className="prog-stacks">
                {Array.from({ length: lvl.len }, (_, i) => {
                  const revealing = phase === "resolving" && feedback && feedback.prog;
                  const roman = revealing ? feedback.prog[i] : progAnswer[i];
                  return (
                    <ProgStack key={i} roman={roman}
                      tonic={lvl.mode === "minor" ? 6 : 1}
                      wrong={progWrong.includes(i)}
                      active={revealing && progActive === i} />
                  );
                })}
              </div>
              <div className="prog-right">
              <div className="numpad chordpad">
                {lvl.pool.map((r) => (
                  <button key={r} className="num chordbtn"
                    onClick={() => tapChord(r)}
                    disabled={phase !== "answer" || busy || progAnswer.length >= lvl.len}>
                    {r}<span className="num-sol">{chordNumber(r, false)}</span>
                  </button>
                ))}
              </div>
              <div className="prog-actions">
                <button className="ghost" onClick={backspaceChord}
                  disabled={phase !== "answer" || busy || !progAnswer.length}>⌫ Undo</button>
                <button className="primary grow" onClick={checkProgression}
                  disabled={phase !== "answer" || busy || progAnswer.length !== lvl.len}>
                  Check answer
                </button>
              </div>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    const total = sessionResults.length || 1;
    const firstTries = sessionResults.filter((r) => r.firstTry).length;
    const pct = Math.round((firstTries / total) * 100);
    const passRate = passRateOf(sessLvl);
    const passed = firstTries / total >= passRate;
    const lvls = levels;
    const isCustom = levelIdx == null;
    const resultName = (sessLvl && sessLvl.name) || (lvls[levelIdx] && lvls[levelIdx].name) || "Session";
    // region just fully cleared? → Keeper's mark + fragment flourish (game mode only)
    const advNode = fromAdventure && !boringMode && advStageId && window.HARMONIA ? window.HARMONIA.nodes[advStageId - 1] : null;
    const justCleared = advNode && !sessWasClearedRef.current && stageClearedAdv(advStageId);
    const finale = justCleared && advCollected.size >= 8; // the WHOLE sword just came together
    const fragName = advNode ? window.HARMONIA.fragLabel[window.HARMONIA.stageFrag[advStageId]] : "";
    const hasNext = !isCustom && levelIdx + 1 < lvls.length;

    // best first-try streak this session
    let bestStreak = 0, run = 0;
    sessionResults.forEach((r) => { if (r.firstTry) { run += 1; bestStreak = Math.max(bestStreak, run); } else run = 0; });

    // per-target breakdown (progressions have long, mostly-unique labels — skip the bars)
    const showBars = mode !== "progressions";
    const byTarget = {};
    sessionResults.forEach((r) => {
      const k = typeof r.target === "number" ? NOTE_LABELS[r.target] : r.target;
      byTarget[k] = byTarget[k] || { right: 0, total: 0 };
      byTarget[k].total += 1;
      if (r.firstTry) byTarget[k].right += 1;
    });

    return (
      <div className="app">
        <style>{CSS}</style>
        {justCleared && <div className="fx-flash" aria-hidden="true" />}
        <Confetti show={justCleared} />
        {finale && (
          <div className="finale" onClick={() => { setSwordBurst(true); setScreen("adventure"); }}>
            <div className="finale-rays" aria-hidden="true" />
            <div className="finale-inner">
              <span className="finale-kicker">✦ The blade is whole ✦</span>
              <div className="finale-forge">
                <ForgeSword collected={advCollected} className="finale-sword" />
                <span className="finale-shine" aria-hidden="true" />
                {typeof window !== "undefined" && window.CODA_VICTORY && (
                  <img className="finale-coda" src={window.CODA_VICTORY} alt="Coda, victorious" aria-hidden="true" />
                )}
              </div>
              <h2 className="finale-title">EXCALIBAR<br />REFORGED</h2>
              <span className="finale-quote">“{advNode.win}”</span>
              <button className="primary finale-btn" onClick={(e) => { e.stopPropagation(); setSwordBurst(true); setScreen("adventure"); }}>Return to Harmonia →</button>
            </div>
          </div>
        )}
        <header className="top-slim">
          <button className="back" onClick={() => { if (fromAdventure) { setSwordBurst(!!justCleared); setScreen("adventure"); } else { setScreen("levels"); } }}>{fromAdventure ? "← To the map" : "← Levels"}</button>
          <h2 className="screen-title">{resultName}</h2>
        </header>
        <div className="results">
          {justCleared && !finale && (
            <div className="victory">
              <div className="victory-rays" aria-hidden="true" />
              <div className="victory-glow" aria-hidden="true" />
              <span className="victory-kicker">✦ Fragment forged ✦</span>
              <h3 className="victory-title">{advNode.winTitle}</h3>
              <div className="victory-forge">
                <ForgeSword collected={advCollected} className="victory-sword" />
                <div className="forge-sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
              <span className="frag-chip"><span className="gem">◆</span>{fragName} — forged into Excalibar</span>
              <span className="victory-quote">“{advNode.win}”</span>
              <span className="forge-count">{advCollected.size >= 8 ? "Excalibar reforged!" : advCollected.size + " / 8 fragments"}</span>
            </div>
          )}
          {justCleared && !finale && (
            <button className="primary map-return" onClick={() => { setSwordBurst(true); setScreen("adventure"); }}>← Return to the map</button>
          )}
          <div className={"score-big" + (passed ? " pass" : "")}>{pct}%</div>
          <p className="hint center">
            {isCustom
              ? (passed ? "Strong run. Custom sessions aren't scored toward stages." : "Custom sessions aren't scored toward stages — tweak the notes and go again.")
              : passed
                ? (hasNext ? "Passed! This level is checked off." : "Passed — that's the top level. Your ears are working.")
                : `${Math.round(passRate * 100)}% on first tries earns the check. Every rep counts.`}
          </p>
          <div className="stat-row">
            <span className="stat"><b>{firstTries}/{total}</b> first try</span>
            <span className="stat"><b>{bestStreak >= 2 ? "🔥" : ""}{bestStreak}</b> best streak</span>
          </div>
          {showBars && (
            <div className="bars">
              {Object.entries(byTarget).map(([k, v]) => (
                <div key={k} className="bar-row">
                  <span className="bar-label">{k}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(v.right / v.total) * 100}%` }} /></div>
                  <span className="bar-count">{v.right}/{v.total}</span>
                </div>
              ))}
            </div>
          )}
          {!onboarded && (passed || justCleared) && (
            <div className="lead-card">
              {leadStatus === "done" ? (
                <>
                  <span className="lead-kicker">✓ You're in</span>
                  <p className="lead-copy">Check your inbox to confirm — your Chords-by-Numbers PDF lands right after. Your progress is saved, too.</p>
                  <div className="lead-actions">
                    <a className="primary offer-link" href={OFFER_URL} target="_blank" rel="noopener noreferrer"
                      onClick={() => { track("offer_click", { where: "lead_done" }); finishOnboarding(); }}>Show me how →</a>
                    <button className="ghost" onClick={finishOnboarding}>Keep playing</button>
                  </div>
                </>
              ) : leadStatus === "saved" ? (
                <>
                  <span className="lead-kicker">✓ Progress saved</span>
                  <p className="lead-copy">Saved on this device. I couldn't send the PDF just now — give it another try, or keep playing and grab it later.</p>
                  <div className="lead-actions">
                    <button className="primary" onClick={submitLead} disabled={leadStatus === "sending"}>{leadStatus === "sending" ? "Sending…" : "Try again"}</button>
                    <button className="ghost" onClick={finishOnboarding}>Keep playing</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="lead-kicker">✦ Save your progress + a free gift ✦</span>
                  <p className="lead-copy">Want to hear any guitar chord by ear? Pop in your email and I'll send you the free Chords-by-Numbers PDF — the method behind this whole game. Your progress saves, too.</p>
                  <input className="set-input lead-input" placeholder="first name" value={leadName} autoComplete="given-name" onChange={(e) => setLeadName(e.target.value)} />
                  <input className="set-input lead-input" type="email" name="email" placeholder="you@email.com" value={leadEmail}
                    inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    onChange={(e) => { setLeadEmail(e.target.value); if (leadStatus === "error") setLeadStatus("idle"); }}
                    onKeyDown={(e) => { if (e.key === "Enter") submitLead(); }} />
                  {leadStatus === "error" && <span className="lead-err">Enter a valid email, or tap Maybe later.</span>}
                  <span className="lead-consent">We'll email you the free PDF. No spam — unsubscribe anytime.</span>
                  <div className="lead-actions">
                    <button className="primary" onClick={submitLead} disabled={leadStatus === "sending"}>
                      {leadStatus === "sending" ? "Sending…" : "Send me the PDF"}
                    </button>
                    <button className="ghost" onClick={finishOnboarding}>Maybe later</button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="results-actions">
            <button className="primary" onClick={() => isCustom ? startSession(mode, null, sessLvl) : startSession(mode, levelIdx)}>Try again</button>
            {hasNext && (
              <button className="primary" onClick={() => (gated && !fromAdventure && !(mode === "melody" && isMelodyFree(levelIdx + 1))) ? openUpsell() : startSession(mode, levelIdx + 1)}>Next level →</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    const bal = starBalance();
    const skinItem = (id, name, desc, tint) => {
      const owned = id === "default" || shop.owned.includes(id);
      const equipped = shop.skin === id;
      const cost = (SHOP.find((x) => x.id === id) || {}).cost;
      const frames = (typeof window !== "undefined" && window.CODA_SKINS) ? window.CODA_SKINS[id] : null;
      const src = (frames && frames.s) || (typeof window !== "undefined" ? window.CODA_SPRITE : "");
      return (
        <div key={id} className={"shop-item" + (equipped ? " equipped" : "")}>
          <span className="shop-swatch" style={{ boxShadow: "inset 0 0 0 2px " + tint + "55" }}>
            {src ? <img src={src} alt="" /> : null}
          </span>
          <div className="shop-info"><span className="shop-name">{name}</span><span className="shop-desc">{desc}</span></div>
          {owned
            ? <button className={"ghost" + (equipped ? " on" : "")} onClick={() => equipSkin(id)} disabled={equipped}>{equipped ? "Equipped" : "Equip"}</button>
            : <button className="primary" onClick={() => buyItem(SHOP.find((x) => x.id === id))} disabled={bal < cost}>★ {cost}</button>}
        </div>
      );
    };
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => setScreen(auxReturn || (boringMode ? "home" : "menu"))}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">Shop</h2>
        </header>
        <div className="shop-balance"><span className="star">★</span> {bal} <em>stars to spend</em></div>
        <p className="hint center">Ace levels to earn stars: 1★ pass · 2★ one miss · 3★ perfect. Spend them on Coda skins.</p>
        <div className="shop-grid">
          {skinItem("default", "Coda (classic)", "The original teal & green.", "#57C6C4")}
          {SHOP.map((it) => skinItem(it.id, it.name, it.desc, it.tint))}
        </div>
      </div>
    );
  }

  if (screen === "tutorial") {
    // Cinematic tutorial (Fable "JRPG Cutscene" look), now two chapters: Verda/major
    // (Staircase Meadows) and Rue/minor (Lowmoor Fen). tutCfg + tutChapter drive the swap;
    // Rue's beats reuse the same widgets with the minor map (home = 6) + a fen backdrop.
    const isMinor = tutChapter === "minor";
    const keeperSrc = typeof window !== "undefined" ? (tutChapter === "chords" ? window.SYLVA_SPRITE : isMinor ? window.RUE_SPRITE : window.VERDA_SPRITE) : "";
    // The teaching maps are interactive — tap any pad to hear that degree (reuse the
    // guide's ExploreMap + playExplore). One shared element for every map beat.
    const tutMap = <ExploreMap start={1} count={8} stage={0} octaves={1} world={null} active={litActive} onPlay={playExplore} />;
    // Staircase reveal for the tonal-map beat: the numbers rise to their pitch height. key forces remount so the animation replays on entry.
    const tutMapStair = <ExploreMap key="stair" start={1} count={8} stage={0} octaves={1} world={null} active={litActive} onPlay={playExplore} staircase />;
    // The half-step beat keeps 3·4 and 7·1 persistently lit so the two half-step pairs
    // are visible right on the map (taps still light via litActive).
    const tutMapHalf = <ExploreMap start={1} count={8} stage={0} octaves={1} world={null} hi={[3, 4, 7, 8]} active={litActive} onPlay={playExplore} />;
    // Rue's minor variants: SAME 1–8 map, but home=6 wears the star (the whole lesson —
    // nothing moved, only home). Half-steps still light at 3·4 and 7·1.
    const tutMapMinor = <ExploreMap start={6} count={8} stage={0} octaves={1} world={null} home={6} active={litActive} onPlay={playExplore} />;
    const tutMapMinorStair = <ExploreMap key="mstair" start={6} count={8} stage={0} octaves={1} world={null} home={6} active={litActive} onPlay={playExplore} staircase />;
    // starts on 6, so the half-step pairs land at raw 7·8 (7→1) and 10·11 (3→4).
    const tutMapMinorHalf = <ExploreMap start={6} count={8} stage={0} octaves={1} world={null} home={6} hi={[7, 8, 10, 11]} active={litActive} onPlay={playExplore} />;
    // Half-step beat stage: the lit map + piano/guitar diagrams that show a half step as two next-door keys/frets.
    const tutHalfStage = <div className="tut-halfstage">{tutMapHalf}<HalfStepDiagrams /></div>;
    // "Mary had a little lamb" as number-notation: degree, note length (beats), lyric.
    const MARY = [
      { deg: 3, dur: 1, lyric: "Ma-" }, { deg: 2, dur: 1, lyric: "ry" }, { deg: 1, dur: 1, lyric: "had" }, { deg: 2, dur: 1, lyric: "a" },
      { deg: 3, dur: 1, lyric: "lit-" }, { deg: 3, dur: 1, lyric: "tle" }, { deg: 3, dur: 2, lyric: "lamb" },
      { deg: 2, dur: 1, lyric: "lit-" }, { deg: 2, dur: 1, lyric: "tle" }, { deg: 2, dur: 2, lyric: "lamb" },
      { deg: 3, dur: 1, lyric: "lit-" }, { deg: 5, dur: 1, lyric: "tle" }, { deg: 5, dur: 2, lyric: "lamb" },
    ];
    // The "12 pitches" beat gets a CHROMATIC map — all 12, flats included — also tappable.
    const CHROM = [["1", 0, 0, 1], ["♭2", 1, 1], ["2", 2], ["♭3", 3, 1], ["3", 4], ["4", 5], ["♭5", 6, 1], ["5", 7], ["♭6", 8, 1], ["6", 9], ["♭7", 10, 1], ["7", 11], ["1", 12, 0, 1]];
    const tutChromMap = (
      <div className="tut-chrom">
        {CHROM.map(([lab, semi, alt, tonic], i) => (
          <button key={i} className={"tut-chrom-pad" + (alt ? " alt" : "") + (tonic ? " tonic" : "") + (chromLit === semi ? " lit" : "")}
            onClick={() => { setChromLit(semi); try { playSemi("C", semi, 0.03, 4); } catch (e) {} setTimeout(() => setChromLit((l) => (l === semi ? -1 : l)), 450); }}>{lab}</button>
        ))}
      </div>
    );
    // "All of music → 12 notes": a stack of scores/composer books distilling down into the chromatic pads.
    const tutTwelve = (
      <div className="tut-twelve">
        <style>{`
          .tut-twelve { display:flex; flex-direction:column; align-items:center; gap:5px; }
          .tt-books-img { width:84px; height:84px; image-rendering:pixelated; filter: drop-shadow(0 3px 4px rgba(0,0,0,.4)); }
          .tt-cap { font-family:var(--pf,'Courier New',monospace); font-size:9px; letter-spacing:1px; text-transform:uppercase; color:var(--text,#EDF2EE); opacity:.65; }
          .tt-cap.b { color:var(--teal,#57C6C4); opacity:1; }
          .tt-arrow { color:var(--teal,#57C6C4); font-size:22px; line-height:.5; margin:-1px 0; }
        `}</style>
        <img className="tt-books-img" src={typeof window !== "undefined" ? window.MUSIC_BOOKS : ""} alt="Stacks of music books and scores" />
        <span className="tt-cap">every song, every score…</span>
        <span className="tt-arrow" aria-hidden="true">▼</span>
        {tutChromMap}
        <span className="tt-cap b">…is built from just these 12</span>
      </div>
    );
    const verdaBeats = [
      { title: "Staircase Meadows", cue: null,
        lines: <>Welcome to <b className="hl-g">Staircase Meadows</b>, traveler. I'm <b className="hl-t">Verda</b> — I'll be right beside you. Let me show you how every song you've ever heard is built.</>,
        stage: tutMap },
      { title: "Twelve pitches", cue: null,
        lines: <>All of music rests on just <b className="hl-g">12 unique pitches</b>, repeating forever up and down. But here's the secret: at any moment, most songs use only <b className="hl-t">7 of them</b>. We'll visualize these notes on a line that goes in both directions, repeating forever.</>,
        stage: tutTwelve },
      { title: "The tonal map", cue: null, hear: { label: "▶ Hear the scale", act: () => playTutPhrase([1, 2, 3, 4, 5, 6, 7, 8]) },
        lines: <>The shortest distance between two pitches is a <b className="hl-t">half step</b>; two half steps make a <b className="hl-t">whole step</b>. Arrange them in the right pattern and you get this — the <b className="hl-g">tonal map</b> (you may know it as the major scale).</>,
        stage: tutMapStair },
      { title: "Where the half steps hide", cue: null,
        lines: <>The dots are the pitches <em>in between</em>. Where two numbers touch with <b>no dot</b> — <b className="hl-g">3→4</b> and <b className="hl-g">7→1</b> — that's a <b className="hl-t">half step</b>. Tap <b className="hl-g">3</b> then <b className="hl-g">4</b>: on any instrument, a half step is just the <b className="hl-t">next-door</b> note.</>,
        stage: tutHalfStage },
      { title: "Home never moves", cue: null,
        lines: <>Here's the secret that makes it all work: every other note feels a pull toward <b className="hl-t">home</b>. Like planets around a sun, the whole system orbits <b className="hl-t">1</b> — that's <b className="hl-g">tonal gravity</b>. Names don't matter; music is <b className="hl-t">relative to home</b>, and in a <b className="hl-g">major key</b> home is always <b className="hl-t">1</b>.</>,
        stage: <SolarSystem /> },
      { title: "Mary had a little lamb", hear: { label: "▶ Hear it in numbers", act: () => playTutPhrase(MARY.map((n) => n.deg), MARY.map((n) => n.dur)) },
        lines: <>You already know this one. Watch a song you love become <b className="hl-g">numbers</b> — higher notes sit higher, longer notes stretch wider. Tap any note to hear it.</>,
        stage: <MaryNotation notes={MARY} active={playIdx} onNote={playStackNote} /> },
      { title: "Chords are numbers, stacked", cue: null, hear: { label: "▶ Hear a 2–5–1", act: playTwoFiveOne },
        lines: <>Even chords are just numbers, <b className="hl-t">stacked</b> — tap a stacked number to hear that note, or a chord name to hear the whole chord. That's the road ahead; first, we'll train your ear on single notes.</>,
        stage: <div className="stacks"><GuideStack label="2-" world={2} onPlay={playChordStack} onNote={playStackNote} /><GuideStack label="5D" world={5} onPlay={playChordStack} onNote={playStackNote} /><GuideStack label="1" world={1} onPlay={playChordStack} onNote={playStackNote} /></div> },
      { title: "A little secret", cue: null,
        lines: <>One secret before we begin: as each note plays, try <b className="hl-t">singing its number</b> out loud. It's completely optional — but nothing will grow your ear faster.</>,
        stage: tutMap },
      { title: "Feel the sound", cue: null,
        lines: <>Now let's listen together. I'll play a note — <b className="hl-t">listen deeply</b>, feel where it lies, then name its number. Three tries here with me.</>,
        stage: tutMap },
    ];
    // Rue's minor chapter (Lowmoor Fen). Beats 1–2 show Verda's UNCHANGED major map
    // (proof "nothing moved"); beat 3 swaps to the minor map so "home slid to 6" is a
    // visual moment. Copy by Fable, in Rue's earthy voice.
    const rueBeats = [
      { title: "Lowmoor Fen", cue: null,
        lines: <>Mind the mud, traveler — welcome to <b className="hl-g">Lowmoor Fen</b>. I'm <b className="hl-t">Old Rue</b>. Folk up the meadow say the fen sounds <b className="hl-t">sadder</b>. Rumor. Nothing down here ever moved — come, I'll show you.</>,
        stage: tutMapMinor },
      { title: "The same seven", cue: null,
        lines: <>Look what I keep by the water: <b className="hl-g">Verda's map</b> — the very one. Same <b className="hl-t">seven numbers</b>, same shape, same two <b className="hl-g">half steps</b> hiding at <b className="hl-g">3→4</b> and <b className="hl-g">7→1</b>. I didn't touch a single note. Go on, tap it — every note's right where you left it.</>,
        stage: tutMapMinor },
      { title: "Home moved to 6", cue: null, hear: { label: "▶ Hear the new home", act: playTutCadenceMinor },
        lines: <>Here's the fen's one secret — and it's a small one. Down here your ear stops resting on 1 and settles on <b className="hl-t">6</b>. That's all that happened. <b className="hl-t">Home moved</b>; the notes stayed put. Same map, read from a different porch.</>,
        stage: tutMapMinorStair },
      { title: "Darker — same bones", cue: null,
        lines: <>Hear that ache? That's not a new note — it's an old view. The <b className="hl-g">half steps</b> still live at <b className="hl-g">3→4</b> and <b className="hl-g">7→1</b>, exactly where Verda showed you. The bones never changed. The world just looks <b className="hl-t">longing</b> when you watch it from 6 — and that's all folk mean by a <b className="hl-g">minor key</b>.</>,
        stage: tutMapMinorHalf },
      { title: "The pull of 6", cue: null, hear: { label: "▶ Hear it settle on 6", act: playTutCadenceMinor },
        lines: <>Remember Verda's little sun? The sky went dusk down here, but the <b className="hl-g">gravity</b> never quit. Every note still falls toward <b className="hl-t">home</b> — only now the whole fen orbits <b className="hl-t">6</b>. Listen for the lean: when the music sighs and settles, that's 6 catching it.</>,
        stage: <SolarSystem home={6} /> },
      { title: "Feel it together", cue: null,
        lines: <>Enough of my talk — the reeds teach better than I do. I'll hum a note into the mist. <b className="hl-t">Listen deeply</b>, feel how far it sits from <b className="hl-t">6</b>, then name its number. Sing it back soft if you like; the fen won't laugh. Three tries, right here beside me.</>,
        stage: tutMapMinor },
    ];
    // ── Sylva / Glasswood (chords). Reading chords on the one tonal ladder + hearing each
    //    voice (walk → ring). Triads shown via GuideStack's explicit `tones`. Copy by Fable. ──
    const TRI = { I: [1, 3, 5], IV: [4, 6, 1], V: [5, 7, 2], vi: [6, 1, 3] };
    const gsPlay = (w, tones) => { if (!busy) playChordWR("C", tones, "ring"); };
    const gsNote = (d) => { try { playDegree("C", d, 0); } catch (e) {} };
    const hearCh = (tones, mode) => () => { if (!busy) playChordWR("C", tones, mode); };
    const hearProg = (seq) => () => { if (!busy) playProgression("C", seq, 0, 0.72); };
    const sylvaBeats = [
      { title: "The Forest That Rings", cue: null, hear: { label: "▶ Hear it", act: hearCh(TRI.I, "ring") },
        lines: <>Hush, traveler — step lightly. You've reached the <b className="hl-g">Glasswood</b>, and I'm <b className="hl-t">Sylva</b>. Three notes at once, and you can hear every one. Look through the chord like glass.</>,
        stage: <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /></div> },
      { title: "Nothing New Grows Here", cue: null, hear: { label: "▶ Hear the 1 chord", act: hearCh(TRI.I, "both") },
        lines: <>Remember what Verda told you? <b className="hl-g">Chords are just numbers, stacked</b> — nothing here you haven't met. Only <b className="hl-t">1</b>, <b className="hl-g">3</b>, and <b className="hl-g">5</b>, ringing at once. Old friends, standing close. Tap a circled number to hear that voice.</>,
        stage: <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /></div> },
      { title: "One Ladder, Every Chord", cue: null,
        lines: <>Here's why I write them <b className="hl-g">stacked</b>. This ladder holds all <b className="hl-g">seven numbers</b> of the octave — the very ones Verda gave you. Every chord in the world lands right here; a chord is only <b className="hl-g">which rungs light up</b>. Tap each — you never learn a "new chord," you just read the ladder.</>,
        stage: <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="4" tones={TRI.IV} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="5" tones={TRI.V} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="6" tones={TRI.vi} onPlay={gsPlay} onNote={gsNote} /></div> },
      { title: "The Note That's Really Home", cue: null, hear: { label: "▶ Hear the 4 chord", act: hearCh(TRI.IV, "both") },
        lines: <>Some folk name a chord's voices <em>root, third, fifth</em> — counted from the chord, never the key. That hides where they live. Look at the <b className="hl-g">4 chord</b>: <b className="hl-g">4, 6, and 1</b>. Count the old way and that last note is just "the <b className="hl-g">fifth</b>" — a stranger. The ladder names it true: it's <b className="hl-t">1</b>. <b className="hl-t">Home</b>, ringing right inside the 4.</>,
        stage: <div className="stacks tut-annote"><GuideStack label="4" tones={TRI.IV} home={1} onPlay={gsPlay} onNote={gsNote} /><div className="tut-note"><span className="tut-note-sp">4 · 6 · 1</span><span className="tut-note-pt">↙ the <b className="hl-t">1</b> on the bottom is <b className="hl-t">home</b> — not just "the 5th"</span></div></div> },
      { title: "Walk It, Then Ring It", cue: null,
        lines: <>Never meet a chord head-on. <b className="hl-g">Walk</b> it first — one trunk at a time, low to high — then let it <b className="hl-g">ring</b>, all together. Nothing changed between the two; you simply stopped walking.</>,
        stage: <div className="stacks tut-annote"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /><div className="tut-wr"><button className="btn go" disabled={busy} onClick={hearCh(TRI.I, "walk")}>▶ Walk it</button><button className="btn go" disabled={busy} onClick={hearCh(TRI.I, "ring")}>▶ Ring it</button></div></div> },
      { title: "Chords Are Kin", cue: null,
        lines: <>Now the ladder's finest gift: you can see a chord's <b className="hl-g">family</b>. Set the <b className="hl-t">1</b> beside the <b className="hl-g">6</b> — look close. Two of their three rungs land on the same numbers: <b className="hl-t">1 and 3</b>. They share most of their <b className="hl-g">DNA</b> — change one voice of home and you <em>have</em> the 6. It's home's own blood, wearing shadow.</>,
        stage: <div className="stacks tut-kin"><GuideStack label="1" tones={TRI.I} hi={[1, 3]} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="6" tones={TRI.vi} hi={[1, 3]} onPlay={gsPlay} onNote={gsNote} /></div> },
      { title: "The Four Groves, and How They Lean", cue: null, hear: { label: "▶ 5 → 1", act: hearProg([TRI.V, TRI.I]) },
        lines: <>Four groves do most of the singing: <b className="hl-t">1</b>, <b className="hl-g">4</b>, <b className="hl-g">5</b>, <b className="hl-g">6</b>. The <b className="hl-t">1</b> rests — <b className="hl-t">home</b>, at ease. <b className="hl-g">4</b> and <b className="hl-g">5</b> are the bright roads away; <b className="hl-g">5</b> leans hard for home. And <b className="hl-g">6</b> — the <b className="hl-g">tender cousin</b>; Old Rue would nod. Home lives inside it, its <b className="hl-t">1</b> and <b className="hl-g">3</b>.</>,
        stage: <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="4" tones={TRI.IV} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="5" tones={TRI.V} onPlay={gsPlay} onNote={gsNote} /><GuideStack label="6" tones={TRI.vi} home={1} onPlay={gsPlay} onNote={gsNote} /></div> },
      { title: "Read the Grove", cue: null, hear: { label: "▶ Walk it, then ring it", act: hearCh(TRI.I, "both") },
        lines: <>Enough talk — glass is for looking <em>through</em>. I'll <b className="hl-g">walk</b> a chord, then <b className="hl-g">ring</b> it, and you'll answer on the <b className="hl-g">stack</b>: tap the numbers you hear. Wrong trunks cost nothing; glass forgives. Three tries with me, and we start low.</>,
        stage: <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /></div> },
    ];
    const beats = tutChapter === "chords" ? sylvaBeats : isMinor ? rueBeats : verdaBeats;
    const step = Math.min(tutStep, beats.length - 1); // clamp: never index past the array
    const beat = beats[step];
    const last = step === beats.length - 1;
    const drill = tutMode === "drill";
    const done = tutMode === "done"; // graduation send-off after the 3 drills
    const isChords = tutChapter === "chords";
    const drillTitle = tutDrillPhase === "play" ? "Listen…"
      : tutDrillPhase === "win" ? (isChords ? "Clear as glass!" : "You felt it!")
      : isChords ? "Which chord tones?" : "Which number?";
    // Sylva's per-drill coached lines. Each drill = name ALL the chord's tones (not just the root).
    const sylvaDrills = [
      { listen: <>Softly now. I'll <b className="hl-g">walk</b> it low to high, then let it <b className="hl-g">ring</b> — three voices, and you know each one already.</>,
        prompt: <>Tap all <b className="hl-g">three notes that make up the chord</b> — not just the bottom one — then <b className="hl-g">check</b>.</>,
        wrong: <>Not quite — no shame; glass only asks you to look again. All <b className="hl-t">three chord tones</b> are glowing. Hear the walk once more.</>,
        win: <>Every voice named, clean — you looked straight <b className="hl-g">through</b> it. The wood gets easier from here.</> },
      { listen: <>Again — a <b className="hl-g">walk</b>, then the <b className="hl-g">ring</b>. Three trunks; take your time and hear each one stand.</>,
        prompt: <>Tap the <b className="hl-g">three chord tones</b> you hear — all of them — then <b className="hl-g">check</b>. Take the walk again any time.</>,
        wrong: <>Close — one voice slipped behind another. The <b className="hl-t">true three</b> are glowing; listen again.</>,
        win: <>You're not hearing a blur anymore — you're hearing <b className="hl-g">through</b>. Every voice in its place.</> },
      { listen: <>Last one — <b className="hl-g">walk</b>, then <b className="hl-g">ring</b>, the way songs will give it to you. Name the whole chord.</>,
        prompt: <>Tap <b className="hl-g">all three of the chord's notes</b>, then <b className="hl-g">check</b>.</>,
        wrong: <>Almost through — one pane's fogged. Watch the <b className="hl-t">three</b> glow, and hear the walk once more.</>,
        win: <>You heard every voice in the chord. <b className="hl-g">Clear as glass.</b></> },
    ];
    const chordDrillLine = (() => { const d = sylvaDrills[Math.min(tutDrillN, 2)]; return tutDrillPhase === "win" ? d.win : tutReveal ? d.wrong : tutDrillPhase === "play" ? d.listen : d.prompt; })();
    const drillLine = isMinor
      ? (tutDrillPhase === "win"
          ? <>There it is. Even in the low light, you're <b className="hl-g">naming what you hear</b>.</>
          : tutReveal
            ? <>Not quite — no shame in the dark. Listen again and feel its <b className="hl-t">lean toward 6</b> — it's the glowing number.</>
            : tutDrillPhase === "play"
              ? <>Hush, now. Let the note land on the water and <b className="hl-t">listen</b> — feel how far it sits from <b className="hl-t">6</b>.</>
              : <>Now <b className="hl-g">name it</b> — which number does it feel like from down here?</>)
      : (tutDrillPhase === "win"
          ? <>Yes — that's the one. You're <b className="hl-g">naming what you hear</b>.</>
          : tutReveal
            ? <>Not quite. Listen again and feel where it <b className="hl-t">lies</b> — it's the glowing number.</>
            : tutDrillPhase === "play"
              ? <>Understanding begins with <b className="hl-t">listening</b>. Listen deeply — feel where the note lies.</>
              : <>Now <b className="hl-g">name it</b> — which number does it feel like?</>);
    return (
      <div className={"app tutorial" + (tutCfg.sceneClass ? " " + tutCfg.sceneClass : "")}>
        <style>{CSS}</style>
        <style>{`
          .tut-glass-stage { flex-direction: column; align-items: center; gap: 8px; }
          .tut-cap { font: 12px var(--sans, Archivo, sans-serif); color: var(--text, #EDF2EE); opacity: .85; text-align: center; }
          .tut-wr { display: flex; gap: 8px; justify-content: center; }
          .tut-kin { gap: 26px; }
          .stack-note.hi { box-shadow: inset 0 0 0 2px var(--teal, #57C6C4); color: var(--teal, #57C6C4); }
          .stack-note.home { background: var(--teal, #57C6C4); color: #12201d; border-color: var(--teal, #57C6C4); }
          /* keep beat stacks + the chord drill inside the clipped stage panel on phones */
          .tutorial .stacks { gap: 12px; padding: 0; flex-wrap: nowrap; }
          .tutorial .stacks .stack { gap: 3px; padding: 0; }
          .tutorial .stacks .stack-note { width: 26px; height: 26px; font-size: .82rem; }
          .tutorial .stacks .stack-label { font-size: .9rem; padding-top: 4px; margin-top: 0; }
          .tutorial .tut-kin { gap: 22px; }
          .tutorial .chord-layout { gap: 12px; align-items: center; }
          .tutorial .chord-layout .session-stack .stack-note { width: 26px; height: 26px; font-size: .82rem; }
          .tutorial .chord-layout .chord-right { flex: 0 1 auto; }
          .tutorial .chord-layout .numpad { gap: 5px; }
          .tutorial .chord-layout .num { width: 34px; height: 34px; }
          /* annotation/buttons BESIDE the stack (row) so nothing overflows the panel bottom */
          .tutorial .tut-annote { flex-direction: row; align-items: center; gap: 16px; justify-content: center; }
          .tutorial .tut-annote .tut-wr { flex-direction: column; }
          .tut-note { display: flex; flex-direction: column; gap: 6px; max-width: 168px; text-align: left; }
          .tut-note-sp { font: 700 20px var(--pf, 'Courier New', monospace); letter-spacing: 3px; color: var(--text, #EDF2EE); }
          .tut-note-pt { font: 12px var(--sans, Archivo, sans-serif); color: var(--text, #EDF2EE); opacity: .88; line-height: 1.45; }
        `}</style>
        {isChords ? (
          <div className="tut-scene" aria-hidden="true">
            <div className="gcanopy" />
            <div className="gshaft s1" /><div className="gshaft s2" /><div className="gshaft s3" />
            <div className="gtree gt1" /><div className="gtree gt2" /><div className="gtree gt3" /><div className="gtree gt4" /><div className="gtree gt5" />
            <div className="gfloor" />
            <div className="gglint gg1" /><div className="gglint gg2" /><div className="gglint gg3" />
          </div>
        ) : isMinor ? (
          <div className="tut-scene" aria-hidden="true">
            <div className="moon" />
            <div className="hollow far" /><div className="hollow" />
            <div className="water" />
            <div className="mist m1" /><div className="mist m2" /><div className="mist m3" />
            <div className="bank" />
            <div className="reed r1" /><div className="reed r2" /><div className="reed r3" />
            <div className="wisp w1" /><div className="wisp w2" />
          </div>
        ) : (
          <div className="tut-scene" aria-hidden="true">
            <div className="sun" /><div className="cloud c1" /><div className="cloud c2" />
            <div className="hills far" /><div className="hills" />
            <div className="steps1" /><div className="steps2" /><div className="ground" />
            <div className="tuft t1" /><div className="tuft t2" /><div className="tuft t3" />
          </div>
        )}
        {tutCelebrate && <div className="fx-flash" aria-hidden="true" />}
        <Confetti show={tutCelebrate} />
        <div className="tut-inner">
          <div className="hud">
            <span className="loc"><b>✦</b> {tutCfg.loc}</span>
            {!done && <button className="skip" onClick={skipTutorial}>Skip ▸</button>}
          </div>
          <div className="stagepanel">
            <div className="stagetitle">{done ? (isChords ? "The Glasswood is yours" : isMinor ? "The fen is yours" : "The map is yours") : drill ? drillTitle : beat.title}</div>
            <div className="stage-fit">
              {done ? (isChords ? <div className="stacks"><GuideStack label="1" tones={TRI.I} onPlay={gsPlay} onNote={gsNote} /></div> : isMinor ? tutMapMinor : tutMap)
              : drill ? (isChords ? (
                <div className="chord-layout">
                  <SessionStack picked={tutPicks}
                    correct={(tutDrillPhase === "win" || tutReveal) ? tutChordTones : null}
                    wrong={tutReveal ? tutPicks.filter((d) => !tutChordTones.includes(d)) : null} label="?" />
                  <div className="chord-right">
                    <div className="numpad">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <button key={d}
                          className={"num" + (tutPicks.includes(d) ? " picked" : "") + (tutReveal && tutChordTones.includes(d) ? " coach-target" : "")}
                          onClick={() => toggleTutPick(d)}
                          disabled={tutDrillPhase !== "answer"}>
                          {d}<span className="num-sol">{SOLFEGE[d]}</span>
                        </button>
                      ))}
                    </div>
                    <button className="primary wide" onClick={checkTutChord}
                      disabled={tutDrillPhase !== "answer" || tutPicks.length !== tutChordTones.length || busy}>
                      Check answer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="numpad coach tut-drillpad">
                  {(isMinor ? [6, 7, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7]).map((d) => {
                    const pc = DEGREE_TO_PC[d];
                    const out = !tutCfg.pool.includes(pc);
                    return (
                      <button key={d}
                        className={"num" + (pc === tutCfg.homePc ? " tonic" : "") + (out ? " dim" : "") + (tutReveal && pc === tutDrillTarget ? " coach-target" : "") + (tutDrillPhase === "win" && pc === tutDrillTarget ? " just" : "")}
                        onClick={() => answerTutDrill(pc)}
                        disabled={tutDrillPhase !== "answer" || out}>
                        {d}<span className="num-sol">{SOLFEGE[d]}</span>
                      </button>
                    );
                  })}
                </div>
              )) : beat.stage}
            </div>
            {((done && !isChords) || (!drill && (beat.stage === tutMap || beat.stage === tutMapStair || beat.stage === tutTwelve || beat.stage === tutHalfStage || beat.stage === tutMapMinor || beat.stage === tutMapMinorStair || beat.stage === tutMapMinorHalf))) && <div className="tut-explore">↯ Tap the map — hear any note, explore freely</div>}
          </div>
          <div className="tut-mid">
            <div className="tut-midstack">
              {!done && (drill
                ? <button className="btn go tut-midhear" onClick={replayTutNote} disabled={tutDrillPhase === "play" || busy}>▶ Hear it again</button>
                : (beat.hear && <button className="btn go tut-midhear" onClick={beat.hear.act} disabled={busy}>{beat.hear.label}</button>))}
              {!drill && !done && beat.cue && (
                <div className="tut-seq">
                  <span className="tut-seq-label">In numbers</span>
                  <div className="tut-seq-nums">{beat.cue.split(" ").map((c, i) => <b key={i}>{c}</b>)}</div>
                </div>
              )}
            </div>
            <img className="verda" src={keeperSrc} alt={tutCfg.spriteAlt} />
            <div className="vshadow" />
          </div>
          {!done && (
            <div className="prog">
              {drill
                ? [0, 1, 2].map((i) => <span key={i} className={"pdot" + (i < tutDrillN ? " done" : i === tutDrillN ? " on" : "")} />)
                : beats.map((_, i) => <span key={i} className={"pdot" + (i < step ? " done" : i === step ? " on" : "")} />)}
              <span className="plabel">{drill ? `Drill ${tutDrillN + 1} of ${TUT_DRILLS}` : `Beat ${step + 1} of ${beats.length}`}</span>
            </div>
          )}
          <div className="dwrap">
            <span className="ntab">{tutCfg.nameTab}</span>
            <div className="dbox">{done
              ? (isChords
                  ? <>You heard every voice in the chord — <b className="hl-g">clear as glass</b>. The Glasswood is yours to wander now. <b className="hl-g">Walk</b> a chord when it blurs, <b className="hl-g">ring</b> it when you're sure — and remember, every chord you'll ever meet is only numbers, <b className="hl-t">standing close</b>.</>
                  : isMinor
                  ? <>You found <b className="hl-t">6</b> in the dark — that's the whole trick. Nothing down here ever moved; you just learned where <b className="hl-t">home</b> sleeps. Same seven numbers, same map, a darker porch light. And when the fen sounds sad to you now… smile. You know its secret.</>
                  : <>You did it — you just named notes by <b className="hl-g">ear</b>, the very skill most players are missing. The meadow is yours now: wander it, tap anything, and remember — everything is relative to <b className="hl-t">1</b>.</>)
              : drill ? (isChords ? chordDrillLine : drillLine) : beat.lines}</div>
          </div>
          {done ? (
            <div className="btnrow">
              <button className="btn next tut-grad" onClick={graduateTutorial}>{isChords ? "Into the Glasswood ▸" : isMinor ? "Into the fen ▸" : "Begin the journey ▸"}</button>
            </div>
          ) : !drill && (
            <div className="btnrow">
              <button className="btn ghost" disabled={step === 0} onClick={() => { sfx("back"); setTutStep((s) => Math.max(0, s - 1)); }}>◂ Back</button>
              {last
                ? <button className="btn next" onClick={enterTutDrills}>Begin →</button>
                : <button className="btn next" onClick={() => { sfx("move"); setTutStep((s) => Math.min(s + 1, beats.length - 1)); }}>Next →</button>}
            </div>
          )}
        </div>
        <div className="vig" /><div className="scan" /><div className="flicker" />
      </div>
    );
  }

  if (screen === "guide") {
    const pages = [
      // 1 — the problem
      <div key="p1" className="guide-page">
        <h3>Why music is simpler than you think</h3>
        <p className="guide-lead">Here's how most people learn to improvise:</p>
        <p>Learn some songs, memorize some chord shapes, drill some scale shapes… and then, somehow, you can play what you hear? There's a missing step, and everyone feels it.</p>
        <p className="guide-lead">What's actually missing:</p>
        <p><em>Why</em> certain sounds sound good, how to practice improvisation itself, and a personal connection to the sounds of music.</p>
        <p className="guide-lead">Don't scales help?</p>
        <p>They do — but scales and interval drills are not the core skill. Thousands of trained classical players can't play a simple nursery rhyme from memory without guessing, and plenty of jazz players sink in an unfamiliar key. So what is the core skill?</p>
      </div>,
      // 2 — music is relative
      <div key="p2" className="guide-page">
        <h3>Music is relative (it's all numbers, y'all)</h3>
        <p>Western music has only 12 notes, repeating forever in both directions — and at any given moment, a piece is mostly using just <em>7</em> of them. Most education overemphasizes absolute note names; numbers are the purest way to think about music for improvising.</p>
        <p>This is the <em>tonal map</em>. You might know it as the major scale. The dots are the notes in between — notice 3–4 and 7–1 sit right next to each other. Tap it. In any key, this map sounds the same.</p>
        <ExploreMap start={1} count={8} stage={0} octaves={1} world={null}
          active={litActive} onPlay={playExplore} />
      </div>,
      // 3 — the matrix
      <div key="p3" className="guide-page">
        <h3>The matrix of music</h3>
        <p>Almost every player who struggles to play what they hear is missing the same thing: an understanding of how everything in the key connects numerically. Above all, you should always know exactly <em>where you are</em> in the tonal octave.</p>
        <p>Every melody note has a number — relative to the <em>key</em>, not the chord. "Mary Had a Little Lamb" is:</p>
        <p className="guide-numbers">3 2 1 2 3 3 3 · 2 2 2 · 3 5 5</p>
        <button className="primary" onClick={() => playPhrase([3, 2, 1, 2, 3, 3, 3, 2, 2, 2, 3, 5, 5])} disabled={busy}>
          ♪ Hear it in numbers
        </button>
        <DegreeLadder active={litActive} correct={[]} wrong={[]} />
        <p>This matrix applies to every single piece of music you hear, at all times.</p>
      </div>,
      // 4 — chords live in the map
      <div key="p4" className="guide-page">
        <h3>Every note of every chord</h3>
        <p>Chords aren't separate objects — they're stacks of degrees from the same map. Here's a 2–5–1 in stack notation: circled numbers are the chord's tones, always named relative to the key.</p>
        <div className="stacks">
          <GuideStack label="2-" world={2} />
          <GuideStack label="5D" world={5} />
          <GuideStack label="1" world={1} />
        </div>
        <button className="primary" onClick={playTwoFiveOne} disabled={busy}>♪ Hear the 2–5–1</button>
        <p>Once you see music this way, everything you play becomes ear training — because the sounds of the map don't change. Note 1 to 3 is always note 1 to 3. You can even train without an instrument.</p>
      </div>,
      // 5 — what doors this opens
      <div key="p5" className="guide-page">
        <h3>What doors does this lens open?</h3>
        <p><em>Find the key of any song from one note.</em> Every note is somewhere in the key — the question is always "where am I in the key," never "what key are we in."</p>
        <p><em>Play anything you can sing.</em> Translate it into numbers, and you can play it in any key, on any instrument you know.</p>
        <p><em>Jam without asking the chords.</em> You just listen, and you know where everything lies in the tonal octave.</p>
        <p>The recap: only 12 notes (7, really). Music is relative — it's all numbers. Everything should be ear training. And you should know exactly where you are in the tonal octave, at all times. That's what this whole app trains.</p>
      </div>,
    ];
    return (
      <div className="app">
        <style>{CSS}</style>
        <header className="top-slim">
          <button className="back" onClick={() => { killSession(); setBusy(false); setScreen(auxReturn || (boringMode ? "home" : "menu")); }}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
          <h2 className="screen-title">How music works</h2>
        </header>
        <section className="panel">{pages[guidePage]}</section>
        <div className="pager">
          <button className="ghost" disabled={guidePage === 0} onClick={() => setGuidePage((p) => p - 1)}>← Back</button>
          <div className="dots">
            {pages.map((_, i) => <span key={i} className={"dot" + (i === guidePage ? " on" : "")} />)}
          </div>
          {guidePage < pages.length - 1
            ? <button className="primary" onClick={() => setGuidePage((p) => p + 1)}>Next →</button>
            : <button className="primary" onClick={() => startSession("melody", 0)}>Start training →</button>}
        </div>
      </div>
    );
  }

  // free explore screen
  const stageLabels = ["Numbers on", "Blank pads"];
  // Paths: the degrees of the chord currently sounding in the loop — lit up on the tonal map
  const pathCurTones = fpTab === "paths" && pathPlaying && pathIdx >= 0 && pathProg[pathIdx]
    ? chordTones(chordByRoman(pathProg[pathIdx]), pathSevenths) : [];
  const curPreset = PATH_PRESETS.findIndex((p) => p.join() === pathProg.join()); // -1 = custom/built
  return (
    <div className={"app app-wide fp-" + fpTab + (fpOptionsOpen ? " fp-opts-open" : "")}>
      <style>{CSS}</style>
      <header className="top-slim">
        <button className="back" onClick={() => { setDroneOn(false); stopPath(); killSession(); setBusy(false); setScreen(auxReturn || (boringMode ? "home" : "menu")); }}>{auxReturn === "adventure" ? "← Map" : boringMode ? "← Home" : "← Menu"}</button>
        <h2 className="screen-title">Free play</h2>
        {typeof window !== "undefined" && window.CODA_MEDITATE && (
          <img className="fp-coda" src={window.CODA_MEDITATE} alt="Coda, meditating" aria-hidden="true" />
        )}
        {/* landscape focus mode only (hidden in portrait via CSS): reveal/hide the tucked-away controls */}
        <button className="fp-opts-btn gear" onClick={() => setFpOptionsOpen((o) => !o)} aria-label={fpOptionsOpen ? "Hide options" : "Show options"} aria-pressed={fpOptionsOpen}>{fpOptionsOpen ? "✕" : "⚙"}</button>
      </header>
      {keyRow}
      <div className="tabs">
        <button className={"tab" + (fpTab === "notes" ? " on" : "")} onClick={() => setFpTab("notes")}>7 worlds</button>
        <button className={"tab" + (fpTab === "paths" ? " on" : "")} onClick={() => { setDroneOn(false); setFpTab("paths"); }}>Paths</button>
      </div>
      {fpTab === "paths" ? (
        <>
        <div className="fp-stage">
        <div className="fp-side">
          <div className="explore-controls">
            <button className="primary" onClick={() => (pathPlaying ? stopPath() : startPath())} disabled={!pathProg.length}>
              {pathPlaying ? "■ Stop" : "▶ Play loop"}
            </button>
            {/* the preset progressions, collapsed into one dropdown to save space */}
            <label className="key-label">
              Loop
              <select value={curPreset} onChange={(e) => { const i = Number(e.target.value); e.target.blur(); if (i < 0) return; if (gated && i >= FREE.freePlayPaths) { openUpsell(); return; } setProg(PATH_PRESETS[i]); }}>
                {curPreset < 0 && <option value={-1}>Custom</option>}
                {PATH_PRESETS.map((p, i) => <option key={i} value={i} disabled={gated && i >= FREE.freePlayPaths}>{p.map((r) => chordNumber(r, false)).join(" ")}{gated && i >= FREE.freePlayPaths ? " 🔒" : ""}</option>)}
              </select>
            </label>
            <button className={"ghost voice" + (pathSevenths ? " on" : "")}
              onClick={() => { stopPath(); setPathSevenths((v) => !v); }}>
              {pathSevenths ? "7ths on" : "7ths"}
            </button>
            <button className={"ghost voice" + (pathDrums ? " on" : "")} onClick={toggleDrums}>
              {pathDrums ? "Drums on" : "Drums"}
            </button>
            {/* landscape bar: Voice on/off for the sung numbers over the loop */}
            <button className={"ghost voice fp-voice-bar" + (pathVoice ? " on" : "")}
              onClick={() => setPathVoice((v) => !v)} aria-pressed={pathVoice}>
              {pathVoice ? "Voice on" : "Voice off"}
            </button>
            <button className={"ghost fp-path-secondary" + (pathBuild ? " voice on" : "")} onClick={() => gated ? openUpsell() : setPathBuild((b) => !b)}>
              {pathBuild ? "Done" : "Build"}{gated && " 🔒"}
            </button>
            <label className="key-label fp-path-secondary">
              Tempo
              <select value={pathBeat} onChange={(e) => { setTempo(Number(e.target.value)); e.target.blur(); }}>
                {PATH_SPEEDS.map((s) => <option key={s.label} value={s.beat}>{s.label}</option>)}
              </select>
            </label>
            {pathCount > 0 && <span className="path-count">{pathCount}</span>}
          </div>
          {/* the chord names of the loop; the one currently sounding is highlighted */}
          <div className="path-chords fp-pathchords">
            {pathProg.map((r, i) => (
              <span key={i} className={"pc" + (pathIdx === i ? " cur" : "")}>{chordNumber(r, false)}</span>
            ))}
          </div>
          {pathBuild && (
            <div className="path-build fp-path-secondary">
              <div className="numpad chordpad">
                {ALL_CHORDS.map((r) => (
                  <button key={r} className="num chordbtn"
                    onClick={() => {
                      playChord(musicKey, chordTones(chordByRoman(r), pathSevenths), 0, false);
                      if (pathProg.length < 8) setProg([...pathProg, r]);
                    }}>
                    {r}<span className="num-sol">{chordNumber(r, false)}</span>
                  </button>
                ))}
              </div>
              <div className="prog-actions">
                <button className="ghost" onClick={() => setProg(pathProg.slice(0, -1))} disabled={!pathProg.length}>⌫ Undo</button>
                <button className="ghost" onClick={() => setProg([])} disabled={!pathProg.length}>Clear</button>
              </div>
            </div>
          )}
        </div>
        <div className="fp-main">
          {/* landscape: the big tonal map — the current chord's tones light up as it plays */}
          <div className="fp-paths-map">
            <ExploreMap start={1} count={7} stage={0} octaves={1} world={null}
              litDeg={pathCurTones} active={litActive} onDown={exploreDown} onUp={exploreUp} />
          </div>
          {/* portrait: the per-chord solo columns */}
          <div className="path-grid">
            {pathProg.map((r, col) => (
              <PathColumn key={col} roman={r} col={col} current={pathIdx === col} lit={litPath} onDown={pathDown} onUp={pathUp} sevenths={pathSevenths} />
            ))}
          </div>
        </div>
        </div>
          <p className="hint center fp-help">Solo over the changes — the circled notes are the chord tones of the chord. Try landing on them, and also hear what the non-chord tones sound like. <em>Try the number keys on a keyboard, or turn to landscape on mobile.</em></p>
        </>
      ) : (
      <>
      {/* fp-stage/fp-side = display:contents in portrait (no change); two-column in phone-landscape (controls+tuner sidebar | wide map) */}
      <div className="fp-stage">
      <div className="fp-side">
      <div className="explore-controls fp-selects">
        <label className="key-label fp-starton">
          Start on
          <select value={exStart} onChange={(e) => { setExStart(Number(e.target.value)); e.target.blur(); }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="key-label">
          Notes
          <select value={exCount} onChange={(e) => { setExCount(Number(e.target.value)); e.target.blur(); }}>
            {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="key-label">
          <select value={exWorld} onChange={(e) => {
              const w = Number(e.target.value);
              if (gated && w > FREE.freePlayWorlds) { openUpsell(); e.target.value = String(exWorld); e.target.blur(); return; }
              setExWorld(w); setExStart(w); e.target.blur();
            }}>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => <option key={w} value={w}>World {w}{gated && w > FREE.freePlayWorlds ? " 🔒" : ""}</option>)}
          </select>
        </label>
      </div>
      <div className="explore-controls">
        <button className={"ghost fp-numbers-toggle" + (exStage > 0 ? " voice on" : "")}
          onClick={() => setExStage((s) => (s + 1) % 2)}>
          {stageLabels[exStage]}
        </button>
        <button className={"ghost voice" + (droneOn ? " on" : "")}
          onClick={() => setDroneOn(!droneOn)} aria-pressed={droneOn}>
          {droneOn ? "Drone " + exWorld + " on" : "Drone"}
        </button>
        {droneOn && (
          <label className="key-label drone-vol">
            🔊
            <input type="range" min="-30" max="12" step="1" value={droneVol}
              onChange={(e) => setDroneVol(Number(e.target.value))}
              aria-label="Drone volume" />
          </label>
        )}
        {exView === "map" && (
          <button className={"ghost voice" + (exOctaves === 2 ? " on" : "")}
            onClick={() => setExOctaves(exOctaves === 2 ? 1 : 2)}>
            + Octave
          </button>
        )}
        <button className="ghost" onClick={() => setExView(exView === "map" ? "piano" : "map")}>
          {exView === "map" ? "Piano view" : "Map view"}
        </button>
        {/* landscape bar only: a Voice on/off toggle (replaces Sing here; Sing moves behind ⚙) */}
        <button className={"ghost voice fp-voice-bar" + (voiceOn ? " on" : "")}
          onClick={() => setVoiceOn((v) => !v)} aria-pressed={voiceOn}>
          {voiceOn ? "Voice on" : "Voice off"}
        </button>
        <button className={"ghost voice fp-sing" + (micOn ? " on" : "")}
          onClick={toggleMic} aria-pressed={micOn}>
          {micOn ? "🎤 Sing on" : "🎤 Sing"}
        </button>
      </div>
      {(micOn || micReq || micErr) && (() => {
        // Coaching copy + where the number sits on the track (flat drifts left,
        // sharp drifts right; clamp to ±50¢ so wild misses don't fly off-screen).
        const heard = singLevel > 0.03;
        let coach, state;
        if (micErr) { coach = "Mic's off — tap 🎤 Sing and choose Allow."; state = "off"; }
        else if (micReq) { coach = "Asking for mic access — tap Allow…"; state = "idle"; }
        else if (singDeg == null) { coach = heard ? "Almost — hold one steady note" : "Listening… sing a number"; state = "idle"; }
        else if (singInTune) { coach = `Nice — right on ${singDeg}`; state = "in"; }
        else if (singCents < 0) { coach = "A bit under — lift it up a hair"; state = "off"; }
        else { coach = "A bit high — try relaxing into it"; state = "off"; }
        const offset = Math.max(-50, Math.min(50, singCents)) / 50 * 42; // −42%..+42% from center
        return (
          <div className="sing-panel">
            <div className={"sing-track " + state}>
              <span className="sing-end flat">flat ◄</span>
              <span className="sing-end sharp">► sharp</span>
              <div className="sing-zone" />
              <div className="sing-center" />
              {singDeg != null && !micReq && (
                <div className="sing-marker" style={{ left: `${50 + offset}%` }}>
                  {singDeg === 1 ? <><span className="tonic-star">★</span>1</> : singDeg}
                </div>
              )}
            </div>
            <div className="sing-level"><div className="sing-level-fill" style={{ width: `${Math.round(singLevel * 100)}%` }} /></div>
            <p className="sing-coach">{coach}</p>
            <p className="sing-privacy">🔒 The mic is only used on your device to hear your pitch — nothing is recorded, saved, or sent anywhere.</p>
          </div>
        );
      })()}
      </div>
      <div className="fp-main">
      {exView === "map"
        ? <ExploreMap start={exStart} count={exCount} stage={exStage}
            octaves={exOctaves} world={exWorld} singDeg={micOn ? singDeg : null} singInTune={singInTune}
            active={litActive} onDown={exploreDown} onUp={exploreUp} />
        : <PianoMap start={exStart} count={exCount} stage={exStage}
            world={exWorld} musicKey={musicKey} singDeg={micOn ? singDeg : null} singInTune={singInTune}
            active={litActive} onDown={pianoDown} onUp={pianoUp} />}
      </div>
      </div>
      <p className="hint center fp-help">
        {exStage === 0
          ? `World ${exWorld}: the blue pads are its chord tones (${worldChordTones(exWorld).join("·")}). Drone on, sing the numbers.`
          : "Numbers hidden. Sing each number as you press its pad."}
        {" "}<em>Try the number keys on a keyboard, or turn to landscape on mobile.</em>
      </p>
      </>
      )}
      {upsellModal}
    </div>
  );
}

/* ─────────────────────────────  STYLES  ───────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&display=swap');

:root {
  --bg: #383D3B;
  --card: #424845;
  --line: #565D59;
  --text: #EDF2EE;
  --text-soft: #A9B3AC;
  --green: #6ABF5E;
  --blue: #7CADD1;
  --teal: #57C6C4;
  --wrong: #E07856;
  --wrong-text: #F59A72; /* brighter orange for NORMAL-size miss/error text — ~4.6:1 on --bg (AA); --wrong stays for fills */
  --alt: #2B302D;
}
:root[data-theme="light"] {
  --bg: #F1F5F1;
  --card: #FFFFFF;
  --line: #D2DBD4;
  --text: #23302A;
  --text-soft: #63706A;
  --green: #4EA943;
  --blue: #4E86AE;
  --teal: #2FA6A4;
  --wrong: #D0603F;
  --wrong-text: #B8442A; /* darker orange for normal-size miss/error text on the light --bg (AA) */
  --alt: #E4EAE5;
}
html, body { background: var(--bg); }
* { box-sizing: border-box; }
.app {
  min-height: 100vh; min-height: 100dvh; background: var(--bg); color: var(--text);
  font-family: 'Archivo', system-ui, sans-serif;
  max-width: 560px; margin: 0 auto;
  /* pad for the iOS status bar / notch when launched from the home screen */
  padding:
    calc(20px + env(safe-area-inset-top, 0px))
    calc(16px + env(safe-area-inset-right, 0px))
    calc(32px + env(safe-area-inset-bottom, 0px))
    calc(16px + env(safe-area-inset-left, 0px));
  display: flex; flex-direction: column; gap: 16px;
  /* app-like touch: no text selection, callout, or tap flash on hold */
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
}
/* Minor-key drills wear a full deep-blue / navy "immersion" theme. Overriding these
   palette vars on the session root recolors the buttons, pads, tonic star, the
   correct-answer flash AND the background in one place — and in BOTH skins, since
   they all read var(--…). Only --wrong stays orange so a miss still reads as a miss. */
.app.sess-minor {
  --bg: #222839; --card: #2C334A; --line: #3B456A;
  --green: #4F8FEF;   /* GO / submit / correct-flash → confident azure */
  --teal: #7E86E8;    /* tonic star → indigo */
  --blue: #6E9AC4;    /* note selection → steel blue */
}
.app.sess-minor .primary { color: #EAF1FB; text-shadow: none; } /* light text on the blue GO */
/* Landscape reflow wrappers: transparent (display:contents) in portrait so layout is
   pixel-identical to before; they only become flex rows inside the phone-landscape
   media query at the bottom of this stylesheet. */
.drill-stage, .prog-right, .fp-stage, .fp-side { display: contents; }
.fp-opts-btn { display: none; } /* the landscape focus-mode ⚙ — shown only in the landscape media query */
.ghost.fp-voice-bar { display: none; } /* landscape-bar voice toggle — hidden in portrait (specific enough to beat .ghost's display) */
button { touch-action: manipulation; }
.path-note, .explore-pad, .pk, .num, .cu-note, .chip, .rung { touch-action: none; }
/* installed web app: guarantee a top buffer that clears the iOS status bar,
   even where env(safe-area-inset-top) reports 0 */
:root[data-standalone] .app {
  padding-top: max(64px, calc(20px + env(safe-area-inset-top, 0px)));
}
.top { display: flex; flex-direction: column; gap: 12px; }
.top-slim { display: flex; align-items: center; gap: 12px; }
.screen-title {
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.15rem;
  margin: 0; flex: 1;
}
.session-score { color: var(--green); font-weight: 700; font-size: 0.95rem; }
.back {
  background: transparent; border: 1.5px solid var(--line); color: var(--text-soft);
  border-radius: 10px; padding: 7px 14px; font-size: 0.85rem; min-height: 44px;
}
.brand h1 {
  font-family: 'Archivo Black', 'Archivo', sans-serif; font-weight: 400;
  font-size: 2.1rem; margin: 0; letter-spacing: 0.01em; line-height: 1;
}
.brand .w1 { color: var(--green); }
.brand .w2 { color: var(--blue); }
.brand-line { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.wejam-logo { display: block; height: 46px; width: auto; }
.brand p { margin: 6px 0 0; color: var(--text-soft); font-size: 0.95rem; }
.key-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.fp-coda { height: 42px; width: auto; image-rendering: pixelated; align-self: center; margin-left: 6px; opacity: 0.92; }
/* keep Coda snug beside the "Free play" title (don't let the title's flex:1 push it away).
   Scoped via :has to the Free Play header only, so the drill header's score alignment is untouched. */
.top-slim:has(.fp-coda) .screen-title { flex: 0 0 auto; }
.key-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-soft); }
.drone-vol { gap: 8px; }
.drone-vol input[type="range"] {
  -webkit-appearance: none; appearance: none; width: 96px; height: 5px;
  border-radius: 99px; background: var(--line); outline: none; cursor: pointer;
}
.drone-vol input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 16px; height: 16px;
  border-radius: 50%; background: var(--teal); border: none; cursor: pointer;
}
.drone-vol input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; background: var(--teal); border: none; cursor: pointer;
}
select {
  font-family: inherit; font-size: 0.95rem; color: var(--text);
  background: var(--card); border: 1.5px solid var(--line); border-radius: 10px;
  padding: 8px 10px;
}
button { font-family: inherit; cursor: pointer; transition: transform 0.06s, background 0.15s, border-color 0.15s, color 0.15s; }
button:active { transform: scale(0.97); }
button:disabled { opacity: 0.4; cursor: default; }
button:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }
.ghost {
  background: transparent; color: var(--text); border: 1.5px solid var(--line);
  border-radius: 10px; padding: 8px 14px; font-size: 0.9rem; font-weight: 500;
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
}
.ghost.voice.on { border-color: var(--teal); color: var(--teal); }
.primary {
  background: var(--green); color: #23302A; border: none;
  border-radius: 10px; padding: 10px 18px; font-size: 0.95rem; font-weight: 700;
}
.primary.wide { width: 100%; margin-top: 14px; padding: 13px; }
/* VSL/offer CTAs are real <a> anchors — strip the link look and box them like buttons */
.offer-link { text-decoration: none; cursor: pointer; }
.primary.offer-link { display: inline-block; text-align: center; }

/* home cards */
.cards { display: flex; flex-direction: column; gap: 12px; }
.card {
  text-align: left; background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 18px 16px; display: flex; flex-direction: column; gap: 5px;
  color: var(--text);
}
.card:hover { border-color: var(--blue); }
.card-title { font-family: 'Archivo Black', sans-serif; font-size: 1.15rem; }
.card-desc { color: var(--text-soft); font-size: 0.9rem; line-height: 1.45; }
.card-progress { color: var(--green); font-size: 0.8rem; font-weight: 600; margin-top: 3px; }
.card.quiet .card-title { color: var(--teal); }

/* level list */
.levels { display: flex; flex-direction: column; gap: 10px; }
.stage-intro {
  background: var(--card); border: 1.5px solid var(--line); border-left: 3px solid var(--teal);
  border-radius: 12px; padding: 12px 14px; margin: 0 0 14px;
}
.stage-goal { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--text); }
.stage-meta { display: block; margin-top: 7px; font-size: 0.72rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.06em; }
.level {
  display: flex; align-items: center; gap: 14px; text-align: left;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 14px;
  padding: 14px 16px; color: var(--text);
}
.level:hover:not(:disabled) { border-color: var(--green); }
.level.locked { opacity: 0.45; }
.level-num {
  font-family: 'Archivo Black', sans-serif; font-size: 1.3rem; color: var(--blue);
  min-width: 1.4em; text-align: center;
}
.level-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.level-name { font-weight: 700; }
.level-desc { color: var(--text-soft); font-size: 0.85rem; }
.level-state { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 3em; }
.level-pct { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text-soft); }
.level-pct.pass { color: var(--green); }
.level-check { color: var(--green); font-size: 0.95rem; line-height: 1; }
.level-stars { display: flex; gap: 1px; }
.lvl-star { font-size: 0.72rem; color: var(--line); line-height: 1; }
.lvl-star.on { color: #D9B45B; }
.star { color: #D9B45B; }
.shop-balance { text-align: center; font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: #D9B45B; }
.shop-balance em { font-style: normal; font-size: 0.8rem; color: var(--text-soft); font-family: 'Archivo', sans-serif; margin-left: 4px; }
.shop-grid { display: flex; flex-direction: column; gap: 10px; }
.shop-item { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.shop-item.equipped { border-color: var(--teal); }
.shop-swatch { width: 46px; height: 50px; border-radius: 8px; flex: 0 0 auto; background: rgba(0,0,0,.22); box-shadow: inset 0 0 0 2px rgba(255,255,255,.18); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
.shop-swatch img { width: 100%; height: 100%; object-fit: contain; }
.shop-info { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
.shop-name { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; }
.shop-desc { font-size: 0.8rem; color: var(--text-soft); }
.shop-item .primary, .shop-item .ghost { flex: 0 0 auto; padding: 10px 14px; }

/* session */
.progressbar {
  height: 8px; background: var(--card); border-radius: 99px; overflow: hidden;
  border: 1px solid var(--line);
}
.progressbar .fill { height: 100%; background: var(--green); border-radius: 99px; transition: width 0.4s ease; }
.qcount { margin: -6px 0 0; font-size: 0.8rem; color: var(--text-soft); text-align: center; }

/* ── the signature: proportional tonal map ── */
.ladder {
  display: grid; grid-template-columns: repeat(13, 1fr); gap: 2px;
  background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 14px 8px;
  align-items: center;
}
.rung {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 0; border-radius: 10px; position: relative;
  transition: background 0.25s, box-shadow 0.25s, opacity 0.25s;
}
.rung-num {
  font-family: 'Archivo Black', sans-serif; font-weight: 400;
  font-size: 1.1rem; line-height: 1; color: var(--text);
}
.gap-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-soft); opacity: 0.5;
  justify-self: center; align-self: center;
}
.rung.dim { opacity: 0.22; }
.ladder.explore { padding: 16px 10px; }
/* Staircase mode: each number lifts to its pitch height and cascades up like stairs. */
.ladder.explore.staircase { align-items: end; padding-top: 104px; }
.ladder.explore.staircase .explore-pad { min-height: 40px; }
.ladder.explore.staircase .rung.stair {
  animation: tut-stair 0.55s cubic-bezier(0.34, 1.3, 0.5, 1) both;
  animation-delay: var(--delay);
}
@keyframes tut-stair {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(calc(var(--rise) * -8.5px)); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ladder.explore.staircase .rung.stair { animation: none; opacity: 1; transform: translateY(calc(var(--rise) * -8.5px)); }
}
.explore-pad {
  border: 1.5px solid var(--line); background: var(--bg);
  min-height: 74px; justify-content: center; cursor: pointer;
}
.explore-pad .rung-num { font-size: clamp(1.15rem, 5.5vw, 1.5rem); }
.explore-pad.tonic { border-color: var(--teal); }
.explore-pad.blank .rung-num { visibility: hidden; }
.explore-pad.chordal { border-color: var(--blue); }
.explore-pad.chordal .rung-num { color: var(--blue); }
.explore-pad.world-root { border-width: 2.5px; }
.explore-pad.tonic { box-shadow: inset 0 0 0 0; }
.explore-pad.active { background: var(--green); border-color: var(--green); }
.explore-pad.active .rung-num { color: #23302A; }
/* Paths: the chord currently sounding in the loop lights its tones on the tonal map */
.explore-pad.chord-lit { background: var(--blue); border-color: var(--blue);
  box-shadow: 0 0 0 2px var(--blue), 0 0 18px 3px rgba(124,173,209,0.5); }
.explore-pad.chord-lit .rung-num, .explore-pad.chord-lit .rung-sol { color: #16222b; }
/* Paths: strip of the loop's chord names, current one highlighted (landscape-only) */
.path-chords { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; align-items: center; }
.path-chords .pc { font-family: 'Archivo Black', sans-serif; font-size: 0.9rem; color: var(--text-soft);
  padding: 3px 10px; border-radius: 8px; border: 1.5px solid var(--line); }
.path-chords .pc.cur { color: #16222b; background: var(--blue); border-color: var(--blue); }
.fp-pathchords { display: none; }  /* shown only in landscape */
.fp-paths-map { display: none; }   /* shown only in landscape */
.explore-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* piano view */
.piano {
  position: relative; height: 190px;
  background: #232725; border: 1.5px solid var(--line); border-radius: 12px;
  overflow: hidden;
}
.pk { position: absolute; top: 0; padding: 0; display: flex; align-items: flex-end; justify-content: center; }
.pk.white {
  height: 100%; background: #EDF2EE; border: 1px solid #232725;
  border-radius: 0 0 6px 6px; z-index: 1;
}
.pk.black {
  height: 60%; background: #1A1D1B; border: 1px solid #000;
  border-radius: 0 0 5px 5px; z-index: 2;
}
.pk.white.active { background: var(--green); }
.pk.black.active { background: var(--green); }

/* Sing tuner: a live ring on the pad matching the number you're singing —
   green when you're in tune, orange when you're sharp/flat. Rides on top of
   tap highlights (a pad can be both tapped and sung at once). */
.explore-pad.singing, .pk.singing { position: relative; }
.explore-pad.singing.in { box-shadow: 0 0 0 3px var(--green), 0 0 14px 1px var(--green); }
.explore-pad.singing.off { box-shadow: 0 0 0 3px var(--wrong), 0 0 12px 1px var(--wrong); }
.pk.singing.in { box-shadow: inset 0 0 0 3px var(--green); }
.pk.singing.off { box-shadow: inset 0 0 0 3px var(--wrong); }
@media (prefers-reduced-motion: no-preference) {
  .explore-pad.singing.in, .pk.singing.in { animation: singPulse 0.9s ease-in-out infinite; }
}
@keyframes singPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }

/* Sing tuner panel: the number rides a horizontal track — drifts left when
   you're flat, right when you're sharp, sits over the center line in tune. */
.sing-panel { display: flex; flex-direction: column; gap: 8px; }
.sing-track {
  position: relative; height: 78px; border-radius: 12px;
  background: var(--card); border: 1.5px solid var(--line);
  transition: border-color 0.15s ease; overflow: hidden;
}
.sing-track.in { border-color: var(--green); }
.sing-track.off { border-color: var(--wrong); }
/* the forgiving in-tune band around center (±25¢ maps to ±21% of the track) */
.sing-zone {
  position: absolute; top: 0; bottom: 0; left: 29%; right: 29%;
  background: color-mix(in srgb, var(--green) 14%, transparent);
}
.sing-center { position: absolute; top: 10px; bottom: 10px; left: 50%; width: 2px; margin-left: -1px; background: var(--green); opacity: 0.5; }
.sing-end {
  position: absolute; top: 6px; font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.05em; color: var(--text-soft); text-transform: uppercase;
}
.sing-end.flat { left: 10px; }
.sing-end.sharp { right: 10px; }
.sing-marker {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  min-width: 46px; height: 46px; padding: 0 6px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Archivo Black', sans-serif; font-size: 1.7rem; line-height: 1;
  border-radius: 12px; background: var(--alt); color: var(--text);
  box-shadow: 0 0 0 2px var(--line);
  transition: left 0.09s linear, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.sing-track.in .sing-marker { background: var(--green); color: #23302A; box-shadow: 0 0 0 2px var(--green), 0 0 16px 1px var(--green); }
.sing-track.off .sing-marker { box-shadow: 0 0 0 2px var(--wrong); color: var(--wrong); }
.sing-level { height: 5px; border-radius: 99px; background: var(--alt); overflow: hidden; }
.sing-level-fill { height: 100%; background: var(--teal); border-radius: 99px; transition: width 0.08s linear; }
.sing-coach { text-align: center; margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-soft); min-height: 1.2em; }
.sing-privacy { text-align: center; margin: 0; font-size: 0.72rem; line-height: 1.4; color: var(--text-soft); opacity: 0.8; }
.sing-err { color: var(--wrong-text); }
.pk-label {
  font-family: 'Archivo Black', sans-serif; font-size: 1.05rem; color: #23302A;
  margin-bottom: 10px; position: relative;
}
.pk.black .pk-label { color: var(--text); font-size: 0.9rem; margin-bottom: 8px; }
.pk-label.chordal { color: #2F5E86; }
.pk.black .pk-label.chordal { color: var(--blue); }
.pk-label.tonic { color: #0F7B79; }
.pk.black .pk-label.tonic { color: var(--teal); }
.pk-label.world-root { text-decoration: underline; text-underline-offset: 3px; }
.pk-star { position: absolute; top: -0.7em; right: -0.8em; font-size: 0.55em; color: var(--green); }
.tonic-star { color: var(--green); }
.rung.tonic { box-shadow: inset 0 0 0 1.5px var(--teal); }
.rung.tonic .rung-num { color: var(--teal); }
.rung.tonic::before {
  content: "★"; position: absolute; top: 1px; right: 2px;
  font-size: 0.5rem; color: var(--green); line-height: 1;
}
.rung.active, .rung.correct {
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(106,191,94,0.25), 0 0 18px rgba(106,191,94,0.45);
}
.rung.active .rung-num, .rung.correct .rung-num { color: #23302A; }
.rung.active::before, .rung.correct::before { color: #23302A; }
.rung.selected { background: var(--blue); }
.rung.selected .rung-num { color: #232E36; }
.rung.wrong { background: var(--wrong); }
.rung.wrong .rung-num { color: #3A241B; }
@media (prefers-reduced-motion: no-preference) {
  .rung.correct { animation: pulse 0.5s ease-out; }
  @keyframes pulse { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
}

.panel {
  background: var(--card); border: 1.5px solid var(--line);
  border-radius: 16px; padding: 18px 16px;
}
.hint { margin: 0 0 14px; font-size: 0.92rem; color: var(--text-soft); line-height: 1.5; }
.hint.center { text-align: center; margin: 0; }
.hint.grow { flex: 1; margin: 0; min-height: 2.7em; }
.hint em { color: var(--text); font-style: normal; font-weight: 600; }
.hint strong { color: var(--teal); font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.05rem; }
.quiz-bar { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
.replay-group { display: flex; flex-shrink: 0; }
.replay-group .ghost { border-radius: 10px 0 0 10px; border-right-width: 0.75px; }
.replay-group .ghost.note { border-radius: 0 10px 10px 0; border-left-width: 0.75px; padding-left: 12px; padding-right: 12px; font-size: 1.05rem; }

.numpad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.num {
  aspect-ratio: 1; min-height: 58px; position: relative;
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.5rem;
  background: var(--card); color: var(--text); /* --card (not --bg) so the pad reads as a control vs the page (WCAG 1.4.11) */
  border: 1.5px solid var(--line); border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
}
/* colorblind-safe corner mark: ✓ on the pad you nailed, ✕ on a wrong tap — a SHAPE
   cue so correct/wrong don't rely on green-vs-orange alone. Inset past the retro
   4px corner notch so the clip-path never eats it. */
.num-mark { position: absolute; top: 5px; right: 7px; font-family: 'Archivo', sans-serif;
  font-weight: 800; font-size: 0.72rem; line-height: 1; color: inherit; opacity: .95; pointer-events: none; }
/* the pressed pad on a wrong answer — previously nothing lit here, only the ladder */
.num.wrong { background: var(--wrong); color: #3A241B; border-color: var(--wrong); }
.num.wrong .num-sol { color: #3A241B; }
.num-sol {
  font-family: 'Archivo', sans-serif; font-weight: 500; font-size: 0.62rem;
  color: var(--text-soft); letter-spacing: 0.05em;
}
.rung-sol {
  font-family: 'Archivo', sans-serif; font-weight: 500; font-size: 0.6rem;
  color: var(--text-soft); letter-spacing: 0.05em; margin-top: 2px;
}
.rung.active .rung-sol, .explore-pad.active .rung-sol { color: #23302A; }
.num.tonic { border-color: var(--teal); color: var(--teal); }
.num.picked { background: var(--blue); color: #232E36; border-color: var(--blue); }
.num.dim { opacity: 0.38; }
.num.picked.tonic { background: var(--teal); color: #1E3230; border-color: var(--teal); }
/* per-question reward: the pad the player just answered correctly */
.num.just { background: var(--green); color: #20301D; border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(106,191,94,0.4), 0 0 18px 2px rgba(106,191,94,0.5); }
.num.just .num-sol { color: #20301D; }
@media (prefers-reduced-motion: no-preference) {
  .num.just { animation: numhit 0.45s cubic-bezier(0.2,1.6,0.35,1); }
  @keyframes numhit { 0% { transform: scale(1); } 35% { transform: scale(1.14); } 100% { transform: scale(1); } }
}

/* chromatic answer pad: 12 notes in two rows, altered ones tinted darker */
.numpad.chromatic { grid-template-columns: repeat(6, 1fr); gap: 8px; }
.num.chrom { aspect-ratio: auto; min-height: 52px; font-size: 1.2rem; padding: 10px 0; }
.num.chrom.alt { background: var(--alt); color: var(--text-soft); }
.num.chrom.tonic { border-color: var(--teal); color: var(--teal); }
.num.chrom.tonic.alt { color: var(--teal); }

/* altered positions on the tonal map when chromatics are shown */
.alt-rung { padding: 7px 0; }
.rung-num.alt { font-size: 0.72rem; color: var(--text-soft); }
.rung.active .rung-num.alt, .rung.correct .rung-num.alt, .rung.wrong .rung-num.alt { color: #23302A; }

/* FET-style pill tags on melody level cards */
.level-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
.tag {
  font-size: 0.72rem; color: var(--text-soft);
  background: var(--bg); border: 1px solid var(--line); border-radius: 999px;
  padding: 2px 9px; white-space: nowrap;
}

/* per-level progress squares */
.squares { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 7px; }
.sq { width: 9px; height: 9px; border-radius: 2px; background: var(--line); }
.sq.on { background: var(--green); }

/* Stages / Custom tabs */
.tabs { display: flex; gap: 6px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 4px; }
.tab {
  flex: 1; background: transparent; border: none; color: var(--text-soft);
  border-radius: 9px; padding: 9px; font-size: 0.9rem; font-weight: 600; min-height: 44px;
}
.tab.on { background: var(--bg); color: var(--text); box-shadow: inset 0 0 0 1.5px var(--line); }

/* custom level builder */
.custom-builder { display: flex; flex-direction: column; gap: 14px; }
.cu-row { display: flex; align-items: center; gap: 12px; }
.cu-label { font-size: 0.85rem; color: var(--text-soft); min-width: 4.6em; }
.seg { display: flex; flex: 1; gap: 6px; }
.seg button {
  flex: 1; background: var(--card); color: var(--text-soft);
  border: 1.5px solid var(--line); border-radius: 10px; padding: 9px 6px; font-size: 0.85rem; font-weight: 600;
}
.seg button.on { border-color: var(--blue); color: var(--text); }
.cu-notes-head { display: flex; align-items: center; justify-content: space-between; }
.cu-presets { display: flex; gap: 6px; }
.cu-presets button {
  background: transparent; color: var(--text-soft); border: 1.5px solid var(--line);
  border-radius: 8px; padding: 5px 12px; font-size: 0.78rem; font-weight: 600;
}
.cu-notes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.cu-note {
  min-height: 48px; font-family: 'Archivo Black', sans-serif; font-size: 1.1rem;
  background: var(--bg); color: var(--text-soft);
  border: 1.5px solid var(--line); border-radius: 12px;
}
.cu-note.alt { background: var(--alt); }
.cu-note.on { background: var(--blue); color: #232E36; border-color: var(--blue); }
.cu-note.tonic { border-color: var(--teal); }
.cu-note.on.tonic { background: var(--teal); color: #1E3230; }

/* settings */
.brand-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.gear {
  background: transparent; border: 1.5px solid var(--line); color: var(--text-soft);
  border-radius: 10px; width: 44px; height: 44px; font-size: 1.2rem; flex-shrink: 0;
}
.gear:hover { border-color: var(--teal); color: var(--teal); }

/* adventure map (Harmonia) */
.card.adventure { border-color: var(--teal); }
.card.adventure .card-title { color: var(--teal); }
.card.adventure:hover { border-color: var(--green); }
/* full-screen immersive adventure: the map fills the screen, HUD floats on top */
/* flex column: solid HUD bars top & bottom, the map lives fully BETWEEN them
   (never scrolls under a bar), so nothing obscures the terrain or Coda. */
.adv-screen { position: fixed; inset: 0; z-index: 40; background: #1b1f1d; overflow: hidden; display: flex; flex-direction: column; }
.adv-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; justify-content: center; }
/* "safe center": vertically centered when the map fits, but top-aligned (so the top
   stays scroll-reachable) when it's taller than the viewport — otherwise flex centering
   pushes the top above the scroll origin and you can't reach node 8 / the top of the map,
   most visibly in landscape where the viewport is short. */
.adv-map { image-rendering: pixelated; width: 100%; max-width: 460px; height: auto; align-self: safe center; margin: 0 auto; cursor: pointer; }
.adv-hud { flex: 0 0 auto; z-index: 2; display: flex; align-items: center; gap: 12px; }
.adv-hud-top {
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px;
  background: #161a18; border-bottom: 2px solid #2b322d;
}
/* Bottom HUD floats transparently over the map so the map fills the screen. */
.adv-hud-bottom {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
  padding: 10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px);
  background: transparent; border-top: 0;
  justify-content: flex-end; align-items: flex-end; gap: 8px; pointer-events: none;
}
.adv-hud-bottom > * { pointer-events: auto; }
.adv-forge-chip { display: flex; align-items: center; gap: 6px; background: rgba(20,24,22,.82); padding: 5px 12px 5px 6px; border-radius: 12px; }
.adv-logo { height: 24px; width: auto; image-rendering: pixelated; }
.adv-title { flex: 1; font-family: 'Archivo Black', sans-serif; font-size: 1rem; letter-spacing: 0.06em; color: var(--teal); text-transform: uppercase; }
.adv-title .w1 { color: var(--green); } .adv-title .w2 { color: var(--blue); }
.adv-splash { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; background: var(--bg); transition: opacity 0.45s ease; }
.adv-splash.out { opacity: 0; pointer-events: none; }
.adv-splash-logo { font-family: 'Archivo Black', sans-serif; font-size: 2.6rem; letter-spacing: 0.06em; margin: 0; text-transform: uppercase; }
.adv-splash-logo .w1 { color: var(--green); } .adv-splash-logo .w2 { color: var(--blue); }
.adv-sword-mini { image-rendering: pixelated; height: 46px; width: auto; flex-shrink: 0; }
.adv-forge-txt { display: flex; flex-direction: column; gap: 1px; font-size: 0.74rem; color: var(--text-soft); line-height: 1.2; }
.adv-forge-txt b { font-family: 'Archivo Black', sans-serif; font-size: 0.9rem; color: var(--teal); }
.adv-hud-actions { display: flex; gap: 8px; }
.adv-hud-actions .ghost { padding: 8px 11px; font-size: 1.1rem; background: rgba(20,24,22,.82); min-width: 44px; min-height: 44px; }
.settings { display: flex; flex-direction: column; gap: 20px; }
.set-block {
  display: flex; flex-direction: column; gap: 10px;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 16px; padding: 16px;
}
.set-label { font-family: 'Archivo Black', sans-serif; font-size: 1rem; }
.set-desc { margin: -4px 0 2px; font-size: 0.85rem; color: var(--text-soft); }
.set-block .seg button.on { border-color: var(--teal); color: var(--teal); }

/* chord-tones reference chart */
.chord-ref {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;
}
.cr-row {
  display: flex; align-items: baseline; gap: 8px;
  background: var(--bg); border: 1.5px solid var(--line); border-radius: 10px;
  padding: 7px 11px; flex: 1 1 auto; min-width: 128px;
}
.cr-sym { font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; min-width: 2.6em; }
.cr-num { color: var(--blue); font-weight: 700; font-size: 0.82rem; min-width: 2.6em; }
.cr-tones { margin-left: auto; color: var(--text-soft); font-weight: 600; font-size: 0.9rem; }
.cr-tones b { color: var(--teal); font-weight: 700; }

/* chord progressions */
.streak { color: var(--wrong-text); font-weight: 700; margin-right: 8px; }
/* input area holds either the buttons or the review stacks — fixed height so
   swapping between them never shifts the layout, and the stacks never clip */
/* the answer slots ARE the stacks — always in place; the degree ladder is a
   skeleton with a "?" until you tap a chord, then its tones circle in. */
.prog-layout { display: flex; flex-direction: column; gap: 16px; }
.prog-stacks { display: flex; gap: 12px; align-items: flex-start; justify-content: center; flex-wrap: nowrap; }
.prog-stack { gap: 2px; flex: 0 0 auto; transition: transform 0.15s ease; }
.prog-stack .stack-note {
  width: 24px; height: 18px; font-size: 0.72rem; border-radius: 5px;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.prog-stack:not(.filled) .stack-note { opacity: 0.35; }
.prog-stack:not(.filled) .stack-label { color: var(--text-soft); }
.prog-stack .stack-note.on { border-width: 1.5px; }
.prog-stack .stack-note.home { color: var(--teal); }
.prog-stack .stack-note.on.home { border-color: var(--teal); color: var(--teal); }
.prog-stack .stack-label { color: var(--blue); font-size: 0.85rem; padding-top: 4px; min-width: 30px; }
.prog-stack.wrong .stack-label { color: var(--wrong-text); }
.prog-stack.wrong .stack-note.on { border-color: var(--wrong); color: var(--wrong-text); }
.prog-stack.active { transform: translateY(-3px) scale(1.06); }
.prog-stack.active .stack-note.on { border-color: var(--green); color: var(--green); box-shadow: 0 0 8px rgba(106,191,94,0.5); }
.prog-stack.active .stack-label { color: var(--green); }
.numpad.chordpad { grid-template-columns: repeat(4, 1fr); }
.num.chordbtn { aspect-ratio: auto; min-height: 52px; font-size: 1.15rem; }

/* Melody Paths grid */
.path-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  background: var(--card); color: var(--text-soft); border: 1.5px solid var(--line);
  border-radius: 999px; padding: 7px 13px; font-family: 'Archivo Black', sans-serif; font-size: 0.85rem;
}
.chip.on { border-color: var(--teal); color: var(--text); }
.path-count {
  font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: var(--teal);
  min-width: 1.4em; text-align: center;
}
.path-build { display: flex; flex-direction: column; gap: 12px; }
.path-grid {
  display: flex; gap: 10px; justify-content: center; overflow-x: auto;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 16px; padding: 14px 10px;
}
.path-col {
  display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 0 0 auto;
  padding: 6px 6px 4px; border-radius: 12px; border: 2px solid transparent; transition: background 0.2s, border-color 0.2s;
}
.path-col.current { border-color: var(--teal); background: rgba(87,198,196,0.08); }
.path-note {
  width: 40px; height: 34px; border-radius: 8px;
  background: var(--bg); color: var(--text-soft); border: 1.5px solid transparent;
  font-family: 'Archivo Black', sans-serif; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s, box-shadow 0.12s;
}
.path-note.on { border: 1.5px solid var(--blue); color: var(--blue); }
.path-note.home { color: var(--teal); }
.path-note.on.home { border-color: var(--teal); color: var(--teal); }
.path-note.lit { background: var(--green); color: #23302A; border-color: var(--green); box-shadow: 0 0 14px rgba(106,191,94,0.5); }
.path-label {
  font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text);
  border-top: 2px solid var(--line); padding-top: 6px; margin-top: 2px; min-width: 40px; text-align: center;
}
.path-col.current .path-label { color: var(--teal); }
.hint .numlabel { color: var(--blue); font-style: normal; font-weight: 600; font-family: 'Archivo', sans-serif; }
.prog-actions { display: flex; gap: 10px; align-items: center; }
.primary.grow { flex: 1; }

/* results stats */
.stat-row { display: flex; gap: 10px; width: 100%; }
.stat {
  flex: 1; text-align: center; font-size: 0.85rem; color: var(--text-soft);
  background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 10px;
}
.stat b { display: block; font-family: 'Archivo Black', sans-serif; font-size: 1.4rem; color: var(--text); font-weight: 400; }

/* results */
.results { display: flex; flex-direction: column; gap: 16px; align-items: center; padding-top: 8px; }
.score-big {
  font-family: 'Archivo Black', sans-serif; font-size: 4rem; line-height: 1;
  color: var(--wrong);
}
.score-big.pass { color: var(--green); }
.bars { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.bar-label {
  font-family: 'Archivo Black', sans-serif; min-width: 2.2em; text-align: right;
  color: var(--blue);
}
.bar-track { flex: 1; height: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--green); border-radius: 99px; }
.bar-count { min-width: 2.6em; font-size: 0.8rem; color: var(--text-soft); }
.results-actions { display: flex; gap: 10px; }

.foot { text-align: center; font-size: 0.8rem; color: var(--text-soft); line-height: 1.5; padding: 0 12px; margin-top: auto; }

/* guide */
.card.start { border-color: var(--teal); }
.card.start .card-title { color: var(--teal); }
.guide-page { display: flex; flex-direction: column; gap: 14px; }
.guide-page h3 {
  font-family: 'Archivo Black', sans-serif; font-weight: 400; font-size: 1.25rem;
  margin: 0; color: var(--green);
}
.guide-page p { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--text); }
.guide-page p em { color: var(--blue); font-style: normal; font-weight: 600; }
.guide-page .guide-lead { color: var(--blue); font-weight: 700; margin-top: 6px; }
.guide-numbers {
  font-family: 'Archivo Black', sans-serif; font-size: 1.25rem; text-align: center;
  color: var(--teal); letter-spacing: 0.06em;
}
.guide-page .primary { align-self: flex-start; }
.stacks { display: flex; gap: 26px; justify-content: center; padding: 6px 0; }
.stack { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.stack-note {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  font-family: 'Archivo Black', sans-serif; font-size: 0.95rem; color: var(--text-soft);
  border-radius: 50%;
}
.stack-note.on { border: 2px solid var(--blue); color: var(--blue); }
.stack-label {
  font-family: 'Archivo Black', sans-serif; font-size: 1.05rem; color: var(--text);
  border-top: 2px solid var(--line); padding-top: 6px; margin-top: 2px; min-width: 34px; text-align: center;
}
.chord-layout { display: flex; gap: 16px; align-items: flex-start; }
.chord-right { flex: 1; display: flex; flex-direction: column; }
.session-stack .stack-note { width: 32px; height: 32px; font-size: 0.98rem; }
.session-stack { gap: 3px; }
.session-stack .stack-note.picked { border: 2px solid var(--blue); color: var(--blue); }
.session-stack .stack-note.on-wrong { border: 2px solid var(--wrong); color: var(--wrong-text); }
.session-stack .stack-note.on-correct { border: 2px solid var(--green); color: var(--green); background: rgba(106,191,94,0.12); }
.session-stack .stack-label { color: var(--teal); }
.pager { display: flex; align-items: center; gap: 12px; }
.dots { flex: 1; display: flex; gap: 7px; justify-content: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dot.on { background: var(--green); }

/* ==========  PHONE-LANDSCAPE: use the width (two columns)  ==================
   Triggers only when a phone is held sideways (short viewport). Scoped to
   .app-wide (session drill + Free Play) so menu/settings/guide/home/results
   keep today's centered 560 column. The .drill-stage / .fp-stage / .prog-right
   wrappers are display:contents in portrait, so this block is the ONLY place
   the layout changes — portrait stays pixel-identical. */
@media (orientation: landscape) and (max-height: 600px) {
  #root { max-width: 100%; }
  .app-wide {
    max-width: 100%; gap: 8px;
    padding-top: calc(8px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }
  :root[data-standalone] .app-wide { padding-top: calc(8px + env(safe-area-inset-top, 0px)); }

  /* ---- landscape FOCUS MODE: real phones are only ~340–430px tall sideways, so drop
     non-essential chrome and tuck secondary options behind the ⚙ to maximize the play area. */
  .app-wide .hpbar { display: none; }                    /* decorative trial cells */
  .app-wide .qcount { display: none; }                   /* "Question N of 3 · key" line */
  .app-wide .top-slim .back { min-height: 34px; padding: 5px 11px; }
  .app-wide .top-slim .screen-title { font-size: 1rem; }
  /* Free Play landscape bar: Notes + World selects stay visible; Key/Sound/Sing + Start-on
     tuck behind the ⚙. The bar carries a Voice toggle (fp-voice-bar) in place of Sing. */
  .app-wide .fp-opts-btn { display: inline-flex; width: 40px; height: 34px; margin-left: auto; flex: 0 0 auto; }
  .app-wide .fp-starton { display: none; }               /* niche "Start on" — drop it from the bar */
  .app-wide .ghost.fp-voice-bar { display: inline-flex; }  /* show the bar's Voice toggle (beats the portrait hide) */
  .app-wide .fp-keyrow-voice { display: none; }  /* both tabs carry a bar Voice toggle now → never show the key-row one in landscape (avoids a duplicate when the ⚙ is open) */
  .app-wide .key-row { display: none; }                   /* Key/Hear/Sound/Voice/Coda → behind ⚙ */
  .app-wide .fp-sing { display: none; }                   /* Sing → behind ⚙ (settings) */
  .app-wide.fp-opts-open .key-row { display: flex; }
  .app-wide.fp-opts-open .fp-sing { display: inline-flex; }
  .app-wide .panel { padding: 12px 14px; }
  .app-wide .num { min-height: 48px; }
  /* keep the feedback line on the SAME row as Repeat/♪/Voice (it otherwise wraps to its
     own row — ~58px of height). Melody floats its quip instead (rule below wins there). */
  .app-wide .quiz-bar { flex-wrap: nowrap; align-items: center; margin-bottom: 8px; }
  .app-wide .quiz-bar .hint.grow { flex: 1 1 auto; min-height: 0; }

  /* drill screen: tonal map / stack LEFT, controls + answer pads RIGHT */
  .app-wide .drill-stage { display: flex; gap: 16px; align-items: flex-start; justify-content: center; }
  .app-wide .drill-stage > .ladder { flex: 0 0 44%; }                 /* melody: the tonal map */
  .app-wide .drill-stage > .panel { flex: 1 1 0; min-width: 0; max-width: 720px; }
  /* melody: float the feedback/quip into the empty space UNDER the map (left column)
     so the answer pads on the right rise up and the drill fits without scrolling */
  .app-wide .drill-melody { position: relative; }
  .app-wide .drill-melody .quiz-bar .hint.grow {
    position: absolute; left: 0; bottom: 0; width: 44%; min-height: 0; margin: 0;
  }
  /* chords: a 3-column landscape layout — controls+reference | stack | pads+Check — so the
     tall vertical content fits a short phone WITHOUT cramping. A CSS grid places the panel's
     existing children into columns, so no markup changes; :has() scopes it to the chord panel. */
  .app-wide .panel:has(.chord-layout) {
    display: grid;
    grid-template-columns: minmax(150px, 32%) 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas: "bar layout" "ref layout";
    gap: 6px 14px; align-items: start; padding: 10px 12px;
  }
  .app-wide .panel:has(.chord-layout) .quiz-bar { grid-area: bar; flex-wrap: wrap; margin: 0; }
  .app-wide .panel:has(.chord-layout) .chord-ref { grid-area: ref; margin: 0; }
  .app-wide .panel:has(.chord-layout) .chord-layout { grid-area: layout; gap: 16px; }
  .app-wide .session-stack { gap: 2px; }
  .app-wide .session-stack .stack-note { width: 24px; height: 24px; font-size: 0.78rem; }
  .app-wide .chord-right .primary.wide { min-height: 42px; padding: 9px; }
  /* progressions: same idea — put the controls in a side column so the chord stacks +
     pad + Undo/Check sit beside them instead of stacked below. */
  .app-wide .panel:has(.prog-layout) {
    display: grid;
    grid-template-columns: minmax(140px, 26%) 1fr;
    grid-template-areas: "bar layout";
    gap: 6px 14px; align-items: start; padding: 10px 12px;
  }
  .app-wide .panel:has(.prog-layout) .quiz-bar { grid-area: bar; flex-wrap: wrap; margin: 0; }
  .app-wide .panel:has(.prog-layout) .prog-layout { grid-area: layout; }
  .app-wide .prog-layout { flex-direction: row; align-items: flex-start; gap: 16px; }
  .app-wide .prog-stacks { flex: 0 0 auto; }
  .app-wide .prog-right { display: flex; flex-direction: column; gap: 12px; flex: 1 1 0; min-width: 0; }

  /* Free Play landscape: a thin control bar on top, and the map/piano fills MOST of the
     screen so the 7 pads are big + finger-friendly. Secondary controls stay behind the ⚙. */
  .app-wide .fp-stage { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1 1 auto; }
  .app-wide .fp-side { display: flex; flex-flow: row wrap; gap: 8px; flex: 0 0 auto; align-items: center; justify-content: center; }
  .app-wide .fp-side .explore-controls { flex: 0 0 auto; gap: 8px; margin: 0; }
  .app-wide .fp-main { flex: 1 1 auto; min-height: 0; width: 100%; display: flex; flex-direction: column; }
  .app-wide .fp-numbers-toggle { display: none; }        /* drop the Numbers on / Blank pads toggle */
  .app-wide .fp-help { display: none; }                   /* drop the "World N: the blue pads…" help line */
  /* stretch the tonal map / piano to fill the freed height → big comfortable pads */
  .app-wide .fp-main .ladder.explore { flex: 1 1 auto; align-content: stretch; grid-auto-rows: 1fr; }
  .app-wide .fp-main .explore-pad { min-height: 0; }
  .app-wide .fp-main .piano { flex: 1 1 auto; height: auto; min-height: 150px; }
  /* Paths tab landscape: show the chord-name strip + the light-up map, hide the portrait
     solo columns, and tuck the setup (Build / Tempo / presets) behind the ⚙. */
  .app-wide .fp-pathchords { display: flex; }
  .app-wide .fp-paths-map { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
  .app-wide .path-grid { display: none; }
  .app-wide .fp-path-secondary { display: none; }
  .app-wide.fp-opts-open .fp-path-secondary { display: flex; }
}
`;
