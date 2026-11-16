"""Builds assets-src/pickup-tank/pickup-tank.blend and textures/ from nothing (no downloads, no random seed,
no personal paths): the gold twin-tank power-up, one mesh `pickup_tank` with one baked material `pickup_tank_pbr`.

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/pickup-tank/build.py

Shapes are three.js units (X right, Y up, +Z front) measured off ref/front.png, ref/side.png and ref/back.png
(frames 0, 4 and 8 of the 16-frame turn in docs/designs/road-pickups/ai-sprite-sources/tank-sheet.png) at
112 px per unit: tank radius 47 px, tank centres 100 px apart. The reference is 1.45 times wider than tall;
the tier's size limit and the 1.9 minimum height allow 1.16 at most, so the tanks are taller than drawn.
Materials, bevels, UVs, the bake and the save live in scripts/assets/pickup_kit.py, shared with the other tiers.

Byte budget (300 KB): the normal map is half of the GLB and only its exactly flat blocks compress away, so:
- shipped faces meet either under 20 degrees (tank sections: smooth in source and shipped mesh alike) or over
  50 degrees (hard edge when shipped, bevel in the source); anything between bakes a gradient over whole faces;
- bevel=0.0 on a flat-faced part keeps its normal map flat; only the large armour forms and the gold carry bevels;
- a part near gold either cuts into it along a straight line or stays more than the bake cage (0.03) away:
  a slanted cut bakes a stair-stepped seam, a near miss bakes the part onto the tank.
"""
import math
import os
import sys

from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts", "assets"))

from pickup_kit import Kit, rect  # noqa: E402

kit = Kit("pickup-tank")  # tank metal is the kit's own "gold"

CX, R = 0.445, 0.42  # tank axis offset and body radius
BAND = R + 0.03      # the wider band at the top of a tank
SIDES = 20           # 18 degree edges


def ring(radius, sides=SIDES, x=0.0, z=0.0):
    """Regular outline about (x, z), turned half a step so flat faces look along +-X and +-Z."""
    return [(x + radius * math.cos(math.tau * (i + 0.5) / sides), z + radius * math.sin(math.tau * (i + 0.5) / sides))
            for i in range(sides)]


def box(w, d, x=0.0, z=0.0):
    return [(u + x, v + z) for u, v in rect(w, d)]


def scaled(outline, k):
    return [(u * k, v * k) for u, v in outline]


def face(px, pz, yaw, proud=0.0):
    """plate() placement for a face through (px, pz) looking along `yaw`, standing `proud` of that point."""
    a = math.radians(yaw)
    return {"yaw": yaw, "dist": px * math.sin(a) + pz * math.cos(a) + proud, "x": px * math.cos(a) - pz * math.sin(a)}


def on_tank(s, yaw, radius, proud):
    """Placement on tank `s` (+1 right, -1 left) where its surface looks along `yaw`."""
    a = math.radians(yaw)
    return face(s * CX + radius * math.sin(a), radius * math.cos(a), yaw, proud)


def turned(s, profile, name, mat, caps=(False, False)):
    """Tank part from [(y, radius), ...]. bevel stays below 0.02 so the shipped rings are not chamfered."""
    kit.loft(name, [(y, ring(r, x=s * CX)) for y, r in profile], mat, bevel=0.012, caps=caps)


