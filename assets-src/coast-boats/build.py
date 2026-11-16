"""Builds assets-src/coast-boats/coast-boats.blend: the boats out on the Coast water (src/coast-boats.ts).

Run from the repo root (a second or two, no bakes, no downloads):
  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-boats/build.py

Modelled here: Poly Haven's only CC0 boats are 17th-century ships (asset-brief.md). Every boat is one mesh and one
top-level node at the origin: pivot on the waterline amidships, bow along +x, z up, the hull carried below the water
so a bob or a heel never opens it. Sails and boom are sheeted to -y, the side the runtime heels the boat to.
One material for all three, coloured per face corner (glTF COLOR_0, linear): no textures to fetch or decode.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "coast-scenery", "build"))

import materials as M  # noqa: E402
from props import MeshBuilder  # noqa: E402

# Linear RGB. The Coast day sun and sky put about three times a flat, upward face's albedo on screen: decks, roofs and
# foam stay under 0.5 or they clip and bloom into a white halo; upright faces (topsides, sails) take more.
WHITE, ROOF, CREAM, TEAK = (0.60, 0.60, 0.58), (0.44, 0.44, 0.43), (0.46, 0.44, 0.38), (0.42, 0.28, 0.15)
NAVY, RED, GLASS, ALLOY, DARK = (0.02, 0.05, 0.16), (0.30, 0.03, 0.02), (0.02, 0.03, 0.05), (0.40, 0.42, 0.44), (0.05, 0.05, 0.06)
SAILCLOTH, TANBARK, FOAM, CHURN = (0.72, 0.71, 0.67), (0.40, 0.11, 0.05), (0.46, 0.50, 0.51), (0.30, 0.42, 0.45)


def smooth(lo, hi, x):
    t = min(1.0, max(0.0, (x - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def face(mb, idx, col):
    mb.face(idx, ((0.0, 0.0),) * len(idx), 0, (*col, 1.0))


def flat(mb, pts, col):
    """A facet on its own vertices: hard edges all round."""
    face(mb, [mb.vert(p) for p in pts], col)


def grid(mb, rows, col_of, closed=False):
    """Quads over shared vertices (smooth shading); `closed` joins each row's last point to its first."""
    ids = [[mb.vert(p) for p in row] for row in rows]
    for i in range(len(ids) - 1):
        n = len(ids[i])
        for j in range(n if closed else n - 1):
            k = (j + 1) % n
            face(mb, (ids[i][j], ids[i][k], ids[i + 1][k], ids[i + 1][j]), col_of(i, j))


def spar(mb, a, b, ra, rb, col, sides=8):
    """A tapered round tube from a to b with capped ends: mast, boom."""
    a, b = Vector(a), Vector(b)
    t = (b - a).normalized()
    u = t.cross(Vector((0, 1, 0)))
    u = (u if u.length > 1e-4 else t.cross(Vector((1, 0, 0)))).normalized()
    w = t.cross(u)
    ring = lambda c, r: [c + (u * math.cos(2 * math.pi * j / sides) + w * math.sin(2 * math.pi * j / sides)) * r for j in range(sides)]
    grid(mb, [ring(a, ra), ring(b, rb)], lambda i, j: col, closed=True)
    flat(mb, ring(a, ra), col)
    flat(mb, ring(b, rb), col)


def streak(mb, a, b, half, col, steps=5):
    """A flat foam streak from a to b: blunt where it starts, widest a third along, drawn out to a point."""
    a, b = Vector(a), Vector(b)
    across = (b - a).normalized().cross(Vector((0, 0, 1)))
    rows = []
    for i in range(steps + 1):
        t = i / steps
        w = across * (half * (0.45 + 0.55 * math.sin(math.pi * min(1.0, t * 1.5) / 2)) * (1 - smooth(0.35, 1, t)))
        rows.append([a + (b - a) * t - w, a + (b - a) * t + w])
    grid(mb, rows, lambda i, j: col)


