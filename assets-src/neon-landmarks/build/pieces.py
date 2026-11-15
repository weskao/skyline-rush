"""The Neon Downtown landmark pieces: the nine of the 4000 m lap here, the harbour and oldtown six in sectors.py. Metres; +X = the driver's right, +Y = the driving direction, +Z = up.

Spanning pieces (pivot on the road centre line at road level) keep the road clear: nothing closer than
CLEAR_HALF to the centre line below the piece's clear height (asset-brief.md, "Clearances"). Side pieces
have their pivot at the centre of their footprint; +X is the side away from the road (the water for the bank).
Constants name the concept frame they were read from, or are marked inferred.
"""
import math
import random

from mathutils import Vector

from geo import Builder
from materials import MATS
from sectors import cargo_ship, clock_tower, container_stack, harbour_gantry, lantern_span, oldtown_gate

CLEAR_HALF = 14.0   # road half 12 + kerb to 12.675 + the procedural tunnel wall's outer face at 13.1
CLEAR_HEIGHT = 5.6   # underpass: lowest steel over the road. The game stops a car's roof at 4 m; frame 04 is taller still
RIBS = (1.4, 4.2, 7.0, 9.8, 12.6)   # underpass ceiling ribs, shared by the portal and the segment (frame 04)
MODULE = 12.0   # repeat spacing of every repeatable piece = the road render's STEP


def _railing(b, mat, along, at, z0, z1, posts, mids, half=0.05):
    """Post-and-rail fence. along = 'x' or 'y' (the axis it runs on), at = its position on the other axis."""
    lo, hi = posts[0] - (posts[1] - posts[0]) / 2, posts[-1] + (posts[1] - posts[0]) / 2
    box = (lambda a, c, z, **kw: b.box(mat, a, c, z, **kw)) if along == "x" else (lambda a, c, z, **kw: b.box(mat, c, a, z, **kw))
    end = "+" + along
    for p in posts:
        box((p - half, p + half), (at - half, at + half), (z0, z1), swatch=True, lod=(0, 0), skip="-z+z")
    box((max(lo, 0), hi), (at - half * 1.6, at + half * 1.6), (z1, z1 + 0.08), swatch=True, skip=end)
    # far LOD: one dark panel stands in for the posts and mid rails, or the top rail floats on nothing
    box((max(lo, 0), hi), (at - half / 2, at + half / 2), (z0, z1), swatch=True, lod=(1, 1), skip=end + "-z+z")
    for f in mids:
        z = z0 + (z1 - z0) * f
        box((max(lo, 0), hi), (at - half / 2, at + half / 2), (z, z + 0.05), swatch=True, lod=(0, 0), skip=end)


def _underpass_shell(b, y0, y1, clad0, clad1, wall=14.2):
    """Ceiling slab and longitudinal ribs from y0 to y1; tile cladding and the amber strip from clad0 to clad1."""
    b.box("tile", (wall - 0.05, wall), (clad0, clad1), (0.25, 4.75), only="-x", pri=1.4)
    b.box("concrete", (0, wall), (y0, y1), (6.8, 7.2), only="-z", pri=0.6)
    for x in RIBS:
        b.box("steel_dark", (x - 0.25, x + 0.25), (y0, y1), (CLEAR_HEIGHT + 0.1, 6.8), skip="+z", pri=0.6)
    b.box("amber", (wall - 0.12, wall), (clad0 + 1, clad1 - 1), (4.98, 5.1), swatch=True, skip="+x")
    b.box("steel_dark", (wall - 0.15, wall), (clad0 + 0.9, clad1 - 0.9), (5.1, 5.2), swatch=True, skip="+x")


def _joint_frame(b, y0, y1, wall=14.2):
    """Pilaster and beam over the joint to the next module. They stand proud of the wall, ceiling, roof and
    outer face, so they hide the wedge that opens on the outside of a corner (0.72 m per end at R = 118 m)
    and the overlap on the inside; nothing of two neighbours is ever coplanar in view."""
    b.box("concrete", (CLEAR_HALF, wall + 0.7), (y0, y1), (-0.4, 7.3), skip="-z")
    b.box("concrete", (0, CLEAR_HALF), (y0, y1), (CLEAR_HEIGHT, 7.3), skip="+x")


