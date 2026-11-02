import * as THREE from 'three';
import { FLARE_SHAPES, LAUNCH_FLARE_STYLES } from './garage-launch-flare-styles.ts';
import { POOL_VERTEX, POOL_FRAGMENT, RAY_VERTEX, RAY_FRAGMENT, RING_VERTEX, RING_FRAGMENT,
  BODY_VERTEX, BODY_FRAGMENT } from './garage-launch-flare-shaders.js';

const RIM_X = 1.1, RIM_Z = 2.2; // half-extents of the body footprint the flare wraps (car frame, rear faces +z)
const MAX_RAYS = 24; // the richest style has 20 rays plus the crimson slashes
const UP = new THREE.Vector3(0, 1, 0);

const hash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const ray = (phi, rise, length, thickness = 0.085, tone = 0) => [
  Math.cos(phi) * RIM_X * 1.02, 0.08, Math.sin(phi) * RIM_Z * 1.02, // base on the sill line, just under the body
  Math.cos(phi), rise, Math.sin(phi), length, thickness, tone];
// [base xyz, direction xyz, length, thickness, tone] per ray: all rise from under the body's edge so the burst
// wraps the car. Starburst/streak circle the whole body; fans rise as wings on both sides.
export function rayLayout(style) {
  if (style.shape === 'ring') return [];
  const rays = [], n = style.rays;
  for (let i = 0; i < n; i++) {
    const length = (0.7 + 0.6 * hash(i + 7)) * style.size; // long enough to clear the body they rise around
    if (style.shape === 'fan') {
      const side = i % 2 ? 0 : Math.PI, spread = -0.9 + 1.8 * Math.floor(i / 2) / Math.max(1, Math.ceil(n / 2) - 1);
      rays.push(ray(side + spread, 1.1 + 0.6 * hash(i), length));
    } else rays.push(ray(i * 2.39996, 0.45 + 0.5 * hash(i + 3), length)); // golden-angle spacing around the body
  }
  if (style.shape === 'streak') { // two crimson slashes cut diagonally over the roof
    rays.push([-RIM_X * 1.05, 0.1, RIM_Z * 0.5, 0.8, 0.9, -0.55, style.size * 1.2, 0.1, 1]);
    rays.push([RIM_X * 1.05, 0.1, -RIM_Z * 0.5, -0.8, 0.9, 0.55, style.size * 1.2, 0.1, 1]);
  }
  return rays;
}

function instanced(geometry, material, count, name) {
  geometry.setAttribute('tone', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name; mesh.frustumCulled = false; mesh.visible = false;
  return mesh;
}

function createParts(uniforms) {
  const additive = { uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const material = (vertexShader, fragmentShader, extra = {}) => new THREE.ShaderMaterial({ ...additive, vertexShader, fragmentShader, ...extra });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(POOL_VERTEX, POOL_FRAGMENT));
  pool.name = 'Launch flare burst'; pool.frustumCulled = false; pool.visible = false;
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.05; pool.scale.set(RIM_X * 5, RIM_Z * 3.6, 1); // flat on the road
  const cone = new THREE.ConeGeometry(1, 1, 6, 1, true); cone.translate(0, 0.5, 0); // base at the sill, tip at y=1
  const rays = instanced(cone, material(RAY_VERTEX, RAY_FRAGMENT, { side: THREE.DoubleSide }), MAX_RAYS, 'Launch flare rays');
  const rings = instanced(new THREE.TorusGeometry(1, 0.04, 8, 72), material(RING_VERTEX, RING_FRAGMENT), 2, 'Launch flare rings');
  const around = new THREE.Matrix4().makeRotationX(-Math.PI / 2).scale(new THREE.Vector3(RIM_X * 1.32, RIM_Z * 1.25, 1));
  rings.setMatrixAt(0, around); rings.setMatrixAt(1, around); // horizontal, sized to enclose the body
  rings.geometry.attributes.tone.array[1] = 1;
  return { pool, rays, rings, body: material(BODY_VERTEX, BODY_FRAGMENT) };
}

function writeRays(rays, layout) {
  const base = new THREE.Vector3(), direction = new THREE.Vector3(), rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(), matrix = new THREE.Matrix4(), tone = rays.geometry.attributes.tone;
  layout.forEach(([x, y, z, dx, dy, dz, length, thickness, shade], i) => {
    rotation.setFromUnitVectors(UP, direction.set(dx, dy, dz).normalize());
    rays.setMatrixAt(i, matrix.compose(base.set(x, y, z), rotation, scale.set(thickness, length, thickness)));
    tone.array[i] = shade;
  });
  rays.count = layout.length;
  rays.instanceMatrix.needsUpdate = tone.needsUpdate = true;
}

// effects: the car-mounted effects group (outside the silhouette Studio framing measures); vehicle: the car.
export function createLaunchFlare(effects, vehicle) {
  const uniforms = Object.fromEntries(['age', 'power', 'time', 'shape', 'rays', 'swirl', 'pulse', 'corona', 'core', 'size']
    .map(key => [key, { value: 0 }]));
  uniforms.core.value = uniforms.size.value = 1;
  uniforms.primary = { value: new THREE.Vector3(1, 1, 1) }; uniforms.secondary = { value: new THREE.Vector3(1, 1, 1) };
  // Every part rides on the car and sits in the scene (hidden) from creation so shader warm-up compiles it.
  const { pool, rays, rings, body } = createParts(uniforms);
  const rig = new THREE.Group(); rig.name = 'Launch flare'; rig.add(pool, rays, rings); effects.add(rig);
  const glow = new THREE.Mesh(vehicle.userData.body.geometry, body);
  glow.name = 'Launch flare body glow'; glow.visible = false; vehicle.userData.body.add(glow);
  const parts = [pool, rays, rings, glow];
  let style = null, age = 1, duration = 1;
  const hide = () => { age = 1; for (const part of parts) part.visible = false; };
  return {
    get active() { return pool.visible; },
    reset: hide,
    setSkin(id) {
      style = LAUNCH_FLARE_STYLES[id] ?? null;
      if (!style) return hide();
      for (const key of ['rays', 'swirl', 'pulse', 'corona', 'core', 'size']) uniforms[key].value = style[key];
      uniforms.shape.value = FLARE_SHAPES.indexOf(style.shape);
      uniforms.primary.value.fromArray(style.primary); uniforms.secondary.value.fromArray(style.secondary);
      writeRays(rays, rayLayout(style)); // event-driven: instance matrices never change per frame
      rays.rotation.y = 0;
    },
    trigger(position, quaternion, seconds) { // true when a premium flare fired; it is attached to the car
      if (!style) return false;
      age = 0; duration = seconds;
      return true;
    },
    // Low keeps the pool and rays but skips the full-body overdraw; VFX Off / Reduced Motion pass enabled=false.
    update(dt, time, origin, enabled, quality, power) {
      if (age < 1) age = Math.min(1, age + dt / duration);
      const on = !!style && enabled && age < 1;
      pool.visible = on; glow.visible = on && quality > 0.25;
      rays.visible = on && rays.count > 0; rings.visible = on && style.shape === 'ring';
      if (!on) return;
      uniforms.age.value = age; uniforms.time.value = time; uniforms.power.value = power;
      rays.rotation.y = style.swirl * time * 0.8; // the magenta vortex swirls its rays around the car
    },
  };
}
