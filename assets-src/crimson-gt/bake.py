"""Bakes the Crimson GT normal + AO atlas (textures/crimson_gt_normal.png, crimson_gt_ao.png) and wires it into
every material, adds the paint flake layer (textures/crimson_gt_flake.png), then saves crimson-gt.blend again. Run after build.py, from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/bake.py

The bake itself is the Roadster's (assets-src/roadster2/bake.py); only the panel lines and the bevelled set differ.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "roadster2"))  # ahead of this folder, so `bake` is the Roadster module

import bpy  # noqa: E402
from bake import bake  # noqa: E402

FLAKE_PX, FLAKE_REPEAT, FLAKE_STRENGTH = 128, 48, .35   # one tile is about 15 cm of panel: flakes near 1.2 mm

# Panel lines cut into the body HIGH copy: three.js-space boxes (x0, x1, y0, y1, z0, z1), 8 mm wide. Positions are
# inferred: the concept panels are too small (189 px tall) to resolve shut lines.
GROOVES = [
    *[(s * .95, s * 1.3, .20, .76, z - .004, z + .004) for s in (-1, 1) for z in (-.62, .50)],   # door front/rear cuts
    (-.50, .50, .55, 1.0, -1.064, -1.056),                                                     # hood rear seam
]

# Only the panels get rounded edges. Wheels, nozzles, fans, rams and lamps are a few texels each in the atlas: their
# bevel gradients cost 80 KB of UASTC and put the GLB over its 1.5 MB budget, for nothing visible at race distance.
BEVELLED = ("body", "glass_canopy", "roof", "wing_aerofoil", "wing_endplates", "wing_pylons", "front_intake", "rear_fascia",
            "side_intake", "corner_intake", "rocker", "mirror", "splitter", "diffuser")


def flake_layer(mats, normal):
    """Metallic flake under the clearcoat: a small tiling normal map of randomly tilted flakes drives the paint's
    base normal, and the baked atlas (rounded edges, shut lines) moves to the coat normal, which stays smooth.
    The tile mips to flat, so the sparkle shows up close and never shimmers at race distance."""
    rng = random.Random(7)   # fixed seed: the same texture on every build
    px = []
    for _ in range(FLAKE_PX * FLAKE_PX):
        a, t = rng.random() * 2 * math.pi, rng.random() * .6
        x, y = math.cos(a) * t, math.sin(a) * t
        px += [x * .5 + .5, y * .5 + .5, math.sqrt(1 - x * x - y * y) * .5 + .5, 1.0]
    img = bpy.data.images.new("crimson_gt_flake", FLAKE_PX, FLAKE_PX, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(px)
    img.filepath_raw = "//textures/crimson_gt_flake.png"
    img.file_format = "PNG"
    img.save()
    img.source = "FILE"
    nt = mats["gt_paint"].node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    atlas = next(n for n in nt.nodes if n.type == "NORMAL_MAP")
    nt.links.new(atlas.outputs["Normal"], bsdf.inputs["Coat Normal"])
    uv, scale = nt.nodes.new("ShaderNodeTexCoord"), nt.nodes.new("ShaderNodeMapping")
    scale.inputs["Scale"].default_value = (FLAKE_REPEAT, FLAKE_REPEAT, 1)
    tex, bump = nt.nodes.new("ShaderNodeTexImage"), nt.nodes.new("ShaderNodeNormalMap")
    tex.image = img
    bump.inputs["Strength"].default_value = FLAKE_STRENGTH
    nt.links.new(uv.outputs["UV"], scale.inputs["Vector"])
    nt.links.new(scale.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bump.inputs["Color"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


if __name__ == "__main__":
    bake(HERE, "crimson-gt", GROOVES, BEVELLED, ao_hidden=("glass_canopy",), finish=flake_layer)
