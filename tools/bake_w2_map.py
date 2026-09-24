#!/usr/bin/env python3
"""Bake the Outer Keys (world 2) map into one 256x416 PNG: map_w2_baked.png.

    python3 tools/bake_w2_map.py        # then ./build.sh

The game draws a baked map image under the nodes and Coda, like Harmonia's map_baked.png.
The layout comes from WORLD2.grid in src/world2.mjs, which is authored in Harmonia's tile
ids (9 water; 1/2 meadow; 3/4 marsh; 10/11 rock; 12-17 road, 18 clearing, 20 bridge) and
is also what Coda walks on, so the painted roads land exactly on the walkable cells.

Terrain: three PixelLab Wang tilesets vendored in adventure/w2_tiles/, all built on
Harmonia's muted sea tile so the two worlds' water matches:
  meadow = water -> sage meadow with a sandy shore (the very set Harmonia's coasts use)
  marsh  = water -> dusky twilight marsh            (the Vesper Isles)
  rock   = water -> grey rocky plateau              (Signal Rock)

Dual grid: each 16px Wang tile is drawn offset by half a tile, so its four corners sit on
four cell CENTRES and take those cells' terrain. Shores fall halfway between land and
water, and a one-cell sea channel stays open (a same-grid corner rule would close it).
Every tile gets Harmonia's grade (saturation x0.60, value x0.85) so both maps read alike.
Roads, clearings and bridges are then overlaid cell-aligned from Harmonia's own tileset.

Scenery (decorate): the grid's islands are rectangles, so the baker adds COSMETIC land on
water cells only — ragged coasts, a bigger Signal Rock, and a few islets in open sea. It
never touches the walk grid: bridge cells stay water, a gap between two pieces of the same
island is never filled, and two different lands always keep a sea cell between them (the
assert in bake() enforces it). The top and bottom three rows stay open sea (HUD room).
"""
import base64, colorsys, io, json, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, "adventure", "w2_tiles")
T = 16

LAND = {1: "meadow", 2: "meadow", 3: "marsh", 4: "marsh", 10: "rock", 11: "rock"}
ROAD = {12, 13, 14, 15, 16, 17, 18}
BRIDGE = 20
WATER = 9


def load_grid():
    js = "import('./src/world2.mjs').then(m => console.log(JSON.stringify(m.WORLD2.grid)))"
    out = subprocess.check_output(["node", "-e", js], cwd=ROOT)
    return json.loads(out)


def load_harmonia_tileset():
    src = open(os.path.join(ROOT, "adventure", "assets.js"), encoding="utf8").read()
    b64 = re.search(r'"tileset":"data:image/png;base64,([^"]+)"', src).group(1)
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")


def grade(img):
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r, g, b = colorsys.hsv_to_rgb(h, s * 0.60, v * 0.85)
            px[x, y] = (int(r * 255), int(g * 255), int(b * 255), a)
    return img


def tint_land(img, sea, hue, sat, val):
    """Recolour everything that isn't the shared sea: hue toward `hue`, scale sat/value."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if (r, g, b) in sea:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            h = h + (hue - h) * 0.8
            r, g, b = colorsys.hsv_to_rgb(h, min(1, s * sat), min(1, v * val))
            px[x, y] = (int(r * 255), int(g * 255), int(b * 255), a)
    return img


# The marsh set came out a heavy brown-purple; lift it toward a clear dusk blue-violet.
MARSH_TINT = dict(hue=0.70, sat=1.05, val=1.45)


def load_wang(name):
    sheet = grade(Image.open(os.path.join(TILES, name + ".png")))
    meta = json.load(open(os.path.join(TILES, name + ".json")))
    if name == "marsh":
        sea_tile = next(t["bbox"] for t in meta["tiles"] if not any(v == "upper" for v in t["corners"].values()))
        sea = {sheet.getpixel((sea_tile["x"] + x, sea_tile["y"] + y))[:3] for x in range(16) for y in range(16)}
        sheet = tint_land(sheet, sea, **MARSH_TINT)
    lut = {}
    for t in meta["tiles"]:
        c, b = t["corners"], t["bbox"]
        key = tuple(c[k] == "upper" for k in ("NW", "NE", "SW", "SE"))
        lut[key] = sheet.crop((b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))
    assert len(lut) == 16, f"{name}: expected all 16 corner combinations"
    return lut


def terrain_grid(grid):
    """Each cell's terrain. Road cells take the land they cross; bridges are water."""
    gr, gc = len(grid), len(grid[0])
    ter = [[None] * gc for _ in range(gr)]
    for r in range(gr):
        for c in range(gc):
            t = grid[r][c]
            ter[r][c] = LAND.get(t) or ("water" if t in (WATER, BRIDGE, 0) else None)
    for _ in range(4):  # roads inherit a neighbouring land (a road cell next to a road cell settles next pass)
        for r in range(gr):
            for c in range(gc):
                if ter[r][c] is not None:
                    continue
                near = [ter[r + dr][c + dc] for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
                        if 0 <= r + dr < gr and 0 <= c + dc < gc and ter[r + dr][c + dc] not in (None, "water")]
                if near:
                    ter[r][c] = max(set(near), key=near.count)
    for r in range(gr):
        for c in range(gc):
            assert ter[r][c] is not None, f"road cell ({c},{r}) touches no land"
    return ter


