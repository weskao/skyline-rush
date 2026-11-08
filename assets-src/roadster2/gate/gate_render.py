"""Forms-gate renders: one silhouette per camera in refs.json, plus the pixel position of each
contract anchor (wheel centres etc.) projected through that camera, so gate_measure.py can
register the reference photo to the contract by anchors instead of by overall length.

Run from the repo root (camera fitting and render setup are reused from the skill's review_render.py):
  "$BLENDER_BIN" --background --python assets-src/roadster2/gate/gate_render.py -- \
    --blend assets-src/roadster2/roadster2.blend --refs assets-src/roadster2/gate/refs.json --out <dir>
"""
import argparse
import itertools
import json
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = os.getcwd()
sys.path.insert(0, os.path.join(ROOT, ".claude/skills/blender-image-to-3d/scripts"))
import review_render as rr  # noqa: E402

W, H = 1600, 900


def to_blender(p):
    return Vector((p[0], -p[2], p[1]))


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument("--blend", required=True)
    p.add_argument("--refs", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args(argv)
    refs = json.load(open(a.refs))
    ra = rr.parse(["--blend", a.blend, "--out", a.out, "--mode", "silhouette", "--margin", "1.45"])
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
    scene = bpy.context.scene
    os.makedirs(a.out, exist_ok=True)
    scope = rr.scope_objects(ra)
    rr.apply_visibility(scene, scope)
    corners, lo, hi = rr.world_corners(scope)
    center, extent = (lo + hi) / 2, max(hi - lo)
    rr.setup_engine(scene, ra, "workbench", scope, center, extent)
    cam = bpy.data.objects.new("_gate_cam", bpy.data.cameras.new("_gate_cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = W, H

    out = {"size": [W, H], "views": {}}
    for view, spec in refs["views"].items():
        c = spec["cams"]
        runs = []
        for az, el, lens in itertools.product(c["az"], c["el"], c["lens"]):
            rr.fit_camera(cam, corners, center, rr.view_direction(az, el), W, H, lens, ra.margin)
            bpy.context.view_layer.update()
            path = os.path.join(a.out, "%s_az%g_el%g_l%g.png" % (view, az, el, lens))
            rr.render_to(scene, path)
            anchors = []
            for pt in spec["anchors_m"]:
                v = world_to_camera_view(scene, cam, to_blender(pt))
                anchors.append([v.x * W, (1 - v.y) * H])
            runs.append({"az": az, "el": el, "lens": lens, "file": path, "anchors_px": anchors})
        out["views"][view] = runs
        print("gate rendered", view, len(runs))
    with open(os.path.join(a.out, "gate_render.json"), "w") as f:
        json.dump(out, f, indent=1)


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
