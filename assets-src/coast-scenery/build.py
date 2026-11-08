"""Builds assets-src/coast-scenery/coast-scenery.blend and its textures/ from Poly Haven CC0 sources.

Run from the repo root (about 10 minutes, CPU Cycles bakes):
  python3 -I scripts/assets/fetch_polyhaven.py fetch          # once per machine, cache outside the repo
  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-scenery/build.py

Sources come from $POLYHAVEN_CACHE (default $HOME/.cache/skyline-rush/polyhaven) and are checked against
the sha256 in its sources.json before use. Recipe, budgets and licence: asset-brief.md.
Every shipping piece is a top-level node at the origin with its pivot at ground contact; the runtime
places clones. Blender axes: z up, length along x, visible face / road side toward -y.
"""
import hashlib
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "textures")
SRC = os.environ.get("POLYHAVEN_CACHE") or os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven")
sys.path.insert(0, os.path.join(HERE, "build"))

import materials as M  # noqa: E402
import props  # noqa: E402
import scan_pieces as S  # noqa: E402

# piece: (scan asset, island index or None, target LOW triangles before the ground skirt)
SCANS = {
    "cliff_a": ("coastal_cliff_01", None, 11_000),
    "cliff_b": ("coastal_cliff_02", None, 11_000),
    "sea_arch": ("coastal_cliff_04", 0, 9_200),  # largest island; shipped twice (front + back shell, one mesh)
    "rock_a": ("coast_rocks_05", None, 2_600),
    "rock_b": ("coast_rocks_05", None, 9_000),   # cropped to the resting boulder (~2.5k) in finish_scans
}
# material: (scan asset, pieces sharing its baked normal map, cage extrusion m, max ray m, normal + ARM px)
# Albedo is always 1K. The 4 m rock gets 512 px normal/ARM (~128 px/m, still denser than the 41-92 m cliffs at 1K):
# a 1K UASTC normal costs ~1.2 MB of GLB, the largest item in the byte budget.
SCAN_MATERIALS = {
    "coast_cliff_a": ("coastal_cliff_01", ["cliff_a"], 0.4, 0.9, 1024),
    "coast_cliff_b": ("coastal_cliff_02", ["cliff_b"], 0.4, 0.9, 1024),
    "coast_arch": ("coastal_cliff_04", ["sea_arch"], 0.4, 0.9, 1024),
    "coast_rock": ("coast_rocks_05", ["rock_a", "rock_b"], 0.04, 0.1, 512),
}


