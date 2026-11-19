"""The ground and sea pieces of the Sky Spiral landmark kit (the fliers are build/sky.py): one mesh each, in the space
the game reads (+Y up, metres), all on the kit's one material. Names, pivots and triangle limits are the node
contract in asset-brief.md."""
import math
import random

from mathutils import Matrix

from mesh import Band, Cell, Mesh
from sky import build_fliers

CAPS = dict(tower=6000, tower_far=1200, strut=300, platform_a=1500, platform_b=1500, station=800, chevron_sign=120,
            gap_marker=200, cloud_a=400, cloud_b=400, cloud_c=400, peak=800, bird_body=70, bird_wing_l=30, bird_wing_r=30, airship=900)
TAU = 2 * math.pi
CORE = 40.0   # tower radius where the struts meet it, y -10 .. 115
SHELL = [(-140, 62), (-110, 55), (-60, 46), (-10, CORE), (115, CORE), (150, 38.5), (220, 34), (300, 28), (360, 24)]   # (y, radius)
STRUT = 170.0


def radius(y):
    for (y0, r0), (y1, r1) in zip(SHELL, SHELL[1:]):
        if y0 <= y <= y1:
            return r0 + (r1 - r0) * (y - y0) / (y1 - y0)
    raise ValueError(f"no tower shell at y = {y}")


def turned(m, profile, sides, surfs, tag, smooth=True, **options):
    """A lathe creased at every profile point: segment i takes surfs[i] (or the one surface). A band runs round."""
    for i, pair in enumerate(zip(profile, profile[1:])):
        surf = surfs[i] if isinstance(surfs, list) else surfs
        m.lathe(list(pair), sides, surf, smooth=f"{tag}{i}" if smooth else None, around=isinstance(surf, Band), **options)


def upright(m, angle, half, proud, front, side=None, y0=-140.0, y1=360.0):
    """A raised strip up the tower shell at `angle` (from +X toward +Z), following the taper."""
    d, t = (math.cos(angle), math.sin(angle)), (-math.sin(angle), math.cos(angle))
    ys = sorted({y0, y1} | {y for y, _ in SHELL if y0 < y < y1})

    def at(y, s, out):
        r = radius(y) + out
        return (d[0] * r + t[0] * s * half, y, d[1] * r + t[1] * s * half)
    for a, b in zip(ys, ys[1:]):
        mid = (a + b) / 2
        m.face([at(a, -1, proud), at(a, 1, proud), at(b, 1, proud), at(b, -1, proud)], front.face([a, a, b, b], [-half, half, half, -half]), away=(0, mid, 0))
        for s in (-1, 1) if side else ():
            m.face([at(a, s, -0.6), at(a, s, proud), at(b, s, proud), at(b, s, -0.6)], side.face([a, a, b, b], [0, proud + 0.6, proud + 0.6, 0]), away=at(mid, 0, 0))


def tower(name, sides):
    """The spiral's core. `sides` 48 = near, 16 = far: same outline, rings and light strip, fewer parts."""
    near = sides > 16
    m, shell, panel, metal = Mesh(name), Band("shell"), Band("panel"), Band("metal")
    win, dark = Cell("windows", (0, 0.12, 1, 0.88)), Cell("dark")
    m.lathe([(r, y) for y, r in SHELL], sides, shell, smooth="shell", groups=8)
    m.lathe([(0, -140), (62, -140)], sides, dark)
    for y in (-10, 115, 200, 280, 340) if near else (-10, 115, 280):   # ring gantries
        r = radius(y)
        turned(m, [(r - 0.4, y - 3.2), (r + 3, y - 1.4), (r + 3, y + 1.4), (r - 0.4, y + 2.0)], sides, metal, f"ring{y}")
        if near and y in (200, 280):                                   # a lit gallery above the gantry
            turned(m, [(r - 0.3, y + 2.0), (r + 0.5, y + 2.4), (r + 0.5, y + 6.4), (radius(y + 7) - 0.3, y + 7)], sides, [panel, win, panel], f"deck{y}")
    if near:
        crown, surfs = [(24, 360), (31, 368), (31.5, 370), (31.5, 376), (28, 380), (28, 384), (12, 389), (2.5, 390.5)], [panel, panel, win, metal, panel, metal, metal]
    else:
        crown, surfs = [(24, 360), (31.5, 369), (31.5, 376), (28, 384), (12, 389), (2.5, 390.5)], [panel, win, metal, metal, metal]
    turned(m, crown, sides, surfs, "crown")
    m.beam((0, 390.5, 0), (0, 400, 0), (2.6, 2.6), panel, size1=(0.5, 0.5), sides=6 if near else 3, caps="b")
    for k in range(8):
        a = TAU * (k + 0.5) / 8
        upright(m, a, 1.2, 0.6, panel, panel if near else None)
        if near:   # crown pylons carry the ribs on above the gallery
            c, s = math.cos(a), math.sin(a)
            m.beam((28.5 * c, 383, 28.5 * s), (17 * c, 397, 17 * s), (1.6, 1.6), panel, size1=(0.6, 0.6), caps="b")
    upright(m, TAU / 4, 3.2, 0.9, dark, dark)        # the +Z light strip in its dark channel
    upright(m, TAU / 4, 1.5, 1.05, Cell("blue"))
    return m


