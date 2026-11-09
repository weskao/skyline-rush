// Task 5 thruster glow (§8.1 panel 3: bright thruster discs): one additive disc inside each rear nozzle bore. One
// shared program, driven only by uniforms, so the world warmup compiles it before GO and nothing recompiles after.
import * as THREE from 'three';

interface Port { position: readonly number[] }
const BORE_RADIUS = .056, BORE_Z = 2.45; // inside the Roadster bore (roadster-rear-nozzles.js: back at 2.42, lip to 2.53)

export function createThrusterGlow(parent: THREE.Object3D, ports: readonly Port[]) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { glow: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    // White-hot centre to a blue rim; above the bloom threshold at full glow, so bloom draws the halo. No pow/exp.
    fragmentShader: `varying vec2 vUv;uniform float glow;uniform vec3 tint;
      void main(){float r=clamp(length(vUv-.5)*2.,0.,1.);
        gl_FragColor=vec4(mix(vec3(1.),vec3(.45,.75,1.),r*r)*tint*(2.6-1.8*r*r)*glow,1.);}`,
  });
  const geometry = new THREE.CircleGeometry(BORE_RADIUS, 20);
  const discs = ports.map((port, i) => {
    const disc = new THREE.Mesh(geometry, material);
    disc.name = `Thruster glow ${i + 1}`;
    disc.position.set(port.position[0]!, port.position[1]!, BORE_Z);
    disc.visible = false;
    parent.add(disc);
    return disc;
  });
  return {
    tint: material.uniforms.tint.value as THREE.Vector3,
    /** Per frame: `level` from board-effects thrusterGlow; 0 hides the discs (Low, before GO). */
    update(level: number): void {
      material.uniforms.glow.value = level;
      for (const disc of discs) disc.visible = level > .005;
    },
  };
}