def rail_portal(b):
    """Frame 04: steel plate-girder rail deck on splayed concrete abutments. Authored as the entry mouth: the
    mouth faces -Y (the approaching driver), the tunnel side (+Y) ends in a joint frame. Exit = yawed 180 deg."""
    wall, end, mouth, seat = 14.2, 22.0, -8.0, 5.88   # seat: girder soffit = the top of the mouth
    b.box("concrete", (wall, end), (-6.2, 8), (-0.4, 6.8), skip="-z", pri=1.2)
    # splayed mouth: 16.4 m from the centre at the road, 14.7 m under the girder (frame 04's trapezoid)
    b.hull("concrete", [(wall, -6.2, -0.4), (wall, -6.2, seat), (end, -6.2, -0.4), (end, -6.2, seat),
                        (16.4, mouth, -0.4), (14.7, mouth, seat), (end, mouth, -0.4), (end, mouth, seat)], skip="+y-z", pri=1.2)
    b.cyl("amber", (16.3, mouth - 0.03, 0.3), (14.85, mouth - 0.03, seat - 0.2), 0.08, n=4, swatch=True)
    _underpass_shell(b, -7.4, 8, -6.2, 8)
    _joint_frame(b, 7.2, 9.5)
    for side, pri in ((-1, 0.9), (1, 0.4)):                                              # a plate girder under each deck edge
        b.box("steel_dark", (0, end), sorted((7.6 * side, 7.8 * side)), (6.0, 9.4), pri=pri)
        for z in (seat, 9.4):
            b.box("steel_dark", (0, end), sorted((7.35 * side, 8.0 * side)), (z, z + 0.12), pri=pri)
        _railing(b, "steel_dark", "x", 7.67 * side, 9.52, 10.6, list(range(1, 22, 2)), (0.35, 0.68))
    for x in range(1, 22, 2):
        b.box("steel_dark", (x - 0.06, x + 0.06), (mouth, -7.8), (6.0, 9.4), swatch=True, lod=(0, 0), skip="+y+z-z")
    b.box("concrete", (end - 0.2, end), (-7.6, 7.6), (6.8, 9.1), only="+x")
    b.box("ballast", (0, end), (-7.6, 7.6), (8.8, 9.1), only="+z", pri=0.5)
    for y in (-3.22, -1.78, 1.78, 3.22):                                                 # two tracks
        b.box("steel_bare", (0, end), (y - 0.04, y + 0.04), (9.1, 9.24), swatch=True, lod=(0, 0), skip="-z")


def rail_segment(b):
    """Frame 04 interior: 12 m of walls, ceiling and lamp strip, with a joint frame over its +Y end."""
    half, wall = MODULE / 2, 14.2
    b.box("concrete", (wall, wall + 0.6), (-half, half), (-0.4, 7.2), only="-x+x", pri=0.8)
    b.box("concrete", (0, wall + 0.6), (-half, half), (7.1, 7.2), only="+z", pri=0.3)   # roof, seen from above
    _underpass_shell(b, -half, half, -half, half)
    _joint_frame(b, 5.2, 7.5)


def expressway_pier(b):
    """Frames 06 and 07: hammerhead pier under the deck. Its top is the deck soffit, 1.5 m under the road."""
    b.box("concrete", (0, 2.6), (0, 1.3), (-16.0, -5.2), skip="-z+z", pri=0.7)           # depth to ground: inferred
    b.prism("concrete", [(0, -5.2), (2.6, -5.2), (13.4, -2.7), (13.4, -1.5), (0, -1.5)], 0, 1.3, pri=0.8)
    for x, y in (((2.6, 2.85), (0, 1.0)), ((0, 1.8), (1.3, 1.55))):                      # amber wash lights (frame 06)
        b.box("steel_dark", x, y, (-10.5, -10.2), swatch=True)
        b.box("amber", x, y, (-10.2, -10.15), only="+z", swatch=True)