def strut():
    """Support arm from the deck (origin) to the tower: a deck-wide top chord, one deepening bottom chord, a V web."""
    m, panel, grey = Mesh("strut"), Band("panel"), Cell("grey")
    m.box((0, -2.0, -2.2), (STRUT, -0.5, 2.2), panel, skip="+x", over={"+y": Band("metal")})
    low = lambda x: -5.0 - 19.0 * (x - 6) / 164
    m.beam((6, low(6), 0), (168.4, low(168.4), 0), (1.8, 1.8), panel, size1=(2.6, 2.6), caps="a")
    xs = [6 + 20.3 * k for k in range(9)]
    for a, b in zip(xs, xs[1:]):
        for z in (-1.2, 1.2):
            m.beam((a, -2.0, z), (a, low(a), 0), (0.9, 0.9), grey, sides=3)
            m.beam((a, low(a), 0), (b, -2.0, z), (0.9, 0.9), grey, sides=3)
    m.box((3, -2.3, -0.45), (168, -2.0, 0.45), Cell("blue"), skip="+y +x")   # the light line under the chord
    return m


def hut(m, lo, hi, panel, grey, win, lit="+z"):
    m.box(lo, hi, panel, skip="-y", over={"+y": grey})
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    band = (y0 + (y1 - y0) * 0.45, y0 + (y1 - y0) * 0.8)
    if lit == "+z":
        m.box((x0 + 0.5, band[0], z1), (x1 - 0.5, band[1], z1 + 0.1), win, skip="-z")
    else:
        m.box((x1, band[0], z0 + 0.5), (x1 + 0.1, band[1], z1 - 0.5), win, skip="-x")


def spire(m, height, sides, panel, metal, tag):
    """A mast on a drum, standing on m.xf: collars at a third and a half, a blue beacon near the tip."""
    turned(m, [(4.6, 0), (4.6, 2.4), (3.0, 4.2), (1.7, 7.5), (1.2, height * 0.66), (0.3, height - 1), (0, height)], sides, panel, tag)
    for k, y in enumerate((height * 0.34, height * 0.5)):
        r = 1.7 - 0.5 * (y - 7.5) / (height * 0.66 - 7.5)
        turned(m, [(r - 0.1, y - 0.5), (r + 1.0, y - 0.2), (r + 1.0, y + 0.2), (r - 0.1, y + 0.5)], sides, metal, f"{tag}c{k}")
    y = height * 0.8
    turned(m, [(0.7, y - 0.7), (1.15, y - 0.4), (1.15, y + 0.4), (0.6, y + 0.7)], sides, Cell("blue"), f"{tag}b")


