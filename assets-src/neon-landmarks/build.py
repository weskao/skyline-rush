"""Builds the Neon Downtown landmark kit (Task 5b steps 6 and 7, and the harbour and oldtown sectors of the 10 km
lap): fifteen modelled pieces, two LODs each, one
material on three baked atlases. Everything is made here; there is no outside source.

  blender --background --factory-startup --python assets-src/neon-landmarks/build.py

Writes neon-landmarks.blend, textures/ and contract.json next to this file. The pieces are authored in
build/pieces.py as halves or quarters; this script lays them out 300 m apart, packs one atlas, bakes the
procedural surfaces (build/materials.py), the lamp light they throw on each other and the occlusion, and
only then unfolds the mirrored halves, so both halves share texels.
"""
import json
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "build"))
from geo import keep_faces, lod_mesh, mirror_and_triangulate  # noqa: E402
from materials import MATS, delivery_material, show_channel, source_material  # noqa: E402
from pieces import CLEAR_HALF, CLEAR_HEIGHT, MODULE, PIECES, build_half  # noqa: E402
from sectors import PORTAL  # noqa: E402

SIZE = 2048          # base colour and emissive atlas; the occlusion-roughness-metal atlas is half that
STATION = 300.0      # spacing of the pieces while baking: no light or shadow crosses from one to the next
SWATCH_ROW = 0.965   # the atlas above this v holds one flat cell per material (thin bars, rails, lamps)
CELLS = 32
SPILL_PEAK = 0.4     # brightest lamp light on a neighbouring surface, as a fraction of the lamp itself
SPILL_GAMMA = 0.6    # below 1 lifts the dim end of the lamp light: a tone curve for the baked light, set by eye

# Where each piece goes. Distances are metres along the lap of the fixed 4000 m route (Task 5b); `clear` is the
# box the piece keeps empty around the road centre line: half width and height, metres.
PLACEMENT = {
    "rail_portal": dict(kind="span", budget_triangles=[1400, 600], sector="rail underpass", range_m=[470, 690], clear=[CLEAR_HALF, CLEAR_HEIGHT],
                        place="2: pivot 8 m inside each end of the tunnel section (478 and 682). Entry: yaw = road heading. Exit: heading + 180 deg."),
    "rail_segment": dict(kind="span", budget_triangles=[300, 300], sector="rail underpass", range_m=[486, 674], clear=[CLEAR_HALF, CLEAR_HEIGHT], repeat_m=11.75,
                         place="16: pivots at 491.875 + 11.75 k, yaw = road heading at the pivot. Any step from 11.2 to 12 m closes."),
    "expressway_pier": dict(kind="span", budget_triangles=[250, 250], sector="elevated expressway", range_m=[1657, 2330], repeat_m=36.0,
                            place="every 36 m, pivot on the centre line at road level; the pier hangs below it"),
    "expressway_rail": dict(kind="side", budget_triangles=[300, 250], sector="elevated expressway", range_m=[1657, 2330], repeat_m=MODULE, offset_m=13.2,
                            place="both sides, 13.2 m from the centre line, one per 12 m of the rail's own line; right side yaw = heading, left side heading + 180 deg"),
    "canal_arch": dict(kind="span", budget_triangles=[4500, 3500], sector="canal arch bridge", range_m=[2330, 2986], clear=[13.5, 14.0],
                       place="1: pivot at mid-span on the centre line, 2658 m; spans 2598 to 2718, blocks and deck to +/-66.5 m"),
    "canal_bridge_rail": dict(kind="side", budget_triangles=[300, 200], sector="canal arch bridge", range_m=[2330, 2986], repeat_m=MODULE, offset_m=13.2,
                              place="both sides, 13.2 m from the centre line, one per 12 m; right side yaw = heading, left side heading + 180 deg"),
    "canal_bank": dict(kind="side", budget_triangles=[250, 150], sector="canal arch bridge", range_m=[2330, 2986], repeat_m=MODULE,
                       place="along each canal bank, one per 12 m, local +X toward the water, pivot at promenade level"),
    "plaza_sculpture": dict(kind="side", budget_triangles=[900, 900], sector="Violet Plaza", range_m=[3200, 3607],
                            place="1: pivot at plaza ground level, 30 m or more left of the centre line near 3400 m"),
    "boulevard_footbridge": dict(kind="span", budget_triangles=[900, 450], sector="start-finish boulevard", range_m=[0, 443], clear=[CLEAR_HALF, 14.0],
                                 place="2: pivot on the centre line, about 150 m and 330 m (the second also covers the 3886 to 4000 approach)"),
    # 10 km lap (2026-11-15): modelled, not placed yet (src/model-manifest-neon.ts NEON_LANDMARKS_NOT_PLACED). No lap
    # distances: the route is being built elsewhere. Footprints and spacing: asset-brief.md "Placement note".
    "harbour_gantry": dict(kind="span", budget_triangles=[1400, 1000], sector="harbour", clear=[15.5, PORTAL - 1.0], spacing_m=260,
                           place="3 down the NITRO straight, 260 m apart (2.2 s at 118 m/s), pivot on the centre line at road level, yaw = heading: "
                                 "the boom reaches out over +X (the water); heading + 180 deg if the water is on the left. Rail beams reach -8 m."),
    "container_stack": dict(kind="side", budget_triangles=[300, 300], sector="harbour", offset_m=25.0, spacing_m=30,
                            place="land side of the straight, pivot 25 m from the centre line (near face 20 m, clear of the gantry legs at 17.9 m), one per 30 m (5.7 m lanes), "
                                  "yaw alternately heading and heading + 180 deg so the stepped tops do not repeat"),
    "cargo_ship": dict(kind="side", budget_triangles=[2000, 1200], sector="harbour", offset_m=40.0,
                       place="1: water side, centre line of the ship 40 m from the road's (under a gantry's boom), pivot at the waterline, "
                             "yaw = heading or heading + 180 deg; 150 m long"),
    "oldtown_gate": dict(kind="span", budget_triangles=[1100, 700], sector="oldtown", clear=[14.0, 15.0],
                         place="1: the sector entry, just after the canal bridge, pivot on the centre line at road level, yaw = heading"),
    "lantern_span": dict(kind="span", budget_triangles=[1100, 500], sector="oldtown", clear=[14.0, 14.0], spacing_m=24,
                         place="through the S-bends, one per 24 m, pivot on the centre line at road level, yaw = heading at the pivot"),
    "clock_tower": dict(kind="side", budget_triangles=[1000, 700], sector="oldtown", offset_m=45.0,
                        place="1: inside of an S-bend, 45 m or more from the centre line, ground level; 50.5 m tall, it reads above the roofs"),
}