# Hand-placed scenery. Signal Rock grows down into the open middle so the Radio reads as a
# landmark; islets break up the open sea. (col, row, land)
ROCK_GROWTH = [(c, 6, "rock") for c in range(6, 10)] + [(7, 7, "rock"), (8, 7, "rock")]  # tapers to a point
ISLETS = [
    (7, 11, "meadow"), (8, 11, "meadow"), (7, 12, "meadow"), (8, 12, "meadow"),  # a green islet mid-sea
    (9, 14, "rock"),                                                         # a sea stack
    (13, 19, "meadow"), (14, 19, "meadow"), (13, 20, "meadow"), (14, 20, "meadow"), (14, 21, "meadow"),
    (1, 18, "rock"), (2, 18, "rock"), (1, 19, "rock"),                       # south-west rocks
]
# Hand-shaped coasts: each island gets its own bulges so none reads as a rectangle.
COASTS = (
    [(4, r, "meadow") for r in (17, 18, 19, 20)] + [(10, r, "meadow") for r in (18, 19, 20, 21)]  # Tintmouth
    + [(15, 8, "marsh"), (15, 9, "marsh"), (15, 10, "marsh"), (15, 13, "marsh"),                   # Vesper Isles
       (13, 16, "marsh"), (14, 16, "marsh"), (13, 4, "marsh"), (14, 4, "marsh"),
       (10, 10, "marsh"), (10, 11, "marsh")]
    + [(1, 13, "meadow"), (5, 10, "meadow"), (1, 8, "meadow"), (1, 7, "meadow"), (2, 3, "meadow")]  # Beacon Chain nubs
)


def decorate(ter, grid):
    gr, gc = len(ter), len(ter[0])
    inside = lambda r, c: 3 <= r < gr - 3 and 0 <= c < gc
    def other_land_near(r, c, land):
        return any(ter[r + dr][c + dc] not in ("water", land)
                   for dr in (-1, 0, 1) for dc in (-1, 0, 1)
                   if 0 <= r + dr < gr and 0 <= c + dc < gc)
    def ok(r, c, land):
        return (inside(r, c) and ter[r][c] == "water" and grid[r][c] != BRIDGE
                and not other_land_near(r, c, land))
    for c, r, land in ROCK_GROWTH + ISLETS:
        if ok(r, c, land):
            ter[r][c] = land
    def near(r, c, land):  # same-land cells among the 8 neighbours
        return sum(ter[r + dr][c + dc] == land for dr in (-1, 0, 1) for dc in (-1, 0, 1)
                   if (dr or dc) and 0 <= r + dr < gr and 0 <= c + dc < gc)
    def orth(r, c):
        return [ter[r + dr][c + dc] if 0 <= r + dr < gr and 0 <= c + dc < gc else "water"
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1))]
    for c, r, land in COASTS:
        if ok(r, c, land):
            ter[r][c] = land
    # smoothing: fill any notch that's mostly surrounded by one land
    for _ in range(2):
        for r in range(gr):
            for c in range(gc):
                if ter[r][c] != "water":
                    continue
                n = orth(r, c)
                for land in {x for x in n if x != "water"}:
                    if (n[0] == land and n[1] == land) or (n[2] == land and n[3] == land):
                        continue
                    if near(r, c, land) >= 5 and ok(r, c, land):
                        ter[r][c] = land
                        break
    return ter


def bake():
    grid = load_grid()
    gr, gc = len(grid), len(grid[0])
    ter = decorate(terrain_grid(grid), grid)
    sets = {n: load_wang(n) for n in ("meadow", "marsh", "rock")}
    at = lambda r, c: ter[r][c] if 0 <= r < gr and 0 <= c < gc else "water"

    out = Image.new("RGBA", (gc * T, gr * T))
    for j in range(gr + 1):
        for i in range(gc + 1):
            corners = (at(j - 1, i - 1), at(j - 1, i), at(j, i - 1), at(j, i))
            lands = {x for x in corners if x != "water"}
            assert len(lands) <= 1, f"two lands meet at vertex ({i},{j}): {lands} — leave a sea cell between them"
            land = lands.pop() if lands else "meadow"   # all-water: every set shares Harmonia's sea tile
            tile = sets[land][tuple(x == land for x in corners)]
            out.alpha_composite(tile, (i * T - T // 2, j * T - T // 2)) if 0 <= i * T - T // 2 and 0 <= j * T - T // 2 \
                else out.paste(tile, (i * T - T // 2, j * T - T // 2), tile)

    hts = load_harmonia_tileset()
    for r in range(gr):
        for c in range(gc):
            t = grid[r][c]
            if t in ROAD or t == BRIDGE:
                tile = hts.crop(((t % 8) * T, (t // 8) * T, (t % 8) * T + T, (t // 8) * T + T))
                out.alpha_composite(tile, (c * T, r * T))

    path = os.path.join(ROOT, "map_w2_baked.png")
    out.save(path)
    print(f"wrote {path} ({out.width}x{out.height})")


if __name__ == "__main__":
    sys.exit(bake())
