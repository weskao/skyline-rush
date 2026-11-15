"""Signs, billboards, street furniture and far skyline of the Neon city kit.

Every builder takes (kit, lod). The street is toward -y; anything read while driving (blade faces, signal
lenses) faces along x. Wall-mounted pieces hang over their pivot at the height they are meant to be mounted.
"""
import math


def blade(k, lod, cell, neon, z0=6.0, wall=0.75):
    """Vertical box sign projecting from a wall at y = +wall; both faces lit, a neon tube down the street edge."""
    z1, y0, y1 = z0 + 5.6, 0.1 - wall, wall - 0.3
    k.box((-0.15, y0, z0), (0.15, y1, z1), {"l": cell, "r": cell, "*": "steel_dark"}, skip="" if lod == 0 else "fbtu", fit=True)
    k.box((-0.09, y0 - 0.1, z0 + 0.1), (0.09, y0, z1 - 0.1), neon, skip="b" if lod == 0 else "btu")
    if lod == 0:
        for z in (z0 + 0.7, z1 - 0.9):
            k.box((-0.06, y1, z), (0.06, wall, z + 0.14), "steel_dark", skip="fb")


def sign_blade_a(k, lod):
    blade(k, lod, "blade_a", "neon_red")


def sign_blade_b(k, lod):
    """Blade with a small square sign hung under it."""
    blade(k, lod, "blade_b", "neon_amber", z0=7.4)
    k.box((-0.13, -0.65, 6.0), (0.13, 0.45, 7.2), {"l": "sign_small_c", "r": "sign_small_c", "*": "steel_dark"},
          skip="" if lod == 0 else "fbtu", fit=True)
    if lod == 0:
        k.box((-0.04, -0.2, 7.2), (0.04, -0.1, 7.4), "steel_dark", skip="tu")


def sign_stack_a(k, lod):
    """Free-standing market totem: four box signs stacked on a post, faces along the street, a lantern on top."""
    cells = ("sign_small_b", "sign_small_a", "sign_small_c", "sign_small_b")
    for i, cell in enumerate(cells):
        z = 2.6 + i * 0.95
        k.box((-0.13, -0.45, z), (0.13, 0.45, z + 0.9), {"l": cell, "r": cell, "*": "steel_dark"}, skip="" if lod == 0 else "fbtu", fit=True)
    k.box((-0.07, -0.07, 0), (0.07, 0.07, 2.6), "steel_dark", skip="tu")
    k.box((-0.04, -0.52, 2.6), (0.04, -0.45, 6.35), "neon_red", skip="b" if lod == 0 else "btu")
    if lod == 0:
        k.box((-0.25, -0.25, 0), (0.25, 0.25, 0.25), "steel_dark")
        k.box((-0.17, -0.17, 6.5), (0.17, 0.17, 6.95), {"*": "lantern", "t": "steel_dark", "u": "steel_dark"}, skip="", fit=True)
        k.box((-0.03, -0.03, 6.35), (0.03, 0.03, 6.5), "steel_dark", skip="tu")


def billboard_a(k, lod):
    """10 x 5.6 m LED screen on two legs: roadside or rooftop, screen toward the street."""
    k.box((-5, -0.25, 3.2), (5, 0.25, 8.8), {"f": "billboard_a", "*": "steel_dark"}, skip="" if lod == 0 else "u", fit=True)
    for x in (-3.2, 3.2):
        k.box((x - 0.22, -0.05, 0), (x + 0.22, 0.4, 3.2), "steel_dark", skip="tu")
    if lod:
        return
    for lo, hi in (((-5.15, 3.05), (5.15, 3.2)), ((-5.15, 8.8), (5.15, 8.95)), ((-5.15, 3.2), (-5.0, 8.8)), ((5.0, 3.2), (5.15, 8.8))):
        k.box((lo[0], -0.34, lo[1]), (hi[0], -0.25, hi[1]), "neon_pink", skip="b")
    k.box((-5, 0.25, 3.0), (5, 1.1, 3.1), "steel_dark", skip="", fit=True)                    # service catwalk
    for x in (-3.2, 3.2):
        k.box((x - 0.07, 0.4, 3.2), (x + 0.07, 0.54, 8.6), "steel_dark", skip="tu")
        k.box((x - 0.45, -0.3, 0), (x + 0.45, 0.65, 0.3), "steel_dark")


