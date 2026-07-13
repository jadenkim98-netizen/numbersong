// Unit tests for the Sing-tuner pitch math (src/pitch.mjs).
// Run with: node --test test/pitch.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPitch, pitchToDegree } from "../src/pitch.mjs";

const SR = 44100;
function sine(freq, n = 2048, sr = SR) {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  return buf;
}

test("detectPitch recovers the fundamental of a pure sine (< 2 Hz off)", () => {
  for (const f of [110, 220, 440, 660]) {
    const hz = detectPitch(sine(f), SR);
    assert.ok(Math.abs(hz - f) < 2, `got ${hz} for ${f}`);
  }
});

test("detectPitch returns -1 for silence and for too-short input", () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), -1); // all zeros
  assert.equal(detectPitch(sine(220, 64), SR), -1);          // below the 128-sample floor
});

test("detectPitch rejects pitches outside the singing range", () => {
  assert.equal(detectPitch(sine(50), SR), -1);   // too low
  assert.equal(detectPitch(sine(1500), SR), -1); // too high
});

test("pitchToDegree maps a frequency to a scale degree of the key", () => {
  assert.deepEqual(pitchToDegree(261.63, "C"), { deg: 1, cents: 0 }); // C = 1
  assert.deepEqual(pitchToDegree(392.0, "C").deg, 5);                 // G = 5
  assert.deepEqual(pitchToDegree(440.0, "C"), { deg: 6, cents: 0 });  // A = 6
});

test("pitchToDegree is octave-agnostic (a low 3 and a high 3 both read 3)", () => {
  assert.equal(pitchToDegree(329.63, "C").deg, 3); // E4
  assert.equal(pitchToDegree(164.81, "C").deg, 3); // E3, an octave down
});

test("pitchToDegree reports how many cents sharp/flat you are", () => {
  const flat = pitchToDegree(440 * Math.pow(2, -20 / 1200), "C"); // 20 cents flat of A
  assert.equal(flat.deg, 6);
  assert.ok(flat.cents < 0 && Math.abs(flat.cents + 20) <= 2, `cents=${flat.cents}`);
});

test("pitchToDegree tracks the key: A is 6 of C but 1 of A", () => {
  assert.equal(pitchToDegree(440, "C").deg, 6);
  assert.equal(pitchToDegree(440, "A").deg, 1);
});
