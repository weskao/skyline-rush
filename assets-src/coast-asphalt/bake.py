"""Coast road PBR set: bakes one seamless 24 m x 24 m asphalt tile from the CC0 Poly Haven scan "Asphalt 02"
(Rob Tuytel) and encodes it to KTX2. Run from the repo root (inputs: $HOME/.cache/skyline-rush/polyhaven, fetched by
scripts/assets/fetch_polyhaven.py):

  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-asphalt/bake.py [-- <png-dir>]

Why asphalt_02 over asphalt_track: a worn mid-grey with visible aggregate (albedo ~0.2) is the "slightly worn grey
highway" of the concept board; asphalt_track is a near-black fresh surface (albedo ~0.03) that would need heavy regrading.
asphalt_02's cracks would repeat as a grid, so the tile uses only a crack-free crop of the scan.

Tile maps (one UV repeat = ROAD_UV_METRES in src/geometry.ts: u across the 24 m width, v along the road):
  basecolor  sRGB          scan colour x periodic tonal drift, rubbed-dark wheel ruts, dusty edges. No lane paint.
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
OUT_KTX2 = os.path.join(REPO, "public", "materials", "coast-asphalt")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_PNG = ARGV[0] if ARGV else os.path.join(tempfile.gettempdir(), "skyline-rush-coast-asphalt")

TILE_M = 24.0           # metres per UV repeat (ROAD_UV_METRES)
SCAN_M = 2.4            # metres one scan crop covers in the tile; 24 / 2.4 = 10 whole repeats keeps it periodic
SCAN_REPEATS = round(TILE_M / SCAN_M)
SCAN_REPEATS_B = 7      # second layer: the same scan rotated 90 degrees, 3.4 m per repeat
RESOLUTIONS = (1024, 2048)
SEED = 20261108
FLATTEN = 0.8           # share of the scan's slow tonal drift removed before tiling
LANE_CENTRES_M = (-7.5, -2.5, 2.5, 7.5)   # Coast lane lines at -5 / 0 / +5 (world.js laneLines) on a 24 m road; ruts sit at +-0.9 m
CROP = (800, 400, 1536)          # x, y (from top), size in 4K scan pixels: crack-free area, divisible by 3
SCAN = "asphalt_02"
MAPS = {"diff": "Diffuse", "nor": "nor_gl", "rough": "Rough", "ao": "AO"}
FILES = {"diff": "asphalt_02_diff_4k.jpg", "nor": "asphalt_02_nor_gl_4k.png",
         "rough": "asphalt_02_rough_4k.jpg", "ao": "asphalt_02_ao_4k.jpg"}


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


# ---------------------------------------------------------------- scan preparation (numpy, scene-linear floats)
def load_crop(key, colorspace):
    """Crop of one scan map as float32 (h, w, 3), bottom row first, then 3x3 box-averaged (a mip-style minify)."""
    path = os.path.join(CACHE, SCAN, FILES[key])
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = colorspace
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    x0, y0, size = CROP
    crop = px.reshape(h, w, 4)[h - y0 - size:h - y0, x0:x0 + size, :3]
    return crop


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
    # The scan's own blotches would repeat as a visible 2.4 m grid; the 24 m tone field replaces most of them.
    diff = diff * (diff.mean((0, 1)) / np.maximum(lowpass(diff), 1e-4)) ** FLATTEN
    rough = rough - FLATTEN * (lowpass(rough) - rough.mean())
    ao = ao - FLATTEN * (lowpass(ao) - ao.mean())
    nor = nor / np.maximum(np.linalg.norm(nor, axis=2, keepdims=True), 1e-4)
    return np.clip(diff, 0, 1), nor * 0.5 + 0.5, np.clip(rough, 0, 1), np.clip(ao, 0, 1)


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
    """R tone drift, G wheel-rut wear, B edge dust (misc) and puddle mask, [v, u] over the 24 m tile."""
    rng = np.random.default_rng(SEED)
    x = ((np.arange(n) + 0.5) / n - 0.5) * TILE_M
    xs = np.broadcast_to(x[None, :], (n, n))
    tone = 0.5 + 0.2 * (0.6 * periodic_noise(rng, n, 3, 3) + 0.4 * periodic_noise(rng, n, 9, 9))
    ruts = sum(np.exp(-0.5 * ((xs - c - s * 0.9) / 0.32) ** 2) for c in LANE_CENTRES_M for s in (-1, 1))
    ruts = np.clip(ruts, 0, 1)
    edge = smoothstep(9.0, 11.6, np.abs(xs))
    # Puddles: low-frequency noise stretched along the road, pushed up inside ruts and near the edges.
    z = periodic_noise(rng, n, 10, 3)
    ragged = 0.28 * periodic_noise(rng, n, 45, 14)   # irregular shorelines
    puddle = smoothstep(1.35, 1.75, 0.9 * z + ragged + 1.25 * ruts + 0.95 * edge)
    misc = np.stack([np.clip(tone, 0, 1), ruts, edge, np.ones_like(tone)], -1)
    # Which of the two scan layers shows (patches ~5 m wide, soft edge): breaks the 2.4 m repeat of a single layer.
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
    mat = bpy.data.materials.new("coast_asphalt")
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

    uv = node("ShaderNodeTexCoord").outputs["UV"]
    scan_map = node("ShaderNodeMapping")
    scan_map.inputs["Scale"].default_value = (SCAN_REPEATS, SCAN_REPEATS, 1)
    lk(uv, scan_map.inputs["Vector"])
    scan_uv = scan_map.outputs["Vector"]
    scan_map_b = node("ShaderNodeMapping")
    scan_map_b.inputs["Scale"].default_value = (SCAN_REPEATS_B, SCAN_REPEATS_B, 1)
    lk(uv, scan_map_b.inputs["Vector"])
    aux = tex(maps["aux"], uv, "Cubic")
    aux_sep = node("ShaderNodeSeparateColor")
    lk(aux.outputs["Color"], aux_sep.inputs["Color"])

    def layered(key):
        a, b = tex(maps[key], scan_uv), tex(maps[key + "_b"], scan_map_b.outputs["Vector"])
        mix = node("ShaderNodeMix", data_type="RGBA")
        lk(aux_sep.outputs["Green"], mix.inputs[0])
        lk(a.outputs["Color"], mix.inputs[6])
        lk(b.outputs["Color"], mix.inputs[7])
        return mix.outputs[2]

    diff, nor, rough, ao = (layered(k) for k in ("diff", "nor", "rough", "ao"))
    misc = tex(maps["misc"], uv, "Cubic")
    sep = node("ShaderNodeSeparateColor")
    lk(misc.outputs["Color"], sep.inputs["Color"])
    tone, rut, edge = sep.outputs["Red"], sep.outputs["Green"], sep.outputs["Blue"]
    # colour factor = tone drift x (rubbed-dark ruts, dusty-light edges)
    drift = math("MULTIPLY_ADD", tone, 0.28, 0.86)
    wear = math("MULTIPLY_ADD", edge, 0.07, math("MULTIPLY_ADD", rut, -0.10, 1.0))
    scale = node("ShaderNodeVectorMath", operation="SCALE")
    lk(diff, scale.inputs[0])
    lk(math("MULTIPLY", drift, wear), scale.inputs[3])
    base = scale.outputs["Vector"]
    scan_rough = node("ShaderNodeSeparateColor")
    lk(rough, scan_rough.inputs["Color"])
    dry = math("MULTIPLY_ADD", edge, 0.05, math("MULTIPLY_ADD", rut, -0.07, scan_rough.outputs["Red"]), clamp=True)
    scan_ao = node("ShaderNodeSeparateColor")
    lk(ao, scan_ao.inputs["Color"])
    packed = node("ShaderNodeCombineColor")
    lk(scan_ao.outputs["Red"], packed.inputs["Red"])
    lk(dry, packed.inputs["Green"])
    lk(aux_sep.outputs["Red"], packed.inputs["Blue"])
    nmap = node("ShaderNodeNormalMap", space="TANGENT", uv_map="UVMap")
    lk(nor, nmap.inputs["Color"])
    bsdf = node("ShaderNodeBsdfPrincipled")
    lk(base, bsdf.inputs["Base Color"])
    lk(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    out = node("ShaderNodeOutputMaterial")
    lk(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, {"base": base, "packed": packed.outputs["Color"]}, bsdf, out, nt


def bake_all(mat, sockets, bsdf, out, nt, plane):
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
        for name, kind, socket, space in (("basecolor", "EMIT", sockets["base"], "sRGB"), ("packed", "EMIT", sockets["packed"], "Non-Color"),
                                          ("normal", "NORMAL", None, "Non-Color")):
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
    sources = json.load(open(os.path.join(CACHE, "sources.json")))
    inputs = {}
    for key, fname in FILES.items():
        path = os.path.join(CACHE, SCAN, fname)
        listed = next(f for f in sources["files"] if f["path"] == f"{SCAN}/{fname}")
        digest = sha256(path)
        assert digest == listed["sha256"], f"{fname}: cache differs from sources.json"
        inputs[fname] = digest
    diff, nor, rough, ao = prepare_scan()
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
    paths = bake_all(mat, sockets, bsdf, out, nt, plane)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "coast-asphalt.blend"), compress=True)
    if "--no-encode" in ARGV:   # look iteration: PNGs + .blend only
        return
    files = encode(paths)
    print("SUMMARY", json.dumps({"puddleCoverage": round(float((puddle > 0.5).mean()), 4), "scan": SCAN,
                                  "authors": sources["assets"][SCAN]["authors"], "inputSha256": inputs, "files": files}, indent=1))


main()
