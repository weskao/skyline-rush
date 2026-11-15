"""Preview renders of the Neon landmark kit in context, each next to the concept frame it was read from.
The harbour and oldtown pieces have no concept frame: they render on wet ground beside car-sized boxes (one at
road level, one at the top of the flight band) into audits/neon-new-landmarks/.

  blender --background --factory-startup --python assets-src/neon-landmarks/render.py -- [--lod1] [shot ...]

Reads neon-landmarks.blend (run build.py first) and writes JPEGs to docs/designs/3d-pipeline/audits/neon-landmarks/
(git-ignored). Roads, decks, water and ground are plain stand-ins made here: only the kit pieces ship. Pieces are
placed the way asset-brief.md "Integration contract" says, curved shots on the route's tightest radius.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "docs/designs/3d-pipeline/audits/neon-landmarks"
OUT_NEW = ROOT / "docs/designs/3d-pipeline/audits/neon-new-landmarks"
FRAMES = ROOT / "docs/designs/3d-pipeline/concept-art/neon-downtown"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
LOD = 1 if "--lod1" in ARGS else 0
WIDTH, HEIGHT = 960, 540
TIGHTEST = 118.0   # metres: the smallest radius on the Neon route, the worst case for every repeated joint
CAR = (1.9, 4.4, 1.2)   # metres: width, length, height of a car; flying, its roof stops at 12 + 1.2 (FLIGHT_TOP)
GLOW = 3.0         # preview brightness of the emissive atlas; the runtime sets its own (asset-brief.md)


def route(radius=None):
    """Centre line: straight along +Y up to s = 0, then a right-hand arc. Returns s -> (point, yaw)."""
    def at(s):
        if radius is None or s <= 0:
            return Vector((0, s, 0)), 0.0
        a = s / radius
        return Vector((radius * (1 - math.cos(a)), radius * math.sin(a), 0)), -a
    return at


def sbend(radius=90.0, length=120.0):
    """Linked S-bends: the right-hand arc of route(radius) for `length` metres, then a left-hand arc."""
    right = route(radius)
    def at(s):
        if s <= length:
            return right(s)
        p, h = right(length)
        a = h + (s - length) / radius
        centre = p - radius * Vector((math.cos(h), math.sin(h), 0))
        return centre + radius * Vector((math.cos(a), math.sin(a), 0)), a
    return at


def frame(at, s, lateral=0.0, height=0.0, yaw=0.0):
    """Matrix of a pivot at distance s, `lateral` metres to the driver's right, turned `yaw` from the heading."""
    point, heading = at(s)
    return Matrix.Translation(point) @ Matrix.Rotation(heading, 4, "Z") @ Matrix.Translation((lateral, 0, height)) @ Matrix.Rotation(yaw, 4, "Z")


def place(scene, piece, matrix):
    obj = bpy.data.objects.new(piece, bpy.data.meshes[f"{piece}_lod{LOD}"])
    obj.matrix_world = matrix
    scene.collection.objects.link(obj)


def ribbon(scene, material, at, s0, s1, half, top=0.0, depth=1.5):
    """Stand-in slab along the centre line: road deck, ground or water."""
    bm = bmesh.new()
    n = max(1, int((s1 - s0) / 3))
    rows = [[bm.verts.new(frame(at, s0 + (s1 - s0) * i / n, x, top).translation) for x in (-half, half)] for i in range(n + 1)]
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    mesh = bpy.data.meshes.new("standin")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    obj = bpy.data.objects.new("standin", mesh)
    scene.collection.objects.link(obj)
    solid = obj.modifiers.new("depth", "SOLIDIFY")
    solid.thickness, solid.offset = depth, -1


