"""Bakes the Roadster 2 texture set into the shared UV atlas made by build.py and wires it into
every material, then saves roadster2.blend again. Run after build.py, from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/roadster2/bake.py

  textures/roadster2_normal.png  tangent-space normal (OpenGL +Y), Non-Color, from bevelled HIGH copies
  textures/roadster2_ao.png      ambient occlusion of the assembled car, Non-Color

HIGH copies live only in memory during the bake: the saved file holds the shipping objects alone,
so scripts/assets/export_glb.py (which exports everything in the file) exports nothing else.
"""
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "textures")
RES = 1024
MARGIN = 4

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "roadster2.blend"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 64
scene.render.bake.target = "IMAGE_TEXTURES"
lows = [ob for ob in bpy.data.collections["LOW"].all_objects if ob.type == "MESH"]
mats = sorted({m for ob in lows for m in ob.data.materials if m}, key=lambda m: m.name)


def atlas(name, fill):
    img = bpy.data.images.new(name, RES, RES, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    img.generated_color = fill
    return img


def target(img):
    """Make img the active Image Texture node of every material (that is where Cycles bakes to)."""
    nodes = []
    for m in mats:
        n = m.node_tree.nodes.new("ShaderNodeTexImage")
        n.image = img
        m.node_tree.nodes.active = n
        nodes.append((m, n))
    return nodes


def untarget(nodes):
    for m, n in nodes:
        m.node_tree.nodes.remove(n)


def select(objs, active):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active


# NORMAL: per object, from a bevelled copy (rounded edges the LOW silhouette keeps sharp).
normal = atlas("roadster2_normal", (0.5, 0.5, 1.0, 1.0))
high = bpy.data.collections.new("_BAKE_HIGH")
scene.collection.children.link(high)
nodes = target(normal)

# Panel lines on the body HIGH copy: three.js-space boxes (x0, x1, y0, y1, z0, z1), 8 mm wide, cut into the
# surface so the normal map shows the door cuts, sill line and hood seams the LOW mesh does not model.
GROOVES = [
    *[(s * 1.0, s * 1.3, .30, .74, z - .004, z + .004) for s in (-1, 1) for z in (-.72, .44)],   # door front/rear cuts
    *[(s * 1.0, s * 1.3, .345, .353, -.80, .86) for s in (-1, 1)],                            # sill line
    (-.80, .80, .55, .95, -1.554, -1.546),                                                     # hood rear seam
    *[(x - .004, x + .004, .55, .95, -2.35, -1.55) for x in (-.52, .52)],                      # hood side seams
]


def cutter(x0, x1, y0, y1, z0, z1):
    """Box mesh in Blender space ((x, -z, y)), hidden from render, only used as a boolean operand."""
    me = bpy.data.meshes.new("_groove")
    lo, hi_ = (min(x0, x1), -z1, y0), (max(x0, x1), -z0, y1)
    v = [(a, b, c) for a in (lo[0], hi_[0]) for b in (lo[1], hi_[1]) for c in (lo[2], hi_[2])]
    me.from_pydata(v, [], [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
    ob = bpy.data.objects.new("_groove", me)
    ob.hide_render = True
    high.objects.link(ob)
    return ob


for low in lows:
    hi = low.copy()
    hi.data = low.data.copy()
    hi.parent = None
    hi.matrix_world = low.matrix_world.copy()
    high.objects.link(hi)
    if low.name == "body":
        for box in GROOVES:
            cut = hi.modifiers.new("groove", "BOOLEAN")
            cut.operation, cut.solver, cut.object = "DIFFERENCE", "EXACT", cutter(*box)
    bev = hi.modifiers.new("bevel", "BEVEL")
    bev.width, bev.segments, bev.limit_method = 0.012, 3, "ANGLE"
    bev.harden_normals = False
    select([hi, low], low)
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", use_selected_to_active=True,
                        cage_extrusion=0.01, max_ray_distance=0.03, margin=MARGIN, use_clear=False)
untarget(nodes)
for ob in list(high.objects):
    me = ob.data
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
bpy.data.collections.remove(high)

# AO: all shipping meshes at once, so wheels, wing and canopy occlude each other.
ao = atlas("roadster2_ao", (1.0, 1.0, 1.0, 1.0))
nodes = target(ao)
select(lows, lows[0])
bpy.ops.object.bake(type="AO", margin=MARGIN, use_clear=False)
untarget(nodes)

os.makedirs(TEX, exist_ok=True)
for img in (normal, ao):
    img.filepath_raw = "//textures/%s.png" % img.name  # relative to the open .blend: no machine path stored
    img.file_format = "PNG"
    img.save()
    img.source = "FILE"

# glTF: occlusion is read from a "glTF Material Output" group's Occlusion input.
gltf = bpy.data.node_groups.get("glTF Material Output") or bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
if not gltf.interface.items_tree:
    gltf.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
for m in mats:
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image, tn.location = normal, (-700, -300)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.location = (-400, -300)
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    ta = nt.nodes.new("ShaderNodeTexImage")
    ta.image, ta.location = ao, (-700, -650)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    sep.location = (-400, -650)
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree, g.location = gltf, (0, -650)
    nt.links.new(ta.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs[0], g.inputs["Occlusion"])

# Datablocks only, uncompressed, like build.py (no UI state, so no home directory in the file).
bpy.data.libraries.write(os.path.join(HERE, "roadster2.blend"), {scene}, compress=False)
print("ROADSTER2_BAKED", RES, [i.filepath for i in (normal, ao)])