def platform_a():
    """Round floating platform: lit rim, parapet, landing ring, a 38 m spire, a tapered keel with fins."""
    m, panel, metal = Mesh("platform_a"), Band("panel"), Band("metal")
    grey, blue, win = Cell("grey"), Cell("blue"), Cell("windows", (0, 0.2, 1, 0.8))
    n = 32
    m.lathe([(0, -42), (2.5, -33), (5.5, -19), (10, -9), (17, -4.5), (20, -3)], n, panel, smooth="hull", groups=16)
    turned(m, [(20, -3), (20.4, -2.6), (20.4, -1.9), (20, -1.6), (20, 1.1), (19.3, 1.1), (19.3, 0), (0, 0)], n, [panel, blue, panel, panel, grey, panel, metal], "rim")
    m.lathe([(12.6, 0.06), (11.6, 0.06)], n, blue)                    # landing ring on the deck
    spire(m, 38.0, 10, panel, metal, "spire")
    for k in range(4):
        c, s = math.cos(TAU * (k + 0.5) / 4), math.sin(TAU * (k + 0.5) / 4)
        m.plate([(r * c, y, r * s) for r, y in ((10, -9), (18, -4.2), (16.5, -13), (8, -24))], panel, f"fin{k}")
        m.plate([(r * c, y, r * s) for r, y in ((1.4, 17), (1.7, 7.5), (8, 0.05), (8, 1.4))], panel, f"stay{k}")
    turned(m, [(5.2, -20.5), (6.6, -19.2), (6.6, -17.4), (5.6, -16.4)], 16, [metal, blue, metal], "thrust")
    hut(m, (-14, 0, -3.5), (-8, 3.0, 2.5), panel, grey, win)
    hut(m, (7, 0, 6), (12, 2.4, 11), panel, grey, win, lit="+x")
    m.beam((-12, 3, -2), (-12, 9, -2), (0.3, 0.3), grey, size1=(0.08, 0.08), sides=3)
    m.beam((9, 2.4, 9), (9, 7, 9), (0.3, 0.3), grey, size1=(0.08, 0.08), sides=3)
    return m


def platform_b():
    """Long faceted platform, 48 x 30 m: a cabin between two spires (33 and 21 m), a 36 m crystal keel."""
    m, panel, metal = Mesh("platform_b"), Band("panel"), Band("metal")
    grey, blue, win = Cell("grey"), Cell("blue"), Cell("windows", (0, 0.2, 1, 0.8))
    n, long = 10, dict(scale=(1.2, 0.75))
    turned(m, [(0, -36), (3, -25), (9, -10), (20, -3.5), (20.5, -2.8), (20.5, -2.0), (20, -1.6), (20, 1.0), (19.2, 1.0), (19.2, 0), (0, 0)], n,
           [panel, panel, panel, panel, blue, panel, panel, grey, panel, metal], "hull", smooth=False, **long)
    turned(m, [(8.6, 0), (8.6, 3.2), (7.2, 4.6), (0, 4.6)], n, [win, panel, grey], "cabin", smooth=False, **long)
    for x, height in ((14.5, 33.0), (-14.5, 21.0)):
        m.xf = Matrix.Translation((x, 0, 0))
        spire(m, height, 8, panel, metal, f"spire{height}")
    m.xf = Matrix.Identity(4)
    m.box((-13.5, 9.0, -0.7), (13.5, 10.2, 0.7), panel, over={"-y": blue})   # the bridge between the spires
    for k, side in enumerate((-1, 1)):
        m.plate([(side * x, y, 0) for x, y in ((9, -10), (22, -4), (20, -12), (7, -22))], panel, f"fin{k}")
    m.beam((-14.5, 21, 0), (-14.5, 29, 0), (0.25, 0.25), grey, size1=(0.06, 0.06), sides=3)
    hut(m, (-3, 4.6, -2.5), (3, 6.6, 2.5), panel, grey, win)
    return m


def wall(m, a, b, y0, y1, surf, away):
    """An upright quad from a to b (each x, z) between y0 and y1, facing away from `away`."""
    run = math.dist(a, b)
    m.face([(a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1])], surf.face([0, run, run, 0], [y0, y0, y1, y1]), away=away)


