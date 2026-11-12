#!/usr/bin/env python3
"""Repaint existing icons in the Demo Points 3D/chrome/neon palette, keeping their contours."""
from __future__ import annotations
from io import BytesIO
from pathlib import Path
import math
import subprocess
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/feature-assets"
ARCHIVE = ROOT / "docs/designs/3x-asset-library/webp/garage-rewards-and-missions"
# This approved artwork is the shared material/color/lighting reference, never overwritten.
STYLE_REFERENCE = ASSETS / "wave3-demo/raster/demo-points@3x.webp"
WALLET_ORIGINAL = "438a22a7876bfbfb9d4ffcb851d06c438c849523"
REWARDS = ("mission-race", "mission-time", "mission-drift", "mission-combo",
           "trophy-bronze", "trophy-silver", "trophy-gold", "trophy-platinum")
WALLET = ("wallet-coin", "wallet-diamond")
ACCENTS = {
    "mission-race": (80, 207, 255), "mission-time": (91, 216, 255),
    "mission-drift": (146, 123, 255), "mission-combo": (67, 239, 255),
    "trophy-bronze": (255, 162, 100), "trophy-silver": (153, 210, 255),
    "trophy-gold": (255, 216, 88), "trophy-platinum": (167, 98, 255),
    "wallet-coin": (255, 190, 47), "wallet-diamond": (69, 237, 255),
}
VIOLET = (157, 89, 255)
CYAN = (75, 245, 255)
WHITE = (243, 250, 255)

def source_art(name: str) -> Image.Image:
    if name in REWARDS:
        art = Image.open(ARCHIVE / (name + "@3x.webp")).convert("RGBA")
        if name.startswith("mission-"):
            # Remove the green export marker, not the original recognizable symbol.
            ImageDraw.Draw(art).rectangle((0, 0, art.width - 1, 43), fill=(0, 0, 0, 0))
        assert art.size == (288, 288), name
        return art

    original_path = "public/feature-assets/wave3-demo/raster/" + name + "@3x.png"
    data = subprocess.check_output(["git", "show", WALLET_ORIGINAL + ":" + original_path], cwd=ROOT)
    art = Image.open(BytesIO(data)).convert("RGBA")
    assert art.size == (144, 144), name
    matte = Image.new("L", art.size)
    paint = ImageDraw.Draw(matte)
    if name == "wallet-coin":
        paint.ellipse((15, 15, 129, 130), fill=255)
    else:
        paint.polygon([(26, 62), (42, 32), (70, 21), (102, 34),
                       (118, 62), (72, 118)], fill=255)
    art.putalpha(matte.filter(ImageFilter.GaussianBlur(0.7)))
    return art

def tint(mask: Image.Image, rgb: tuple[int, int, int], opacity: float) -> Image.Image:
    result = Image.new("RGBA", mask.size, rgb + (0,))
    result.putalpha(mask.point(lambda x: round(x * opacity)))
    return result

def overlay(canvas: Image.Image, mask: Image.Image, rgb: tuple[int, int, int],
            opacity: float) -> None:
    canvas.alpha_composite(tint(mask, rgb, opacity))

