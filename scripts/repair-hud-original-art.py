#!/usr/bin/env python3
"""Repair the existing mobile HUD art without redesigning its original visual style.

The master images are pinned to the pre-redesign commit; no new icons, lettering,
palettes, or materials are synthesized. Only foreign sprite scraps, top bars and
incomplete bottom rims are addressed. The original 3x canvases are preserved.
"""
import io
import subprocess
from pathlib import Path

from PIL import Image, ImageFilter

SOURCE_COMMIT = "f67d3bf31012edfa52cc06f46abe586ad5bdd78e"
FOLDER = "public/feature-assets/mobile-controls-hud/raster"
NAMES = (
    "button-back", "button-coming-soon", "button-garage", "button-nitro",
    "button-play", "button-retry", "hud-brake", "hud-combo", "hud-drift",
    "hud-nitro", "hud-pause", "hud-speed", "ui-arrow-left",
    "ui-arrow-right", "ui-close", "ui-info", "ui-settings", "ui-tooltip",
)
FOREIGN_LEFT = {
    "button-back": 68, "button-coming-soon": 70,
    "button-garage": 94, "button-retry": 94,
}
FOREIGN_TOP = {
    "hud-brake": 43, "hud-drift": 43, "hud-nitro": 42,
    "ui-arrow-left": 46, "ui-arrow-right": 46, "ui-close": 46,
}
RIM_DONOR = {
    "hud-brake": "hud-pause", "hud-drift": "hud-pause",
    "hud-nitro": "hud-combo",
}


def source_bytes(name):
    return subprocess.check_output([
        "git", "show", f"{SOURCE_COMMIT}:{FOLDER}/{name}@3x.webp"
    ])


def bbox(image):
    return image.getchannel("A").point(
        lambda value: 255 if value > 16 else 0
    ).getbbox()


def repair(name, originals):
    image = originals[name].copy()
    alpha = image.getchannel("A")
    if name in FOREIGN_LEFT:
        alpha.paste(0, (0, 0, FOREIGN_LEFT[name], image.height))
    if name in FOREIGN_TOP:
        alpha.paste(0, (0, 0, image.width, FOREIGN_TOP[name]))
    image.putalpha(alpha)

    if name in RIM_DONOR:
        donor = originals[RIM_DONOR[name]]
        dx, dy = (0, 5) if name == "hud-nitro" else (11, 8)
        shifted_donor = Image.new("RGBA", image.size)
        shifted_donor.paste(donor, (dx, dy))
        dp = shifted_donor.load()
        ap = alpha.load()
        patch = Image.new("RGBA", image.size)
        pp = patch.load()
        start_y = 176 if name == "hud-nitro" else 174
        min_brightness = 95 if name == "hud-nitro" else 125
        for y in range(start_y, image.height):
            for x in range(image.width):
                red, green, blue, a = dp[x, y]
                if a < 100 or max(red, green, blue) < min_brightness:
                    continue
                if ap[x, y] >= 72:
                    continue  # Preserve every existing visible silhouette pixel.
                pp[x, y] = (
                    red, green, blue, int(a * (1 - ap[x, y] / 72))
                )
        image.alpha_composite(patch)
        placed = Image.new("RGBA", image.size)
        placed.paste(image, (0, -12))  # Safety margin below restored rim.
        image = placed

    if name in FOREIGN_LEFT or name in FOREIGN_TOP or name in RIM_DONOR:
        sharpened = image.convert("RGB").filter(
            ImageFilter.UnsharpMask(radius=0.8, percent=115, threshold=3)
        )
        sharpened.putalpha(image.getchannel("A"))
        image = sharpened

    expected = (432, 156) if name.startswith("button-") else (216, 216)
    assert image.size == expected, (name, "dimensions", image.size)
    box = bbox(image)
    assert box, (name, "empty")
    assert min(box[0], box[1], image.width - box[2], image.height - box[3]) >= 12, (name, box)
    return image


def main():
    originals = {
        name: Image.open(io.BytesIO(source_bytes(name))).convert("RGBA")
        for name in NAMES
    }
    out = Path(FOLDER)
    out.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        result = repair(name, originals)
        path = out / f"{name}@3x.webp"
        if name not in FOREIGN_LEFT and name not in FOREIGN_TOP and name not in RIM_DONOR:
            path.write_bytes(source_bytes(name))  # Preserve intact art bit-for-bit.
        else:
            result.save(path, "WEBP", lossless=True, method=6, exact=True)
        reopened = Image.open(path).convert("RGBA")
        assert reopened.size == result.size
        assert bbox(reopened) == bbox(result)
        print(f"{name}: {reopened.width}x{reopened.height} alpha={bbox(reopened)}")


if __name__ == "__main__":
    main()
