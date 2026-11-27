import * as THREE from 'three';
import { EFFECT_TIMES } from './ring-layout.ts';

const OPACITY = 0.58;
const EDGE_TIME = 0.22;
interface PhaseCar { effects: { ghost: number } }

export function graceOpacity(car: PhaseCar, calm: boolean): number {
  const left = car.effects.ghost;
  if (left <= 0) return 1;
  if (calm) return OPACITY;
  const edge = Math.min(left, EFFECT_TIMES.ghost - left);
  return THREE.MathUtils.lerp(1, OPACITY, THREE.MathUtils.smoothstep(edge, 0, EDGE_TIME));
}

/** Capture only the car's own materials, before VFX are attached. GLBs follow the body opacity via garage-model-rig. */
export function createGraceFade(car: THREE.Object3D): (opacity: number) => void {
  const parts = new Map<THREE.Material, number>();
  car.traverse(object => {
    for (const m of [(object as THREE.Mesh).material ?? []].flat()) {
      // Compile blending at scene warmup so an item cannot cause a black frame mid-race.
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
      if (!(m instanceof THREE.ShaderMaterial) && object.name !== 'Rear LED core') parts.set(m, m.opacity);
    }
  });
  let last = 1;
  return opacity => {
    if (opacity === last) return;
    last = opacity;
    for (const [m, base] of parts) m.opacity = base * opacity;
  };
}

/** One depth-tested rim on the shown body, with a single sweep on activation and expiry. */
export function createGhostPhase(car: THREE.Object3D) {
  const fade = createGraceFade(car);
  const body = car.userData.body as THREE.Mesh;
  const uniforms = { bodyFrame: { value: new THREE.Vector4(0, 0, 0, 1) },
    sweep: { value: 10 }, rim: { value: 0.45 } };
  const shell = new THREE.Mesh(body.geometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform vec4 bodyFrame; varying vec3 vNormal,vEye; varying float vZ;
      void main() {
        vZ = position.z * bodyFrame.w + bodyFrame.z;
        vec4 p = modelViewMatrix * vec4(position + normal * (.025 / bodyFrame.w), 1.);
        vNormal = normalMatrix * normal; vEye = -p.xyz;
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `uniform float sweep,rim; varying vec3 vNormal,vEye; varying float vZ;
      void main() {
        float edge = pow(1. - abs(dot(normalize(vNormal), normalize(vEye))), 3.);
        float band = exp(-abs(vZ - sweep) * 5.);
        gl_FragColor = vec4(.35,.66,1., min(.75, edge * rim + band * .58));
      }`,
  }));
  shell.name = 'Ghost Phase outline';
  shell.visible = false;
  shell.renderOrder = 1;
  shell.userData.followsBody = true;
  body.add(shell);
  return {
    update(state: PhaseCar, inRace: boolean, calm: boolean) {
      const left = inRace ? state.effects.ghost : 0;
      shell.visible = left > 0;
      const opacity = inRace ? graceOpacity(state, calm) : 1;
      fade(opacity);
      if (left <= 0) return;
      const age = EFFECT_TIMES.ghost - left;
      uniforms.sweep.value = calm ? 10 : age < 0.35 ? 3 - age / 0.35 * 6 : left < 0.28 ? -3 + (1 - left / 0.28) * 6 : 10;
      uniforms.rim.value = calm ? 0.45 : 0.22 + (1 - opacity) * 0.55;
    },
  };
}
