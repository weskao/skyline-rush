"""Preview renders of the Sky Spiral landmark kit under a clear day sky.

  blender --background --factory-startup --python assets-src/spiral-landmarks/render.py -- [shot ...]

Reads spiral-landmarks.blend (run build.py first) and writes JPEGs to docs/designs/3d-pipeline/audits/spiral-landmarks/
(git-ignored). Positions below are in the game's axes (+Y up). As in the game, back faces are not drawn: a face
wound the wrong way shows as a hole. The sun, sky and the arrangement are stand-ins; only the kit pieces ship.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "docs/designs/3d-pipeline/audits/spiral-landmarks"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLOW = 3.0   # preview emissive strength: about what lifts the strip to the day bloom threshold


def blender(p):
    return Vector((p[0], -p[2], p[1]))


def place(scene, name, at=(0, 0, 0), yaw=0.0, scale=1.0):
    obj = bpy.data.objects.new(name, bpy.data.meshes[name])
    obj.matrix_world = Matrix.Translation(blender(at)) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Scale(scale, 4)
    scene.collection.objects.link(obj)


def spiral(scene, tower="tower"):
    """The tower with struts round three turns, the cloud sea, platforms, stations and peaks: the concept's wide shot."""
    place(scene, tower)
    for k in range(18):
        a = math.tau * k / 6
        place(scene, "strut", (210 * math.cos(a), -2 + 104 * k / 18, 210 * math.sin(a)), math.pi - a)
    clouds = ("cloud_a", "cloud_b", "cloud_c")
    for k in range(40):
        a, r = k * 2.4, 260 + 46 * k
        place(scene, clouds[k % 3], (r * math.cos(a), -150 + 18 * math.sin(k * 1.7), r * math.sin(a)), k * 0.9, 1.0 + 0.5 * (k % 4) / 3)
    place(scene, "platform_a", (150, 70, 230))
    place(scene, "platform_b", (-190, 40, 200), 0.5)
    place(scene, "platform_a", (-330, 150, -120))
    place(scene, "station", (70, -95, 120), 0.4)
    place(scene, "peak", (-1300, -230, -1500), 0.3, 1.6)
    place(scene, "peak", (1500, -250, -1700), 2.0, 1.3)


def lineup(*names, gap):
    def build(scene):
        for k, name in enumerate(names):
            place(scene, name, ((k - (len(names) - 1) / 2) * gap, 0, 0))
    return build


BIRD = ("bird_body", "bird_wing_l", "bird_wing_r")


def flock(scene):
    """Five birds in a V, seen from 30 m."""
    for k in range(5):
        for name in BIRD:
            place(scene, name, (2.6 * (k - 2), 0.3 * (k % 2), 2.2 * abs(k - 2)))


# shot -> (scene builder, eye, target, lens mm)
SHOTS = {
    "spiral": (spiral, (330, 95, 520), (0, 110, 0), 22),
    "spiral_far": (lambda scene: spiral(scene, "tower_far"), (700, 200, 1500), (0, 110, 0), 35),
    "tower_mid": (spiral, (95, 30, 185), (0, 55, 30), 28),
    "tower_crown": (spiral, (110, 330, 170), (0, 366, 0), 50),
    "tower_lods": (lineup("tower", "tower_far", gap=170), (0, 130, 760), (0, 130, 0), 35),
    "strut": (lineup("strut", gap=0), (45, 12, 70), (85, -10, 0), 28),
    "strut_below": (lineup("strut", gap=0), (20, -40, 45), (90, -8, 0), 28),
    "platform_a": (lineup("platform_a", gap=0), (48, 20, 62), (0, -2, 0), 35),
    "platform_b": (lineup("platform_b", gap=0), (44, 16, 60), (0, -1, 0), 35),
    "station": (lineup("station", gap=0), (26, 13, 34), (0, 4, 0), 35),
    "signs": (lineup("chevron_sign", "gap_marker", gap=6), (2.5, 3.2, 12), (0, 2.9, 0), 35),
    "clouds": (lineup("cloud_a", "cloud_b", "cloud_c", gap=470), (150, 190, 1000), (0, 20, 0), 35),
    "peak": (lineup("peak", gap=0), (420, 120, 720), (0, 110, 0), 35),
    "bird": (lineup(*BIRD, gap=0), (1.5, 1.1, -1.7), (0, 0, 0), 50),
    "bird_below": (lineup(*BIRD, gap=0), (-0.9, -1.6, -1.5), (0, 0, 0), 50),
    "bird_far": (flock, (14, -6, -26), (0, 0, 0), 50),
    "airship": (lineup("airship", gap=0), (46, 9, -50), (0, -1, 2), 35),
    "airship_below": (lineup("airship", gap=0), (-34, -22, 44), (0, -1, 2), 35),
}


def main():
    bpy.ops.wm.open_mainfile(filepath=str(HERE / "spiral-landmarks.blend"))
    scene = next(s for s in bpy.data.scenes if s.objects)   # opening a library file adds an empty scene beside it
    scene.render.engine = "CYCLES"
    scene.cycles.device, scene.cycles.samples, scene.cycles.max_bounces, scene.cycles.use_denoising = "CPU", 32, 4, True
    scene.cycles.transparent_max_bounces = 32
    render = scene.render
    render.resolution_x, render.resolution_y, render.resolution_percentage = 960, 540, 100
    render.image_settings.file_format, render.image_settings.quality = "JPEG", 90
    world = bpy.data.worlds.new("day")
    world.use_nodes = True
    background = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    background.inputs["Color"].default_value, background.inputs["Strength"].default_value = (0.22, 0.42, 0.85, 1), 1.0
    scene.world = world
    tree = bpy.data.materials["spiral_landmarks"].node_tree
    bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Emission Strength"].default_value = GLOW
    side, clear, mix = tree.nodes.new("ShaderNodeNewGeometry"), tree.nodes.new("ShaderNodeBsdfTransparent"), tree.nodes.new("ShaderNodeMixShader")
    tree.links.new(side.outputs["Backfacing"], mix.inputs[0])
    tree.links.new(bsdf.outputs[0], mix.inputs[1])
    tree.links.new(clear.outputs[0], mix.inputs[2])
    tree.links.new(mix.outputs[0], next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
    for mesh in bpy.data.meshes:
        mesh.use_fake_user = True   # the master's objects are cleared below; the meshes stay
    OUT.mkdir(parents=True, exist_ok=True)
    for shot in ARGS or list(SHOTS):
        build, eye, target, lens = SHOTS[shot]
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj)
        build(scene)
        sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
        sun.data.energy, sun.data.angle, sun.rotation_euler = 4.0, math.radians(1.5), (math.radians(52), 0, math.radians(35))
        scene.collection.objects.link(sun)
        camera = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
        camera.data.clip_start, camera.data.clip_end, camera.data.lens = 0.5, 20000, lens
        camera.location = blender(eye)
        camera.rotation_euler = (blender(target) - blender(eye)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(camera)
        scene.camera = camera
        render.filepath = str(OUT / f"{shot}.jpg")
        bpy.ops.render.render(write_still=True, scene=scene.name)
        print("rendered", shot, flush=True)


main()