def verify_sources(prefixes):
    """Every cache file used here must match the sha256 recorded when it was fetched."""
    with open(os.path.join(SRC, "sources.json")) as f:
        files = json.load(f)["files"]
    for rec in files:
        if rec["path"].split("/")[0] not in prefixes:
            continue
        with open(os.path.join(SRC, rec["path"]), "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        if digest != rec["sha256"]:
            raise SystemExit(f"{rec['path']}: sha256 mismatch, re-run fetch_polyhaven.py fetch")


def tex(name, path, colorspace, fmt, res=S.RES, crop=None, remap=None):
    img = S.load_scaled(path, name, colorspace, res, crop)
    if remap:
        px = np.empty(res * res * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(-1, 4)
        px[:, :3] = remap(px[:, :3])
        img.pixels.foreach_set(px.ravel())
    return S.save_image(img, TEX, f"{name}.{'jpg' if fmt == 'JPEG' else 'png'}", fmt)


def build_scans():
    highs, lows = {}, {}
    for asset in sorted({a for a, _, _ in SCANS.values()}):
        high = S.import_scan(SRC, asset)
        islands = S.split_islands(high) if any(a == asset and i is not None for a, i, _ in SCANS.values()) else [high]
        for piece, (a, island, target) in SCANS.items():
            if a == asset:
                highs[piece] = islands[island or 0]
                lows[piece] = S.decimated(highs[piece], piece, target)
        for ob in islands:
            if ob not in highs.values():
                bpy.data.objects.remove(ob)
    mats = {}
    for name, (asset, pieces, extrusion, max_ray, res) in SCAN_MATERIALS.items():
        maps = os.path.join(SRC, asset, "textures")
        mat = M.scan_material(name, tex(f"{name}_diff", os.path.join(maps, f"{asset}_diff_2k.jpg"), "sRGB", "JPEG"),
                              tex(f"{name}_arm", os.path.join(maps, f"{asset}_arm_2k.jpg"), "Non-Color", "JPEG", res))
        for piece in pieces:
            lows[piece].data.materials.append(mat)
        nrm = bpy.data.images.new(f"{name}_nrm", res, res, alpha=False)
        nrm.colorspace_settings.name = "Non-Color"
        baked = S.bake_normal([lows[p] for p in pieces], [highs[p] for p in pieces], nrm, extrusion, max_ray)
        for piece, ob in zip(pieces, baked):
            ob.name = ob.data.name = piece
            lows[piece] = ob
        M.attach_normal(mat, S.save_image(nrm, TEX, f"{name}_nrm.png", "PNG"))
        mats[name] = mat
    for ob in set(highs.values()):
        bpy.data.objects.remove(ob)
    return lows, mats


def finish_scans(lows):
    for piece in ("cliff_a", "cliff_b"):
        S.ground_pivot(lows[piece], band=2.5, percentile=60)
        S.skirt(lows[piece], band=2.5, offset=Vector((0, 0, -2.5)))
    S.crop_above(lows["rock_b"], z_cut=0.5)  # the slab resting on top of coast_rocks_05: a distinct boulder, same textures
    for piece, band in (("rock_a", 0.35), ("rock_b", 0.2)):
        S.ground_pivot(lows[piece], band=band, percentile=70)
        S.skirt(lows[piece], band=band, offset=Vector((0, 0, -0.4)))
    # Sea arch: the cliff strip, straightened in plan, gets a soffit (its bottom edge extruded backward),
    # then is curled into a ~70 m wide, ~40 m tall arch; a rotated second shell closes the back.
    shell = lows["sea_arch"]
    S.straighten_plan(shell)
    S.skirt(shell, band=2.5, offset=Vector((0, 3.0, -0.5)))
    S.bend_arch(shell, sweep_deg=190, inner_r=13.0, thickness=15.0, leg_gain=0.9, rise=1.45, depth_scale=0.5)
    S.ground_pivot(shell)
    shell.name, shell.data.name = "sea_arch_front", "sea_arch_shell"
    back = shell.copy()  # linked duplicate: same mesh, exported once
    back.name = "sea_arch_back"
    bpy.context.scene.collection.objects.link(back)
    back.rotation_euler = (0, 0, math.pi)
    back.location = (0, 4.0, 0)
    arch = bpy.data.objects.new("sea_arch", None)
    bpy.context.scene.collection.objects.link(arch)
    for ob in (shell, back):
        ob.parent = arch


def build_props():
    bark = os.path.join(SRC, "palm_bark")
    metal = os.path.join(SRC, "metal_plate_02")
    mats = {
        "coast_palm_bark": M.bark_material(
            "coast_palm_bark",
            tex("coast_palm_bark_diff", os.path.join(bark, "palm_bark_diff_2k.jpg"), "sRGB", "JPEG", 512),
            tex("coast_palm_bark_nrm", os.path.join(bark, "palm_bark_nor_gl_2k.png"), "Non-Color", "PNG", 512),
            roughness=0.92),
        "coast_palm_frond": M.frond_material("coast_palm_frond"),
    }
    # One seam-free plate of metal_plate_02 (source px x, y-from-top, w, h); roughness remapped to galvanized 0.22-0.62.
    crop = (503, 912, 288, 448)
    steel = M.steel_material(
        "coast_rail_steel",
        tex("coast_rail_rough", os.path.join(metal, "metal_plate_02_rough_2k.jpg"), "Non-Color", "JPEG", 512, crop,
            remap=lambda c: 0.22 + 0.40 * c),
        tex("coast_rail_nrm", os.path.join(metal, "metal_plate_02_nor_gl_2k.png"), "Non-Color", "PNG", 512, crop),
        base_rgb=(0.53, 0.55, 0.56))
    props.build_palm("palm_a", mats, height=10.5, lean=Vector((1.6, 0.4, 0)), fronds=14, frond_len=4.6, seed=1)
    props.build_palm("palm_b", mats, height=7.4, lean=Vector((-0.7, -0.9, 0)), fronds=12, frond_len=4.0, seed=5)
    props.build_guard_rail("guard_rail", steel)
    for name in ("palm_a", "palm_b", "guard_rail"):
        props.make_normals_consistent(bpy.data.objects[name])


def main():
    verify_sources({a for a, _, _ in SCANS.values()} | {"palm_bark", "metal_plate_02"})
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    os.makedirs(TEX, exist_ok=True)
    lows, _ = build_scans()
    finish_scans(lows)
    build_props()
    summary = {ob.name: S.tris(ob) for ob in scene.objects if ob.type == "MESH"}
    print("COAST_SCENERY_SUMMARY " + json.dumps(summary, sort_keys=True))
    # Datablocks only, uncompressed, texture paths relative: save_as_mainfile would also store UI state
    # (including the saving user's home directory).
    bpy.data.libraries.write(os.path.join(HERE, "coast-scenery.blend"), {scene}, path_remap="RELATIVE", compress=False)


main()
