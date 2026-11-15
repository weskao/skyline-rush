"""Renders the baked Neon pavement PNGs (bake.py output) so the look can be judged before encoding. Blender renders,
not in-game screenshots:
  top_3x3.png    3 x 3 tiles from above, flat light (seams, repetition, puddle layout)
  dry_night.png  eye-height view along a sidewalk under the Shanghai Bund night HDRI and neon panels; wetness 0
  wet_night.png  same view at wetness 0.85 (Neon `rain`), with the wet terms of src/coast-road-material.ts:
                 puddle = smoothstep(.4, .95, packed.b) * w; rough = mix(mix(r, r * .4, w), .2, puddle);
                 colour *= mix(1, .5, w) * mix(1, .75, puddle); normal strength 1 - puddle; colour x #a0a0a0.
Run: "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-pavement/preview.py -- <png-dir> <out-dir> [res]
The HDRI comes from $HOME/.cache/skyline-rush/polyhaven/shanghai_bund (assets-src/neon-sky/fetch.py).
"""
import math
import os
import random
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
png_dir, out_dir = args[:2]
RES = args[2] if len(args) > 2 else "2048"
TILE_M = 7.2
WET = 0.85
HDRI = os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven", "shanghai_bund", "shanghai_bund_1k.hdr")
NEON = [(1.0, 0.12, 0.62), (0.55, 0.22, 1.0), (0.15, 0.75, 1.0), (1.0, 0.3, 0.85), (1.0, 0.62, 0.3)]


def material(wetness, repeats_u, repeats_v):
    mat = bpy.data.materials.new(f"pavement_w{wetness}")
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

    def m(op, a, b, c=None):
        node = n("ShaderNodeMath")
        node.operation = op
        for i, v in enumerate((a, b, c)):
            if v is not None:
                lk(v, node.inputs[i]) if not isinstance(v, (int, float)) else setattr(node.inputs[i], "default_value", v)
        return node.outputs[0]

    base, packed, normal = tex("basecolor", "sRGB"), tex("packed", "Non-Color"), tex("normal", "Non-Color")
    sep = n("ShaderNodeSeparateColor")
    lk(packed, sep.inputs["Color"])
    ao, rough, mask = sep.outputs["Red"], sep.outputs["Green"], sep.outputs["Blue"]
    sm = n("ShaderNodeMapRange")
    sm.interpolation_type = "SMOOTHSTEP"
    sm.inputs["From Min"].default_value, sm.inputs["From Max"].default_value = 0.4, 0.95
    lk(mask, sm.inputs["Value"])
    puddle = m("MULTIPLY", sm.outputs["Result"], wetness)
    rough = m("MULTIPLY", rough, 1 - 0.6 * wetness)
    rough = m("ADD", rough, m("MULTIPLY", m("SUBTRACT", 0.2, rough), puddle))
    shade = m("MULTIPLY", m("MULTIPLY", ao, 0.35 * (1 - 0.5 * wetness)), m("MULTIPLY_ADD", puddle, -0.25, 1.0))
    scale = n("ShaderNodeVectorMath")
    scale.operation = "SCALE"
    lk(base, scale.inputs[0])
    lk(shade, scale.inputs[3])
    nmap = n("ShaderNodeNormalMap")
    lk(normal, nmap.inputs["Color"])
    lk(m("SUBTRACT", 1.0, puddle), nmap.inputs["Strength"])
    bsdf = n("ShaderNodeBsdfPrincipled")
    lk(scale.outputs["Vector"], bsdf.inputs["Base Color"])
    lk(rough, bsdf.inputs["Roughness"])
    lk(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    lk(bsdf.outputs["BSDF"], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def emissive(name, colour, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*colour, 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs["Emission"], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def cube(loc, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.scale = size
    ob.data.materials.append(mat)


def shopfronts():
    """Dark building wall along one side of the sidewalk with neon panels; fixed seed."""
    rng = random.Random(7)
    wall = bpy.data.materials.new("wall")
    wall.use_nodes = True
    next(nd for nd in wall.node_tree.nodes if nd.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.03, 0.03, 0.035, 1)
    cube((4.5, 60, 15), (1, 140, 30), wall)
    y = -5.0
    while y < 120:
        y += rng.uniform(3, 9)
        cube((3.95, y, rng.uniform(2.2, 6)), (0.08, rng.uniform(1.2, 4), rng.uniform(0.25, 1.6)),
             emissive("neon", rng.choice(NEON), rng.uniform(8, 18)))


def render(name, wetness, size, camera, res=(1280, 720), night=True):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane = bpy.context.active_object
    plane.scale = (size[0], size[1], 1)
    plane.location.y = size[1] / 2 - 5 if night else 0
    plane.data.materials.append(material(wetness, size[0] / TILE_M, size[1] / TILE_M))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    camera(cam)
    scene.world = bpy.data.worlds.new("sky")
    scene.world.use_nodes = True
    wn = scene.world.node_tree
    bg = next(nd for nd in wn.nodes if nd.type == "BACKGROUND")
    if night:
        shopfronts()
        env = wn.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(HDRI)
        wn.links.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.5   # the Bund skyline is lit; halved so the street reads as night
    else:
        bg.inputs["Color"].default_value, bg.inputs["Strength"].default_value = (1, 1, 1, 1), 1.5
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 128 if night else 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.view_settings.view_transform = "AgX" if night else "Standard"
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)


def top(cam):
    cam.data.type, cam.data.ortho_scale = "ORTHO", 3 * TILE_M
    cam.location = (0, 0, 20)


def eye(cam):
    cam.data.lens = 24
    cam.location = (-1.5, -4, 1.6)
    cam.rotation_euler = (math.radians(80), 0, math.radians(-8))


os.makedirs(out_dir, exist_ok=True)
render("top_3x3.png", 0, (3 * TILE_M, 3 * TILE_M), top, (1536, 1536), night=False)
render("dry_night.png", 0, (8, 130), eye)
render("wet_night.png", WET, (8, 130), eye)
