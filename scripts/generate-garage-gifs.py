#!/usr/bin/env python3
"""Produce 3x transparent GIFs from the original, tracked Garage WebP/SVG art."""
import argparse
import io
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
VFX = ROOT / "public/feature-assets/garage-vfx-skins"
STORE = ROOT / "public/feature-assets/garage-store-readiness/raster"
OUT = ROOT / "public/feature-assets/garage-animated"
FRAMES = 12
DURATION_MS = 80


def sources():
    raster = VFX / "raster"
    found = []
    for category, pattern in [
        ("thruster", "thruster-*.webp"),
        ("nitro-trail", "trail-*.webp"),
        ("launch-flare", "flare-*.webp"),
        ("badges-rarity", "badge-*.webp"),
        ("badges-rarity", "rarity-*.webp"),
    ]:
        for path in sorted(raster.glob(pattern)):
            name = path.name.split("@")[0]
            if name == "flare-purple":
                name = "launch-flare-pulse"
            elif category == "nitro-trail":
                name = "nitro-" + name
            elif category == "launch-flare":
                name = "launch-" + name
            found.append((category, name, path))
    for path in sorted(raster.glob("airflow-*.svg")):
        found.append(("airflow", path.name.split("@")[0], path))
    for category in ("nitro-trail", "launch-flare"):
        found.append((category, category + "-basic", VFX / (category + ".svg")))
    for path in sorted(STORE.glob("store-*.webp")):
        found.append(("store-concept", path.name.split("@")[0], path))
    return sorted(found, key=lambda item: item[1])


def load(path):
    if path.suffix == ".svg":
        import cairosvg
        png = cairosvg.svg2png(url=str(path), output_width=288, output_height=288)
        return Image.open(io.BytesIO(png)).convert("RGBA")
    return Image.open(path).convert("RGBA")


def animate(source, category, name, step):
    image = np.asarray(source).copy()
    height, width = image.shape[:2]
    yy, xx = np.mgrid[:height, :width].astype(np.float32)
    phase = 2 * math.pi * step / FRAMES
    x, y = xx / width, yy / height
    cx, cy = x - .5, y - .5
    radius = np.sqrt(cx * cx + cy * cy)
    rgb = image[:, :, :3].astype(np.float32)
    value = rgb.max(axis=2)
    saturation = value - rgb.min(axis=2)
    painted = image[:, :, 3] > 28
    active = painted & (value > 65) & (saturation > 26)
    dx, dy = np.zeros_like(x), np.zeros_like(y)
    light = np.ones_like(x)
    if category == "thruster":
        # Flame/nozzle emissive pixels move independently of the metal casing.
        active &= (y > .29) & (radius < .55)
        dx = 3.2 * np.sin(phase + 9 * y) * y
        dy = 5.2 * np.sin(phase + 11 * x + 4 * y) * y
        light = 1 + .22 * np.sin(phase + 15 * y - 3 * x)
    elif category == "airflow":
        # Morph curved streamlines rather than translating the complete icon.
        active = painted
        dx = 4 * np.sin(2 * math.pi * (2 * y - x) - phase)
        dy = 3 * np.cos(2 * math.pi * (x + y) - phase)
        light = 1 + .17 * np.sin(2 * math.pi * (3 * x + y) - phase)
    elif category == "nitro-trail":
        active &= radius < .6
        dx = 4 * np.sin(2 * math.pi * (2.5 * y + x) - phase)
        dy = 3 * np.cos(2 * math.pi * (3 * x - y) + phase)
        light = 1 + .30 * np.sin(2 * math.pi * (3 * x - 2 * y) - phase)
    elif category == "launch-flare":
        active &= (radius > .08) & (radius < .61)
        dx = cx / np.maximum(radius, .03) * 5.3 * np.sin(phase + 10 * radius)
        dy = cy / np.maximum(radius, .03) * 5.3 * np.sin(phase + 10 * radius)
        light = 1 + .28 * np.sin(phase + 12 * radius)
    elif category == "badges-rarity":
        # Material reflection changes the original badge pixels directly.
        active = painted & (value > 65)
        dx = 1.3 * np.sin(phase + 8 * y) * (radius > .24)
        light = 1 + .36 * np.exp(-((x - (.1 + .8 * (.5 + .5 * np.sin(phase)))) / .12) ** 2)
    elif category == "store-concept":
        if name in ("store-box", "store-bundle"):
            # Physically separate the lid from the unchanged body.
            lid = painted & (y < .48) & (x > .12) & (x < .90)
            lift = int(round((.5 - .5 * math.cos(phase)) * height * .11))
            out = image.copy()
            out[lid] = 0
            ys, xs = np.where(lid)
            out[np.maximum(ys - lift, 0), xs] = image[ys, xs]
            return Image.fromarray(out, "RGBA")
        active &= radius < .6
        dx = 2.6 * np.sin(phase + 10 * y)
        dy = 3.5 * np.cos(phase + 9 * x)
        light = 1 + .17 * np.sin(phase + 9 * (x + y))
    sx = np.clip(np.rint(xx - dx).astype(np.int32), 0, width - 1)
    sy = np.clip(np.rint(yy - dy).astype(np.int32), 0, height - 1)
    warped = image[sy, sx].copy()
    warped[:, :, :3] = np.clip(warped[:, :, :3].astype(np.float32) * light[:, :, None],
                              0, 255).astype("uint8")
    return Image.fromarray(np.where(active[:, :, None], warped, image).astype("uint8"), "RGBA")


