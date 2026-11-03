import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canopy, carShell } from './geometry.ts';
import { LIFT_PORTS } from './effects.js';
import { roadsterBody, roadsterCanopy, addRoadsterTrim, addRoadsterWheelDetail } from './roadster-fidelity.js';
import { EXTRA_RACE_STYLES, TRAFFIC_STYLES } from './vehicle-fleet-styles.js';
const box = new THREE.BoxGeometry(1, 1, 1);

export function material(color, metalness = 0, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

export function block(parent, mat, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(box, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

const lampGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12);

function lamp(parent, mat, x, y, z, radius = 1) {
  const mesh = new THREE.Mesh(lampGeometry, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(radius, 1, radius);
  parent.add(mesh);
}

function mirrors(parent, mat, y) {
  for (const side of [-1, 1]) block(parent, mat, side * 1.15, y, -0.4, 0.2, 0.12, 0.32);
}

// Each style returns its wing; a wing with userData.lift rises on boost, braking and flight.
export const CAR_STYLES = {
  // Player: low wedge, smoked fastback canopy, full-width tail bar, quad thruster ports, pop-up wing.
  roadster: {
    color: '#e6e9e7', glass: '#292823', light: [2.2, 0.02, 0.05], detailed: true,
    body: roadsterBody(),
    cabin: roadsterCanopy(),
    trim(group, m) { return addRoadsterTrim(group, m); },
  },
  // NOVA: long-tail hypercar, twin tail fins bridged by a blade, split magenta tail lights.
  nova: {
    color: '#fd775d', glass: '#121a24', light: [3.5, 0.06, 0.6],
    body: carShell([[-2.5, 0.8, 0.42, 0.58], [-1.9, 1.08, 0.38, 0.8], [-1.1, 1.14, 0.4, 0.84], [0.7, 1.12, 0.4, 0.9], [1.7, 1.16, 0.42, 0.94], [2.7, 0.92, 0.5, 0.82]]),
    cabin: canopy(0.78, -0.8, 0.82, 1.4, 0.9, 0.55, -0.1, 0.55, 1.36),
    trim(group, m) {
      for (const side of [-1, 1]) {
        block(group, m.white, side * 0.5, 0.52, -2.51, 0.4, 0.035, 0.04);
        block(group, m.light, side * 0.5, 0.74, 2.71, 0.66, 0.06, 0.04);
        block(group, m.paint, side * 0.62, 1.08, 2.2, 0.05, 0.42, 0.95);
      }
      mirrors(group, m.black, 1);
      return block(group, m.black, 0, 1.31, 2.3, 1.24, 0.05, 0.5);
    },
  },
  // ORBIT: rounded GT, tall bubble canopy, ducktail lip, round cyan lamps.
  orbit: {
    color: '#b9c39a', glass: '#1d3a3a', light: [0.2, 1.8, 3.2],
    body: carShell([[-2.35, 0.86, 0.44, 0.7], [-1.8, 1.06, 0.4, 0.88], [-1.2, 1.12, 0.42, 0.96], [0.8, 1.12, 0.42, 0.98], [1.6, 1.12, 0.46, 0.98], [2.25, 0.96, 0.54, 0.88]]),
    cabin: canopy(0.92, -1, 0.95, 1.5, 0.97, 0.72, -0.4, 0.8, 1.6),
    trim(group, m) {
      block(group, m.paint, 0, 1.6, 0.2, 1.43, 0.045, 1.2);
      for (const x of [-0.6, 0.6]) lamp(group, m.white, x, 0.6, -2.36);
      for (const x of [-0.74, -0.42, 0.42, 0.74]) lamp(group, m.light, x, 0.76, 2.26);
      mirrors(group, m.black, 1.1);
      return block(group, m.paint, 0, 0.96, 2.05, 1.96, 0.07, 0.36);
    },
  },
  // APEX: track car with splitter, roof scoop, side intakes, tall endplate wing, amber C-lights.
  apex: {
    color: '#7baab6', glass: '#151c2a', light: [3.4, 1, 0.04],
    body: carShell([[-2.45, 0.9, 0.36, 0.6], [-1.9, 1.1, 0.36, 0.8], [-1.2, 1.15, 0.38, 0.92], [0.8, 1.13, 0.38, 0.96], [1.55, 1.16, 0.42, 1], [2.25, 1.04, 0.5, 0.94]]),
    cabin: canopy(0.86, -0.9, 0.9, 1.3, 0.98, 0.58, -0.2, 0.55, 1.46),
    trim(group, m) {
      block(group, m.black, 0, 0.37, -2.52, 2, 0.04, 0.3);
      block(group, m.black, 0, 1.52, 0.3, 0.34, 0.14, 0.5);
      for (const side of [-1, 1]) {
        block(group, m.white, side * 0.6, 0.54, -2.46, 0.5, 0.05, 0.04).rotation.z = side * 0.12;
        block(group, m.light, side * 0.78, 0.86, 2.27, 0.42, 0.055, 0.04);
        block(group, m.light, side * 0.99, 0.73, 2.27, 0.055, 0.3, 0.04);
        block(group, m.black, side * 1.13, 0.78, 0.6, 0.06, 0.18, 0.7);
        block(group, m.black, side * 0.55, 1.3, 2, 0.06, 0.68, 0.14);
        block(group, m.black, side * 1.15, 1.56, 2, 0.04, 0.34, 0.62);
      }
      return block(group, m.black, 0, 1.66, 2, 2.3, 0.07, 0.46);
    },
  },
  ...EXTRA_RACE_STYLES,
  // Traffic: upright commuter shape so racers stand out.
  commuter: {
    color: '#8c99a4', glass: '#172e40', light: [3.5, 0.08, 0.12],
    body: carShell([[-2.38, 0.8, 0.48, 0.66], [-1.8, 1.03, 0.4, 0.86], [-1.25, 1.12, 0.42, 1.01], [0.8, 1.08, 0.42, 1.02], [1.55, 1.16, 0.46, 1.01], [2.28, 0.98, 0.54, 0.83]]),
    cabin: canopy(0.9, -1.03, 1, 1.32, 1.02, 0.72, -0.35, 0.63, 1.59),
    trim(group, m) {
      block(group, m.paint, 0, 0.94, -1.4, 1.94, 0.1, 1.45).rotation.x = -0.07;
      block(group, m.paint, 0, 1.6, 0.14, 1.43, 0.045, 1.01);
      block(group, m.paint, 0, 1.08, 1.52, 2.06, 0.18, 1.01);
      block(group, m.light, 0, 0.98, 2.24, 1.97, 0.065, 0.05);
      block(group, m.black, 0, 0.7, 2.25, 1.5, 0.17, 0.04);
      for (const side of [-1, 1]) block(group, m.white, side * 0.78, 0.94, -2.23, 0.46, 0.055, 0.05);
      mirrors(group, m.black, 1.19);
      return block(group, m.black, 0, 1.18, 1.99, 2.3, 0.07, 0.34);
    },
  },
  ...TRAFFIC_STYLES,
};

// Explicit race-grid order: YOU uses roadster, the seven opponents each have a unique body.
export const RIVAL_CAR_STYLES = [
  CAR_STYLES.nova, CAR_STYLES.orbit, CAR_STYLES.apex, CAR_STYLES.vega,
  CAR_STYLES.pulse, CAR_STYLES.comet, CAR_STYLES.rift,
];
export const TRAFFIC_CAR_STYLES = [CAR_STYLES.commuter, CAR_STYLES.crossover, CAR_STYLES.hatch];

const detailedTireGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.27, 32);
const detailedRimGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.285, 32);

// Static parts that share one of a car's materials draw as one mesh (same triangles, transforms baked in).
// Cached per style: the geometry depends only on that constant style, so it is never invalidated; a world or
// garage dispose frees its GPU buffers like the shared box geometry, and three.js re-uploads on the next draw.
const mergedParts = new WeakMap();
function mergeStaticParts(group, style, moving) {
  const byMaterial = new Map();
  for (const child of group.children) if (child.isMesh && !moving.includes(child)) {
    byMaterial.set(child.material, [...(byMaterial.get(child.material) ?? []), child]);
  }
  const parts = [...byMaterial.values()].filter(meshes => meshes.length > 1);
  if (!mergedParts.has(style)) mergedParts.set(style, parts.map(meshes => {
    // GeometryUtils requires identical attributes; procedural detail meshes
    // may lack UVs while primitives have them. UVs are unused by these solid
    // materials, so give only the missing meshes a matching zero UV stream.
    const needsUv = meshes.some(mesh => mesh.geometry.hasAttribute('uv'));
    const geometry = mergeGeometries(meshes.map(mesh => {
      mesh.updateMatrix();
      const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if (needsUv && !transformed.hasAttribute('uv')) {
        transformed.setAttribute('uv', new THREE.Float32BufferAttribute(
          new Float32Array(transformed.attributes.position.count * 2), 2,
        ));
      }
      return transformed;
    }));
    if (!geometry) throw new Error('Incompatible static car mesh attributes');
    geometry.userData.mergedCarParts = true;
    return geometry;
  }));
  mergedParts.get(style).forEach((geometry, i) => {
    group.remove(...parts[i]);
    // Roadster trim uses module-scoped materials; each car must own its material
    // instance even while sharing the cached, immutable merged geometry.
    const merged = new THREE.Mesh(geometry, parts[i][0].material.clone());
    // Retain semantic detail labels even when draw-call batching collapses multiple meshes.
    merged.userData.mergedPartNames = parts[i].map(part => part.name).filter(Boolean);
    group.add(merged);
  });
}

export function makeCar(style, color = style.color) {
  const group = new THREE.Group();
  const detailed = !!style.detailed;
  const paint = detailed
    ? new THREE.MeshPhysicalMaterial({ color, metalness: 0.13, roughness: 0.19,
      clearcoat: 0.88, clearcoatRoughness: 0.10, envMapIntensity: 1.4 })
    : material(color, 0.55, 0.25);
  const black = material('#101923', 0.4, 0.4);
  const glass = detailed
    ? new THREE.MeshPhysicalMaterial({ color: style.glass, metalness: 0.04, roughness: 0.075,
      clearcoat: 0.96, clearcoatRoughness: 0.065, envMapIntensity: 1.6 })
    : material(style.glass, 0.85, 0.16);
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(...style.light) });
  const white = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.1, 2.6) });
  block(group, black, 0, 0.48, 0, 2.08, 0.26, 4.38);
  const body = new THREE.Mesh(style.body, paint);
  group.add(body, new THREE.Mesh(style.cabin, glass));
  const wing = style.trim(group, { paint, black, light, white });
  for (const side of [-1, 1]) {
    block(group, black, side * 1.09, 0.55, 0.04, 0.04, 0.13, 2.32);
    if (detailed) block(group, white, side * 1.1, 0.48, 0, 0.025, 0.025, 2.5);
  }
  const wheels = [];
  const tires = material('#101114');
  const rims = material('#8a96a0', 0.85, 0.22);
  const tireGeometry = detailed ? detailedTireGeometry : new THREE.CylinderGeometry(0.44, 0.44, 0.27, 16);
  const rimGeometry = detailed ? detailedRimGeometry : new THREE.CylinderGeometry(0.3, 0.3, 0.285, 10);
  for (const x of [-1.05, 1.05]) for (const z of [-1.35, 1.42]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeometry, tires);
    const rim = new THREE.Mesh(rimGeometry, rims);
    tire.rotation.z = rim.rotation.z = Math.PI / 2;
    wheel.add(tire, rim);
    if (detailed) addRoadsterWheelDetail(wheel, Math.sign(x));
    wheel.position.set(x, 0.46, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const jets = new THREE.Group();
  const fanMaterial = material('#71818a', 0.65, 0.45);
  const fanGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.025, 12);
  for (const [x, z] of LIFT_PORTS) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10), black);
    nozzle.position.set(x, 0.3, z);
    group.add(nozzle);
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.position.set(x, 0.19, z);
    jets.add(fan);
  }
  jets.visible = false;
  group.add(jets);
  mergeStaticParts(group, style, [body, wing]);
  Object.assign(group.userData, { wheels, jets, body, wing, brakeLight: light, lightColor: light.color.clone() });
  return group;
}

export function instances(geometry, mat, count, scene) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

