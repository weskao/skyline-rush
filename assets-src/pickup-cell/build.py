"""Builds assets-src/pickup-cell/pickup-cell.blend and textures/ from nothing (no downloads, no random seed,
no personal paths): the blue energy-cell power-up, one mesh `pickup_cell` with one baked material `pickup_cell_pbr`.

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/pickup-cell/build.py

Shapes are three.js units (X right, Y up, +Z front) measured off ref/front.png, ref/side.png and ref/back.png
at 310 px per unit; asset-brief.md lists what was measured and what was inferred. Materials, bevels, UVs,
the bake and the save live in scripts/assets/pickup_kit.py, shared with the other three tiers.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts", "assets"))

from pickup_kit import Kit, rect  # noqa: E402

kit = Kit("pickup-cell")

# Dark octagonal core; both ends are buried in the collars. Its corner chamfers are the ribbed pillars.
BODY = rect(1.0, 1.0, 0.19)
kit.loft("body", [(-0.32, BODY), (0.32, BODY)], "inset", caps=(False, False))

BROW = [(-0.33, 0.05), (-0.25, 0.12), (0.25, 0.12), (0.33, 0.05), (0.33, -0.04), (0.13, -0.12), (-0.13, -0.12), (-0.33, -0.04)]
NOTCH = [(-0.10, 0.03), (0.10, 0.03), (0.065, -0.03), (-0.065, -0.03)]
CHEVRON = [(-0.04, 0.015), (0.04, 0.015), (0.0, -0.017)]

for s in (1, -1):  # top half, then its mirror
    kit.loft("collar", [(s * 0.26, rect(0.98, 0.98, 0.19)), (s * 0.32, rect(1.15, 1.15, 0.235)),
                        (s * 0.44, rect(1.19, 1.19, 0.25)), (s * 0.60, rect(0.72, 0.72, 0.14))],
             "armour", bevel=0.03, caps=(False, True))
    kit.loft("cap", [(s * 0.58, rect(0.60, 0.60, 0.10)), (s * 0.735, rect(0.60, 0.60, 0.10))],
             "inset", bevel=0.025, caps=(False, True))
    kit.loft("lid", [(s * 0.72, rect(0.44, 0.44, 0.08)), (s * 0.75, rect(0.44, 0.44, 0.08))],
             "armour", bevel=0.012, caps=(False, True))
    for yaw in (0, 90, 180, 270):
        kit.plate("brow", [(u, s * v) for u, v in BROW], "armour", yaw, 0.62, 0.13, y=s * 0.37, bevel=0.025, low=True)
        for x in (-0.26, 0.26):
            kit.bolt(yaw, 0.62, s * 0.385, x)
        kit.plate("cap_strip", rect(0.30, 0.05), "strip", yaw, 0.312, 0.03, y=s * 0.655, bevel=0.0, low=True)
    for yaw in (0, 180):  # amber indicator in a dark notch
        kit.plate("notch", [(u, s * v) for u, v in NOTCH], "inset", yaw, 0.624, 0.01, y=s * 0.435, bevel=0.0)
        kit.plate("amber", [(u, s * v) for u, v in CHEVRON], "amber", yaw, 0.627, 0.008, y=s * 0.435, bevel=0.0)
    for yaw in (45, 135, 225, 315):  # bolted clasps on the corner chamfers
        kit.plate("clasp", rect(0.20, 0.22, 0.03), "armour", yaw, 0.60, 0.05, y=s * 0.17, bevel=0.015, low=True)
        kit.bolt(yaw, 0.60, s * 0.14)

for yaw in (45, 135, 225, 315):
    for x in (-0.055, 0.055):
        kit.plate("rib", rect(0.05, 0.56), "inset", yaw, 0.581, 0.02, x=x, bevel=0.006)

# Front: glowing glass core with the lightning emblem. Light shapes are real geometry (low=True), so their
# outlines stay sharp at any size instead of depending on 512 px of texture.
EMBLEM = [(0.064, 0.21), (-0.115, -0.024), (-0.013, -0.024), (-0.064, -0.21), (0.115, 0.037), (0.013, 0.037)]
kit.plate("glass", rect(0.60, 0.66, 0.03), "glass", 0, 0.515, 0.05, bevel=0.012, low=True)
kit.plate("emblem", EMBLEM, "emblem", 0, 0.527, 0.02, bevel=0.0, low=True)

# Sides: armour plate, dark panel, three light bars.
for yaw in (90, 270):
    kit.plate("side_plate", rect(0.58, 0.50, 0.08), "armour", yaw, 0.545, 0.06, bevel=0.02, low=True)
    kit.plate("side_panel", rect(0.42, 0.34, 0.04), "inset", yaw, 0.55, 0.02, bevel=0.006)
    for y in (-0.10, 0.0, 0.10):
        kit.plate("bar", rect(0.27, 0.05), "strip", yaw, 0.562, 0.03, y=y, bevel=0.0, low=True)
    for x in (-0.235, 0.235):
        for y in (-0.18, 0.18):
            kit.bolt(yaw, 0.545, y, x, radius=0.024)

# Back: spine plate with the vertical light slot, ribs either side.
kit.plate("spine", rect(0.24, 0.54, 0.04), "armour", 180, 0.545, 0.06, bevel=0.02, low=True)
kit.plate("slot", rect(0.06, 0.32), "strip", 180, 0.557, 0.03, bevel=0.0, low=True)
for x in (-0.25, -0.175, 0.175, 0.25):
    kit.plate("rib", rect(0.04, 0.60), "inset", 180, 0.508, 0.02, x=x, bevel=0.006)

kit.finish(HERE)