def palettize(frame):
    rgba = np.asarray(frame)
    rgb = Image.fromarray(rgba[:, :, :3], "RGB").quantize(
        colors=95, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    indices = np.asarray(rgb).astype("uint8") + 1
    indices[rgba[:, :, 3] < 30] = 0
    indexed = Image.fromarray(indices, "P")
    palette = [0, 0, 0] + rgb.getpalette()[:285]
    indexed.putpalette((palette + [0] * 768)[:768])
    indexed.info["transparency"] = 0
    return indexed


def render(category, name, path):
    original = load(path)
    pixels = 216 if category in ("store-concept", "badges-rarity") else 288
    if original.size != (pixels, pixels):
        raise AssertionError(f"{path}: expected {pixels}x{pixels}, got {original.size}")
    if not np.any(np.asarray(original)[:, :, 3] == 0):
        raise AssertionError(f"{path}: missing source transparency")
    frames = [palettize(animate(original, category, name, i)) for i in range(FRAMES)]
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{name}@3x.gif"
    frames[0].save(dest, save_all=True, append_images=frames[1:], loop=0,
                   duration=DURATION_MS, transparency=0, disposal=2, optimize=False)
    with Image.open(dest) as gif:
        if gif.n_frames < 4 or gif.info.get("loop") != 0 or gif.size != original.size:
            raise AssertionError(f"bad animation header: {dest}")
        transparent = gif.info.get("transparency") is not None
        initial = np.asarray(gif.convert("RGBA"))
        differences = sum(np.any(np.asarray(frame.convert("RGBA")) != initial)
                          for frame in ImageSequence.Iterator(gif))
        if differences < 3 or not transparent:
            raise AssertionError(f"no material animation or alpha: {dest}")
    size = dest.stat().st_size
    if size > 1_000_000:
        raise AssertionError(f"{dest}: exceeds 1 MB ({size})")
    return {"name": name, "category": category, "source": path.relative_to(ROOT).as_posix(),
            "file": dest.relative_to(ROOT).as_posix(), "size": size,
            "width": pixels, "height": pixels, "frames": FRAMES, "fps": 12.5}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Generate only one icon for focused testing")
    args = parser.parse_args()
    assets = sources()
    if not args.only and len(assets) != 39:
        raise AssertionError(f"expected 39 original art assets, found {len(assets)}")
    results = [render(category, name, path) for category, name, path in assets
               if not args.only or name == args.only]
    if not results:
        raise ValueError(f"no source for {args.only!r}")
    if not args.only:
        (OUT / "manifest.json").write_text(json.dumps(results, indent=2) + "\n")
    print(f"Rendered {len(results)} animated GIFs: {sum(r['size'] for r in results)} bytes")


if __name__ == "__main__":
    main()
