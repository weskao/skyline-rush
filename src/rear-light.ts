import * as THREE from 'three';
import { MAX_SPEED } from './game.js';

interface RearLightRace {
  phase: string;
  player: {
    braking: boolean;
    boosting: boolean;
    nitroTime: number;
    miniBoost: number;
    speed: number;
  };
}

export function createRearLight() {
  const group = new THREE.Group();
  group.name = 'Continuous rear LED';
  group.position.set(0, 0.95, 2.38);
  // Keep the bar level while its depth follows the rear fascia's shallow curve.
  function strip(height: number) {
    const geometry = new THREE.PlaneGeometry(2.08, height, 32, 1);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) vertices.setZ(i, -0.024 * (vertices.getX(i) / 1.04) ** 2);
    geometry.computeVertexNormals();
    return geometry;
  }
  const panel = new THREE.Mesh(strip(0.14), new THREE.MeshStandardMaterial({ color: '#030405', metalness: 0.65, roughness: 0.12 }));
  panel.name = 'Rear LED black panel';
  panel.position.z = -0.03;
  group.add(panel);
  const lights = new THREE.Group();
  group.add(lights);
  const core = new THREE.Mesh(strip(0.026), new THREE.MeshStandardMaterial({
    color: '#c63b31', emissive: '#ff3030', emissiveIntensity: 1, metalness: 0.15, roughness: 0.22,
  }));
  core.name = 'Rear LED core';
  const glow = new THREE.Mesh(strip(0.22), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { power: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float power;
      void main(){float halo=exp(-abs(vUv.y-.5)*12.)*(1.-smoothstep(.43,.5,abs(vUv.y-.5)));
        float ends=smoothstep(0.,.025,vUv.x)*(1.-smoothstep(.975,1.,vUv.x));
        gl_FragColor=vec4(1.,.012,.012,halo*ends*power*.22);}`,
    toneMapped: false,
  }));
  glow.name = 'Rear LED glow';
  glow.position.z = 0.003;
  const flow = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.024), new THREE.MeshStandardMaterial({
    color: '#ff5555', emissive: '#ff5555', emissiveIntensity: 1.2, transparent: true, opacity: 0.35, depthWrite: false,
  }));
  flow.name = 'Rear LED flow';
  flow.visible = false;
  lights.add(core, glow, flow);
  let age = 0, time = 0, previousPhase: string | undefined;
  return {
    group,
    reset() { age = time = 0; previousPhase = undefined; },
    update(race: RearLightRace, dt: number, calm: boolean) {
      if (race.phase === 'countdown' && previousPhase === 'ready') age = 0;
      previousPhase = race.phase;
      if (race.phase !== 'paused' && race.phase !== 'finished') { age += dt; time += dt; }
      const car = race.player;
      const boost = car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
      lights.scale.x = calm ? 1 : THREE.MathUtils.smoothstep(age, 0, 0.75) * 0.999 + 0.001;
      const power = car.braking ? 3.8 : boost ? 2.1 + (calm ? 0 : Math.sin(time * 22) * 0.35) : 1;
      core.material.emissiveIntensity = power;
      glow.material.uniforms.power.value = power;
      flow.visible = !calm && !boost && !car.braking && car.speed >= MAX_SPEED && age >= 0.75;
      if (flow.visible) {
        const x = ((time * 0.45) % 1 * 2 - 1) * 0.9;
        flow.position.set(x, 0, 0.004 - 0.024 * (x / 1.04) ** 2);
      }
    },
  };
}
