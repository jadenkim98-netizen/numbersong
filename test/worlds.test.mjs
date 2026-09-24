// Unit tests for the adventure-worlds module (src/worlds.mjs).
// Run with: node --test test/worlds.test.mjs   (or ./test.sh)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { worldOf, stageOf, routeOnGrid, WALKABLE, W2_CHAPTERS, W2_REQUIRES, W2_KEEPER_NODES,
  nodeOpen, currentNodes, shieldQuarters, w2Node } from "../src/worlds.mjs";
import { ADV_STAGES, PROG_CHAPTERS, PROG_SECTIONS } from "../src/theory.mjs";
import { WORLD2 } from "../src/world2.mjs";

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

/* ── the Outer Keys ── */
const W2_IDS = WORLD2.nodes.map((n) => n.id);
const clearedSet = (...ids) => { const set = new Set(ids); return (id) => set.has(id); };

test("world 2's nodes are 101–114, clear of Harmonia's ids", () => {
  assert.deepEqual(W2_IDS, Array.from({ length: 14 }, (_, i) => 101 + i));
  for (const id of W2_IDS) assert.equal(worldOf(id), 2);
  assert.deepEqual(Object.keys(W2_CHAPTERS).map(Number), W2_IDS);
  assert.deepEqual(Object.keys(W2_REQUIRES).map(Number), W2_IDS);
});

test("world 2 plays All seven, then the colour chords, both paths and the Radio, in order", () => {
  const expected = ["All seven", ...PROG_SECTIONS.slice(1).flatMap((s) => s.chapters)];
  assert.deepEqual(W2_IDS.map((id) => W2_CHAPTERS[id]), expected);
  for (const id of W2_IDS) {
    const st = stageOf(id);
    assert.equal(st.mode, "progressions");
    assert.equal(PROG_CHAPTERS[st.gi].name, W2_CHAPTERS[id], `node ${id}`);
  }
});

test("the keepers sit on the last chapter of each section", () => {
  const lastOf = PROG_SECTIONS.slice(1).map((s) => s.chapters[s.chapters.length - 1]);
  assert.deepEqual(W2_KEEPER_NODES.map((id) => W2_CHAPTERS[id]), lastOf);
  assert.deepEqual(Object.keys(WORLD2.shield.quarters).map(Number), W2_KEEPER_NODES);
});

test("the unlock graph has no cycles and every node is reachable from the landing", () => {
  const seen = new Set();
  const order = [];
  const visit = (id, stack = new Set()) => {
    assert.ok(!stack.has(id), `cycle through ${id}`);
    if (seen.has(id)) return;
    stack.add(id);
    for (const req of W2_REQUIRES[id]) visit(req, stack);
    stack.delete(id);
    seen.add(id); order.push(id);
  };
  for (const id of W2_IDS) visit(id);
  // clearing everything in dependency order opens each node exactly when it's reached
  const done = new Set();
  for (const id of order) { assert.ok(nodeOpen(id, (x) => done.has(x)), `${id} not open in order`); done.add(id); }
  assert.deepEqual(currentNodes(W2_IDS, clearedSet()), [101]);
});

test("clearing the trunk opens both chains at once, and nothing else", () => {
  assert.deepEqual(currentNodes(W2_IDS, clearedSet(101, 102, 103, 104)), [105, 109]);
});

test("the Radio waits for BOTH chains", () => {
  const trunk = [101, 102, 103, 104], a = [105, 106, 107, 108], b = [109, 110, 111, 112, 113];
  assert.equal(nodeOpen(114, clearedSet(...trunk, ...a)), false);
  assert.equal(nodeOpen(114, clearedSet(...trunk, ...b)), false);
  assert.equal(nodeOpen(114, clearedSet(...trunk, ...a, ...b)), true);
});

test("Harmonia stays lock-free", () => {
  for (let id = 1; id <= 8; id++) assert.equal(nodeOpen(id, () => false), true);
});

test("shield quarters are the cleared keeper nodes, in order", () => {
  assert.deepEqual(shieldQuarters(clearedSet(101, 102, 103, 104, 109, 113)), [104, 113]);
});

test("world 2's placeholder map is Harmonia-shaped and every node sits on the road", () => {
  assert.equal(WORLD2.grid.length, WORLD2.gr);
  for (const row of WORLD2.grid) assert.equal(row.length, WORLD2.gc);
  assert.equal(WORLD2.gc, 16); assert.equal(WORLD2.gr, 26); // map CSS + MapTour assume 256×416
  for (const n of WORLD2.nodes) assert.ok(WALKABLE.has(WORLD2.grid[n.r][n.c]), `${n.name} at ${n.c},${n.r}`);
});

test("Coda can walk every edge of world 2 on the road, never hopping", () => {
  const at = Object.fromEntries(WORLD2.nodes.map((n) => [n.id, n]));
  for (const id of W2_IDS) for (const req of W2_REQUIRES[id]) {
    const a = at[req], b = at[id];
    const route = routeOnGrid(WORLD2.grid, WORLD2.gc, WORLD2.gr, { c: a.c, r: a.r }, b.c, b.r);
    for (let i = 1; i < route.length; i++) {
      const step = Math.abs(route[i].c - route[i - 1].c) + Math.abs(route[i].r - route[i - 1].r);
      assert.equal(step, 1, `${a.name} → ${b.name}: a hop at step ${i}`);
    }
  }
});

test("every world-2 node speaks in a keeper's voice; only keeper nodes award a mark", () => {
  for (const id of W2_IDS) {
    const n = w2Node(id);
    assert.ok(n.keeper && n.short && n.greet, `node ${id} has a keeper`);
    const own = W2_KEEPER_NODES.includes(id);
    assert.equal(!!(n.winTitle && n.win && n.lore), own, `node ${id} win lines`);
  }
  assert.equal(w2Node(999), null);
});
