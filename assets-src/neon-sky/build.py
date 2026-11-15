"""Neon Downtown night sky (Task 5b step 3, owner decisions N1, N2): one CC0 Poly Haven night-city HDRI, shipped the
way Coast's are, for two environments. Run from the repo root after `python3 -I assets-src/neon-sky/fetch.py`:

  "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-sky/build.py [-- <png-dir>] [--no-encode]

  night  the HDRI as downloaded: public/environments/<id>_1k.hdr (environment map, PMREM 256 at runtime) and the
         upper hemisphere as the sky dome, public/environments/sky/<id>_sky_{4k,8k}.ktx2.
  rain   the same city, wetter and hazier: RAIN_GRADE below applied to every resolution of the same source (no
         rain-night city HDRI on Poly Haven fits), shipped as <id>_rain_1k.hdr and <id>_rain_sky_{4k,8k}.ktx2.

The dome encoding is Coast's (assets-src/coast-sky/build.py): stored = sRGB_OETF(shoulder(linear) / range), 8 bit,
triangular dither, UASTC + zstd, full mip chain, zenith row first; the dome multiplies by `range` to decode.
Writes assets-src/neon-sky/manifest.json (inputs, outputs, measured key light and sky data); README.md explains it.
Blender is used for its HDR reader/writer and bundled numpy; there is no .blend master. Deterministic: fixed seed.
"""
import hashlib
import json
import os
import shutil
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
COAST = os.path.join(REPO, "assets-src", "coast-sky", "build.py")
# Reuse Coast's encoder (shoulder + sRGB + dither, PNG, toktx) bit for bit. Its script calls main() at import, so only the
# definitions above that call run here. shortcut: exec of a sibling script; move the encoder to scripts/assets/ when a
# third sky needs it.
exec(compile(open(COAST).read().rsplit("\nmain()", 1)[0], COAST, "exec"))  # noqa: S102

CACHE = os.environ.get("POLYHAVEN_CACHE", os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "polyhaven"))
PUBLIC = os.path.join(REPO, "public")
OUT_ENV = os.path.join(PUBLIC, "environments")
OUT_KTX2 = os.path.join(OUT_ENV, "sky")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PNG_ARGS = [a for a in ARGV if not a.startswith("--")]
OUT_PNG = PNG_ARGS[0] if PNG_ARGS else os.path.join(os.path.expanduser("~"), ".cache", "skyline-rush", "neon-sky-png")

ASSET = "shanghai_bund"
# Rain grade, a pure function of direction, so 1k, 4k and 8k agree: fog veils the horizon and replaces it with the
# city's own measured horizon glow, exposure drops, colour flattens.
#   x' = exposure * mix(sat(x), haze, veil * exp(-|elevation| / falloff)),  haze = horizon glow of the 1k source.
RAIN_GRADE = {"exposure": 0.7, "veil": 0.65, "falloffDeg": 14.0, "saturation": 0.8}
# Dome decode range per environment: the knee (0.6 * range) sits above the measured horizon glow (`sky.horizon`, about
# 2.3 night and 1.5 rain), so the city glow stays linear and only the lamps and LED facades roll off in Coast's
# shoulder. The 99.5th percentile (`sky.p995`, 12 to 24) is lamps; spending the 8 bits there would band the dark sky.
RANGES = {"night": 4.0, "rain": 3.0}
# No legible signage (look brief): the far skyline's LED towers carry vertical text about 1 degree tall, and the near
# embankment buildings carry facade signs (17-18 degrees) and a rooftop sign (box below), all readable at 4K or 8K.
# Those directions get a Gaussian blur of `sigmaDeg` (degrees, so 4K and 8K match): the band from the horizon to
# `fullDeg`, fading out by `fadeDeg`, and each lon/el box with a `featherDeg` edge. Glow and silhouettes stay.
# The 1k environment maps are below legibility and are not softened.
SOFTEN = {"sigmaDeg": 0.25, "fullDeg": 22.0, "fadeDeg": 26.0, "featherDeg": 1.0,
          "boxes": [{"lonDeg": [-166.0, -156.0], "elDeg": [35.0, 41.0]}]}