def strut(name, path, w, h):
    """Armour bar swept along three.js points; w is its horizontal thickness, h its height. No segment may be vertical."""
    points = [Vector(p) for p in path]
    rings = []
    for i, p in enumerate(points):
        before, after = points[max(i - 1, 0)], points[min(i + 1, len(points) - 1)]
        along = (after - before).normalized()
        side = along.cross(Vector((0.0, 1.0, 0.0))).normalized()
        up = side.cross(along)
        if before != p != after:  # mitre: widen the corner section so both segments keep thickness w
            side /= math.sqrt((1 + (p - before).normalized().dot((after - p).normalized())) / 2)
        rings.append([p + side * (a * w / 2) + up * (b * h / 2) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    last = 4 * (len(rings) - 1)
    faces = [(r * 4 + i, r * 4 + (i + 1) % 4, (r + 1) * 4 + (i + 1) % 4, (r + 1) * 4 + i)
             for r in range(len(rings) - 1) for i in range(4)] + [(0, 1, 2, 3), (last, last + 1, last + 2, last + 3)]
    kit._part(name, [tuple(v) for corners in rings for v in corners], faces, "armour", 0.0, True)


def slab(name, outline, yaw, dist, depth, y, bevel):
    """Armour plate standing clear of what is behind it: kit.plate() plus a cover for its open back.
    The outline must be left-right symmetric (the cover is seen from the other side)."""
    kit.plate(name, outline, "armour", yaw, dist, depth, y=y, bevel=bevel, low=True)
    kit.plate(name + "_back", outline, "armour", yaw + 180, depth - dist, 0.004, y=y, bevel=0.0, low=True)


# Base: dark plinth under an armoured deck, 2.12 x 1.24 with 0.40 corner cuts. The deck's first ring is its
# underside, from the plinth outwards.
BASE_W, BASE_D, CUT = 2.12, 1.24, 0.40
DECK, PLINTH = rect(BASE_W, BASE_D, CUT), rect(1.90, 1.02, 0.33)
kit.loft("plinth", [(0.0, PLINTH), (0.10, PLINTH)], "inset", bevel=0.0, caps=(True, False))
kit.loft("deck", [(0.07, PLINTH), (0.07, DECK), (0.32, DECK)], "armour", bevel=0.04, caps=(False, True))

BROW = rect(0.42, 0.17, 0.04)
CORNER = ((BASE_W - CUT) / 2, (BASE_D - CUT) / 2)  # middle of a corner cut
for sx in (1, -1):
    for sz in (1, -1):
        at = (sx * CORNER[0], sz * CORNER[1], math.degrees(math.atan2(sx, sz)))
        kit.plate("corner_brow", BROW, "armour", **face(*at, 0.035), depth=0.07, y=0.165, bevel=0.018, low=True)
        kit.plate("corner_slot", rect(0.29, 0.085), "inset", **face(*at, 0.04), depth=0.01, y=0.165, bevel=0.0)
        kit.plate("corner_strip", rect(0.24, 0.05), "strip", **face(*at, 0.047), depth=0.03, y=0.165, bevel=0.0, low=True)
        # Front and back: a brow either side of the centre light.
        kit.plate("brow", BROW, "armour", **face(sx * 0.43, sz * BASE_D / 2, 90 - sz * 90, 0.035), depth=0.07, y=0.165,
                  bevel=0.018, low=True)
        for x in (0.29, 0.57):
            kit.bolt(90 - sz * 90, BASE_D / 2 + 0.035, 0.165, sz * sx * x)
for yaw, dist, width in ((0, BASE_D / 2, 0.32), (180, BASE_D / 2, 0.38), (90, BASE_W / 2, 0.26), (270, BASE_W / 2, 0.26)):
    kit.plate("base_slot", rect(width + 0.06, 0.09), "inset", yaw, dist + 0.006, 0.01, y=0.15, bevel=0.0)
    kit.plate("base_strip", rect(width, 0.05), "strip", yaw, dist + 0.012, 0.03, y=0.15, bevel=0.0, low=True)

# Twin tanks: gold shell with a band under the shoulder, dark neck, gold dome with a light slot, armour lid.
# Each cone ends inside the next part, so it has one visible edge and that edge is steeper than 50 degrees.
for s in (1, -1):
    turned(s, [(0.30, R), (1.275, R), (1.295, BAND), (1.54, BAND), (1.58, 0.36)], "shell", "gold")
    turned(s, [(1.56, 0.37), (1.62, 0.37)], "neck", "inset")
    turned(s, [(1.60, 0.36), (1.60, 0.41), (1.73, 0.41), (1.84, 0.22)], "dome", "gold")
    turned(s, [(1.80, 0.23), (1.92, 0.23)], "lid", "armour", caps=(False, True))
    for yaw in (0, 180):  # level gauge and dome light, front and back
        kit.plate("gauge_frame", rect(0.17, 0.64, 0.03), "inset", **on_tank(s, yaw, R, 0.006), depth=0.03, y=0.91, bevel=0.0)
        kit.plate("gauge", rect(0.11, 0.56), "glass", **on_tank(s, yaw, R, 0.014), depth=0.04, y=0.91, bevel=0.0, low=True)
        kit.plate("dome_slot", rect(0.21, 0.085), "inset", **on_tank(s, yaw, 0.41, 0.004), depth=0.03, y=1.665, bevel=0.0)
        kit.plate("dome_strip", rect(0.16, 0.05), "strip", **on_tank(s, yaw, 0.41, 0.012), depth=0.04, y=1.665, bevel=0.0,
                  low=True)
    for yaw in (30, 150, 210, 330):  # band bolts either side of the gauges
        kit.bolt(**on_tank(s, yaw, BAND, 0.0), y=1.42)

# Front: shield with the diamond emblem, standing clear of the tanks on a spine between them. The recess and
# both diamonds are real geometry, so their outlines stay sharp at any size.
SHIELD = [(-0.12, 0.50), (0.12, 0.50), (0.40, 0.0), (0.12, -0.50), (-0.12, -0.50), (-0.40, 0.0)]
DIAMOND = [(0.0, 0.34), (0.215, 0.0), (0.0, -0.34), (-0.215, 0.0)]
kit.loft("spine", [(0.30, box(0.30, 0.28, z=0.44)), (1.14, box(0.30, 0.28, z=0.44))], "armour", bevel=0.0, caps=(False, True))
slab("shield", SHIELD, 0, 0.69, 0.18, 0.80, bevel=0.03)
kit.plate("shield_recess", scaled(SHIELD, 0.76), "inset", 0, 0.698, 0.02, y=0.80, bevel=0.0, low=True)
kit.plate("diamond", DIAMOND, "glass", 0, 0.706, 0.02, y=0.80, bevel=0.0, low=True)
kit.plate("diamond_core", scaled(DIAMOND, 0.48), "emblem", 0, 0.714, 0.02, y=0.80, bevel=0.0, low=True)
for x, y in ((-0.352, 0.0), (0.352, 0.0), (0.0, 0.44), (0.0, -0.44)):
    kit.bolt(0, 0.69, 0.80 + y, x, radius=0.022)

# Ends: stepped pylon beside each tank, clamp over its upper band, hexagonal panel with three light bars.
HEX = [(-0.30, 0.0), (-0.17, 0.30), (0.17, 0.30), (0.30, 0.0), (0.17, -0.30), (-0.17, -0.30)]
for s in (1, -1):
    kit.loft("pylon", [(0.26, box(0.24, 0.56, s * 0.92)), (0.88, box(0.24, 0.56, s * 0.92))], "armour", bevel=0.025,
             caps=(False, True))
    kit.loft("pylon_arm", [(0.86, box(0.16, 0.26, s * 0.90)), (1.36, box(0.16, 0.26, s * 0.90))], "armour", bevel=0.0,
             caps=(False, False))
    kit.loft("clamp", [(1.33, box(0.21, 0.34, s * 0.905)), (1.57, box(0.21, 0.34, s * 0.905))], "armour", bevel=0.0)
    yaw = 90 * s
    kit.plate("end_panel", HEX, "armour", yaw, 1.075, 0.10, y=0.64, bevel=0.025, low=True)
    kit.plate("end_recess", scaled(HEX, 0.78), "inset", yaw, 1.081, 0.02, y=0.64, bevel=0.0, low=True)
    for y in (0.53, 0.64, 0.75):
        kit.plate("end_bar", rect(0.24, 0.055), "strip", yaw, 1.087, 0.02, y=y, bevel=0.0, low=True)
    for x in (-0.25, 0.25):
        kit.bolt(yaw, 1.075, 0.64, x, radius=0.022)
    kit.plate("arm_rib", rect(0.07, 0.30), "inset", yaw, 0.985, 0.012, y=1.11, bevel=0.0)
    for z in (-0.11, 0.11):
        kit.bolt(yaw, 1.01, 1.45, z, radius=0.024)
    # Belt from the spine and the back panel to the pylon.
    strut("belt", [(s * 0.10, 0.52, 0.50), (s * 0.66, 0.48, 0.59), (s * 0.92, 0.52, 0.26)], 0.07, 0.14)
    strut("belt", [(s * 0.36, 0.44, -0.58), (s * 0.66, 0.46, -0.59), (s * 0.92, 0.52, -0.26)], 0.07, 0.14)

# Back: panel with two light bars, twin hexagonal feed pipes up to the manifold block.
PANEL = [(-0.30, 0.22), (0.30, 0.22), (0.46, 0.0), (0.38, -0.22), (-0.38, -0.22), (-0.46, 0.0)]
slab("back_panel", PANEL, 180, 0.665, 0.165, 0.44, bevel=0.025)
kit.plate("back_recess", scaled(PANEL, 0.78), "inset", 180, 0.671, 0.02, y=0.44, bevel=0.0, low=True)
for y, width in ((0.385, 0.44), (0.495, 0.36)):
    kit.plate("back_bar", rect(width, 0.055), "strip", 180, 0.677, 0.02, y=y, bevel=0.0, low=True)
for x in (-0.09, 0.09):
    kit.loft("pipe", [(0.56, ring(0.06, 6, x, -0.42)), (1.15, ring(0.06, 6, x, -0.42))], "armour", bevel=0.0,
             caps=(False, False))
    for y in (0.74, 1.02):
        kit.loft("pipe_collar", [(y, ring(0.073, 6, x, -0.42)), (y + 0.04, ring(0.073, 6, x, -0.42))], "bolt", bevel=0.0,
                 low=False)
kit.loft("manifold", [(1.13, box(0.36, 0.15, z=-0.42)), (1.28, box(0.36, 0.15, z=-0.42))], "armour", bevel=0.0)
kit.plate("manifold_notch", rect(0.16, 0.06), "inset", 180, 0.499, 0.01, y=1.205, bevel=0.0)
kit.plate("manifold_amber", [(-0.04, 0.015), (0.04, 0.015), (0.0, -0.017)], "amber", 180, 0.503, 0.008, y=1.205, bevel=0.0)

kit.finish(HERE)
