"""Coast visible sky (owner decision D3): the Poly Haven lighting HDRIs at a higher resolution, upper hemisphere only,
as KTX2 for the sky dome. Run from the repo root (inputs: $HOME/.cache/skyline-rush/polyhaven, fetched by
scripts/assets/fetch_polyhaven.py):

  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-sky/build.py [-- <png-dir>] [--no-encode]

Blender is used only for its HDR reader and bundled numpy; there is no .blend master: the editable source is the
Poly Haven .hdr plus this script.

Encoding (one file per HDRI and width, 4:1, rows written zenith first so KTX2 v = 0 is the zenith):
  stored = sRGB_OETF(shoulder(linear) / RANGE), 8 bit, triangular dither, then UASTC + zstd with a full mip chain.
  The dome material multiplies by RANGE (src/coast-lighting.ts `sky.range`) to get scene-linear radiance back.
  shoulder() is the identity below 0.6 * RANGE and rolls off smoothly to RANGE above it, so the halo around the sun
  keeps its gradient instead of clipping to a flat patch. The sun itself is the game's own HDR disc.
Also printed in SUMMARY for src/coast-lighting.ts: the sun direction (three.js equirect convention,
u = atan2(z, x) / 2pi + 0.5) and the mean horizon colour. Deterministic: fixed seed, no wall-clock input.
"""
import hashlib
import json
import os
import struct
import subprocess
import sys
import tempfile
import zlib

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CACHE = os.environ.get("POLYHAVEN_CACHE", os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven"))
OUT_KTX2 = os.path.join(REPO, "public", "environments", "sky")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PNG_ARGS = [a for a in ARGV if not a.startswith("--")]
OUT_PNG = PNG_ARGS[0] if PNG_ARGS else os.path.join(tempfile.gettempdir(), "skyline-rush-coast-sky")

# variant -> (Poly Haven id, RANGE). RANGE sits near the 99th percentile of the upper hemisphere: lower keeps more of
# the 8 bits for the sky gradient, higher keeps more cloud highlight before the shoulder.
SKIES = {
    "day": ("kloofendal_48d_partly_cloudy_puresky", 2.5),
    "dusk": ("qwantani_sunset_puresky", 4.0),
    "rain": ("belfast_sunset_puresky", 6.0),
    "fog": ("kloofendal_overcast_puresky", 4.0),
}
SIZES = {"4k": 4096, "8k": 8192}
KNEE = 0.6
SEED = 20261114
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def load_upper(path):
    """Upper hemisphere of an equirect .hdr as float32 (rows zenith first, scene-linear Rec.709)."""
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[h // 2:, :, :3][::-1]   # Blender rows are bottom first


def measure(sky):
    """Sun direction: luminance-weighted centroid of the brightest 0.02 % of the hemisphere. Horizon: lowest 1 degree."""
    h, w, _ = sky.shape
    lum = sky @ LUMA
    lat = (1 - (np.arange(h, dtype=np.float32) + 0.5) / h) * (np.pi / 2)
    lon = ((np.arange(w, dtype=np.float32) + 0.5) / w - 0.5) * 2 * np.pi
    mask = lum >= np.quantile(lum, 0.9998)
    rows, cols = np.nonzero(mask)
    weight = lum[mask].astype(np.float64) * np.cos(lat[rows])
    d = np.stack([np.cos(lat[rows]) * np.cos(lon[cols]), np.sin(lat[rows]), np.cos(lat[rows]) * np.sin(lon[cols])], -1)
    d = (d * weight[:, None]).sum(0)
    d /= np.linalg.norm(d)
    band = sky[h - max(1, h // 90):].reshape(-1, 3).astype(np.float64).mean(0)
    return {"sunDirection": [round(float(v), 4) for v in d], "sunElevationDeg": round(float(np.degrees(np.arcsin(d[1]))), 2),
            "peakLuminance": round(float(lum.max()), 1), "horizon": [round(float(v), 3) for v in band]}


def encode_srgb8(sky, rng_range, rng):
    k = KNEE * rng_range
    x = np.maximum(sky, 0)
    over = np.maximum(x - k, 0)
    x = np.where(x > k, k + (rng_range - k) * (1 - np.exp(-over / (rng_range - k))), x) / rng_range
    x = np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-8), 1 / 2.4) - 0.055)
    dither = rng.random(x.shape, dtype=np.float32) - rng.random(x.shape, dtype=np.float32)   # triangular, +-1 LSB
    return np.clip(np.rint(x * 255 + dither * 0.5), 0, 255).astype(np.uint8)


def write_png(path, rgb):
    h, w, _ = rgb.shape
    raw = np.concatenate([np.zeros((h, 1), dtype=np.uint8), rgb.reshape(h, w * 3)], axis=1).tobytes()   # filter 0 per row

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def to_ktx2(png, out):
    """PNG -> KTX2: UASTC + zstd, full mip chain, sRGB transfer. First PNG row (zenith) stays at t = 0."""
    subprocess.run(["toktx", "--t2", "--encode", "uastc", "--uastc_quality", "3", "--zcmp", "19", "--genmipmap",
                    "--assign_oetf", "srgb", "--assign_primaries", "bt709", "--uastc_rdo_l", "0.5", out, png], check=True)


def main():
    os.makedirs(OUT_PNG, exist_ok=True)
    os.makedirs(OUT_KTX2, exist_ok=True)
    sources = json.load(open(os.path.join(CACHE, "sources.json")))
    rng = np.random.default_rng(SEED)
    summary = {}
    for variant, (asset, rng_range) in SKIES.items():
        entry = {"asset": asset, "authors": sources["assets"][asset]["authors"], "range": rng_range, "inputSha256": {}, "files": []}
        for label, width in SIZES.items():
            name = f"{asset}_{label}.hdr"
            path = os.path.join(CACHE, asset, name)
            listed = next(f for f in sources["files"] if f["path"] == f"{asset}/{name}")
            digest = sha256(path)
            assert digest == listed["sha256"], f"{name}: cache differs from sources.json"
            entry["inputSha256"][name] = digest
            sky = load_upper(path)
            assert sky.shape[:2] == (width // 4, width), f"{name}: expected {width}x{width // 2}, got {sky.shape}"
            if label == "4k":
                entry.update(measure(sky))
            png = os.path.join(OUT_PNG, f"{asset}_sky_{label}.png")
            write_png(png, encode_srgb8(sky, rng_range, rng))
            del sky
            if "--no-encode" in ARGV:
                continue
            out = os.path.join(OUT_KTX2, f"{asset}_sky_{label}.ktx2")
            to_ktx2(png, out)
            data = open(out, "rb").read()
            entry["files"].append({"width": width, "url": os.path.relpath(out, os.path.join(REPO, "public")),
                                   "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        summary[variant] = entry
    print("SUMMARY", json.dumps(summary, indent=1))


main()
