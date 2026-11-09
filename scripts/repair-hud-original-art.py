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
# Round badges are closed; the two silver brake/drift rings intentionally
# have open bottoms and must NOT acquire a second invented lower arc.
CIRCLE_GEOMETRY = {
    "hud-nitro": (125, 140, 180, 181),
    "hud-combo": (125, 125, 180, 179),
}
# Original illustrated border extents; repairs blend seamlessly into the
# original button rather than pasting a disconnected mirror strip.
BUTTON_GEOMETRY = {
    "button-coming-soon": (83, 389, 22, 148),
    "button-garage": (100, 398, 20, 150),
    "button-retry": (99, 402, 8, 148),
    "button-nitro": (42, 406, 10, 150),
    "button-play": (48, 398, 15, 150),
}


def original_bytes(name):
    return subprocess.check_output(
        ["git", "show", f"{SOURCE_COMMIT}:{FOLDER}/{name}@3x.webp"]
    )


def alpha_bounds(image):
    return image.getchannel("A").point(
        lambda pixel: 255 if pixel > 16 else 0
    ).getbbox()


def clamp(value):
    return max(0., min(1., value))


def blend_rgba(original, donor, weight):
    return tuple(round(original[i] * (1 - weight) + donor[i] * weight)
                 for i in range(4))


def mirror_missing_rim(image, name):
    """Continue a cropped circular border with smoothly aligned original pixels."""
    cx, cy, right_begin, bottom_begin = CIRCLE_GEOMETRY[name]
    w, h = image.size
    stage = Image.new("RGBA", (w + 28, h + 28))
    stage.alpha_composite(image)
    source, pixels = image.load(), stage.load()
    for y in range(bottom_begin, min(stage.height, 2 * cy + 95)):
        for x in range(0, min(stage.width, 2 * cx + 95)):
            dx, dy = x - cx, y - cy
            distance = (dx * dx + dy * dy) ** .5
            if not 58 <= distance <= 92:
                continue
            wx = clamp((x - right_begin) / 18) if x > right_begin else 0
            wy = clamp((y - bottom_begin) / 18)
            weight = max(wx, wy)
            if weight == 0:
                continue
            mirror_x = round(2 * cx - x) if wx else x
            mirror_y = round(2 * cy - y) if wy else y
            if not (0 <= mirror_x < w and 0 <= mirror_y < h):
                continue
            old = pixels[x, y]
            new = source[mirror_x, mirror_y]
            pixels[x, y] = blend_rgba(old, new, weight)
    # The right-hand arc must be repaired all the way up to the equator too.
    for y in range(0, bottom_begin):
        for x in range(right_begin, min(stage.width, 2 * cx + 95)):
            radius = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if not 58 <= radius <= 92:
                continue
            sx = round(2 * cx - x)
            if 0 <= sx < w:
                pixels[x, y] = blend_rgba(pixels[x, y], source[sx, y],
                                         clamp((x - right_begin) / 18))
    return stage


def mirror_missing_button_frame(image, name):
    """Softly blend the *same button's* illustrated left/top bevel into missing edges."""
    left, right, top, bottom = BUTTON_GEOMETRY[name]
    w, h = image.size
    cx, cy = (left + right) / 2, (top + bottom) / 2
    stage = Image.new("RGBA", (w + 10, h + 20))
    stage.alpha_composite(image)
    source, pixels = image.load(), stage.load()
    for y in range(top - 3, min(stage.height, bottom + 9)):
        for x in range(left, min(stage.width, right + 8)):
            wx = clamp((x - (right - 46)) / 22)
            wy = clamp((y - (bottom - 28)) / 18)
            weight = max(wx, wy)
            if weight == 0:
                continue
            mx = round(2 * cx - x) if wx else x
            my = round(2 * cy - y) if wy else y
            if not (0 <= mx < w and 0 <= my < h):
                continue
            original = pixels[x, y]
            donor = source[mx, my]
            pixels[x, y] = blend_rgba(original, donor, weight)
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
