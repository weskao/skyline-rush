"""Exports a .blend to a raw GLB. Runs inside Blender (invoked by scripts/assets/export-glb.mjs):
  blender --background --factory-startup --python scripts/assets/export_glb.py -- <in.blend> <out.glb>
"""
import sys

import bpy

src, dst = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=src)
# Y-up is the glTF default; animations are exported when present, everything else stays default.
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_yup=True, export_apply=True)
