import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RACE_LENGTH } from './game.js';
import { canopy, carShell } from './geometry.js';
import { createEffects, LIFT_PORTS } from './effects.js';
import { createAeroVFX, REAR_PORTS } from './aero-vfx.js';
import { vfxSettings } from './vfx-settings.js';

const roadCenter = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const roadHeading = distance => Math.atan((roadCenter(distance + 1) - roadCenter(distance - 1)) / 2);
const box = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4();
const rotation = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();

function material(color, metalness = 0, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function block(parent, mat, x, y, z, width, height, depth) {
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
const CAR_STYLES = {
  // Player: low wedge, smoked fastback canopy, full-width tail bar, quad thruster ports, pop-up wing.
  roadster: {
    color: '#e6e9e7', glass: '#3b2c24', light: [2.2, 0.02, 0.05], detailed: true,
    body: carShell([[-2.45, 0.86, 0.4, 0.6], [-1.95, 1.06, 0.36, 0.74], [-1.2, 1.13, 0.38, 0.86], [0.5, 1.1, 0.38, 0.96], [1.55, 1.16, 0.42, 1.04], [2.32, 1.05, 0.5, 1.02]]),
    cabin: canopy(0.92, -0.95, 0.86, 1.75, 1.02, 0.66, -0.15, 0.7, 1.4),
    trim(group, m) {
      const bronze = material('#7a5f4c', 0.8, 0.28);
      const nozzleMetal = material('#71818a', 0.7, 0.35);
      block(group, m.white, 0, 0.53, -2.46, 1.56, 0.035, 0.04);
      block(group, m.light, 0, 0.95, 2.34, 2.08, 0.08, 0.05);
      block(group, m.black, 0, 0.7, 2.33, 1.86, 0.36, 0.04);
      block(group, material('#c9ccd0', 0.2, 0.5), 0, 0.84, 2.36, 0.4, 0.12, 0.02);
      for (const port of REAR_PORTS) lamp(group, nozzleMetal, port.position[0], 0.64, 2.36, 0.65);
      const wing = new THREE.Group();
      block(wing, bronze, 0, 0, 0, 2.2, 0.05, 0.44);
      for (const side of [-1, 1]) block(wing, m.black, side * 0.62, -0.2, 0.05, 0.05, 0.4, 0.1);
      wing.position.set(0, 1.07, 1.95);
      wing.userData = { restY: 1.07, lift: 0.34 };
      group.add(wing);
      return wing;
    },
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
};

const spokeGeometry = new THREE.BufferGeometry();
const spokeVertices = [0, 0, 0];
const spokeIndices = [];
for (let i = 0; i < 10; i++) {
  const radius = i % 2 ? 0.09 : 0.28;
  spokeVertices.push(Math.cos(i * Math.PI / 5) * radius, Math.sin(i * Math.PI / 5) * radius, 0);
  spokeIndices.push(0, i + 1, (i + 1) % 10 + 1);
}
spokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spokeVertices, 3));
spokeGeometry.setIndex(spokeIndices);
spokeGeometry.computeVertexNormals();

function makeCar(style, color = style.color) {
  const group = new THREE.Group();
  const detailed = !!style.detailed;
  const paint = material(color, 0.55, 0.25);
  const black = material('#101923', 0.4, 0.4);
  const glass = material(style.glass, 0.85, 0.16);
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
  const tireGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.27, 16);
  const rimGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.285, 10);
  for (const x of [-1.05, 1.05]) for (const z of [-1.35, 1.42]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeometry, tires);
    const rim = new THREE.Mesh(rimGeometry, rims);
    tire.rotation.z = rim.rotation.z = Math.PI / 2;
    wheel.add(tire, rim);
    if (detailed) {
      const spokes = new THREE.Mesh(spokeGeometry, black);
      spokes.rotation.y = Math.sign(x) * Math.PI / 2;
      spokes.position.x = Math.sign(x) * 0.15;
      wheel.add(spokes);
    }
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
  group.userData = { wheels, jets, body, wing, brakeLight: light, lightColor: light.color.clone() };
  return group;
}

function instances(geometry, mat, count, scene) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

