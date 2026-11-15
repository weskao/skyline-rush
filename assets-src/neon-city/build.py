"""Builds assets-src/neon-city/neon-city.blend and its textures/ : the modelled Neon Downtown city kit.

Run from the repo root (under a minute, no bakes):
  python3 -I assets-src/neon-city/fetch_sources.py            # once per machine, cache outside the repo
  "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-city/build.py

Wall, roof, bark and metal detail comes from the Poly Haven CC0 sets recorded in sources.json, read from
$POLYHAVEN_CACHE (default $HOME/.cache/skyline-rush/polyhaven) and checked against their sha256. Everything
else is painted by build/cells.py. Modules, LOD triangle budgets and sectors: modules.json; recipe and
integration contract: asset-brief.md.

Every module is an Empty named <module> at the origin (its pivot: ground level, centre of the footprint) with
one mesh child per LOD, <module>_lod0.. . One material, four atlases. Blender axes: z up, street side -y.
"""
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "textures")
SRC = os.environ.get("POLYHAVEN_CACHE") or os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven")
sys.path.insert(0, os.path.join(HERE, "build"))

import atlas as A  # noqa: E402
import buildings  # noqa: E402
import cells  # noqa: E402
import props  # noqa: E402
from kit import Kit  # noqa: E402

MAPS = {"color": ("sRGB", "JPEG"), "emissive": ("sRGB", "JPEG"), "orm": ("Non-Color", "JPEG"), "normal": ("Non-Color", "PNG")}


def main():
    with open(os.path.join(HERE, "modules.json"), encoding="utf-8") as f:
        spec = json.load(f)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0

    atlas = A.Atlas(A.Scans(SRC, os.path.join(HERE, "sources.json")))
    cells.paint_all(atlas)
    fill = atlas.pack()
    os.makedirs(TEX, exist_ok=True)
    maps = atlas.compose()
    images = {key: A.save_image(maps[key], f"neon_city_{key}", TEX, *MAPS[key]) for key in MAPS}
    strength = spec["emissiveStrength"]
    mat = A.make_material("neon_city", images, strength)

    summary, over = {}, []
    for name, mod in spec["modules"].items():
        pivot = bpy.data.objects.new(name, None)
        pivot.empty_display_size = 1.0
        scene.collection.objects.link(pivot)
        build = getattr(buildings, name, None) or getattr(props, name)
        for lod, budget in enumerate(mod["triangles"]):
            kit = Kit(atlas)
            build(kit, lod)
            ob = kit.build(f"{name}_lod{lod}", mat)
            ob.parent = pivot
            tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
            if tris > budget:
                over.append(f"{ob.name}: {tris} triangles > {budget}")
            xs, ys, zs = zip(*(v.co for v in ob.data.vertices))
            # footprint in three.js axes: x along the street, z toward it; min/max in metres
            summary[ob.name] = {"triangles": tris, "x": [round(min(xs), 2), round(max(xs), 2)],
                                "z": [round(-max(ys), 2), round(-min(ys), 2)], "height": round(max(zs), 2)}
    emissive = {name: c.emissive_range(strength) for name, c in atlas.cells.items() if c.emi.max() > 0}
    print("NEON_CITY_SUMMARY " + json.dumps({"atlasFill": round(fill, 3), "modules": summary, "emissive": emissive}, sort_keys=True))
    if over:
        raise SystemExit("over budget (modules.json):\n  " + "\n  ".join(over))
    bpy.data.libraries.write(os.path.join(HERE, "neon-city.blend"), {scene}, path_remap="RELATIVE", compress=False)


main()
