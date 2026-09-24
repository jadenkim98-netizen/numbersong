// Numbersong — the Outer Keys (world 2) data. Pure data, no window: bundled into the app by
// esbuild and imported straight by the tests. See WORLD2_PLAN.md.
//
// PLACEHOLDER MAP: the grid is authored in Harmonia's own tile indices (its tileset and
// legend) so the world is playable before its art exists. The final island map is a
// 256×416 baked PNG that must keep path tiles on exactly these walkable cells.
// Layout: the landing and Tintmouth (south) → fork → the Beacon Chain (west) and the
// Vesper Isles (east) → Signal Rock (north), where both chains meet.

export const WORLD2 = {
  id: 2,
  name: "THE OUTER KEYS",
  tile: 16, gc: 16, gr: 26,
  // Harmonia tile ids: 9 water, 1/2 grass, 3/4 fen, 10/11 rock, 12–17 road, 18 clearing, 20 bridge
  grid: [[9, 9, 9, 9, 9, 11, 10, 11, 10, 10, 11, 9, 9, 9, 9, 9], [9, 9, 9, 20, 20, 12, 12, 18, 12, 12, 12, 20, 20, 9, 9, 9], [9, 9, 1, 13, 1, 10, 10, 10, 10, 10, 10, 9, 20, 9, 9, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 18, 3, 4, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 4, 13, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 4, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 18, 4, 3, 9], [9, 9, 9, 20, 9, 2, 2, 2, 2, 2, 9, 3, 13, 3, 3, 9], [9, 9, 9, 20, 9, 2, 2, 18, 2, 2, 9, 9, 20, 9, 9, 9], [9, 9, 9, 20, 20, 12, 12, 14, 12, 12, 20, 20, 20, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 13, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 18, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 13, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 13, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 18, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 13, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 13, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 18, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 1, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]],
  // Where you step off the boat, and the dock that sails you home.
  dock: { c: 7, r: 25 },
  // Each node plays one progression chapter (by name; see W2_CHAPTERS in worlds.mjs).
  // `section` picks the keeper whose voice the node speaks in.
  nodes: [
    { id: 101, c: 7, r: 23, section: "warmup", name: "WARMWATER LANDING", mood: "coast",  emblem: "⚓", sub: "Warm-up · all seven" },
    { id: 102, c: 7, r: 20, section: "trunk",  name: "DYEHOUSE ROW",      mood: "major",  emblem: "🧺", sub: "Colour · 3D" },
    { id: 103, c: 7, r: 17, section: "trunk",  name: "INDIGO STEPS",      mood: "minor",  emblem: "🫙", sub: "Colour · 4-" },
    { id: 104, c: 7, r: 14, section: "trunk",  name: "TINTMOUTH HARBOUR", mood: "major",  emblem: "🎨", sub: "Colour · 3D and 4-" },
    { id: 105, c: 3, r: 12, section: "pathA",  name: "FIRST LIGHT",       mood: "coast",  emblem: "🕯", sub: "Beacon · 1D" },
    { id: 106, c: 3, r: 9,  section: "pathA",  name: "SECOND BEAM",       mood: "coast",  emblem: "🔦", sub: "Beacon · 2D" },
    { id: 107, c: 3, r: 6,  section: "pathA",  name: "LANTERN REEF",      mood: "coast",  emblem: "🏮", sub: "Beacon · 6D" },
    { id: 108, c: 3, r: 3,  section: "pathA",  name: "THE GREAT LAMP",    mood: "coast",  emblem: "🗼", sub: "Beacon · all four" },
    { id: 109, c: 12, r: 12, section: "pathB", name: "DUSKWATER",         mood: "minor",  emblem: "🌆", sub: "Vesper · ♭7" },
    { id: 110, c: 12, r: 10, section: "pathB", name: "MOONWELL",          mood: "minor",  emblem: "🌕", sub: "Vesper · ♭6" },
    { id: 111, c: 12, r: 8,  section: "pathB", name: "LOW TIDE",          mood: "minor",  emblem: "🌊", sub: "Vesper · ♭3" },
    { id: 112, c: 12, r: 6,  section: "pathB", name: "SHADE HOLLOW",      mood: "minor",  emblem: "🌑", sub: "Vesper · 2-7♭5" },
    { id: 113, c: 12, r: 4,  section: "pathB", name: "VESPER ISLE",       mood: "minor",  emblem: "🌙", sub: "Vesper · all five" },
    { id: 114, c: 7, r: 1,  section: "radio",  name: "SIGNAL ROCK",       mood: "forge",  emblem: "📻", sub: "The Radio · every chord" },
  ],
  // One keeper per section. Plain nodes speak in their section keeper's voice; only the
  // keeper's own node (the section capstone) is a duel and paints a shield quarter.
  keepers: {
    warmup: {
      keeper: "Ochre, the Dyer", short: "Ochre", emblem: "🎨",
      greet: "Off the boat already? Good. Before I show you my vats, name the seven colours the key already owns — every one of them, in any order. Then we'll talk about the two it borrows.",
    },
    trunk: {
      keeper: "Ochre, the Dyer", short: "Ochre", emblem: "🎨",
      greet: "Two drops from outside the key, and the whole song changes colour. Watch the vats — then tell me which one I tipped in.",
      winTitle: "Ochre's colour earned!",
      win: "Three and four, dyed and plain, and you called every vat. The harbour's yours — now pick a chain.",
      lore: "Ochre has dyed songs at Tintmouth since before the boats had names, stirring two vats most travellers walk straight past: one that turns the 3 chord dominant, one that darkens the 4. A drop of either changes a whole song's colour, she says, and the trick is only ever noticing which. To those who can, she paints the teal quarter of the Colour Guard — the first colour, and the one every other stands beside.",
    },
    pathA: {
      keeper: "Lumen, the Lamplighter", short: "Lumen", emblem: "🗼",
      greet: "Every light out here points somewhere. Hear the beam lean, and you'll know which island it's calling home.",
      winTitle: "Lumen's colour earned!",
      win: "Light to light to light, and you never lost the beam. Every chord's a five of something — you hear where it's pointing now.",
      lore: "Lumen tends the Beacon Chain, a string of lamps built so that each one's beam falls on the next island along — the one it wants to land on. A 1 lit dominant shines on 4; a 2 lit dominant shines on 5. Follow the chain and you follow the song. Lumen keeps the gold quarter of the Colour Guard, warm as lamplight, for travellers who can read the beams.",
    },
    pathB: {
      keeper: "Vesper, the Moon-Borrower", short: "Vesper", emblem: "🌙",
      greet: "The major sun is bright, but it's short a few shades. I borrow the rest from the moon. Don't worry — it never asks for them back.",
      winTitle: "Vesper's colour earned!",
      win: "Flat seven, flat six, flat three, and the minor's own two. You spent the whole night borrowing and never once got lost.",
      lore: "Vesper lives where the islands turn to dusk, and every evening borrows colours from the minor moon: a flat seven for the walk home, a flat six to make a chorus ache, a flat three for a little swagger. Nothing is stolen, Vesper insists — everything goes back by morning. The blue quarter of the Colour Guard is Vesper's to give, cool as the moon it came from.",
    },
    radio: {
      keeper: "Wren, the Operator", short: "Wren", emblem: "📻",
      greet: "Every song on every station, all at once. The lamplighter's lights and the moon's colours are all out there in the static. Name them for me.",
      winTitle: "The Colour Guard is whole!",
      win: "Four colours, one guard. Go on — turn on any radio in Harmonia. You'll hear the chords now.",
      lore: "Wren keeps the old tower on Signal Rock, where the Beacon Chain and the Vesper Isles finally meet, and tunes its dial through every station the sea can carry. Songs arrive here with all their colours at once — borrowed, dominant, plain — and Wren listens until each one has a name. The last quarter of the Colour Guard hangs in the tower, waiting for ears that can hear the whole radio.",
    },
  },
  // The shield: four quarters, one per keeper node (the section capstones).
  shield: {
    name: "THE COLOUR GUARD",
    quarters: { 104: "Teal quarter", 108: "Gold quarter", 113: "Blue quarter", 114: "Crimson quarter" },
  },
};
