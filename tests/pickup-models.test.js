import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { parseGlb } from '../scripts/assets/check-glb.mjs';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { createPickupGeometries, PICKUP_GROUND_LIFT, PICKUP_SIZES } from '../src/pickup-art.js';
import { PICKUP_TIERS, plainGeometry } from '../src/pickup-models.ts';

const HOVER = .17, ITEM_HEIGHT = .85; // animatePickup's bob and effects.js' item height above the road

test('all four pickup tiers ship an authored model the shared renderer can instance', async () => {
  const standIns = createPickupGeometries(), size = new Vector3(), centre = new Vector3(), standInSize = new Vector3();
  try {
    for (const tier of PICKUP_TIERS) {
      const entry = MODEL_MANIFEST[`pickup-${tier}`];
      assert.ok(entry, `pickup-${tier} is in the model manifest`);
      assert.deepEqual(entry.nodes, [`pickup_${tier}`]);
      assert.deepEqual(entry.materials, [`pickup_${tier}_pbr`]);
      assert.equal(entry.fallback, 'procedural-pickup');
      assert.deepEqual(entry.lods, [], tier + ': one model for every quality tier, as in the guide');
      const gltf = await parseGlb(readFileSync(new URL('../public/' + entry.url, import.meta.url)));
      const mesh = gltf.scene.getObjectByName(`pickup_${tier}`);
      assert.ok(mesh?.isMesh, tier + ' is one mesh: one instanced draw call');
      const { material } = mesh, geometry = plainGeometry(mesh);
      assert.ok(material.isMeshStandardMaterial && !material.transparent, tier + ' is opaque PBR (no sorting, no overdraw)');
      assert.ok(material.map && material.emissiveMap && material.normalMap, tier + ' carries its baked colour, glow and normal maps');
      assert.ok(geometry.attributes.uv && geometry.attributes.normal, tier);
      geometry.computeBoundingBox();
      geometry.boundingBox.getSize(size);
      geometry.boundingBox.getCenter(centre);
      assert.ok(Math.abs(centre.x) < .05 && Math.abs(centre.z) < .05, tier + ' spins about its own axis');
      // Render-only ground clearance (PICKUP_GROUND_LIFT) was tuned on the stand-in: the model must fit it too.
      const lowest = ITEM_HEIGHT + PICKUP_GROUND_LIFT[tier] - HOVER + geometry.boundingBox.min.y * PICKUP_SIZES[tier];
      assert.ok(lowest >= .1, `${tier} clears the asphalt at the bottom of its hover: ${lowest.toFixed(2)} m`);
      standIns[tier].computeBoundingBox();
      standIns[tier].boundingBox.getSize(standInSize);
      const ratio = size.y / standInSize.y;
      assert.ok(ratio > .7 && ratio < 1.3, `${tier} is about as tall as its stand-in, so the swap does not pop: ${ratio.toFixed(2)}`);
      geometry.dispose();
    }
  } finally { Object.values(standIns).forEach(geometry => geometry.dispose()); }
});
