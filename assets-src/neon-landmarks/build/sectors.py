"""The harbour and oldtown pieces of the 10 km Neon lap (2026-11-15). Same axes and conventions as pieces.py:
metres, +X = the driver's right, +Y = the driving direction, +Z = up; spanning pieces keep everything closer than
their clear half to the centre line above their clear height (build.py PLACEMENT, asset-brief.md).

No concept frame shows these sectors: palette, wet night and detail follow frames 05 (warm market lanterns) and
06 (waterfront). Sizes are inferred from real port and old-town forms; none copies a real crane, ship line,
monument, brand or logo, and the gate plaque carries invented glyphs.
"""
import math
import random

# ---------------------------------------------------------------- harbour

GAUGE = 17.0       # crane leg centre lines from the road centre: a 34 m rail gauge (real ship-to-shore cranes: 30 to 35)
LEG_Y = 9.0        # legs 18 m apart along the rail
PORTAL = 22.0      # underside of the portal beams: the clear height over the road
BOOM = 44.0        # underside of the boom; it reaches 57 m out over the water (+X) and 21 m back over the land
CELL = (2.5, 12.3, 2.6)   # container pitch: the `containers` material gives each cell one paint (materials.PALETTE)


def harbour_gantry(b):
    """Ship-to-shore container crane straddling the road like a gate. Mirrored across y = 0 (front and back legs);
    the boom side is not mirrored: outreach over +X. A cyan strip outlines the portal facing each way."""
    for side in (-1, 1):
        x = side * GAUGE
        xs = lambda a, c: sorted((x + side * a, x + side * c))
        b.box("concrete", (x - 1.4, x + 1.4), (0, 16), (-8, 0), skip="-z", pri=0.25)            # crane rail beam on piles
        b.box("steel_bare", (x - 0.1, x + 0.1), (0, 16), (0, 0.18), swatch=True, skip="-z")
        for y in (LEG_Y - 2.2, LEG_Y + 2.2):                                                     # bogie trucks
            b.box("steel_dark", (x - 0.9, x + 0.9), (y - 1.6, y + 1.6), (0.18, 1.4), swatch=True, lod=(0, 0), skip="-z")
        b.box("crane", (x - 0.8, x + 0.8), (0, LEG_Y + 3.6), (1.4, 3.2), skip="-z", pri=0.4)      # sill beam
        b.box("crane", (x - 0.9, x + 0.9), (LEG_Y - 0.9, LEG_Y + 0.9), (3.2, PORTAL), skip="-z+z", pri=0.4)
        for z0, z1 in ((12.5, 4.0), (12.5, 21.0)):                                               # X brace in the leg plane
            b.cyl("crane", (x, 0, z0), (x, LEG_Y - 0.9, z1), 0.35, n=6, caps=False, swatch=True, lod=(0, 0))
            b.cyl("crane", (x, 0, z0), (x, LEG_Y - 0.9, z1), 0.4, n=4, caps=False, swatch=True, lod=(1, 1))
        b.box("cyan", xs(-0.94, -0.9), (LEG_Y + 0.5, LEG_Y + 0.8), (3.4, PORTAL), only="-x" if side > 0 else "+x", swatch=True)
        b.hull("crane", [(x + dx, y + dy, z) for dx in (-0.8, 0.8) for dy in (-0.8, 0.8) for y, z in ((LEG_Y, PORTAL + 2.6),)]
               + [(x + dx, 4.0 + dy, BOOM) for dx in (-0.7, 0.7) for dy in (-0.7, 0.7)], pri=0.4)  # upper leg leans in to the boom
        for xc in (side * 12, side * 4):                                                         # floodlights over the road
            b.box("steel_dark", (xc - 0.5, xc + 0.5), (LEG_Y - 0.4, LEG_Y + 0.4), (PORTAL - 0.3, PORTAL), swatch=True)
            b.box("amber", (xc - 0.45, xc + 0.45), (LEG_Y - 0.35, LEG_Y + 0.35), (PORTAL - 0.34, PORTAL - 0.3), only="-z", swatch=True)
    b.box("crane", (-GAUGE - 0.9, GAUGE + 0.9), (LEG_Y - 0.8, LEG_Y + 0.8), (PORTAL, PORTAL + 2.6), pri=0.4)
    b.box("cyan", (-GAUGE + 0.9, GAUGE - 0.9), (LEG_Y + 0.8, LEG_Y + 0.84), (PORTAL + 0.15, PORTAL + 0.45), only="+y", swatch=True)
    for x0, x1 in ((-38, -10), (-10, 18), (18, 46), (46, 74)):                                   # boom girders, in atlas-sized runs
        b.box("crane", (x0, x1), (3.2, 4.8), (BOOM, BOOM + 3.6), skip="-x" * (x0 > -38) + "+x" * (x1 < 74), pri=0.3)
    for xc in (-30, -10, 10, 30, 50, 70):
        b.box("crane", (xc - 0.4, xc + 0.4), (0, 3.2), (BOOM + 0.4, BOOM + 1.2), swatch=True)
    b.box("deckhouse", (-38, -24), (0, 5.2), (BOOM + 3.6, BOOM + 9.6), pri=0.45)                  # machinery house
    b.box("window", (-36, -26), (5.2, 5.24), (BOOM + 6.4, BOOM + 7.2), only="+y", swatch=True)
    top = (8.0, 2.2, 75.0)
    for foot in ((GAUGE, 4.0, BOOM + 3.6), (-GAUGE, 4.0, BOOM + 3.6)):                            # apex A-frame
        b.cyl("crane", foot, top, 0.6, n=6, caps=False, swatch=True)
    b.box("crane", (6.5, 9.5), (0, 2.8), (73.5, 76.5), swatch=True)
    b.box("neon_red", (7.6, 8.4), (0, 0.4), (76.5, 77.0), swatch=True)                            # obstruction lamp
    for end in ((73, 4.0, BOOM + 3.6), (45, 4.0, BOOM + 3.6), (-36, 4.0, BOOM + 3.6)):            # stays
        b.cyl("steel_bare", (8.0, 2.0, 75.0), end, 0.12, n=4, caps=False, swatch=True, lod=(0, 0))
        b.cyl("steel_bare", (8.0, 2.0, 75.0), end, 0.16, n=3, caps=False, swatch=True, lod=(1, 1))
    b.box("neon_red", (73.4, 74.0), (3.7, 4.3), (BOOM + 3.6, BOOM + 4.0), swatch=True)
    b.box("steel_dark", (36, 42), (0, 5.6), (BOOM - 1.8, BOOM), swatch=True)                     # trolley, cab, hoist, spreader
    b.box("deckhouse", (32.8, 36), (2.0, 5.0), (BOOM - 4.6, BOOM - 1.8), swatch=True)
    b.box("window", (32.76, 32.8), (2.3, 4.7), (BOOM - 3.8, BOOM - 2.4), only="-x", swatch=True)
    for xc in (37.6, 40.4):
        b.cyl("steel_bare", (xc, 2.6, BOOM - 1.8), (xc, 2.6, 26.0), 0.06, n=3, caps=False, swatch=True, lod=(0, 0))
    b.box("steel_dark", (37.8, 40.2), (0, 6.1), (25.2, 26.0), swatch=True)
    for xc in (24, 52, 70):                                                                      # boom floodlights over the ship
        b.box("amber", (xc - 0.5, xc + 0.5), (3.5, 4.5), (BOOM - 0.04, BOOM), only="-z", swatch=True)


