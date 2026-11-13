// The one pickup renderer: instanced models, halo, glow pulse and hover/spin. The race (effects.js) and the
// guide preview (pickup-preview-stage.ts) both draw through it, so a pickup looks the same in both places.
import * as THREE from 'three';
import { createMarkerPool } from './marker-pool.js';
import { animatePickup, createPickupGeometries, createPickupMaterials, pulsePickupMaterial } from './pickup-art.js';
import { createPickupAura } from './pickup-aura.js';
import { acquirePickupModels } from './pickup-models.ts';

const UNTURNED = new THREE.Quaternion();

/**
 * `renderer` starts the GLB load; without one (unit tests, no WebGL) the procedural stand-in models stay.
 * @param {number} capacity
 * @param {{ renderer?: unknown, envMap?: THREE.Texture | null, models?: unknown }} [options]
 */
export function createPickupMarkers(capacity, { renderer, envMap = null, models = renderer && acquirePickupModels(renderer, envMap) } = {}) {
  let shapes = createPickupGeometries(), materials = createPickupMaterials();
  let loaded = null, pending = null, disposed = false;
  const pool = createMarkerPool('Nitro pickups', shapes, materials, capacity), aura = createPickupAura(capacity);
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
      aura.begin();
      return !!swap;
    },
    /** Poses `marker` (already at the item's base position) and adds its halo; the caller adds marker.matrix to `pool`. */
    place(marker, item, time, reducedMotion, facing = UNTURNED) {
      animatePickup(marker, item, time, reducedMotion);
      aura.add(item.tier, marker.position, facing, time, reducedMotion);
    },
    end() { aura.end(); },
    dispose() {
      disposed = true;
      pool.group.removeFromParent(); aura.mesh.removeFromParent();
      pool.dispose(); aura.dispose();
      if (loaded) loaded.release(); else disposeStandIn();
      pending?.release();
    },
  };
}
