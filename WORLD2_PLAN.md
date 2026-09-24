# World 2 — the Outer Keys

A second adventure map for the chord-colour chapters: the colour chords, the two paths
(secondary dominants, borrowed from minor), and the Radio. Planned 2026-09-24.

Status: **M0 built** (2026-09-24): `src/worlds.mjs` (`worldOf`, `stageOf`, `routeOnGrid`),
`nodeOf` in the jsx, `AdventureMap` takes a `world` prop, and both world-scoping bugs are fixed.
Harmonia behaves identically. **M1 built** (2026-09-24): `src/world2.mjs` (placeholder island grid,
14 nodes, the four keepers' text, the shield) and the world-2 half of `src/worlds.mjs`
(`W2_CHAPTERS`, `W2_REQUIRES`, `W2_KEEPER_NODES`, `nodeOpen`, `currentNodes`, `shieldQuarters`,
`w2Node`). **M2 built** (2026-09-24), behind `W2_ENABLED` (testing mode or `?w2`): world switching
(`worldId` pref, SAIL boat at Pillar Coast / HOME boat below Warmwater Landing, a ⛵ toggle after the
first visit), the Sixstone Hollow hint card, locks with a "Clear X first" note, several glowing stops at
once, the shield chip, the paid gate (`FREE.world2Nodes: 0`), world-2 encounter cards, and a world-2
win card (stop cleared / colour earned). Keeper stops are still plain capstones until M3's duels.
Names confirmed; world 2 is paid.

---

## Decisions (settled)

| | |
|---|---|
| **Content** | The existing progression chapters, one map node each: a warm-up stop (All seven) → trunk (3D, 4-, Colour chords) → fork → Path A (1D, 2D, 6D, Secondary dominants · all four) **or** Path B (♭7, ♭6, ♭3, 2-7♭5, Borrowed from minor · all five) → the Radio. 1 + 3 + 4 + 5 + 1 = **14 nodes**. |
| **Warm-up** | "All seven" is the first stop, before Tintmouth, **for now**. Jaden isn't happy with it there: it probably belongs on the first map. Revisit later; the first map's 8-node story math makes that harder. |
| **Locks (for now)** | **Off.** Jaden 2026-09-24: every stop open, don't make players go one by one yet. `W2_LOCKS = false` in the jsx; the unlock order below still decides which stops glow as the suggested next step, and flipping the flag turns the locks back on. |
| **Unlocks (when on)** | Trunk in order. Both paths open when the trunk capstone is cleared, taken in either order ("neither is harder"). Within a path, in order. The Radio needs **both** path capstones. |
| **Access** | **Always open**, like the rest of the game, with a soft *"recommended after Sixstone Hollow (region 6)"* hint. |
| **Getting there** | **Both**: a boat at a dock on Pillar Coast (region 5, where progressions start) on the main map, **and** a map shortcut once you've visited. |
| **Keepers** | **One per section, 4 total**: trunk, Path A, Path B, Radio. Each keeper's duel replaces their section's capstone. The other 9 nodes are plain stops. |
| **Freemium** | **Paid**, like chord progressions in Basic Training (`FREE.world2Nodes: 0`). The dock stays open so free players can sail over and look around; node taps open the upsell. |
| **Collectible** | **A shield made from the colours**: four quarters, one per keeper, whole after the Radio. The partner to Excalibar; it must never touch the sword's 8/8. |
| **Setting** | Islands beyond the key: an archipelago off Harmonia's coast. |

## Names (confirmed 2026-09-24)

- **World:** *the Outer Keys* (islands are "keys", and they sit outside the key)
- **Shield:** *the Colour Guard* (a heraldic shield in quarters; also a marching band's flag section)

| Section | Island | Keeper | Quarter |
|---|---|---|---|
| Trunk | Tintmouth Harbour | **Ochre, the Dyer**. Two dye vats most travellers never notice. | teal |
| Path A | the Beacon Chain | **Lumen, the Lamplighter**. Every lighthouse beam points at the next island ("each chord the five of the next"). | gold |
| Path B | the Vesper Isles | **Vesper, the Moon-Borrower**. Borrows colours from the minor moon, returns them by morning. | blue |
| Radio | Signal Rock | **Wren, the Operator**. Tunes the old tower where both chains meet. | final quarter |

Greetings drafted in chat (2026-09-24); write the full `greet / winTitle / win / lore` set in the existing keepers' voice once names are picked.

---

## How the code works today (what we're building on)

- **Map data:** `window.HARMONIA` (adventure/assets.js): a 16×26 grid of 16px tiles (256×416 px), tileset, 8 `nodes` with the keeper text, `sword` + `partmask`, `stageFrag` / `fragLabel`.
- **Drawing:** `window.MAP_BAKED` if present (jsx ~1940), otherwise painted from the tileset.
- **Movement:** `buildRoute` (jsx ~2021) runs a breadth-first search over `WALKABLE` path tiles; if there's no route, Coda hops. A fork is just a Y drawn in path tiles.
- **World 1 has no locks:** every node can be tapped (only freemium gating). The world-2 unlock graph is **new logic**, not a generalisation.
- **Clears:** `stageClearedAdv(id)` checks the region's chapter's last level. Progress is stored per mode + level idx, so there's **no save-format change**, and chapters already cleared in Basic Training show as cleared on the map.
- **8 is hard-coded** in a number of places: `ADV_STAGES[id-1]`, `HARMONIA.nodes[id-1]`, `stageFrag` / `fragLabel`, and `>= 8`, `/ 8`.

### Two bugs to fix before any world-2 node can be cleared (verified)

1. **Grand fanfare** (jsx ~3968): `others >= 7` counts cleared world-1 nodes. Once world 1 is 8/8, **every** world-2 clear would play the grand fanfare.
2. **Excalibar finale** (jsx ~5639): `finale = justCleared && advCollected.size >= 8` would replay "Excalibar reforged" on every world-2 clear once the sword is whole.

Both need to be scoped to the node's own world.

---

## Architecture

**Globally unique node ids.** World 1 keeps 1–8; world 2 uses **101–114**: 101 warm-up, 102–104 trunk, 105–108 Path A, 109–113 Path B, 114 Radio. Everything already keyed by node id works without schema changes: `advStageId`, `bossRegion`, `encounterNode`, `mapCelebrateNode`, `KEEPER_ART[id]`, `BOSS[id]`, analytics `region`.

**New `src/worlds.mjs`** (pure, unit-tested):
- `W2_STAGES`: node id → `{ mode: "progressions", gi }`. Derive `gi` from `PROG_SECTIONS` chapter names via `PROG_CHAPTERS.findIndex`; don't hard-code it, so a reshuffle breaks a test instead of the map.
- `W2_REQUIRES`: the unlock graph (e.g. `114: [108, 113]`).
- `W2_KEEPER_NODES = [104, 108, 113, 114]`.
- `stageOf(id)`, `worldOf(id)`, `nodeOpen(id, isCleared)`, `currentNodes(...)`.
- `routeOnGrid(...)`: the existing route search, moved here verbatim so it can be tested.

**New `src/world2.mjs`** (built in M1; a bundled data module rather than a `window` global, so the tests import it directly and build.sh needs no change):
- Same grid shape (16×26); MapTour and the map CSS assume 256×416.
- 13 nodes with a `section` field, a `keepers` block keyed by section, the return dock, and `shield: { name, quarters: { 104, 108, 113, 114 } }`.

**JSX:**
- `stageOf` / `nodeOf` replace every `[id-1]` lookup; ids 1–8 return the same objects as today.
- `AdventureMap` takes a `world` prop:
  - Draws the Dojo and the resting Excalibar only in world 1.
  - Adds `isCleared` / `isLocked` props (locked nodes are dimmed with a 🔒).
  - The HUD chip becomes a render prop (sword in world 1, shield in world 2).
  - Mount it with `key={worldId}` so its refs reset between worlds.

## Getting there

- **Dock:** a sprite on the water beside Pillar Coast (node 5 is at c3/r11 with water to its west). It copies the **Dojo pattern** (the `DOJO` const, `drawDojo`, and the tap branch at jsx ~2078) so no new screen is needed. Tapping it walks Coda over and sets sail. World 2 has a matching dock back.
- **Hint:** if Sixstone Hollow isn't cleared, the dock tap shows a card: *"Recommended after Sixstone Hollow: you'll want progressions in your ears. [Not yet] [Sail anyway →]"*. Once region 6 is cleared it goes straight through. Boring mode skips the card.
- **Map shortcut:** after the first visit, a *Harmonia / the Outer Keys* toggle on the map screen.
- **State:** `worldId`, saved as the `world` pref, so a reload keeps you where you were.

## Keepers and duels

- `BOSS[104] / [108] / [113] / [114]` in boss.mjs, added to `ENABLED`. Start from the tuning of the progression duels (regions 5 and 6). The Radio's 15-chord pool probably wants more hearts and a longer timer; play-test it.
- Plain nodes open the encounter card with their **section keeper's** greeting and a lighter "waystation" framing.
- build.sh: `keeper_art` gains world-2 slots through an optional loader (`_png_opt`: an empty string when the file is missing), so every site falls back to the emoji emblem until the art exists.

## Shield and ending

- A quarter is earned when a keeper node is cleared. Plain nodes earn a ★ on the map only. Shield state is `W2_KEEPER_NODES.filter(stageClearedAdv)`, completely separate from `advCollected`.
- Fanfare and finale are **per world**: the grand fanfare fires on the world's last collectible (8 in world 1, 4 in world 2).
- **Shield finale:** when the Radio clears with all four quarters, *"The Colour Guard is whole"*, reusing the `.finale` markup and playing a snippet of the Radio's curated songs. Its victory card shows the shield with the new quarter painting in, the way the sword forges.
- After 4/4 the world-2 map shows the finished shield at Tintmouth, the same pattern as the resting Excalibar.

## Freemium

- Replace `isRegionFree(nodeIdx)` with `isNodeFree(id)`, adding `FREE.world2Nodes: 0` (**paid**, decided).
- The dock stays open to everyone, so free players can sail over and look around (a teaser). Node taps open `openUpsell("world2")`.

---

## Art (PixelLab), with placeholders first

**Placeholders, so every milestone can ship before any art exists:**
- The world-2 grid is authored with world-1 tile indices (water-heavy, sand/grass islands, path tiles), plus a `tint` overlay so it reads as a different place.
- Keepers use emoji emblems, the shield is a CSS-drawn quartered shield, and the docks are drawn in vectors like `drawDojo`.

**Final asset list** (sizes match the existing files):
- `map_w2_baked.png`, 256×416, aligned to the grid with path tiles on exactly the walkable cells. Optionally a new 128×64 island tileset in the same index layout.
- 4 keeper portraits, 128×128 (generated at 32px, upscaled 4×, like the existing `keepers/portrait_*.png`).
- 4 full-body sprites, 92×92, like `keepers/keeper_*_south.png`. Optional; only needed for future cutscenes.
- 2 dock/boat sprites, 64×64, like `dojo_final.png`.
- The shield: one 64×64 blank plus 4 quarter overlays, or an assembled image with a part mask (the sword's `decodeMask` scheme).

Keep sprites low-res to match the 16px map (see project notes on sprite scale).

---

## Milestones (each shippable to main without changing world 1)

| | Milestone | Size |
|---|---|---|
| **M0** | Refactor, no behaviour change: `stageOf` / `nodeOf`, `routeOnGrid` extraction, the `world` prop, and **the two world-scoping bug fixes**. QA: world 1 plays exactly the same. | ~150 LOC |
| **M1** | Pure model + placeholder data: worlds.mjs, world2.js, build.sh inline. Not reachable in the UI yet. | ~250 LOC + tests |
| **M2** | The world-2 map behind `?w2` / test mode: worldId state, docks, locks, encounter card, plain-node victory, gating. | ~300 LOC |
| **M3** | The four duels: BOSS entries, keeper art slots, dialogue. | ~250 LOC (mostly text) |
| **M4** | The shield + finale (CSS in retro.css). | ~200 LOC |
| **M5** | Go live: remove the flag, hint copy, `world` in tracking, CLAUDE.md notes. | small |
| **M6** | Art swap: PNGs + build.sh paths only. | art-bound |

## Tests

**test/worlds.test.mjs:**
- "All seven" plus each chapter in the colour-chord, path and Radio sections maps to exactly one world-2 node, in order.
- No id collides with 1–8.
- The graph has no cycles and every node can be reached from 101.
- Clearing 104 opens exactly 105 and 109.
- 114 stays locked with only one path done.
- The keeper nodes are the last chapter of each section.
- Every node sits on a walkable tile and every edge routes without the hop fallback.
- `routeOnGrid` on the world-1 grid gives the same routes as before (regression guard).

Also: boss.test covers the 4 new ids, and `ADV_STAGES.length === 8` stays true.

**Manual QA:**
- World 1: the sword finale, map tour, Dojo, walking, gated upsell, duels.
- A world-2 clear with world 1 at 8/8 shows **no** Excalibar finale and no grand fanfare.
- The dock hint appears before region 6 and not after.
- Locks and the locked-node toast; both path heads glow after the trunk; the Radio waits for both paths.
- All four duels win, lose and retry back to the world-2 map.
- The shield finale.
- A reload keeps the world.
- Gated flow, boring mode, reduced motion.

## Open questions

1. **"All seven" placement:** warm-up stop in world 2 for now; Jaden would rather it were on the first map. Revisit.
2. **Soundtrack:** world 2 reuses the map theme for now; its own theme later?
3. **Radio duel tuning:** 15 chords is the hardest pool in the game, so it needs play-testing.
