// Numbersong — the Outer Keys (world 2) data. Pure data, no window: bundled into the app by
// esbuild and imported straight by the tests. See WORLD2_PLAN.md.
//
// PLACEHOLDER MAP: the grid is authored in Harmonia's own tile indices (its tileset and
// legend) so the world is playable before its art exists. The final island map is a
// 256×416 baked PNG that must keep path tiles on exactly these walkable cells.
// Layout: the landing and Tintmouth (south) → fork → the Beacon Chain (west) and the
// Vesper Isles (east) → Signal Rock (north), where both chains meet. The top three rows
// are open sea on purpose: headroom above the highest point, under the map's header.

export const WORLD2 = {
  id: 2,
  name: "THE OUTER KEYS",
  tile: 16, gc: 16, gr: 26,
  // Harmonia tile ids: 9 water, 1/2 grass, 3/4 fen, 10/11 rock, 12–17 road, 18 clearing, 20 bridge
  grid: [[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 11, 10, 11, 10, 10, 11, 9, 9, 9, 9, 9], [9, 9, 9, 20, 20, 12, 12, 18, 12, 12, 12, 20, 20, 9, 9, 9], [9, 9, 1, 13, 1, 10, 10, 10, 10, 10, 10, 9, 20, 9, 9, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 18, 3, 4, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 4, 13, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 4, 9], [9, 9, 9, 20, 9, 9, 9, 9, 9, 9, 9, 3, 18, 3, 3, 9], [9, 9, 1, 13, 1, 9, 9, 9, 9, 9, 9, 3, 13, 3, 3, 9], [9, 9, 1, 18, 1, 9, 9, 9, 9, 9, 9, 3, 18, 4, 3, 9], [9, 9, 9, 20, 9, 2, 2, 2, 2, 2, 9, 3, 13, 3, 3, 9], [9, 9, 9, 20, 9, 2, 2, 18, 2, 2, 9, 9, 20, 9, 9, 9], [9, 9, 9, 20, 20, 12, 12, 14, 12, 12, 20, 20, 20, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 13, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 2, 2, 18, 2, 2, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 13, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 18, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 13, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 1, 1, 18, 1, 1, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]],
  // Where you step off the boat, and the dock that sails you home.
  dock: { c: 7, r: 25 },
  // Each node plays one progression chapter (by name; see W2_CHAPTERS in worlds.mjs).
  // `section` picks the keeper who walks you through it; `greet` is that keeper's line for
  // THIS stop — about its own chord — so a section's keeper travels with you island to
  // island instead of repeating one greeting. The capstone's line leads into the duel.
  nodes: [
    { id: 101, c: 7, r: 24, section: "warmup", name: "WARMWATER LANDING", mood: "coast",  emblem: "⚓", sub: "Warm-up · all seven",
      greet: "Off the boat already? Good. Before I show you my vats, name the seven colours the key already owns — every one of them, in any order. Then we'll talk about the two it borrows." },
    { id: 102, c: 7, r: 22, section: "trunk",  name: "DYEHOUSE ROW",      mood: "major",  emblem: "🧺", sub: "Colour · 3D",
      greet: "First vat: the 3 chord, dyed dominant. One note climbs — its 5 rises to ♯5 — and the whole chord starts leaning toward 6. Hear the lean, and you've found 3D." },
    { id: 103, c: 7, r: 20, section: "trunk",  name: "INDIGO STEPS",      mood: "minor",  emblem: "🫙", sub: "Colour · 4-",
      greet: "Second vat: the 4 chord, darkened. Same root, same bass — only its 6 sinks to ♭6. One voice falling a half step, and the 4 turns bittersweet. That's 4-, borrowed from minor." },
    { id: 104, c: 7, r: 17, section: "trunk",  name: "TINTMOUTH HARBOUR", mood: "major",  emblem: "🎨", sub: "Colour · 3D and 4-",
      greet: "Both vats open now. 3 or 3D, 4 or 4- — I'll tip them in any order I please. Name every drop and my colour's yours. Miss one, and you're scrubbing vats till dawn." },
    { id: 105, c: 3, r: 15, section: "pathA",  name: "FIRST LIGHT",       mood: "coast",  emblem: "🕯", sub: "Beacon · 1D",
      greet: "This lamp is home itself, with a ♭7 lit inside it. Watch where the beam falls — straight on the 4. That's 1D: home, turned to face the door." },
    { id: 106, c: 3, r: 12,  section: "pathA",  name: "SECOND BEAM",       mood: "coast",  emblem: "🔦", sub: "Beacon · 2D",
      greet: "The 2 chord, lit major, with a ♭7 on top. Its ♯4 is 5's leading tone, so this beam lands on 5 — and 5 lands you home. Two lights in a row, pointing the same way." },
    { id: 107, c: 3, r: 9,  section: "pathA",  name: "LANTERN REEF",      mood: "coast",  emblem: "🏮", sub: "Beacon · 6D",
      greet: "Out on the reef, the 6 chord burns major. Its ♯1 leans into 2 — follow the beam: 6D, 2, 5, 1. The oldest road home in ragtime." },
    { id: 108, c: 3, r: 6,  section: "pathA",  name: "THE GREAT LAMP",    mood: "coast",  emblem: "🗼", sub: "Beacon · all four",
      greet: "Every lamp in the chain, lit at once — 1D, 2D, 3D, 6D, beams falling on beams. Follow each one to where it lands, and the gold is yours." },
    { id: 109, c: 12, r: 15, section: "pathB", name: "DUSKWATER",         mood: "minor",  emblem: "🌆", sub: "Vesper · ♭7",
      greet: "First borrowing of the night: a major chord a whole step below home. It walks you home like 5D does, only softer — no leading tone, just a long exhale. ♭7 to 1." },
    { id: 110, c: 12, r: 13, section: "pathB", name: "MOONWELL",          mood: "minor",  emblem: "🌕", sub: "Vesper · ♭6",
      greet: "Lower a bucket in the moonwell and up comes ♭6 — big and bright, with a little ache in it. It climbs through ♭7 and lands home. You've heard it at the end of every level you ever cleared." },
    { id: 111, c: 12, r: 11,  section: "pathB", name: "LOW TIDE",          mood: "minor",  emblem: "🌊", sub: "Vesper · ♭3",
      greet: "When the tide goes out, the 3 chord comes back major and flat. Where 3- sighs, ♭3 swaggers — and it nearly always steps up to 4." },
    { id: 112, c: 12, r: 9,  section: "pathB", name: "SHADE HOLLOW",      mood: "minor",  emblem: "🌑", sub: "Vesper · 2-7♭5",
      greet: "The minor key's own 2: your 2- with its 6 sunk to ♭6. Darker than any 2 you know, and it leans on 5D twice as hard. That's 2-7♭5." },
    { id: 113, c: 12, r: 7,  section: "pathB", name: "VESPER ISLE",       mood: "minor",  emblem: "🌙", sub: "Vesper · all five",
      greet: "Every colour I've borrowed, all out at once — ♭7, ♭6, ♭3, 4-, the minor's 2. Name them before morning and the blue is yours to keep." },
    { id: 114, c: 7, r: 4,  section: "radio",  name: "SIGNAL ROCK",       mood: "forge",  emblem: "📻", sub: "The Radio · every chord",
      greet: "Every song on every station, all at once. The lamplighter's lights and the moon's colours are all out there in the static. Name them for me." },
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
