import * as THREE from 'three';
import { HOOP_VERTEX, HOOP_FRAGMENT, TANK_HOOP_VERTEX, TANK_HOOP_FRAGMENT, TANK_HALO_VERTEX, TANK_HALO_FRAGMENT } from './pickup-collect-shaders.js';

const FLAT = -Math.PI / 2;
const GOLD = [0xffb82f, 0xffc657];
const PRISM = [0x73f5ff, 0xa57aff, 0xff7ed6];
const SMOOTH = THREE.MathUtils.smoothstep;

// A closed strip uses its UVs to draw the projected ellipse on the GPU.
export function createTankHaloGeometry() {
  return new THREE.PlaneGeometry(1, 1, 64, 1);
}

export function createTankHoop(geometry, haloGeometry, index, materials) {
  const uniforms = {
    tint: { value: new THREE.Color(GOLD[index]) },
    core: { value: new THREE.Color(0xfff0ad) },
    age: { value: 0 }, power: { value: 0 }, phase: { value: index * 1.8 },
    tubeWidth: { value: .088 }, lift: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: TANK_HOOP_VERTEX, fragmentShader: TANK_HOOP_FRAGMENT, uniforms,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: TANK_HALO_VERTEX, fragmentShader: TANK_HALO_FRAGMENT, uniforms,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  materials.add(material);
  materials.add(haloMaterial);
  const ring = new THREE.Mesh(geometry, material);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.name = 'Pickup tank halo';
  halo.frustumCulled = ring.frustumCulled = false;
  ring.add(halo);
  return ring;
}

export function createPickupHoop(geometry, slotTier, index, materials) {
  const prism = slotTier === 'overcharge';
  const tint = (prism ? PRISM : GOLD)[index % (prism ? PRISM.length : GOLD.length)];
  const material = new THREE.ShaderMaterial({
    vertexShader: HOOP_VERTEX, fragmentShader: HOOP_FRAGMENT,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: {
      tint: { value: new THREE.Color(tint) }, core: { value: new THREE.Color(prism ? 0xefd8ff : 0xfff0ad) },
      age: { value: 0 }, power: { value: 0 }, prism: { value: prism ? [.72, .76, .68][index] : 0 },
      phase: { value: index * (prism ? 2.1 : 1.8) }, halo: { value: 0 }, width: { value: 1 },
    },
  });
  materials.add(material);
  const ring = new THREE.Mesh(geometry, material);
  const haloMaterial = material.clone();
  haloMaterial.uniforms = { ...material.uniforms, halo: { value: 1 } };
  materials.add(haloMaterial);
  const halo = new THREE.Mesh(geometry, haloMaterial);
  halo.frustumCulled = ring.frustumCulled = false;
  ring.add(halo);
  return ring;
}

export function paintPickupHoop(ring, age, power, width, halo) {
  ring.material.opacity = Math.max(0, power);
  const uniforms = ring.material.uniforms;
  if (!uniforms) return;
  uniforms.age.value = age;
  uniforms.power.value = ring.material.opacity;
  if (uniforms.tubeWidth) {
    uniforms.tubeWidth.value = width;
    uniforms.lift.value = ring.position.y * ring.parent.scale.y;
  } else uniforms.width.value = width / (.045 * ring.scale.x);
  ring.children[0].visible = halo;
}

export function animateTankHoop(ring, age, index, strength, halo) {
  const phase = THREE.MathUtils.clamp((age - .045 - index * .125) / .53, 0, 1);
  const rise = SMOOTH(phase, 0, 1), spread = 1 + .06 * rise;
  ring.visible &&= phase > 0 && phase < 1;
  ring.position.set(0, .09 + 1.4 * 1.23 * rise, .10);
  ring.rotation.set(FLAT, 0, 0);
  ring.scale.set(1.34 * spread, 2.52 * spread, 1.34);
  const power = Math.min(1, age / .068) * Math.min(1, phase / .13) * (1 - phase ** 2) * (.94 - index * .08) * strength;
  paintPickupHoop(ring, age, power, index === 0 ? .088 : .072, halo);
}

export function animatePrismHoop(ring, age, index, strength, halo) {
  const phase = Math.max(0, age - index * .07);
  ring.visible &&= phase > 0;
  ring.position.set(0, 1.4 * (.46 + .15 * (1 - (1 - Math.min(1, phase / .55)) ** 2)), .10);
  ring.rotation.set((index ? .5 : FLAT) + phase * (1.6 + index), index * 1.05 + phase * 2.2 * index,
    phase * 2.4 * (index % 2 ? -1 : 1));
  ring.scale.setScalar(.60 + 5.2 * phase / (1 + .80 * phase * phase));
  const bloom = Math.exp(-((age - .19) ** 2) / .013);
  const power = Math.min(1, phase / .075) * Math.max(0, 1 - phase / (.84 - index * .045)) ** 2
    * (1.21 + .17 * bloom) * (1 - index * .13) * strength;
  const width = ([.132, .102, .074][index] + .024 * Math.min(1, phase / .28)) * (1 - .18 * Math.min(1, phase / .64));
  paintPickupHoop(ring, age, power, width, halo);
}
