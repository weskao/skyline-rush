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
# Same-family rings: only restore pixels in missing *outer rim* regions.
RING_DONOR = {
    "hud-brake": ("hud-pause", 0, 14, 194, 300),
    "hud-drift": ("hud-pause", 0, 14, 194, 300),
    "hud-nitro": ("hud-combo", 0, 17, 189, 188),
    "hud-combo": ("hud-combo", 0, 0, 194, 205),
}


def original_bytes(name):
    return subprocess.check_output(
        ["git", "show", f"{SOURCE_COMMIT}:{FOLDER}/{name}@3x.webp"]
    )


def alpha_bounds(image):
    return image.getchannel("A").point(
        lambda pixel: 255 if pixel > 16 else 0
    ).getbbox()


def repair_rim(image, donor, dx, dy, bottom, right):
    """Extend truncated metallic/energy rims, never replace interior glyphs."""
    w, h = image.size
    # A larger stage exposes donor pixels that the source's bottom clipped.
    stage = Image.new("RGBA", (w + 72, h + 72))
    stage.alpha_composite(image, (36, 36))
    donor_stage = Image.new("RGBA", stage.size)
    donor_stage.alpha_composite(donor, (36 + dx, 36 + dy))
    pixels = stage.load()
    donor_pixels = donor_stage.load()
    cx, cy = (122, 141) if donor is not None and bottom == 189 else (108, 124)
    for y in range(36 + bottom, stage.height - 16):
        for x in range(36, stage.width - 16):
            lx, ly = x - 36, y - 36
            if ly < bottom and lx < right:
                continue
            # Reconstruct only the outer arc, not the icon's centre/lettering.
            radius = ((lx - cx) ** 2 + (ly - cy) ** 2) ** .5
            if not 63 <= radius <= 91:
                continue
            r, g, b, a = donor_pixels[x, y]
            if a <= 30 or max(r, g, b) < 95:
                continue
            if pixels[x, y][3] >= 48:
                continue
            pixels[x, y] = (r, g, b, a)
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
    if name in RING_DONOR:
        donor_name, dx, dy, bottom, right = RING_DONOR[name]
        # Only ring pixels from another original HUD icon can be used as fill.
        base = repair_rim(base, originals[donor_name], dx, dy, bottom, right)
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