function put(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
  position.set(x, y, z);
  scale.set(sx, sy, sz);
  rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  matrix.compose(position, rotation, scale);
  mesh.setMatrixAt(index, matrix);
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#946d87');
  scene.fog = new THREE.FogExp2('#94758a', 0.0013);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 1.1);
  composer.addPass(bloom);
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, boost: { value: 0 }, impact: { value: 0 }, pressure: { value: 0 }, nozzle: { value: new THREE.Vector2() }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float boost; uniform float impact; uniform float pressure,time; uniform vec2 nozzle; varying vec2 vUv;
      void main(){ vec2 delta=vUv-.5; vec2 offset=delta*impact*.008;
        vec2 gas=vUv-nozzle;float mask=exp(-dot(gas*vec2(2.,1.),gas*vec2(2.,1.))*550.);
        vec2 uv=vUv+sin(gas.yx*160.+time*25.)*mask*pressure*.0015;
        vec3 col=texture2D(tDiffuse,uv).rgb;
        col.r=texture2D(tDiffuse,uv+offset).r; col.b=texture2D(tDiffuse,uv-offset).b;
        vec3 blur=texture2D(tDiffuse,vUv-delta*.012).rgb+texture2D(tDiffuse,vUv-delta*.025).rgb;
        col=mix(col,blur*.5,boost*dot(delta,delta)*.65);
        col*=1.-smoothstep(.15,.85,length(delta))*.3;
        gl_FragColor=vec4(col,1.); }`,
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  const env = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = env.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.42;
  room.dispose();
  env.dispose();

  scene.add(new THREE.HemisphereLight('#90bcff', '#15273f', 1.7));
  const sunlight = new THREE.DirectionalLight('#ffb88a', 2.3);
  sunlight.position.set(-170, 100, -190);
  scene.add(sunlight);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#101e43') }, horizon: { value: new THREE.Color('#d98785') } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vPosition; uniform vec3 top; uniform vec3 horizon;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 dir=normalize(vPosition);float h=dir.y;
        vec3 col=mix(horizon,top,smoothstep(-.03,.65,h));
        float light=pow(max(0.,dot(dir,normalize(vec3(-.22,.055,-1.)))),12.);
        col+=vec3(.65,.21,.07)*light;
        vec2 p=dir.xz/(max(.08,abs(h)))*2.;
        float cloud=noise(p*1.8)*.6+noise(p*4.5)*.25+noise(p*9.)*.15;
        float band=smoothstep(.05,.13,h)*(1.-smoothstep(.3,.62,h));
        col=mix(col,vec3(.3,.24,.37)+vec3(.32,.12,.02)*light,smoothstep(.45,.75,cloud)*band*.6);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.35, 0.5), fog: false }));
  sun.position.set(-355, 88, -1600);
  scene.add(sun);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
    fragmentShader: `varying vec3 p; uniform float time;
      void main(){float wave=sin(p.x*.065+time*.7+sin(p.z*.018))*sin(p.z*.21-time)*.5+.5;
        vec3 col=mix(vec3(.018,.055,.11),vec3(.055,.14,.21),wave*.5);
        float reflection=pow(max(0.,1.-abs(p.x+170.)*.003),8.)*smoothstep(.68,1.,wave);
        col+=vec3(.65,.22,.08)*reflection;
        float fog=smoothstep(300.,1800.,distance(p,cameraPosition));col=mix(col,vec3(.25,.17,.25),fog);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -6;
  scene.add(sea);
  const seaLines = instances(box, new THREE.MeshBasicMaterial({ color: '#bca99d', transparent: true, opacity: 0.25 }), 110, scene);
  for (let i = 0; i < 110; i++) {
    put(seaLines, i, Math.sin(i * 9.3) * 1100, -5.95, -i * 14, 20 + i % 18, 0.01, 0.1);
  }
  seaLines.instanceMatrix.needsUpdate = true;

  const mountains = instances(new THREE.ConeGeometry(1, 1, 7), material('#374762'), 30, scene);
  for (let i = 0; i < 30; i++) {
    const height = 70 + (Math.sin(i * 3.4) + 1) * 60;
    put(mountains, i, (i - 15) * 130, height / 2 - 20, -1400 - Math.cos(i * 2) * 300, 150 + i % 3 * 70, height, 220, i);
  }
  mountains.instanceMatrix.needsUpdate = true;

  const city = new THREE.Group();
  scene.add(city);
  const buildingMat = material('#17344d', 0.5, 0.38);
  const buildings = instances(box, buildingMat, 160, city);
  const windows = instances(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.95, 0.45) }), 160 * 18, city);
  const buildingData = [];
  for (let i = 0; i < 160; i++) {
    const side = i % 2 ? -1 : 1;
    buildingData.push({ x: side * (110 + (i * 37 % 550)), d: i * 39 % 2200, w: 12 + i * 7 % 24, h: 18 + (i * 31 % 145) });
  }

  const segments = 120;
  const roadGeometry = new THREE.BufferGeometry();
  const roadVertices = new Float32Array((segments + 1) * 6);
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  roadGeometry.setAttribute('position', new THREE.BufferAttribute(roadVertices, 3).setUsage(THREE.DynamicDrawUsage));
  roadGeometry.setIndex(indices);
  const normals = new Float32Array((segments + 1) * 6);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  roadGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const roadMaterial = material('#142534', 0.3, 0.5);
  roadMaterial.envMapIntensity = 0.25;
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.frustumCulled = false;
  scene.add(road);
  const laneLines = instances(box, new THREE.MeshBasicMaterial({ color: '#d9dcda' }), segments * 3, scene);
  const curbs = instances(box, material('#2b4359'), segments * 2, scene);
  const edgeLines = instances(box, new THREE.MeshBasicMaterial({ color: '#ffc174' }), segments * 2, scene);
  const pillars = instances(box, material('#657481'), 40, scene);
  const poles = instances(box, material('#465967', 0.65), 48, scene);
  const lamps = instances(box, new THREE.MeshBasicMaterial({ color: '#ffe5c1' }), 24, scene);
  const railLights = instances(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 1.2, 1.7) }), segments * 2, scene);
  const gateMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 1.1, 1.6), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const gateGeometry = new THREE.TorusGeometry(4.8, 0.045, 6, 64);
  const gates = Array.from({ length: 7 }, () => { const gate = new THREE.Mesh(gateGeometry, gateMaterial); scene.add(gate); return gate; });
  const towers = Array.from({ length: 3 }, () => {
    const tower = new THREE.Group();
    const steel = material('#233e55', 0.65, 0.4);
    const trim = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1, 1.4) });
    for (const side of [-1, 1]) {
      block(tower, steel, side * 16.5, 23, 0, 1.2, 46, 2.5);
      block(tower, trim, side * 15.85, 29, 1.3, 0.08, 32, 0.08);
      const cablePoints = Array.from({ length: 25 }, (_, i) => {
        const z = (i - 12) * 12;
        return new THREE.Vector3(side * 16.5, 9 + 34 * Math.cos(z / 288 * Math.PI) ** 2, z);
      });
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 48, 0.1, 4, false), steel);
      tower.add(cable);
      cablePoints.forEach(point => { block(tower, steel, point.x, point.y / 2, point.z, 0.045, point.y, 0.045); });
    }
    block(tower, steel, 0, 43, 0, 34, 1.7, 2.5);
    block(tower, trim, 0, 42.1, 1.3, 32, 0.08, 0.08);
    scene.add(tower);
    return tower;
  });
  const finish = new THREE.Group();
  const finishMat = material('#d1d6d3');
  block(finish, finishMat, -13, 7, 0, 0.6, 14, 0.6);
  block(finish, finishMat, 13, 7, 0, 0.6, 14, 0.6);
  block(finish, finishMat, 0, 13, 0, 26, 1.2, 0.7);
  const checkBlack = material('#17232f');
  for (let i = 0; i < 20; i++) block(finish, i % 2 ? finishMat : checkBlack, i * 1.25 - 11.9, 0.035, 0, 1.25, 0.025, 3);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024; signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#182c39'; ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#f6f0e5'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SKYLINE  /  FINISH', 512, 88);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const finishSign = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.25), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }));
  finishSign.position.set(0, 12.9, 0.4);
  finish.add(finishSign);
  scene.add(finish);

  const player = makeCar(CAR_STYLES.roadster);
  scene.add(player);
  const rivals = [CAR_STYLES.nova, CAR_STYLES.orbit, CAR_STYLES.apex].map(style => { const car = makeCar(style); scene.add(car); return car; });
  const flightVehicles = [player, ...rivals];
  const trafficColors = ['#6e879c', '#ded6c9', '#a15b60', '#8c99a4', '#48545e'];
  const traffic = Array.from({ length: 36 }, (_, i) => {
    const car = makeCar(CAR_STYLES.commuter, trafficColors[i % 5]);
    car.scale.setScalar(0.96);
    scene.add(car);
    return car;
  });
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(32, 32, 5, 32, 32, 32);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,0.8)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.6, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  const effects = createEffects(scene, roadCenter);
  const aero = createAeroVFX(scene, player);
  let visual = vfxSettings();
  const projectedNozzle = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const smoothLook = new THREE.Vector3(0, 2, -25);
  let cameraMode = 0;
  let initialized = false;
  let lastRace = null;
  let carBank = 0;

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();

  function updateCar(mesh, car, distance, center, time, dt, isPlayer = false, input = {}) {
    const relative = car.distance - distance;
    mesh.visible = isPlayer || (relative > -55 && relative < 900);
    if (!mesh.visible) return;
    mesh.position.set(roadCenter(car.distance) - center + car.x, car.altitude || 0, -relative);
    mesh.rotation.y = -roadHeading(car.distance);
    const bank = isPlayer ? -(car.steering || 0) * (car.altitude > 0.8 ? 0.12 : 0.045) : 0;
    mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, bank, 8, dt);
    mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, car.thrusting ? -0.06 : Math.min(0.08, -(car.verticalSpeed || 0) * 0.006), 7, dt);
    mesh.userData.jets.visible = !!car.thrusting;
    mesh.userData.brakeLight.color.copy(mesh.userData.lightColor).multiplyScalar(car.braking ? 2.3 : 1);
    const { wing } = mesh.userData;
    const downforce = isPlayer && visual.enabled && visual.airflow && visual.aeroMode === 'downforce';
    wing.rotation.x = THREE.MathUtils.damp(wing.rotation.x, car.braking || downforce ? -0.35 : car.boosting ? 0.08 : 0, 8, dt);
    if (wing.userData.lift) wing.position.y = THREE.MathUtils.damp(wing.position.y, wing.userData.restY + (car.boosting || car.braking || car.altitude > 0.8 ? wing.userData.lift : 0), 8, dt);
    mesh.userData.wheels.forEach(wheel => {
      const target = (car.altitude > 0.8 ? Math.PI / 2.6 : 0) * Math.sign(wheel.position.x);
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, target, 7, dt);
      wheel.rotation.y = wheel.position.z < 0 ? -(car.steering || 0) * 0.3 : 0;
      if (wheel.children[2]) wheel.children[2].rotation.x -= car.speed * dt / 0.44;
    });
  }

  return {
    resize,
    configureVFX(options) { visual = vfxSettings(options); },
    cycleCamera() { cameraMode = (cameraMode + 1) % 2; return cameraMode; },
    render(race, dt, idleTime, input = {}) {
      const preview = race.phase === 'ready';
      const car = race.player;
      const reducedMotion = motionPreference.matches || visual.comfortable;
      const motionDt = preview || race.phase === 'racing' || race.phase === 'countdown' ? dt : 0;
      if (lastRace !== race) { effects.reset(); aero.reset(); lastRace = race; initialized = false; carBank = 0; }
      const distance = preview ? 340 : car.distance;
      const center = roadCenter(distance);
      const time = race.elapsed + idleTime;
      sea.material.uniforms.time.value = reducedMotion ? 0 : time;
      for (let i = 0; i <= segments; i++) {
        const d = Math.floor(distance / 12) * 12 + (i - 5) * 12;
        const x = roadCenter(d) - center;
        const z = -(d - distance);
        roadVertices.set([x - 12, 0, z, x + 12, 0, z], i * 6);
        if (i === segments) continue;
        const angle = -roadHeading(d);
        for (let j = 0; j < 3; j++) put(laneLines, i * 3 + j, x + (j - 1) * 5, 0.018, z - 2, 0.11, 0.02, 4.7, angle);
        for (let side = 0; side < 2; side++) {
          const sx = side ? 1 : -1;
          put(curbs, i * 2 + side, x + sx * 12.4, 0.38, z - 6, 0.55, 0.76, 12.15, angle);
          put(edgeLines, i * 2 + side, x + sx * 11.5, 0.023, z - 6, 0.12, 0.02, 12.15, angle);
          put(railLights, i * 2 + side, x + sx * 12.1, 0.68, z - 6, 0.045, 0.04, 12.15, angle);
        }
      }
      roadGeometry.attributes.position.needsUpdate = true;
      [laneLines, curbs, edgeLines, railLights].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
      gates.forEach((gate, i) => {
        const d = Math.floor(distance / 220) * 220 + (i + 1) * 220;
        gate.position.set(roadCenter(d) - center + 2.5, 8, -(d - distance));
        gate.rotation.y = -roadHeading(d);
      });
      towers.forEach((tower, i) => {
        const d = Math.floor(distance / 1100) * 1100 + (i + 1) * 1100 - 500;
        tower.position.set(roadCenter(d) - center, 0, -(d - distance));
        tower.rotation.y = -roadHeading(d);
      });
      for (let i = 0; i < 40; i++) {
        const d = Math.floor(distance / 36) * 36 + (i - 2) * 36;
        put(pillars, i, roadCenter(d) - center, -3.4, -(d - distance), 16, 6.5, 2);
      }
      pillars.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 24; i++) {
        const d = Math.floor(distance / 60) * 60 + (i - 1) * 60;
        const side = i % 2 ? 1 : -1;
        const x = roadCenter(d) - center + side * 12.7;
        const z = -(d - distance);
        put(poles, i * 2, x, 6.5, z, 0.14, 13, 0.14);
        put(poles, i * 2 + 1, x - side * 1.8, 12.9, z, 3.7, 0.14, 0.18);
        put(lamps, i, x - side * 3.3, 12.8, z, 0.85, 0.06, 0.4);
      }
      poles.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true;
      city.position.set(-center * 0.6, 0, distance % 2200);
      buildingData.forEach((b, i) => {
        // Only re-upload a building's 19 transforms when it wraps behind the camera.
        const wrap = b.d < distance % 2200 ? -2200 : 0;
        if (b.wrap === wrap) return;
        b.wrap = wrap;
        const z = -b.d + wrap + 100;
        const x = b.x;
        put(buildings, i, x, b.h / 2 - 6, z, b.w, b.h, 16);
        for (let j = 0; j < 18; j++) {
          put(windows, i * 18 + j, x + (j % 3 - 1) * b.w * 0.28, 3 + Math.floor(j / 3) * (b.h - 10) / 6, z + 8.05, b.w * 0.1, 1.1, 0.05);
        }
        buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = true;
      });

      if (preview) {
        const groundedShowcase = visual.enabled && visual.airflow;
        updateCar(player, { ...car, distance, altitude: groundedShowcase ? 0 : 1.6 + (reducedMotion ? 0 : Math.sin(idleTime * 1.1) * 0.12), thrusting: !groundedShowcase }, distance, center, time, dt, true);
        rivals.forEach((mesh, i) => updateCar(mesh, { ...race.rivals[i], distance: distance + 35 + i * 28, altitude: i === 0 ? 5 : 0, thrusting: i === 0 }, distance, center, time, dt));
        traffic.forEach((mesh, i) => updateCar(mesh, { ...race.traffic[i], distance: distance + 65 + i * 32 }, distance, center, time, dt));
      } else {
        updateCar(player, car, distance, center, time, motionDt, true, input);
        rivals.forEach((mesh, i) => updateCar(mesh, race.rivals[i], distance, center, time, motionDt));
        traffic.forEach((mesh, i) => updateCar(mesh, race.traffic[i], distance, center, time, motionDt));
      }
      shadow.position.x = player.position.x;
      shadow.scale.setScalar(1 + player.position.y * 0.04);
      shadow.material.opacity = 0.6 / (1 + player.position.y * 0.2);
      finish.position.set(roadCenter(RACE_LENGTH) - center, 0, -(RACE_LENGTH - distance));
      finish.visible = RACE_LENGTH - distance < 1400;
      effects.update(race, motionDt, center, preview, reducedMotion, flightVehicles);
      const feedback = aero.update(race, race.phase === 'paused' ? 0 : dt, center, distance, visual, reducedMotion);
      const portrait = camera.aspect < 0.8;
      if (visual.enabled && visual.airflow && visual.view !== 'drive') {
        const angle = visual.view === 'orbit' ? time * 0.18 : { front: Math.PI, rear: 0, left: -Math.PI / 2, right: Math.PI / 2 }[visual.view];
        desiredCamera.set(player.position.x + Math.sin(angle) * 9, player.position.y + 3.6, Math.cos(angle) * 9);
        lookTarget.copy(player.position); lookTarget.y += 0.8;
      } else if (preview) {
        desiredCamera.set(portrait ? 7.8 : 8.3, portrait ? 5.9 : 5.1, portrait ? 13.8 : 11.8);
        lookTarget.set(portrait ? 1 : -1.4, 1.4, -3.5);
      } else if (cameraMode === 1) {
        desiredCamera.set(car.x, car.altitude + 1.7, -0.95);
        lookTarget.set(car.x + roadCenter(distance + 65) - center, car.altitude + 1.5, -65);
      } else {
        desiredCamera.set(car.x * 0.74, car.altitude * 0.85 + (car.altitude > 2 ? 4.4 : 4.8), portrait ? 13.5 : 11.6);
        lookTarget.set(car.x * 0.7 + (roadCenter(distance + 30) - center) * 0.35, car.altitude * 0.85 + 1.5, -25);
      }
      const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
      const impact = !preview && impactAge < 0.65 ? (1 - impactAge / 0.65) ** 2 * car.impact.intensity : 0;
      const landingAge = car.landing ? race.elapsed - car.landing.time : 10;
      const landing = landingAge < 0.55 ? Math.exp(-landingAge * 8) * Math.min(1, car.landing.speed / 14) : 0;
      if (!reducedMotion && race.phase === 'racing') {
        desiredCamera.x += Math.sin(time * 61) * impact * 0.27;
        desiredCamera.y += Math.sin(time * 47) * impact * 0.15 - landing * 0.3;
        desiredCamera.z += impact * 0.65;
        desiredCamera.x += Math.sin(time * 65) * feedback.ignition * visual.shake * 0.12;
        desiredCamera.z += feedback.strength * 0.22;
      }
      const smoothing = 1 - Math.exp(-dt * 7);
      if (!initialized) { camera.position.copy(desiredCamera); smoothLook.copy(lookTarget); initialized = true; }
      camera.position.lerp(desiredCamera, smoothing);
      smoothLook.lerp(lookTarget, smoothing);
      camera.lookAt(smoothLook);
      carBank = THREE.MathUtils.damp(carBank, !reducedMotion && car.altitude > 1 ? -(input.steer || 0) * 0.025 : 0, 5, dt);
      camera.rotation.z += carBank;
      const targetFov = preview ? 50 : reducedMotion ? 64 : 57 + car.speed * 0.115 + feedback.strength * (visual.enabled ? visual.fov : 0) - impact * 4;
      camera.fov += (targetFov - camera.fov) * smoothing;
      camera.updateProjectionMatrix();
      lens.uniforms.boost.value = reducedMotion || !visual.enabled ? 0 : feedback.strength * visual.motionBlur;
      lens.uniforms.impact.value = reducedMotion ? 0 : impact;
      projectedNozzle.copy(feedback.nozzle).project(camera);
      lens.uniforms.nozzle.value.set(projectedNozzle.x * 0.5 + 0.5, projectedNozzle.y * 0.5 + 0.5);
      lens.uniforms.pressure.value = reducedMotion || visual.quality === 'low' || projectedNozzle.z > 1 ? 0 : feedback.strength * 0.6;
      lens.uniforms.time.value = time;
      bloom.strength = 0.42 + (reducedMotion ? 0 : feedback.strength * visual.bloom * 0.25 + feedback.ignition * visual.bloom * 0.2);
      bloom.enabled = visual.quality !== 'low';
      composer.render(dt);
    },
    dispose() {
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) for (const mat of [].concat(object.material)) mat.dispose();
      });
      environment.dispose();
      signTexture.dispose();
      shadowTexture.dispose();
      composer.passes.forEach(pass => pass.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}
