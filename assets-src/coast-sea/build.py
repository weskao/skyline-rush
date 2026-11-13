"""Coast sea wave texture: one tileable 1024 x 1024 map for the water shader (src/coast-sea.ts).

  R, G = world-space normal x, z of an ocean height field (n * 0.5 + 0.5; y is rebuilt in the shader)
  B    = whitecap foam, where the choppy surface folds (Jacobian of the horizontal displacement)

The height field is the Tessendorf (2001) FFT ocean with a Phillips spectrum, the model film and game oceans use; a
water surface cannot be photoscanned. There is no third-party input and no .blend master: this script is the source.
Any Python with numpy runs it; Blender's bundled one is what the other asset scripts use. From the repo root:

  "$BLENDER_BIN" --background --factory-startup --python assets-src/coast-sea/build.py [-- <ppm-dir>] [--no-encode]

Deterministic: fixed seed, no wall-clock input. Prints SUMMARY for src/coast-sea-manifest.ts.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "public", "environments", "sea", "coast_sea_waves_1k.ktx2")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DIRS = [a for a in ARGV if not a.startswith("--")]
OUT_PPM = DIRS[0] if DIRS else os.path.join(tempfile.gettempdir(), "skyline-rush-coast-sea")

SIZE = 1024            # texels
PATCH = 64.0           # metres the tile spans at uv scale 1 / 64
WIND = (0.94, 0.34)    # unit direction the waves travel
WIND_SPEED = 7.0       # m/s: the largest wave is about WIND_SPEED^2 / g = 5 m long
RIPPLE = 0.12          # metres: waves shorter than this are damped (they alias in the smaller mips)
SLOPE_RMS = 0.22       # the shader scales this per layer
CHOP = 1.3             # horizontal displacement factor used for the foam fold test only
FOAM_COVER = 0.07      # fraction of the surface with any foam
SEED = 20261114


def main():
    rng = np.random.default_rng(SEED)
    freq = 2 * np.pi * np.fft.fftfreq(SIZE, d=PATCH / SIZE)
    kx, kz = np.meshgrid(freq, freq)            # kx along columns (u, world x), kz along rows (v, world z)
    k = np.hypot(kx, kz)
    k[0, 0] = 1
    along = (kx * WIND[0] + kz * WIND[1]) / k
    largest = WIND_SPEED ** 2 / 9.81
    phillips = np.exp(-1 / (k * largest) ** 2) / k ** 4 * along ** 2 * np.exp(-(k * RIPPLE) ** 2)
    phillips[along < 0] *= 0.2                  # few waves run against the wind
    phillips[0, 0] = 0
    spectrum = (rng.standard_normal((SIZE, SIZE)) + 1j * rng.standard_normal((SIZE, SIZE))) * np.sqrt(phillips / 2)

    def field(factor):
        return np.fft.ifft2(factor * spectrum).real

    slope_x, slope_z = field(1j * kx), field(1j * kz)
    gain = SLOPE_RMS / np.sqrt(np.mean(slope_x ** 2 + slope_z ** 2))
    slope_x *= gain
    slope_z *= gain
    length = np.sqrt(slope_x ** 2 + slope_z ** 2 + 1)
    normal_x, normal_z = -slope_x / length, -slope_z / length

    # Foam where the choppy surface folds: J = det(d(position + CHOP * displacement) / d(position)) drops toward 0.
    jxx = 1 + CHOP * gain * field(kx * kx / k)
    jzz = 1 + CHOP * gain * field(kz * kz / k)
    jxz = CHOP * gain * field(kx * kz / k)
    fold = jxx * jzz - jxz ** 2
    start, full = np.quantile(fold, FOAM_COVER), np.quantile(fold, 0.004)
    foam = np.clip((start - fold) / (start - full), 0, 1)

    rgb = np.stack([normal_x * 0.5 + 0.5, normal_z * 0.5 + 0.5, foam], -1)
    assert rgb[..., :2].min() > 0.02 and rgb[..., :2].max() < 0.98, "normal clips: lower SLOPE_RMS"
    pixels = np.clip(np.rint(rgb * 255), 0, 255).astype(np.uint8)
    os.makedirs(OUT_PPM, exist_ok=True)
    ppm = os.path.join(OUT_PPM, "coast_sea_waves_1k.ppm")
    with open(ppm, "wb") as f:
        f.write(b"P6\n%d %d\n255\n" % (SIZE, SIZE) + pixels.tobytes())
    summary = {"size": SIZE, "patchMetres": PATCH, "slopeRms": SLOPE_RMS, "foamCover": round(float((foam > 0).mean()), 4),
               "ppmSha256": hashlib.sha256(pixels.tobytes()).hexdigest()}
    if "--no-encode" not in ARGV:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        subprocess.run(["toktx", "--t2", "--encode", "uastc", "--uastc_quality", "3", "--zcmp", "19", "--genmipmap",
                        "--assign_oetf", "linear", "--assign_primaries", "none", OUT, ppm], check=True)
        data = open(OUT, "rb").read()
        summary.update(url=os.path.relpath(OUT, os.path.join(REPO, "public")), bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    print("SUMMARY", json.dumps(summary, indent=1))


main()
