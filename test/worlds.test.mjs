// Unit tests for the adventure-worlds module (src/worlds.mjs).
// Run with: node --test test/worlds.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { worldOf, stageOf, routeOnGrid, WALKABLE } from "../src/worlds.mjs";
import { ADV_STAGES } from "../src/theory.mjs";

// adventure/assets.js is a browser global file (`export const HARMONIA = {...};`), not a
// module node can import, so lift its object literal out as JSON.
const src = readFileSync(new URL("../adventure/assets.js", import.meta.url), "utf8");
const line = src.split("\n").find((l) => l.startsWith("export const HARMONIA = "));
const H = JSON.parse(line.slice("export const HARMONIA = ".length).replace(/;\s*$/, ""));

test("node ids say which world they're in", () => {
  for (let id = 1; id <= 8; id++) assert.equal(worldOf(id), 1);
  assert.equal(worldOf(101), 2);
  assert.equal(worldOf(114), 2);
});

test("stageOf gives Harmonia's nodes exactly the stages they had", () => {
  for (let id = 1; id <= 8; id++) assert.equal(stageOf(id), ADV_STAGES[id - 1]);
  assert.equal(stageOf(9), null);
  assert.equal(stageOf(101), null); // world 2's stages arrive with its data (M1)
  assert.equal(ADV_STAGES.length, 8); // the main story stays 8 regions
});

test("Harmonia's node ids are 1–8, one per stage", () => {
  assert.deepEqual(H.nodes.map((n) => n.id), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("every Harmonia node sits on a walkable tile", () => {
  for (const n of H.nodes) assert.ok(WALKABLE.has(H.grid[n.r][n.c]), `${n.name} at ${n.c},${n.r}`);
});

test("Coda can walk between every pair of Harmonia nodes on the road, never hopping", () => {
  for (const a of H.nodes) for (const b of H.nodes) {
    if (a === b) continue;
    const route = routeOnGrid(H.grid, H.gc, H.gr, { c: a.c, r: a.r }, b.c, b.r);
    assert.deepEqual(route[0], { c: a.c, r: a.r });
    assert.deepEqual(route[route.length - 1], { c: b.c, r: b.r });
    for (let i = 1; i < route.length; i++) {
      const step = Math.abs(route[i].c - route[i - 1].c) + Math.abs(route[i].r - route[i - 1].r);
      assert.equal(step, 1, `${a.name} → ${b.name}: a hop at step ${i}`);
      assert.ok(WALKABLE.has(H.grid[route[i].r][route[i].c]), `${a.name} → ${b.name}: off-road at step ${i}`);
    }
  }
});

test("no road → a straight two-point hop, so Coda is never stuck", () => {
  const grid = [[12, 0, 12]];
  assert.deepEqual(routeOnGrid(grid, 3, 1, { c: 0, r: 0 }, 2, 0), [{ c: 0, r: 0 }, { c: 2, r: 0 }]);
});

test("a mid-walk (fractional) start rounds to its tile", () => {
  const grid = [[12, 12, 12]];
  assert.deepEqual(routeOnGrid(grid, 3, 1, { c: 0.4, r: 0.2 }, 2, 0), [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }]);
});
