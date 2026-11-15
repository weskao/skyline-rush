"""Builds the Neon Downtown landmark kit: fifteen modelled pieces, two LODs each, in two atlas sets.

  python3 -I assets-src/neon-landmarks/fetch_sources.py   (once: the CC0 scans of the second set, outside the repo)
  blender --background --factory-startup --python assets-src/neon-landmarks/build.py

Kit `neon_landmarks`: the nine pieces of the 4000 m lap (Task 5b steps 6 and 7, build/pieces.py), procedural
surfaces (build/materials.py), three atlases. Kit `neon_landmarks_sectors`: the harbour and oldtown pieces of the
10 km lap (build/harbour.py, build/oldtown.py), Poly Haven CC0 scans plus procedural layers
(build/sector_materials.py), four atlases with a tangent-space normal map. One material per kit; every piece draws
with one of them.

Writes neon-landmarks.blend, textures/ and contract.json next to this file. Pieces are authored as halves or
quarters; per kit this script lays them out 300 m apart, packs one atlas, bakes the surfaces, the lamp light they
throw on each other and the occlusion, and only then unfolds the mirrored halves, so both halves share texels. The
first kit bakes alone, exactly as before the second existed, so its atlases do not change.
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
import materials  # noqa: E402
import sector_materials  # noqa: E402
from geo import Builder, keep_faces, lod_mesh, mirror_and_triangulate  # noqa: E402
from harbour import PORTAL, cargo_ship, container_stack, harbour_gantry  # noqa: E402
from oldtown import clock_tower, lantern_span, oldtown_gate  # noqa: E402
from pieces import CLEAR_HALF, CLEAR_HEIGHT, MODULE, PIECES, build_half  # noqa: E402

SIZE = 2048          # base colour and emissive atlas; the occlusion-roughness-metal atlas is half that
STATION = 300.0      # spacing of the pieces while baking: no light or shadow crosses from one to the next
SWATCH_ROW = 0.965   # the atlas above this v holds one flat cell per material (thin bars, rails, lamps)
CELLS = 32
SPILL_PEAK = 0.4     # brightest lamp light on a neighbouring surface, as a fraction of the lamp itself
SPILL_GAMMA = 0.6    # below 1 lifts the dim end of the lamp light: a tone curve for the baked light, set by eye
GAME_EMISSIVE = 1.5      # src/neon-scenery.ts EMISSIVE.landmarks: the runtime multiplies the emissive atlas by it
BLOOM_THRESHOLD = 0.9    # src/coast-lighting.ts nightRain bloom threshold, the lowest of the Neon grades

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
    # Budgets (2026-11-15 look-dev pass): a once-placed hero (ship, gate, tower) or a piece placed three times (gantry)
    # may spend up to 6000 triangles near; one repeated 30 to 40 times (containers, lanterns) 1500. Far LODs keep at
    # most 40 % of the near one: the outline and the lamps, no rails, rods or rivets.
    "harbour_gantry": dict(kind="span", budget_triangles=[6000, 2400], sector="harbour", clear=[15.5, PORTAL - 1.0], spacing_m=260,
                           place="3 down the NITRO straight, 260 m apart (2.2 s at 118 m/s), pivot on the centre line at road level, yaw = heading: "
                                 "the boom reaches out over +X (the water); heading + 180 deg if the water is on the left. Rail beams reach -8 m; "
                                 "the stair tower stands on the land side (-X) to 21.4 m from the centre line, between the legs."),
    "container_stack": dict(kind="side", budget_triangles=[1500, 600], sector="harbour", offset_m=27.0, spacing_m=30,
                            place="land side of the straight, pivot 27 m from the centre line (near face 22 m, clear of the gantry stair tower at 21.4 m), "
                                  "one per 30 m (5.7 m lanes), yaw alternately heading and heading + 180 deg so the stepped tops do not repeat"),
    "cargo_ship": dict(kind="side", budget_triangles=[6000, 2400], sector="harbour", offset_m=40.0,
                       place="1: water side, centre line of the ship 40 m from the road's (under a gantry's boom), pivot at the waterline, "
                             "yaw = heading or heading + 180 deg; 150 m long"),
    "oldtown_gate": dict(kind="span", budget_triangles=[6000, 2400], sector="oldtown", clear=[14.0, 15.0],
                         place="1: the sector entry, just after the canal bridge, pivot on the centre line at road level, yaw = heading; "
                               "plinths reach 18.6 m from the centre line"),
    "lantern_span": dict(kind="span", budget_triangles=[1500, 600], sector="oldtown", clear=[14.0, 14.0], spacing_m=24,
                         place="through the S-bends, one per 24 m, pivot on the centre line at road level, yaw = heading at the pivot"),
    "clock_tower": dict(kind="side", budget_triangles=[6000, 2400], sector="oldtown", offset_m=45.0,
                        place="1: inside of an S-bend, 45 m or more from the centre line, ground level; 50.5 m tall, it reads above the roofs"),
}

SECTORS = {   # name -> (builder, mirror axes), in station order
    "harbour_gantry": (harbour_gantry, "y"), "container_stack": (container_stack, ""), "cargo_ship": (cargo_ship, "x"),
    "oldtown_gate": (oldtown_gate, "x"), "lantern_span": (lantern_span, "x"), "clock_tower": (clock_tower, "xy"),
}


def build_sector(name):
    make, mirror = SECTORS[name]
    b = Builder(name, list(sector_materials.MATS), mirror, world_uv=True)
    make(b)
    return b


# The two atlas sets. `swatch` gives a flat cell's (base colour, emissive); `levels` = the share of each lamp colour
# the atlas stores (the first kit stores lamps at full value).
KITS = (
    dict(material="neon_landmarks", pieces=list(PIECES), build=build_half, mats=materials.MATS, module=materials, normal=False,
         swatch=lambda spec: (spec["color"], spec["color"] if spec.get("emit") else (0, 0, 0)), levels=False),
    dict(material="neon_landmarks_sectors", pieces=list(SECTORS), build=build_sector, mats=sector_materials.MATS, module=sector_materials,
         normal=True, levels=True, half_emissive=True,   # its lamp spill is baked at half size anyway; keeps the GLB under 4 MB
         swatch=lambda spec: (spec["flat"], tuple(c * spec["level"] for c in spec["color"]) if spec.get("level") else (0, 0, 0))),
)


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


def build_kit(scene, sources, spec):
    """Every authored half of one kit in one mesh, piece i at x = i * STATION, tagged with its `piece` index."""
    bm = bmesh.new()
    for index, name in enumerate(spec["pieces"]):
        half = bpy.data.meshes.new("half")
        spec["build"](name).to_mesh(half)
        half.attributes.new("piece", "INT", "FACE").data.foreach_set("value", [index] * len(half.polygons))
        half.transform(Matrix.Translation((index * STATION, 0, 0)))
        bm.from_mesh(half)
        bpy.data.meshes.remove(half)
    mesh = bpy.data.meshes.new("kit")
    bm.to_mesh(mesh)
    bm.free()
    atlas = mesh.uv_layers["UVMap"]   # the pack and every bake write through it; "world" only samples the scans
    mesh.uv_layers.active, atlas.active_render = atlas, True
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
    mesh.uv_layers["UVMap"].data.foreach_get("uv", loops)
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
    mesh.uv_layers["UVMap"].data.foreach_set("uv", uv.ravel())


def bake(scene, kit, rigs, channel, size, samples, kind="EMIT", **options):
    image = bpy.data.images.new("bake_" + channel, size, size, alpha=False, float_buffer=True, is_data=True)
    for slot, rig in zip(kit.material_slots, rigs):
        materials.show_channel(slot.material, rig, channel if channel != "ao" else "mask", image)
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


def emissive_stats(emissive):
    """What the runtime makes of the stored emissive atlas (sRGB bytes) at GAME_EMISSIVE: texels that clip to white
    (every channel at 1 or over) and texels over the bloom threshold (luminance as the bloom pass weighs it)."""
    stored = np.round(encode_srgb(emissive) * 255) / 255
    game = np.where(stored <= 0.04045, stored / 12.92, ((stored + 0.055) / 1.055) ** 2.4) * GAME_EMISSIVE
    luminance = game @ np.array([0.299, 0.587, 0.114])
    return dict(white_texels=int((game.min(axis=2) >= 1).sum()), bloom_texels=int((luminance > BLOOM_THRESHOLD).sum()),
                max_luminance=round(float(luminance.max()), 3))


def bake_atlases(scene, kit, rigs, spec):
    """Bakes one kit; returns its delivery images (base colour, emissive, ORM, and the normal map if the kit has one)
    and the emissive_stats of its atlas."""
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
    assert len(spec["mats"]) <= CELLS, "one swatch cell per material"
    for cell, mat in enumerate(spec["mats"].values()):   # the flat cells: exact values, no bake noise
        color, lamp = spec["swatch"](mat)
        maps[row:, cell * SIZE // CELLS:(cell + 1) * SIZE // CELLS] = (*color, *lamp, 1, mat["rough"], mat.get("metal", 0))
    half = lambda m: m.reshape(SIZE // 2, 2, SIZE // 2, 2, 3).mean(axis=(1, 3))
    orm = half(maps[..., 6:9])
    emissive = half(maps[..., 3:6]) if spec.get("half_emissive") else maps[..., 3:6]
    name = spec["material"]
    images = [save_texture(f"{name}_basecolor", encode_srgb(maps[..., 0:3]), "sRGB", "JPEG"),
              save_texture(f"{name}_emissive", encode_srgb(emissive), "sRGB", "PNG"),   # JPEG speckles the black
              save_texture(f"{name}_orm", orm, "Non-Color", "PNG")]
    if spec["normal"]:   # the scans' relief and the procedural seams, rivets and treads, at the ORM map's size
        normal = bake(scene, kit, rigs, "normal", SIZE // 2, 4, kind="NORMAL", normal_space="TANGENT")
        normal = dilate(normal, half_covered)
        normal[int(SWATCH_ROW * SIZE // 2):] = (0.5, 0.5, 1.0)   # flat cells: flat
        images.append(save_texture(f"{name}_normal", normal, "Non-Color", "PNG"))
    return images, emissive_stats(emissive)


def measure(mesh):
    """Triangles and bounds in the delivered axes (x right, y up, z = minus the driving direction)."""
    co = np.zeros(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    lo, hi = co.min(axis=0), co.max(axis=0)
    box = lambda a, b, c: [round(float(v), 2) for v in (a, b, c)]
    return dict(triangles=len(mesh.polygons), min=box(lo[0], lo[2], -hi[1]), max=box(hi[0], hi[2], -lo[1]))


def bake_kit(scene, spec):
    """Builds, packs and bakes one kit with nothing else in the scene. Returns its finished piece meshes (mirrored
    halves unfolded, triangulated, back at the origin), its delivery material and its emissive stats."""
    sources, rigs = zip(*(spec["module"].source_material(name) for name in spec["mats"]))
    kit = build_kit(scene, sources, spec)
    pack_atlas(kit)
    full = {}
    occluder = bmesh.new()
    for index, name in enumerate(spec["pieces"]):
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
    images, stats = bake_atlases(scene, kit, rigs, spec)
    material = materials.delivery_material(*images[:3], name=spec["material"], normal=images[3] if spec["normal"] else None)
    for obj in (kit, shade):
        bpy.data.objects.remove(obj)
    return full, material, stats


def lamps_of(spec, mesh):
    """The lamps a finished piece lights with, in material order (a lit pattern counts as its lamp)."""
    used = np.zeros(len(mesh.polygons), np.int32)
    mesh.polygons.foreach_get("material_index", used)
    names, used = list(spec["mats"]), set(used.tolist())
    lamp_of = lambda name: spec["mats"][name].get("lamp", name) if spec["mats"][name].get("emit") else None
    return list(dict.fromkeys(lamp_of(names[i]) for i in sorted(used) if lamp_of(names[i])))


def main():
    scene = start_scene()
    baked = [(spec, *bake_kit(scene, spec)) for spec in KITS]   # one kit at a time: no light crosses between them
    contract, lamps, levels = {}, {}, {}
    for spec, full, material, _ in baked:
        for lamp, mat in spec["mats"].items():
            if mat.get("emit") and "lamp" not in mat:
                lamps[lamp] = [round(float(c), 2) for c in encode_srgb(np.array(mat["color"]))]
                if spec["levels"]:
                    levels[lamp] = mat["level"]
        for name, mesh in full.items():
            pivot = bpy.data.objects.new(name, None)
            pivot.empty_display_size = 2
            scene.collection.objects.link(pivot)
            entry = contract[name] = dict(PLACEMENT[name], pivot=name, material=spec["material"], lamps=lamps_of(spec, mesh), lods={})
            for lod in (0, 1):
                data = lod_mesh(mesh, lod, f"{name}_lod{lod}")
                data.materials.clear()
                data.materials.append(material)
                data.polygons.foreach_set("material_index", [0] * len(data.polygons))
                add_object(scene, data.name, data).parent = pivot
                entry["lods"][data.name] = measure(data)
                assert len(data.polygons) <= entry["budget_triangles"][lod], f"{data.name}: {len(data.polygons)} triangles is over budget"
            near, far = (entry["lods"][f"{name}_lod{lod}"]["triangles"] for lod in (0, 1))
            assert spec["material"] == "neon_landmarks" or far <= 0.4 * near, f"{name}: far LOD {far} is over 40 % of {near}"
    (HERE / "contract.json").write_text(json.dumps(dict(
        glb="public/models/neon-landmarks/neon-landmarks.glb", materials=[spec["material"] for spec in KITS],
        axes="Y up, metres, -Z = driving direction, +X = driver's right",
        lamps=lamps, lamp_levels=levels,
        emissive=dict(game_strength=GAME_EMISSIVE, bloom_threshold=BLOOM_THRESHOLD, **{spec["material"]: stats for spec, *_, stats in baked}),
        pieces=contract), indent=2) + "\n", encoding="utf-8")
    for line in (f"{name}: " + ", ".join(f"{lod} {m['triangles']} tris" for lod, m in entry["lods"].items()) for name, entry in contract.items()):
        print(line)
    # libraries.write keeps the file free of UI state and of the absolute paths a normal save records
    path = str(HERE / "neon-landmarks.blend")
    bpy.data.libraries.write(path, {scene}, path_remap="RELATIVE", compress=False)
    print("saved", Path(path).name)


main()
