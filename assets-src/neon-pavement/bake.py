"""Neon Downtown ground PBR set: bakes one seamless 7.2 m x 7.2 m wet city pavement tile (concrete slabs beside the
road) from the CC0 Poly Haven scan "Concrete Pavement" (Charlotte Baglioni) and encodes it to KTX2. Same maps, packing,
colour spaces and KTX2 settings as assets-src/neon-asphalt/bake.py, so the Neon road material can load it by set name.
Run from the repo root (inputs: $HOME/.cache/skyline-rush/polyhaven, fetched by scripts/assets/fetch_polyhaven.py fetch):

  "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-pavement/bake.py [-- <png-dir> [--no-encode]]

Why concrete_pavement: plain grey 0.6 m x 0.3 m slabs in a half-slab running bond, the ordinary downtown sidewalk of the
Neon concept frames; flat slabs with crisp joints give the wet mirror its broken, per-slab neon streaks. The scan is a
warm grey (mean linear albedo 0.185), so it is desaturated toward a cool grey at a fixed mean albedo (GRADE_*).

Tile maps (one UV repeat = TILE_M in both axes; u, v = world metres / TILE_M; slab rows run along u):
  basecolor  sRGB          graded scan x per-slab tone x slow drift, grime in the joints.
  normal     linear        tangent space, OpenGL (+Y = increasing v): scan detail + a small random tilt per slab.
  packed     linear        R = ambient occlusion, G = dry roughness, B = puddle mask (0 dry .. 1 standing water).
Rows are written bottom row first (v = 0), so KTX2 row 0 is v = 0 as three.js uploads it (flipY = false).
The tile is 12 slabs x 24 rows and its edges lie on joints, so it repeats without seams. Deterministic: fixed seed.
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
OUT_KTX2 = os.path.join(REPO, "public", "materials", "neon-pavement")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
POS = [a for a in ARGV if not a.startswith("--")]
OUT_PNG = POS[0] if POS else os.path.join(tempfile.gettempdir(), "skyline-rush-neon-pavement")

TILE_M = 7.2            # metres per UV repeat
SCAN_M = 1.8            # metres the scan covers (Poly Haven dimensions); already seamless
SCAN_REPEATS = round(TILE_M / SCAN_M)
SLAB_M, ROW_M = 0.6, 0.3   # scan joints: rows every 1/6, slabs every 1/3, odd rows shifted half a slab (measured)
SLABS, ROWS = round(TILE_M / SLAB_M), round(TILE_M / ROW_M)
RESOLUTIONS = (1024, 2048)
FIELD_N = 2048          # per-slab fields at bake resolution: slab steps stay crisp
SEED = 20261115
FLATTEN = 0.6           # share of the scan's own slab-to-slab tone removed; per-slab tone comes from SEED instead
GRADE_SAT = 0.3         # saturation kept from the warm scan
GRADE_TINT = (0.95, 0.98, 1.06)   # slight cool cast (night city), applied after desaturation
GRADE_ALBEDO = 0.16     # mean linear albedo; x 0.35 (the road material's #a0a0a0) ~= 0.056, a step above the road's 0.042
SLAB_TONE = 0.07        # per-slab albedo spread (1 sigma)
SLAB_TILT = 0.012       # per-slab tilt (radians, 1 sigma): each wet slab mirrors the neon at its own angle
SUNK = 0.07             # share of slabs sunk enough to hold a film of water
SCAN = "concrete_pavement"
FILES = {"diff": "concrete_pavement_diff_4k.jpg", "nor": "concrete_pavement_nor_gl_4k.png",
         "rough": "concrete_pavement_rough_4k.jpg", "ao": "concrete_pavement_ao_4k.jpg"}


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


# ---------------------------------------------------------------- scan preparation (numpy, scene-linear floats)
def load(key):
    """One scan map as float32 (h, w, 3), bottom row first, raw (encoded) values."""
    img = bpy.data.images.load(os.path.join(CACHE, SCAN, FILES[key]), check_existing=False)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[..., :3]


def box(a, k=4):
    n = a.shape[0] // k
    return a.reshape(n, k, n, k, a.shape[2]).mean((1, 3))


def lowpass(a, cycles):
    """Periodic Gaussian blur keeping only variation slower than `cycles` per scan."""
    f = np.fft.fftfreq(a.shape[0], 1 / a.shape[0])
    k = np.exp(-((f[None, :] / cycles) ** 2 + (f[:, None] / cycles) ** 2))[..., None]
    return np.fft.ifft2(np.fft.fft2(a, axes=(0, 1)) * k, axes=(0, 1)).real


def srgb_to_linear(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def grade(diff):
    """Warm grey scan -> cool grey at a fixed mean albedo; returns the graded map and the scan's mean."""
    lum = diff @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    scan_mean = float(lum.mean())
    grey = (lum[..., None] + GRADE_SAT * (diff - lum[..., None])) * np.array(GRADE_TINT, np.float32)
    return grey * (GRADE_ALBEDO / scan_mean), scan_mean


