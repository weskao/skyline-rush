#!/usr/bin/env python3
"""Export approved single-icon source WebPs as native RGBA PNGs, never sheet crops."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / "public/feature-assets/garage-rewards-and-missions/raster"
names = ("mission-race", "mission-time", "mission-drift", "mission-combo",
         "trophy-bronze", "trophy-silver", "trophy-gold", "trophy-platinum")
for name in names:
    with Image.open(root / f"{name}@3x.webp") as src:
        im = src.convert("RGBA")
    if im.size != (288, 288):
        raise ValueError(f"{name}: wrong source size {im.size}")
    alpha = im.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise ValueError(f"{name}: invalid transparency")
    bbox = alpha.point(lambda p: 255 if p > 16 else 0).getbbox()
    if not bbox or min(bbox[0], bbox[1], 288 - bbox[2], 288 - bbox[3]) < 20:
        raise ValueError(f"{name}: clipped silhouette {bbox}")
    im.save(root / f"{name}@3x.png", format="PNG", optimize=True)
    print(f"{name}: 288 x 288 RGBA, alpha bounds={bbox}")