def spectral_rim(canvas: Image.Image, alpha: Image.Image,
                 color: tuple[int, int, int]) -> None:
    """Multi-pass blue/violet emissive outline and metallic material bevel."""
    # Far bloom is atmospheric and always below 128 alpha.
    overlay(canvas, alpha.filter(ImageFilter.GaussianBlur(18)), VIOLET, 0.29)
    overlay(canvas, alpha.filter(ImageFilter.GaussianBlur(10)), CYAN, 0.24)
    overlay(canvas, alpha.filter(ImageFilter.GaussianBlur(5)), color, 0.45)

    # Outer corona follows the ORIGINAL contour. It is not a circular frame.
    expanded = alpha.filter(ImageFilter.MaxFilter(9))
    outside = ImageChops.subtract(expanded, alpha)
    overlay(canvas, outside.filter(ImageFilter.GaussianBlur(2)), VIOLET, 0.65)
    overlay(canvas, outside.filter(ImageFilter.GaussianBlur(0.5)), CYAN, 0.35)

    # Chrome bevel follows the original subject edge, without altering core geometry.
    inside = ImageChops.subtract(alpha, alpha.filter(ImageFilter.MinFilter(13)))
    bevel_light = Image.new("L", alpha.size)
    pix = bevel_light.load()
    w, h = alpha.size
    for y in range(h):
        for x in range(w):
            top = max(0.0, 1.0 - y / h)
            horizon = 0.5 + 0.5 * math.cos((x / w) * math.pi * 2.2)
            pix[x, y] = round(255 * (0.35 + 0.5 * top + 0.15 * horizon))
    overlay(canvas, ImageChops.multiply(inside, bevel_light), WHITE, 0.38)
    overlay(canvas, ImageChops.multiply(inside, ImageChops.invert(bevel_light)), color, 0.41)