def billboard_b(k, lod):
    """5 x 7.8 m portrait screen for a wall at y = +0.3, hung 8 m up, with a violet neon frame."""
    k.box((-2.5, -0.3, 8.0), (2.5, 0.3, 15.8), {"f": "billboard_b", "*": "steel_dark"}, skip="b" if lod == 0 else "btu", fit=True)
    if lod:
        return
    for lo, hi in (((-2.68, 7.82), (2.68, 8.0)), ((-2.68, 15.8), (2.68, 15.98)), ((-2.68, 8.0), (-2.5, 15.8)), ((2.5, 8.0), (2.68, 15.8))):
        k.box((lo[0], -0.4, lo[1]), (hi[0], -0.2, hi[1]), "neon_violet", skip="b")


def street_lamp(k, lod):
    """9 m column, one arm over the road, warm LED head; a cyan marker band at eye height."""
    sides = 8 if lod == 0 else 4
    k.tube([(0, 0, 0), (0, 0, 8.2)], [0.13, 0.08], sides, "steel_dark", caps=(False, False))
    arm = [(0, 0, 8.2), (0, -0.25, 8.75), (0, -0.9, 9.0), (0, -2.3, 9.05)] if lod == 0 else [(0, 0, 8.2), (0, -0.6, 8.95), (0, -2.3, 9.05)]
    k.tube(arm, [0.08, 0.07, 0.06, 0.055][:len(arm)], 6 if lod == 0 else 3, "steel_dark", caps=(False, False))
    k.box((-0.2, -3.3, 8.98), (0.2, -2.2, 9.1), {"u": "lamp_warm", "*": "steel_light"}, skip="" if lod == 0 else "t")
    if lod == 0:
        k.prism(8, 0.22, 0.16, 0, 0.9, "steel_dark")
        k.prism(8, 0.145, 0.145, 1.3, 1.45, "neon_cyan")


def signal_head(k, y, z, lod):
    """Three-lens head facing -x (traffic driving +x); only the green lens is lit."""
    k.box((-0.2, y - 0.2, z), (0.14, y + 0.2, z + 1.2), "steel_dark", skip="" if lod == 0 else "tu")
    for i, cell in enumerate(("neon_green", "lens_off", "lens_off")):
        zc = z + 0.22 + i * 0.38
        if lod == 0:
            k.tube([(-0.2, y, zc), (-0.24, y, zc)], [0.13, 0.13], 8, cell, caps=(False, True), smooth=False)
            k.box((-0.42, y - 0.17, zc + 0.14), (-0.2, y + 0.17, zc + 0.17), "steel_dark", skip="r")   # visor
        else:
            k.quad((-0.21, y + 0.12, zc - 0.12), (-0.21, y - 0.12, zc - 0.12), (-0.21, y - 0.12, zc + 0.12), (-0.21, y + 0.12, zc + 0.12), cell)


def traffic_light(k, lod):
    """Mast-arm signal: 6.8 m column at the pivot, 5.5 m arm over the road, two heads on the arm."""
    sides = 8 if lod == 0 else 4
    k.tube([(0, 0, 0), (0, 0, 6.8)], [0.15, 0.1], sides, "steel_dark", caps=(False, True))
    k.tube([(0, 0, 6.2), (0, -5.5, 6.5)], [0.09, 0.06], 6 if lod == 0 else 3, "steel_dark", caps=(False, True))
    for y in (-2.6, -5.0):
        signal_head(k, y, 5.2, lod)
        if lod == 0:
            k.box((-0.03, y - 0.03, 6.25), (0.03, y + 0.03, 6.42), "steel_dark", skip="tu")
    if lod == 0:
        k.prism(8, 0.26, 0.18, 0, 0.8, "steel_dark")
        k.box((0.14, -0.22, 1.0), (0.4, 0.22, 1.5), "steel_light")                                     # control box
        k.tube([(0, 0, 6.2), (0, -2.2, 6.9)], [0.03, 0.03], 3, "steel_dark", caps=(False, False))      # stay rod