def kerb(m, lo, hi, thick, surf, top):
    """A low wall round the rectangle lo .. hi: its outer, inner and top faces."""
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    cx, cz, t = (x0 + x1) / 2, (z0 + z1) / 2, thick
    outer, inner = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)], [(x0 + t, z0 + t), (x1 - t, z0 + t), (x1 - t, z1 - t), (x0 + t, z1 - t)]
    for k in range(4):
        a, b, c, d = outer[k], outer[(k + 1) % 4], inner[(k + 1) % 4], inner[k]
        wall(m, a, b, y0, y1, surf, (cx, y0, cz))
        wall(m, d, c, y0, y1, surf, (a[0] + b[0] - cx, y0, a[1] + b[1] - cz))
        m.face([(q[0], y1, q[1]) for q in (a, b, c, d)], top.face([q[0] for q in (a, b, c, d)], [q[1] for q in (a, b, c, d)]), away=(cx, y0 - 9, cz))


def station():
    """Low station block, 30 x 10.5 x 14 m, on a plinth: bays of glass set 0.3 m back between piers, a lit entrance
    recessed in the middle of +Z, a parapet round the roof deck, two roof blocks under their own slabs, roof plant,
    antennas and a tilted dish."""
    m, panel, metal = Mesh("station"), Band("panel"), Band("metal")
    grey, blue = Cell("grey"), Cell("blue")
    # one bay's glass: four panes of the window cell, started on a different pane so the lit ones fall differently
    glass = lambda k: Cell("windows", (0.125 * (k * 3 % 5), 0.0, 0.125 * (k * 3 % 5) + 0.5, 0.42))
    out = (0, 2.5, 0)   # inside the block: walls face away from it
    bays, ends, door = [-15 + 30 * k / 7 for k in range(8)], [-7 + 14 * k / 3 for k in range(4)], 15 / 7
    m.box((-15.3, 0, -7.3), (15.3, 0.5, 7.3), metal, skip="-y")                             # plinth
    for x0, x1 in ((-15, -door), (door, 15)):                                                # the wall under the glass, open at the entrance
        m.box((x0, 0.5, -7), (x1, 1.7, 7), panel, skip="-y")
    m.box((-door, 0.5, -7), (door, 1.7, 6.0), panel, skip="-y -x +x +z")
    m.box((-15, 3.3, -7), (15, 4.2, 7), panel, skip="+y")                                   # the wall over it: its underside is the window heads
    for k, (a, b) in enumerate(zip(bays, bays[1:])):
        if k == 3:                                                                           # the entrance: lit glass doors 0.8 m back
            wall(m, (a, 6.2), (b, 6.2), 0.5, 3.3, Cell("windows", (0.375, 0.0, 0.75, 1.0)), out)
        else:
            wall(m, (a, 6.7), (b, 6.7), 1.7, 3.3, glass(k), out)
        wall(m, (a, -6.7), (b, -6.7), 1.7, 3.3, glass(k + 2), out)
    for k, (a, b) in enumerate(zip(ends, ends[1:])):
        for x in (-14.7, 14.7):
            wall(m, (x, a), (x, b), 1.7, 3.3, glass(k + (x > 0)), out)
    for x in bays[1:-1]:                                                                     # piers; the entrance's run back to its doors
        m.box((x - 0.3, 0.5, 6.2 if abs(x) < 3 else 6.7), (x + 0.3, 4.2, 7.15), panel, skip="-y +y -z")
        m.box((x - 0.3, 0.5, -7.15), (x + 0.3, 4.2, -6.7), panel, skip="-y +y +z")
    for z in ends[1:-1]:
        m.box((14.7, 0.5, z - 0.3), (15.15, 4.2, z + 0.3), panel, skip="-y +y -x")
        m.box((-15.15, 0.5, z - 0.3), (-14.7, 4.2, z + 0.3), panel, skip="-y +y +x")
    for x in (-15.15, 14.55):
        for z in (-7.15, 6.55):
            m.box((x, 0.5, z), (x + 0.6, 4.2, z + 0.6), panel, skip="-y +y")
    m.box((-door + 0.3, 3.1, 6.25), (door - 0.3, 3.3, 6.5), blue, skip="+y -z -x +x")       # the lamp over the doors
    m.box((-2.7, 3.3, 7.0), (2.7, 3.5, 7.3), metal, skip="-z", over={"-y": blue})           # canopy, lit underneath
    m.box((-15.3, 4.2, -7.3), (15.3, 4.7, 7.3), metal)                                      # roof slab and deck
    kerb(m, (-15.3, 4.7, -7.3), (15.3, 5.25, 7.3), 0.3, panel, metal)
    for (x0, z0, x1, z1), top in (((-10, -5, 4, 5), 7.2), ((7, -4, 13, 4), 6.4)):           # roof blocks, each under a slab
        m.box((x0, 4.7, z0), (x1, top - 0.3, z1), panel, skip="-y +y")
        m.box((x0 - 0.25, top - 0.3, z0 - 0.25), (x1 + 0.25, top, z1 + 0.25), metal)
        mid, n = ((x0 + x1) / 2, 5.5, (z0 + z1) / 2), round((x1 - x0) / 4.5)
        for k in range(n):
            a, b = x0 + 0.6 + (x1 - x0 - 1.2) * k / n, x0 + 0.6 + (x1 - x0 - 1.2) * (k + 1) / n
            for z in (z0 - 0.08, z1 + 0.08):
                wall(m, (a, z), (b, z), 5.25, top - 0.7, glass(k + (z > 0)), mid)
            for x in (x0 - 0.08, x1 + 0.08) if k < 2 else ():
                wall(m, (x, z0 + 0.6 if k else mid[2]), (x, mid[2] if k else z1 - 0.6), 5.25, top - 0.7, glass(k + (x > mid[0])), mid)
    m.box((-10.1, 6.7, -5.1), (4.1, 6.9, 5.1), blue, skip="+y -y")                          # light line under the upper slab
    m.box((-8.5, 7.2, -4.2), (-5.6, 8.0, -2.2), metal, skip="-y", over={"+y": grey})        # roof plant: a chiller, a tank, pipes, vents
    m.beam((-4.2, 7.85, -3.2), (0.6, 7.85, -3.2), (1.25, 1.25), panel, sides=6, caps="ab", smooth="tank")
    m.beam((-5.6, 7.55, -3.2), (-4.2, 7.55, -3.2), (0.22, 0.22), grey, sides=3)
    m.beam((0.6, 7.4, -3.2), (3.3, 7.4, -3.2), (0.22, 0.22), grey, sides=3)
    for x in (1.2, 2.6):
        m.box((x - 0.3, 7.2, 1.2), (x + 0.3, 7.95, 1.8), metal, skip="-y", over={"+y": Cell("dark")})
    m.box((-14.2, 4.7, -5.6), (-11.6, 6.5, -2.8), panel, skip="-y", over={"+y": metal, "+z": Cell("windows", (0.25, 0.0, 0.5, 0.6))})   # stair head
    m.box((4.7, 4.7, -2.6), (6.3, 5.05, 2.6), grey, skip="-y", over={"+y": glass(4)})       # skylight between the blocks
    for (x, z), top in (((-8.5, 3.5), 10.5), ((2.5, 3.8), 9.6), ((-13.5, 5.5), 8.2)):
        base = 7.2 if -10 <= x <= 4 else 4.7
        m.beam((x, base, z), (x, top, z), (0.3, 0.3), grey, size1=(0.08, 0.08), sides=3)
    m.box((-8.8, 9.2, 3.2), (-8.2, 9.5, 3.8), blue)                                         # beacon on the tall mast
    m.beam((10, 6.4, 0), (10, 7.7, 0), (0.9, 0.9), grey)
    m.xf = Matrix.Translation((10, 7.7, 0)) @ Matrix.Rotation(math.radians(-38), 4, "Z") @ Matrix.Rotation(math.radians(20), 4, "X")
    m.lathe([(0, 0), (1.6, 0.25), (3.0, 1.1), (2.85, 1.2), (1.5, 0.45), (0, 0.2)], 12, panel, smooth="dish")
    m.beam((0, 0.2, 0), (0, 1.9, 0), (0.2, 0.2), grey, sides=3)
    m.xf = Matrix.Identity(4)
    return m