def start_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"   # the same texels on every machine; the whole bake takes a few minutes
    scene.cycles.seed = 0
    scene.cycles.use_denoising = True
    scene.unit_settings.system = "METRIC"
    world = bpy.data.worlds.new("bake_black")
    world.use_nodes = True
    next(n for n in world.node_tree.nodes if n.type == "BACKGROUND").inputs["Color"].default_value = (0, 0, 0, 1)
    world.light_settings.distance = 6.0   # occlusion reach, metres
    scene.world = world
    return scene


def add_object(scene, name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return obj


def build_kit(scene, sources):
    """Every authored half in one mesh, piece i at x = i * STATION, tagged with its `piece` index."""
    bm = bmesh.new()
    for index, name in enumerate(PIECES):
        half = bpy.data.meshes.new("half")
        build_half(name).to_mesh(half)
        half.attributes.new("piece", "INT", "FACE").data.foreach_set("value", [index] * len(half.polygons))
        half.transform(Matrix.Translation((index * STATION, 0, 0)))
        bm.from_mesh(half)
        bpy.data.meshes.remove(half)
    mesh = bpy.data.meshes.new("kit")
    bm.to_mesh(mesh)
    bm.free()
    for material in sources:
        mesh.materials.append(material)
    return add_object(scene, "kit", mesh)


def face_values(mesh, name):
    values = np.zeros(len(mesh.polygons), np.int32)
    mesh.attributes[name].data.foreach_get("value", values)
    return values


def pack_atlas(kit):
    """One shared pack of the unique-UV islands into the atlas below SWATCH_ROW; swatch faces go to their cell."""
    mesh = kit.data
    swatch = face_values(mesh, "swatch").astype(bool)
    mesh.polygons.foreach_set("hide", swatch)
    bpy.context.view_layer.objects.active = kit
    kit.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(rotate=True, margin_method="FRACTION", margin=0.004, shape_method="AABB")
    bpy.ops.mesh.reveal()
    bpy.ops.object.mode_set(mode="OBJECT")
    loops = np.zeros(len(mesh.loops) * 2, np.float32)
    mesh.uv_layers[0].data.foreach_get("uv", loops)
    uv = loops.reshape(-1, 2)
    counts = np.zeros(len(mesh.polygons), np.int32)
    mesh.polygons.foreach_get("loop_total", counts)
    materials = np.zeros(len(mesh.polygons), np.int32)
    mesh.polygons.foreach_get("material_index", materials)
    on_swatch = np.repeat(swatch, counts)
    packed = uv[~on_swatch]
    assert packed.min() >= 0 and packed.max() <= 1, f"the atlas pack left UVs outside 0..1: {packed.min()} .. {packed.max()}"
    uv[~on_swatch, 1] *= SWATCH_ROW - 0.005
    uv[on_swatch, 0] = (np.repeat(materials, counts)[on_swatch] + 0.5) / CELLS
    uv[on_swatch, 1] = (SWATCH_ROW + 1) / 2
    mesh.uv_layers[0].data.foreach_set("uv", uv.ravel())


def bake(scene, kit, rigs, channel, size, samples, kind="EMIT", **options):
    image = bpy.data.images.new("bake_" + channel, size, size, alpha=False, float_buffer=True, is_data=True)
    for slot, rig in zip(kit.material_slots, rigs):
        show_channel(slot.material, rig, channel if channel != "ao" else "mask", image)
    scene.cycles.samples = samples
    started = time.perf_counter()
    bpy.ops.object.bake(type=kind, margin=0, use_clear=True, **options)
    print(f"baked {channel} at {size} px in {time.perf_counter() - started:.0f} s", flush=True)
    pixels = np.zeros(size * size * 4, np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(size, size, 4)[..., :3]


def dilate(channels, covered, steps=16):
    """Grow every island outward into the gutter so mip levels do not pull black in; the rest takes the mean."""
    covered = covered.copy()
    for _ in range(steps):
        total, count = np.zeros_like(channels), np.zeros(covered.shape, np.float32)
        for axis, shift in ((0, 1), (0, -1), (1, 1), (1, -1)):
            total += np.roll(channels * covered[..., None], shift, axis)
            count += np.roll(covered, shift, axis)
        new = (count > 0) & ~covered
        channels[new] = total[new] / count[new][:, None]
        covered |= new
    channels[~covered] = channels[covered].mean(axis=0)
    return channels


def smooth(channels, covered, radius=2):
    """Box blur that only averages texels of islands: neither the gutter nor a neighbour bleeds in."""
    total, count = channels * covered[..., None], covered.astype(np.float32)
    for axis in (0, 1):
        total = sum(np.roll(total, shift, axis) for shift in range(-radius, radius + 1))
        count = sum(np.roll(count, shift, axis) for shift in range(-radius, radius + 1))
    return total / np.maximum(count, 1)[..., None] * covered[..., None]


def encode_srgb(linear):
    linear = np.clip(linear, 0, 1)
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - 0.055)


def save_texture(name, rgb, colorspace, file_format):
    """8-bit file under textures/. The values are written as given: sRGB maps are encoded by the caller."""
    size = rgb.shape[0]
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.colorspace_settings.name = colorspace
    pixels = np.ones((size, size, 4), np.float32)
    pixels[..., :3] = np.clip(rgb, 0, 1)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(HERE / "textures" / f"{name}.{'jpg' if file_format == 'JPEG' else 'png'}")
    image.file_format = file_format
    image.save(quality=92)
    return image


def bake_atlases(scene, kit, rigs):
    """Bakes the kit and returns the three delivery images."""
    kit.select_set(True)
    bpy.context.view_layer.objects.active = kit
    covered = bake(scene, kit, rigs, "mask", SIZE, 1)[..., 0] > 0.5
    albedo = bake(scene, kit, rigs, "color", SIZE, 8)
    rough = bake(scene, kit, rigs, "rough", SIZE, 4)[..., :1]
    metal = bake(scene, kit, rigs, "metal", SIZE, 1)[..., :1]
    emit = bake(scene, kit, rigs, "emit", SIZE, 4)
    occlusion = bake(scene, kit, rigs, "ao", SIZE, 64, kind="AO")[..., :1]
    spill = bake(scene, kit, rigs, "spill", SIZE // 2, 256, kind="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"})
    # smoothed and padded at its own half size first: lamp light is soft, sampling noise is not, and an island's
    # edge texels are only part covered there
    half_covered = bake(scene, kit, rigs, "mask", SIZE // 2, 1)[..., 0] > 0.5
    spill = dilate(smooth(spill, half_covered), half_covered, steps=3)
    spill = albedo * spill.repeat(2, axis=0).repeat(2, axis=1)
    level = spill.max(axis=2, keepdims=True)
    lit = level[..., 0][covered]
    # one exposure for all nine pieces leaves the underpass walls black beside the plinth ring: compress the range,
    # keeping each texel's hue. The floor returns the residual noise to 0, since the runtime multiplies the atlas.
    target = SPILL_PEAK * (level / np.percentile(lit[lit > 0], 99.5)) ** SPILL_GAMMA
    spill *= np.clip(target - 0.02, 0, 0.6) / np.maximum(level, 1e-9)
    maps = dilate(np.concatenate([albedo * (0.6 + 0.4 * occlusion), emit + spill, occlusion, rough, metal], axis=2), covered)
    row = int(SWATCH_ROW * SIZE)
    for cell, spec in enumerate(MATS.values()):   # the flat cells: exact values, no bake noise
        lamp = spec["color"] if spec.get("emit") else (0, 0, 0)
        maps[row:, cell * SIZE // CELLS:(cell + 1) * SIZE // CELLS] = (*spec["color"], *lamp, 1, spec["rough"], spec["metal"])
    orm = maps[..., 6:9].reshape(SIZE // 2, 2, SIZE // 2, 2, 3).mean(axis=(1, 3))
    return (save_texture("neon_landmarks_basecolor", encode_srgb(maps[..., 0:3]), "sRGB", "JPEG"),
            save_texture("neon_landmarks_emissive", encode_srgb(maps[..., 3:6]), "sRGB", "PNG"),   # JPEG speckles the black
            save_texture("neon_landmarks_orm", orm, "Non-Color", "PNG"))


def measure(mesh):
    """Triangles and bounds in the delivered axes (x right, y up, z = minus the driving direction)."""
    co = np.zeros(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    lo, hi = co.min(axis=0), co.max(axis=0)
    box = lambda a, b, c: [round(float(v), 2) for v in (a, b, c)]
    return dict(triangles=len(mesh.polygons), min=box(lo[0], lo[2], -hi[1]), max=box(hi[0], hi[2], -lo[1]))


def main():
    scene = start_scene()
    sources, rigs = zip(*(source_material(name) for name in MATS))
    kit = build_kit(scene, sources)
    pack_atlas(kit)
    full = {}
    occluder = bmesh.new()
    for index, name in enumerate(PIECES):
        mesh = keep_faces(kit.data, name, lambda f, ints, index=index: f[ints["piece"]] == index)
        mesh.transform(Matrix.Translation((-index * STATION, 0, 0)))
        mirror_and_triangulate(mesh)
        full[name] = mesh
        copies = keep_faces(mesh, "copies", lambda f, ints: f[ints["copy"]] == 1)
        copies.transform(Matrix.Translation((index * STATION, 0, 0)))
        occluder.from_mesh(copies)
        bpy.data.meshes.remove(copies)
    other_half = bpy.data.meshes.new("other_half")
    occluder.to_mesh(other_half)
    occluder.free()
    for material in sources:
        other_half.materials.append(material)
    shade = add_object(scene, "other_half", other_half)   # lights and shadows the authored half; never baked itself
    material = delivery_material(*bake_atlases(scene, kit, rigs))

    contract, names = {}, list(MATS)
    for obj in (kit, shade):
        bpy.data.objects.remove(obj)
    for name, mesh in full.items():
        pivot = bpy.data.objects.new(name, None)
        pivot.empty_display_size = 2
        scene.collection.objects.link(pivot)
        used = np.zeros(len(mesh.polygons), np.int32)
        mesh.polygons.foreach_get("material_index", used)
        lamps = [lamp for lamp in names if MATS[lamp].get("emit") and names.index(lamp) in set(used.tolist())]
        entry = contract[name] = dict(PLACEMENT[name], pivot=name, lamps=lamps, lods={})
        for lod in (0, 1):
            data = lod_mesh(mesh, lod, f"{name}_lod{lod}")
            data.materials.clear()
            data.materials.append(material)
            data.polygons.foreach_set("material_index", [0] * len(data.polygons))
            add_object(scene, data.name, data).parent = pivot
            entry["lods"][data.name] = measure(data)
            assert len(data.polygons) <= entry["budget_triangles"][lod], f"{data.name}: {len(data.polygons)} triangles is over budget"
    (HERE / "contract.json").write_text(json.dumps(dict(
        glb="public/models/neon-landmarks/neon-landmarks.glb", material="neon_landmarks",
        axes="Y up, metres, -Z = driving direction, +X = driver's right",
        lamps={lamp: [round(float(c), 2) for c in encode_srgb(np.array(spec["color"]))] for lamp, spec in MATS.items() if spec.get("emit")},
        pieces=contract), indent=2) + "\n", encoding="utf-8")
    for line in (f"{name}: " + ", ".join(f"{lod} {m['triangles']} tris" for lod, m in entry["lods"].items()) for name, entry in contract.items()):
        print(line)
    # libraries.write keeps the file free of UI state and of the absolute paths a normal save records
    path = str(HERE / "neon-landmarks.blend")
    bpy.data.libraries.write(path, {scene}, path_remap="RELATIVE", compress=False)
    print("saved", Path(path).name)


main()
