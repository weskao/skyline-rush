// Tyre marks a drift lays under the player's rear wheels, the way big racers do it: one dark rubber ribbon per tyre
// with a tread grain, fading in where the slide starts and out where it ends. Marks stay on the road until the race
// resets (effects.reset); past SKID_CAPACITY quads the oldest are recycled. One draw call, a few quads uploaded per frame.
// Vertices are stored relative to `anchor` (the floating origin at the race's first mark) so they stay small and
// steady; the mesh is shifted by anchor - origin every frame. Scene position + origin = absolute, as in aero-vfx.js.
import * as THREE from 'three';

export const SKID_CAPACITY = 6000; // ~1.8 km of drifting per tyre at STEP
const STEP = 0.6; // metres of travel per quad
const HALF_WIDTH = 0.15; // the tyre's contact patch is 0.27 m wide
const LIFT = 0.025; // above the road: the tyre bottom sits at 0.02 (car-model.js)
const UNDER_SHADOW = 0.005; // world.js lays the ground shadow 0.03 above the road; the marks sit just under it
const BREAK = 4; // a jump this long (respawn, teleport) starts a new trail instead of bridging it
const TREAD_LENGTH = 3; // metres per tread-texture repeat
const FALLBACK_REAR = [[-1.05, 1.42], [1.05, 1.42]]; // car-model.js rear wheel pivots

