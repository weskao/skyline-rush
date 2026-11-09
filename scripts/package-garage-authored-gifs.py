#!/usr/bin/env python3
"""Package artist-approved source-locked 5x4 sprite sheets into Garage GIFs.

This tool does not generate art. Each <name>.png must contain 20 equal-sized
cells, five columns by four rows, sourced from that item's approved artwork.
Requires: Pillow. Usage: python scripts/package-garage-authored-gifs.py --sheets <dir>
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageSequence

MATTE = (15, 28, 51)
MATTE_CUT = 102  # ~40% alpha over the flat matte
CARD_CUT = 26  # ~10% alpha: the glow falloff is already blended into the real card pixels
CARD_BACKGROUNDS = Path(__file__).resolve().parents[1] / "assets-src/garage-card-bg"
DURATION_MS = 50
FRAMES = 20
MAX_BYTES = 900_000


def split_sheet(path: Path, side: int) -> list[Image.Image]:
    with Image.open(path) as sheet:
        expected = (side * 5, side * 4)
        if sheet.size != expected:
            raise ValueError(f"{path.name}: expected {expected}, got {sheet.size}")
        if sheet.mode not in ("RGBA", "LA", "P"):
            raise ValueError(f"{path.name}: transparent RGBA sprite sheet required")
        src = sheet.convert("RGBA")
        frames = [src.crop(((i % 5) * side, (i // 5) * side,
                            (i % 5 + 1) * side, (i // 5 + 1) * side))
                  for i in range(FRAMES)]
    inset = 20 if side == 216 else 12
    for i, frame in enumerate(frames):
        alpha = frame.getchannel("A").point(lambda v: 255 if v > 16 else 0)
        bounds = alpha.getbbox()
        if not bounds:
            raise ValueError(f"{path.name}: frame {i} blank")
        left, top, right, bottom = bounds
        if min(left, top, side - right, side - bottom) < inset:
            raise ValueError(f"{path.name}: frame {i} violates {inset}px alpha inset")
    return frames


def card_background(category: str, side: int) -> Image.Image | None:
    """3x capture of the real Garage card under the artwork, or None (flat matte)."""
    path = CARD_BACKGROUNDS / f"{category}.png"
    if not path.is_file():
        return None
    with Image.open(path) as bg:
        if bg.size != (side, side):
            raise ValueError(f"{path.name}: expected {side}x{side}, got {bg.size}")
        return bg.convert("RGBA")


def save_gif(frames: list[Image.Image], output: Path,
             background: Image.Image | None = None) -> None:
    """One global palette, one transparent index, alpha edges composited onto the
    card background (or the flat matte) before the 1-bit alpha cut."""
    if len(frames) != FRAMES:
        raise ValueError("expected exactly 20 frames")
    side = frames[0].width
    if any(im.size != (side, side) for im in frames):
        raise ValueError("inconsistent frame dimensions")
    base = background or Image.new("RGBA", (side, side), MATTE + (255,))
    cut = CARD_CUT if background else MATTE_CUT
    # Build a shared RGB palette from every frame on the production card matte.
    matte_rgb = Image.new("RGB", (side * 5, side * 4), MATTE)
    for i, frame in enumerate(frames):
        composed = base.copy()
        composed.alpha_composite(frame)
        matte_rgb.paste(composed.convert("RGB"),
                        ((i % 5) * side, (i // 5) * side))
    palette_master = matte_rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    # Assign color indices 1..255; reserve zero for transparency.
    colors = palette_master.getpalette()[:255 * 3]
    fixed = Image.new("P", (1, 1), 0)
    fixed.putpalette([0, 0, 0] + colors + [0] * (768 - 3 - len(colors)))
    encoded = []
    for frame in frames:
        bg = base.copy()
        bg.alpha_composite(frame)
        pal = bg.convert("RGB").quantize(palette=fixed, dither=Image.Dither.NONE)
        # Quantize using colors 1..255 only: shift possible index-0 pixels to
        # their nearest opaque neighbor before applying the alpha mask.
        arr = bytearray(pal.tobytes())
        if any(v == 0 for v in arr):
            # Re-map opaque zeros to index 1; transparent zeros below remain 0.
            arr = bytearray(1 if v == 0 else v for v in arr)
        a = frame.getchannel("A").tobytes()
        for p, opacity in enumerate(a):
            if opacity < cut:
                arr[p] = 0
        img = Image.frombytes("P", frame.size, bytes(arr))
        img.putpalette(fixed.getpalette())
        encoded.append(img)
    output.parent.mkdir(parents=True, exist_ok=True)
    encoded[0].save(output, save_all=True, append_images=encoded[1:],
                    duration=DURATION_MS, loop=0, disposal=2,
                    transparency=0, optimize=False)
    verify_gif(output, side)


def verify_gif(path: Path, side: int) -> None:
    if path.stat().st_size >= MAX_BYTES:
        raise ValueError(f"{path.name}: >=900KB")
    with Image.open(path) as gif:
        if gif.format != "GIF" or gif.size != (side, side):
            raise ValueError(f"{path.name}: wrong GIF format/dimensions")
        if gif.n_frames != FRAMES or gif.info.get("loop") != 0:
            raise ValueError(f"{path.name}: frame count or loop invalid")
        if "transparency" not in gif.info:
            raise ValueError(f"{path.name}: no transparency")
        inset = 20 if side == 216 else 12
        for i, frame in enumerate(ImageSequence.Iterator(gif)):
            if frame.info.get("duration") != DURATION_MS:
                raise ValueError(f"{path.name}: frame {i} timing invalid")
            alpha = frame.convert("RGBA").getchannel("A")
            bounds = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
            if not bounds:
                raise ValueError(f"{path.name}: frame {i} blank")
            l, t, r, b = bounds
            if min(l, t, side - r, side - b) < inset:
                raise ValueError(f"{path.name}: frame {i} transparency clipped")


def apply(sheets: Path, manifest_path: Path) -> None:
    entries = json.loads(manifest_path.read_text())
    if len(entries) != 25 or len({x["name"] for x in entries}) != 25:
        raise ValueError("expected exactly 25 uniquely named existing entries")
    outputs = []
    for item in entries:
        source = sheets / (item["name"] + ".png")
        if not source.is_file():
            raise FileNotFoundError(f"missing authored sprite sheet: {source}")
        frames = split_sheet(source, item["width"])
        output = Path(item["file"])
        outputs.append((item, output, frames))
    # Validate all authoring inputs before writing any manifest changes.
    for item, output, frames in outputs:
        save_gif(frames, output, card_background(item["category"], item["width"]))
        item.update(size=output.stat().st_size, frames=FRAMES,
                    fps=1000 / DURATION_MS, profile="gpt-authored")
        print(f"{item['name']}: {item['size']} bytes / {FRAMES} frames")
    manifest_path.write_text(json.dumps(entries, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sheets", type=Path, required=True,
                        help="directory containing 25 approved <name>.png spritesheets")
    parser.add_argument("--manifest", type=Path,
                        default=Path("public/feature-assets/garage-animated/manifest.json"))
    parser.add_argument("--apply", action="store_true",
                        help="required acknowledgement before replacing runtime GIFs")
    args = parser.parse_args()
    if not args.apply:
        parser.error("pass --apply after reviewing all 25 sprite sheets")
    apply(args.sheets, args.manifest)


if __name__ == "__main__":
    main()
