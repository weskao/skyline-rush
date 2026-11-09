"""Regression probes for source-style repair, not arbitrary canvas margins."""
import importlib.util
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

module_path = Path(__file__).resolve().parents[1] / "scripts/repair-hud-original-art.py"
spec = importlib.util.spec_from_file_location("hud_art_repair", module_path)
repair_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair_module)

class OriginalArtworkRepairTests(unittest.TestCase):
    def test_button_right_bezel_replaces_foreign_pixel_not_just_underlays_it(self):
        sample = Image.new("RGBA", (432, 156))
        d = ImageDraw.Draw(sample)
        d.rectangle((95, 25, 370, 143), fill=(48, 69, 111, 255))
        d.rectangle((100, 25, 116, 143), fill=(192, 211, 245, 255))
        d.rectangle((380, 70, 402, 96), fill=(1, 255, 1, 255))
        restored = repair_module.mirror_missing_button_frame(sample, "button-garage")
        self.assertNotEqual(restored.getpixel((385, 80))[:3], (1, 255, 1),
                            "an unrelated right-hand fragment survived")
        self.assertGreater(restored.getpixel((385, 80))[3], 120)
        self.assertEqual(restored.getpixel((250, 80)), sample.getpixel((250, 80)))

    def test_round_badge_missing_inner_face_is_restored_without_replacing_silhouette(self):
        sample = Image.new("RGBA", (216, 216))
        d = ImageDraw.Draw(sample)
        d.ellipse((40, 52, 170, 184), fill=(59, 77, 122, 255))
        d.rectangle((122, 120, 156, 157), fill=(0, 0, 0, 0))
        restored = repair_module.repair("ui-info", {"ui-info": sample})
        self.assertGreater(restored.getpixel((140, 130))[3], 180,
                           "missing badge face remains transparent")
        self.assertEqual(restored.getpixel((108, 68))[3], 255)

    def test_speech_bubble_foreign_transparent_wedge_is_filled_from_same_face(self):
        sample = Image.new("RGBA", (216, 216))
        d = ImageDraw.Draw(sample)
        d.rounded_rectangle((23, 57, 153, 181), radius=18,
                            fill=(48, 68, 108, 255))
        d.rectangle((119, 125, 145, 158), fill=(0, 0, 0, 0))
        restored = repair_module.repair("ui-tooltip", {"ui-tooltip": sample})
        self.assertGreater(restored.getpixel((145, 131))[3], 180,
                           "missing bubble panel was left with a hole")

    def test_round_face_inpainting_follows_the_original_opposite_side_gradient(self):
        image = Image.new("RGBA", (216, 216))
        pixel = image.load()
        for y in range(54, 164):
            for x in range(54, 164):
                if (x - 108) ** 2 + (y - 108) ** 2 < 54 ** 2:
                    pixel[x, y] = (x, y, 95, 180)
        ImageDraw.Draw(image).rectangle((130, 124, 150, 148),
                                        fill=(0, 0, 0, 0))
        repaired = repair_module.restore_gallery_face(image, "ui-info")
        self.assertEqual(repaired.getpixel((140, 137)),
                         image.getpixel((76, 137)))
        self.assertEqual(repaired.getpixel((105, 130)),
                         image.getpixel((105, 130)))

    def test_bubble_inpainting_preserves_dark_enamel_not_upper_bezel(self):
        image = Image.new("RGBA", (216, 216))
        pixel = image.load()
        for y in range(62, 159):
            for x in range(50, 153):
                pixel[x, y] = (x, y, 98, 180)
        ImageDraw.Draw(image).rectangle((125, 125, 148, 150),
                                        fill=(0, 0, 0, 0))
        repaired = repair_module.restore_gallery_face(image, "ui-tooltip")
        self.assertEqual(repaired.getpixel((140, 140)),
                         image.getpixel((105, 140)))
        self.assertEqual(repaired.getpixel((90, 140)),
                         image.getpixel((90, 140)))

    def test_original_enamel_faces_have_no_dark_cutout_inside_the_frame(self):
        folder = Path(__file__).resolve().parents[1] / "public/feature-assets/mobile-controls-hud/raster"
        for name, point in (("ui-info", (140, 140)), ("ui-tooltip", (136, 144))):
            with Image.open(folder / (name + "@3x.webp")) as opened:
                px = opened.convert("RGBA").getpixel(point)
            print(name, point, "RGBA", px)
            with Image.open(folder / (name + "@3x.webp")) as sample:
                sample = sample.convert("RGBA")
                for yy in (110, 125, 135, 145):
                    print("PROFILE", name, yy, [sample.getpixel((xx, yy))
                          for xx in (75, 82, 89, 100, 110, 120, 130, 140, 150)])
            neighbor = sample.getpixel((82, 140)) if name == "ui-info" else sample.getpixel((89, 139))
            self.assertGreaterEqual(px[3], max(20, neighbor[3] // 2),
                                    (name, point, "face is much more transparent than its original enamel"))
            self.assertGreater(max(px[:3]), 35, (name, point, "face contains dark cutout"))

if __name__ == "__main__":
    unittest.main()
