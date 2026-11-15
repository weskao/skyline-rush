"""Review renders of the Neon city kit, for comparison with the concept frames. Never saves the master.

  "$BLENDER_BIN" --background assets-src/neon-city/neon-city.blend --python assets-src/neon-city/review.py

Writes PNGs to docs/designs/3d-pipeline/audits/neon-city/ (git-ignored): one sheet per module with its LODs
side by side (LOD 0 left), a street-level view of each building, and two mock streets (boulevard after
frame 03, night market after frame 05). The mock streets are review dressing only: placement is the runtime's.
"""
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "docs", "designs", "3d-pipeline", "audits", "neon-city")
with open(os.path.join(HERE, "modules.json"), encoding="utf-8") as f:
    MODULES = json.load(f)["modules"]
scene = bpy.context.scene


def setup():
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            pass
    try:
        scene.eevee.use_raytracing = True  # the wet ground mirrors the neon
    except AttributeError:
        pass
    try:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError:
        scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("review")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value, bg.inputs["Strength"].default_value = (0.06, 0.045, 0.13, 1), 1.0  # violet overcast night
    scene.world = world
    moon = bpy.data.objects.new("review_moon", bpy.data.lights.new("review_moon", "SUN"))
    moon.data.energy, moon.data.color, moon.rotation_euler = 3.0, (0.7, 0.75, 1.0), (math.radians(50), 0, math.radians(-35))
    scene.collection.objects.link(moon)
    mat = bpy.data.materials.new("review_wet_ground")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value, bsdf.inputs["Roughness"].default_value = (0.02, 0.02, 0.025, 1), 0.22
    bpy.ops.mesh.primitive_plane_add(size=4000, location=(0, 0, -0.01))
    bpy.context.object.data.materials.append(mat)
    cam = bpy.data.objects.new("review_cam", bpy.data.cameras.new("review_cam"))
    cam.data.clip_end = 5000
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def shoot(cam, name, eye, target, lens, size):
    cam.location, cam.data.lens = eye, lens
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y").to_euler()
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


def bounds(obs):
    pts = [ob.matrix_world @ Vector(c) for ob in obs for c in ob.bound_box]
    lo, hi = Vector(map(min, zip(*pts))), Vector(map(max, zip(*pts)))
    return lo, hi


def module_sheets(cam):
    kit = [ob for ob in scene.objects if ob.type == "MESH" and ob.name.rsplit("_lod", 1)[0] in MODULES]
    for name, mod in MODULES.items():
        lods = [bpy.data.objects[f"{name}_lod{i}"] for i in range(len(mod["triangles"]))]
        for ob in kit:
            ob.hide_render = ob not in lods
        step = lods[0].dimensions.x + max(1.0, lods[0].dimensions.x * 0.25)
        for i, ob in enumerate(lods):
            ob.location.x = i * step
        bpy.context.view_layer.update()
        lo, hi = bounds(lods)
        centre, w, h = (lo + hi) / 2, hi.x - lo.x, hi.z - lo.z
        tall = h > w
        size, lens = ((1000, 1400) if tall else (1600, 1000)), 50
        half = 18 / lens / max(size)  # tan of the half angle per pixel: the long side spans the 36 mm sensor
        d = max(w / 2 / (half * size[0]), h / 2 / (half * size[1])) * 1.25 + (hi.y - lo.y) / 2
        eye = centre + Vector((-0.42, -1.0, 0.22)).normalized() * d
        shoot(cam, f"module_{name}", eye, centre, lens, size)
        if mod["group"] == "building":  # what the chase camera sees: the first storeys from the road
            for ob in lods[1:]:
                ob.hide_render = True
            shoot(cam, f"street_{name}", (-13, lo.y - 17, 2.4), (0, lo.y, min(5.0, h * 0.45)), 28, (1600, 1000))
        for ob in lods:
            ob.location.x = 0
    for ob in kit:
        ob.hide_render = True


def place(name, x, y, turn=0.0, lod=0, scale=1.0):
    ob = bpy.data.objects[f"{name}_lod{lod}"].copy()  # shares the mesh
    ob.parent, ob.location, ob.rotation_euler, ob.scale, ob.hide_render = None, (x, y, 0), (0, 0, math.radians(turn)), (scale,) * 3, False
    scene.collection.objects.link(ob)
    return ob


def clear(obs):
    for ob in obs:
        bpy.data.objects.remove(ob)


def boulevard(cam):
    """Frame 03: four 5 m lanes (y -10..10), railings and trees on the pavement, towers behind, the spire ahead."""
    obs = []
    for side, turn in ((1, 0), (-1, 180)):
        row = ["tower_glass_a", "block_retail_a", "tower_glass_b", "block_office_b", "block_retail_a", "tower_glass_a"]
        for i, name in enumerate(row if side > 0 else row[::-1]):
            depth = {"tower_glass_a": 12, "tower_glass_b": 10}.get(name, 6)
            obs.append(place(name, -40 + i * 31, side * (15 + depth), turn))
        for i in range(18):
            obs.append(place("railing", -75 + i * 10, side * 10.6, turn))
        for i in range(7):
            obs.append(place("cherry_tree", -60 + i * 26, side * 13.0, turn + i * 47))
            obs.append(place("street_lamp", -47 + i * 26, side * 11.6, turn))
        obs.append(place("sign_blade_a", -28, side * 14.25, turn))
        obs.append(place("sign_blade_b", 34, side * 14.25, turn))
        obs.append(place("billboard_b", 21 * side, side * 14.7, turn))
    obs.append(place("traffic_light", 30, 11.4))
    obs.append(place("billboard_a", 52, 21, lod=0))
    obs[-1].location.z = 19.5
    far = ["skyline_tower_a", "skyline_tower_b", "skyline_tower_c"]
    for i in range(26):
        x, y = 260 + (i * 97) % 420, -420 + (i * 173) % 840
        if abs(y) > 60:
            obs.append(place(far[i % 3], x, y, turn=i * 90, lod=1, scale=0.7 + (i * 37 % 60) / 100))
    obs.append(place("skyline_spire", 520, 0))
    shoot(cam, "scene_boulevard", (-70, -2.5, 4.2), (60, 0, 16), 24, (1920, 1080))
    shoot(cam, "scene_boulevard_kerbside", (-52, 4, 2.2), (-20, 16, 6), 28, (1920, 1080))
    clear(obs)


def market(cam):
    """Frame 05: shops close to a bend, race kerbs at the road edge, lantern light, stacked signs."""
    obs = []
    for side, turn in ((1, 0), (-1, 180)):
        for i in range(7):
            obs.append(place("shop_market_a" if (i + (side > 0)) % 2 else "shop_market_b", -24 + i * 9.0, side * 17.5, turn))
            obs.append(place("kerb_redwhite", -26 + i * 8, side * 10.5, turn))
            obs.append(place("kerb_redwhite", -22 + i * 8, side * 10.5, turn))
        for i in range(6):
            obs.append(place("railing", -25 + i * 10, side * 11.6, turn))
        for x in (-10.5, 16.5):
            obs.append(place("sign_stack_a", x * side, side * 13.2, turn))
        obs.append(place("cherry_tree", 7 * side, side * 12.8, turn + 60))
    shoot(cam, "scene_market", (-34, -3, 3.2), (10, 2, 4.5), 24, (1920, 1080))
    shoot(cam, "scene_market_shopfront", (-9, 2, 2.0), (-2, 14, 3.2), 28, (1920, 1080))
    clear(obs)


os.makedirs(OUT, exist_ok=True)
camera = setup()
module_sheets(camera)
boulevard(camera)
market(camera)
