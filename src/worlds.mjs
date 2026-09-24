// Numbersong — adventure worlds. Pure: no React / Tone / window, so it's unit-tested
// directly (test/worlds.test.mjs) and inlined by build.sh like theory.mjs.
//
// Node ids are GLOBAL across worlds: Harmonia keeps 1–8, the Outer Keys (world 2, see
// WORLD2_PLAN.md) will use 101+. Everything keyed by node id — the adventure stage, the
// duel config, keeper art, analytics — then works across worlds with no schema change.
// Anything that used to index an 8-long array with [id - 1] goes through here instead.

import { ADV_STAGES } from "./theory.mjs";

// Which world a node belongs to.
export const worldOf = (id) => (id >= 100 ? 2 : 1);

// The adventure stage ({ mode, gi }) a node plays. World 2's stages arrive with its data.
export function stageOf(id) {
  if (worldOf(id) === 1) return ADV_STAGES[id - 1] || null;
  return null;
}

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
