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


def cherry_tree(k, lod):
    """Blossoming street tree, about 6.5 m: leaning trunk, three boughs, opaque blossom masses."""
    sides, sub = (7, 5, 3)[lod], (3, 2, 1)[lod]
    top = 3.0 if lod < 2 else 4.5  # no boughs at LOD 2: the trunk itself reaches into the canopy
    k.tube([(0, 0, 0), (0.05, 0.02, 1.1), (0.22, 0.05, 2.2), (0.3, 0.1, top)], [0.27, 0.2, 0.17, 0.15], sides, "bark", caps=(False, False))
    if lod == 0:
        k.prism(7, 0.42, 0.27, 0, 0.3, "bark", centre=(0.0, 0.0))
    for path, radii in (([(0.3, 0.1, 3.0), (1.0, -0.3, 3.9), (1.6, -0.5, 4.5)], [0.13, 0.09, 0.05]),
                        ([(0.3, 0.1, 3.0), (-0.6, 0.5, 3.9), (-1.3, 0.8, 4.6)], [0.13, 0.09, 0.05]),
                        ([(0.3, 0.1, 3.0), (0.2, -0.4, 4.1), (0.1, -0.9, 5.0)], [0.12, 0.08, 0.05]))[:3 if lod < 2 else 0]:
        k.tube(path, radii, max(sides - 2, 3), "bark", caps=(False, False))
    puffs = [((0.2, 0.0, 5.3), (1.5, 1.4, 1.0)), ((1.7, -0.6, 4.7), (1.2, 1.1, 0.75)), ((-1.5, 0.9, 4.8), (1.25, 1.1, 0.8)),
             ((0.1, -1.4, 5.1), (1.15, 1.0, 0.7)), ((0.6, 1.3, 5.2), (1.1, 1.05, 0.7)), ((-1.1, -0.7, 5.5), (1.0, 0.95, 0.65)),
             ((1.3, 0.7, 5.7), (0.95, 0.9, 0.6)), ((2.5, -0.2, 4.3), (0.8, 0.75, 0.5)), ((-2.3, 0.3, 4.4), (0.85, 0.8, 0.5))]
    for i, (centre, radii) in enumerate(puffs if lod < 2 else [((0.15, 0.0, 5.0), (2.7, 2.3, 1.2)), ((0.3, 0.2, 5.6), (1.5, 1.4, 0.8))]):
        k.puff(centre, radii, sub, "blossom", seed=3.0 + i * 1.7)


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


def skyline_spire(k, lod):
    """The pink-crowned spire of frame 03: a 30 m square shaft tapering to 14 m at 192 m, pink edge lines,
    a glowing crown and three antenna masts, 252 m in all."""
    r0, r1, phase = 15 * math.sqrt(2), 7 * math.sqrt(2), -3 * math.pi / 4
    k.prism(4, r0, r1, 0, 192, "sky_a", phase=phase)
    k.prism(4, r1 + 0.6, 4.0, 192, 214, "neon_pink", phase=phase, cap="neon_pink")
    if lod == 0:
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):  # edge lines: a three-sided tube up each corner
            k.tube([(sx * 15.2, sy * 15.2, 0.07), (sx * 7.2, sy * 7.2, 192)], [1.1, 0.8], 3, "neon_pink", caps=(False, False), smooth=False)
        k.prism(4, r1 + 1.2, r1 + 1.2, 189, 193, "neon_pink", phase=phase)
    for x, y, top in ((0, 0, 252), (-2.2, 1.2, 238), (2.0, -1.4, 230))[:3 if lod == 0 else 1]:
        k.tube([(x, y, 212), (x, y, top)], [0.45, 0.15], 3, "steel_light", smooth=False)
