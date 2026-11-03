import * as THREE from 'three';

// Camera-local sky layer: aurora curtains, star dome and falling snow. Time-driven uniforms only,
// so updates never upload buffers or allocate. All shaders clamp their output (bloom NaN guard).
const AURORA_VERTEX = `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uv.x * 7.0 + uTime * 0.21 + uPhase) * 90.0 + sin(uv.x * 17.0 - uTime * 0.13) * 30.0;
    p.y += sin(uv.x * 11.0 + uTime * 0.17 + uPhase) * 26.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const AURORA_FRAGMENT = `
  uniform float uTime;
  uniform float uPhase;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float rays = 0.55 + 0.45 * sin(vUv.x * 140.0 + sin(vUv.x * 13.0 + uTime * 0.31 + uPhase) * 5.0);
    float base = smoothstep(0.0, 0.12, vUv.y) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    vec3 color = mix(uLow, uHigh, smoothstep(0.25, 0.95, vUv.y));
    float alpha = clamp(base * edge * rays * uStrength, 0.0, 1.0);
    gl_FragColor = vec4(clamp(color * alpha, 0.0, 4.0), alpha);
  }
`;
const DOME_VERTEX = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const DOME_FRAGMENT = `
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 horizon = vec3(0.20, 0.36, 0.52), zenith = vec3(0.012, 0.03, 0.09);
    vec3 color = mix(horizon, zenith, smoothstep(-0.02, 0.55, h));
    float star = step(0.9975, hash(floor(vDir * 420.0))) * smoothstep(0.12, 0.5, h);
    gl_FragColor = vec4(color + star * 0.85, 1.0);
  }
`;
const SNOW_VERTEX = `
  uniform float uTime;
  attribute float aSpeed;
  varying float vFade;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * (1.4 + aSpeed * 2.2), 46.0) - 4.0;
    p.x += sin(uTime * 0.6 + aSpeed * 31.0) * 1.6;
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    vFade = clamp(1.0 - (-view.z - 8.0) / 110.0, 0.0, 1.0);
    gl_PointSize = clamp((1.3 + aSpeed) * 210.0 / max(1.0, -view.z), 1.0, 9.0);
    gl_Position = projectionMatrix * view;
  }
`;
const SNOW_FRAGMENT = `
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    gl_FragColor = vec4(0.88, 0.95, 1.0, (1.0 - d * 2.0) * 0.85 * vFade);
  }
`;

const CURTAINS = [
  // [x, y, z, yaw, width, low colour, high colour, strength]
  [-260, 260, -1350, .25, 1500, '#16ffc0', '#7a3dff', 1.0],
  [380, 330, -1550, -.35, 1300, '#22f0ff', '#c33dff', .85],
  [-60, 420, -1900, .05, 1900, '#0fffb4', '#a347ff', .7],
  [-820, 300, -1150, .7, 900, '#39ffd9', '#ff4fd8', .55],
] as const;

export function createFrostbiteSky(seed: () => number) {
  const group = new THREE.Group();
  group.name = 'frostbite-sky';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.name = 'sky-dome';
  dome.renderOrder = -2;
  group.add(dome);

  const aurora = new THREE.Group();
  aurora.name = 'aurora';
  const curtainGeometry = new THREE.PlaneGeometry(1, 380, 96, 1);
  for (const [i, [x, y, z, yaw, width, low, high, strength]] of CURTAINS.entries()) {
    const material = new THREE.ShaderMaterial({
      vertexShader: AURORA_VERTEX, fragmentShader: AURORA_FRAGMENT, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 }, uPhase: { value: i * 1.7 }, uLow: { value: new THREE.Color(low) },
        uHigh: { value: new THREE.Color(high) }, uStrength: { value: strength } },
    });
    const curtain = new THREE.Mesh(curtainGeometry, material);
    curtain.scale.x = width;
    curtain.position.set(x, y, z);
    curtain.rotation.y = yaw;
    curtain.renderOrder = -1;
    curtain.frustumCulled = false; // vertex shader sways beyond the static bounds
    aurora.add(curtain);
  }
  group.add(aurora);

  const count = 900, positions = new Float32Array(count * 3), speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([(seed() - .5) * 120, seed() * 46, 18 - seed() * 120], i * 3);
    speeds[i] = seed();
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  snowGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  const snow = new THREE.Points(snowGeometry, new THREE.ShaderMaterial({
    vertexShader: SNOW_VERTEX, fragmentShader: SNOW_FRAGMENT, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
  }));
  snow.name = 'snowfall';
  snow.frustumCulled = false;
  group.add(snow);

  const curtains = aurora.children as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[];
  function update(time: number, quality: 'low' | 'medium' | 'high', reducedMotion: boolean): void {
    const t = reducedMotion ? 0 : time;
    for (const curtain of curtains) curtain.material.uniforms.uTime.value = t;
    snow.material.uniforms.uTime.value = t;
    snow.visible = !reducedMotion;
    snowGeometry.setDrawRange(0, quality === 'high' ? count : quality === 'medium' ? 480 : 160);
  }
  return { group, update };
}
