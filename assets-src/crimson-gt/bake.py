"""Bakes the Crimson GT normal + AO atlas (textures/crimson_gt_normal.png, crimson_gt_ao.png) and wires it into
every material, then saves crimson-gt.blend again. Run after build.py, from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/bake.py

The bake itself is the Roadster's (assets-src/roadster2/bake.py); only the panel lines and the bevelled set differ.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "roadster2"))  # ahead of this folder, so `bake` is the Roadster module

from bake import bake  # noqa: E402

# Panel lines cut into the body HIGH copy: three.js-space boxes (x0, x1, y0, y1, z0, z1), 8 mm wide. Positions are
# inferred: the concept panels are too small (189 px tall) to resolve shut lines.
GROOVES = [
    *[(s * .95, s * 1.3, .20, .76, z - .004, z + .004) for s in (-1, 1) for z in (-.62, .50)],   # door front/rear cuts
    (-.50, .50, .55, 1.0, -1.064, -1.056),                                                     # hood rear seam
]

# Only the panels get rounded edges. Wheels, nozzles, fans, rams and lamps are a few texels each in the atlas: their
# bevel gradients cost 80 KB of UASTC and put the GLB over its 1.5 MB budget, for nothing visible at race distance.
BEVELLED = ("body", "glass_canopy", "roof", "wing_aerofoil", "wing_tip", "wing_pylons", "front_intake", "rear_fascia",
            "side_intake", "corner_intake", "rocker", "mirror", "splitter", "diffuser")

if __name__ == "__main__":
    bake(HERE, "crimson-gt", GROOVES, BEVELLED)