# Wedge fill (domes only): the near floodlit embankment buildings fill lon -180..-84 and +150..180 up to about 43 degrees,
# which the harbour (heading 180, lon -180..-120 ahead) faced as a wall of blurred yellow buildings at 15x the rest of
# the sky. Below `fullDeg` (fading out by `fadeDeg`) those longitudes take whole columns of the far skyline and its sky,
# shifted (never mirrored or resampled, so nothing blurs and no axis of symmetry shows) from `sourceLonDeg`, at least
# 150 degrees from where they land so a chase camera never sees one span twice; `featherDeg` blends each edge. No
# iconic tower (lon +31..+58) is copied. The 1k environment maps keep the wall: its glow lights the city.
FILL = {"featherDeg": 3.0, "fullDeg": 50.0, "fadeDeg": 62.0,
        "pieces": [{"lonDeg": [138.0, 228.0], "sourceLonDeg": [-70.0, 20.0]},
                   {"lonDeg": [228.0, 280.0], "sourceLonDeg": [65.0, 117.0]}]}
# Luminance per 30-degree longitude bin, elevation 0..45 (what a chase camera sees of the dome): `sky.bandByLon` on the
# shipped dome, `sky.sourceBandByLon` before the fill.
BAND_BIN_DEG, BAND_TOP_DEG = 30, 45
SIZES = {"4k": 4096, "8k": 8192}


def load_full(path):
    """Whole equirect .hdr as float32 RGB, rows top (zenith) first."""
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1, :, :3].copy()


def rle(channel):
    """Radiance new-style run-length encoding of one scanline channel: runs of 3+ as (128 + n, byte), else literals."""
    out, i, n = bytearray(), 0, len(channel)
    while i < n:
        r = 1
        while r < 127 and i + r < n and channel[i + r] == channel[i]:
            r += 1
        if r >= 3:
            out += bytes((128 + r, channel[i]))
            i += r
            continue
        j = i
        while j < n and j - i < 128 and not (j + 2 < n and channel[j] == channel[j + 1] == channel[j + 2]):
            j += 1
        out.append(j - i)
        out += channel[i:j]
        i = j
    return out


def save_hdr(rgb, path):
    """Radiance RGBE .hdr, RLE scanlines, rows top first. Blender's own writer is not used: image.save() altered the
    float data (a 26112 peak came back as 72.5). Read back through Blender's reader to prove the round trip."""
    h, w, _ = rgb.shape
    peak = rgb.max(2)
    mant, exp = np.frexp(peak)
    scale = np.where(peak > 1e-32, mant * 256 / np.maximum(peak, 1e-38), 0)
    rgbe = np.concatenate([np.clip(rgb * scale[..., None], 0, 255).astype(np.uint8),
                           np.where(peak > 1e-32, exp + 128, 0).astype(np.uint8)[..., None]], axis=2)
    body = bytearray(f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {h} +X {w}\n".encode())
    for row in rgbe:
        body += bytes((2, 2, w >> 8, w & 255))
        for c in range(4):
            body += rle(row[:, c].tobytes())
    with open(path, "wb") as f:
        f.write(body)
    back = load_full(path)
    # RGBE: one shared exponent and 8-bit mantissas, so the error is bounded by the pixel's brightest channel.
    worst = float((np.abs(back - rgb).max(2) / (rgb.max(2) + 1e-6)).max())
    assert worst < 0.01, f"{path}: RGBE round trip drifted by {worst:.4f} of the pixel maximum"


def elevations(rows, upper_only):
    """Elevation (radians) of each row's centre: full sphere rows span +90..-90, upper hemisphere rows +90..0."""
    span = np.pi / 2 if upper_only else np.pi
    return (np.pi / 2 - (np.arange(rows, dtype=np.float32) + 0.5) / rows * span).astype(np.float32)


def horizon_glow(full):
    """Mean radiance of the 0..1 degree band just above the horizon."""
    h = full.shape[0]
    return full[h // 2 - max(1, h // 180):h // 2].reshape(-1, 3).astype(np.float64).mean(0).astype(np.float32)


def box(a, r, axis, wrap):
    """Box filter of width 2r + 1 along `axis`, wrapping (longitude) or edge-padded (latitude); float64 cumsum."""
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="wrap" if wrap else "edge"), axis=axis)
    n = a.shape[axis]
    return (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis) - np.take(c, np.arange(n), axis)) / (2 * r + 1)


