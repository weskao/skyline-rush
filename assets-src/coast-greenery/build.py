"""Builds assets-src/coast-greenery/coast-greenery.blend and textures/coast_shrub_diff.png from Poly Haven CC0 scans.

Run from the repo root (about 1 minute, CPU Cycles):
  python3 -I scripts/assets/fetch_polyhaven.py fetch          # once per machine, cache outside the repo
  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-greenery/build.py

Each shrub is an impostor: the scan rendered orthographically from three sides under a uniform white sky (its
albedo with its own sky occlusion, no baked sun), on three crossed cards. Sources come from $POLYHAVEN_CACHE
(default $HOME/.cache/skyline-rush/polyhaven), checked against the sha256 in its sources.json. Recipe, budgets and
licence: asset-brief.md. Every node sits at the origin with its pivot at the ground, on the cards' shared axis.
"""
import hashlib
import json
import math
import os
import tempfile

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "textures")
SRC = os.environ.get("POLYHAVEN_CACHE") or os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven")

ASSET = "searsia_lucida"
# node: thicket of scan variants (letter of searsia_lucida_<x>_LOD0, x m, y m, yaw deg). One scan alone is airy
# (about 20% of its silhouette is leaf); grown together as they stand on the coast, they read as cover from the road.
SHRUBS = {
    "shrub_a": [("a", 0, 0, 0), ("c", 0.85, 0.3, 140), ("d", -0.8, -0.35, 70), ("b", 0.1, -0.9, 250), ("e", -0.3, 0.8, 20)],
    "shrub_b": [("b", 0, 0, 0), ("d", 0.7, 0.2, 200), ("c", -0.75, 0.25, 95), ("e", 0.1, -0.7, 300), ("f", 0.9, -0.5, 40)],
    "shrub_c": [("c", 0, 0, 0), ("e", 0.6, 0.1, 160), ("d", -0.6, -0.2, 260), ("f", 0.2, 0.6, 80), ("g", -0.2, -0.7, 0)],
}
YAWS = (0.0, 60.0, 120.0)  # three crossed cards
ATLAS, CELL, TILE = 1024, 341, 336  # 3 x 3 cells; the unused border of each cell keeps mips from bleeding
MARGIN = 0.03  # of the tile, around the shrub
SAMPLES = 96


def verify_sources(prefixes):
    """Every cache file used here must match the sha256 recorded when it was fetched."""
    with open(os.path.join(SRC, "sources.json")) as f:
        files = json.load(f)["files"]
    for rec in files:
        if rec["path"].split("/")[0] not in prefixes:
            continue
        with open(os.path.join(SRC, rec["path"]), "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        if digest != rec["sha256"]:
            raise SystemExit(f"{rec['path']}: sha256 mismatch, re-run fetch_polyhaven.py fetch")


def import_scans():
    """All scan meshes, keyed by the variant (top-level glTF node) they belong to."""
    parts = {}
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, ASSET, f"{ASSET}_1k.gltf"))
    bpy.context.view_layer.update()
    for ob in bpy.data.objects:
        ob.hide_render = True
        top = ob
        while top.parent:
            top = top.parent
        if ob.type == "MESH":
            parts.setdefault(top.name, []).append(ob)
    for mat in bpy.data.materials:  # diffuse only: a white sky would add a grey sheen to every leaf
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if mat.node_tree else None
        if bsdf:
            bsdf.inputs["Specular IOR Level"].default_value = 0.0
    return parts


def thicket(parts, plan):
    """Linked copies of the scan variants, each moved from its own ground point to its place around the origin."""
    copies = []
    for letter, x, y, yaw in plan:
        variant = f"{ASSET}_{letter}_LOD0"
        if variant not in parts:
            raise SystemExit(f"{variant}: not in the glTF; nodes are {sorted(parts)}")
        ground, _ = bounds(parts[variant])
        move = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(math.radians(yaw), 4, "Z") @ Matrix.Translation(-ground)
        for ob in parts[variant]:
            world = ob.matrix_world.copy()
            copy = ob.copy()  # linked duplicate: the scan mesh is shared
            copy.parent = None
            bpy.context.scene.collection.objects.link(copy)
            copy.matrix_world = move @ world
            copies.append(copy)
    return copies


def bounds(objs):
    bpy.context.view_layer.update()
    pts = np.concatenate([np.array([ob.matrix_world @ v.co for v in ob.data.vertices]) for ob in objs])
    lo, hi = pts.min(0), pts.max(0)
    axis = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]))  # ground point the cards cross on
    radius = float(np.hypot(pts[:, 0] - axis.x, pts[:, 1] - axis.y).max())
    return axis, max(2 * radius, float(hi[2] - lo[2])) / (1 - 2 * MARGIN)


def setup_render(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False
    scene.cycles.seed = 1
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = TILE
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("white_sky")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world
    cam = bpy.data.objects.new("_cam", bpy.data.cameras.new("_cam"))
    cam.data.type = "ORTHO"
    cam.data.clip_start, cam.data.clip_end = 0.1, 200.0
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def render_tile(scene, cam, objs, axis, side, yaw, path):
    """Square orthographic view of one shrub; returns the tile (rows bottom-up, straight sRGB RGBA) and camera right."""
    toward = Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), 0))  # from the shrub to the camera
    cam.data.ortho_scale = side
    cam.rotation_euler = toward.to_track_quat("Z", "Y").to_euler()
    cam.location = axis + Vector((0, 0, side * (0.5 - MARGIN))) + toward * 50
    for ob in objs:
        ob.hide_render = False
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for ob in objs:
        ob.hide_render = True
    img = bpy.data.images.load(path)
    px = np.empty(TILE * TILE * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    bpy.context.view_layer.update()
    return px.reshape(TILE, TILE, 4), (cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))).normalized()


