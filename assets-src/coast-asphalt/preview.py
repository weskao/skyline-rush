"""Renders the baked Coast asphalt PNGs (bake.py output) so the look can be judged before encoding:
  top_3x3.png   3 x 3 tiles from above (seams, repetition)
  dry_day.png   chase-height view down the road, day HDRI, puddle mask ignored
  wet_dusk.png  same view at sunset, puddle mask = low roughness, flat normal, darker colour
Run: "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-asphalt/preview.py -- <png-dir> <out-dir> [res]
"""
import math
import os
import sys

import bpy

png_dir, out_dir = sys.argv[sys.argv.index("--") + 1:][:2]
args = sys.argv[sys.argv.index("--") + 1:]
RES = args[2] if len(args) > 2 else "2048"
HDRI = os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven")
SKY = {"day": "kloofendal_48d_partly_cloudy_puresky/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
       "dusk": "qwantani_sunset_puresky/qwantani_sunset_puresky_1k.hdr"}


def material(wet, repeats_u, repeats_v):
    mat = bpy.data.materials.new("road_wet" if wet else "road_dry")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    n, lk = nt.nodes.new, nt.links.new
    mapping = n("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (repeats_u, repeats_v, 1)
    lk(n("ShaderNodeTexCoord").outputs["UV"], mapping.inputs["Vector"])

    def tex(name, space):
        t = n("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(png_dir, f"{name}_{RES}.png"))
        t.image.colorspace_settings.name = space
        lk(mapping.outputs["Vector"], t.inputs["Vector"])
        return t.outputs["Color"]

    base, packed, normal = tex("basecolor", "sRGB"), tex("packed", "Non-Color"), tex("normal", "Non-Color")
    sep = n("ShaderNodeSeparateColor")
    lk(packed, sep.inputs["Color"])
    ao, rough, puddle = sep.outputs["Red"], sep.outputs["Green"], sep.outputs["Blue"]

    def math_(op, a, b):
        m = n("ShaderNodeMath")
        m.operation = op
        for i, v in enumerate((a, b)):
            lk(v, m.inputs[i]) if not isinstance(v, (int, float)) else setattr(m.inputs[i], "default_value", v)
        return m.outputs[0]

    scale = n("ShaderNodeVectorMath")
    scale.operation = "SCALE"
    lk(base, scale.inputs[0])
    shade, strength = ao, 1.0
    if wet:
        shade = math_("MULTIPLY", ao, math_("SUBTRACT", 1.0, math_("MULTIPLY", puddle, 0.55)))
        rough = math_("ADD", rough, math_("MULTIPLY", math_("SUBTRACT", 0.04, rough), puddle))
        strength = math_("SUBTRACT", 1.0, math_("MULTIPLY", puddle, 0.9))
    lk(shade, scale.inputs[3]) if not isinstance(shade, float) else None
    nmap = n("ShaderNodeNormalMap")
    lk(normal, nmap.inputs["Color"])
    lk(strength, nmap.inputs["Strength"]) if not isinstance(strength, float) else None
    bsdf = n("ShaderNodeBsdfPrincipled")
    lk(scale.outputs["Vector"], bsdf.inputs["Base Color"])
    lk(rough, bsdf.inputs["Roughness"])
    lk(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    lk(bsdf.outputs["BSDF"], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def render(name, mat, size, camera, sky, res=(1280, 720)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    mat = material(*mat)
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane = bpy.context.active_object
    plane.scale = (size[0], size[1], 1)
    plane.data.materials.append(mat)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    camera(cam)
    scene.world = bpy.data.worlds.new("sky")
    scene.world.use_nodes = True
    env = scene.world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(HDRI, SKY[sky]))
    scene.world.node_tree.links.new(env.outputs["Color"], scene.world.node_tree.nodes["Background"].inputs["Color"])
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)


def top(cam):
    cam.data.type, cam.data.ortho_scale = "ORTHO", 72
    cam.location = (0, 0, 20)


def chase(cam):
    cam.data.lens = 24
    cam.location = (-5.25, -2, 1.6)
    cam.rotation_euler = (math.radians(84), 0, 0)


os.makedirs(out_dir, exist_ok=True)
render("top_3x3.png", (False, 3, 3), (72, 72), top, "day", (1536, 1536))
render("dry_day.png", (False, 1, 10), (24, 240), chase, "day")
render("wet_dusk.png", (True, 1, 10), (24, 240), chase, "dusk")