def chevron_sign():
    """Blue chevron board on a post. The board faces +Z and its chevrons point +X on both faces (the back is the
    front seen through), so a half turn about Y points them the other way."""
    m, dark = Mesh("chevron_sign"), Cell("dark")
    m.box((-0.4, 0, -0.4), (0.4, 0.12, 0.4), Cell("grey"), skip="-y")
    m.beam((0, 0.12, 0), (0, 2.3, 0), (0.24, 0.24), Cell("grey"))
    m.box((-2, 2.3, -0.07), (2, 4.3, 0.07), dark, skip="+z -z")
    m.box((-2, 2.3, -0.07), (2, 4.3, 0.07), Cell("chevron"), skip="+x -x +y -y")
    m.box((-2.1, 4.3, -0.12), (2.1, 4.42, 0.12), Cell("blue"), skip="-y")   # a lit cap, seen at speed
    return m


def gap_marker():
    """Launch-gap edge post: 6 m, yellow and black bands, a blue beacon."""
    m, grey = Mesh("gap_marker"), Cell("grey")
    m.box((-0.6, 0, -0.6), (0.6, 0.25, 0.6), grey, skip="-y")
    m.box((-0.25, 0.25, -0.25), (0.25, 5.1, 0.25), Cell("hazard"), skip="-y +y")
    m.box((-0.36, 5.1, -0.36), (0.36, 5.3, 0.36), Cell("dark"))
    m.lathe([(0.3, 5.3), (0.38, 5.55), (0.3, 5.85), (0, 6.0)], 8, Cell("blue"), smooth="beacon")
    return m