def railing(k, lod):
    """10 m of two-rail guard that tiles end to end: posts every 2.5 m, a cyan-lit marker post in the middle."""
    for z in (0.45, 0.92):
        k.box((-5, -0.1, z), (5, 0.1, z + 0.2), "steel_dark", skip="lr" if lod == 0 else "lru", fit=bool(lod))
    for x in (-3.75, -1.25, 1.25, 3.75):
        k.box((x - 0.09, -0.08, 0), (x + 0.09, 0.08, 0.92), "steel_dark", skip="tu" if lod == 0 else "lrtu")
    k.box((-0.17, -0.16, 0), (0.17, 0.16, 1.3), "steel_dark", skip="u" if lod == 0 else "tu")
    k.box((-0.08, -0.19, 0.4), (0.08, -0.16, 1.15), "neon_cyan", skip="b" if lod == 0 else "blrtu")
    if lod == 0:
        k.box((-0.08, 0.16, 0.4), (0.08, 0.19, 1.15), "neon_cyan", skip="f")
        k.box((-0.19, -0.18, 1.3), (0.19, 0.18, 1.36), "steel_light")


# Blossom groups (centre, radii) over the boughs: LOD 1 draws each as one mass, LOD 0 breaks it into three clusters
# with gaps between them, so the crown reads as sprays on branches rather than one opaque cloud (the kit has no alpha).
BLOSSOM = (((2.15, -0.95, 4.65), (1.0, 0.85, 0.62)), ((-2.1, 1.0, 4.55), (1.0, 0.85, 0.62)),
           ((0.5, -1.5, 5.1), (0.95, 0.8, 0.6)), ((-0.3, 1.45, 5.2), (0.95, 0.8, 0.6)),
           ((0.2, 0.0, 5.65), (1.15, 1.05, 0.65)), ((1.5, -1.45, 4.2), (0.75, 0.65, 0.5)),
           ((-1.45, 1.5, 4.2), (0.75, 0.65, 0.5)), ((1.35, 0.65, 5.0), (0.9, 0.8, 0.58)),
           ((-1.3, -0.7, 5.05), (0.9, 0.8, 0.58)))
FORK = (0.16, 0.05, 2.3)
BOUGHS = (((1.0, -0.35, 3.2), (1.9, -0.8, 4.0), (2.35, -1.05, 4.5)), ((-0.8, 0.45, 3.15), (-1.8, 0.85, 3.95), (-2.25, 1.05, 4.4)),
          ((0.35, -0.6, 3.4), (0.5, -1.2, 4.4), (0.5, -1.5, 4.9)), ((-0.05, 0.6, 3.5), (-0.2, 1.15, 4.5), (-0.3, 1.45, 5.0)),
          ((0.2, 0.0, 3.6), (0.25, 0.05, 4.7), (0.2, 0.0, 5.4)))
TWIGS = (((1.0, -0.35, 3.2), (1.5, -1.4, 4.0)), ((-0.8, 0.45, 3.15), (-1.4, 1.45, 4.0)), ((0.2, 0.0, 3.6), (1.25, 0.6, 4.8)),
         ((0.2, 0.0, 3.6), (-1.2, -0.65, 4.85)), ((1.9, -0.8, 4.0), (2.55, -0.35, 4.3)), ((-1.8, 0.85, 3.95), (-2.5, 0.45, 4.2)))
SPRAYS = (((2.65, -0.35, 4.3), (0.45, 0.4, 0.32)), ((-2.6, 0.45, 4.2), (0.45, 0.4, 0.32)), ((0.9, 1.65, 4.55), (0.5, 0.42, 0.34)),
          ((-0.85, -1.7, 4.6), (0.5, 0.42, 0.34)), ((2.0, 0.35, 5.35), (0.5, 0.45, 0.34)), ((-2.0, -0.25, 5.2), (0.5, 0.45, 0.34)))


