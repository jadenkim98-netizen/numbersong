// Numbersong — adventure worlds. Pure: no React / Tone / window, so it's unit-tested
// directly (test/worlds.test.mjs) and inlined by build.sh like theory.mjs.
//
// Node ids are GLOBAL across worlds: Harmonia keeps 1–8, the Outer Keys (world 2, see
// WORLD2_PLAN.md) will use 101+. Everything keyed by node id — the adventure stage, the
// duel config, keeper art, analytics — then works across worlds with no schema change.
// Anything that used to index an 8-long array with [id - 1] goes through here instead.

import { ADV_STAGES, PROG_CHAPTERS } from "./theory.mjs";
import { WORLD2 } from "./world2.mjs";

// Which world a node belongs to.
export const worldOf = (id) => (id >= 100 ? 2 : 1);

/* ── the Outer Keys (world 2) ── */
// The progression chapter each node plays, BY NAME: gi is looked up, never hard-coded, so
// reordering or appending chapters can't silently point a node at the wrong one (a test
// pins every name to a real chapter).
export const W2_CHAPTERS = {
  101: "All seven",
  102: "3D · five of six", 103: "4- · borrowed from minor", 104: "Colour chords · 3D and 4-",
  105: "1D · five of four", 106: "2D · five of five", 107: "6D · five of two", 108: "Secondary dominants · all four",
  109: "♭7 · flat seven", 110: "♭6 · flat six", 111: "♭3 · flat three", 112: "2-7♭5 · minor's two", 113: "Borrowed from minor · all five",
  114: "The Radio · every chord",
};
const W2_STAGES = Object.fromEntries(Object.entries(W2_CHAPTERS).map(([id, name]) =>
  [id, { mode: "progressions", gi: PROG_CHAPTERS.findIndex((c) => c.name === name) }]));

// What must be cleared before a node opens. A line up the trunk, then a fork the player
// takes in either order, meeting again at the Radio — which needs BOTH chains.
export const W2_REQUIRES = {
  101: [],
  102: [101], 103: [102], 104: [103],
  105: [104], 106: [105], 107: [106], 108: [107],   // the Beacon Chain
  109: [104], 110: [109], 111: [110], 112: [111], 113: [112], // the Vesper Isles
  114: [108, 113],
};
// The section capstones: each is its keeper's duel, and paints a quarter of the shield.
export const W2_KEEPER_NODES = [104, 108, 113, 114];

// The adventure stage ({ mode, gi }) a node plays, in either world.
export function stageOf(id) {
  if (worldOf(id) === 1) return ADV_STAGES[id - 1] || null;
  return W2_STAGES[id] || null;
}

// A world's static data: Harmonia's lives on window (see adventure/assets.js), so the
// caller passes it in; world 2's is bundled here.
export const worldData = (world, harmonia) => (world === 2 ? WORLD2 : harmonia);

// Is this node open? `isCleared(id)` is the caller's clear check (stageClearedAdv).
// Harmonia has no locks — every region can be visited in any order, as it always could.
export const nodeOpen = (id, isCleared) => (W2_REQUIRES[id] || []).every(isCleared);
// The nodes worth glowing: open and not yet cleared. Both chain heads at once after the trunk.
export const currentNodes = (ids, isCleared) => ids.filter((id) => nodeOpen(id, isCleared) && !isCleared(id));
// A world-2 node dressed for display: the node plus its section keeper's name and voice.
// Only a keeper's own node (a capstone) carries the win lines and lore — a plain stop
// greets you in the keeper's voice but has no mark to award.
export function w2Node(id) {
  const n = WORLD2.nodes.find((x) => x.id === id);
  if (!n) return null;
  const { keeper, short, emblem, greet, winTitle, win, lore } = WORLD2.keepers[n.section];
  const own = W2_KEEPER_NODES.includes(id);
  return { ...n, keeper, short, keeperEmblem: emblem, greet: n.greet || greet, ...(own ? { winTitle, win, lore } : {}) };
}
// The shield quarters earned so far (keeper nodes cleared), in painting order.
export const shieldQuarters = (isCleared) => W2_KEEPER_NODES.filter(isCleared);

// Map tiles Coda can walk on: the path pieces, clearings, hearth, bridge and peak.
export const WALKABLE = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);

// Breadth-first route from tile `start` ({c, r}, may be fractional mid-walk) to (tc, tr)
// over walkable tiles. No route → a straight two-point hop, so Coda is never stuck.
export function routeOnGrid(grid, gc, gr, start, tc, tr) {
  const sc = Math.round(start.c), sr = Math.round(start.r);
  const key = (c, r) => r * gc + c;
  const okTile = (c, r) => c >= 0 && c < gc && r >= 0 && r < gr && WALKABLE.has(grid[r][c]);
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
}
