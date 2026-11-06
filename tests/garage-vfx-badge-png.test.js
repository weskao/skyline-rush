import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePngRgba, alphaComponentSizes } from './helpers/png-rgba.js';

const raster = new URL('../public/feature-assets/garage-vfx-skins/raster/', import.meta.url);

// A sprite-sheet cut once left a detached 5x5 fragment of a neighbouring icon beside the Limited crown.
for (const id of ['badge-equipped', 'badge-favorite', 'badge-limited']) {
  test(`${id}@3x.png is 216x216 transparent art with no stray neighbouring-sprite fragments`, () => {
    const image = decodePngRgba(readFileSync(new URL(`${id}@3x.png`, raster)));
    assert.deepEqual([image.width, image.height], [216, 216]);
    const sizes = alphaComponentSizes(image);
    assert.ok(sizes[0] > 10000, `${id}: main artwork present`);
    const stray = sizes.filter(size => size < 100);
    assert.deepEqual(stray, [], `${id}: detached fragments ${stray}`);
  });
}