def _containers(b, x0, y0, z0, nx, nz, pri, skip=""):
    """A block nx containers wide (x) and nz high, one bay (12 m) long, its corner on the cell lattice."""
    b.box("containers", (x0 * CELL[0] + 0.02, (x0 + nx) * CELL[0] - 0.02), (y0 * CELL[1] + 0.15, (y0 + 1) * CELL[1] - 0.15),
          (z0 * CELL[2] + 0.005, (z0 + nz) * CELL[2] - 0.005), skip="-z" + skip, pri=pri, mirror="")


STACK = ((3, 4), (4, 2), (2, 3), (1, 4))   # tiers per row (from the road, -X) and bay (-Y, +Y): a stepped skyline
REEFERS = ((0, 0, 1), (2, 0, 0), (1, 1, 1), (3, 1, 3))   # (row, bay, tier) of the refrigerated containers


def container_stack(b):
    """Quay block: 4 rows x 2 bays of 40 ft containers, 1 to 4 high, on its own colours per container. Not
    mirrored; pivot at the centre of the 10 x 24.3 m footprint on the quay, -X toward the road."""
    rows = len(STACK)
    tiers = lambda r, k: STACK[r][k] if 0 <= r < rows and 0 <= k < 2 else 0
    for r in range(rows):
        for k in range(2):
            for t in range(tiers(r, k)):
                skip = "+z" * (t < tiers(r, k) - 1) + "-x" * (tiers(r - 1, k) > t) + "+x" * (tiers(r + 1, k) > t)
                _containers(b, r - rows // 2, k - 1, t, 1, 1, 0.45, skip)
    for r, k, t in REEFERS:                                           # reefer status panels on the outer bay ends
        x, y, z = (r - rows // 2 + 0.5) * CELL[0], (2 * k - 1) * (CELL[1] - 0.15), (t + 0.7) * CELL[2]
        out = 0.03 * (2 * k - 1)
        b.box("amber", (x - 0.3, x + 0.3), sorted((y, y + out)), (z - 0.15, z + 0.15), only="+y" if k else "-y", swatch=True, mirror="")


SHIP = ((-74.0, 10.5, -0.12, 11.0), (-70.0, 11.6, -0.06, 10.8), (-60.0, 12.0, 0, 10.5), (40.0, 12.0, 0, 10.5), (52.0, 11.3, 0.05, 10.8),
        (60.0, 9.4, 0.12, 11.3), (66.0, 6.6, 0.2, 11.9), (70.0, 3.8, 0.28, 12.4), (72.5, 1.4, 0.34, 12.7), (74.0, 0.25, 0.38, 12.9))
BAYS = ((4, 3), (5, 5), (3, 4), (5, 4), (4, 5), (2, 3), (4, 4), (3, 2))   # container tiers per bay, port and starboard half


def deck(y):
    """Deck height at y, read off the hull stations."""
    for (y0, _, _, z0), (y1, _, _, z1) in zip(SHIP, SHIP[1:]):
        if y0 <= y <= y1:
            return z0 + (z1 - z0) * (y - y0) / (y1 - y0)
    return SHIP[-1][3]


def cargo_ship(b):
    """Moored container ship, 150 m, 24 m beam; pivot at the waterline mid-length, bow to +Y. Mirrored across x = 0
    except the cargo, which is loaded unevenly. Deck lamps every bay, lit windows, dark bridge glass."""
    rings = []
    for y0, w, rake, top in SHIP:                                     # half section, keel to deck centre line
        rings.append([(x, y0 + rake * (z + 3), z) for x, z in ((0, -3), (0.85 * w, -3), (w, -1.4), (w, 0.6), (w, top), (0, top))])
    b.loft([None, None, "hull_red", "hull", "steel_dark"], rings, cap="hull", pri=0.18)   # no bottom: always under water
    for c, (port, starboard) in zip(range(-4, 4), BAYS):
        _containers(b, -4, c, 4, 4, port, 0.18)
        _containers(b, 0, c, 4, 4, starboard, 0.18)
    b.box("deckhouse", (0, 9.5), (-66, -54), (10.5, 27.0), skip="-z", pri=0.4)                   # accommodation
    b.box("deckhouse", (0, 8.0), (-64, -55), (27.0, 30.0), skip="-z", pri=0.4)
    b.box("deckhouse", (0, 13.0), (-56.5, -52.5), (27.0, 30.0), pri=0.4)                         # bridge and its wings
    b.box("glass", (0, 12.6), (-52.5, -52.46), (28.0, 29.4), only="+y", swatch=True)
    rng = random.Random(15)
    for k in range(5):
        z = 12.6 + 2.8 * k
        for x in (1.5, 3.7, 5.9, 8.1):
            b.box("window" if rng.random() < 0.6 else "glass", (x - 0.6, x + 0.6), (-54, -53.96), (z, z + 1.1), only="+y", swatch=True)
        for y in (-64.5, -62.2, -59.9, -57.6, -55.3):
            b.box("window" if rng.random() < 0.6 else "glass", (9.5, 9.54), (y - 0.6, y + 0.6), (z, z + 1.1), only="+x", swatch=True)
    b.box("hull", (0, 2.6), (-71, -64), (27.0, 37.0), skip="-z", pri=0.4)                         # funnel
    b.box("amber", (5.5, 6.5), (-52.44, -52.4), (26.4, 26.9), only="+y", swatch=True)             # floodlight on the cargo
    for x, y, z0, z1 in ((0, -58.0, 30.0, 40.0), (0, 67.0, deck(67.0), 21.0)):                    # masts
        b.cyl("steel_dark", (x, y, z0), (x, y, z1), 0.25, n=6, swatch=True, mirror="")
        b.box("window", (-0.3, 0.3), (y - 0.3, y + 0.3), (z1, z1 + 0.5), swatch=True, mirror="")
    b.box("neon_red", (-0.2, 0.2), (-58.2, -57.8), (40.5, 40.8), swatch=True, mirror="")
    for c in range(-4, 5):                                                                       # deck lamp posts at the bay gaps
        y = c * CELL[1]
        b.cyl("steel_dark", (11.3, y, deck(y)), (11.3, y, deck(y) + 4.0), 0.08, n=4, caps=False, swatch=True, lod=(0, 0))
        b.box("amber", (10.95, 11.65), (y - 0.25, y + 0.25), (deck(y) + 4.0, deck(y) + 4.4), swatch=True)


# ---------------------------------------------------------------- oldtown

PIER_X = 14.6       # inner face of the gate piers
ARCH = (10.0, 13.8, 4.6, 2.6)   # arch corner: centre x, z and radii; it meets the pier at 13.8 m and the beam at 16.4 m


def _lantern(b, x, y, z, scale=1.0, mirror=None):
    """Paper lantern hanging from (x, y, z): cord, lacquer caps, a warm glowing body and a short tassel."""
    r, h = 0.4 * scale, 0.42 * scale
    kw = dict(swatch=True) if mirror is None else dict(swatch=True, mirror=mirror)
    b.cyl("steel_dark", (x, y, z), (x, y, z - 0.35), 0.015, n=3, caps=False, lod=(0, 0), **kw)
    top, mid, low = z - 0.43, z - 0.43 - h, z - 0.43 - 2 * h
    b.cyl("lacquer", (x, y, z - 0.35), (x, y, top), 0.17 * scale, n=6, lod=(0, 0), **kw)
    b.cyl("lantern", (x, y, top), (x, y, mid), 0.22 * scale, r1=r, n=6, caps=False, lod=(0, 0), **kw)
    b.cyl("lantern", (x, y, mid), (x, y, low), r, r1=0.22 * scale, n=6, caps=False, lod=(0, 0), **kw)
    b.cyl("lacquer", (x, y, low), (x, y, low - 0.08), 0.17 * scale, n=6, lod=(0, 0), **kw)
    b.cyl("lacquer", (x, y, low - 0.08), (x, y, low - 0.38), 0.06, r1=0.02, n=4, caps=False, lod=(0, 0), **kw)
    b.cyl("lantern", (x, y, z - 0.35), (x, y, mid), 0.18 * scale, r1=r * 0.9, n=4, caps=False, lod=(1, 1), **kw)
    b.cyl("lantern", (x, y, mid), (x, y, low - 0.08), r * 0.9, r1=0.18 * scale, n=4, caps=False, lod=(1, 1), **kw)
    return low - 0.38


def _arc(n=8):
    cx, cz, rx, rz = ARCH
    return [(cx + rx * math.cos(a), cz + rz * math.sin(a)) for a in (math.pi / 2 * i / n for i in range(n + 1))]


def oldtown_gate(b):
    """Sector entry gate: dark stone piers, lacquered tie beam and lintel, a tiled roof with lifted ends, arched
    corner brackets. A red neon tube runs up each pier, round the arch and along the beam, front and back, so the
    opening reads as one glowing arch. Plaque with an invented glyph in amber. Mirrored across x = 0."""
    b.box("stone", (14.2, 17.4), (-1.6, 1.6), (-0.2, 1.4), skip="-z", pri=0.7)
    b.box("stone", (PIER_X, 17.0), (-1.2, 1.2), (1.4, 17.6), skip="-z+z", pri=0.6)
    b.box("stone", (14.3, 17.3), (-1.5, 1.5), (17.6, 18.2), pri=0.6)
    b.box("lacquer", (0, 17.6), (-0.7, 0.7), (16.4, 17.6), pri=0.6)
    b.box("lacquer", (0, 19.8), (-0.8, 0.8), (18.2, 19.4), pri=0.6)
    for x in (5.0, 10.0):
        b.box("lacquer", (x - 0.3, x + 0.3), (-0.5, 0.5), (17.6, 18.2), swatch=True)
    arc = _arc()
    b.prism("lacquer", arc + [(PIER_X, 16.4)], -0.5, 0.5, axis="y", pri=0.6)                   # arched bracket
    for y in (-1, 1):
        face = "-y" if y < 0 else "+y"
        radial = list(zip(arc, (math.pi / 2 * i / 8 for i in range(9))))   # a 14 cm tube along the arch edge
        b.prism("neon_red", [(x + 0.07 * math.cos(a), z + 0.07 * math.sin(a)) for (x, z), a in radial]
                + [(x - 0.07 * math.cos(a), z - 0.07 * math.sin(a)) for (x, z), a in reversed(radial)],
                y * 0.5, y * 0.56, axis="y", only=face, swatch=True)
        b.box("neon_red", (PIER_X - 0.06, PIER_X), sorted((y * 0.95, y * 1.1)), (1.6, ARCH[1]), only="-x", swatch=True)
        b.box("neon_red", (0, ARCH[0]), sorted((y * 0.7, y * 0.76)), (16.4, 16.52), only=face, swatch=True)
        b.box("lacquer", (0, 2.4), sorted((y * 0.85, y * 1.0)), (16.6, 19.2), skip="-x", pri=0.6)  # plaque
        for x, z in (((0, 0.07), (17.0, 18.9)), ((0, 1.5), (18.5, 18.62)), ((0.35, 1.2), (17.75, 17.87)),
                     ((1.2, 1.3), (17.2, 18.5)), ((0.6, 0.78), (17.25, 17.43))):                     # invented glyph
            b.box("amber", x, sorted((y * 1.0, y * 1.04)), z, only=face, swatch=True)
    lift = lambda x: 1.1 * (x / 21.0) ** 3
    rings = [[(x, -2.6, 19.3 + lift(x)), (x, -2.6, 19.6 + lift(x)), (x, 0, 21.3 + 0.6 * lift(x)), (x, 2.6, 19.6 + lift(x)), (x, 2.6, 19.3 + lift(x))]
             for x in (0, 5, 10, 14, 17.5, 21.0)]
    b.loft(["lacquer", "roof_tile", "roof_tile", "lacquer", "steel_dark"], rings, closed=True, cap="lacquer", pri=0.6)
    _lantern(b, 18.9, 0, 18.2, scale=1.3)


POLE_X = 15.0


def lantern_span(b):
    """A string of paper lanterns between two cast-iron poles, sagging to 15.9 m over the centre line: instanced
    through the S-bends. Warm light against the cyan and violet of the rest of the lap. Mirrored across x = 0."""
    b.cyl("steel_dark", (POLE_X, 0, 0), (POLE_X, 0, 1.0), 0.32, n=8, swatch=True)
    b.cyl("steel_dark", (POLE_X, 0, 1.0), (POLE_X, 0, 17.4), 0.14, r1=0.1, n=8, caps=False, swatch=True, lod=(0, 0))
    b.cyl("steel_dark", (POLE_X, 0, 1.0), (POLE_X, 0, 17.4), 0.14, r1=0.1, n=5, caps=False, swatch=True, lod=(1, 1))
    b.cyl("steel_dark", (POLE_X, 0, 17.4), (POLE_X, 0, 18.2), 0.2, r1=0.02, n=6, swatch=True)
    b.cyl("steel_dark", (POLE_X, 0, 17.0), (14.2, 0, 17.2), 0.05, n=4, caps=False, swatch=True)
    sag = lambda x: 15.9 + 1.3 * (x / 14.2) ** 2
    xs = [0, 3, 6, 9, 12, 14.2]
    for x0, x1 in zip(xs, xs[1:]):
        b.cyl("steel_bare", (x0, 0, sag(x0)), (x1, 0, sag(x1)), 0.025, n=3, caps=False, swatch=True)
    rng = random.Random(11)
    for x in (1.5, 4.5, 7.5, 10.5, 13.5):
        _lantern(b, x, 0, sag(x), scale=rng.uniform(0.9, 1.1))
    b.cyl("lantern", (POLE_X, 0, 16.0), (POLE_X, 0, 16.6), 0.22, n=6, swatch=True)               # pole-top lamp


DIAL_Z, DIAL_R = 30.6, 2.25


def _dial(b, face):
    """Clock face on the +x (face = 'x') or +y side, authored on its x >= 0, y >= 0 quarter. Hands at 10:10, so the
    mirrors close it into a whole, readable face; twelve ticks, no numerals."""
    out, front = 3.7, "+" + face
    half = lambda r: [(r * math.sin(a), DIAL_Z + r * math.cos(a)) for a in (math.pi * i / 8 for i in range(9))]
    b.prism("stone", half(DIAL_R + 0.25), out, out + 0.15, axis=face, skip="-" + face, pri=0.6)
    b.prism("window", half(DIAL_R), out + 0.15, out + 0.2, axis=face, only=front, swatch=True)

    def bar(a, r0, r1, w, depth, **kw):
        """Flat dark bar on the dial from radius r0 to r1 at clock angle a (0 = twelve), front face only."""
        c, s, wx, wz = math.sin(a), math.cos(a), w * math.cos(a), -w * math.sin(a)
        quad = [(r0 * c - wx, DIAL_Z + r0 * s - wz), (r1 * c - wx, DIAL_Z + r1 * s - wz), (r1 * c + wx, DIAL_Z + r1 * s + wz), (r0 * c + wx, DIAL_Z + r0 * s + wz)]
        b.prism("steel_dark", [(max(u, 0), z) for u, z in quad], out + 0.2, out + depth, axis=face, only=front, swatch=True, **kw)
    for k in range(7):
        bar(math.pi * k / 6, 1.75, 2.1, 0.07 if k % 3 else 0.12, 0.22, lod=(0, 0))
    bar(math.pi / 3, -0.25, 1.6, 0.08, 0.24)   # hands at 10:10: the mirror draws the other one


def clock_tower(b):
    """Old-town clock tower, 50.5 m to the spire tip: brick shaft with stone quoins and string courses, a lit
    clock face on every side, an open belfry with a warm lamp inside, a copper-patina pyramid roof. Amber
    uplights at the plinth wash the brick. Mirrored across x = 0 and y = 0."""
    b.box("stone", (0, 4.6), (0, 4.6), (0, 2.4), skip="-z", pri=0.6)
    b.box("brick", (0, 3.2), (0, 3.2), (2.4, 27.0), skip="-z+z", pri=0.75)
    b.box("stone", (2.9, 3.35), (2.9, 3.35), (2.4, 27.0), skip="-z+z", pri=0.75)               # quoins
    for z in (9.8, 18.6):
        b.box("stone", (0, 3.4), (0, 3.4), (z, z + 0.4), pri=0.75)
    for z0, lit in ((5.0, False), (12.2, True), (21.0, False)):                                  # window slits
        mat = "window" if lit else "glass"
        b.box(mat, (3.2, 3.24), (0, 0.35), (z0, z0 + 2.4), only="+x", swatch=True, lod=(0, 0))
        b.box(mat, (0, 0.35), (3.2, 3.24), (z0, z0 + 2.4), only="+y", swatch=True, lod=(0, 0))
    b.box("stone", (0, 3.7), (0, 3.7), (27.0, 34.2), pri=0.7)
    b.box("stone", (0, 4.0), (0, 4.0), (34.2, 34.7), pri=0.7)
    _dial(b, "x")
    _dial(b, "y")
    b.box("stone", (2.2, 3.7), (2.2, 3.7), (34.7, 39.4), skip="-z+z", pri=0.7)                   # belfry piers
    b.box("steel_dark", (0, 1.6), (0, 1.6), (34.7, 39.4), skip="-z+z", swatch=True)
    b.box("lantern", (1.6, 1.64), (0, 0.9), (35.6, 37.6), only="+x", swatch=True)               # lamp-lit bell chamber
    b.box("lantern", (0, 0.9), (1.6, 1.64), (35.6, 37.6), only="+y", swatch=True)
    b.box("stone", (0, 3.9), (0, 3.9), (39.4, 40.2), pri=0.7)
    b.hull("patina", [(0, 0, 40.2), (4.1, 0, 40.2), (4.1, 4.1, 40.2), (0, 4.1, 40.2), (0, 0, 47.5)], skip="-z", pri=0.7)
    b.cyl("patina", (0, 0, 47.5), (0, 0, 50.5), 0.25, r1=0.03, n=6, swatch=True, mirror="")
    b.box("steel_dark", (3.6, 4.2), (3.6, 4.2), (2.4, 2.55), skip="-z", swatch=True)            # uplights
    b.box("amber", (3.65, 4.15), (3.65, 4.15), (2.55, 2.6), only="+z", swatch=True)
    b.box("lacquer", (0, 1.0), (4.6, 4.7), (0, 2.0), only="+y", swatch=True, lod=(0, 0))        # door and its lamp
    b.box("window", (0, 0.3), (4.6, 4.75), (2.05, 2.3), skip="-y", swatch=True)