def expressway_rail(b):
    """Frame 06: concrete parapet, teal steel rail, a cyan band and a cyan marker post every 6 m.
    Local x = 0 is the rail line; -x faces the road. The fascia hides the deck edge down to -1.6 m."""
    half = MODULE / 2
    b.box("concrete", (-0.75, 0.45), (0, half), (-1.6, -0.02), skip="-x+y", pri=0.8)
    b.box("concrete", (-0.3, 0.3), (0, half), (-0.02, 0.55), skip="-z+y", pri=1.5)
    for y0, y1 in ((0, 0.09), (half - 0.09, half)):
        b.box("steel_teal", (-0.1, 0.1), (y0, y1), (0.55, 1.3), swatch=True, skip="-z+z")
    b.box("steel_teal", (-0.17, 0.17), (2.83, 3.17), (0.55, 1.42), swatch=True, skip="-z")
    b.box("cyan", (-0.2, -0.17), (2.9, 3.1), (0.72, 1.25), swatch=True, skip="+x")
    b.box("cyan", (-0.1, 0.1), (3.17, 3.2), (0.72, 1.25), swatch=True, skip="-y")
    b.box("cyan", (-0.1, 0.1), (2.8, 2.83), (0.72, 1.25), swatch=True, skip="+y")
    b.box("steel_bare", (-0.16, 0.16), (0, half), (1.3, 1.4), swatch=True, skip="+y")
    for z in (0.85, 1.08):
        b.box("steel_teal", (-0.04, 0.04), (0, half), (z, z + 0.06), swatch=True, lod=(0, 0), skip="+y")
    for y0, y1 in ((0.2, 2.75), (3.25, 5.85)):
        b.box("cyan", (-0.06, 0.06), (y0, y1), (0.6, 0.74), swatch=True, skip="-z")


def canal_bridge_rail(b):
    """Frame 07: dark steel post-and-rail on a stone kerb, a cyan lantern post every 6 m, cyan under the edge."""
    half = MODULE / 2
    b.box("concrete", (-0.75, 0.4), (0, half), (-1.3, -0.02), skip="-x+y", pri=0.8)
    b.box("cyan", (0.4, 0.43), (0, half), (-0.32, -0.22), only="+x", swatch=True)
    b.box("stone", (-0.3, 0.3), (0, half), (-0.02, 0.25), skip="-z+y", pri=1.5)
    _railing(b, "steel_dark", "y", 0.0, 0.25, 1.2, [1, 3, 5], (0.3, 0.55, 0.8))
    b.box("steel_dark", (-0.15, 0.15), (2.85, 3.15), (0.25, 1.32), swatch=True, skip="-z")
    b.box("cyan", (-0.18, -0.15), (2.9, 3.1), (0.5, 1.2), swatch=True, skip="+x")
    b.box("cyan", (-0.1, 0.1), (3.15, 3.18), (0.5, 1.2), swatch=True, skip="-y")
    b.box("cyan", (-0.1, 0.1), (2.82, 2.85), (0.5, 1.2), swatch=True, skip="+y")


SPAN, RISE, RIB_X, LEAN = 120.0, 34.0, 16.5, 4.5   # frames 06/07: rise about 0.3 of the span; ribs lean together


def arch_axis(y):
    z = 0.8 + RISE * (1 - (2 * y / SPAN) ** 2)
    return Vector((RIB_X - LEAN * (z - 0.8) / RISE, y, z))


