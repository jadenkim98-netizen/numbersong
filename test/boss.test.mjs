// Unit tests for the Keeper Duel model (src/boss.mjs).
// Run with: node --test test/boss.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOSS, DEFAULT_BOSS, isBossRegion, bossConfigFor, bossDamage, evalBoss, bossTimer,
} from "../src/boss.mjs";

const R = (firstTry) => ({ target: 3, firstTry }); // a result stub; only firstTry matters

test("isBossRegion: all 8 keepers wired", () => {
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) assert.equal(isBossRegion(id), true, `region ${id}`);
  assert.equal(isBossRegion(9), false);
});

test("bossConfigFor: known region → its config, unknown → default", () => {
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) assert.equal(bossConfigFor(id), BOSS[id], `region ${id}`);
  assert.equal(bossConfigFor(99), DEFAULT_BOSS);
});

test("every wired keeper has the fields the duel reads (hp/hearts/timer/taunts.hits)", () => {
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const c = BOSS[id];
    assert.ok(c.hp > 0 && c.hearts > 0, `region ${id} hp/hearts`);
    assert.ok(c.timer && c.timer.full && c.timer.mid && c.timer.low, `region ${id} timer`);
    assert.ok(Array.isArray(c.taunts.hits) && c.taunts.hits.length > 0, `region ${id} hits`);
    ["intro", "low", "playerHurt", "win", "lose"].forEach((k) =>
      assert.equal(typeof c.taunts[k], "string", `region ${id} taunt ${k}`));
  }
});

test("bossDamage: first-try strikes harder than a recovered hit", () => {
  const c = BOSS[1];
  assert.equal(bossDamage(true, c), c.dmgFirst);
  assert.equal(bossDamage(false, c), c.dmgRecover);
  assert.ok(c.dmgFirst > c.dmgRecover);
});

test("evalBoss: fresh fight is ongoing at full bars", () => {
  const s = evalBoss([], 0, BOSS[1]);
  assert.equal(s.outcome, "ongoing");
  assert.equal(s.hp, BOSS[1].hp);
  assert.equal(s.hpMax, BOSS[1].hp);
  assert.equal(s.hearts, BOSS[1].hearts);
  assert.equal(s.hpPct, 100);
  assert.equal(s.damage, 0);
  assert.equal(s.misses, 0);
});

test("evalBoss: first-try correct answers accumulate damage and drain HP", () => {
  const c = BOSS[1]; // hp 100, dmgFirst 25
  const s = evalBoss([R(true), R(true)], 0, c);
  assert.equal(s.damage, 50);
  assert.equal(s.hp, 50);
  assert.equal(s.hpPct, 50);
  assert.equal(s.hearts, c.hearts); // no misses → all hearts
  assert.equal(s.outcome, "ongoing");
});

test("evalBoss: enough clean hits win (HP clamps at 0)", () => {
  const c = BOSS[1]; // 4 * 25 = 100
  const s = evalBoss([R(true), R(true), R(true), R(true)], 0, c);
  assert.equal(s.hp, 0);
  assert.equal(s.hpPct, 0);
  assert.equal(s.outcome, "win");
});

test("evalBoss: every wrong answer costs a heart (misses drive hearts directly)", () => {
  const c = BOSS[1]; // hearts 4
  assert.equal(evalBoss([], 1, c).hearts, 3);
  assert.equal(evalBoss([], 2, c).hearts, 2);
  assert.equal(evalBoss([], 3, c).hearts, 1);
});

test("evalBoss: multiple misses on a single question spend multiple hearts", () => {
  const c = BOSS[1]; // hearts 4 — no results yet (question not answered), 3 wrong guesses
  const s = evalBoss([], 3, c);
  assert.equal(s.hearts, 1);
  assert.equal(s.hp, c.hp); // keeper untouched — no correct answer landed
  assert.equal(s.outcome, "ongoing");
});

test("evalBoss: hearts hitting 0 loses — even mid-question, before any correct answer", () => {
  const c = BOSS[1]; // hearts 4
  const s = evalBoss([], 4, c);
  assert.equal(s.hearts, 0);
  assert.equal(s.outcome, "lose");
  assert.equal(s.hp, c.hp); // she never took damage; you ran out of ears
});

test("evalBoss: hearts never go negative (clamped at 0)", () => {
  const s = evalBoss([], 9, BOSS[1]);
  assert.equal(s.hearts, 0);
});

test("evalBoss: win takes precedence if HP and hearts empty together", () => {
  // Contrived: HP to 0 on a correct answer while misses already == hearts.
  const c = { hp: 25, hearts: 2, dmgFirst: 25, dmgRecover: 10 };
  const s = evalBoss([R(true)], 2, c); // damage 25 → hp 0; misses 2 → hearts 0
  assert.equal(s.hp, 0);
  assert.equal(s.hearts, 0);
  assert.equal(s.outcome, "win"); // a landed correct answer wins
});

test("evalBoss: mixed fight tallies damage and misses independently", () => {
  const c = BOSS[1]; // hp 100, dmgFirst 25, dmgRecover 10, hearts 4
  // Two questions answered (one clean, one recovered) + 3 total wrong guesses.
  const s = evalBoss([R(true), R(false)], 3, c);
  assert.equal(s.damage, 25 + 10); // 35
  assert.equal(s.hp, 65);
  assert.equal(s.misses, 3);
  assert.equal(s.hearts, 1);
  assert.equal(s.outcome, "ongoing");
});

test("evalBoss: missing misses arg is treated as 0 (defensive)", () => {
  const s = evalBoss([], undefined, BOSS[1]);
  assert.equal(s.hearts, BOSS[1].hearts);
  assert.equal(s.misses, 0);
});

test("bossTimer: clock shrinks as the keeper weakens (by HP third)", () => {
  const c = BOSS[1]; // { full: 8, mid: 6, low: 4 }
  assert.equal(bossTimer(100, c), 8);
  assert.equal(bossTimer(67, c), 8);
  assert.equal(bossTimer(66, c), 6);   // boundary → mid
  assert.equal(bossTimer(40, c), 6);
  assert.equal(bossTimer(33, c), 4);   // boundary → low
  assert.equal(bossTimer(1, c), 4);
});

test("bossTimer: falls back to a default clock when cfg has no timer", () => {
  assert.equal(bossTimer(100, {}), 7);
  assert.equal(bossTimer(50, {}), 5);
  assert.equal(bossTimer(10, {}), 3);
});
