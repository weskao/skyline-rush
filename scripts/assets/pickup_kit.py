"""Shared art kit for the road power-up GLBs: pickup-cell, pickup-can, pickup-tank, pickup-overcharge.

How to build another tier (same art language, your build.py is only shape code):
  1. Copy assets-src/pickup-cell/build.py to assets-src/<id>/build.py and keep its first lines:
     the sys.path insert, `kit = Kit("<id>")` (accent, size limit and triangle budget come from
     TIERS) and the final `kit.finish(HERE)`.
  2. Write shapes in three.js space: X right, Y up, +Z the front (emblem) face, 1 unit = 1 m.
     finish() centres the bounding box on the origin and fails above your id's size in TIERS (the
     runtime ground clearance is tuned to each tier's half height, so do not change that table).
  3. Big forms: kit.loft(name, [(y, outline), ...], mat). Outlines come from rect(w, d, chamfer)
     (chamfer > 0 gives the kit's octagon) or ngon(radius, sides) for round tiers.
  4. Everything on a face: kit.plate(name, outline, mat, yaw, dist, depth, y, x). yaw 0 = front,
     90 = +X, 180 = back; the outline is (u right, v up) as seen from outside. kit.bolt() is a plate.
  5. Materials are keys of materials(): "armour" (worn gunmetal), "inset" (dark recess), "bolt",
     "glass" (glowing accent core), "strip" (accent light), "emblem" (white light), "amber";
     the rare tier also has "gold" armour and "prism_cyan" / "prism_pink" / "prism_gold" glass.
  6. low=True puts a part into the shipped mesh too (lofts default to it, plates do not). Parts with
     low=False exist only in the bake source, so bolts, ribs, light strips and emblems cost no
     triangles: keep them within 0.03 of a shipped surface (the bake cage) or they are missed.
  7. bevel is the rounded edge of the bake source; from 0.02 up the shipped mesh gets the same
     width as a one-segment chamfer. finish() fails above the id's triangle budget in TIERS.
  8. Run, from the repo root, after adding the manifest entry (fallback 'procedural-pickup'):
       "$BLENDER_BIN" --background --factory-startup --python assets-src/<id>/build.py
       node scripts/assets/export-glb.mjs <id> && node scripts/assets/optimize-glb.mjs <id>
       "$BLENDER_BIN" --background --factory-startup --python scripts/assets/pickup_kit.py -- review <id>
       node scripts/assets/check-glb.mjs <id> --promote
     review needs assets-src/<id>/ref/front.png and writes review/final.png + review/turntable.png
     from the exported GLB. Record the sha256/bytes only after the last build: .blend bytes change
     on every run.
"""
import math
import os
import sys
import tempfile

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# id: (accent 0xRRGGBB, largest size in three.js X/Y/Z, triangle budget)
TIERS = {
    "pickup-cell": (0x2BC9FF, (1.35, 1.6, 1.35), 3000),
    "pickup-can": (0xFF9D35, (1.1, 1.64, 1.1), 3000),
    "pickup-tank": (0xFFCF48, (2.2, 2.28, 1.5), 4000),
    "pickup-overcharge": (0xE180FF, (2.4, 2.9, 2.4), 4500),
}
RES = 512
ORM_RES = 256                 # occlusion/roughness/metallic are low-frequency: half size saves ~170 KB of the 300 KB budget
CAVITY = 0.45                 # base-colour multiplier in fully occluded recesses
CAGE = 0.03                   # how far outside the shipped mesh the bake still sees source detail


