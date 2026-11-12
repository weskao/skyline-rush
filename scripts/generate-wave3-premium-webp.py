#!/usr/bin/env python3
"""Refine the original Wave 3 silhouettes; never redraw or replace their symbols."""
from __future__ import annotations
from io import BytesIO
from pathlib import Path
import subprocess
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/feature-assets"
ARCHIVE = ROOT / "docs/designs/3x-asset-library/webp/garage-rewards-and-missions"
# Historical source for the original square-background wallet PNGs (not a runtime fallback).
WALLET_ORIGINAL = "438a22a7876bfbfb9d4ffcb851d06c438c849523"
REWARDS = ("mission-race", "mission-time", "mission-drift", "mission-combo",
           "trophy-bronze", "trophy-silver", "trophy-gold", "trophy-platinum")
WALLET = ("wallet-coin", "wallet-diamond")
ACCENTS = {
    "mission-race": (88, 218, 255), "mission-time": (102, 213, 255),
    "mission-drift": (123, 192, 255), "mission-combo": (76, 235, 255),
    "trophy-bronze": (255, 168, 119), "trophy-silver": (174, 216, 255),
    "trophy-gold": (255, 222, 115), "trophy-platinum": (182, 150, 255),
    "wallet-coin": (255, 214, 112), "wallet-diamond": (98, 227, 255),
}

def source_art(name: str) -> Image.Image:
    if name in REWARDS:
        art = Image.open(ARCHIVE / (name + "@3x.webp")).convert("RGBA")
        if name.startswith("mission-"):
            # Strip the disconnected green export artefact near the top, not the icon.
            ImageDraw.Draw(art).rectangle((0, 0, art.width-1, 43), fill=(0, 0, 0, 0))
        assert art.size == (288, 288), name
        return art
    original_path = "public/feature-assets/wave3-demo/raster/" + name + "@3x.png"
    data = subprocess.check_output(["git", "show", WALLET_ORIGINAL + ":" + original_path], cwd=ROOT)
    art = Image.open(BytesIO(data)).convert("RGBA")
    assert art.size == (144, 144), name
    # Matte ONLY the shape of the actual lightning coin / original faceted diamond.
    # The source has an opaque orange/blue square background that must not survive.
    matte = Image.new("L", art.size)
    painter = ImageDraw.Draw(matte)
    if name == "wallet-coin":
        painter.ellipse((15, 15, 129, 130), fill=255)
    else:
        painter.polygon([(26, 62), (42, 32), (70, 21), (102, 34), (118, 62), (72, 118)], fill=255)
    art.putalpha(matte.filter(ImageFilter.GaussianBlur(0.7)))
    return art

def tint(mask: Image.Image, color: tuple[int,int,int], strength: float) -> Image.Image:
    layer = Image.new("RGBA", mask.size, color + (0,))
    layer.putalpha(mask.point(lambda a: round(a * strength)))
    return layer

def polish(src: Image.Image, name: str) -> Image.Image:
    alpha, size = src.getchannel("A"), src.size[0]
    hue = ACCENTS[name]
    art = ImageEnhance.Color(src).enhance(1.12)
    art = ImageEnhance.Contrast(art).enhance(1.09)
    art = ImageEnhance.Sharpness(art).enhance(1.30)
    art.putalpha(alpha)
    output = Image.new("RGBA", src.size)
    shadow = Image.new("L", src.size)
    shadow.paste(alpha, (0, 3 if size==144 else 5))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5 if size==144 else 7))
    output.alpha_composite(tint(shadow, (6, 12, 38), 0.46))
    output.alpha_composite(tint(alpha.filter(ImageFilter.GaussianBlur(4)), hue, 0.19))
    output.alpha_composite(art)
    # Metallic glint is clipped to the *original* shape. Never draw new icon geometry.
    reflection = Image.new("L", src.size)
    pix = reflection.load()
    for y in range(size):
        for x in range(size):
            diagonal = x + y * 0.66 - size * 0.68
            band = max(0.0, 1.0 - abs(diagonal) / (size * 0.24))
            pix[x,y] = round(min(1.0, band * 0.29 + (1-y/size) * 0.07) * 255)
    reflection = ImageChops.multiply(reflection.filter(ImageFilter.GaussianBlur(1.5)), alpha)
    output.alpha_composite(tint(reflection, (244, 252, 255), 0.37))
    rim = ImageChops.subtract(alpha.filter(ImageFilter.MaxFilter(5)), alpha)
    output.alpha_composite(tint(rim.filter(ImageFilter.GaussianBlur(0.8)), hue, 0.52))
    return output

def silhouette_similarity(a: Image.Image, b: Image.Image) -> float:
    # Ignore the low-alpha outer glows and count only painted core pixels.
    x = a.getchannel("A").point(lambda p: 255 if p >= 128 else 0)
    y = b.getchannel("A").point(lambda p: 255 if p >= 128 else 0)
    intersect = sum(ImageChops.multiply(x, y).histogram()[1:])
    union = sum(ImageChops.lighter(x, y).histogram()[1:])
    return intersect / max(union, 1)

def main() -> None:
    for name in (*REWARDS, *WALLET):
        before = source_art(name)
        after = polish(before, name)
        score = silhouette_similarity(before, after)
        assert score >= 0.80, (name, score)
        dest = (ASSETS / "garage-rewards-and-missions/raster"
                if name in REWARDS else ASSETS / "wave3-demo/raster")
        dest.mkdir(parents=True, exist_ok=True)
        path = dest / (name + "@3x.webp")
        after.save(path, "WEBP", quality=95, method=6, exact=True)
        with Image.open(path) as actual:
            assert actual.format == "WEBP", name
            assert actual.size == before.size, name
            assert actual.convert("RGBA").getchannel("A").getextrema()[0] == 0, name
        print(f"OK {name}: original shape {score:.1%}; {before.width}x{before.height}; {path.stat().st_size}B")

if __name__ == "__main__":
    main()
