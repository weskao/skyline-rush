"""The twelve pieces of the Sky Spiral landmark kit: one mesh each, in the space the game reads (+Y up, metres), all
on the kit's one material. Names, pivots and triangle limits are the node contract in asset-brief.md."""
import math
import random

from mathutils import Matrix

from mesh import Band, Cell, Mesh

CAPS = dict(tower=6000, tower_far=1200, strut=300, platform_a=1500, platform_b=1500, station=800, chevron_sign=120,
            gap_marker=200, cloud_a=400, cloud_b=400, cloud_c=400, peak=800)
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


def station():
    """Low station block, 30 x 10.5 x 14 m: two roof steps, window strips, antennas, a tilted dish."""
    m, panel, metal = Mesh("station"), Band("panel"), Band("metal")
    grey, blue, win = Cell("grey"), Cell("blue"), Cell("windows", (0, 0.25, 1, 0.75))
    m.box((-15, 0, -7), (15, 4.2, 7), panel, over={"+y": grey})
    for z0, z1, skip in ((7, 7.12, "-z"), (-7.12, -7, "+z")):
        m.box((-13.5, 1.8, z0), (13.5, 3.2, z1), win, skip=skip)
    for x0, x1, skip in ((15, 15.12, "-x"), (-15.12, -15, "+x")):
        m.box((x0, 1.8, -5.5), (x1, 3.2, 5.5), win, skip=skip)
    m.box((-15.3, 4.2, -7.3), (15.3, 4.7, 7.3), metal, skip="-y", over={"+y": grey})        # roof edge
    hut(m, (-10, 4.7, -5), (4, 7.2, 5), panel, grey, win)
    m.box((-10.1, 6.85, -5.1), (4.1, 7.05, 5.1), blue, skip="+y -y")                        # light line round the upper roof
    hut(m, (7, 4.7, -4), (13, 6.4, 4), panel, grey, win, lit="+x")
    for x in (-6, -3, 0):                                                                    # roof plant
        m.box((x - 1, 7.2, -3.5), (x + 1, 8.0, -1.5), metal, skip="-y")
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


def cloud(name, seed, size, height):
    """An opaque cumulus mass: billows over a lobed outline, a rounded rim, a flat underside (origin at its centre)."""
    m, rnd, cell = Mesh(name), random.Random(seed), Cell("cloud")
    segs, rings, rim = 22, 7, 0.3 * height   # a tall rim over a tucked-in underside: the mass bulges, not a drift
    blobs = [(rnd.uniform(-0.55, 0.55), rnd.uniform(-0.55, 0.55), rnd.uniform(0.24, 0.4), rnd.uniform(0.45, 1.0)) for _ in range(9)]
    p1, p2, p3 = rnd.uniform(0, TAU), rnd.uniform(0, TAU), rnd.uniform(0, TAU)
    edge = lambda t: (1 + 0.16 * math.sin(3 * t + p1) + 0.09 * math.sin(5 * t + p2) + 0.07 * math.sin(8 * t + p3)) / 1.32

    def lift(i, j):
        rho, t = i / rings, TAU * j / segs
        x, z = rho * math.cos(t), rho * math.sin(t)
        dome = lambda d2: math.sqrt(max(0.0, 1 - d2))
        billow = max([0.35 * dome(rho * rho)] + [top * dome(((x - bx) ** 2 + (z - bz) ** 2) / r ** 2) for bx, bz, r, top in blobs])
        return billow * math.sqrt(max(0.0, 1 - rho ** 4))
    highest = max(lift(i, j) for i in range(rings + 1) for j in range(segs))

    def top(i, j):
        t = TAU * j / segs
        reach = i / rings * edge(t)
        return (reach * math.cos(t) * size[0] / 2, rim + (height - rim) * lift(i, j) / highest, reach * math.sin(t) * size[1] / 2)

    def under(i, j):   # ring 2 is the rim of the top
        t = TAU * j / segs
        reach = (0, 0.8, 1)[i] * edge(t)
        return (reach * math.cos(t) * size[0] / 2, rim if i == 2 else 0.0, reach * math.sin(t) * size[1] / 2)
    m.grid(top, lambda i, j: cell.uv(0.5, 0.3 + 0.7 * (lift(i, j) / highest) ** 0.5), rings, segs, "cloud", away=(0, -1e5, 0))
    m.grid(under, lambda i, j: cell.uv(0.5, 0.3 if i == 2 else 0.0), 2, segs, "cloud", away=(0, 1e5, 0))
    return m.fit(*size)


def peak():
    """Snow peak, 500 m across its base and 260 m tall: five spurs and gullies, a shoulder, an off-centre summit.
    Open underneath: the cloud sea hides the base."""
    m, band, rnd = Mesh("peak"), Band("peak"), random.Random(11)
    segs, rings, high, wide = 24, 12, 260.0, 250.0
    outline = lambda t: (1 + 0.16 * math.sin(3 * t + 0.4) + 0.10 * math.sin(5 * t + 2.1) + 0.05 * math.sin(8 * t + 4.0)) / 1.31
    rough = {(i, j): (rnd.uniform(-1, 1), rnd.uniform(-1, 1)) for i in range(1, rings) for j in range(segs)}

    def point(i, j):
        rho, t = i / rings, TAU * j / segs
        wobble, bump = rough.get((i, j % segs), (0.0, 0.0))
        spur = 0.5 + 0.5 * math.cos(5 * t + 2.1)   # 1 along a spur, 0 down a gully
        reach = rho * wide * outline(t) * (1 + 0.05 * wobble)
        x, z = 16 * (1 - rho) + reach * math.cos(t), -10 * (1 - rho) + reach * math.sin(t)
        y = high * (1 - rho) ** (1.25 + 0.7 * (1 - spur) * rho) * (1 + 0.06 * bump)
        return (x, y + 60 * math.exp(-((x + 85) ** 2 + (z - 55) ** 2) / 45 ** 2) * 4 * rho * (1 - rho), z)   # the shoulder
    m.grid(point, lambda i, j: band.uv(2 * j / segs, point(i, j)[1] / high), rings, segs, "peak", away=(0, -1e5, 0))
    return m.fit(2 * wide, 2 * wide)


def build_all():
    return [tower("tower", 48), tower("tower_far", 16), strut(), platform_a(), platform_b(), station(), chevron_sign(), gap_marker(),
            cloud("cloud_a", 3, (420, 300), 80), cloud("cloud_b", 8, (330, 310), 64), cloud("cloud_c", 21, (500, 270), 90), peak()]
