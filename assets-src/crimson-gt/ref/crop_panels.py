"""Crops the four studio panels of the concept board into ref/*.png (run from the repo root):
  python3 assets-src/crimson-gt/ref/crop_panels.py [--preview <dir>]

Panel boxes are the dark studio areas between the board's white gutters, found by scanning for the
gutter rows/columns inside the top-left 2x2 block. --preview also writes 3x upscales for inspection.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.join(HERE, "..", "..", "..", "docs", "designs", "3d-pipeline", "concept-art",
                     "skyline-rush-3d-target-concept-board.jpeg")
NAMES = [["front_three_quarter", "side"], ["rear_three_quarter", "rear"]]


def gutters(img, axis, lo, hi, cross):
    """Runs of near-white pixels along `axis` between lo..hi, sampled on the line `cross`."""
    px = img.load()
    white = []
    for i in range(lo, hi):
        r, g, b = px[(i, cross) if axis == 0 else (cross, i)]
        white.append(min(r, g, b) > 215)
    runs, start = [], None
    for i, w in enumerate(white + [False]):
        if w and start is None:
            start = i
        if not w and start is not None:
            runs.append((lo + start, lo + i))
            start = None
    return runs


def main():
    img = Image.open(BOARD).convert("RGB")
    # Sample across the dark studio floor/backdrop so the gutters are the only near-white runs.
    cols = gutters(img, 0, 0, 900, 30)
    rows = gutters(img, 1, 0, 420, 10)  # x 10: left of the studio light strips (x ~40), which also read as white
    xs = [(cols[0][1], cols[1][0]), (cols[1][1], cols[2][0])]
    ys = [(rows[0][1], rows[1][0]), (rows[1][1], rows[2][0])]
    preview = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    for r, (y0, y1) in enumerate(ys):
        for c, (x0, x1) in enumerate(xs):
            crop = img.crop((x0, y0, x1, y1))
            crop.save(os.path.join(HERE, NAMES[r][c] + ".png"))
            print(NAMES[r][c], (x0, y0, x1, y1), crop.size)
            if preview:
                os.makedirs(preview, exist_ok=True)
                crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS).save(os.path.join(preview, NAMES[r][c] + "@3x.png"))


main()
