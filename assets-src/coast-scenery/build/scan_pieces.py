"""Poly Haven photoscans -> decimated, normal-baked shipping meshes (Cycles high->low bake).

Each scan is imported at full resolution (the 8K-detail .bin plus its 2K normal map) as the HIGH, a
collapse-decimated copy keeps the scan UVs as the LOW, and Cycles bakes the HIGH's shading normal
(geometry + scan normal map) into a 1K tangent-space map in those UVs. Albedo and ARM are the scan's
own maps, downscaled to 1K. HIGH objects never reach the saved file.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

RES = 1024


def import_scan(src, asset):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, asset, f"{asset}_2k.gltf"), merge_vertices=True)
    obs = [o for o in set(bpy.data.objects) - before if o.type == "MESH"]
    assert len(obs) == 1, f"{asset}: expected one mesh, got {len(obs)}"
    ob = obs[0]
    ob.name = f"_high_{asset}"
    return ob


def split_islands(ob):
    """Loose parts of a HIGH, largest first."""
    select([ob], ob)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return sorted(bpy.context.selected_objects, key=lambda o: -len(o.data.polygons))


def select(objs, active):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def decimated(high, name, target):
    """Collapse-decimated copy of high with about `target` triangles (UVs kept)."""
    low = high.copy()
    low.data = high.data.copy()
    low.name = low.data.name = name
    low.rotation_mode = "XYZ"  # the glTF importer leaves quaternion mode, which ignores rotation_euler
    bpy.context.scene.collection.objects.link(low)
    mod = low.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = target / tris(high)
    mod.use_collapse_triangulate = True
    select([low], low)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    low.data.materials.clear()
    return low


def load_scaled(path, name, colorspace, res=RES, crop=None):
    """Load a source map, optionally crop (x, y, w, h in source px), resample to res x res."""
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = colorspace
    if crop:
        x, y, w, h = crop
        sw, sh = img.size
        px = np.empty(sw * sh * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(sh, sw, 4)[sh - y - h:sh - y, x:x + w].copy()  # Blender rows start at the bottom
        out = bpy.data.images.new(name, w, h, alpha=False)
        out.colorspace_settings.name = colorspace
        out.pixels.foreach_set(px.ravel())
        bpy.data.images.remove(img)
        img = out
    img.scale(res, res)
    img.name = name
    return img


def save_image(img, tex_dir, filename, fmt):
    path = os.path.join(tex_dir, filename)
    img.filepath_raw = path
    img.file_format = fmt
    if fmt == "JPEG":
        img.save(filepath=path, quality=92)
    else:
        img.save(filepath=path)
    img.filepath = path  # re-pointed relative by the final libraries.write(path_remap="RELATIVE")
    img.source = "FILE"
    img.reload()
    return img


def bake_normal(lows, highs, img, extrusion, max_ray):
    """Tangent-space normal of highs (geometry + their normal maps) into img, in the lows' UVs."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.render.bake.margin = 8
    targets = []
    for low in lows:
        mat = low.data.materials[0]
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        mat.node_tree.nodes.active = node
        targets.append((mat, node))
    # One active LOW per bake: lows sharing a texture are joined for the bake and split afterwards.
    joined = lows[0]
    if len(lows) > 1:
        for i, low in enumerate(lows):
            low.data.attributes.new("_piece", "INT", "FACE").data.foreach_set("value", [i] * len(low.data.polygons))
        merged = [low.data for low in lows[1:]]
        select(lows, lows[0])
        bpy.ops.object.join()
        for mesh in merged:
            bpy.data.meshes.remove(mesh)  # orphaned by the join; frees the piece names
    select(highs + [joined], joined)
    bpy.ops.object.bake(type="NORMAL", use_selected_to_active=True, cage_extrusion=extrusion,
                        max_ray_distance=max_ray, normal_space="TANGENT", target="IMAGE_TEXTURES", margin=8)
    for mat, node in targets:
        if node.name in mat.node_tree.nodes:
            mat.node_tree.nodes.remove(node)
    if len(lows) == 1:
        return lows
    return split_by_piece(joined, len(lows))