def dilate(atlas, rounds=24):
    """Leaf colour spread into the transparent texels, so filtering and mips never pull in black."""
    rgb, filled = atlas[:, :, :3].copy(), atlas[:, :, 3] > 0.5
    mean = rgb[filled].mean(0)
    for _ in range(rounds):
        total, count = np.zeros_like(rgb), np.zeros(filled.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            total += np.roll(rgb * filled[:, :, None], (dy, dx), (0, 1))
            count += np.roll(filled, (dy, dx), (0, 1))
        grow = ~filled & (count > 0)
        rgb[grow] = total[grow] / count[grow][:, None]
        filled |= grow
    rgb[~filled] = mean
    atlas[:, :, :3] = rgb


def shrub_material(image):
    mat = bpy.data.materials.new("coast_shrub")
    mat.use_nodes = True
    mat.use_backface_culling = True  # each card carries its own back face: both sides keep the canopy normals
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "EXTEND"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    cut = nt.nodes.new("ShaderNodeMath")  # Round on alpha = glTF alphaMode MASK, cutoff 0.5
    cut.operation = "ROUND"
    nt.links.new(tex.outputs["Alpha"], cut.inputs[0])
    nt.links.new(cut.outputs[0], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.9
    # No specular (KHR_materials_specular 0): the canopy normals meet a road-level camera at a grazing angle, where
    # Fresnel would turn every card into a pale sheet of reflected sky.
    bsdf.inputs["Specular IOR Level"].default_value = 0.0
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def build_cards(name, side, rights, cells, mat):
    """Three crossed cards on the z axis, each a front and a back face sharing near-up normals (lit like a canopy)."""
    verts, faces, uvs, normals = [], [], [], []
    up, z0 = Vector((0, 0, 1)), -MARGIN * side
    for right, (col, row) in zip(rights, cells):
        u0, v0 = (col * CELL + (CELL - TILE) / 2) / ATLAS, (row * CELL + (CELL - TILE) / 2) / ATLAS
        corners = [(-1, 0), (1, 0), (1, 1), (-1, 1)]  # (side, height) counter-clockwise seen from the camera
        for order in (corners, corners[::-1]):
            base = len(verts)
            for sx, sz in order:
                verts.append(right * (sx * side / 2) + up * (z0 + sz * side))
                uvs.append((u0 + (sx + 1) / 2 * TILE / ATLAS, v0 + sz * TILE / ATLAS))
                normals.append((right * (sx * 0.25) + up).normalized())  # near-up: crossed cards light as one canopy, no seams
            faces.append([base, base + 1, base + 2, base + 3])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    layer = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        layer.data[loop.index].uv = uvs[loop.vertex_index]
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.normals_split_custom_set_from_vertices([tuple(n) for n in normals])
    mesh.materials.append(mat)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def main():
    verify_sources({ASSET})
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    os.makedirs(TEX, exist_ok=True)
    parts = import_scans()
    cam = setup_render(scene)
    atlas = np.zeros((ATLAS, ATLAS, 4), np.float32)
    plans, summary = [], {}
    with tempfile.TemporaryDirectory() as tmp:
        for row, (name, plan) in enumerate(SHRUBS.items()):
            objs = thicket(parts, plan)
            axis, side = bounds(objs)
            rights, cells = [], []
            for col, yaw in enumerate(YAWS):
                tile, right = render_tile(scene, cam, objs, axis, side, yaw, os.path.join(tmp, f"{name}_{col}.png"))
                y, x = row * CELL + (CELL - TILE) // 2, col * CELL + (CELL - TILE) // 2
                atlas[y:y + TILE, x:x + TILE] = tile
                rights.append(right)
                cells.append((col, row))
            plans.append((name, side, rights, cells))
            summary[name] = {"side_m": round(side, 3), "coverage": round(float((atlas[row * CELL:(row + 1) * CELL, :, 3] > 0.5).mean()), 3)}
    dilate(atlas)
    image = bpy.data.images.new("coast_shrub_diff", ATLAS, ATLAS, alpha=True)
    image.alpha_mode = "STRAIGHT"
    image.pixels.foreach_set(atlas.ravel())
    path = os.path.join(TEX, "coast_shrub_diff.png")
    image.filepath_raw, image.file_format = path, "PNG"
    image.save(filepath=path)
    image.filepath, image.source = path, "FILE"
    image.reload()
    image.alpha_mode = "STRAIGHT"
    for ob in list(bpy.data.objects):  # the scans and the camera are inputs, not part of the master
        bpy.data.objects.remove(ob)
    mat = shrub_material(image)
    for plan in plans:
        build_cards(*plan, mat)
    scene.world = None
    print("COAST_GREENERY_SUMMARY " + json.dumps(summary, sort_keys=True))
    # Datablocks only, uncompressed, texture paths relative: save_as_mainfile would also store UI state
    # (including the saving user's home directory).
    bpy.data.libraries.write(os.path.join(HERE, "coast-greenery.blend"), {scene}, path_remap="RELATIVE", compress=False)


main()