def canal_arch(b):
    """Frame 07: twin leaning steel ribs along the road with hangers, on concrete springing blocks; the road runs
    between the ribs. Includes the walkway deck outside the road, its fascia and soffit."""
    n = 24
    ys = [SPAN / 2 * i / n for i in range(n + 1)]
    pts = [arch_axis(y) for y in ys]
    tans = [arch_axis(y + 0.01) - arch_axis(y - 0.01) for y in ys]
    b.sweep("steel_arch", pts, tans, 2.0, 2.6, pri=0.8)
    b.sweep("cyan", pts, tans, 0.1, 0.18, offset=(1.02, -1.0), swatch=True)             # outer face, top edge
    b.sweep("cyan", pts, tans, 0.1, 0.18, offset=(-1.02, 1.0), swatch=True)             # inner face, bottom edge
    for y in range(6, 55, 6):
        top = arch_axis(y) - Vector((0, 0, 1.25))
        b.cyl("steel_bare", (RIB_X, y, 0.25), top, 0.06, n=5, caps=False, swatch=True, lod=(0, 0))
        b.cyl("steel_bare", (RIB_X, y, 0.25), top, 0.07, n=3, caps=False, swatch=True, lod=(1, 1))
    for y in (0, 12, 24, 36):                                                            # bracing, all above 21 m
        a = arch_axis(y)
        b.box("steel_arch", (0, a.x), (max(y - 0.45, 0), y + 0.45), (a.z - 0.45, a.z + 0.45), skip="+x", pri=0.5)
    for y in (0, 22, 44):                                                                # 22 m runs: islands that fit the atlas
        b.box("paving", (13.6, 18.0), (y, y + 22), (-0.3, 0.25), only="+z-x")
        b.box("steel_arch", (17.6, 18.0), (y, y + 22), (-2.2, 0.25), only="+x", pri=0.6)
        b.box("steel_dark", (0, 18.0), (y, y + 22), (-2.2, -2.0), only="-z", pri=0.3)
    b.box("cyan", (18.0, 18.04), (0, 60), (-0.5, -0.38), only="+x", swatch=True)
    _railing(b, "steel_dark", "y", 17.8, 0.25, 1.3, [1.5 + 3 * i for i in range(18)], (0.4, 0.75))
    # springing block: foot at -10 m (water at about -6, inferred), top above the deck where the rib lands
    b.prism("concrete", [(55.5, -10), (66.5, -10), (66.5, 1.6), (63.5, 2.6), (57.0, 2.6), (55.5, 1.2)], 14.6, 19.2, axis="x", skip="-z", pri=0.8)
    for x, y in (((19.2, 19.5), (57, 65)), ((14.8, 19.0), (55.2, 55.5))):                # amber wash, frame 07
        b.box("steel_dark", x, y, (-5.2, -4.95), swatch=True)
        b.box("amber", x, y, (-4.95, -4.9), only="+z", swatch=True)


def canal_bank(b):
    """Frame 07, left: stone quay wall with coping, promenade, railing and an amber bollard lamp every 6 m.
    +X faces the water. The wall goes down to -8 m; water level is the runtime's (about -6)."""
    half = MODULE / 2
    b.prism("stone", [(2.0, -8), (2.9, -8), (2.6, 0), (2.0, 0)], 0, half, skip="-x-z+z+y", pri=0.8)
    b.box("stone", (1.9, 3.0), (0, half), (0, 0.3), skip="-z+y", pri=1.3)
    b.box("paving", (-3.5, 1.9), (0, half), (-0.4, 0), only="+z", pri=1.2)
    _railing(b, "steel_dark", "y", 2.75, 0.3, 1.35, [1, 3, 5], (0.35, 0.68), half=0.04)
    b.box("steel_dark", (0.8, 1.0), (2.9, 3.1), (0, 0.85), swatch=True, skip="-z+z")
    b.box("amber", (0.78, 1.02), (2.88, 3.12), (0.85, 1.05), swatch=True, skip="-z+z")
    b.box("steel_dark", (0.76, 1.04), (2.86, 3.14), (1.05, 1.1), swatch=True)


# azimuth and lean (degrees), length and blade half-width (m): read off frame 08, tallest blade first
SHARDS = ((100, 12, 15.0, 2.1), (20, 20, 12.0, 1.9), (200, 32, 8.5, 1.6), (310, 40, 6.5, 1.5), (260, 58, 5.0, 1.2), (150, 50, 4.2, 1.1))


