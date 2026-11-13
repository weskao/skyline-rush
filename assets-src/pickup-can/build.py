"""Builds assets-src/pickup-can/pickup-can.blend and textures/ from nothing (no downloads, no random seed,
no personal paths): the orange energy-canister power-up, one mesh `pickup_can` with one baked material
`pickup_can_pbr`.

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/pickup-can/build.py

Shapes are three.js units (X right, Y up, +Z front) measured off ref/front.png, ref/side.png and ref/back.png
at 150 px per unit (frames 0,0 / 1,1 / 2,0 / 3,0 of ai-sprite-sources/can-sheet.png, row,column). Materials,
bevels, UVs, the bake and the save live in scripts/assets/pickup_kit.py, shared with the other three tiers.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts", "assets"))

from pickup_kit import Kit, rect  # noqa: E402

kit = Kit("pickup-can")

SIDES = 16
FLAT = math.cos(math.pi / SIDES)  # face distance / corner radius of a 16-gon


def lathe(name, profile, mat):
    """16-sided turned part through [(y, radius), ...], listed with y rising along the outside (radius 0 closes
    an end). The 16-gon is turned half a step, so a flat face (not a corner) looks along every 22.5 degrees of yaw.

    Every facet has its own vertices, so the shipped mesh shades each one exactly flat, like the bake source: the
    normal map stays empty there (cones and domes included) and a bake ray never tilts into the wall of a plate
    standing on the facet. Shared vertices would shade the 22.5 degree edges round and fill the normal map with the
    difference, which costs the GLB its byte budget. Only the facets of a level ring or cap share vertices: they
    face the same way."""
    index, faces = {}, []
    for (ya, ra), (yb, rb) in zip(profile, profile[1:]):
        for i in range(SIDES):
            own = i if ya != yb else -1
            keys = [(y, r, k % SIDES if r else 0, own) for y, r, k in ((ya, ra, i), (yb, rb, i), (yb, rb, i + 1), (ya, ra, i + 1))]
            faces.append([index.setdefault(key, len(index)) for key in dict.fromkeys(keys)])
    turn = [math.tau * (k + 0.5) / SIDES for _, _, k, _ in index]
    verts = [(r * math.cos(a), y, r * math.sin(a)) for (y, r, _, _), a in zip(index, turn)]
    # Parts with UVs skip the kit's normal recalculation (the winding above already faces outwards). The kit's glass
    # reads v as its gradient: 0.16 at the shell's bottom to 0.74 at its top along u = 0.5, away from the hot side
    # rims, which puts the brightest band just above the shell's middle. Other materials ignore it.
    # The token bevel only keeps the part out of the kit's thin-cage pass, so bolts and seams still bake onto it.
    return kit._part(name, verts, faces, mat, 0.0005, True, [(0.5, 0.45 + 0.75 * y) for _, y, _ in verts])


def frame(name, outer, inner, mat, dist, depth, bevel):
    """Front-facing ring between two outlines of equal point count (the kit's plate cannot have a hole)."""
    k = len(outer)
    verts = [(u, v, d) for d in (dist, dist - depth) for u, v in outer + inner]
    faces = []
    for i in range(k):
        j = (i + 1) % k
        faces += [(i, j, k + j, k + i), (i, 2 * k + i, 2 * k + j, j), (k + i, k + j, 3 * k + j, 3 * k + i)]
    return kit._part(name, verts, faces, mat, bevel, True)


BODY = 0.39 * FLAT     # distance of the body's flat faces from the axis
COLLAR = 0.43 * FLAT
BROW_D = 0.455
MID = 0.4975           # height of the middle of the collar's upright band

# Orange shell: the kit's glowing accent material, both ends buried in the collars.
lathe("body", [(-0.39, 0.39), (0.39, 0.39)], "glass")

BROW = [(-0.175, 0.06), (-0.13, 0.095), (0.13, 0.095), (0.175, 0.06), (0.175, -0.04), (0.12, -0.095), (-0.12, -0.095), (-0.175, -0.04)]
# Top end, bottom to top: armour collar with a tapered shoulder, light ring, lid with a faceted dome. The collar
# starts with a level underside at the shell's end: a slope dipping into the shell would bake its dark edge onto
# the shell's last texels, which shows as a row of teeth under the collar.
END = (("collar", "armour", [(0.39, 0.385), (0.39, 0.41), (0.405, 0.43), (0.59, 0.43), (0.625, 0.40), (0.675, 0.30), (0.675, 0.27)]),
       ("light_ring", "strip", [(0.655, 0.285), (0.725, 0.285)]),
       ("lid", "armour", [(0.715, 0.27), (0.715, 0.31), (0.75, 0.31), (0.78, 0.27), (0.80, 0.19), (0.80, 0.0)]))

for s in (1, -1):  # top half, then its mirror
    for name, mat, profile in END:
        lathe(name, profile if s > 0 else [(-y, r) for y, r in reversed(profile)], mat)
    for yaw in (0, 90, 180, 270):  # brow with a recessed light slot
        kit.plate("brow", [(u, s * v) for u, v in BROW], "armour", yaw, BROW_D, 0.10, y=s * MID, bevel=0.025, low=True)
        kit.plate("notch", rect(0.25, 0.085, 0.03), "inset", yaw, BROW_D + 0.004, 0.01, y=s * MID, bevel=0.0)
        kit.plate("slot", rect(0.21, 0.055), "strip", yaw, BROW_D + 0.008, 0.02, y=s * MID, bevel=0.0, low=True)
        for x in (-0.152, 0.152):
            kit.bolt(yaw, BROW_D, s * MID, x, radius=0.018)
    for yaw in (45, 135, 225, 315):  # corner block with a pilot light (token bevel: hard edges, nothing in the normal map)
        kit.plate("block", rect(0.15, 0.15, 0.035), "armour", yaw, COLLAR + 0.022, 0.06, y=s * MID, bevel=0.0005, low=True)
        kit.plate("pilot", rect(0.075, 0.032), "strip", yaw, COLLAR + 0.028, 0.02, y=s * (MID - 0.015), bevel=0.0, low=True)
        kit.bolt(yaw, COLLAR + 0.022, s * (MID + 0.04), radius=0.016)
        # Seam between the orange shell plates.
        kit.plate("seam", rect(0.012, 0.36), "inset", yaw, BODY + 0.003, 0.01, y=s * 0.18, bevel=0.0)

# Front: steel-framed dark window with the five charge bars. Light shapes are real geometry (low=True), so their
# outlines stay sharp at any size instead of depending on 512 px of texture.
kit.plate("window", rect(0.38, 0.79, 0.085), "inset", 0, 0.415, 0.12, bevel=0.0, low=True)
frame("window_frame", rect(0.40, 0.81, 0.09), rect(0.28, 0.69, 0.06), "bolt", 0.44, 0.14, bevel=0.012)  # bright steel, as on ref/front.png
for y in (-0.2, -0.1, 0.0, 0.1, 0.2):
    kit.plate("bar", rect(0.17, 0.06), "strip", 0, 0.423, 0.02, y=y, bevel=0.0, low=True)
for x in (-0.17, 0.17):
    for y in (-0.33, 0.33):
        kit.bolt(0, 0.44, y, x, radius=0.014)

# Sides: four white hazard stripes on the shell face just forward of each side (ref/front.png shows them beside the
# window, ref/side.png off the panel's centre), bolts on the side face itself.
STRIPE = [(-0.0625, 0.005), (0.0625, 0.05), (0.0625, -0.005), (-0.0625, -0.05)]  # rising to the right, as on ref/side.png
for side in (1, -1):
    for y in (0.215, 0.105, -0.005, -0.115):
        kit.plate("stripe", [(side * u, v) for u, v in STRIPE], "emblem", side * 67.5, BODY + 0.006, 0.008, y=y, bevel=0.0, low=True)
    for x in (-0.045, 0.045):
        for y in (-0.31, 0.31):
            kit.bolt(side * 90, BODY, y, x, radius=0.016)

# Back: Y-shaped clasp hanging from the top collar, dark recess with a latch, vent below it.
CLASP = [(-0.17, 0.40), (0.17, 0.40), (0.17, 0.30), (0.09, 0.20), (0.09, -0.06), (0.0, -0.14), (-0.09, -0.06), (-0.09, 0.20), (-0.17, 0.30)]
kit.plate("clasp", CLASP, "armour", 180, 0.42, 0.12, bevel=0.02, low=True)
kit.plate("clasp_recess", rect(0.10, 0.27, 0.025), "inset", 180, 0.424, 0.01, y=0.085, bevel=0.0)
kit.plate("latch", rect(0.05, 0.15, 0.012), "armour", 180, 0.432, 0.012, y=0.085, bevel=0.006)
for x in (-0.125, 0.125):
    kit.bolt(180, 0.42, 0.35, x, radius=0.018)
kit.plate("vent", rect(0.13, 0.06, 0.015), "inset", 180, BODY + 0.006, 0.01, y=-0.27, bevel=0.0)

kit.finish(HERE)
