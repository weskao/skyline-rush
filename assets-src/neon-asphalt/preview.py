"""Renders the baked Neon asphalt PNGs (bake.py output) so the look can be judged before encoding:
  top_3x3.png    3 x 3 tiles from above, flat light (seams, repetition, puddle layout)
  dry_night.png  chase-height view down a night street lit only by neon panels; wetness 0 (`night`)
  wet_night.png  same street at wetness 0.85 (`rain`): the wet terms of src/coast-road-material.ts
The road shader copies the runtime: colour x #a0a0a0, roughness from packed.g, and for wetness w
  puddle = smoothstep(.4, .95, packed.b) * w; rough = mix(mix(r, r * .4, w), .2, puddle);
  colour *= mix(1, .5, w) * mix(1, .75, puddle); normal strength 1 - puddle.
Lane lines are unlit boxes like the runtime's instanced lane geometry (#d9dcda at -5 / 0 / +5 m).
Run: "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-asphalt/preview.py -- <png-dir> <out-dir> [res]
"""
import math
import os
import random
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
png_dir, out_dir = args[:2]
RES = args[2] if len(args) > 2 else "2048"
WET = 0.85                          # coastWetness('rain')
NEON = [(1.0, 0.12, 0.62), (0.55, 0.22, 1.0), (0.15, 0.75, 1.0), (1.0, 0.3, 0.85), (1.0, 0.62, 0.3)]


def material(wetness, repeats_u, repeats_v):
    mat = bpy.data.materials.new(f"road_w{wetness}")
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
    rough = m("MULTIPLY", rough, 1 - 0.6 * wetness)                        # mix(r, r * .4, w)
    rough = m("ADD", rough, m("MULTIPLY", m("SUBTRACT", 0.2, rough), puddle))   # mix(rough, .2, puddle)
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


def street():
    """Lane dashes, dark building masses and neon panels along both kerbs; fixed seed."""
    rng = random.Random(5)
    paint = emissive("lane_paint", (0.69, 0.72, 0.70), 1.0)   # unlit #d9dcda
    for lane in (-5, 0, 5):
        for y in range(0, 230, 9):
            cube((lane, y + 2.35, 0.009), (0.11, 4.7, 0.018), paint)
    wall = bpy.data.materials.new("wall")
    wall.use_nodes = True
    next(nd for nd in wall.node_tree.nodes if nd.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.03, 0.03, 0.035, 1)
    for side in (-1, 1):
        y = -10.0
        while y < 240:
            depth = rng.uniform(10, 24)
            cube((side * 22, y + depth / 2, 15), (16, depth - 0.6, 30), wall)
            for _ in range(rng.randint(1, 3)):
                colour = rng.choice(NEON)
                h, z = rng.uniform(0.25, 2.5), rng.uniform(3, 12)
                cube((side * 13.9, y + rng.uniform(1, depth - 2), z), (0.08, rng.uniform(1.5, 6), h),
                     emissive("neon", colour, rng.uniform(8, 18)))
            y += depth


def render(name, wetness, size, camera, res=(1280, 720), night=True):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane = bpy.context.active_object
    plane.scale = (size[0], size[1], 1)
    plane.location.y = size[1] / 2 - 10 if night else 0
    plane.data.materials.append(material(wetness, size[0] / 24, size[1] / 24))
    if night:
        street()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    camera(cam)
    scene.world = bpy.data.worlds.new("sky")
    scene.world.use_nodes = True
    bg = next(nd for nd in scene.world.node_tree.nodes if nd.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.03, 0.015, 0.06, 1) if night else (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = 1.0 if night else 1.5
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 128 if night else 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.view_settings.view_transform = "AgX" if night else "Standard"
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)


def top(cam):
    cam.data.type, cam.data.ortho_scale = "ORTHO", 72
    cam.location = (0, 0, 20)


def chase(cam):
    cam.data.lens = 24
    cam.location = (-2.5, -6, 1.6)
    cam.rotation_euler = (math.radians(84), 0, 0)


os.makedirs(out_dir, exist_ok=True)
render("top_3x3.png", 0, (72, 72), top, (1536, 1536), night=False)
render("dry_night.png", 0, (24, 240), chase)
render("wet_night.png", WET, (24, 240), chase)
