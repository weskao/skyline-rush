#!/usr/bin/env python3
"""Flipbook flame strip for the NITRO / BOOST touch buttons (Pillow only).

    python3 scripts/generate-sprint-flame.py           write src/sprint-flame-strip.webp
    python3 scripts/generate-sprint-flame.py --check   validate the committed strip

Sixteen 288 x 384 frames (3x of a 96 x 128 CSS box) in one row. Only alpha carries the
artwork: src/touch-sprint-buttons.css uses the strip as a mask over a heat gradient, so one
asset tints to any button. Tileable noise scrolls up a whole number of periods across the
frames, which makes the loop seamless.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "src/sprint-flame-strip.webp"
FRAMES, W, H = 16, 288, 384
MAX_BYTES = 150_000
# Flame box = button + this share of the button above / beside / below it.
# Keep in step with --flame-top / --flame-side / --flame-bottom in touch-sprint-buttons.css.
TOP, SIDE, BOTTOM = .7, .18, .1


def tile_noise(rng, columns, rows):
    """Value noise that wraps on both axes: tile the lattice, upscale, crop the middle."""
    lattice = Image.new("L", (columns, rows))
    lattice.putdata([rng.randrange(256) for _ in range(columns * rows)])
    tiled = Image.new("L", (columns * 3, rows * 3))
    for x in range(3):
        for y in range(3):
            tiled.paste(lattice, (x * columns, y * rows))
    return tiled.resize((W * 3, H * 3), Image.BICUBIC).crop((W, H, W * 2, H * 2))


def heat_field():
    """255 on the button, falling to 0 before the left, right and top frame edges."""
    x0, x1 = W * SIDE / (1 + 2 * SIDE), W * (1 + SIDE) / (1 + 2 * SIDE)
    y0, y1 = H * TOP / (1 + TOP + BOTTOM), H * (1 + TOP) / (1 + TOP + BOTTOM)
    reach_side, reach_up, reach_down = x0 * .92, y0 * .95, (H - y1) * .9
    centre, values = W / 2, []
    for y in range(H):
        rise = max(y0 - y, 0) / reach_up
        down = max(y - y1, 0) / reach_down
        for x in range(W):
            side = max(x0 - x, x - x1, 0) / reach_side
            taper = ((x - centre) / centre) ** 2 * rise * 1.1  # tongues lean in as they climb
            values.append(round(255 * max(0, 1 - math.sqrt(side * side + down * down + rise * rise) - taper) ** .6))
    field = Image.new("L", (W, H))
    field.putdata(values)
    return field


def smoothstep_lut(low, high):
    def step(value):
        t = min(1, max(0, (value - low) / (high - low)))
        return round(255 * t * t * (3 - 2 * t))
    return [step(value) for value in range(256)]


def build():
    rng = random.Random(20261114)
    heat, slow, fast = heat_field(), tile_noise(rng, 9, 3), tile_noise(rng, 18, 6)
    lut, white = smoothstep_lut(52, 124), Image.new("L", (W, H), 255)
    strip = Image.new("RGBA", (W * FRAMES, H))
    for frame in range(FRAMES):
        # Negative y offset = the noise climbs; one and two whole periods keep the loop seamless.
        noise = Image.blend(ImageChops.offset(slow, 0, -frame * H // FRAMES),
                            ImageChops.offset(fast, 0, -frame * 2 * H // FRAMES), .4)
        alpha = ImageChops.multiply(heat, noise).point(lut).filter(ImageFilter.GaussianBlur(1.1))
        strip.paste(Image.merge("RGBA", (white, white, white, alpha)), (frame * W, 0))
    strip.save(OUT, "WEBP", quality=60, alpha_quality=70, method=6)


def check():
    strip = Image.open(OUT)
    assert strip.size == (W * FRAMES, H), strip.size
    assert OUT.stat().st_size <= MAX_BYTES, OUT.stat().st_size
    alpha = strip.convert("RGBA").getchannel("A")
    for frame in range(FRAMES):
        cell = alpha.crop((frame * W, 0, (frame + 1) * W, H))
        edges = (cell.crop((0, 0, 1, H)), cell.crop((W - 1, 0, W, H)), cell.crop((0, 0, W, 1)))
        assert all(edge.getextrema()[1] == 0 for edge in edges), f"frame {frame} touches an edge"
        assert cell.getextrema()[1] == 255, f"frame {frame} has no opaque fire"
    print("ok")


if __name__ == "__main__":
    if "--check" not in sys.argv:
        build()
    check()
