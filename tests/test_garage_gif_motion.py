#!/usr/bin/env python3
"""Asset-motion regression checks: use the *actual tracked* WebP and SVG sources."""
import importlib.util
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('garage_motion', ROOT / 'scripts/generate-garage-gifs.py')
garage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(garage)


class GarageAnimationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.assets = {name: (category, path) for category, name, path in garage.sources()}

    def test_all_thirty_nine_icons_have_distinct_art_direction(self):
        self.assertEqual(len(self.assets), 39)
        self.assertEqual(set(self.assets), set(garage.PROFILES))
        self.assertEqual(len({p[0] for p in garage.PROFILES.values()}), 39)

    def test_every_first_frame_preserves_untouched_source(self):
        for name, (category, path) in self.assets.items():
            with self.subTest(name=name):
                original = garage.load(path)
                first = garage.animate(original, category, name, 0, path)
                np.testing.assert_array_equal(np.asarray(first), np.asarray(original))

    def test_badges_and_rarities_preserve_shape_and_transparency(self):
        for name, (category, path) in self.assets.items():
            if category != 'badges-rarity':
                continue
            with self.subTest(name=name):
                original = garage.load(path)
                moving = garage.animate(original, category, name, 8, path)
                np.testing.assert_array_equal(
                    np.asarray(moving.getchannel('A')),
                    np.asarray(original.getchannel('A')),
                )
                self.assertGreater(np.count_nonzero(
                    np.any(np.asarray(original)[:, :, :3] !=
                           np.asarray(moving)[:, :, :3], axis=2)), 5)

    def test_nozzle_stays_still_and_flame_animates(self):
        for name, (category, path) in self.assets.items():
            if category != 'thruster':
                continue
            with self.subTest(name=name):
                original = np.asarray(garage.load(path))
                moving = np.asarray(garage.animate(garage.load(path), category, name, 8, path))
                # All thruster shells point upper-right; emission exits lower-left.
                np.testing.assert_array_equal(
                    moving[:round(original.shape[0]*.38), round(original.shape[1]*.62):],
                    original[:round(original.shape[0]*.38), round(original.shape[1]*.62):],
                )
                self.assertGreater(np.count_nonzero(original != moving), 5)

    def test_nitro_preserves_tail_silhouette(self):
        for name, (category, path) in self.assets.items():
            if category != 'nitro-trail':
                continue
            with self.subTest(name=name):
                original = garage.load(path)
                moving = garage.animate(original, category, name, 8, path)
                np.testing.assert_array_equal(
                    np.asarray(original.getchannel('A')), np.asarray(moving.getchannel('A')))
                self.assertGreater(np.count_nonzero(np.asarray(original) != np.asarray(moving)), 5)

    def test_real_store_lid_or_bow_moves_without_shifting_box_base(self):
        for name in ('store-box', 'store-bundle'):
            category, path = self.assets[name]
            original = np.asarray(garage.load(path))
            moving = np.asarray(garage.animate(garage.load(path), category, name, 8, path))
            np.testing.assert_array_equal(original[round(original.shape[0]*.72):],
                                          moving[round(original.shape[0]*.72):])
            self.assertGreater(np.count_nonzero(original != moving), 5)

    def test_airflow_car_remains_unmoved(self):
        for name, (category, path) in self.assets.items():
            if category != 'airflow':
                continue
            with self.subTest(name=name):
                original = np.asarray(garage.load(path))
                moving = np.asarray(garage.animate(garage.load(path), category, name, 8, path))
                # Sample inside the opaque car body. The Vortex trail passes BELOW
                # the vehicle too, so comparing the entire lower half is invalid.
                np.testing.assert_array_equal(original[192:203, 110:170],
                                              moving[192:203, 110:170])
                self.assertGreater(np.count_nonzero(original != moving), 5)


    def test_energy_edges_breathe_without_moving_hardware(self):
        # A brightness-only GIF is not animated combustion / shockwave geometry.
        for name, (category, path) in self.assets.items():
            if category not in ('thruster', 'launch-flare'):
                continue
            with self.subTest(name=name):
                source = garage.load(path)
                original_alpha = np.asarray(source.getchannel('A'))
                moving_alpha = np.asarray(garage.animate(source, category, name, 8, path).getchannel('A'))
                self.assertGreater(np.count_nonzero(original_alpha != moving_alpha), 15,
                                   f'{name} must animate energy transparency, not just RGB brightness')
                self.assertTrue(np.all(moving_alpha[original_alpha == 0] == 0),
                                'emission remains within native transparent silhouette')

    def test_gift_crate_lid_pivots_in_two_axes_not_only_bounces_vertically(self):
        from PIL import Image, ImageDraw
        scene = Image.new('RGBA', (216, 216))
        painter = ImageDraw.Draw(scene)
        painter.rectangle((76, 77, 157, 101), fill=(230, 45, 15, 255))
        painter.rectangle((70, 110, 168, 176), fill=(30, 30, 190, 255))
        moved = np.asarray(garage.animate_store(scene, 'hinged-crate', 1.0, 8))
        original = np.asarray(scene)
        def lid_x(frame):
            mask = (frame[:, :, 0] > 190) & (frame[:, :, 0] > frame[:, :, 2] * 1.6)
            return np.where(mask)[1].mean()
        self.assertGreater(abs(lid_x(moved) - lid_x(original)), 1.3,
                           'opened 3D lid must pivot around back hinge, not translate straight up')
        np.testing.assert_array_equal(moved[160:], original[160:],
                                      'crate base stays fixed while lid opens')



if __name__ == '__main__':
    unittest.main()