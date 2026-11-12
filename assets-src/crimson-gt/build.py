"""Builds assets-src/crimson-gt/crimson-gt.blend from nothing (no downloads, no random seed, no personal paths).

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/build.py

Crimson GT is the second player car. Its shape is built from the studio panels of the concept board (ref/*.png,
asset-brief.md), not around the Roadster's shape: only the rig pivots (wheels, wing, lift ports) are the Roadster's
contract numbers, so src/garage-model-rig.ts binds it. Only the LOW collection is created: every object in the file
ships. Shape: build/gt_body.py, build/gt_parts.py; mesh, node and material helpers are the Roadster's
(assets-src/roadster2/build).
"""
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, "build"), os.path.join(HERE, "..", "roadster2", "build")]

from gt_parts import build_car  # noqa: E402
from roadster_materials import make_materials  # noqa: E402

# name: (base colour rgb linear, metallic, roughness, extra). *_paint and *_light are driven by the runtime rig;
# the paint colour here is the factory finish (sRGB #9a1424, src/car-catalog.ts) for viewers without the rig.
MATERIALS = {
    "gt_paint": ((0.323, 0.007, 0.018), 0.74, 0.17, {"coat": 0.9, "coat_rough": 0.06}),
    "gt_glass": ((0.035, 0.024, 0.018), 0.04, 0.07, {"coat": 0.96, "coat_rough": 0.06, "cull": False}),
    "gt_trim": ((0.012, 0.014, 0.018), 0.30, 0.42, {}),
    "gt_carbon": ((0.03, 0.035, 0.04), 0.35, 0.34, {}),
    "gt_tire": ((0.03, 0.03, 0.035), 0.0, 0.82, {}),
    "gt_rim": ((0.10, 0.105, 0.115), 0.90, 0.30, {}),   # dark gunmetal (side.png, rear three-quarter panel)
    "gt_light": ((0.0, 0.0, 0.0), 0.0, 0.5, {"emit": (1.0, 0.03, 0.03), "emit_strength": 2.6}),
    "gt_lamp": ((0.0, 0.0, 0.0), 0.0, 0.5, {"emit": (0.92, 0.94, 1.0), "emit_strength": 3.5}),
    "gt_nozzle": ((0.30, 0.30, 0.32), 0.90, 0.26, {}),
    "gt_fan": ((0.165, 0.219, 0.254), 0.65, 0.45, {}),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0

low = bpy.data.collections.new("LOW")
scene.collection.children.link(low)

build_car(low, make_materials(MATERIALS))

# One shared UV atlas across every shipping mesh (bake.py bakes normal + AO into it).
meshes = [ob for ob in low.all_objects if ob.type == "MESH"]
for ob in meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.0, scale_to_bounds=False)
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

tris = 0
for ob in meshes:
    ob.data.calc_loop_triangles()
    tris += len(ob.data.loop_triangles)
print("CRIMSON_GT_SUMMARY " + json.dumps({"objects": len(low.all_objects), "triangles": tris}))

# Datablocks only, uncompressed: save_as_mainfile would also store UI state, including the saving user's home directory.
bpy.data.libraries.write(os.path.join(HERE, "crimson-gt.blend"), {scene}, compress=False)