def soften_signs(sky):
    """SOFTEN on an upper hemisphere (rows zenith first): three box passes per axis approximate the Gaussian."""
    h, w, _ = sky.shape
    px_per_deg = w / 360
    r = max(1, int(round((np.sqrt(4 * (SOFTEN["sigmaDeg"] * px_per_deg) ** 2 + 1) - 1) / 2)))  # 3 boxes ~ sigma
    f = SOFTEN["featherDeg"]
    reach = max([SOFTEN["fadeDeg"]] + [b["elDeg"][1] + f for b in SOFTEN["boxes"]])
    top = max(0, h - int(np.ceil((reach + 1) * px_per_deg)) - 3 * r)
    band = sky[top:].astype(np.float64)
    for axis, wrap in ((1, True), (0, False)):
        for _ in range(3):
            band = box(band, r, axis, wrap)
    el = np.degrees(elevations(h, True)[top:])[:, None]
    lon = (((np.arange(w) + 0.5) / w) - 0.5)[None] * 360

    def inside(x, lo, hi):
        return np.clip((x - lo + f) / f, 0, 1) * np.clip((hi + f - x) / f, 0, 1)
    t = np.broadcast_to(np.clip((SOFTEN["fadeDeg"] - el) / (SOFTEN["fadeDeg"] - SOFTEN["fullDeg"]), 0, 1), band.shape[:2])
    for b in SOFTEN["boxes"]:
        t = np.maximum(t, inside(lon, *b["lonDeg"]) * inside(el, *b["elDeg"]))
    out = sky.copy()
    out[top:] = (sky[top:] * (1 - t[..., None]) + band * t[..., None]).astype(np.float32)
    return out


def fill_wedge(img, upper_only):
    """FILL on an equirect (rows zenith first; the whole sphere or its upper half), as whole shifted source columns."""
    h, w, _ = img.shape
    lon = ((np.arange(w) + 0.5) / w - 0.5) * 360
    el = np.degrees(elevations(h, upper_only))[:, None, None]
    f = FILL["featherDeg"]
    total, acc = np.zeros(w, dtype=np.float32), np.zeros_like(img)
    for piece in FILL["pieces"]:
        d0, d1 = piece["lonDeg"]
        s0, s1 = piece["sourceLonDeg"]
        assert s1 - s0 == d1 - d0 and abs((d0 - s0 + 180) % 360 - 180) >= 150, piece
        rel = (lon - d0 + 180) % 360 - 180                       # degrees past the piece start, wrapped
        weight = (np.clip(rel / f + 0.5, 0, 1) * np.clip((d1 - d0 - rel) / f + 0.5, 0, 1)).astype(np.float32)
        col = np.rint(((s0 + rel + 180) % 360) / 360 * w - 0.5).astype(int) % w
        acc += img[:, col] * weight[None, :, None]
        total += weight
    t = np.clip((FILL["fadeDeg"] - el) / (FILL["fadeDeg"] - FILL["fullDeg"]), 0, 1).astype(np.float32)
    return (img * (1 - t * total[None, :, None]) + t * acc).astype(np.float32)