def linear(rgb):
    """0xRRGGBB (sRGB) -> linear RGBA for shader sockets."""
    def channel(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (channel(rgb >> 16 & 255), channel(rgb >> 8 & 255), channel(rgb & 255), 1.0)


def rect(w, h, chamfer=0.0):
    """w x h outline centred on the origin; chamfer > 0 cuts the corners (the kit's octagon)."""
    x, y, c = w / 2, h / 2, chamfer
    if not c:
        return [(-x, -y), (x, -y), (x, y), (-x, y)]
    return [(-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c), (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c)]


def ngon(radius, sides):
    """Regular polygon outline (round tiers: cans, tanks, bolt heads)."""
    return [(radius * math.cos(math.tau * i / sides), radius * math.sin(math.tau * i / sides)) for i in range(sides)]


def _node(tree, kind, **props):
    node = tree.nodes.new(kind)
    for key, value in props.items():
        setattr(node, key, value)
    return node


def _math(tree, operation, a, b=None, c=None):
    """Math node; each operand is an output socket or a number."""
    node = _node(tree, "ShaderNodeMath", operation=operation)
    for socket, value in zip(node.inputs, (a, b, c)):
        if isinstance(value, (int, float)):
            socket.default_value = value
        elif value is not None:
            tree.links.new(value, socket)
    return node.outputs[0]


def _remap(tree, value, lo, hi, to_lo, to_hi):
    node = _node(tree, "ShaderNodeMapRange")
    tree.links.new(value, node.inputs[0])
    for i, v in enumerate((lo, hi, to_lo, to_hi), 1):
        node.inputs[i].default_value = v
    return node.outputs[0]


def _noise(tree, scale):
    coords = _node(tree, "ShaderNodeTexCoord")
    noise = _node(tree, "ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Roughness"].default_value = 0.65
    tree.links.new(coords.outputs["Object"], noise.inputs["Vector"])
    return noise.outputs[0]


def _scaled(tree, colour, factor):
    node = _node(tree, "ShaderNodeVectorMath", operation="SCALE")
    node.inputs[0].default_value = colour[:3]
    tree.links.new(factor, node.inputs["Scale"])
    return node.outputs[0]


def _weighted_normals(ob):
    """Largest face wins outright: big faces are exactly flat and only the bevel or chamfer strips blend."""
    mod = ob.modifiers.new("normals", "WEIGHTED_NORMAL")
    # thresh is an absolute area: at its default 0.01 most faces of a 1.5 m prop count as equal and get averaged.
    mod.keep_sharp, mod.weight, mod.thresh = True, 100, 0.0005


def _material(name, base, rough, metal, emit=None, wear=0.0, glow=False):
    """Authoring material (bake source only). wear > 0 adds tonal variation and bright worn edges,
    glow turns `emit` into the cloudy edge-lit gradient of the glass core."""
    mat = bpy.data.materials.new("_src_" + name)
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Emission Strength"].default_value = 0.0
    if emit:
        # Strength stays 1: above it the exporter adds KHR_materials_emissive_strength (not core glTF).
        bsdf.inputs["Emission Strength"].default_value = 1.0
        bsdf.inputs["Emission Color"].default_value = emit
    if glow:
        uv = _node(tree, "ShaderNodeSeparateXYZ")
        tree.links.new(_node(tree, "ShaderNodeTexCoord").outputs["UV"], uv.inputs[0])
        centre = _node(tree, "ShaderNodeVectorMath", operation="DISTANCE")
        tree.links.new(uv.inputs[0].links[0].from_socket, centre.inputs[0])
        centre.inputs[1].default_value = (0.5, 0.5, 0.0)
        # Lit volume: bright floor fading upwards, a halo behind the emblem, corners falling off, hot side rims.
        depth = _math(tree, "ADD", _remap(tree, uv.outputs[1], 0.0, 1.0, 0.55, 0.05),
                      _remap(tree, centre.outputs["Value"], 0.0, 0.42, 0.6, 0.0))
        vignette = _remap(tree, centre.outputs["Value"], 0.35, 0.75, 1.0, 0.3)
        rims = _math(tree, "POWER", _math(tree, "ABSOLUTE", _math(tree, "MULTIPLY_ADD", uv.outputs[0], 2.0, -1.0)), 7.0)
        lit = _math(tree, "ADD", _math(tree, "MULTIPLY", depth, vignette), _math(tree, "MULTIPLY", rims, 0.5))
        level = _math(tree, "MULTIPLY", lit, _remap(tree, _noise(tree, 5.0), 0.3, 0.7, 0.8, 1.15))
        tree.links.new(_scaled(tree, emit, level), bsdf.inputs["Emission Color"])
    if wear:
        tone = _remap(tree, _noise(tree, 3.0), 0.3, 0.7, 0.86, 1.1)
        normals = _node(tree, "ShaderNodeVectorMath", operation="DOT_PRODUCT")
        bevel = _node(tree, "ShaderNodeBevel", samples=8)
        bevel.inputs["Radius"].default_value = 0.035
        tree.links.new(_node(tree, "ShaderNodeNewGeometry").outputs["Normal"], normals.inputs[0])
        tree.links.new(bevel.outputs["Normal"], normals.inputs[1])
        # The bevel node bends the normal only near an edge of the same object: that bend is the wear mask.
        edge = _remap(tree, normals.outputs["Value"], 1.0, 0.9, 0.0, wear)
        worn = _math(tree, "MULTIPLY", edge, _remap(tree, _noise(tree, 16.0), 0.38, 0.6, 0.2, 1.0))
        colour = _node(tree, "ShaderNodeMix", data_type="RGBA")
        tree.links.new(worn, colour.inputs[0])
        tree.links.new(_scaled(tree, base, tone), colour.inputs[6])
        colour.inputs[7].default_value = (0.82, 0.84, 0.86, 1.0)
        tree.links.new(colour.outputs[2], bsdf.inputs["Base Color"])
        scuff = _math(tree, "MULTIPLY", _remap(tree, _noise(tree, 9.0), 0.3, 0.7, 0.8, 1.25), rough)
        tree.links.new(_math(tree, "SUBTRACT", scuff, _math(tree, "MULTIPLY", worn, rough * 0.6)), bsdf.inputs["Roughness"])
    return mat


def materials(accent):
    """The shared material library, tinted by one accent colour (0xRRGGBB)."""
    glow = linear(accent)
    dim = tuple(c * 0.5 for c in glow[:3]) + (1.0,)
    amber = linear(0xFFA52E)
    return {
        # Metallic stays below 1 so the armour keeps some diffuse where the runtime has no environment map.
        "armour": _material("armour", (0.25, 0.28, 0.34, 1.0), 0.45, 0.85, wear=1.0),
        "inset": _material("inset", (0.045, 0.052, 0.065, 1.0), 0.55, 0.6, wear=0.3),
        "bolt": _material("bolt", (0.55, 0.57, 0.6, 1.0), 0.3, 0.9, wear=0.6),
        # Near-black base: any brighter and scene light on the diffuse flattens the emissive gradient.
        "glass": _material("glass", tuple(c * 0.04 for c in glow[:3]) + (1.0,), 0.12, 0.0, emit=glow, glow=True),
        "strip": _material("strip", dim, 0.35, 0.0, emit=glow),
        "emblem": _material("emblem", (1.0, 1.0, 1.0, 1.0), 0.35, 0.0, emit=(1.0, 1.0, 1.0, 1.0)),
        "amber": _material("amber", amber, 0.35, 0.0, emit=amber),
        # Rare-tier extras: gold armour and three more glass hues, so neighbouring facets read as a prism.
        "gold": _material("gold", (1.0, 0.6, 0.12, 1.0), 0.34, 0.75, wear=1.0),
        **{"prism_" + name: _material("prism_" + name, tuple(c * 0.04 for c in linear(rgb)[:3]) + (1.0,), 0.12, 0.0,
                                      emit=linear(rgb), glow=True)
           for name, rgb in (("cyan", 0x4FE3FF), ("pink", 0xFF5FC8), ("gold", 0xFFD36B))},
    }


class Kit:
    """One power-up: a HIGH collection (bevelled bake source, many parts) and a LOW one (shipped mesh)."""

    def __init__(self, asset_id):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.id, self.name = asset_id, asset_id.replace("-", "_")
        self.scene = bpy.context.scene
        self.scene.unit_settings.system = "METRIC"
        self.scene.unit_settings.scale_length = 1.0
        self.high, self.low = (bpy.data.collections.new(n) for n in ("HIGH", "LOW"))
        for collection in (self.high, self.low):
            self.scene.collection.children.link(collection)
        self.exact = []  # bake sources that ship unchanged (light shapes): baked in their own pass
        accent, self.max_size, self.max_triangles = TIERS[asset_id]
        self.mat = materials(accent)

    def _part(self, name, verts, faces, mat, bevel, low, uvs=None):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)  # three.js (x, y, z) -> Blender (x, -z, y)
        if uvs:
            layer = mesh.uv_layers.new(name="outline")
            for loop in mesh.loops:
                layer.data[loop.index].uv = uvs[loop.vertex_index]
        else:
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(mesh)
            bm.free()
        mesh.materials.append(self.mat[mat])
        high = bpy.data.objects.new(name, mesh)
        self.high.objects.link(high)
        if bevel:
            self._bevel(high, bevel, 3)
            mesh.shade_smooth()
            # Flat faces stay flat and only the bevels round off; plain smoothing would shade every face as a pillow.
            _weighted_normals(high)
        if low and not bevel:
            self.exact.append(high)
        if low:
            shipped = bpy.data.objects.new(name + "_low", mesh)
            self.low.objects.link(shipped)
            if bevel >= 0.02:
                self._bevel(shipped, bevel, 1)
        return high

    @staticmethod
    def _bevel(ob, width, segments):
        mod = ob.modifiers.new("bevel", "BEVEL")
        # From 20 degrees: an unchamfered edge between two large faces leaves one of them with the other's normal,
        # and the bake then spends the normal map on correcting that instead of on detail.
        mod.width, mod.segments, mod.limit_method, mod.angle_limit = width, segments, "ANGLE", math.radians(20)

    def loft(self, name, sections, mat, bevel=0.02, low=True, caps=(True, True)):
        """Skin through [(y, outline), ...] (equal point counts). caps=(first, last): leave a buried end open."""
        n, rings = len(sections[0][1]), len(sections)
        verts = [(u, y, v) for y, outline in sections for u, v in outline]
        faces = [(r * n + i, r * n + (i + 1) % n, (r + 1) * n + (i + 1) % n, (r + 1) * n + i)
                 for r in range(rings - 1) for i in range(n)]
        if caps[0]:
            faces.append(tuple(range(n)))
        if caps[1]:
            faces.append(tuple(range((rings - 1) * n, rings * n)))
        return self._part(name, verts, faces, mat, bevel, low)

    def plate(self, name, outline, mat, yaw, dist, depth, y=0.0, x=0.0, bevel=0.01, low=False):
        """Extrude an outline on the face looking along `yaw` degrees about Y (0 = front +Z, 90 = +X).
        Its front surface is `dist` from the Y axis and it reaches `depth` back towards it; the back is open."""
        if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(outline, outline[1:] + outline[:1])) < 0:
            outline = outline[::-1]  # counter-clockwise seen from outside, so the front face points outwards
        a = math.radians(yaw)
        k = len(outline)
        verts = [((u + x) * math.cos(a) + d * math.sin(a), v + y, -(u + x) * math.sin(a) + d * math.cos(a))
                 for d in (dist, dist - depth) for u, v in outline]
        faces = [tuple(range(k))] + [(i, k + i, k + (i + 1) % k, (i + 1) % k) for i in range(k)]
        us, vs = [p[0] for p in outline], [p[1] for p in outline]
        uvs = [((u - min(us)) / (max(us) - min(us)), (v - min(vs)) / (max(vs) - min(vs))) for u, v in outline] * 2
        return self._part(name, verts, faces, mat, bevel, low, uvs)

    def bolt(self, yaw, dist, y, x=0.0, radius=0.028):
        """Bolt head standing 0.014 proud of a surface `dist` from the axis (bake detail only)."""
        return self.plate("bolt", ngon(radius, 8), "bolt", yaw, dist + 0.014, 0.03, y, x, bevel=0.006)

    def finish(self, here):
        """Merge LOW into one mesh, bake HIGH onto it, keep only the shipped mesh and save <here>/<id>.blend."""
        low = self._merge_low()
        self._unwrap(low)
        triangles = len(low.data.polygons)
        assert triangles <= self.max_triangles, f"{triangles} triangles > {self.max_triangles}"
        self._bake(low, os.path.join(here, "textures"))
        for ob in list(self.high.objects):
            mesh = ob.data
            bpy.data.objects.remove(ob)
            bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(self.high)
        for mat in self.mat.values():
            bpy.data.materials.remove(mat)
        # Datablocks only, uncompressed (as roadster2): save_as_mainfile would also store UI state,
        # including the saving user's home directory.
        bpy.data.libraries.write(os.path.join(here, self.id + ".blend"), {self.scene}, compress=False)
        size = [round(v, 4) for v in (low.dimensions.x, low.dimensions.z, low.dimensions.y)]
        print(f"PICKUP_KIT_SUMMARY id={self.id} triangles={triangles} size_xyz={size}")

    def _merge_low(self):
        graph = bpy.context.evaluated_depsgraph_get()
        bm = bmesh.new()
        for ob in self.low.objects:
            shaped = ob.evaluated_get(graph)
            bm.from_mesh(shaped.to_mesh())
            shaped.to_mesh_clear()
        lo = Vector([min(v.co[i] for v in bm.verts) for i in range(3)])
        hi = Vector([max(v.co[i] for v in bm.verts) for i in range(3)])
        size = hi - lo
        limit = self.max_size
        assert size.x <= limit[0] and size.z <= limit[1] and size.y <= limit[2], f"{tuple(size)} exceeds {limit}"
        # Pivot at the bounding-box centre: the runtime spins and bobs the pickup about its origin.
        centre = (lo + hi) / 2
        bmesh.ops.translate(bm, verts=bm.verts, vec=-centre)
        for ob in self.high.objects:
            ob.location = -centre
        mesh = bpy.data.meshes.new(self.name)
        bm.to_mesh(mesh)
        bm.free()
        for ob in list(self.low.objects):
            bpy.data.objects.remove(ob)
        while mesh.uv_layers:
            mesh.uv_layers.remove(mesh.uv_layers[0])
        mesh.materials.clear()
        low = bpy.data.objects.new(self.name, mesh)
        self.low.objects.link(low)
        return low

    def _unwrap(self, low):
        mesh = low.data
        mesh.shade_smooth()
        mesh.set_sharp_from_angle(angle=math.radians(50))  # chamfers (45 deg) shade round, right angles stay hard
        for ob in bpy.context.view_layer.objects:
            ob.select_set(ob == low)
        bpy.context.view_layer.objects.active = low
        # Weighted before triangulating: a fan of slivers would otherwise lose to the chamfer beside it.
        _weighted_normals(low)
        # Triangulated before the bake so the bake and the exporter agree on every diagonal (tangent space).
        low.modifiers.new("triangles", "TRIANGULATE").keep_custom_normals = True
        for name in ("normals", "triangles"):
            bpy.ops.object.modifier_apply(modifier=name)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.0, scale_to_bounds=False)
        bpy.ops.uv.average_islands_scale()
        bpy.ops.uv.pack_islands(rotate=True, margin=0.008)
        bpy.ops.object.mode_set(mode="OBJECT")

    def _bake(self, low, tex_dir):
        scene = self.scene
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 64
        scene.render.dither_intensity = 0.0  # dither noise makes every KTX2 block unique: +150 KB for nothing
        scene.render.bake.target = "IMAGE_TEXTURES"
        scene.world = bpy.data.worlds.new("bake")
        scene.world.light_settings.distance = 0.5  # AO reach: plate breaks and overhangs, not the whole prop

        mat = bpy.data.materials.new(self.name + "_pbr")
        mat.use_nodes = True
        mat.use_backface_culling = True  # exported as single-sided
        tree = mat.node_tree
        low.data.materials.append(mat)
        target = _node(tree, "ShaderNodeTexImage")
        sources = list(self.mat.values())
        detail = [ob for ob in self.high.objects if ob not in self.exact]

        def image(suffix, srgb, fill):
            img = bpy.data.images.new(f"{self.name}_{suffix}", RES, RES, alpha=False)
            img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
            img.generated_color = fill
            return img

        def bake(img, kind, pick=None):
            """pick(tree, bsdf) -> the socket to bake as emission from every source material; None bakes `kind` as is."""
            for src in sources if pick else ():
                nodes = src.node_tree
                emission = _node(nodes, "ShaderNodeEmission")
                nodes.links.new(pick(nodes, next(n for n in nodes.nodes if n.type == "BSDF_PRINCIPLED")), emission.inputs[0])
                nodes.links.new(emission.outputs[0], next(n for n in nodes.nodes if n.type == "OUTPUT_MATERIAL").inputs[0])
            target.image = img
            tree.nodes.active = target
            # Second pass: light shapes that ship as geometry are baked alone with a cage thinner than their height.
            # In one pass the surface behind them would also catch them, as a stair-stepped copy around the real edge.
            for sources_, cage, margin in ((detail, CAGE, 4), (self.exact, 0.004, 2)):
                for ob in bpy.context.view_layer.objects:
                    ob.select_set(ob == low or ob in sources_)
                bpy.context.view_layer.objects.active = low
                if sources_:
                    bpy.ops.object.bake(type=kind, normal_space="TANGENT", use_selected_to_active=True,
                                        cage_extrusion=cage, max_ray_distance=cage * 3, margin=margin, use_clear=False)
            return img

        def source(nodes, socket):
            if socket.is_linked:
                return socket.links[0].from_socket
            constant = _node(nodes, "ShaderNodeRGB" if socket.type == "RGBA" else "ShaderNodeValue")
            constant.outputs[0].default_value = socket.default_value
            return constant.outputs[0]

        def rough_metal(nodes, bsdf):
            packed = _node(nodes, "ShaderNodeCombineColor")
            nodes.links.new(source(nodes, bsdf.inputs["Roughness"]), packed.inputs[0])
            nodes.links.new(source(nodes, bsdf.inputs["Metallic"]), packed.inputs[1])
            return packed.outputs[0]

        def emission(nodes, bsdf):
            if bsdf.inputs["Emission Strength"].default_value:
                return source(nodes, bsdf.inputs["Emission Color"])
            black = _node(nodes, "ShaderNodeRGB")
            black.outputs[0].default_value = (0.0, 0.0, 0.0, 1.0)
            return black.outputs[0]

        # Order matters: normal and AO need the real shaders, the EMIT passes rewire every source material.
        normal = bake(image("normal", False, (0.5, 0.5, 1.0, 1.0)), "NORMAL")
        occlusion = bake(image("ao", False, (1.0, 1.0, 1.0, 1.0)), "AO")
        base = bake(image("basecolor", True, (0.1, 0.1, 0.1, 1.0)), "EMIT", lambda n, b: source(n, b.inputs["Base Color"]))
        rm = bake(image("rm", False, (0.5, 0.0, 0.0, 1.0)), "EMIT", rough_metal)
        emissive = bake(image("emissive", True, (0.0, 0.0, 0.0, 1.0)), "EMIT", emission)
        tree.nodes.remove(target)

        def read(img):
            flat = np.empty(RES * RES * 4, dtype=np.float32)
            img.pixels.foreach_get(flat)
            return flat.reshape(RES, RES, 4)

        # Faces the bake found flat (within a level and a half) become exactly flat: identical blocks compress away.
        px = read(normal)
        px[(np.abs(px[..., :2] - 128 / 255) < 1.5 / 255).all(axis=2)] = (128 / 255, 128 / 255, 1.0, 1.0)
        normal.pixels.foreach_set(px.ravel())

        # 3x3 mean: 64 AO samples leave grain that would cost bytes in every compressed block.
        ao = read(occlusion)
        ao = sum(np.roll(ao, (dy, dx), (0, 1)) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
        # Cavity dirt: plate breaks and recesses are darker in the base colour itself. It has no light direction,
        # so panels still separate where the runtime lights the prop without an aoMap or environment.
        px = read(base)
        px[..., :3] *= CAVITY + (1 - CAVITY) * ao[..., :1]
        base.pixels.foreach_set(px.ravel())

        # glTF ORM: occlusion R, roughness G, metallic B in one linear texture, averaged down to ORM_RES.
        ao[..., 1:3] = read(rm)[..., 0:2]
        step = RES // ORM_RES
        orm = bpy.data.images.new(self.name + "_orm", ORM_RES, ORM_RES, alpha=False)
        orm.colorspace_settings.name = "Non-Color"
        orm.pixels.foreach_set(ao.reshape(ORM_RES, step, ORM_RES, step, 4).mean(axis=(1, 3)).ravel())
        for img in (occlusion, rm):
            bpy.data.images.remove(img)
        scene.world = None

        os.makedirs(tex_dir, exist_ok=True)
        for img in (base, orm, normal, emissive):
            img.filepath_raw = os.path.join(tex_dir, img.name + ".png")
            img.file_format = "PNG"
            img.save()
            img.source = "FILE"
            img.filepath_raw = f"//textures/{img.name}.png"  # relative to the .blend: no machine path is stored

        bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
        tex = {img: _node(tree, "ShaderNodeTexImage", image=img) for img in (base, orm, normal, emissive)}
        tree.links.new(tex[base].outputs["Color"], bsdf.inputs["Base Color"])
        tree.links.new(tex[emissive].outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.0
        bump = _node(tree, "ShaderNodeNormalMap")
        tree.links.new(tex[normal].outputs["Color"], bump.inputs["Color"])
        tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        channels = _node(tree, "ShaderNodeSeparateColor")
        tree.links.new(tex[orm].outputs["Color"], channels.inputs[0])
        tree.links.new(channels.outputs[1], bsdf.inputs["Roughness"])
        tree.links.new(channels.outputs[2], bsdf.inputs["Metallic"])
        # The exporter reads occlusion from a group with this exact name.
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        tree.links.new(channels.outputs[0], _node(tree, "ShaderNodeGroup", node_tree=group).inputs["Occlusion"])


def review(asset_id):
    """review/final.png (reference beside the exported look, plus a 128 px strip) and review/turntable.png.
    Renders the raw GLB written by export-glb.mjs, so the sheets show the delivery material, not the sources."""
    here = os.path.join(ROOT, "assets-src", asset_id)
    work = tempfile.mkdtemp(prefix="pickup-review-")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(tempfile.gettempdir(), "skyline-rush-glb", asset_id + ".raw.glb"))
    scene = bpy.context.scene
    prop = next(o for o in scene.objects if o.type == "MESH")
    prop.rotation_mode = "XYZ"
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"  # keeps the emissive accents saturated; AgX washes them out
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"

    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    scene.world = world
    up = _node(world.node_tree, "ShaderNodeSeparateXYZ")
    world.node_tree.links.new(_node(world.node_tree, "ShaderNodeTexCoord").outputs["Generated"], up.inputs[0])
    sky = _node(world.node_tree, "ShaderNodeMix", data_type="RGBA")
    world.node_tree.links.new(_remap(world.node_tree, up.outputs[2], -0.3, 0.7, 0.0, 1.0), sky.inputs[0])
    sky.inputs[6].default_value = (0.03, 0.03, 0.035, 1.0)
    sky.inputs[7].default_value = (0.32, 0.38, 0.48, 1.0)
    world.node_tree.links.new(sky.outputs[2], next(n for n in world.node_tree.nodes if n.type == "BACKGROUND").inputs[0])

    def aim(ob, at):
        ob.location = at
        ob.rotation_euler = (-Vector(at)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(ob)
        return ob

    # 4.6 m frames 1.95 units: pull back for the tall tiers so the sheet never crops them.
    elevation, distance = math.radians(12), 4.6 * max(1.0, max(TIERS[asset_id][1]) / 1.8)
    camera = aim(bpy.data.objects.new("camera", bpy.data.cameras.new("camera")),
                 (0.0, -distance * math.cos(elevation), distance * math.sin(elevation)))
    camera.data.lens = 85
    scene.camera = camera
    for at, watts in (((-2.5, -3.0, 3.0), 180), ((3.0, -2.0, 0.5), 50), ((0.5, 3.0, 2.5), 250)):
        light = bpy.data.lights.new("light", "AREA")
        light.energy, light.size = watts, 2.0
        aim(bpy.data.objects.new("light", light), at)

    backdrop = np.array([0.05, 0.06, 0.08], dtype=np.float32)

    def pixels(path, size=None):
        """Image file as a top-down RGB array composited over the backdrop."""
        img = bpy.data.images.load(path)
        if size:
            img.scale(size, size)
        w, h = img.size
        flat = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(flat)
        bpy.data.images.remove(img)
        rgba = flat.reshape(h, w, 4)[::-1]
        return rgba[..., :3] * rgba[..., 3:] + backdrop * (1 - rgba[..., 3:])

    def shots(size):
        """Eight views, 45 degrees apart: the prop turns under fixed lights, as it does in the game."""
        scene.render.resolution_x = scene.render.resolution_y = size
        out = []
        for i in range(8):
            prop.rotation_euler = (0.0, 0.0, -math.radians(45 * i))
            scene.render.filepath = os.path.join(work, f"{size}_{i}.png")
            bpy.ops.render.render(write_still=True)
            out.append(pixels(scene.render.filepath))
        return out

    def sheet(rows, name):
        width = max(sum(tile.shape[1] for tile in row) for row in rows)
        strips = []
        for row in rows:
            strip = np.concatenate(row, axis=1)
            pad = np.broadcast_to(backdrop, (strip.shape[0], width - strip.shape[1], 3))
            strips.append(np.concatenate([strip, pad], axis=1))
        rgb = np.concatenate(strips, axis=0)
        h, w, _ = rgb.shape
        img = bpy.data.images.new(name, w, h, alpha=False)
        img.pixels.foreach_set(np.concatenate([rgb, np.ones((h, w, 1), dtype=np.float32)], axis=2)[::-1].ravel())
        os.makedirs(os.path.join(here, "review"), exist_ok=True)
        img.filepath_raw = os.path.join(here, "review", name + ".png")
        img.file_format = "PNG"
        img.save()

    ref = os.path.join(here, "ref", "front.png")
    big, small = shots(RES), shots(128)
    # Front, three-quarter, side, back; then the same turn at the size it has on the track.
    sheet([[pixels(ref, RES), big[0], big[1], big[2], big[4]], [pixels(ref, 128), *small]], "final")
    sheet([big[:4], big[4:]], "turntable")


if __name__ == "__main__":
    command, asset = sys.argv[sys.argv.index("--") + 1:][:2]
    assert command == "review", "usage: blender --background --python scripts/assets/pickup_kit.py -- review <id>"
    review(asset)
