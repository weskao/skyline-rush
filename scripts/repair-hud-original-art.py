#!/usr/bin/env python3
"""Repair clipped 3x HUD sprites from the ORIGINAL illustrated WebPs.

The original, pre-redesign Git objects are the only artwork inputs. Do not
repaint icon silhouettes, replace lettering, or upscale cropped sprites.
"""
import argparse
import io
import subprocess
from pathlib import Path

from PIL import Image, ImageFilter

SOURCE_COMMIT = "f67d3bf31012edfa52cc06f46abe586ad5bdd78e"
FOLDER = Path("public/feature-assets/mobile-controls-hud/raster")
NAMES = (
    "button-back", "button-coming-soon", "button-garage", "button-nitro",
    "button-play", "button-retry", "hud-brake", "hud-combo", "hud-drift",
    "hud-nitro", "hud-pause", "hud-speed", "ui-arrow-left",
    "ui-arrow-right", "ui-close", "ui-info", "ui-settings", "ui-tooltip",
)
# These regions belong to adjacent icons in the original sprite sheet.
FOREIGN_LEFT = {
    "button-back": 71, "button-coming-soon": 76,
    "button-garage": 96, "button-retry": 96,
}
FOREIGN_TOP = {
    "hud-brake": 44, "hud-drift": 44, "hud-nitro": 44,
    "ui-arrow-left": 49, "ui-arrow-right": 49, "ui-close": 57,
}
# Approximate centres of the ORIGINAL circular bezels, not new designs.
# Mirrored original metal/energy pixels complete only missing outside arcs.
CIRCLE_GEOMETRY = {
    "hud-brake": (100, 134, 204, 208),
    "hud-drift": (100, 134, 204, 208),
    "hud-nitro": (124, 143, 197, 196),
    "hud-combo": (123, 125, 195, 192),
}
BUTTON_GEOMETRY = {
    "button-coming-soon": (83, 400, 22, 158),
    "button-garage": (100, 408, 20, 154),
    "button-retry": (99, 408, 8, 152),
    "button-nitro": (42, 414, 10, 150),
    "button-play": (48, 407, 15, 154),
}


def original_bytes(name):
    return subprocess.check_output(
        ["git", "show", f"{SOURCE_COMMIT}:{FOLDER}/{name}@3x.webp"]
    )


def alpha_bounds(image):
    return image.getchannel("A").point(
        lambda pixel: 255 if pixel > 16 else 0
    ).getbbox()


def mirror_missing_rim(image, name):
    """Reconstruct only clipped metal/energy circumference from its OWN rim."""
    cx, cy, right, bottom = CIRCLE_GEOMETRY[name]
    w, h = image.size
    stage = Image.new("RGBA", (w + 80, h + 80))
    stage.alpha_composite(image, (32, 32))
    source, target = image.load(), stage.load()
    for ly in range(0, h + 28):
        for lx in range(0, w + 28):
            if lx < right and ly < bottom:
                continue
            if not 65 <= ((lx - cx) ** 2 + (ly - cy) ** 2) ** .5 <= 91:
                continue
            tx, ty = lx + 32, ly + 32
            if target[tx, ty][3] >= 64:
                continue
            candidates = []
            if lx >= right:
                candidates.append((round(2 * cx - lx), ly))
            if ly >= bottom:
                candidates.append((lx, round(2 * cy - ly)))
            candidates.append((round(2 * cx - lx), round(2 * cy - ly)))
            for sx, sy in candidates:
                if 0 <= sx < w and 0 <= sy < h:
                    r, g, b, alpha = source[sx, sy]
                    if alpha > 50 and max(r, g, b) > 95:
                        target[tx, ty] = (r, g, b, alpha)
                        break
    return stage