def plaza_sculpture(b):
    """Frame 08: faceted steel blades fanning from a violet-lit stepped plinth; about 15 m tall."""
    circle = lambda r: [(r * math.cos(a), r * math.sin(a)) for a in (2 * math.pi * i / 32 for i in range(32))]
    b.prism("stone", circle(7.0), 0, 0.2, axis="z", skip="-z", pri=0.8)
    b.prism("stone", circle(5.4), 0.2, 0.45, axis="z", skip="-z")
    b.ring("violet", 4.1, 4.4, 0.45, 0.5, swatch=True, skip="-z")
    b.ring("violet", 5.4, 5.46, 0.24, 0.34, swatch=True)
    rng = random.Random(8)
    for azimuth, lean, length, width in SHARDS:
        a, tilt = math.radians(azimuth), math.radians(lean)
        out, side, up = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0)), Vector((0, 0, 1))
        axis = out * math.sin(tilt) + up * math.cos(tilt)
        foot = out * 0.9 + up * 0.4
        points = [foot + side * s * width * 0.55 + out * o * width * 0.3 for s, o in ((-1, 0), (1, 0), (0, 1), (0, -1))]
        shoulder = foot + axis * length * rng.uniform(0.28, 0.4)
        points += [shoulder + side * s * width + out * o * width * rng.uniform(0.35, 0.5) for s, o in ((-1, 0), (1, 0), (0, 1), (0, -1))]
        b.hull("crystal", points + [foot + axis * length + side * rng.uniform(-0.4, 0.4)], pri=1.3)


def boulevard_footbridge(b):
    """Frame 03: concrete footbridge on two round columns, pink strips under the deck. The frame shows the deck
    about 7 m up; it is raised to 14.2 m so a flying car (top at 13.2 m) passes under it, and the deck and
    columns are made heavier in step (inferred) so it still reads as the frame's squat concrete bridge."""
    soffit, column, radius = 14.2, 16.0, 1.6
    top = soffit + 1.8
    b.box("concrete", (0, 22), (0, 2.8), (soffit, top), pri=0.8)
    b.box("concrete", (0, 22), (2.5, 2.8), (top, top + 0.35), skip="-z")
    _railing(b, "steel_dark", "x", 2.65, top + 0.35, top + 1.3, list(range(1, 22, 2)), (0.35, 0.68))
    b.cyl("concrete", (column, 0, 0.5), (column, 0, 12.0), radius, n=12, caps=False, mirror="x", pri=0.9)
    b.cyl("stone", (column, 0, -0.2), (column, 0, 0.5), radius + 0.2, n=12, mirror="x")
    ring = [(column + radius * math.cos(a), radius * math.sin(a), 12.0) for a in (math.pi * i / 6 for i in range(12))]
    b.hull("concrete", ring + [(x, y, soffit) for x in (14.2, 17.8) for y in (-2.6, 2.6)], mirror="x", skip="+z-z")
    b.box("pink", (0, 14.0), (2.2, 2.34), (soffit - 0.1, soffit), swatch=True, skip="+z")
    b.box("pink", (0, 14.0), (2.8, 2.84), (soffit + 0.1, soffit + 0.26), only="+y", swatch=True)


# name -> (builder, mirror axes). Order = the order of the stations the pieces are baked at.
PIECES = {
    "rail_portal": (rail_portal, "x"), "rail_segment": (rail_segment, "x"),
    "expressway_pier": (expressway_pier, "xy"), "expressway_rail": (expressway_rail, "y"),
    "canal_arch": (canal_arch, "xy"), "canal_bridge_rail": (canal_bridge_rail, "y"), "canal_bank": (canal_bank, "y"),
    "plaza_sculpture": (plaza_sculpture, ""), "boulevard_footbridge": (boulevard_footbridge, "xy"),
    # harbour and oldtown sectors of the 10 km lap (sectors.py)
    "harbour_gantry": (harbour_gantry, "y"), "container_stack": (container_stack, ""), "cargo_ship": (cargo_ship, "x"),
    "oldtown_gate": (oldtown_gate, "x"), "lantern_span": (lantern_span, "x"), "clock_tower": (clock_tower, "xy"),
}


def build_half(name):
    make, mirror = PIECES[name]
    b = Builder(name, list(MATS), mirror)
    make(b)
    return b
