// The one pickup renderer: instanced models, halo, glow pulse and hover/spin. The race (effects.js) and the
// guide preview (pickup-preview-stage.ts) both draw through it, so a pickup looks the same in both places.
import * as THREE from 'three';
import { createMarkerPool } from './marker-pool.js';
import { animatePickup, createPickupGeometries, createPickupMaterials, pulsePickupMaterial } from './pickup-art.js';
import { createPickupAura, PICKUP_HALO_SCALE } from './pickup-aura.js';
import { pickupVisibilityScale, pickupTargetPixels } from './pickup-visibility.js';
import { acquirePickupModels } from './pickup-models.ts';

const UNTURNED = new THREE.Quaternion();
// At this distance a pickup is a small roadside cue; keep the same parts, tint
// and halo, and reserve the detailed mesh for the approach and collection.
const DISTANT_PICKUP_METRES = 150;
const distantKey = tier => tier + '-distant';

// Fit the simplified mesh once, not per frame. A GLB can have different authored bounds from
// its procedural stand-in; crossing the LOD boundary must not change its overall dimensions.
function fitDistantGeometry(geometry, reference) {
  geometry.computeBoundingBox();
  reference.computeBoundingBox();
  const from = geometry.boundingBox, to = reference.boundingBox;
  const sx = (to.max.x - to.min.x) / (from.max.x - from.min.x);
  const sy = (to.max.y - to.min.y) / (from.max.y - from.min.y);
  const sz = (to.max.z - to.min.z) / (from.max.z - from.min.z);
  const x = to.min.x - from.min.x * sx, y = to.min.y - from.min.y * sy, z = to.min.z - from.min.z * sz;
  geometry.scale(sx, sy, sz);
  geometry.translate(x, y, z);
  geometry.computeBoundingSphere();
}

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
    fitDistantGeometry(distantShapes[tier], shapes[tier]);
    poolShapes[key] = distantShapes[tier];
    poolMaterials[key] = distantMaterials[tier];
  }
  const pool = createMarkerPool('Nitro pickups', poolShapes, poolMaterials, capacity), aura = createPickupAura(capacity);
  const disposeStandIn = () => { for (const tier in shapes) { shapes[tier].dispose(); materials[tier].dispose(); } };
  const viewPosition = new THREE.Vector3(), viewForward = new THREE.Vector3(), offset = new THREE.Vector3();
  let projection = 0, targetPixels = 24;
  let loading = !!models;
  const ready = Promise.resolve(models).then(result => {
    if (disposed) result?.release(); else pending = result ?? null; // null: load failed, the stand-in stays
  }, () => {}).finally(() => { loading = false; });
  return {
    get loading() { return loading; },
    pool, objects: [pool.group, aura.mesh], ready,
    /** Once per frame before placing. True on the frame the loaded models replace the stand-in: re-warm shaders. */
    frame(time, reducedMotion, swapAllowed, camera = undefined, viewportHeight = 0) {
      // Cache once per frame. The guide has no perspective correction; all race qualities share it.
      projection = 0;
      if (distant && camera?.isPerspectiveCamera && viewportHeight > 0) {
        camera.getWorldPosition(viewPosition);
        camera.getWorldDirection(viewForward);
        projection = viewportHeight * Math.abs(camera.projectionMatrix.elements[5]) * .5;
        targetPixels = pickupTargetPixels(camera.aspect, viewportHeight);
      }
      const swap = pending && swapAllowed;
      if (swap) {
        disposeStandIn();
        loaded = pending; pending = null;
        ({ geometries: shapes, materials } = loaded);
        for (const tier in materials) {
          if (distantShapes[tier]) fitDistantGeometry(distantShapes[tier], shapes[tier]);
          pool.swap(tier, shapes[tier], materials[tier]);
        }
      }
      for (const tier in materials) pulsePickupMaterial(materials[tier], tier, time, reducedMotion);
      for (const tier in distantMaterials) pulsePickupMaterial(distantMaterials[tier], tier, time, reducedMotion);
      aura.begin();
      return !!swap;
    },
    /** Poses `marker` (already at the item's base position) and adds its halo; the caller adds marker.matrix to `pool`. */
    place(marker, item, time, reducedMotion, facing = UNTURNED) {
      animatePickup(marker, item, time, reducedMotion);
      let haloVisibility = 1;
      if (projection > 0) {
        const depth = offset.subVectors(marker.position, viewPosition).dot(viewForward);
        // Use the detailed silhouette for both LODs so crossing the 150 m switch cannot change scale.
        const geometry = shapes[item.tier] ?? shapes.cell;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        const bounds = geometry.boundingBox, base = marker.scale.x;
        const size = (bounds.max.y - bounds.min.y) * base;
        const scale = pickupVisibilityScale(depth, projection, size, targetPixels, 1.65);
        if (Number.isFinite(item.altitude) && item.altitude < .5)
          marker.position.y += Math.max(0, -bounds.min.y) * base * (scale - 1);
        marker.scale.multiplyScalar(scale);
        haloVisibility = Math.max(scale, pickupVisibilityScale(depth, projection,
          base * PICKUP_HALO_SCALE, targetPixels * 1.8, 2.5));
      }
      aura.add(item.tier, marker.position, facing, time, reducedMotion, haloVisibility);
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