def block(scene, material, matrix, size):
    """Stand-in box, size = (across, along, up), standing on the matrix origin: a car, a quay, a low building."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1, matrix=matrix @ Matrix.Translation((0, 0, size[2] / 2)) @ Matrix.Diagonal((*size, 1)))
    mesh = bpy.data.meshes.new("standin")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    scene.collection.objects.link(bpy.data.objects.new("standin", mesh))


def cars(scene, mats, at, s):
    block(scene, mats["car"], frame(at, s - 30, 4), CAR)
    block(scene, mats["car"], frame(at, s - 4, -4, 12.0), CAR)


def side_modules(scene, piece, at, s0, s1, radius=None, offset=13.2):
    """A 12 m side module on both sides, one per 12 m of its own offset line (the inside line of a curve is shorter)."""
    for side in (1, -1):
        scale = 1.0 if radius is None else radius / (radius - side * offset)
        for k in range(int(s0 // 12), int(s1 // 12)):
            s = 6 + 12 * k
            place(scene, piece, frame(at, s * scale if s > 0 else s, side * offset, yaw=0 if side > 0 else math.pi))


def underpass(scene, mats):
    at, start = route(TIGHTEST), 30.0   # tunnel mouth 30 m into the corner
    ribbon(scene, mats["road"], at, -90, 330, 12.7)
    ribbon(scene, mats["ground"], at, -90, 330, 120, top=-0.3)
    place(scene, "rail_portal", frame(at, start + 8))
    for k in range(16):
        place(scene, "rail_segment", frame(at, start + 21.875 + 11.75 * k))
    place(scene, "rail_portal", frame(at, start + 212, yaw=math.pi))
    return at


def expressway(scene, mats):
    at = route(TIGHTEST)
    ribbon(scene, mats["road"], at, -72, 264, 12.5)
    ribbon(scene, mats["ground"], at, -72, 264, 200, top=-16)
    side_modules(scene, "expressway_rail", at, -72, 264, TIGHTEST)
    for s in range(-72, 265, 36):
        place(scene, "expressway_pier", frame(at, s))
    return at


def arch(scene, mats):
    at = route()
    ribbon(scene, mats["road"], at, -300, 300, 13.6, depth=2.0)
    ribbon(scene, mats["water"], at, -62, 62, 300, top=-6, depth=0.2)
    for s0, s1 in ((-300, -61.5), (61.5, 300)):
        ribbon(scene, mats["ground"], at, s0, s1, 300, top=-0.4, depth=8)
    place(scene, "canal_arch", frame(at, 0))
    side_modules(scene, "canal_bridge_rail", at, -72, 72)
    for y, turn in ((-58, 1), (58, -1)):               # +X of the bank faces the water
        for k in range(8):
            for x in (26 + 12 * k, -26 - 12 * k):
                place(scene, "canal_bank", Matrix.Translation((x, y, 0)) @ Matrix.Rotation(turn * math.pi / 2, 4, "Z"))
    return at


def plaza(scene, mats):
    at = route()
    ribbon(scene, mats["road"], at, -200, 200, 12.7)
    ribbon(scene, mats["ground"], at, -200, 200, 200, top=-0.02)
    place(scene, "plaza_sculpture", frame(at, 0, -30))
    return at


def footbridge(scene, mats):
    at = route()
    ribbon(scene, mats["road"], at, -200, 500, 12.7)
    ribbon(scene, mats["ground"], at, -200, 500, 200, top=-0.2)
    for s in (0, 180):
        place(scene, "boulevard_footbridge", frame(at, s))
    return at


def harbour(scene, mats):
    """Waterfront NITRO straight: the road on water, the quay and its containers on the left, the ship on the right."""
    at = route()
    ribbon(scene, mats["wet"], at, -250, 900, 12.7, depth=2.0)
    ribbon(scene, mats["water"], at, -250, 900, 400, top=-4, depth=0.2)
    block(scene, mats["wet"], frame(at, -250, -70, -4), (110, 2300, 4))   # quay, near edge 15 m left of the centre line
    for k, s in enumerate(range(-150, 860, 30)):
        place(scene, "container_stack", frame(at, s, -25, yaw=math.pi * (k % 2)))
    for s in (0, 260, 520):
        place(scene, "harbour_gantry", frame(at, s))
    place(scene, "cargo_ship", frame(at, 260, 40))
    cars(scene, mats, at, 0)
    return at


def oldtown(scene, mats):
    """Linked S-bends between low buildings: the gate at the entry, a lantern span per 24 m, the tower inside bend 1."""
    at = sbend()
    ribbon(scene, mats["wet"], at, -150, 330, 12.7)
    ribbon(scene, mats["wet"], at, -150, 330, 150, top=-0.05)
    rng = np.random.default_rng(7)
    for s in range(-120, 320, 16):
        for side in (1, -1):
            if side > 0 and 20 < s < 100:
                continue   # the tower's square
            block(scene, mats["plaster"], frame(at, s, side * 25), (12, 14, float(rng.uniform(8, 14))))
    place(scene, "oldtown_gate", frame(at, -40))
    for s in range(-10, 320, 24):
        place(scene, "lantern_span", frame(at, s))
    place(scene, "clock_tower", frame(at, 60, 50))
    cars(scene, mats, at, -40)
    return at


# shot -> (scene builder, concept frame, views). A view = name, eye and target as (s, lateral, height), lens mm.
# The first view of a shot is the one matched to the frame and goes on the comparison sheet.
SHOTS = {
    "underpass": (underpass, "04-rail-underpass.jpg", [
        ("mouth", (-2, -1, 1.8), (38, 0, 4.6), 22), ("inside", (62, 3, 1.6), (112, 0, 2.6), 20), ("above", (-20, -70, 45), (110, 0, 0), 28)]),
    "expressway": (expressway, "06-elevated-expressway.jpg", [
        ("deck", (-30, -9, 7.0), (70, 4, 0), 24), ("below", (30, -70, -9), (120, 0, -5), 28)]),
    "arch": (arch, "07-canal-arch-bridge.jpg", [
        ("bank", (-120, 75, 9), (0, 0, 13), 24), ("deck", (-100, -3, 2.2), (0, 0, 15), 20)]),
    "plaza": (plaza, "08-violet-plaza-return.jpg", [
        ("road", (-24, -8, 2.0), (0, -30, 6.5), 24), ("near", (-20, -16, 1.7), (0, -30, 7), 28)]),
    "footbridge": (footbridge, "03-start-finish-boulevard.jpg", [
        ("grid", (-75, 0, 2.2), (0, 0, 9), 24), ("side", (-45, -45, 9), (0, 0, 11), 28)]),
    "harbour": (harbour, None, [
        ("approach", (-120, 3, 2.2), (100, 0, 12), 24), ("crane", (-35, -9, 3), (0, 0, 16), 20),
        ("side", (-60, -130, 35), (260, 10, 8), 24), ("ship", (180, 95, 12), (260, 40, 10), 28),
        ("stack", (-40, -2, 3), (-10, -20, 6), 24)]),
    "oldtown": (oldtown, None, [
        ("gate", (-110, 2, 2.2), (-40, 0, 10), 24), ("bends", (-90, -50, 40), (120, 0, 5), 22),
        ("tower", (20, 5, 3), (60, 50, 25), 24), ("lanterns", (30, -3, 2), (90, 0, 9), 22)]),
}


def flat(name, color, rough):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value, bsdf.inputs["Roughness"].default_value = (*color, 1), rough
    return mat


def pixels(path):
    image = bpy.data.images.load(str(path))
    image.scale(round(image.size[0] * HEIGHT / image.size[1]), HEIGHT)
    data = np.zeros(image.size[0] * HEIGHT * 4, np.float32)
    image.pixels.foreach_get(data)
    bpy.data.images.remove(image)
    return data.reshape(HEIGHT, -1, 4)


def sheet(reference, render, out):
    """Concept frame on the left, render on the right, same height."""
    both = np.concatenate([pixels(reference), pixels(render)], axis=1)
    image = bpy.data.images.new("sheet", both.shape[1], HEIGHT, alpha=False)
    image.pixels.foreach_set(both.ravel())
    image.filepath_raw, image.file_format = str(out), "JPEG"
    image.save(quality=88)
    bpy.data.images.remove(image)


def main():
    bpy.ops.wm.open_mainfile(filepath=str(HERE / "neon-landmarks.blend"))
    scene = next(s for s in bpy.data.scenes if s.objects)   # opening a library file adds an empty scene beside it
    scene.cycles.samples, scene.cycles.max_bounces, scene.view_settings.exposure = 32, 4, 2.0   # CPU, denoised
    render = scene.render
    render.resolution_x, render.resolution_y, render.resolution_percentage = WIDTH, HEIGHT, 100
    render.image_settings.file_format, render.image_settings.quality = "JPEG", 90
    background = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
    background.inputs["Color"].default_value = (0.02, 0.025, 0.06, 1)   # night sky: enough to read the unlit forms
    # as in the game, the emissive atlas glows and reflects but lights nothing: its lamp light is already baked in
    tree = bpy.data.materials["neon_landmarks"].node_tree
    path, glow = tree.nodes.new("ShaderNodeLightPath"), tree.nodes.new("ShaderNodeMath")
    glow.operation, glow.inputs[0].default_value, glow.inputs[2].default_value = "MULTIPLY_ADD", -GLOW, GLOW
    tree.links.new(path.outputs["Is Diffuse Ray"], glow.inputs[1])
    tree.links.new(glow.outputs[0], next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Emission Strength"])
    mats = dict(road=flat("road", (0.02, 0.02, 0.025), 0.22), ground=flat("ground", (0.03, 0.03, 0.035), 0.5),
                water=flat("water", (0.01, 0.015, 0.02), 0.04), wet=flat("wet", (0.015, 0.015, 0.02), 0.06),
                car=flat("car", (0.5, 0.5, 0.52), 0.4), plaster=flat("plaster", (0.06, 0.05, 0.045), 0.7))
    for mesh in bpy.data.meshes:
        mesh.use_fake_user = True   # the pivots and LOD objects of the master are cleared below; the meshes stay
    OUT.mkdir(parents=True, exist_ok=True)
    OUT_NEW.mkdir(parents=True, exist_ok=True)
    wanted = [a for a in ARGS if not a.startswith("--")] or list(SHOTS)
    suffix = "_lod1" if LOD else ""
    for shot in wanted:
        build, reference, views = SHOTS[shot]
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj)
        at = build(scene, mats)
        moon = bpy.data.objects.new("moon", bpy.data.lights.new("moon", "SUN"))
        moon.data.energy, moon.data.color, moon.rotation_euler = 0.2, (0.6, 0.7, 1.0), (math.radians(50), 0, math.radians(-40))
        scene.collection.objects.link(moon)
        camera = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
        camera.data.clip_end = 3000
        scene.collection.objects.link(camera)
        scene.camera = camera
        for index, (view, eye, target, lens) in enumerate(views):
            eye, target = frame(at, *eye).translation, frame(at, *target).translation
            camera.location, camera.data.lens = eye, lens
            camera.rotation_euler = (target - eye).to_track_quat("-Z", "Y").to_euler()
            render.filepath = str((OUT if reference else OUT_NEW) / f"{shot}_{view}{suffix}.jpg")
            bpy.ops.render.render(write_still=True, scene=scene.name)
            if index == 0 and reference:
                sheet(FRAMES / reference, render.filepath, OUT / f"{shot}_vs_frame{suffix}.jpg")
            print("rendered", shot, view, flush=True)


main()