def cherry_tree(k, lod):
    """Blossoming street tree, about 6.4 m: a dark wet trunk forking at 2.3 m into five boughs, blossom in sprays.
    LOD 0: 33 clusters with gaps the boughs show through; LOD 1: one mass per spray group; LOD 2: a two-lump cap."""
    sides = (7, 5, 4)[lod]
    trunk = [(0, 0, 0), (0.04, 0.02, 0.9), (0.1, 0.03, 1.7), FORK] if lod < 2 else [(0, 0, 0), (0.1, 0.03, 2.2), (0.2, 0.05, 4.5)]
    k.tube(trunk, [0.24, 0.19, 0.16, 0.14][:len(trunk)], sides, "bark", caps=(False, False))
    if lod == 2:
        for i, (centre, radii) in enumerate((((0.15, 0.0, 5.0), (2.7, 2.2, 1.15)), ((0.3, 0.2, 5.6), (1.5, 1.4, 0.75)))):
            k.puff(centre, radii, 1, "blossom", seed=3.0 + i * 1.7)
        return
    for path in BOUGHS:
        k.tube([FORK, *path][:4 if lod == 0 else 3], [0.11, 0.075, 0.05, 0.03], 5 if lod == 0 else 3, "bark", caps=(False, False))
    if lod == 1:
        for i, (centre, radii) in enumerate(BLOSSOM):
            k.puff(centre, radii, 2, "blossom", seed=3.0 + i * 1.7)
        return
    k.prism(7, 0.4, 0.25, 0, 0.3, "bark")  # root flare
    for path in TWIGS:
        k.tube(path, [0.05, 0.025], 3, "bark", caps=(False, False))
    for g, (centre, radii) in enumerate(BLOSSOM):
        for j in range(3):  # three clusters 0.6 r out from the group centre, 0.55 r across: gaps between them
            a = g * 1.9 + j * 2.094
            c = (centre[0] + math.cos(a) * 0.6 * radii[0], centre[1] + math.sin(a) * 0.6 * radii[1], centre[2] + (j - 1) * 0.25 * radii[2])
            k.puff(c, (radii[0] * 0.58, radii[1] * 0.58, radii[2] * 0.7), 2, "blossom", seed=3.0 + g * 1.7 + j * 0.9)
    for i, (centre, radii) in enumerate(SPRAYS):
        k.puff(centre, radii, 2, "blossom", seed=11.0 + i * 1.3)


def kerb_redwhite(k, lod):
    """4 m x 1 m race kerb, 2 m red then 2 m white: a low ramp up from the road edge (-y), tiles end to end."""
    lip, top, back = (-0.5, 0.015), (0.3, 0.09), (0.5, 0.0)
    k.quad((-2, lip[0], lip[1]), (2, lip[0], lip[1]), (2, top[0], top[1]), (-2, top[0], top[1]), "kerb", (0, 0.05, 1, 0.82))
    k.quad((-2, top[0], top[1]), (2, top[0], top[1]), (2, back[0], back[1]), (-2, back[0], back[1]), "kerb", (0, 0.82, 1, 1))
    if lod == 0:
        k.quad((-2, lip[0], 0), (2, lip[0], 0), (2, lip[0], lip[1]), (-2, lip[0], lip[1]), "kerb", (0, 0, 1, 0.05))
        for x, u, order in ((-2, 0.02, 1), (2, 0.98, -1)):  # end caps for the first and last kerb of a run
            pts = [(x, lip[0], 0), (x, lip[0], lip[1]), (x, top[0], top[1]), (x, back[0], back[1])][::order]
            k.face(pts, "kerb", [(u, 0.5)] * 4)


def ring_walls(k, n, r, z0, z1, cell, step):
    """Upright n-gon, faces showing successive `step` m slices of the cell instead of squeezing it whole."""
    pt = lambda i: (r * math.cos(-math.pi / 2 + (2 * i - 1) * math.pi / n), r * math.sin(-math.pi / 2 + (2 * i - 1) * math.pi / n))  # noqa: E731
    for i in range(n):
        k.wall(pt(i), pt(i + 1), z0, z1, cell, uoff=(i % 2) * step)


def skyline_tower_a(k, lod):
    """Far tower, 32 m square and 204 m tall: warm windows, a cyan crown line, a setback top."""
    k.walls(32, 32, 0, 192, "sky_a")
    k.floor(-16, -16, 16, 16, 192, "glass_dark")
    if lod == 0:
        k.walls(33, 33, 189, 192.5, "neon_cyan")
        k.walls(18, 18, 192, 204, "glass_dark")
        k.floor(-9, -9, 9, 9, 204, "glass_dark")
        k.tube([(5, 5, 204), (5, 5, 226)], [0.5, 0.2], 3, "steel_dark")


def skyline_tower_b(k, lod):
    """Far slab, 32 x 20 m stepping to 20 x 14 m, 168 m: pink strips up the face and pink crown lines."""
    k.walls(32, 20, 0, 96, "sky_b")
    k.walls(20, 14, 96, 168, "sky_b")
    k.floor(-10, -7, 10, 7, 168, "glass_dark")
    if lod == 0:
        k.floor(-16, -10, 16, 10, 96, "glass_dark")
        k.walls(33, 21, 94, 97, "neon_pink")
        k.walls(21, 15, 166, 169, "neon_pink")