def energy_trails(canvas: Image.Image, alpha: Image.Image,
                  color: tuple[int, int, int], name: str) -> None:
    """Small colored racing arcs and sparkles; NOT a replacement icon or plate."""
    bounds = alpha.getbbox()
    if not bounds:
        return
    x0, y0, x1, y1 = bounds
    w, h = canvas.size
    # Arc is an energetic swoosh anchored to the object's lower half.
    x0 = max(19, x0 - round(w * 0.04))
    x1 = min(w - 20, x1 + round(w * 0.04))
    y0 = max(19, round(y0 + (y1 - y0) * 0.48))
    y1 = min(h - 20, y1 + round(h * 0.035))
    trails = Image.new("RGBA", canvas.size)
    drawer = ImageDraw.Draw(trails, "RGBA")
    stroke = max(2, w // 100)
    drawer.arc((x0, y0, x1, y1), 3, 150, (*color, 95), width=stroke)
    drawer.arc((x0, y0 + 2, x1, y1 + 2), 188, 306, (*VIOLET, 84), width=stroke)
    # Flares are small and orbit the subject rather than covering its old symbol.
    for factor, side in ((0.28, -1), (0.77, 1)):
        xx = min(w - 22, max(22, round(x0 + (x1 - x0) * factor)))
        yy = min(h - 22, max(22, round(y0 + (y1 - y0) * (0.72 if side < 0 else 0.28))))
        r = max(3, round(w * 0.015))
        drawer.line(((xx-r*2, yy), (xx+r*2, yy)), fill=(*WHITE, 83), width=1)
        drawer.line(((xx, yy-r*2), (xx, yy+r*2)), fill=(*WHITE, 83), width=1)
    # Underlayer rendered first; the old actual icon always stays on top.
    canvas.alpha_composite(trails.filter(ImageFilter.GaussianBlur(2)))
    canvas.alpha_composite(trails)

def gloss_reflection(canvas: Image.Image, src_alpha: Image.Image,
                     color: tuple[int, int, int], name: str) -> None:
    """Specular strips, refracted glass and luminous core clipped to ORIGINAL pixels."""
    w, h = src_alpha.size
    sheen = Image.new("L", (w, h))
    pix = sheen.load()
    for y in range(h):
        for x in range(w):
            u, v = x / w, y / h
            angle = u + 0.69 * v
            softbox = max(0.0, 1 - abs(angle - 0.77) / 0.24)
            strip = max(0.0, 1 - abs(angle - 1.05) / 0.038)
            sparkle = max(0.0, 1 - abs(v - 0.25) / 0.22) * 0.18
            pix[x, y] = min(255, round((softbox * 0.47 + strip * 0.25 + sparkle) * 255))
    sheen = ImageChops.multiply(sheen.filter(ImageFilter.GaussianBlur(1)), src_alpha)
    overlay(canvas, sheen, WHITE, 0.63)

    # Crystal-like internal refraction, only where gem/medal facets already exist.
    if name in ("wallet-diamond", "trophy-platinum"):
        refraction = Image.new("L", (w, h))
        pix = refraction.load()
        for y in range(h):
            for x in range(w):
                u, v = x / w, y / h
                stripe = max(0.0, 1 - abs(u - 0.5 + (v - 0.5) * 0.38) / 0.16)
                pix[x, y] = round(stripe * 116)
        overlay(canvas, ImageChops.multiply(refraction, src_alpha), CYAN, 0.37)
    elif name in ("wallet-coin", "trophy-gold", "trophy-bronze"):
        overlay(canvas, ImageChops.multiply(sheen, src_alpha), (255, 218, 103), 0.34)
    else:
        overlay(canvas, ImageChops.multiply(sheen, src_alpha), color, 0.23)

def preserve_original_silhouette(output: Image.Image, alpha: Image.Image) -> Image.Image:
    # An alpha >=128 pixel is allowed only where the original subject had one.
    # All peripheral glow, swooshes and sparks stay atmospheric (alpha <128).
    core = alpha.point(lambda x: 255 if x >= 128 else 0)
    existing = output.getchannel("A")
    peripheral = existing.point(lambda x: min(x, 109))
    output.putalpha(Image.composite(existing, peripheral, core))
    return output

def polish(src: Image.Image, name: str) -> Image.Image:
    """Refine the ORIGINAL checker flag, watch, drift, arrow, cup, coin or gem."""
    if not STYLE_REFERENCE.is_file():
        raise FileNotFoundError("Required style reference: demo-points@3x.webp")
    with Image.open(STYLE_REFERENCE) as sample:
        if sample.format != "WEBP" or sample.size != (216, 216):
            raise ValueError("Unexpected Demo Points reference geometry")
    alpha = src.getchannel("A")
    color = ACCENTS[name]
    canvas = Image.new("RGBA", src.size)
    spectral_rim(canvas, alpha, color)
    energy_trails(canvas, alpha, color, name)
    shadow = Image.new("L", src.size)
    shadow.paste(alpha, (0, max(2, src.width // 65)))
    overlay(canvas, shadow.filter(ImageFilter.GaussianBlur(8)), (4, 8, 37), 0.46)
    # Keep the original's actual checkers, arrows, trophy handles and central marks.
    subject = ImageEnhance.Color(src).enhance(1.34)
    subject = ImageEnhance.Contrast(subject).enhance(1.24)
    subject = subject.filter(ImageFilter.UnsharpMask(radius=1.35, percent=145, threshold=3))
    subject.putalpha(alpha)
    canvas.alpha_composite(subject)
    gloss_reflection(canvas, alpha, color, name)
    return preserve_original_silhouette(canvas, alpha)

def silhouette_similarity(before: Image.Image, after: Image.Image) -> float:
    x = before.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    y = after.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    intersection = sum(ImageChops.multiply(x, y).histogram()[1:])
    union = sum(ImageChops.lighter(x, y).histogram()[1:])
    return intersection / max(union, 1)

def main() -> None:
    for name in (*REWARDS, *WALLET):
        original = source_art(name)
        improved = polish(original, name)
        score = silhouette_similarity(original, improved)
        assert score >= 0.80, (name, score)
        dest = (ASSETS / "garage-rewards-and-missions/raster" if name in REWARDS
                else ASSETS / "wave3-demo/raster")
        dest.mkdir(parents=True, exist_ok=True)
        path = dest / (name + "@3x.webp")
        improved.save(path, "WEBP", quality=95, method=6, exact=True)
        with Image.open(path) as encoded:
            assert encoded.format == "WEBP" and encoded.size == original.size, name
            assert encoded.convert("RGBA").getchannel("A").getextrema()[0] == 0, name
        print(f"OK {name}: {score:.1%} original silhouette, transparent {original.size}, {path.stat().st_size} bytes")

if __name__ == "__main__":
    main()
