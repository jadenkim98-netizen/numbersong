// Unit tests for the Keeper Duel model (src/boss.mjs).
// Run with: node --test test/boss.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOSS, DEFAULT_BOSS, isBossRegion, bossConfigFor, bossDamage, evalBoss,
} from "../src/boss.mjs";

const R = (firstTry) => ({ target: 3, firstTry }); // a result stub; only firstTry matters

test("isBossRegion: only wired keepers launch a duel (Verda for now)", () => {
  assert.equal(isBossRegion(1), true);
  assert.equal(isBossRegion(2), false);
  assert.equal(isBossRegion(8), false);
});

test("bossConfigFor: known region → its config, unknown → default", () => {
  assert.equal(bossConfigFor(1), BOSS[1]);
  assert.equal(bossConfigFor(99), DEFAULT_BOSS);
});

test("bossDamage: first-try strikes harder than a recovered hit", () => {
  const c = BOSS[1];
  assert.equal(bossDamage(true, c), c.dmgFirst);
  assert.equal(bossDamage(false, c), c.dmgRecover);
  assert.ok(c.dmgFirst > c.dmgRecover);
});

test("evalBoss: fresh fight is ongoing at full bars", () => {
  const s = evalBoss([], BOSS[1]);
  assert.equal(s.outcome, "ongoing");
  assert.equal(s.hp, BOSS[1].hp);
  assert.equal(s.hpMax, BOSS[1].hp);
  assert.equal(s.hearts, BOSS[1].hearts);
  assert.equal(s.hpPct, 100);
  assert.equal(s.damage, 0);
  assert.equal(s.fumbles, 0);
});

test("evalBoss: first-try correct answers accumulate damage and drain HP", () => {
  const c = BOSS[1]; // hp 100, dmgFirst 25
  const s = evalBoss([R(true), R(true)], c);
  assert.equal(s.damage, 50);
  assert.equal(s.hp, 50);
  assert.equal(s.hpPct, 50);
  assert.equal(s.fumbles, 0);
  assert.equal(s.hearts, c.hearts); // no hearts lost on clean hits
  assert.equal(s.outcome, "ongoing");
});

test("evalBoss: enough clean hits win (HP clamps at 0)", () => {
  const c = BOSS[1]; // 4 * 25 = 100
  const s = evalBoss([R(true), R(true), R(true), R(true)], c);
  assert.equal(s.hp, 0);
  assert.equal(s.hpPct, 0);
  assert.equal(s.outcome, "win");
});

test("evalBoss: recovered answers deal less and cost a heart each", () => {
  const c = BOSS[1]; // dmgRecover 10, hearts 4
  const s = evalBoss([R(false), R(false)], c);
  assert.equal(s.damage, 20);
  assert.equal(s.hp, 80);
  assert.equal(s.fumbles, 2);
  assert.equal(s.hearts, 2);
  assert.equal(s.outcome, "ongoing");
});

test("evalBoss: fumbling away every heart loses", () => {
  const c = BOSS[1]; // hearts 4
  const s = evalBoss([R(false), R(false), R(false), R(false)], c);
  assert.equal(s.hearts, 0);
  assert.equal(s.outcome, "lose");
  assert.ok(s.hp > 0); // she survived; you didn't
});

test("evalBoss: hearts never go negative (clamped at 0)", () => {
  const c = BOSS[1];
  const s = evalBoss([R(false), R(false), R(false), R(false), R(false)], c);
  assert.equal(s.hearts, 0);
});

test("evalBoss: win beats lose when the killing blow also spends the last heart", () => {
  // Craft a config where one recovered answer both drops HP to 0 and hearts to 0.
  const c = { hp: 10, hearts: 1, dmgFirst: 10, dmgRecover: 10 };
  const s = evalBoss([R(false)], c); // -10 HP → 0, and a fumble → hearts 0
  assert.equal(s.hp, 0);
  assert.equal(s.hearts, 0);
  assert.equal(s.outcome, "win"); // generous: landing the blow wins
});

test("evalBoss: mixed fight tallies damage and fumbles independently", () => {
  const c = BOSS[1]; // hp 100, dmgFirst 25, dmgRecover 10, hearts 4
  const s = evalBoss([R(true), R(false), R(true)], c);
  assert.equal(s.damage, 25 + 10 + 25); // 60
  assert.equal(s.hp, 40);
  assert.equal(s.fumbles, 1);
  assert.equal(s.hearts, 3);
  assert.equal(s.outcome, "ongoing");
});
