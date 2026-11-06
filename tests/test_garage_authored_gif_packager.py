"""Regression coverage for the approved sprite sheet -> GIF pipeline."""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


MODULE = Path(__file__).resolve().parents[1] / "scripts/package-garage-authored-gifs.py"
spec = importlib.util.spec_from_file_location("garage_gif_packager", MODULE)
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


def make_sheet(path: Path, side: int, inset: int = 24):
    sheet = Image.new("RGBA", (side * 5, side * 4), (0, 0, 0, 0))
    painter = ImageDraw.Draw(sheet)
    for i in range(20):
        x = (i % 5) * side
        y = (i // 5) * side
        # Source-locked outer part plus one visibly moving independent component.
        painter.ellipse((x + inset, y + inset, x + side - inset - 1,
                         y + side - inset - 1), fill=(20, 120, 230, 255))
        painter.ellipse((x + 70 + (i % 3), y + 90,
                         x + 83 + (i % 3), y + 103), fill=(255, 255, 210, 255))
    sheet.save(path)


class GarageGifPackagerTests(unittest.TestCase):
    def test_288px_sheet_exports_20_frame_transparent_loop(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            make_sheet(tmp / "sheet.png", 288)
            frames = package.split_sheet(tmp / "sheet.png", 288)
            output = tmp / "result.gif"
            package.save_gif(frames, output)
            package.verify_gif(output, 288)
            with Image.open(output) as gif:
                self.assertEqual(gif.n_frames, 20)
                self.assertEqual(gif.info.get("loop"), 0)
                self.assertEqual(gif.info.get("transparency"), 0)

    def test_216px_sheet_passes_store_margin(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            make_sheet(tmp / "sheet.png", 216)
            self.assertEqual(len(package.split_sheet(tmp / "sheet.png", 216)), 20)

    def test_rejects_wrong_sheet_size(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            Image.new("RGBA", (200, 200)).save(tmp / "sheet.png")
            with self.assertRaisesRegex(ValueError, "expected"):
                package.split_sheet(tmp / "sheet.png", 288)

    def test_rejects_clipped_source_artwork(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            make_sheet(tmp / "sheet.png", 216, inset=5)
            with self.assertRaisesRegex(ValueError, "alpha inset"):
                package.split_sheet(tmp / "sheet.png", 216)


if __name__ == "__main__":
    unittest.main()
