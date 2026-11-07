"""Builds assets-src/pipeline-probe/pipeline-probe.blend from nothing (no downloads, no random seed).

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/pipeline-probe/build.py

Conventions: meters, Y-up on export (Blender Z-up), nose toward glTF -Z (Blender +Y),
ground at z=0, no textures. Object and material names match MODEL_MANIFEST['pipeline-probe'].
"""
import math
import os

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
WHEEL_RADIUS, WHEEL_WIDTH, WHEEL_SEGMENTS = 0.35, 0.28, 16
# Wheel pivots (x, y, z) in Blender axes; +Y is the nose, -X is the car's left.
WHEELS = {
    "wheel_fl": (-0.85, 1.2, WHEEL_RADIUS),
    "wheel_fr": (0.85, 1.2, WHEEL_RADIUS),
    "wheel_rl": (-0.85, -1.2, WHEEL_RADIUS),
    "wheel_rr": (0.85, -1.2, WHEEL_RADIUS),
}


def material(name, rgba, roughness, metallic):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def mesh_object(name, bm, mat, location):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    return obj


def frustum(bm, z0, z1, bottom, top):
    """Closed box from z0 to z1; bottom/top are (half_width, y_min, y_max) rectangles."""
    def ring(z, spec):
        w, y0, y1 = spec
        return [bm.verts.new(p) for p in ((-w, y0, z), (w, y0, z), (w, y1, z), (-w, y1, z))]
    lo, hi = ring(z0, bottom), ring(z1, top)
    bm.faces.new(lo[::-1])
    bm.faces.new(hi)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))


def build_body(mat):
    bm = bmesh.new()
    frustum(bm, 0.3, 0.75, (0.9, -2.0, 2.0), (0.8, -1.9, 1.9))  # chassis
    frustum(bm, 0.75, 1.15, (0.7, -1.0, 0.6), (0.55, -0.7, 0.3))  # cabin
    return mesh_object("probe_body", bm, mat, (0.0, 0.0, 0.0))


def build_wheel(name, mat):
    bm = bmesh.new()  # axis along X, centered on the pivot so the object transform is only a location
    half = WHEEL_WIDTH / 2
    rings = [[], []]
    for side, x in enumerate((-half, half)):
        for i in range(WHEEL_SEGMENTS):
            a = 2 * math.pi * i / WHEEL_SEGMENTS
            rings[side].append(bm.verts.new((x, WHEEL_RADIUS * math.cos(a), WHEEL_RADIUS * math.sin(a))))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[1])
    for i in range(WHEEL_SEGMENTS):
        j = (i + 1) % WHEEL_SEGMENTS
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    return mesh_object(name, bm, mat, WHEELS[name])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    paint = material("probe_paint", (0.85, 0.12, 0.1, 1.0), 0.4, 0.2)
    tire = material("probe_tire", (0.03, 0.03, 0.035, 1.0), 0.9, 0.0)
    build_body(paint)
    for name in WHEELS:
        build_wheel(name, tire)
    # Datablocks only: save_as_mainfile would also store UI state, including the saving user's home directory.
    bpy.data.libraries.write(os.path.join(HERE, "pipeline-probe.blend"), {bpy.context.scene}, compress=False)


main()
