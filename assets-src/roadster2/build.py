"""Builds assets-src/roadster2/roadster2.blend from nothing (no downloads, no random seed, no personal paths).

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/roadster2/build.py

The Roadster 2 master is a procedural port of the existing Garage car, with the node names, pivots,
wing travel, rear/lift ports and lift fans (Task 4b) the runtime rig binds to (src/garage-model-rig.ts, src/effects.js).
Only the LOW collection is created: every object in the file ships. Helpers: build/roadster_*.py.
"""
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "build"))

from roadster_materials import make_materials  # noqa: E402
from roadster_parts import build_car  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0

low = bpy.data.collections.new("LOW")
scene.collection.children.link(low)

build_car(low, make_materials())

# One shared UV atlas across every shipping mesh (bake.py bakes normal + AO into it): equal texel
# density per island, packed together into 0..1.
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
for ob in low.all_objects:
    if ob.type == "MESH":
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
print("ROADSTER2_SUMMARY " + json.dumps({"objects": len(low.all_objects), "triangles": tris}))

# Datablocks only, uncompressed (as pipeline-probe): save_as_mainfile would also store UI state,
# including the saving user's home directory.
bpy.data.libraries.write(os.path.join(HERE, "roadster2.blend"), {scene}, compress=False)
