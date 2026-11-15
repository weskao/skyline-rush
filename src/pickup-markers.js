// The one pickup renderer: instanced models, halo, glow pulse and hover/spin. The race (effects.js) and the
// guide preview (pickup-preview-stage.ts) both draw through it, so a pickup looks the same in both places.
import * as THREE from 'three';
import { createMarkerPool } from './marker-pool.js';
import { animatePickup, createPickupGeometries, createPickupMaterials, pulsePickupMaterial } from './pickup-art.js';
import { createPickupAura } from './pickup-aura.js';
import { acquirePickupModels } from './pickup-models.ts';

const UNTURNED = new THREE.Quaternion();
// At this distance a pickup is a small roadside cue; keep the same parts, tint
// and halo, and reserve the detailed mesh for the approach and collection.
const DISTANT_PICKUP_METRES = 150;
const distantKey = tier => tier + '-distant';

/**
 * `renderer` starts the GLB load; without one (unit tests, no WebGL) the procedural stand-in models stay.
 * @param {number} capacity
 * @param {{ renderer?: unknown, envMap?: THREE.Texture | null, models?: unknown, distant?: boolean }} [options]
 */
export function createPickupMarkers(capacity, { renderer, envMap = null, models = renderer && acquirePickupModels(renderer, envMap), distant = false } = {}) {
  let shapes = createPickupGeometries(), materials = createPickupMaterials();
  let loaded = null, pending = null, disposed = false;
  const distantShapes = distant ? createPickupGeometries(true) : {};
  const distantMaterials = distant ? createPickupMaterials() : {};
  const poolShapes = { ...shapes }, poolMaterials = { ...materials };
  for (const tier in distantShapes) {
    const key = distantKey(tier);
    poolShapes[key] = distantShapes[tier];
    poolMaterials[key] = distantMaterials[tier];
  }
  const pool = createMarkerPool('Nitro pickups', poolShapes, poolMaterials, capacity), aura = createPickupAura(capacity);
  const disposeStandIn = () => { for (const tier in shapes) { shapes[tier].dispose(); materials[tier].dispose(); } };
  const ready = Promise.resolve(models).then(result => {
    if (disposed) result?.release(); else pending = result ?? null; // null: load failed, the stand-in stays
  }, () => {});
  return {
    pool, objects: [pool.group, aura.mesh], ready,
    /** Once per frame before placing. True on the frame the loaded models replace the stand-in: re-warm shaders. */
    frame(time, reducedMotion, swapAllowed) {
      const swap = pending && swapAllowed;
      if (swap) {
        disposeStandIn();
        loaded = pending; pending = null;
        ({ geometries: shapes, materials } = loaded);
        for (const tier in materials) pool.swap(tier, shapes[tier], materials[tier]);
      }
      for (const tier in materials) pulsePickupMaterial(materials[tier], tier, time, reducedMotion);
      for (const tier in distantMaterials) pulsePickupMaterial(distantMaterials[tier], tier, time, reducedMotion);
      aura.begin();
      return !!swap;
    },
    /** Poses `marker` (already at the item's base position) and adds its halo; the caller adds marker.matrix to `pool`. */
    place(marker, item, time, reducedMotion, facing = UNTURNED) {
      animatePickup(marker, item, time, reducedMotion);
      aura.add(item.tier, marker.position, facing, time, reducedMotion);
    },
    key(tier, distanceAhead) {
      return distant && distanceAhead > DISTANT_PICKUP_METRES ? distantKey(tier) : tier;
    },
    end() { aura.end(); },
    dispose() {
      disposed = true;
      pool.group.removeFromParent(); aura.mesh.removeFromParent();
      pool.dispose(); aura.dispose();
      if (loaded) loaded.release(); else disposeStandIn();
      for (const tier in distantShapes) { distantShapes[tier].dispose(); distantMaterials[tier].dispose(); }
      pending?.release();
    },
  };
}