CLOUD_SPREAD = 264.0   # the plan's cloud clearance (SPIRAL_CLOUD_SPREAD): no cloud reaches past it from its origin
BILLOW = {10: [(0.52, 0.86), (0.88, 0.52), (1.0, 0.2), (0.8, 0.0)], 8: [(0.62, 0.8), (1.0, 0.3), (0.8, 0.0)]}   # sides: rings (radius, height)


def cloud(name, seed, size, height):
    """An opaque cumulus mass: two big billows along its length and five smaller ones round and on them, sunk into
    each other. Each is a dome with a bulging side over a tucked-in flat underside (origin at the centre of the
    lowest one). On the cloud cell v is a point's height and u how deep it sits between two billows."""
    m, rnd, cell = Mesh(name), random.Random(seed), Cell("cloud")
    j = lambda span: rnd.uniform(-span, span)
    # (x, z, radius, height) on a footprint of -1 .. 1; the second is the crown
    lobes = [(-0.36 + j(0.05), j(0.10), 0.56, 0.76 + j(0.06)), (0.30 + j(0.05), j(0.10), 0.60, 1.0)]
    for k in range(5):
        a, d = TAU * (k + 0.5 + j(0.3)) / 5, rnd.uniform(0.5, 0.74)
        lobes.append((d * math.cos(a) * 1.15, d * math.sin(a) * 0.9, rnd.uniform(0.32, 0.4), rnd.uniform(0.5, 0.74) - 0.25 * d))

    def crease(k, x, y, z):
        """0 on an open crown .. 1 where the point is inside another billow."""
        near = 0.0
        for n, (cx, cz, r, top) in enumerate(lobes):
            if n != k:
                q = math.hypot(math.hypot(x - cx, z - cz) / r, max(0.0, y / top - 0.15) / 0.85)
                near = max(near, min(1.0, (1.45 - q) / 0.45))
        return near
    for k, (cx, cz, r, top) in enumerate(lobes):
        sides = 10 if k < 2 else 8
        turn, base = rnd.uniform(0, TAU), 0.0005 * k   # undersides a few cm apart: no two share a depth
        rings = [[(1 + j(0.06), 1 + j(0.04)) for _ in range(sides)] for _ in BILLOW[sides]]

        def point(i, s):
            if i == 0:
                return (cx, top, cz)
            (share, lift), (wide, tall) = BILLOW[sides][i - 1], rings[i - 1][s % sides]
            t = turn + TAU * (s % sides) / sides
            return (cx + r * share * wide * math.cos(t), max(base, top * lift * tall), cz + r * share * wide * math.sin(t))

        def uv(i, s):
            x, y, z = point(i, int(s) if i else 0)
            return cell.uv(crease(k, x, y, z), 0.05 if y <= base else 0.3 + 0.7 * math.sqrt(y))
        m.grid(point, uv, len(BILLOW[sides]), sides, f"billow{k}", away=(cx, 0.2 * top, cz))
        low = [point(len(BILLOW[sides]), s) for s in range(sides)]
        m.face(low, [cell.uv(0.0, 0.0)] * sides, away=(cx, 1, cz))
    for p in m.verts:
        p.x, p.y, p.z = p.x * size[0] / 2, p.y * height, p.z * size[1] / 2
    m.fit(*size)
    assert max(math.hypot(p.x, p.z) for p in m.verts) <= CLOUD_SPREAD, f"{name} reaches past {CLOUD_SPREAD} m"
    return m


