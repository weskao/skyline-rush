"""Neon Downtown night sky (Task 5b step 3, owner decisions N1, N2): one CC0 Poly Haven night-city HDRI, shipped the
way Coast's are, for two environments. Run from the repo root after `python3 -I assets-src/neon-sky/fetch.py`:

  "$BLENDER_BIN" --background --factory-startup --python assets-src/neon-sky/build.py [-- <png-dir>] [--no-encode]

  night  the HDRI with the wedge fill (FILL): public/environments/<id>_1k.hdr (environment map, PMREM 256 at runtime)
         and the upper hemisphere as the sky dome, public/environments/sky/<id>_sky_{4k,8k}.ktx2.
  rain   the same city, wetter and hazier: RAIN_GRADE below applied to every resolution of the same source (no
         rain-night city HDRI on Poly Haven fits), shipped as <id>_rain_1k.hdr and <id>_rain_sky_{4k,8k}.ktx2.

The dome encoding is Coast's (assets-src/coast-sky/build.py): stored = sRGB_OETF(shoulder(linear) / range), 8 bit,
triangular dither, UASTC + zstd, full mip chain, zenith row first; the dome multiplies by `range` to decode.
Writes assets-src/neon-sky/manifest.json (inputs, outputs, measured key light and sky data); README.md explains it.
Blender is used for its HDR reader and bundled numpy; there is no .blend master. Deterministic: fixed seed.
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
IO = os.path.join(HERE, "hdr_io.py")                              # load_full, save_hdr (Radiance RGBE)
exec(compile(open(IO).read(), IO, "exec"))  # noqa: S102

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
# Violet storm (concept frame 07, the canal): texels move toward `colour` (linear RGB) at their own luminance, so Eh,
# the bands, the sharpness, the horizon and `gain` stay the download's. `sky` is the share for the night sky at or
# below `fullBelow` radiance, none at `noneAbove` (lamps, LED facades and the lit skyline keep their colour); `haze`
# is the share for the rain veil's colour, which is most of the rain sky below 25 degrees. The 1k maps carry `env` of
# both shares: the wet road mirrors them, and at the full share the rain harbour road read violet. The key light's
# colour is measured before the tint: it stands for the city's lamps.
TINT = {"colour": [0.8, 0.47, 1.0], "sky": 0.5, "haze": 1.0, "env": 0.15, "fullBelow": 1.0, "noneAbove": 3.0}
# Dome decode range per environment: the knee (0.6 * range) sits above the measured horizon glow (`sky.horizon`, about
# 2.3 night and 1.5 rain), so the city glow stays linear and only the lamps and LED facades roll off in Coast's
# shoulder. The 99.5th percentile (`sky.p995`, 12 to 24) is lamps; spending the 8 bits there would band the dark sky.
RANGES = {"night": 4.0, "rain": 3.0}
# No legible signage (look brief): the far LED towers carry ~1 degree vertical text, the near embankment facade and
# rooftop signs (box below) read at 4K/8K. Up to `fullDeg` (fading by `fadeDeg`) and in each box (`featherDeg` edge),
# LED facades get a Gaussian blur of `sigmaDeg` (degrees, so 4K and 8K match): chroma (max - min) / max above
# `signs.chroma` and max channel above `signs.peak`, grown by a `signs.growDeg` box (full where `signs.share` of it is
# LED). Blurring the whole band halved the gradient (`sky.sharpness` vs `sourceSharpness`); 1k maps are not softened.
SOFTEN = {"sigmaDeg": 0.25, "fullDeg": 22.0, "fadeDeg": 26.0, "featherDeg": 1.0,
          "signs": {"chroma": 0.6, "peak": 3.0, "growDeg": 1.5, "share": 0.3},
          "boxes": [{"lonDeg": [-166.0, -156.0], "elDeg": [35.0, 41.0]}]}
# Wedge fill (domes and 1k maps): the near floodlit embankment buildings and trees fill lon -180..-68 and +114..180 up to
# about 43 degrees at 8x the rest of the sky, and the harbour (heading 180) drives straight at them. `lonDeg` (wrapping)
# below `fullDeg` (fading by `fadeDeg`) becomes a far shore: below `shoreDeg` whole shifted columns of the generic far
# skyline (`pieces`; no LED, crown or iconic tower), then the city's horizon haze up to `hazeDeg` (per row of
# `hazeLonDeg`: the median on the domes, the sky between the towers; the mean on the 1k maps, the towers' light, so the
# far shore lights the road as a city and not as an empty sky), then the pieces' clouds. 72 source degrees for 178 of
# wedge: a full-height copy repeated a tower in one view. The two source spans' clouds differ 30 to 40% in luminance,
# a step at every piece boundary, so `level` scales each piece's clouds to the sky beside the wedge: gain = (a ramp
# between the mean luminance of the `spanDeg` either side of the wedge) / (the piece's luminance, low-passed over
# `lonDeg` and `elDeg`), within `maxGain`. Feathers: `featherDeg` at the shore, `skyFeatherDeg` in the sky. The 1k maps
# keep the wall's horizontal irradiance as overhead city glow (`glowDeg`, wall colour): the wet road stops mirroring it.
FILL = {"lonDeg": [114.0, 292.0], "fullDeg": 50.0, "fadeDeg": 62.0, "shoreDeg": [3.0, 8.0], "hazeDeg": [15.0, 25.0],
        "hazeLonDeg": [-65.0, 114.0], "featherDeg": 1.0, "skyFeatherDeg": 8.0, "glowDeg": [40.0, 60.0],
        "level": {"lonDeg": 5.0, "elDeg": 2.0, "spanDeg": 16.0, "maxGain": 2.0},
        "pieces": [{"lonDeg": [114.0, 149.0], "sourceLonDeg": [-18.0, 17.0]},
                   {"lonDeg": [149.0, 186.0], "sourceLonDeg": [71.0, 108.0]},
                   {"lonDeg": [186.0, 221.0], "sourceLonDeg": [-18.0, 17.0]},
                   {"lonDeg": [221.0, 258.0], "sourceLonDeg": [71.0, 108.0]},
                   {"lonDeg": [258.0, 292.0], "sourceLonDeg": [-18.0, 16.0]}]}
# Luminance per 30-degree longitude bin, elevation 0..45 (what a chase camera sees of the dome): `sky.bandByLon` on the
# shipped dome, `sky.sourceBandByLon` before the fill. `sky.fillSteps`: the luminance jump across each piece boundary of
# the shipped dome, elevation STEP_EL_DEG (the pieces' clouds), max(l / r, r / l) of the mean of the STEP_DEG either
# side, STEP_CLEAR_DEG clear of it.
BAND_BIN_DEG, BAND_TOP_DEG = 30, 45
STEP_EL_DEG, STEP_DEG, STEP_CLEAR_DEG = (27.0, 50.0), 8.0, 4.0
# Street axes in the HDRI frame: the longitude the runtime turns straight ahead of the grid (`sky.ahead`) and every 90
# degrees from it. The lap drives all four, so a key that can glint off the car is aimed along one (on_street_axis):
# night's. Rain's key (el 76.7 when measured clean, 80.3 since the 1k haze took the towers' light) stays where the
# filled sky puts it. STREET_KEY also sets the turned key's elevation, the middle of what a live High race read clean
# (px of luma >= 235 on the player car): a key straight ahead mirrors off the rear glass at 50, 54.6 and 56 degrees
# (3911, 1366 and 365 px), one straight behind off the rear deck at 66 and 70 (161 and 1090); 58.2 to 62 read 0 both
# ways. The filled sky's own elevation moves with the fill: 58.2, then 54.6 once the 1k haze carried the towers' light.
AHEAD_DEG, STREET_KEY = 30.0, {"night": 60.0}
SIZES = {"4k": 4096, "8k": 8192}


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
    raw, sg = sky[top:].astype(np.float64), SOFTEN["signs"]
    peak = raw.max(2)
    led = ((peak - raw.min(2)) > sg["chroma"] * peak) & (peak > sg["peak"])
    g = max(1, int(round(sg["growDeg"] * px_per_deg / 2)))
    grown = np.clip(box(box(led.astype(np.float64), g, 1, True), g, 0, False) / sg["share"], 0, 1)
    t = np.clip((SOFTEN["fadeDeg"] - el) / (SOFTEN["fadeDeg"] - SOFTEN["fullDeg"]), 0, 1) * grown
    for b in SOFTEN["boxes"]:
        t = np.maximum(t, inside(lon, *b["lonDeg"]) * inside(el, *b["elDeg"]))
    out = sky.copy()
    out[top:] = (sky[top:] * (1 - t[..., None]) + band * t[..., None]).astype(np.float32)
    return out


def smooth(x, lo, hi):
    """1 at or below `lo`, 0 at or above `hi`, linear between."""
    return np.clip((hi - x) / (hi - lo), 0, 1).astype(np.float32)


def fill_wedge(img, upper_only):
    """FILL on an equirect (rows zenith first; the whole sphere or its upper half)."""
    h, w, _ = img.shape
    lon = ((np.arange(w) + 0.5) / w - 0.5) * 360
    el = np.degrees(elevations(h, upper_only))[:, None]
    f, sf, pieces = FILL["featherDeg"], FILL["skyFeatherDeg"], FILL["pieces"]
    lo, hi = FILL["lonDeg"]
    assert pieces[0]["lonDeg"][0] == lo and pieces[-1]["lonDeg"][1] == hi, FILL
    shore = smooth(el, *FILL["shoreDeg"])                         # 1 on the shore, 0 in the sky

    def ramp(rel, width, g, first, last):
        """Lon weight of a span `width` wide, edges feathered `g`; the outer pieces run on under the sky feather."""
        start = (rel > -sf) * 1.0 if first else np.clip(rel / g + 0.5, 0, 1)
        end = (rel < width + sf) * 1.0 if last else np.clip((width - rel) / g + 0.5, 0, 1)
        return (start * end).astype(np.float32)

    def feathered(rel, width, first=False, last=False):
        """Feather f on the shore, sf in the sky (`shore` mixes them by elevation)."""
        return shore * ramp(rel, width, f, first, last)[None] + (1 - shore) * ramp(rel, width, sf, first, last)[None]

    lv, lum = FILL["level"], img @ LUMA
    r_lon, r_el = (max(1, int(round(lv[k] * w / 360))) for k in ("lonDeg", "elDeg"))
    low = box(box(box(lum.astype(np.float64), r_lon, 1, True), r_lon, 1, True), r_el, 0, False)

    def beside(a):
        """Per-row mean luminance of the `spanDeg` of sky starting at lon `a` (outside the wedge), smoothed in elevation."""
        return box(lum[:, ((lon - a) % 360) <= lv["spanDeg"]].astype(np.float64).mean(1), r_el, 0, False)[:, None]
    into = (lon - lo + 90) % 360 - 90                             # degrees into the wedge: no wrap inside its feathers
    left, right = beside(lo - sf / 2 - lv["spanDeg"]), beside(hi + sf / 2)
    target = left + (right - left) * np.clip(into / (hi - lo), 0, 1)[None]
    clouds = (1 - shore) * (1 - smooth(el, *FILL["hazeDeg"]))     # where a piece's own sky shows
    shifted = np.zeros_like(img)
    for i, piece in enumerate(pieces):
        d0, d1 = piece["lonDeg"]
        s0, s1 = piece["sourceLonDeg"]
        assert s1 - s0 == d1 - d0 and (i == 0 or d0 == pieces[i - 1]["lonDeg"][1]), piece
        rel = (lon - d0 + 180) % 360 - 180                       # degrees past the piece start, wrapped
        col = np.rint(((s0 + rel + 180) % 360) / 360 * w - 0.5).astype(int) % w
        gain = np.clip(target / np.maximum(low[:, col], 1e-6), 1 / lv["maxGain"], lv["maxGain"])
        weight = feathered(rel, d1 - d0, i == 0, i == len(pieces) - 1) * (1 + clouds * (gain - 1))
        shifted += img[:, col] * weight.astype(np.float32)[..., None]
    inside = np.minimum(feathered(into, hi - lo), 1)
    h0, h1 = FILL["hazeLonDeg"]
    far = img[:, (lon >= h0) & (lon <= h1)]
    haze = (np.median(far, axis=1) if upper_only else box(far.astype(np.float64).mean(1), r_el, 0, False))[:, None]
    veil = ((1 - shore) * smooth(el, *FILL["hazeDeg"]))[..., None]  # haze share: 0 at the shore and in the clouds
    fill = shifted * (1 - veil) + haze * veil
    t = (smooth(el, FILL["fullDeg"], FILL["fadeDeg"]) * inside)[..., None]
    return (img * (1 - t) + fill * t).astype(np.float32)


def irradiance(full):
    """Horizontal irradiance (luminance) of the upper hemisphere of a whole-sphere equirect."""
    h = full.shape[0] // 2
    lat = elevations(h, True).astype(np.float64)
    domega = np.cos(lat) * (np.pi / 2 / h) * (2 * np.pi / full.shape[1])
    return float(((full[:h].astype(np.float64) @ LUMA.astype(np.float64)) * (np.sin(lat) * domega)[:, None]).sum())


def keep_irradiance(filled, source):
    """`filled` (FILL on the 1k map) plus the removed light, in its colour, as overhead glow (FILL glowDeg): same Eh."""
    h = filled.shape[0]
    el = np.degrees(elevations(h, False))[:, None, None]
    lost = (source - filled)[: h // 2].reshape(-1, 3).astype(np.float64).sum(0)
    colour = (lost / float(lost @ LUMA)).astype(np.float32)
    lobe = (1 - smooth(el, *FILL["glowDeg"])) * colour             # luminance 1 at the zenith cap
    gain = (irradiance(source) - irradiance(filled)) / irradiance(np.broadcast_to(lobe, filled.shape))
    out = (filled + gain * lobe).astype(np.float32)
    assert abs(irradiance(out) / irradiance(source) - 1) < 1e-3
    return out


def sharpness(sky):
    """Mean |gradient| of log luminance per degree (x, y) over the far skyline, lon -70..110, el 0..22."""
    h, w, _ = sky.shape
    lon = ((np.arange(w) + 0.5) / w - 0.5) * 360
    band = np.log1p(sky[h - int(h * 22 / 90):, (lon > -70) & (lon < 110)].astype(np.float64) @ LUMA.astype(np.float64))
    return [round(float(np.abs(np.diff(band, axis=a)).mean() * w / 360), 3) for a in (1, 0)]


def band_by_lon(sky):
    """BAND_BIN_DEG longitude bins from -180 of the upper hemisphere's mean luminance, elevation 0..BAND_TOP_DEG."""
    h, w, _ = sky.shape
    rows = h - int(round(h * BAND_TOP_DEG / 90))
    lum = sky[rows:] @ LUMA
    edges = [round(i * w * BAND_BIN_DEG / 360) for i in range(360 // BAND_BIN_DEG + 1)]
    return [round(float(lum[:, a:b].mean()), 3) for a, b in zip(edges, edges[1:])]


def fill_steps(sky):
    """`sky.fillSteps` of an upper hemisphere: one jump per FILL piece boundary, wedge start to wedge end."""
    h, w, _ = sky.shape
    el, lon = np.degrees(elevations(h, True)), ((np.arange(w) + 0.5) / w - 0.5) * 360
    cols = (sky[(el >= STEP_EL_DEG[0]) & (el < STEP_EL_DEG[1])] @ LUMA).astype(np.float64).mean(0)
    out = []
    for b in [FILL["lonDeg"][0]] + [p["lonDeg"][1] for p in FILL["pieces"]]:
        l, r = (float(cols[((lon - a) % 360) <= STEP_DEG].mean()) for a in (b - STEP_CLEAR_DEG - STEP_DEG, b + STEP_CLEAR_DEG))
        out.append(round(max(l / r, r / l), 3))
    return out


def tint(rgb, share, dim_only=True):
    """TINT: `rgb` moved `share` of the way to the tint colour at its own luminance (`dim_only`: under the mask)."""
    lum = np.asarray(rgb @ LUMA)[..., None]
    c = np.asarray(TINT["colour"], dtype=np.float32)
    t = share * (smooth(lum, TINT["fullBelow"], TINT["noneAbove"]) if dim_only else 1)
    return (rgb * (1 - t) + lum * (c / (c @ LUMA)) * t).astype(np.float32)


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


def on_street_axis(direction, elevation_deg):
    """The street axis nearest `direction`'s azimuth, at `elevation_deg`."""
    x, _, z = direction
    lon, el = np.radians(AHEAD_DEG + 90 * round((np.degrees(np.arctan2(z, x)) - AHEAD_DEG) / 90)), np.radians(elevation_deg)
    return [round(float(v), 4) for v in (np.cos(el) * np.cos(lon), np.sin(el), np.cos(el) * np.sin(lon))]


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
    glow = horizon_glow(full)                                     # the rain veil's colour as measured; `haze` is its TINT
    haze, env_haze = (tint(glow, TINT["haze"] * s, dim_only=False) for s in (1, TINT["env"]))
    # Both 1k maps carry TINT and FILL with the wall's light kept overhead; rain is the grade of the shipped night map.
    violet = tint(full, TINT["sky"] * TINT["env"])
    filled = fill_wedge(violet, upper_only=False)
    shipped = keep_irradiance(filled, violet)
    night_path, rain_path = os.path.join(OUT_ENV, name1k), os.path.join(OUT_ENV, f"{ASSET}_rain_1k.hdr")
    save_hdr(shipped, night_path)
    save_hdr(grade_rain(load_full(night_path), env_haze, upper_only=False), rain_path)
    # The key light shines from the direction measured on the filled sky the player sees, not on the download: the
    # wall's vector irradiance made a sun at el 27 degrees straight down the harbour, a pinpoint specular that whited
    # out the wet road and the car. Its colour and the irradiance it adds to the road (intensity x sin(elevation)) stay
    # the download's (rain: its grade, through RGBE), whose light the 1k maps keep; `source` keeps that measurement.
    # STREET_KEY then turns the key onto the nearest street axis, at the elevation it names: where the filled sky put
    # night's, the player car's rear deck mirrored it into the chase camera along the harbour, 119 degrees off the
    # heading; `filled` keeps the measurement.
    raw_rain = os.path.join(OUT_PNG, "raw_rain_1k.hdr")
    save_hdr(grade_rain(full, glow, upper_only=False), raw_rain)
    aim = {"night": key_light(filled), "rain": key_light(grade_rain(filled, env_haze, upper_only=False))}
    for name, src_img, path in (("night", full, night_path), ("rain", load_full(raw_rain), rain_path)):
        e = envs[name]
        e["file"], e["inputSha256"][name1k] = os.path.basename(path), digest1k
        e["environment"] = entry_file(path)
        e["irradiance"] = {"source": round(irradiance(src_img), 4), "shipped": round(irradiance(load_full(path)), 4)}
        src, filled_key = key_light(src_img), aim[name]["direction"]
        direction = on_street_axis(filled_key, STREET_KEY[name]) if name in STREET_KEY else filled_key
        scale = src["direction"][1] / direction[1]
        e["fill"] = FILL
        e["key"] = {**src, "direction": direction, "elevationDeg": STREET_KEY.get(name, aim[name]["elevationDeg"]),
                    "filled": {"direction": filled_key},
                    "intensity": round(src["intensity"] * scale, 4), "irradiance": round(src["irradiance"] * scale, 4),
                    "source": {"direction": src["direction"], "elevationDeg": src["elevationDeg"],
                               "intensity": src["intensity"]}}
    envs["rain"]["hazeColor"], envs["rain"]["domeHazeColor"] = ([round(float(v), 4) for v in c] for c in (env_haze, haze))
    del full, violet, filled, shipped

    rng = np.random.default_rng(SEED)
    for label, width in SIZES.items():
        name, path, digest = source(label)
        night = load_upper(path)
        assert night.shape[:2] == (width // 4, width), f"{name}: expected {width}x{width // 2}, got {night.shape}"
        raw = {} if label != "4k" else {"night": sharpness(night),
                                         "rain": sharpness(grade_rain(night, haze, upper_only=True))}
        night = tint(soften_signs(night), TINT["sky"])
        for env_name in ("night", "rain"):
            e = envs[env_name]
            sky = night if env_name == "night" else grade_rain(night, haze, upper_only=True)
            e["inputSha256"][name] = digest
            if label == "4k":   # measured before the fill: the horizon glow (and so `gain`) is the whole city's
                e["sky"] = {**measure(sky), "disc": 0, "p995": round(float(np.quantile(sky @ LUMA, 0.995)), 4),
                            "p90Band0to40": band_p90(sky), "sourceBandByLon": band_by_lon(sky),
                            "sourceSharpness": raw[env_name], "sharpness": sharpness(sky)}
            sky = fill_wedge(sky, upper_only=True)
            if label == "4k":
                e["sky"]["bandByLon"], e["sky"]["fillSteps"] = band_by_lon(sky), fill_steps(sky)
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
                "encoder": "assets-src/coast-sky/build.py", "encoderSha256": sha256(COAST),
                "io": "assets-src/neon-sky/hdr_io.py", "ioSha256": sha256(IO), "tint": TINT, "environments": envs}
    if "--no-encode" not in ARGV:
        with open(os.path.join(HERE, "manifest.json"), "w") as f:
            json.dump(manifest, f, indent=1)
            f.write("\n")
    print("SUMMARY", json.dumps(manifest, indent=1))


main()