def split_by_piece(ob, count):
    out = []
    for i in range(count):
        part = ob.copy()
        part.data = ob.data.copy()
        bpy.context.scene.collection.objects.link(part)
        bm = bmesh.new()
        bm.from_mesh(part.data)
        layer = bm.faces.layers.int["_piece"]
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[layer] != i], context="FACES")
        bm.to_mesh(part.data)
        bm.free()
        part.data.attributes.remove(part.data.attributes["_piece"])
        out.append(part)
    mesh = ob.data
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(mesh)  # frees the piece names for the split meshes
    return out


def skirt(ob, band, offset):
    """Extrude open boundary edges lying within `band` metres of the lowest vertex by `offset` (a Vector),
    so the piece reaches under uneven ground (or closes an arch soffit) with no visible gap. UVs are
    copied from the boundary, so the skirt samples the edge colour."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    zmin = min(v.co.z for v in bm.verts)
    edges = [e for e in bm.edges if e.is_boundary and max(v.co.z for v in e.verts) < zmin + band]
    geom = bmesh.ops.extrude_edge_only(bm, edges=edges)["geom"]
    for v in [g for g in geom if isinstance(g, bmesh.types.BMVert)]:
        v.co += offset
    bm.to_mesh(ob.data)
    bm.free()


def ground_pivot(ob, band=0.0, percentile=0.0):
    """Move the origin to ground contact: x/y centre, and z at `percentile` of the open bottom-edge heights
    within `band` of the lowest point (0 = the lowest point). A higher percentile buries more of a ragged
    scan edge, so its skirt shows less above the ground."""
    co = np.empty(len(ob.data.vertices) * 3, np.float32)
    ob.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    lo, hi = co.min(0), co.max(0)
    ground = lo[2]
    if percentile:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        zs = [v.co.z for v in bm.verts if v.is_boundary and v.co.z < lo[2] + band]
        bm.free()
        ground = float(np.percentile(zs, percentile))
    pivot = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, ground))
    ob.data.transform(Matrix.Translation(-pivot))
    ob.location = (0, 0, 0)


def crop_above(ob, z_cut):
    """Keep the largest connected part made of faces lying entirely above z_cut (e.g. a boulder resting on a ledge)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if min(v.co.z for v in f.verts) < z_cut], context="FACES")
    parts, seen = [], set()
    for f in bm.faces:
        if f in seen:
            continue
        stack, part = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            part.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        parts.append(part)
    keep = set(max(parts, key=len))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def straighten_plan(ob, bins=12):
    """Remove the low-frequency y wander of a long scan (its plan curve), so a bend stays planar."""
    co = np.empty(len(ob.data.vertices) * 3, np.float32)
    ob.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    edges = np.linspace(co[:, 0].min(), co[:, 0].max(), bins + 1)
    centres = (edges[:-1] + edges[1:]) / 2
    idx = np.clip(np.digitize(co[:, 0], edges) - 1, 0, bins - 1)
    mean_y = np.array([np.median(co[idx == b, 1]) for b in range(bins)])
    co[:, 1] -= np.interp(co[:, 0], centres, mean_y)
    ob.data.vertices.foreach_set("co", co.ravel())
    ob.data.update()


def bend_arch(ob, sweep_deg, inner_r, thickness, leg_gain, rise=1.0, depth_scale=1.0):
    """Curl a straight cliff strip (length on x, height on z) into an arch in the xz plane: its bottom edge
    becomes the soffit at radius inner_r, its top the vegetated crown. Height is rescaled to `thickness`
    at the crown and grows by (1 + leg_gain * t^2) toward the legs; `rise` stretches it vertically (an upright,
    not circular, opening) and `depth_scale` thins it front to back. The legs end at z = 0."""
    co = np.empty(len(ob.data.vertices) * 3, np.float32)
    ob.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    half = math.radians(sweep_deg) / 2
    t = (x - x.min()) / (x.max() - x.min()) * 2 - 1          # -1 .. 1 along the strip
    theta = t * half
    h = (z - z.min()) / (z.max() - z.min()) * thickness * (1 + leg_gain * t * t)
    r = inner_r + h
    lift = -inner_r * math.cos(half)                         # soffit ends touch z = 0
    co[:, 0] = r * np.sin(theta)
    co[:, 2] = (r * np.cos(theta) + lift) * rise
    co[:, 1] = y * depth_scale
    ob.data.vertices.foreach_set("co", co.ravel())
    ob.data.update()