def band_by_lon(sky):
    """BAND_BIN_DEG longitude bins from -180 of the upper hemisphere's mean luminance, elevation 0..BAND_TOP_DEG."""
    h, w, _ = sky.shape
    rows = h - int(round(h * BAND_TOP_DEG / 90))
    lum = sky[rows:] @ LUMA
    edges = [round(i * w * BAND_BIN_DEG / 360) for i in range(360 // BAND_BIN_DEG + 1)]
    return [round(float(lum[:, a:b].mean()), 3) for a, b in zip(edges, edges[1:])]


def grade_rain(rgb, haze, upper_only):
    g = RAIN_GRADE
    lum = (rgb @ LUMA)[..., None]
    x = lum + g["saturation"] * (rgb - lum)
    t = g["veil"] * np.exp(-np.abs(elevations(rgb.shape[0], upper_only)) / np.radians(g["falloffDeg"]))[:, None, None]
    return (g["exposure"] * (x * (1 - t) + haze * t)).astype(np.float32)


def linear_to_hex(c):
    c = np.asarray(c, dtype=np.float64) / max(c)
    s = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    return "#" + "".join(f"{int(round(v * 255)):02x}" for v in s)


def key_light(full):
    """Key light of the environment map the scene is lit by (upper hemisphere of the shipped 1k):
    direction = vector irradiance (sum of L * w * dOmega), so it points where the light comes from on balance;
    intensity = its length (scene-linear; a three.js DirectionalLight of this intensity adds the same irradiance);
    colour = radiance weighted by max(0, w . direction), normalised; ambient = mean radiance of the hemisphere."""
    h = full.shape[0] // 2
    sky = full[:h].astype(np.float64)
    w = sky.shape[1]
    lat = elevations(h, True).astype(np.float64)
    lon = ((np.arange(w) + 0.5) / w - 0.5) * 2 * np.pi
    d = np.stack(np.broadcast_arrays(np.cos(lat)[:, None] * np.cos(lon)[None], np.sin(lat)[:, None] * np.ones(w),
                                     np.cos(lat)[:, None] * np.sin(lon)[None]), -1)
    domega = (np.cos(lat) * (np.pi / 2 / h) * (2 * np.pi / w))[:, None]
    lum = sky @ LUMA.astype(np.float64)
    vec = (d * (lum * domega)[..., None]).sum((0, 1))
    key = vec / np.linalg.norm(vec)
    lobe = np.maximum(d @ key, 0) * domega
    colour = (sky * lobe[..., None]).sum((0, 1))
    return {"direction": [round(float(v), 4) for v in key], "elevationDeg": round(float(np.degrees(np.arcsin(key[1]))), 2),
            "color": linear_to_hex(colour), "intensity": round(float(np.linalg.norm(vec)), 4),
            "irradiance": round(float((lum * lobe).sum()), 4),
            "ambient": round(float((lum * domega).sum() / domega.sum() / w), 4)}


def band_p90(sky):
    """90th percentile luminance of the band the chase camera sees (elevation 0..40 degrees): Coast's `sky.gain` puts
    it at the bloom threshold (gain = threshold / p90)."""
    h = sky.shape[0]
    return round(float(np.quantile(sky[h - int(h * 40 / 90):] @ LUMA, 0.9)), 4)


def entry_file(path):
    data = open(path, "rb").read()
    return {"url": os.path.relpath(path, PUBLIC), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    os.makedirs(OUT_PNG, exist_ok=True)
    os.makedirs(OUT_KTX2, exist_ok=True)
    record = json.load(open(os.path.join(HERE, "sources.json")))["sources"][0]
    assert record["id"] == ASSET and record["license"] == "CC0-1.0"

    def source(label):
        name = f"{ASSET}_{label}.hdr"
        path = os.path.join(CACHE, ASSET, name)
        listed = next(f for f in record["files"] if f["path"] == f"{ASSET}/{name}")
        assert sha256(path) == listed["sha256"], f"{name}: cache differs from sources.json, rerun fetch.py"
        return name, path, listed["sha256"]

    credit = {"license": "CC0-1.0", "creator": ", ".join(record["authors"]), "sourceUrl": record["url"]}
    envs = {name: {"file": None, "credit": credit, "grade": RAIN_GRADE if name == "rain" else None,
                   "soften": SOFTEN, "range": RANGES[name], "inputSha256": {}, "files": []} for name in RANGES}

    name1k, path1k, digest1k = source("1k")
    full = load_full(path1k)
    haze = horizon_glow(full)
    shutil.copyfile(path1k, os.path.join(OUT_ENV, name1k))       # night: the download as is, like Coast
    rain_path = os.path.join(OUT_ENV, f"{ASSET}_rain_1k.hdr")
    rain_full = grade_rain(full, haze, upper_only=False)
    save_hdr(rain_full, rain_path)
    # The key light shines from the direction measured on the filled sky the player sees, not on the shipped map: the
    # wall's vector irradiance made a sun at el 27 degrees straight down the harbour, a pinpoint specular that whited
    # out the wet road and the car. Its colour and the irradiance it adds to the road (intensity x sin(elevation)) stay
    # the shipped map's, since the map still lights the city with the wall's glow; `source` keeps the raw measurement.
    filled = fill_wedge(full, upper_only=False)
    aim = {"night": key_light(filled), "rain": key_light(grade_rain(filled, haze, upper_only=False))}
    for name, img, path in (("night", full, os.path.join(OUT_ENV, name1k)), ("rain", None, rain_path)):
        e = envs[name]
        e["file"], e["inputSha256"][name1k] = os.path.basename(path), digest1k
        e["environment"] = entry_file(path)
        src = key_light(load_full(path) if img is None else img)   # rain: measured on the shipped (RGBE) file
        scale = src["direction"][1] / aim[name]["direction"][1]
        e["fill"] = FILL
        e["key"] = {**src, "direction": aim[name]["direction"], "elevationDeg": aim[name]["elevationDeg"],
                    "intensity": round(src["intensity"] * scale, 4), "irradiance": round(src["irradiance"] * scale, 4),
                    "source": {"direction": src["direction"], "elevationDeg": src["elevationDeg"],
                               "intensity": src["intensity"]}}
    envs["rain"]["hazeColor"] = [round(float(v), 4) for v in haze]
    del full, rain_full, filled

    rng = np.random.default_rng(SEED)
    for label, width in SIZES.items():
        name, path, digest = source(label)
        night = load_upper(path)
        assert night.shape[:2] == (width // 4, width), f"{name}: expected {width}x{width // 2}, got {night.shape}"
        night = soften_signs(night)
        for env_name in ("night", "rain"):
            e = envs[env_name]
            sky = night if env_name == "night" else grade_rain(night, haze, upper_only=True)
            e["inputSha256"][name] = digest
            if label == "4k":   # measured before the fill: the horizon glow (and so `gain`) is the whole city's
                e["sky"] = {**measure(sky), "disc": 0, "p995": round(float(np.quantile(sky @ LUMA, 0.995)), 4),
                            "p90Band0to40": band_p90(sky), "sourceBandByLon": band_by_lon(sky)}
            sky = fill_wedge(sky, upper_only=True)
            if label == "4k":
                e["sky"]["bandByLon"] = band_by_lon(sky)
            stem = ASSET if env_name == "night" else f"{ASSET}_rain"
            png = os.path.join(OUT_PNG, f"{stem}_sky_{label}.png")
            write_png(png, encode_srgb8(sky, e["range"], rng))
            del sky
            if "--no-encode" in ARGV:
                continue
            out = os.path.join(OUT_KTX2, f"{stem}_sky_{label}.ktx2")
            to_ktx2(png, out)
            e["files"].append({"width": width, **entry_file(out)})
        del night

    manifest = {"script": "assets-src/neon-sky/build.py", "scriptSha256": sha256(os.path.abspath(__file__)),
                "encoder": "assets-src/coast-sky/build.py", "encoderSha256": sha256(COAST), "environments": envs}
    if "--no-encode" not in ARGV:
        with open(os.path.join(HERE, "manifest.json"), "w") as f:
            json.dump(manifest, f, indent=1)
            f.write("\n")
    print("SUMMARY", json.dumps(manifest, indent=1))


main()
