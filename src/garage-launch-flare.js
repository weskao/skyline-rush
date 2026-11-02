import * as THREE from 'three';
import { FLARE_SHAPES, LAUNCH_FLARE_STYLES } from './garage-launch-flare-styles.ts';
import { GLOW_VERTEX, GLOW_FRAGMENT, RAY_VERTEX, RAY_FRAGMENT, RING_VERTEX, RING_FRAGMENT,
  SHELL_VERTEX, SHELL_FRAGMENT, BODY_VERTEX, BODY_FRAGMENT } from './garage-launch-flare-shaders.js';

const ANCHOR = new THREE.Vector3(0, 0.6, 2.75); // just behind the tail; the car's rear faces +z
const MAX_RAYS = 24; // the richest style has 20 rays plus the crimson slash
const UP = new THREE.Vector3(0, 1, 0);

const hash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
// [x, y, z, length, thickness, tone] per ray in the car's frame: spread over a sphere (starburst/streak)
// or fanned upward with alternating depth (fan), so the burst has volume from every camera angle.
export function rayLayout(style) {
  if (style.shape === 'ring') return [];
  const rays = [];
  for (let i = 0; i < style.rays; i++) {
    const reach = (0.45 + 0.5 * hash(i + 7)) * style.size;
    if (style.shape === 'fan') {
      const a = -1.35 + 2.7 * i / Math.max(1, style.rays - 1);
      rays.push([Math.sin(a), Math.cos(a), i % 2 ? 0.45 : -0.45, reach, 0.05, 0]);
    } else {
      const y = 1 - 2 * (i + 0.5) / style.rays, r = Math.sqrt(1 - y * y), phi = i * 2.39996; // golden-angle sphere
      rays.push([Math.cos(phi) * r, y, Math.sin(phi) * r, reach, 0.05, 0]);
    }
  }
  if (style.shape === 'streak') rays.push([1, 1, 0.35, style.size * 1.15, 0.1, 1]); // the crimson slash
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
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material(GLOW_VERTEX, GLOW_FRAGMENT, { side: THREE.DoubleSide }));
  burst.name = 'Launch flare burst'; burst.frustumCulled = false; burst.visible = false;
  const cone = new THREE.ConeGeometry(1, 1, 6, 1, true); cone.translate(0, 0.5, 0); // base at the centre, tip at y=1
  const rays = instanced(cone, material(RAY_VERTEX, RAY_FRAGMENT, { side: THREE.DoubleSide }), MAX_RAYS, 'Launch flare rays');
  const rings = instanced(new THREE.TorusGeometry(1, 0.035, 8, 72), material(RING_VERTEX, RING_FRAGMENT), 2, 'Launch flare rings');
  rings.geometry.attributes.tone.array[1] = 1;
  rings.setMatrixAt(1, new THREE.Matrix4().makeRotationX(0.6)); // inner ring tilted: a gyroscope, not a target
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material(SHELL_VERTEX, SHELL_FRAGMENT));
  shell.name = 'Launch flare shell'; shell.frustumCulled = false; shell.visible = false;
  return { burst, rays, rings, shell, body: material(BODY_VERTEX, BODY_FRAGMENT) };
}

function writeRays(rays, layout) {
  const direction = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const tone = rays.geometry.attributes.tone;
  layout.forEach(([x, y, z, length, thickness, shade], i) => {
    rotation.setFromUnitVectors(UP, direction.set(x, y, z).normalize());
    rays.setMatrixAt(i, matrix.compose(direction.set(0, 0, 0), rotation, scale.set(thickness, length, thickness)));
    tone.array[i] = shade;
  });
  rays.count = layout.length;
  rays.instanceMatrix.needsUpdate = tone.needsUpdate = true;
}

export function createLaunchFlare(scene, vehicle) {
  const uniforms = Object.fromEntries(['age', 'power', 'time', 'shape', 'rays', 'swirl', 'pulse', 'corona', 'core', 'size']
    .map(key => [key, { value: 0 }]));
  uniforms.core.value = uniforms.size.value = 1; // never divide by zero, even in the hidden warm-up draw
  uniforms.primary = { value: new THREE.Vector3(1, 1, 1) }; uniforms.secondary = { value: new THREE.Vector3(1, 1, 1) };
  // All parts sit in the scene (hidden) from creation so shader warm-up compiles them before any race.
  const { burst, rays, rings, shell, body } = createParts(uniforms);
  const rig = new THREE.Group(); rig.name = 'Launch flare'; rig.add(burst, rays, rings, shell); scene.add(rig);
  const glow = new THREE.Mesh(vehicle.userData.body.geometry, body);
  glow.name = 'Launch flare body glow'; glow.visible = false; vehicle.userData.body.add(glow);
  const parts = [burst, rays, rings, shell, glow];
  const start = new THREE.Vector3();
  let style = null, age = 1, duration = 1;
  const hide = () => { age = 1; for (const part of parts) part.visible = false; };
  return {
    get active() { return burst.visible; },
    reset: hide,
    setSkin(id) {
      style = LAUNCH_FLARE_STYLES[id] ?? null;
      if (!style) return hide();
      for (const key of ['rays', 'swirl', 'pulse', 'corona', 'core', 'size']) uniforms[key].value = style[key];
      uniforms.shape.value = FLARE_SHAPES.indexOf(style.shape);
      uniforms.primary.value.fromArray(style.primary); uniforms.secondary.value.fromArray(style.secondary);
      writeRays(rays, rayLayout(style)); // event-driven: instance matrices never change per frame
      rays.rotation.z = 0;
    },
    trigger(position, quaternion, seconds) { // true when a premium flare fired
      if (!style) return false;
      const lift = style.size * (style.shape === 'fan' ? 0.15 : 0.5); // fans erupt upward from the tail
      start.set(ANCHOR.x, ANCHOR.y + lift, ANCHOR.z).applyQuaternion(quaternion).add(position);
      rig.quaternion.copy(quaternion); age = 0; duration = seconds;
      return true;
    },
    // Low keeps the glow and rays but skips the full-body and shell overdraw; VFX Off / Reduced Motion pass enabled=false.
    update(dt, time, origin, enabled, quality, power) {
      if (age < 1) age = Math.min(1, age + dt / duration);
      const on = !!style && enabled && age < 1;
      burst.visible = on; glow.visible = shell.visible = on && quality > 0.25;
      rays.visible = on && rays.count > 0; rings.visible = on && style.shape === 'ring';
      if (!on) return;
      uniforms.age.value = age; uniforms.time.value = time; uniforms.power.value = power;
      rays.rotation.z = style.swirl * time * 0.8; // the magenta vortex turns its rays around the travel axis
      rig.position.copy(start).sub(origin);
    },
  };
}