// Alpha map (green channel): soft shoulders, three lighter grooves, streaky rubber along the length.
function treadTexture() {
  const width = 16, height = 64, data = new Uint8Array(width * height * 4);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const streak = Array.from({ length: width }, () => 0.75 + random() * 0.25);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = (x + 0.5) / width, edge = Math.min(1, Math.min(u, 1 - u) / 0.18);
    const groove = [0.3, 0.5, 0.7].some(g => Math.abs(u - g) < 0.04) ? 0.55 : 1;
    const value = edge * groove * streak[x] * (0.8 + random() * 0.2);
    data.fill(Math.round(value * 255), (y * width + x) * 4, (y * width + x) * 4 + 4);
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

/** `ground`: the car's ground shadow, placed on the road each frame (world.js); marks are projected onto its plane so a
 * drift's body roll cannot sink one trail into the road. Without it the car's own frame is the road. */
export function createSkidMarks(scene, car, ground = null) {
  const positions = new Float32Array(SKID_CAPACITY * 12), colors = new Float32Array(SKID_CAPACITY * 16).fill(1);
  const uvs = new Float32Array(SKID_CAPACITY * 8), index = new Uint32Array(SKID_CAPACITY * 6);
  for (let q = 0; q < SKID_CAPACITY; q++) index.set([0, 1, 2, 2, 1, 3].map(v => q * 4 + v), q * 6); // faces up
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage);
  const uv = new THREE.BufferAttribute(uvs, 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position).setAttribute('color', color).setAttribute('uv', uv);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, 0);
  const alphaMap = treadTexture();
  const material = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, vertexColors: true, alphaMap, transparent: true, opacity: 0.8,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Skid marks'; mesh.frustumCulled = false; mesh.renderOrder = -1; // under smoke and sparks
  scene.add(mesh); // present from creation, so shader warmup compiles it before GO

  const anchor = new THREE.Vector3(), point = new THREE.Vector3(), up = new THREE.Vector3(), across = new THREE.Vector3();
  const plane = new THREE.Vector3();
  const tyres = [0, 1].map(() => ({ on: false, last: new THREE.Vector3(), left: new THREE.Vector3(), right: new THREE.Vector3(), v: 0, alpha: 0, slot: -1 }));
  let anchored = false, next = 0, used = 0, wheels = null;

  function rearWheels() { // per race: a car swap happens between races, and reset() clears it
    const rear = (car.userData.wheels ?? []).filter(w => w.position.z > 0).sort((a, b) => a.position.x - b.position.x);
    return rear.length === 2 ? rear.map(w => [w.position.x, w.position.z]) : FALLBACK_REAR;
  }
  function writeEdge(tyre, offset) { tyre.left.toArray(positions, offset); tyre.right.toArray(positions, offset + 3); }
  function upload(slot) {
    position.addUpdateRange(slot * 12, 12); color.addUpdateRange(slot * 16, 16); uv.addUpdateRange(slot * 8, 8);
    position.needsUpdate = color.needsUpdate = uv.needsUpdate = true;
  }
  function setAlpha(slot, vertex, alpha) { colors[slot * 16 + vertex * 4 + 3] = alpha; }
  function end(tyre) { // fade the trail's last edge out
    if (tyre.on && tyre.slot >= 0) { setAlpha(tyre.slot, 2, 0); setAlpha(tyre.slot, 3, 0); upload(tyre.slot); }
    tyre.on = false; tyre.slot = -1;
  }
  function edges(tyre, from, to, dir) {
    across.crossVectors(dir, up).normalize().multiplyScalar(HALF_WIDTH);
    tyre.left.copy(to).sub(across); tyre.right.copy(to).add(across);
  }
  function lay(tyre, alpha) {
    const slot = next, length = point.distanceTo(tyre.last);
    writeEdge(tyre, slot * 12);
    edges(tyre, tyre.last, point, across.subVectors(point, tyre.last).normalize());
    writeEdge(tyre, slot * 12 + 6);
    const v = tyre.v + length / TREAD_LENGTH;
    const o = slot * 8;
    uvs[o] = uvs[o + 4] = 0; uvs[o + 2] = uvs[o + 6] = 1; uvs[o + 1] = uvs[o + 3] = tyre.v; uvs[o + 5] = uvs[o + 7] = v;
    setAlpha(slot, 0, tyre.alpha); setAlpha(slot, 1, tyre.alpha); setAlpha(slot, 2, alpha); setAlpha(slot, 3, alpha);
    upload(slot);
    tyre.v = v % 1e3; tyre.alpha = alpha; tyre.slot = slot; tyre.last.copy(point);
    next = (next + 1) % SKID_CAPACITY; used = Math.min(SKID_CAPACITY, used + 1);
    geometry.setDrawRange(0, used * 6);
  }

  return {
    mesh,
    /** `drift`: the player's drift while racing (null otherwise); `origin`: the scene's floating origin (scene + origin = absolute). */
    update(drift, origin) {
      if (!drift) { for (const tyre of tyres) end(tyre); }
      else {
        if (!anchored) { anchor.copy(origin); anchored = true; }
        car.updateWorldMatrix(true, false);
        if (ground) {
          ground.updateWorldMatrix(true, false);
          up.setFromMatrixColumn(ground.matrixWorld, 2).normalize(); // the shadow plane's normal
          plane.setFromMatrixPosition(ground.matrixWorld).addScaledVector(up, -UNDER_SHADOW);
        } else up.setFromMatrixColumn(car.matrixWorld, 1).normalize();
        const alpha = Math.min(1, 0.45 + drift.time * 0.5); // a held slide burns darker rubber
        wheels ??= rearWheels();
        for (let i = 0; i < 2; i++) {
          const tyre = tyres[i], [x, z] = wheels[i];
          point.set(x, LIFT, z).applyMatrix4(car.matrixWorld);
          if (ground) point.addScaledVector(up, -across.subVectors(point, plane).dot(up));
          point.add(origin).sub(anchor);
          const gap = point.distanceTo(tyre.last);
          if (tyre.on && gap > BREAK) end(tyre);
          if (!tyre.on) {
            edges(tyre, point, point, across.setFromMatrixColumn(car.matrixWorld, 2).negate().normalize());
            Object.assign(tyre, { on: true, alpha: 0, v: 0, slot: -1 }); tyre.last.copy(point);
          } else if (gap >= STEP) lay(tyre, alpha);
        }
      }
      if (anchored) mesh.position.subVectors(anchor, origin);
    },
    reset() {
      for (const tyre of tyres) { tyre.on = false; tyre.slot = -1; }
      anchored = false; next = used = 0; wheels = null;
      geometry.setDrawRange(0, 0);
    },
    dispose() {
      mesh.removeFromParent(); geometry.dispose(); material.dispose(); alphaMap.dispose();
    },
  };
}