def skyline_tower_c(k, lod):
    """Far eight-sided tower, 34 m across and 144 m tall, cool windows, a violet crown."""
    ring_walls(k, 8, 18.4, 0, 96, "sky_c", 15.0)
    ring_walls(k, 8, 18.4, 96, 144, "sky_c", 15.0)
    k.prism(8, 18.4, 18.4, 143.9, 144, "glass_dark", phase=-math.pi / 2 - math.pi / 8, cap="glass_dark")
    if lod == 0:
        k.prism(8, 19.0, 19.0, 141, 145, "neon_violet", phase=-math.pi / 2 - math.pi / 8)
        k.prism(8, 9.0, 7.0, 144, 156, "glass_dark", phase=-math.pi / 2 - math.pi / 8, cap="glass_dark")


LEAN = 2.5  # m the spire's top leans toward -x


def spire_half(t):
    """Half-size of the spire at height t (0 ground, 1 at 192 m): 16 m curving in (concave) to 10 m, a broad sail."""
    return 10 + 6 * (1 - t) ** 1.5


def spire_ring(t, chamfer, shrink=0.0):
    """Plan at height t, counter-clockwise from the front-left corner: a square leaning toward -x, corners chamfered."""
    h, cx, c = spire_half(t) - shrink, -LEAN * t * t, chamfer
    pts = ((-h + c, -h), (h - c, -h), (h, -h + c), (h, h - c), (h - c, h), (-h + c, h), (-h, h - c), (-h, -h + c)) if c else ((-h, -h), (h, -h), (h, h), (-h, h))
    return [(cx + x, y) for x, y in pts]


def spire_loft(k, lo, hi, cells):
    """Faces between two rings of (x, y, z) points; cells[i] dresses edge i. sky_a keeps its window size: u spans the
    face's width in the 32 m cell and v its height in the 96 m tile, so window columns run out as the faces narrow."""
    n = len(lo)
    for i, cell in enumerate(cells):
        a0, b0, b1, a1 = lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]
        uvs = ((0, 0),) * 4
        if cell == "sky_a":
            w0, w1, v0 = math.dist(a0[:2], b0[:2]) / 64, math.dist(a1[:2], b1[:2]) / 64, (a0[2] % 96) / 96
            v1 = v0 + (a1[2] - a0[2]) / 96
            uvs = ((0.5 - w0, v0), (0.5 + w0, v0), (0.5 + w1, v1), (0.5 - w1, v1))
        k.face((a0, b0, b1, a1), cell, uvs)


def skyline_spire(k, lod):
    """The sail spire of frame 03: a 32 m shaft whose sides curve in to 20 m at 192 m and lean toward -x, a pink neon
    chamfer up every corner, a dark crown cut on the slant (high side -x) with a glowing top, a red sign under it and
    three pink-lit masts, 252 m in all. LOD 1: the same profile, square, in two lifts, one mast."""
    chamfer, levels = (1.3, (0.0, 0.25, 0.5, 0.75, 1.0)) if lod == 0 else (0.0, (0.0, 0.5, 1.0))
    cells = ("sky_a", "neon_pink") * 4 if chamfer else ("sky_a",) * 4
    rings = [[(x, y, t * 192) for x, y in spire_ring(t, chamfer)] for t in levels]
    for lo, hi in zip(rings, rings[1:]):
        spire_loft(k, lo, hi, cells)
    slant = lambda x: 204 - 0.8 * (x + LEAN)  # noqa: E731  crown top: 212 m on the -x side, 196 m on +x
    top = [(x, y, slant(x)) for x, y in spire_ring(1, chamfer * 0.8, shrink=0.8)]
    spire_loft(k, rings[-1], top, ["glass_dark" if c == "sky_a" else c for c in cells])
    k.face(top, "neon_pink", ((0, 0),) * len(top))
    # Red sign 170-180 m up the street face, 0.4 m proud of it: the face is planar between the 144 m and 192 m rings.
    y = lambda z: -(spire_half(0.75) + (spire_half(1) - spire_half(0.75)) * (z - 144) / 48) - 0.4  # noqa: E731
    cx = -LEAN * (175 / 192) ** 2
    k.quad((cx - 3.5, y(170), 170), (cx + 3.5, y(170), 170), (cx + 3.5, y(180), 180), (cx - 3.5, y(180), 180), "sign_small_a")
    for x, yy, h in ((-LEAN - 4.0, 0.0, 252), (-LEAN - 1.6, 1.2, 240), (-LEAN + 1.0, -1.0, 232))[:3 if lod == 0 else 1]:
        k.tube([(x, yy, slant(x) - 0.5), (x, yy, h)], [0.45, 0.15], 3, "neon_pink", smooth=False)