def box(mb, lo, hi, col):
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    c = [(x, y, z) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    for quad in ((0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)):
        flat(mb, [c[i] for i in quad], col)


class Hull:
    """Lofted hull, station 0 at the transom. Section rows sit at fixed heights so the paint lines run level:
    keel, bilge, waterline, boot-stripe top, then thirds up to the sheer."""

    def __init__(self, length, beam, bow, stern, draft, transom, widest=0.42, fullness=1.8, rake=0.9, counter=0.5, flare=1.6, stations=18):
        self.length, self.beam, self.bow, self.stern, self.draft = length, beam, bow, stern, draft
        self.transom, self.widest, self.fullness, self.rake, self.counter, self.flare = transom, widest, fullness, rake, counter, flare
        self.stations = stations

    def half_beam(self, s):
        if s < self.widest:
            w = self.transom + (1 - self.transom) * math.sin(s / self.widest * math.pi / 2)
        else:
            w = 1 - ((s - self.widest) / (1 - self.widest)) ** self.fullness
        return max(0.012, w) * self.beam / 2

    def sheer(self, s):
        return self.stern + (self.bow - self.stern) * s ** 1.5 - 0.07 * math.sin(math.pi * s)

    def s_at(self, x):
        return x / self.length + 0.5

    def deck(self, x):
        """Height of the deck's centre line at x (crowned above the sheer)."""
        s = self.s_at(x)
        return self.sheer(s) + 0.05 * self.half_beam(s)

    def section(self, s):
        """Port sheer -> keel -> starboard sheer, 13 points."""
        top, half, keel = self.sheer(s), self.half_beam(s), -self.draft * (0.55 + 0.45 * math.sin(math.pi * min(1.0, s * 1.1)))
        levels = [keel, -0.3, 0.0, 0.13] + [0.13 + (top - 0.13) * f for f in (1 / 3, 2 / 3, 1)]
        side = []
        for z in levels:
            z = max(z, keel)  # a shallow end: the bilge row folds onto the keel
            u = (z - keel) / (top - keel)
            y = half * math.sin(math.acos((1 - u) ** (1 / self.flare))) ** 0.8
            low = 1 - u  # the stem rakes aft toward the keel; the counter tucks in under the stern
            x = (s - 0.5) * self.length - self.rake * low * smooth(0.6, 1, s) + self.counter * low * smooth(0.3, 0, s)
            side.append((x, y, z))
        return [(x, -y, z) for x, y, z in reversed(side[1:])] + side

    def build(self, mb, topsides, stripe, bottom, deck):
        rows = [self.section(i / self.stations) for i in range(self.stations + 1)]
        paint = [bottom, bottom, stripe, topsides, topsides, topsides]
        grid(mb, rows, lambda i, j: paint[min(abs(j - 6), abs(j + 1 - 6))])
        flat(mb, rows[0], topsides)  # transom
        edge = [(row[0], ((row[0][0] + row[-1][0]) / 2, 0.0, row[-1][2] + 0.05 * row[-1][1]), row[-1]) for row in rows]
        for a, b in zip(edge, edge[1:]):
            flat(mb, (a[0], a[1], b[1], b[0]), deck)
            flat(mb, (a[1], a[2], b[2], b[1]), deck)


def house(mb, hull, aft, fore, width, height, slope, wall, roof, sink=0.08):
    """Cabin trunk or pilothouse: slab sides with a glass band, raked front. `width` is a share of the hull's beam."""
    def ring(x, lean):
        half, base = hull.half_beam(hull.s_at(x)) * width, hull.deck(x) - sink
        side = [(x, half, base), (x - lean * 0.35, half * 0.97, base + height * 0.38), (x - lean * 0.8, half * 0.9, base + height * 0.8), (x - lean, half * 0.84, base + height + sink)]
        return [(px, -py, pz) for px, py, pz in reversed(side)] + side
    steps = 4
    rings = [ring(aft + (fore - aft) * i / steps, slope * smooth(steps - 1.5, steps, i)) for i in range(steps + 1)]
    bands = [wall, GLASS, wall, roof, wall, GLASS, wall]
    for a, b in zip(rings, rings[1:]):
        for j, col in enumerate(bands):
            flat(mb, (a[j], a[j + 1], b[j + 1], b[j]), col)
    for end in (rings[0], rings[-1]):  # across: wall, glass, wall under the roof edge
        for j, col in enumerate((wall, GLASS, wall)):
            flat(mb, (end[4 + j], end[5 + j], end[2 - j], end[3 - j]), col)


def sail(mb, tack, head, foot, sheet, twist, camber, head_width, roach, rise, cloth, trim=None, across=6, up=10):
    """A cambered, twisted sail: luff from tack to head, chord aft of it and off to -y by the sheeting angle.
    Alternate panels are a shade apart (seams); `trim` colours the leech strip (a furling jib's sun cover)."""
    tack, head = Vector(tack), Vector(head)
    rows = []
    for i in range(up + 1):
        v = i / up
        angle = sheet + twist * v
        chord = foot * ((1 - v) + roach * 4 * v * (1 - v)) + head_width * v
        aft, lee = Vector((-math.cos(angle), -math.sin(angle), rise)), Vector((math.sin(angle), -math.cos(angle), 0))
        luff = tack + (head - tack) * v
        rows.append([luff + aft * (chord * u) + lee * (camber * chord * math.sin(math.pi * u ** 0.8)) for u in (j / across for j in range(across + 1))])
    shade = lambda c, k: tuple(x * k for x in c)
    grid(mb, rows, lambda i, j: trim if trim and j == across - 1 else shade(cloth, 1.0 if i % 2 else 0.93))


def sailboat(name, paint, hull, mast_x, mast_top, boom_z, foot, cabin, colours):
    mb = MeshBuilder()
    topsides, stripe, bottom, deck, cloth, trim = colours
    hull.build(mb, topsides, stripe, bottom, deck)
    house(mb, hull, cabin[0], cabin[1], 0.62, cabin[2], 0.7, WHITE, ROOF)
    sheet = math.radians(9)
    spar(mb, (mast_x, 0, 0.3), (mast_x, 0, mast_top), 0.085, 0.05, ALLOY)
    boom_end = (mast_x - math.cos(sheet) * (foot + 0.15), -math.sin(sheet) * (foot + 0.15), boom_z)
    spar(mb, (mast_x, 0, boom_z), boom_end, 0.07, 0.06, ALLOY, sides=6)
    sail(mb, (mast_x - 0.06, 0, boom_z + 0.09), (mast_x - 0.06, 0, mast_top - 0.25), foot, sheet, math.radians(10), 0.085, 0.22, 0.2, 0.0, cloth)
    bow_x = hull.length / 2 - 0.45
    fore = bow_x - mast_x
    sail(mb, (bow_x, 0, hull.deck(bow_x) + 0.12), (mast_x + 0.1, 0, mast_top * 0.9), fore * 1.02, math.radians(15), math.radians(8), 0.1, 0.03, -0.02, 0.13,
         cloth, trim, across=5, up=8)
    return mb.build(name, [paint])


def motorboat(name, paint):
    mb = MeshBuilder()
    hull = Hull(7.0, 2.5, 1.0, 0.78, 0.45, transom=0.9, widest=0.3, fullness=2.2, rake=0.7, counter=0.0, flare=1.25, stations=14)
    hull.build(mb, WHITE, NAVY, DARK, CREAM)
    house(mb, hull, -1.1, 1.1, 0.74, 1.25, 0.55, WHITE, ROOF)
    box(mb, (-1.35, -0.95, hull.deck(0) + 1.2), (1.0, 0.95, hull.deck(0) + 1.27), NAVY)  # the hardtop, overhanging aft
    box(mb, (-3.85, -0.24, 0.1), (-3.4, 0.24, 1.25), DARK)  # outboard
    # Wake, a rigid part of the mesh (the runtime keeps this boat level and on wide turns): foam streaks 0.18 m above
    # the waterline so a bob never sinks them. The churned trail astern, then the two bow-wave arms, each breaking up
    # and thinning with distance.
    z = 0.18
    for x0, x1, half in ((-3.4, -10.5, 0.95), (-11.3, -14.8, 0.6), (-15.6, -18.0, 0.34)):
        streak(mb, (x0, 0, z), (x1, 0, z), half, CHURN)
    spread = math.tan(math.radians(14))
    for side in (-1, 1):
        for d0, d1, half in ((0.0, 4.4, 0.4), (5.0, 8.2, 0.34), (8.9, 11.2, 0.26), (11.9, 13.6, 0.18), (14.3, 15.4, 0.11)):
            streak(mb, (1.6 - d0, side * (1.05 + d0 * spread), z), (1.6 - d1, side * (1.05 + d1 * spread), z), half, FOAM)
    return mb.build(name, [paint])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    paint = M.frond_material("coast_boat_paint")  # vertex colour -> base colour, two-sided (sails, wake)
    sailboat("sailboat_a", paint, Hull(10.5, 3.3, 1.25, 0.95, 0.6, transom=0.62), mast_x=0.9, mast_top=13.4, boom_z=2.15, foot=4.2,
             cabin=(-1.6, 2.6, 0.42), colours=(WHITE, NAVY, DARK, TEAK, SAILCLOTH, NAVY))
    sailboat("sailboat_b", paint, Hull(7.4, 2.5, 1.0, 0.8, 0.5, transom=0.5, fullness=1.6, counter=0.7), mast_x=0.7, mast_top=9.6, boom_z=1.8, foot=3.1,
             cabin=(-0.9, 1.8, 0.36), colours=(NAVY, WHITE, RED, CREAM, TANBARK, None))
    motorboat("motorboat", paint)
    summary = {ob.name: sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in scene.objects if ob.type == "MESH"}
    print("COAST_BOATS_SUMMARY " + json.dumps(summary, sort_keys=True))
    # Datablocks only, uncompressed: save_as_mainfile would also store UI state (including the saving user's home directory).
    bpy.data.libraries.write(os.path.join(HERE, "coast-boats.blend"), {scene}, path_remap="RELATIVE", compress=False)


main()
