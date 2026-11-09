"""Regression coverage for the approved sprite sheet -> GIF pipeline."""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageSequence


MODULE = Path(__file__).resolve().parents[1] / "scripts/package-garage-authored-gifs.py"
spec = importlib.util.spec_from_file_location("garage_gif_packager", MODULE)
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)
ROOT = MODULE.parents[1]
card_spec = importlib.util.spec_from_file_location(
    "garage_card_gifs", ROOT / "scripts/repackage-garage-card-gifs.py")
card_gifs = importlib.util.module_from_spec(card_spec)
card_spec.loader.exec_module(card_gifs)
LUMA = np.array([.299, .587, .114])


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

    def test_card_background_keeps_faint_glow_in_card_tint(self):
        card = Image.new("RGBA", (288, 288), (60, 60, 90, 255))
        frames = []
        for i in range(20):  # distinct frames, or Pillow merges duplicates
            frame = Image.new("RGBA", (288, 288), (0, 0, 0, 0))
            ImageDraw.Draw(frame).ellipse((40, 40, 247, 247), fill=(255, 120, 40, 40))
            ImageDraw.Draw(frame).ellipse((90 + i, 90, 197 + i, 197), fill=(255, 120, 40, 255))
            frames.append(frame)
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "glow.gif"
            package.save_gif(frames, output, card)
            with Image.open(output) as gif:
                glow = gif.convert("RGBA").getpixel((60, 144))
        # 40/255 alpha survives the ~10% cut and is blended into the card, not the navy matte.
        self.assertEqual(glow[3], 255)
        expected = [round(f * 40 / 255 + c * 215 / 255) for f, c in zip((255, 120, 40), (60, 60, 90))]
        for got, want in zip(glow[:3], expected):
            self.assertLessEqual(abs(got - want), 12)

    def test_glow_gifs_have_no_dark_rim_on_their_card(self):
        """Old #0f1c33 matte exports left 42-92% of edge pixels darker than the card (14 of 16)."""
        for name in card_gifs.NAMES:
            category = name.rsplit("-", 1)[0]
            card = np.asarray(Image.open(package.CARD_BACKGROUNDS / f"{category}.png")
                              .convert("RGB"), float) @ LUMA
            with Image.open(ROOT / f"public/feature-assets/garage-animated/{name}@3x.gif") as gif:
                for i, frame in enumerate(ImageSequence.Iterator(gif)):
                    rgba = np.asarray(frame.convert("RGBA"), float)
                    hole = rgba[..., 3] == 0
                    edge = ~hole & (np.roll(hole, 1, 0) | np.roll(hole, -1, 0)
                                    | np.roll(hole, 1, 1) | np.roll(hole, -1, 1))
                    dark = (rgba[..., :3] @ LUMA) < card - 10
                    self.assertLessEqual((dark & edge).sum() / edge.sum(), .15, f"{name} frame {i}")


if __name__ == "__main__":
    unittest.main()
