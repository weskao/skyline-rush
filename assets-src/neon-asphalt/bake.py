"""Neon Downtown road PBR set (task 5b step 4): bakes one seamless 24 m x 24 m wet-city asphalt tile from the CC0
Poly Haven scan "Asphalt Track" (Dimitrios Savva) and encodes it to KTX2. Same file names, sizes, packing and tile
as assets-src/coast-asphalt/bake.py, so src/coast-road-material.ts loads it by set name alone. Run from the repo root
(inputs: $HOME/.cache/skyline-rush/polyhaven, fetched by scripts/assets/fetch_polyhaven.py fetch):

  "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-asphalt/bake.py [-- <png-dir> [--no-encode]]

Why asphalt_track: a fine-grained, crack-free, near-black fresh surface is the dark city asphalt of the Neon concept
frames 03-08; dark, even asphalt is what lets the neon signs read in the wet mirror. The scan is warm brown-black, so
it is desaturated toward a cool grey and lifted to a fixed mean albedo (GRADE_*), then tiled like Coast.

Tile maps (one UV repeat = ROAD_UV_METRES in src/geometry.ts: u across the 24 m width, v along the road):
  basecolor  sRGB          graded scan x tonal drift, rubbed-dark wheel ruts, grimy gutters. No lane paint: lane
                           lines are instanced geometry (src/classic-road-render.ts), as on Coast.
  normal     linear        tangent space, OpenGL (+Y = increasing v), as three.js normalMap expects.
  packed     linear        R = ambient occlusion, G = dry roughness, B = puddle mask (0 dry .. 1 standing water).
Rows are written bottom row first (v = 0), so KTX2 row 0 is v = 0 as three.js uploads it (flipY = false).
Everything is periodic, so the tile repeats without seams. Deterministic: fixed seed, no wall-clock input.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CACHE = os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven")
OUT_KTX2 = os.path.join(REPO, "public", "materials", "neon-asphalt")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
POS = [a for a in ARGV if not a.startswith("--")]
OUT_PNG = POS[0] if POS else os.path.join(tempfile.gettempdir(), "skyline-rush-neon-asphalt")

TILE_M = 24.0           # metres per UV repeat (ROAD_UV_METRES)
SCAN_M = 2.0            # metres one scan crop covers; 24 / 2 = 12 whole repeats keeps it periodic (fine grain)
SCAN_REPEATS = round(TILE_M / SCAN_M)
SCAN_REPEATS_B = 7      # second layer: the same scan rotated 90 degrees, 3.4 m per repeat
RESOLUTIONS = (1024, 2048)
SEED = 20261114
FLATTEN = 0.8           # share of the scan's slow tonal drift removed before tiling
GRADE_SAT = 0.25        # saturation kept from the warm scan
GRADE_TINT = (0.96, 0.98, 1.06)   # slight cool cast (night city), applied after desaturation
GRADE_ALBEDO = 0.12     # mean linear albedo of the graded scan; x 0.35 (the material's #a0a0a0) ~= 0.042 on screen
LANE_CENTRES_M = (-7.5, -2.5, 2.5, 7.5)   # lane lines at -5 / 0 / +5 (classic-road-render.ts) on a 24 m road
CROP = (1200, 1200, 1536)        # x, y (from top), size in 4K scan pixels; divisible by 3
SCAN = "asphalt_track"
FILES = {"diff": "asphalt_track_diff_4k.jpg", "nor": "asphalt_track_nor_gl_4k.png",
         "rough": "asphalt_track_rough_4k.jpg", "ao": "asphalt_track_ao_4k.jpg"}


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


# ---------------------------------------------------------------- scan preparation (numpy, scene-linear floats)
def load_crop(key, colorspace):
    """Crop of one scan map as float32 (h, w, 3), bottom row first."""
    path = os.path.join(CACHE, SCAN, FILES[key])
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = colorspace
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    x0, y0, size = CROP
    return px.reshape(h, w, 4)[h - y0 - size:h - y0, x0:x0 + size, :3]


def box(a, k=3):
    n = a.shape[0] // k
    return a.reshape(n, k, n, k, a.shape[2]).mean((1, 3))


def tileable(a, blend=0.14):
    """Make a periodic: cross-fade with a half-tile-wrapped copy near the borders, keeping the grain's variance."""
    n = a.shape[0]
    ramp = np.clip(np.minimum(np.arange(n), n - 1 - np.arange(n)) / (blend * n), 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    w = (ramp[:, None] * ramp[None, :])[..., None]
    mean = a.mean((0, 1))
    b = np.roll(a, (n // 2, n // 2), (0, 1))
    return mean + (w * (a - mean) + (1 - w) * (b - mean)) / np.sqrt(w * w + (1 - w) ** 2)


def lowpass(a, cycles=3.0):
    """Periodic Gaussian blur keeping only variation slower than `cycles` per crop."""
    f = np.fft.fftfreq(a.shape[0], 1 / a.shape[0])
    k = np.exp(-((f[None, :] / cycles) ** 2 + (f[:, None] / cycles) ** 2))[..., None]
    return np.fft.ifft2(np.fft.fft2(a, axes=(0, 1)) * k, axes=(0, 1)).real


def rotated(diff, nor, rough, ao):
    """The scan maps turned 90 degrees (normal xy turned with them) for the second layer."""
    v = np.rot90(nor * 2 - 1)
    nor_b = np.stack([v[..., 1], -v[..., 0], v[..., 2]], -1) * 0.5 + 0.5
    return np.rot90(diff), nor_b, np.rot90(rough), np.rot90(ao)


def grade(diff):
    """Warm brown-black scan -> cool dark grey at a fixed mean albedo; returns the graded map and the scan's mean."""
    lum = diff @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    scan_mean = float(lum.mean())
    grey = lum[..., None] + GRADE_SAT * (diff - lum[..., None])
    grey = grey * np.array(GRADE_TINT, np.float32)
    return grey * (GRADE_ALBEDO / float(lum.mean())), scan_mean


def prepare_scan():
    diff = load_crop("diff", "Non-Color")   # raw sRGB-encoded values come back whatever the colour space; decode by hand
    diff = np.where(diff <= 0.04045, diff / 12.92, ((diff + 0.055) / 1.055) ** 2.4)
    nor = load_crop("nor", "Non-Color") * 2 - 1
    rough = load_crop("rough", "Non-Color")[..., :1]
    ao = load_crop("ao", "Non-Color")[..., :1]
    nor, diff, rough, ao = box(nor), box(diff), box(rough), box(ao)
    length = np.linalg.norm(nor, axis=2, keepdims=True)
    nor = nor / np.maximum(length, 1e-4)
    # Toksvig: averaged normals shorter than 1 mean unresolved bumps; fold them into roughness so the minified look holds.
    rough = np.clip((rough ** 4 + 0.5 * (1 - length) / np.maximum(length, 0.1)) ** 0.25, 0, 1)
    diff, nor, rough, ao = tileable(diff), tileable(nor), tileable(rough), tileable(ao)
    diff = diff * (diff.mean((0, 1)) / np.maximum(lowpass(diff), 1e-4)) ** FLATTEN
    rough = rough - FLATTEN * (lowpass(rough) - rough.mean())
    ao = ao - FLATTEN * (lowpass(ao) - ao.mean())
    diff, scan_mean = grade(np.clip(diff, 0, None))
    nor = nor / np.maximum(np.linalg.norm(nor, axis=2, keepdims=True), 1e-4)
    return np.clip(diff, 0, 1), nor * 0.5 + 0.5, np.clip(rough, 0, 1), np.clip(ao, 0, 1), scan_mean


def periodic_noise(rng, n, cycles_u, cycles_v):
    """Zero-mean unit-variance noise that is exactly periodic in both axes, correlated over tile/cycles_*; [v, u]."""
    f = np.fft.fftfreq(n, 1 / n)
    spectrum = np.exp(-((f[None, :] / cycles_u) ** 2 + (f[:, None] / cycles_v) ** 2))
    z = np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * spectrum).real
    return (z - z.mean()) / z.std()


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def tile_fields(n=1024):
    """misc: R tone drift, G wheel ruts, B gutter grime; aux: R puddle mask, G scan-layer pick, [v, u] over the tile."""
    rng = np.random.default_rng(SEED)
    c = ((np.arange(n) + 0.5) / n - 0.5) * TILE_M
    xs = np.broadcast_to(c[None, :], (n, n))
    tone = 0.5 + 0.2 * (0.6 * periodic_noise(rng, n, 3, 3) + 0.4 * periodic_noise(rng, n, 9, 9))
    ruts = np.clip(sum(np.exp(-0.5 * ((xs - lc - s * 0.9) / 0.32) ** 2) for lc in LANE_CENTRES_M for s in (-1, 1)), 0, 1)
    gutter = smoothstep(9.6, 11.8, np.abs(xs))
    # No distinct features (utility-cut patches, manholes): one repeats every 24 m and reads as a grid at speed.
    # Puddles: low-frequency noise stretched along the road, pooled in the ruts and the gutters.
    z = periodic_noise(rng, n, 10, 3)
    ragged = 0.28 * periodic_noise(rng, n, 45, 14)   # irregular shorelines
    puddle = smoothstep(1.3, 1.7, 0.9 * z + ragged + 1.25 * ruts + 1.2 * gutter)
    misc = np.stack([np.clip(tone, 0, 1), ruts, gutter], -1)
    # Which of the two scan layers shows (patches ~5 m wide, soft edge): breaks the 2 m repeat of a single layer.
    layer = smoothstep(0.4, 0.6, 0.5 + 0.25 * periodic_noise(rng, n, 5, 5))
    aux = np.stack([puddle, layer, np.zeros_like(layer)], -1)
    return misc.astype(np.float32), aux.astype(np.float32), puddle


# ---------------------------------------------------------------- Blender material + bake
def float_image(name, arr):
    h, w = arr.shape[:2]
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = arr[..., :3] if arr.shape[2] >= 3 else arr[..., :1]
    img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.ravel())   # not packed: the master stays small, rerun this script to refill the inputs
    return img


def build_material(maps):
    mat = bpy.data.materials.new("neon_asphalt")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    new = nt.nodes.new
    lk = nt.links.new

    def node(kind, **props):
        n = new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def tex(img, coord, interp="Linear"):
        n = node("ShaderNodeTexImage", image=img, interpolation=interp, extension="REPEAT")
        lk(coord, n.inputs["Vector"])
        return n

    def math(op, a, b=None, c=None, clamp=False):
        n = node("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            lk(v, n.inputs[i]) if not isinstance(v, (int, float)) else setattr(n.inputs[i], "default_value", v)
        return n.outputs[0]

    def separate(socket):
        n = node("ShaderNodeSeparateColor")
        lk(socket, n.inputs["Color"])
        return n.outputs

    uv = node("ShaderNodeTexCoord").outputs["UV"]
    scan_map = node("ShaderNodeMapping")
    scan_map.inputs["Scale"].default_value = (SCAN_REPEATS, SCAN_REPEATS, 1)
    lk(uv, scan_map.inputs["Vector"])
    scan_map_b = node("ShaderNodeMapping")
    scan_map_b.inputs["Scale"].default_value = (SCAN_REPEATS_B, SCAN_REPEATS_B, 1)
    lk(uv, scan_map_b.inputs["Vector"])
    puddle, layer = separate(tex(maps["aux"], uv, "Cubic").outputs["Color"])[:2]

    def layered(key):
        a, b = tex(maps[key], scan_map.outputs["Vector"]), tex(maps[key + "_b"], scan_map_b.outputs["Vector"])
        mix = node("ShaderNodeMix", data_type="RGBA")
        lk(layer, mix.inputs[0])
        lk(a.outputs["Color"], mix.inputs[6])
        lk(b.outputs["Color"], mix.inputs[7])
        return mix.outputs[2]

    diff, nor, rough, ao = (layered(k) for k in ("diff", "nor", "rough", "ao"))
    tone, rut, gutter = separate(tex(maps["misc"], uv, "Cubic").outputs["Color"])[:3]
    # colour factor = tone drift x rubbed-dark ruts x grimy gutters
    drift = math("MULTIPLY_ADD", tone, 0.24, 0.88)
    wear = math("MULTIPLY", math("MULTIPLY_ADD", rut, -0.10, 1.0), math("MULTIPLY_ADD", gutter, -0.22, 1.0))
    scale = node("ShaderNodeVectorMath", operation="SCALE")
    lk(diff, scale.inputs[0])
    lk(math("MULTIPLY", drift, wear), scale.inputs[3])
    base = scale.outputs["Vector"]
    # dry roughness: polished ruts, grime-filled gutters
    dry = math("MULTIPLY_ADD", gutter, 0.05, math("MULTIPLY_ADD", rut, -0.07, separate(rough)[0]), clamp=True)
    packed = node("ShaderNodeCombineColor")
    lk(separate(ao)[0], packed.inputs["Red"])
    lk(dry, packed.inputs["Green"])
    lk(puddle, packed.inputs["Blue"])
    nmap = node("ShaderNodeNormalMap", space="TANGENT", uv_map="UVMap")
    lk(nor, nmap.inputs["Color"])
    bsdf = node("ShaderNodeBsdfPrincipled")
    lk(base, bsdf.inputs["Base Color"])
    lk(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    out = node("ShaderNodeOutputMaterial")
    lk(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, {"base": base, "packed": packed.outputs["Color"]}, bsdf, out, nt


def bake_all(sockets, bsdf, out, nt, plane):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.render.bake.margin = 2
    emit = nt.nodes.new("ShaderNodeEmission")
    target = nt.nodes.new("ShaderNodeTexImage")
    nt.nodes.active = target
    plane.select_set(True)
    bpy.context.view_layer.objects.active = plane
    os.makedirs(OUT_PNG, exist_ok=True)
    paths = {}
    for res in RESOLUTIONS:
        for name, socket, space in (("basecolor", sockets["base"], "sRGB"), ("packed", sockets["packed"], "Non-Color"),
                                    ("normal", None, "Non-Color")):
            img = bpy.data.images.new(f"{name}_{res}", res, res, alpha=False)
            img.colorspace_settings.name = space
            target.image = img
            if socket is not None:
                nt.links.new(socket, emit.inputs["Color"])
                nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
                bpy.ops.object.bake(type="EMIT")
            else:
                nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
                bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", normal_r="POS_X", normal_g="POS_Y", normal_b="POS_Z")
            path = os.path.join(OUT_PNG, f"{name}_{res}.png")
            img.filepath_raw, img.file_format = path, "PNG"
            img.save()
            paths[(name, res)] = path
    return paths


def encode(paths):
    """PNG -> KTX2: UASTC + zstd (all maps), full mip chain, DFD transfer function set explicitly."""
    os.makedirs(OUT_KTX2, exist_ok=True)
    short = {1024: "1k", 2048: "2k"}
    files = []
    for (name, res), png in paths.items():
        out = os.path.join(OUT_KTX2, f"asphalt_{name}_{short[res]}.ktx2")
        srgb = name == "basecolor"
        cmd = ["toktx", "--t2", "--encode", "uastc", "--uastc_quality", "3", "--zcmp", "19", "--genmipmap",
               "--lower_left_maps_to_s0t0", "--assign_oetf", "srgb" if srgb else "linear",
               "--assign_primaries", "bt709" if srgb else "none"]
        cmd += ["--uastc_rdo_l", "0.5" if name == "normal" else "1.0"]
        subprocess.run(cmd + [out, png], check=True)
        data = open(out, "rb").read()
        files.append({"map": {"basecolor": "baseColor"}.get(name, name), "resolution": res, "url": os.path.relpath(out, os.path.join(REPO, "public")),
                      "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "colorSpace": "srgb" if srgb else "linear"})
    return files


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0   # no .blend1 backup next to the master
    sources = json.load(open(os.path.join(CACHE, "sources.json")))
    inputs = {}
    for key, fname in FILES.items():
        path = os.path.join(CACHE, SCAN, fname)
        listed = next(f for f in sources["files"] if f["path"] == f"{SCAN}/{fname}")
        digest = sha256(path)
        assert digest == listed["sha256"], f"{fname}: cache differs from sources.json"
        inputs[fname] = digest
    diff, nor, rough, ao, scan_mean = prepare_scan()
    misc, aux, puddle = tile_fields()
    maps = {"diff": float_image("scan_diff", diff), "nor": float_image("scan_nor", nor),
            "rough": float_image("scan_rough", rough), "ao": float_image("scan_ao", ao),
            "misc": float_image("field_misc", misc), "aux": float_image("field_aux", aux)}
    for key, arr in zip(("diff", "nor", "rough", "ao"), rotated(diff, nor, rough, ao)):
        maps[key + "_b"] = float_image("scan_" + key + "_b", np.ascontiguousarray(arr))
    bpy.ops.mesh.primitive_plane_add(size=TILE_M)
    plane = bpy.context.active_object
    plane.name = "road_tile_24m"
    mat, sockets, bsdf, out, nt = build_material(maps)
    plane.data.materials.append(mat)
    paths = bake_all(sockets, bsdf, out, nt, plane)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "neon-asphalt.blend"), compress=True)
    stats = {"puddleCoverage": round(float((puddle > 0.5).mean()), 4), "scanAlbedo": round(scan_mean, 4),
             "gradedAlbedo": GRADE_ALBEDO, "dryRoughnessMean": round(float(rough.mean()), 3)}
    if "--no-encode" in ARGV:   # look iteration: PNGs + .blend only
        print("SUMMARY", json.dumps(stats))
        return
    files = encode(paths)
    print("SUMMARY", json.dumps({**stats, "scan": SCAN, "authors": sources["assets"][SCAN]["authors"],
                                  "inputSha256": inputs, "files": files}, indent=1))


main()