RIDGES = [0, 5, 12, 17, 21, 26]   # of the peak's 30 segment lines, those that carry an arete
PEAK_REACH = 307.0                # the plan's radius for the peak (SPIRAL_NODE_RADIUS): nothing of it farther from its origin


def peak():
    """Snow peak, 500 m across its base and 260 m tall: a horn of six aretes with hollow faces between them, a
    shoulder, an off-centre summit. Each face is its own smooth group, so the aretes are creases, and is laid on the
    band at true size from its middle (u in metres round the peak, v its height). Open underneath: the cloud sea
    hides the base."""
    m, band, rnd = Mesh("peak"), Band("peak"), random.Random(11)
    segs, rings, high, wide, repeat = 30, 13, 260.0, 250.0, 1100.0   # `repeat` m of rock to one turn of the band: its texels stay near square
    outline = lambda t: (1 + 0.14 * math.sin(3 * t + 0.4) + 0.08 * math.sin(5 * t + 2.1)) / 1.22
    rough = {(i, j): (rnd.uniform(-1, 1), rnd.uniform(-1, 1)) for i in range(1, rings) for j in range(segs)}
    faces = list(zip(RIDGES, RIDGES[1:] + [segs]))

    def spur(j):   # 1 on an arete, 0 midway to the next
        a, b = next(f for f in faces if f[0] <= j % segs < f[1])
        return abs(2 * (j % segs - a) / (b - a) - 1)

    def reach(i, j):
        rho = (i / rings) ** 1.1
        return rho * wide * outline(TAU * j / segs) * (0.78 + 0.22 * spur(j)) * (1 + 0.05 * rough.get((i, j % segs), (0, 0))[0])

    def point(i, j):
        rho, t, s, r = (i / rings) ** 1.1, TAU * j / segs, spur(j), reach(i, j)
        x, z = 16 * (1 - rho) + r * math.cos(t), -10 * (1 - rho) + r * math.sin(t)
        y = high * (1 - rho) ** (1.15 + 0.9 * (1 - s) ** 1.3 * rho ** 0.5) * (1 + (0.09 if s == 1 else 0.04) * math.sqrt(rho) * rough.get((i, j % segs), (0, 0))[1])
        return (x, y + 80 * math.exp(-((x + 82) ** 2 + (z - 62) ** 2) / 50 ** 2) * 4 * rho * (1 - rho), z)   # the shoulder, on an arete
    for k, (a, b) in enumerate(faces):
        uv = lambda i, j: band.uv((a + b) / 2 / segs + reach(i, j) * (j - (a + b) / 2) * TAU / segs / repeat, point(i, j)[1] / high)
        for j in range(a, b):
            for i in range(rings):
                corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                m.face([point(*c) for c in corners], [uv(*c) for c in corners], f"face{k}", away=(0, -1e5, 0))
    m.fit(2 * wide, 2 * wide)
    for p in m.verts:   # a spur on the footprint's diagonal would pass the plan's radius: draw its foot in by its lesser coordinate (the box stays)
        if math.hypot(p.x, p.z) > PEAK_REACH - 1:
            k = "z" if abs(p.x) > abs(p.z) else "x"
            setattr(p, k, math.copysign(math.sqrt((PEAK_REACH - 1) ** 2 - max(abs(p.x), abs(p.z)) ** 2), getattr(p, k)))
    assert max(math.hypot(p.x, p.z) for p in m.verts) <= PEAK_REACH - 0.5, "peak outside the radius the placement plan gives it"
    return m


def build_all():
    return [tower("tower", 48), tower("tower_far", 16), strut(), platform_a(), platform_b(), station(), chevron_sign(), gap_marker(),
            cloud("cloud_a", 3, (420, 300), 80), cloud("cloud_b", 8, (330, 310), 64), cloud("cloud_c", 21, (500, 270), 90), peak(), *build_fliers()]