def prepare_scan():
    diff = box(srgb_to_linear(load("diff")))
    nor = box(load("nor") * 2 - 1)
    rough, ao = box(load("rough")[..., :1]), box(load("ao")[..., :1])
    length = np.linalg.norm(nor, axis=2, keepdims=True)
    # Toksvig: averaged normals shorter than 1 mean unresolved bumps; fold them into roughness so the minified look holds.
    rough = np.clip((rough ** 4 + 0.5 * (1 - length) / np.maximum(length, 0.1)) ** 0.25, 0, 1)
    nor = nor / np.maximum(length, 1e-4)
    diff = diff * (diff.mean((0, 1)) / np.maximum(lowpass(diff, 4), 1e-4)) ** FLATTEN   # slab tones repeat every 1.8 m
    diff, scan_mean = grade(np.clip(diff, 0, None))
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


def tile_fields(n=FIELD_N):
    """misc: R colour factor, G joint mask, B dry-roughness offset; aux: R puddle mask, G/B slab tilt; [v, u]."""
    rng = np.random.default_rng(SEED)
    c = (np.arange(n) + 0.5) / n
    u, v = np.broadcast_to(c[None, :], (n, n)), np.broadcast_to(c[:, None], (n, n))
    row_f = v * ROWS
    row = np.floor(row_f).astype(int) % ROWS
    slab_f = u * SLABS - 0.5 * (row % 2)
    slab = np.floor(slab_f).astype(int) % SLABS
    # distance to the nearest joint, metres
    frac = lambda x: x - np.floor(x)
    d = np.minimum(np.minimum(frac(row_f), 1 - frac(row_f)) * ROW_M, np.minimum(frac(slab_f), 1 - frac(slab_f)) * SLAB_M)
    joint = 1 - smoothstep(0.003, 0.011, d)
    pick = lambda table: table[row, slab]
    tone = pick(1 + SLAB_TONE * rng.standard_normal((ROWS, SLABS)))
    tilt = rng.normal(0, SLAB_TILT, (2, ROWS, SLABS))
    sunk = pick(rng.random((ROWS, SLABS)) < SUNK)
    rough_off = pick(0.03 * rng.standard_normal((ROWS, SLABS)))
    drift = 1 + 0.05 * periodic_noise(rng, n, 2, 2)
    colour = tone * drift * (1 - 0.18 * joint)
    worn = periodic_noise(rng, n, 3, 3)
    rough_off = rough_off + 0.05 * joint - 0.025 * worn
    # Puddles: broad shallow pools (~2 m, ragged shores), sunk slabs holding a thin film, water standing in the joints.
    ragged = 0.3 * periodic_noise(rng, n, 30, 30)
    broad = smoothstep(1.35, 1.75, 0.9 * periodic_noise(rng, n, 3, 3) + ragged + 0.25 * worn)
    # a sunk slab only glosses up toward its middle: a full mirror there read as a lit rectangle in the preview
    film = sunk * smoothstep(0.02, 0.12, d) * 0.5
    puddle = np.maximum.reduce([broad, film, 0.6 * joint])
    misc = np.stack([colour / 1.5, joint, rough_off * 0.5 + 0.5], -1)   # colour factor stored / 1.5 to stay in 0..1
    aux = np.stack([puddle, pick(tilt[0]) + 0.5, pick(tilt[1]) + 0.5], -1)
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
    mat = bpy.data.materials.new("neon_pavement")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    lk = nt.links.new

    def node(kind, **props):
        n = nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def tex(img, coord):
        n = node("ShaderNodeTexImage", image=img, interpolation="Linear", extension="REPEAT")
        lk(coord, n.inputs["Vector"])
        return n.outputs["Color"]

    def math(op, a, b=None, c=None, clamp=False):
        n = node("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                lk(v, n.inputs[i]) if not isinstance(v, (int, float)) else setattr(n.inputs[i], "default_value", v)
        return n.outputs[0]

    def vmath(op, a, b=None, c=None):
        n = node("ShaderNodeVectorMath", operation=op)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                lk(v, n.inputs[i]) if not isinstance(v, tuple) else setattr(n.inputs[i], "default_value", v)
        return n.outputs["Vector"]

    def separate(socket):
        n = node("ShaderNodeSeparateColor")
        lk(socket, n.inputs["Color"])
        return n.outputs

    uv = node("ShaderNodeTexCoord").outputs["UV"]
    scan_map = node("ShaderNodeMapping")
    scan_map.inputs["Scale"].default_value = (SCAN_REPEATS, SCAN_REPEATS, 1)
    lk(uv, scan_map.inputs["Vector"])
    diff, nor, rough, ao = (tex(maps[k], scan_map.outputs["Vector"]) for k in ("diff", "nor", "rough", "ao"))
    colour, _, rough_off = separate(tex(maps["misc"], uv))[:3]
    puddle, tilt_u, tilt_v = separate(tex(maps["aux"], uv))[:3]
    scale = node("ShaderNodeVectorMath", operation="SCALE")
    lk(diff, scale.inputs[0])
    lk(math("MULTIPLY", colour, 1.5), scale.inputs[3])
    base = scale.outputs["Vector"]
    dry = math("ADD", separate(rough)[0], math("MULTIPLY_ADD", rough_off, 2.0, -1.0), clamp=True)
    packed = node("ShaderNodeCombineColor")
    lk(separate(ao)[0], packed.inputs["Red"])
    lk(dry, packed.inputs["Green"])
    lk(puddle, packed.inputs["Blue"])
    # scan normal + per-slab tilt (tilt stored + 0.5), renormalised, back to 0..1 for the Normal Map node
    tilt = node("ShaderNodeCombineXYZ")
    lk(math("SUBTRACT", tilt_u, 0.5), tilt.inputs["X"])
    lk(math("SUBTRACT", tilt_v, 0.5), tilt.inputs["Y"])
    n = vmath("MULTIPLY_ADD", nor, (2.0, 2.0, 2.0), (-1.0, -1.0, -1.0))
    n = vmath("NORMALIZE", vmath("ADD", n, tilt.outputs["Vector"]))
    n = vmath("MULTIPLY_ADD", n, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    nmap = node("ShaderNodeNormalMap", space="TANGENT", uv_map="UVMap")
    lk(n, nmap.inputs["Color"])
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
    paths, images = {}, {}
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
            paths[(name, res)], images[(name, res)] = path, img
    return paths, images


def baked_stats(images, res=1024):
    """Measured on the baked output, not the inputs: what the runtime will actually sample."""
    px = lambda key: np.array(images[(key, res)].pixels[:], np.float32).reshape(res, res, 4)
    base, packed = srgb_to_linear(px("basecolor")[..., :3]), px("packed")
    g = packed[..., 1]
    return {"bakedAlbedo": round(float((base @ np.array([0.2126, 0.7152, 0.0722])).mean()), 4),
            "dryRoughness": [round(float(x), 3) for x in (np.percentile(g, 5), g.mean(), np.percentile(g, 95))],
            "puddleCoverage": round(float((packed[..., 2] > 0.5).mean()), 4),
            "aoMean": round(float(packed[..., 0].mean()), 3)}


def encode(paths):
    """PNG -> KTX2: UASTC + zstd (all maps), full mip chain, DFD transfer function set explicitly."""
    os.makedirs(OUT_KTX2, exist_ok=True)
    short = {1024: "1k", 2048: "2k"}
    files = []
    for (name, res), png in paths.items():
        out = os.path.join(OUT_KTX2, f"pavement_{name}_{short[res]}.ktx2")
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
    for fname in FILES.values():
        listed = next(f for f in sources["files"] if f["path"] == f"{SCAN}/{fname}")
        digest = sha256(os.path.join(CACHE, SCAN, fname))
        assert digest == listed["sha256"], f"{fname}: cache differs from sources.json"
        inputs[fname] = digest
    diff, nor, rough, ao, scan_mean = prepare_scan()
    misc, aux, puddle = tile_fields()
    maps = {"diff": float_image("scan_diff", diff), "nor": float_image("scan_nor", nor),
            "rough": float_image("scan_rough", rough), "ao": float_image("scan_ao", ao),
            "misc": float_image("field_misc", misc), "aux": float_image("field_aux", aux)}
    bpy.ops.mesh.primitive_plane_add(size=TILE_M)
    plane = bpy.context.active_object
    plane.name = "pavement_tile_7.2m"
    mat, sockets, bsdf, out, nt = build_material(maps)
    plane.data.materials.append(mat)
    paths, images = bake_all(sockets, bsdf, out, nt, plane)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    stats = {"scanAlbedo": round(scan_mean, 4), "gradedAlbedo": GRADE_ALBEDO,
             "fieldPuddleCoverage": round(float((puddle > 0.5).mean()), 4), **baked_stats(images)}
    for img in images.values():   # baked results live in the PNGs / KTX2, not in the master
        bpy.data.images.remove(img)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "neon-pavement.blend"), compress=True)
    if "--no-encode" in ARGV:   # look iteration: PNGs + .blend only
        print("SUMMARY", json.dumps(stats))
        return
    files = encode(paths)
    print("SUMMARY", json.dumps({**stats, "scan": SCAN, "authors": sources["assets"][SCAN]["authors"],
                                  "inputSha256": inputs, "files": files}, indent=1))


main()