def mirror_missing_button_frame(image, name):
    """Complete clipped bevel caps using original *same button* materials."""
    left, right, top, bottom = BUTTON_GEOMETRY[name]
    w, h = image.size
    cx, cy = (left + right) / 2, (top + bottom) / 2
    stage = Image.new("RGBA", (w + 80, h + 80))
    stage.alpha_composite(image, (32, 32))
    source, target = image.load(), stage.load()
    for ly in range(top - 2, min(h + 22, bottom + 10)):
        for lx in range(left, min(w + 30, right + 10)):
            if lx < right - 14 and ly < bottom - 14:
                continue
            tx, ty = lx + 32, ly + 32
            if target[tx, ty][3] >= 90:
                continue
            # Paint mirrored boundary only. Never mirror letters or inner symbols.
            sx = round(2 * cx - lx) if lx >= right - 14 else lx
            sy = round(2 * cy - ly) if ly >= bottom - 14 else ly
            for px, py in ((sx, sy), (round(2 * cx - lx), ly), (lx, round(2 * cy - ly))):
                if 0 <= px < w and 0 <= py < h:
                    r, g, b, alpha = source[px, py]
                    if alpha > 35:
                        target[tx, ty] = (r, g, b, alpha)
                        break
    return stage


def cleanup(image, name):
    alpha = image.getchannel("A")
    if name in FOREIGN_LEFT:
        alpha.paste(0, (0, 0, FOREIGN_LEFT[name], image.height))
    if name in FOREIGN_TOP:
        alpha.paste(0, (0, 0, image.width, FOREIGN_TOP[name]))
    image.putalpha(alpha)
    return image


def pack(image, name):
    width, height = (432, 156) if name.startswith("button-") else (216, 216)
    margin = 20 if width == 216 else 14
    bounds = alpha_bounds(image)
    assert bounds is not None, (name, "no artwork")
    # Include faint glows without carrying empty sheet-space or other sprites.
    expanded = (
        max(0, bounds[0] - 3), max(0, bounds[1] - 3),
        min(image.width, bounds[2] + 3), min(image.height, bounds[3] + 3),
    )
    content = image.crop(expanded)
    max_width, max_height = width - 2 * margin, height - 2 * margin
    scale = min(1.0, max_width / content.width, max_height / content.height)
    if scale < 1:
        content = content.resize(
            (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
            Image.Resampling.LANCZOS,
        )
    # A modest contrast-aware sharpen restores legibility without changing
    # the original metallic highlights, colour scheme, or 3D illustration.
    rgb = content.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=0.65, percent=76, threshold=3)
    )
    rgb.putalpha(content.getchannel("A"))
    out = Image.new("RGBA", (width, height))
    out.alpha_composite(rgb, ((width - rgb.width) // 2, (height - rgb.height) // 2))
    bounds = alpha_bounds(out)
    assert bounds, name
    margins = (bounds[0], bounds[1], width - bounds[2], height - bounds[3])
    assert min(margins) >= margin - 1, (name, "clipped", margins)
    return out


def repair(name, originals):
    base = cleanup(originals[name].copy(), name)
    if name in CIRCLE_GEOMETRY:
        base = mirror_missing_rim(base, name)
    elif name in BUTTON_GEOMETRY:
        base = mirror_missing_button_frame(base, name)
    return pack(base, name)


def verify_file(name):
    path = FOLDER / f"{name}@3x.webp"
    with Image.open(path) as opened:
        assert opened.format == "WEBP", (name, "not WebP")
        image = opened.convert("RGBA")
    expected = (432, 156) if name.startswith("button-") else (216, 216)
    assert image.size == expected, (name, "wrong size", image.size)
    bounds = alpha_bounds(image)
    assert bounds, (name, "empty image")
    margins = (bounds[0], bounds[1], image.width - bounds[2], image.height - bounds[3])
    required = 14 if name.startswith("button-") else 20
    assert min(margins) >= required - 1, (name, "alpha clipped", margins)
    return margins


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--check", action="store_true")
    opts = args.parse_args()
    originals = {
        n: Image.open(io.BytesIO(original_bytes(n))).convert("RGBA") for n in NAMES
    }
    for name in NAMES:
        image = repair(name, originals)
        target = FOLDER / f"{name}@3x.webp"
        binary = io.BytesIO()
        image.save(binary, "WEBP", lossless=True, method=6, exact=True)
        # The original branch already passed rough alpha-margin checks while
        # still showing sprite scraps and broken rings. Compare the *pixels
        # reconstructed from the approved source*, not margins alone.
        if opts.check:
            assert target.read_bytes() == binary.getvalue(), (
                name, "image does not match the original-style crop repair"
            )
        else:
            target.write_bytes(binary.getvalue())
        print(name, verify_file(name))


if __name__ == "__main__":
    main()
