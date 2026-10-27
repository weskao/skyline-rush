import * as THREE from 'three';
import { flipRgbaRows, photoFov } from './photo-export.ts';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { roadRibbon } from './geometry.ts';
import { createEffects } from './effects.js';
import { createAeroVFX } from './aero-vfx.js';
import { vfxSettings } from './vfx-settings.ts';
import { renderPixelRatioForQuality } from './render-resolution.ts';
import { warmupShaders } from './shader-warmup.ts';
import { t, getLocale, onLocaleChange } from './i18n.ts';
import { material, block, CAR_STYLES, makeCar } from './car-model.js';
import { createCoastScenery } from './coast-visuals.ts';
import { createClassicTrackScenery } from './classic-track-scenery.ts';
import { TRACK_PALETTES, applyTrackSurfaceStyle } from './track-palettes.ts';
import { createSkyScene } from './sky-scene.js';
import { skyPosition, skyFrame } from './sky-track.ts';
import { orientCarOnRoad } from './vehicle-pose.ts';
import { classicRoadCenter, trackPoint, trackFrame, trackLocalPosition } from './track-paths.ts';
import { HERO_PREVIEWS,previewDistance,previewPlayer,previewRival,showcaseCameraPose } from './track-preview.ts';
import { SECTION_SIGN_LABELS, sectionSignKey } from './section-signs.ts';
import { createWorldTourScene } from './world-tour-scene.js';
import { RACE_TRACKS, TRICK_ROLL_TIME, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import { hazardX } from './hazards.ts';
/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */
/** @typedef {import('./game-types.js').TrackConfig} TrackConfig */

const roadCenter = classicRoadCenter;
const roadHeading = distance => Math.atan((roadCenter(distance + 1) - roadCenter(distance - 1)) / 2);
const box = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4();
const rotation = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();

const TOUR_IDS = new Set(['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']);

function put(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
  position.set(x, y, z);
  scale.set(sx, sy, sz);
  rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  matrix.compose(position, rotation, scale);
  mesh.setMatrixAt(index, matrix);
}

// Canvas sign text: Latin keeps the generic sans-serif; zh-TW appends CJK families. The font shrinks until the text fits.
const signFont = (px, locale) => `bold ${px}px ${locale === 'zh-TW' ? '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif' : 'sans-serif'}`;
function fitText(context, label, x, y, maxWidth, basePx, locale) {
  let px = basePx;
  context.font = signFont(px, locale);
  while (px > 12 && context.measureText(label).width > maxWidth) context.font = signFont(--px, locale);
  context.fillText(label, x, y);
}

export function createWorld(canvas) {
  // No canvas MSAA: the composer's final pass only blits a full-screen quad here; edges are resolved in sceneTarget.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.info.autoReset=false; // Combine scene and composer submissions per frame for QA.
  let renderPixelRatio=Math.min(devicePixelRatio,1.5);
  let adaptiveScale = 1;
  renderer.setPixelRatio(renderPixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#946d87');
  scene.fog = new THREE.FogExp2('#94758a', 0.0013);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  // The scene is rendered into this target, not the canvas, so it must carry the MSAA samples or every
  // edge stays jagged and crawls as the camera moves (the flicker seen on the start screen and in races).
  const msaaSamples = quality => quality === 'low' ? 2 : 4;
  const sceneTarget = samples => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, sceneTarget(4)); // configureVFX re-targets for the saved quality tier
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 1.1);
  // The bloom blur spreads one NaN/Inf scene texel into a screen-sized black rectangle (seen when a nozzle shader hit
  // 0*Inf at an MSAA sliver). Dropping non-finite texels at the high pass caps such a bug at a one-pixel speck.
  const highPass = bloom.materialHighPassFilter, texel = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!highPass.fragmentShader.includes(texel)) throw new Error('UnrealBloomPass high pass changed: move the NaN guard');
  highPass.fragmentShader = highPass.fragmentShader.replace(texel, `${texel} if ( any( isnan( texel ) ) || any( isinf( texel ) ) ) texel = vec4( 0.0 );`);
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

  const ambient = new THREE.HemisphereLight('#90bcff', '#15273f', 1.7);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight('#ffb88a', 2.3);
  const tunnelLights = [-1,1].map(()=>new THREE.PointLight('#b5a27b',0,35,2));
  tunnelLights.forEach(light=>{light.visible=false;scene.add(light);});
  const roadsideLamps=[-1,1].map(()=>new THREE.PointLight('#d0bd9b',0,46,2));
  roadsideLamps.forEach(light=>{light.visible=false;scene.add(light);});
  sunlight.position.set(-170, 100, -190);
  scene.add(sunlight);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#101e43') }, horizon: { value: new THREE.Color('#d98785') }, warmth: { value: 1 }, aurora: { value: 0 }, cloudOpacity: { value: 1 }, cloudTint: { value: new THREE.Color('#4d3d60') }, time: { value: 0 } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vPosition; uniform vec3 top; uniform vec3 horizon,cloudTint; uniform float warmth,aurora,time,cloudOpacity;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 dir=normalize(vPosition);float h=dir.y;
        vec3 col=mix(horizon,top,smoothstep(-.03,.65,h));
        float light=pow(max(0.,dot(dir,normalize(vec3(-.22,.055,-1.)))),12.);
        col+=vec3(.65,.21,.07)*light*warmth;
        vec2 p=dir.xz/(max(.08,abs(h)))*2.;
        float cloud=noise(p*1.8)*.6+noise(p*4.5)*.25+noise(p*9.)*.15;
        float band=smoothstep(.05,.13,h)*(1.-smoothstep(.3,.62,h));
        col=mix(col,cloudTint+vec3(.32,.12,.02)*light,smoothstep(.45,.75,cloud)*band*.6*cloudOpacity);
        float ribbon=pow(max(0.,sin(dir.x*9.+sin(dir.z*6.+time*.08)*2.+h*16.)),12.);
        col+=vec3(.04,.8,.35)*ribbon*band*aurora;
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
    uniforms: { time: { value: 0 }, ground: { value: new THREE.Color('#0a233b') }, fogColor: { value: new THREE.Color('#94758a') }, water: { value: 1 } },
    vertexShader: 'varying vec3 p; void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
    fragmentShader: `varying vec3 p; uniform float time,water; uniform vec3 ground,fogColor;
      void main(){float wave=sin(p.x*.065+time*.7+sin(p.z*.018))*sin(p.z*.21-time)*.5+.5;
        vec3 col=mix(vec3(.018,.055,.11),vec3(.055,.14,.21),wave*.5);
        float reflection=pow(max(0.,1.-abs(p.x+170.)*.003),8.)*smoothstep(.68,1.,wave);
        col+=vec3(.65,.22,.08)*reflection;
        col=mix(ground,col,water);
        float fog=smoothstep(300.,1800.,distance(p,cameraPosition));col=mix(col,fogColor,fog);
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
  const roadGeometry = roadRibbon(segments);
  const roadVertices = roadGeometry.attributes.position.array;
  const baseIndices = roadGeometry.index.array.slice();
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
  const tunnelRoofs = instances(box, new THREE.MeshStandardMaterial({ color: '#38526d', transparent: true, opacity: .4, depthWrite: false }), segments, scene);
  const tunnelWalls = instances(box, material('#23344b'), segments * 2, scene);
  // Shortcut floor sits at the corridor's lower edge, so the car visibly flies the band above it.
  const shortcutDeck = instances(box, new THREE.MeshBasicMaterial({ transparent: true, opacity: .28, depthWrite: false }), segments, scene);
  const shortcutPylonMeshes = instances(box, material('#d9dcda', .4, .5), 8, scene);
  const gauntletBarriers = instances(box, new THREE.MeshBasicMaterial({ color: '#ff946f' }), 24, scene);
  gauntletBarriers.name = 'gauntlet-barriers'; gauntletBarriers.count = 0;
  // Neon uprights + beam for each timed checkpoint; pooled like the gauntlet barriers.
  const checkpointGates = instances(box, new THREE.MeshBasicMaterial({ color: '#54f3dd' }), 48, scene);
  checkpointGates.name = 'checkpoint-gates'; checkpointGates.count = 0;
  shortcutDeck.name = 'shortcut-deck'; shortcutPylonMeshes.name = 'shortcut-pylons';
  const surfaceMarks = instances(box, new THREE.MeshBasicMaterial({ color: '#9ae6ff', transparent: true, opacity: .3, depthWrite: false }), segments, scene);
  const cliffs = instances(new THREE.ConeGeometry(1, 1, 5), material('#a15339'), 40, scene);
  const weatherPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) weatherPositions.set([Math.sin(i * 29) * 45, i * 17 % 32, -(i * 13 % 180)], i * 3);
  const weatherGeometry = new THREE.BufferGeometry();
  weatherGeometry.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
  const weather = new THREE.Points(weatherGeometry, new THREE.PointsMaterial({ color: '#b8d8ef', size: .18, transparent: true, opacity: .65, depthWrite: false }));
  scene.add(weather);
  const signTextures = [];
  const signPaints = [];
  const signs = Object.fromEntries(Object.keys(SECTION_SIGN_LABELS).map(type => {
    const sign = document.createElement('canvas'); sign.width = 512; sign.height = 96;
    const context = sign.getContext('2d');
    const texture = new THREE.CanvasTexture(sign); texture.colorSpace = THREE.SRGBColorSpace; signTextures.push(texture);
    signPaints.push(locale => {
      context.fillStyle = '#142334'; context.fillRect(0, 0, 512, 96);
      context.strokeStyle = '#ffc36f'; context.lineWidth = 8; context.strokeRect(4, 4, 504, 88);
      context.fillStyle = '#fff1d6'; context.textAlign = 'center';
      fitText(context, t(`sign.${type}`, undefined, locale), 256, 58, 472, 27, locale);
      texture.needsUpdate = true;
    });
    return [type, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })];
  }));
  const sectionSigns = Array.from({ length: Math.max(...Object.values(RACE_TRACKS).map(track => track.sections.length)) }, () => {
    const group = new THREE.Group();
    block(group, material('#637282'), 0, 2.5, 0, .2, 5, .2);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), signs.gap); panel.position.y = 5; group.add(panel); scene.add(group);
    return { group, panel };
  });
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
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const paintFinish = locale => {
    ctx.fillStyle = '#182c39'; ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#f6f0e5'; ctx.textAlign = 'center';
    fitText(ctx, t('sign.finish', undefined, locale), 512, 88, 960, 64, locale);
    signTexture.needsUpdate = true;
  };
  const redrawAllSigns = locale => { signPaints.forEach(paint => paint(locale)); paintFinish(locale); };
  redrawAllSigns(getLocale());
  const stopLocaleSigns = onLocaleChange(redrawAllSigns);
  const finishSign = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.25), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }));
  finishSign.position.set(0, 12.9, 0.4);
  finish.add(finishSign);
  scene.add(finish);

  const player = makeCar(CAR_STYLES.roadster);
  scene.add(player);
  const rearLight = player.userData.rearLight;
  const rivals = [CAR_STYLES.nova, CAR_STYLES.orbit, CAR_STYLES.apex].map(style => { const car = makeCar(style); scene.add(car); return car; });
  const flightVehicles = [player, ...rivals];
  const trafficColors = ['#6e879c', '#ded6c9', '#a15b60', '#8c99a4', '#48545e'];
  // ×2 covers the double-traffic daily modifier.
  const traffic = Array.from({ length: Math.max(...Object.values(RACE_TRACKS).map(track => Math.round(36 * track.trafficDensity * 2))) }, (_, i) => {
    const car = makeCar(CAR_STYLES.commuter, trafficColors[i % 5]);
    car.scale.setScalar(0.96);
    scene.add(car);
    return car;
  });
  // Best-run ghost: the player's shape in one translucent material.
  const ghostCar = makeCar(CAR_STYLES.roadster);
  const ghostMaterial = new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.3, depthWrite: false });
  ghostCar.traverse(object => { if (object.material) { [].concat(object.material).forEach(mat => mat.dispose()); object.material = ghostMaterial; } });
  ghostCar.userData.jets.visible = ghostCar.visible = false;
  scene.add(ghostCar);
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
  const skyScene = createSkyScene(scene);
  const worldTourScene = createWorldTourScene(scene);
  const coastScenery = createCoastScenery(scene, roadCenter), classicScenery = createClassicTrackScenery(scene, roadCenter);
  // Only inspect World Tour geometry when a showroom angle changes. Existing
  // landmark-only sightline checks don't detect scenery covering the car itself.
  const showcaseOccluders = scene.getObjectByName('World Tour authored scenery');
  const showcaseRay = new THREE.Raycaster();
  const showcaseProbe = new THREE.PerspectiveCamera(50,1,.1,3000);
  const carSightPoints = [
    new THREE.Vector3(0,1.55,0),
    new THREE.Vector3(-.85,1.05,1.25),
    new THREE.Vector3(.85,1.05,1.25),
    new THREE.Vector3(-.85,1.05,-1.25),
    new THREE.Vector3(.85,1.05,-1.25),
  ];
  const sightTarget = new THREE.Vector3();
  const sightDirection = new THREE.Vector3();
  const projectedSight = new THREE.Vector3();
  let clearanceKey = '', clearanceShift = new THREE.Vector3();
  // Frame the entire vehicle, including wheels and aero parts; the five
  // sightline points alone cannot detect a cropped bumper or wheel.
  const carBox = new THREE.Box3();
  const carCorner = new THREE.Vector3();
  let framingKey = '', framingEye = new THREE.Vector3(), framingLookY = 0;
  function projectedCarBounds(eye, look) {
    showcaseProbe.fov=50;
    showcaseProbe.aspect=camera.aspect;
    showcaseProbe.position.copy(eye);
    showcaseProbe.lookAt(look);
    showcaseProbe.updateProjectionMatrix();
    showcaseProbe.updateMatrixWorld(true);
    player.updateMatrixWorld(true);
    carBox.setFromObject(player,true);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const x of [carBox.min.x,carBox.max.x])
      for(const y of [carBox.min.y,carBox.max.y])
        for(const z of [carBox.min.z,carBox.max.z]) {
          carCorner.set(x,y,z).project(showcaseProbe);
          minX=Math.min(minX,carCorner.x);maxX=Math.max(maxX,carCorner.x);
          minY=Math.min(minY,carCorner.y);maxY=Math.max(maxY,carCorner.y);
        }
    return {minX,maxX,minY,maxY};
  }

  // Bounds of the visible landmark nearest the look target; null when none is shown.
  const apexBox = new THREE.Box3();
  function landmarkBounds(look) {
    let best = null, bestDistance = Infinity;
    for(const hero of worldTourScene.landmarks()) {
      if(!hero.visible) continue;
      apexBox.setFromObject(hero);
      if(apexBox.isEmpty()) continue;
      const d = apexBox.distanceToPoint(look);
      if(d < bestDistance) { bestDistance = d; best = hero; }
    }
    if(!best) return null;
    return apexBox.setFromObject(best);
  }

  function frameShowcaseCar(distance,time) {
    const key=[trackId,visual.view,visual.airflow,visual.quality,
      camera.aspect.toFixed(3),visual.view==='orbit'?Math.floor(time/1.5):0].join(':');
    if(key!==framingKey) {
      framingKey=key;
      framingEye.set(0,0,0);
      framingLookY=0;
      const originalEye=desiredCamera.clone(), originalLook=lookTarget.clone();
      const frame=trackId==='spiral'?skyFrame(distance):
        TOUR_IDS.has(trackId)?trackFrame(trackId,distance):null;
      const backward=frame?new THREE.Vector3(...frame.forward).negate():
        new THREE.Vector3(0,0,1);
      // Try the smallest look adjustment first, then dolly out if a wide
      // vehicle cannot fit. No per-track offsets or expensive per-frame probes.
      // A portrait phone (aspect ~0.46) needs far more dolly than a desktop; when
      // nothing fits, keep the least-cropped candidate instead of the unframed shot.
      let found=false, bestScore=Infinity, bestLookY=0;
      const bestEye=new THREE.Vector3();
      // The drive shot also owns the signature landmark: tilting down to catch the wheels
      // must not push its top out of frame, so that top is a fit constraint too.
      const landmark=visual.view==='drive'&&TOUR_IDS.has(trackId)?landmarkBounds(originalLook):null;
      // Landscape keeps the landmark clear of the home panel on the left (NDC x >= .04).
      const clearLeft=camera.aspect>1;
      // Fine steps near the camera: a tight landmark leaves only a ~1 m dolly window.
      search: for(const back of [0,1,2,3,4,5,6,7,8,9,10,12,14,16,20,26,32,40]) {
        const eye=originalEye.clone().addScaledVector(backward,back);
        for(const down of [0,.25,.5,.75,1,1.5,2,3,4,5,6,8,10,12]) {
          const look=originalLook.clone();look.y-=down;
          const b=projectedCarBounds(eye,look);
          // Fit inside the edge limits with a small margin: the hovering car bobs after this
          // one-off search, so a zero-margin fit crops it again a moment later.
          const carMiss=Math.max(-.92-b.minX,b.maxX-.92,-.88-b.minY,b.maxY-.88);
          let miss=carMiss;
          if(landmark) {
            carCorner.set((landmark.min.x+landmark.max.x)/2,landmark.max.y,(landmark.min.z+landmark.max.z)/2)
              .project(showcaseProbe);
            if(carCorner.z<1) miss=Math.max(miss,carCorner.y-.97);
            if(clearLeft) for(const x of [landmark.min.x,landmark.max.x])
              for(const y of [landmark.min.y,landmark.max.y])
                for(const z of [landmark.min.z,landmark.max.z]) {
                  carCorner.set(x,y,z).project(showcaseProbe);
                  if(carCorner.z<1) miss=Math.max(miss,.03-carCorner.x);
                }
          }
          // The whole car is the hard requirement; the landmark only breaks ties among the
          // candidates that fit it. With no fit at all, keep the least-cropped car.
          const score=carMiss<0?miss-1e3:carMiss;
          if(score<bestScore) {
            bestScore=score;
            bestEye.copy(eye).sub(originalEye);
            bestLookY=-down;
          }
          if(miss<0) {
            framingEye.copy(eye).sub(originalEye);
            framingLookY=-down;
            found=true;
            break search;
          }
        }
      }
      if(!found) { framingEye.copy(bestEye); framingLookY=bestLookY; }
    }
    desiredCamera.add(framingEye);
    lookTarget.y+=framingLookY;
  }


  function showroomClearShare(eye, look, projection = null) {
    if(!showcaseOccluders?.visible) return 1;
    const probe=projection||showcaseProbe;
    if(!projection) {
      probe.aspect=camera.aspect;
      probe.position.copy(eye);
      probe.lookAt(look);
      probe.updateProjectionMatrix();
    }
    probe.updateMatrixWorld(true);
    showcaseOccluders.updateMatrixWorld(true);
    player.updateMatrixWorld(true);
    let clear=0;
    for(const local of carSightPoints) {
      sightTarget.copy(local).applyMatrix4(player.matrixWorld);
      projectedSight.copy(sightTarget).project(probe);
      if(Math.abs(projectedSight.x)>.93 || Math.abs(projectedSight.y)>.93 ||
        projectedSight.z<=-1 || projectedSight.z>=1)continue;
      sightDirection.copy(sightTarget).sub(eye);
      const length=sightDirection.length();
      // Don't mistake the road just below the wheels for car occlusion.
      if(length<.5)continue;
      showcaseRay.set(eye,sightDirection.multiplyScalar(1/length));
      showcaseRay.far=length-.4;
      const obscured=showcaseRay.intersectObject(showcaseOccluders,true).some(hit=>{
        if(!hit.object.isMesh)return false;
        const materials=[].concat(hit.object.material||[]);
        // Transparent ghost particles and non-depth-writing water should not
        // count as opaque obstacles; multi-material facades still must count.
        return materials.some(material=>material &&
          material.depthWrite!==false && !(material.transparent && material.opacity<.65));
      });
      if(!obscured)clear++;
    }
    return clear/carSightPoints.length;
  }

  function avoidShowcaseObstruction(distance, time) {
    if(!showcaseOccluders?.visible)return;
    // For orbit, retest only when the rotating eye has moved appreciably;
    // all other views and stationary previews need one decision per mode.
    const key=[trackId,visual.view,visual.airflow,visual.quality,
      camera.aspect<.8,visual.view==='orbit'?Math.floor(time/1.5):0].join(':');
    if(key!==clearanceKey) {
      clearanceKey=key;
      clearanceShift.set(0,0,0);
      const baseline=showroomClearShare(desiredCamera,lookTarget);
      if(baseline<.8) {
        const frame=trackFrame(trackId,distance);
        const right=new THREE.Vector3(...frame.right);
        const forward=new THREE.Vector3(...frame.forward);
        // Try a small dolly-back first: for a high landmark aim (Tokyo/Alpine),
        // a tall camera can actually push the car BELOW the screen. Alternative
        // lateral/height moves handle viaducts, facades and mountain shoulders.
        // The per-track landmark target is never changed or removed.
        const candidates=[[0,0,3],[0,0,5],[-4,0,3],[4,0,3],
          [0,2.5,4],[-4,3,5],[4,3,5],[0,5,6],[-7,6,5],[7,6,5]];
        let best=baseline;
        for(const [side,up,back] of candidates) {
          const shift=right.clone().multiplyScalar(side)
            .addScaledVector(forward,-back).add(new THREE.Vector3(0,up,0));
          const value=showroomClearShare(desiredCamera.clone().add(shift),lookTarget);
          if(value>best) { best=value; clearanceShift.copy(shift); }
          if(value===1)break;
        }
      }
    }
    desiredCamera.add(clearanceShift);
  }
  const effects = createEffects(scene, (s) => TOUR_IDS.has(trackId) ? trackPoint(trackId,s).x : trackId === 'spiral' ? skyPosition(s)[0] : roadCenter(s));
  const aero = createAeroVFX(scene, player);
  let visual = vfxSettings();
  const projectedNozzle = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const smoothLook = new THREE.Vector3(0, 2, -25);
  let cameraMode = 0;
  let initialized = false;
  let lastRace = null;
  let trackId;
  let carBank = 0;
  let photoView = null, photoDefaults = null, photoCapture = null;

  let sizeKey = '', warmupPending = true;
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    // setSize reallocates the drawing buffer and every composer target, blanking a frame; mobile URL-bar and
    // dialog events fire resize with an unchanged size, so only act when size, pixel ratio or MSAA really changed.
    const key = `${width}x${height}@${renderPixelRatio}/${composer.renderTarget1.samples}`;
    if (key === sizeKey) return;
    sizeKey = key;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  // iOS fires resize on rotation before the new layout lands; observing the canvas catches the settled size.
  new ResizeObserver(resize).observe(canvas);

  function updateCar(mesh, car, distance, center, time, dt, isPlayer = false, input = {}) {
    const relative = car.distance - distance;
    // Tour and sky routes end at the finish and trackPoint clamps there, so cars
    // past it would pile up at the arch like parked cars; they leave the scene instead.
    const pastFinish = (trackId === 'spiral' || TOUR_IDS.has(trackId)) && car.distance > RACE_TRACKS[trackId].length;
    mesh.visible = isPlayer || (relative > -55 && relative < 900 && !pastFinish);
    if (!mesh.visible) return;
    if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
      if (trackId === 'spiral') mesh.position.fromArray(skyPosition(car.distance, car.x, car.altitude || 0, distance));
      else {
        const p=trackPoint(trackId,car.distance),o=trackPoint(trackId,distance),f=trackFrame(trackId,car.distance);
        mesh.position.set(p.x-o.x+f.right[0]*car.x+f.up[0]*(car.altitude||0),p.y-o.y+f.right[1]*car.x+f.up[1]*(car.altitude||0),p.z-o.z+f.right[2]*car.x+f.up[2]*(car.altitude||0));
      }
      const frame = trackId === 'spiral' ? skyFrame(car.distance) : trackFrame(trackId,car.distance);
      // Compose every visual offset in local car axes, retaining the actual road pitch/bank.
      // Reading/writing Euler rotation after setting the track quaternion used to
      // overwrite its banking and snap near 90-degree spiral headings.
      const driftYaw = car.drift ? -car.drift.dir * Math.PI * 25 / 180 : 0;
      const bank = isPlayer ? -(car.steering || 0) * (car.altitude > 0.8 ? 0.12 : 0.045) : 0;
      const trick = !(motionPreference.matches || visual.comfortable) && car.trick;
      const trickRoll = trick ? trick.dir * Math.PI * 2 * THREE.MathUtils.smoothstep(trick.time, 0, TRICK_ROLL_TIME) : 0;
      const pitch = car.thrusting ? -0.06 : Math.min(0.08, -(car.verticalSpeed || 0) * 0.006);
      orientCarOnRoad(mesh, frame, bank + trickRoll, pitch, driftYaw);
    } else {
      mesh.position.set(roadCenter(car.distance) - center + car.x, car.altitude || 0, -relative);
      const driftYaw = car.drift ? -car.drift.dir * Math.PI * 25 / 180 : 0;
      mesh.rotation.y = -roadHeading(car.distance) + driftYaw;
      const bank = isPlayer ? -(car.steering || 0) * (car.altitude > 0.8 ? 0.12 : 0.045) : 0;
      const trick = !(motionPreference.matches || visual.comfortable) && car.trick;
      const bankFrom = THREE.MathUtils.euclideanModulo(mesh.rotation.z + Math.PI, Math.PI * 2) - Math.PI;
      mesh.rotation.z = trick ? bank + trick.dir * Math.PI * 2 * THREE.MathUtils.smoothstep(trick.time, 0, TRICK_ROLL_TIME) : THREE.MathUtils.damp(bankFrom, bank, 8, dt);
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, car.thrusting ? -0.06 : Math.min(0.08, -(car.verticalSpeed || 0) * 0.006), 7, dt);
    }
    mesh.userData.jets.visible = !!car.thrusting;
    mesh.userData.brakeLight.color.copy(mesh.userData.lightColor).multiplyScalar(car.braking ? 2.3 : 1);
    const { wing } = mesh.userData;
    const downforce = isPlayer && visual.enabled && visual.airflow && visual.aeroMode === 'downforce';
    const boosting = car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
    wing.rotation.x = THREE.MathUtils.damp(wing.rotation.x, car.braking || downforce ? -0.35 : boosting ? 0.08 : 0, 8, dt);
    if (wing.userData.lift) wing.position.y = THREE.MathUtils.damp(wing.position.y, wing.userData.restY + (boosting || car.braking || car.altitude > 0.8 ? wing.userData.lift : 0), 8, dt);
    mesh.userData.wheels.forEach(wheel => {
      const target = (car.altitude > 0.8 ? Math.PI / 2.6 : 0) * Math.sign(wheel.position.x);
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, target, 7, dt);
      wheel.rotation.y = wheel.position.z < 0 ? -(car.steering || 0) * 0.3 : 0;
      if (wheel.children[2]) wheel.children[2].rotation.x -= car.speed * dt / 0.44;
    });
  }

  return {
    resize,
    previewAppearance(paint) {
      player.userData.body.material.color.set(paint.paint);
      player.userData.lightColor.fromArray(paint.light);
    },
    setRenderScale(scale) {
      adaptiveScale = scale; this.configureVFX(visual);
    },
    configureVFX(options) {
      visual=vfxSettings(options);
      const nextRatio=renderPixelRatioForQuality(visual.quality,devicePixelRatio,adaptiveScale);
      const samples=msaaSamples(visual.quality);
      if(samples!==composer.renderTarget1.samples) composer.reset(sceneTarget(samples));
      if(Math.abs(nextRatio-renderPixelRatio)>.001){
        renderPixelRatio=nextRatio;
        renderer.setPixelRatio(nextRatio);
        composer.setPixelRatio(nextRatio);
      }
      resize();
    },
    cycleCamera() { cameraMode = (cameraMode + 1) % 2; return cameraMode; },
    setPhotoView(options) {
      if (!options) {
        photoView = null;
        if (photoDefaults) {
          scene.background.copy(photoDefaults.background);
          scene.fog.color.copy(photoDefaults.fogColor);
          scene.fog.density = photoDefaults.fogDensity;
          renderer.toneMappingExposure = photoDefaults.exposure;
          photoDefaults = null;
        }
        return;
      }
      if (!photoDefaults) photoDefaults = {
        background: scene.background.clone(), fogColor: scene.fog.color.clone(),
        fogDensity: scene.fog.density, exposure: renderer.toneMappingExposure,
      };
      const angle = Number.isFinite(options.angle) ? options.angle : 0;
      photoView = { angle: angle * Math.PI / 180, fov: photoFov(options.fov), sky: options.sky };
      const styles = {
        original: null,
        sunset: ['#ec9478', '#bb7f89', .001, 1.15],
        night: ['#1b2e5a', '#304b73', .0016, .72],
        fog: ['#8297a4', '#8297a4', .004, 1.02],
      };
      const style = styles[options.sky] ?? null;
      scene.background.set(style ? style[0] : photoDefaults.background);
      scene.fog.color.set(style ? style[1] : photoDefaults.fogColor);
      scene.fog.density = style ? style[2] : photoDefaults.fogDensity;
      renderer.toneMappingExposure = style ? style[3] : photoDefaults.exposure;
    },
    capturePhoto() {
      if (photoCapture) return Promise.reject(new Error('Photo capture already in progress'));
      return new Promise((resolve,reject) => { photoCapture = { resolve, reject }; });
    },
    render(race, dt, idleTime, input = {}, presentation = {}, ghost = null) {
      const preview = race.phase === 'ready';
      const car = race.player;
      const reducedMotion = motionPreference.matches || visual.comfortable;
      const motionDt = preview || race.phase === 'racing' || race.phase === 'countdown' ? dt : 0;
      if (lastRace !== race) { effects.reset(); aero.reset(); rearLight.reset(); lastRace = race; initialized = false; carBank = 0; }
      if (trackId !== race.trackId) {
        trackId = race.trackId;
        const palette = TRACK_PALETTES[trackId];
        gauntletBarriers.material.color.set(trackId === 'cosmic' || trackId === 'spiral' ? '#ed87fa' : trackId === 'aurora' || trackId === 'alpine' ? '#ffcf81' : '#ff946f');
        scene.background.set(palette.fog); scene.fog.color.set(palette.fog);
        sky.material.uniforms.top.value.set(palette.top); sky.material.uniforms.horizon.value.set(palette.horizon);
        sky.material.uniforms.warmth.value = palette.warmth; sky.material.uniforms.aurora.value = trackId === 'aurora' ? 1 : 0;
        sky.material.uniforms.cloudOpacity.value = trackId==='cosmic'?0:trackId==='tokyo'?.14:trackId==='alpine'?.45:trackId==='coastal'?.32:trackId==='taipei'?.36:1;
        sky.material.uniforms.cloudTint.value.set(trackId==='alpine'?'#647575':trackId==='coastal'?'#82989a':trackId==='taipei'?'#77898b':trackId==='tokyo'?'#394354':'#4d3d60');
        sunlight.color.set(palette.sun);
        sunlight.intensity = TOUR_IDS.has(trackId) ? .75 : trackId === 'coast' ? 1.35 : trackId === 'neon' ? .8 : trackId === 'aurora' ? 1.2 : 2.3;
        sunlight.position.set(TOUR_IDS.has(trackId)?-400:-170,TOUR_IDS.has(trackId)?230:100,TOUR_IDS.has(trackId)?260:-190);
        renderer.toneMappingExposure=TOUR_IDS.has(trackId)?.86:trackId==='coast'?1.01:1.12;
        ambient.intensity = TOUR_IDS.has(trackId) ? (trackId==='cosmic'?.62:.98) : trackId==='coast'?1.24:trackId==='neon'?1.1:1.7;
        sun.visible = trackId === 'coast' || trackId === 'canyon';
        // Sky Spiral draws its own dome. The shared sky, sea and peaks would sit in front of it.
        sky.visible = sea.visible = mountains.visible = trackId !== 'spiral';
        sea.material.uniforms.ground.value.set(palette.ground); sea.material.uniforms.fogColor.value.set(palette.fog);
        sea.material.uniforms.water.value = trackId === 'coast' || trackId === 'neon' ? 1 : 0;
        seaLines.visible = trackId === 'coast'; mountains.material.color.set(palette.rock);
        city.visible = trackId === 'coast' || trackId === 'neon';
        windows.material.color.set(trackId === 'neon' ? '#ff6dbc' : '#ffd394');
        applyTrackSurfaceStyle(trackId,roadMaterial,buildingMat,palette.road);
        railLights.material.color.set(palette.rail);
        cliffs.visible = trackId === 'canyon' || trackId === 'aurora'; cliffs.material.color.set(palette.rock);
        tunnelRoofs.visible = tunnelWalls.visible = trackId === 'neon';
        shortcutDeck.material.color.set(palette.rail);
        surfaceMarks.visible = trackId === 'aurora';
        weather.material.size = trackId === 'neon' ? .12 : .24;
        roadGeometry.index.array.set(baseIndices); roadGeometry.index.needsUpdate = true;
        warmupPending = true; // track-specific props hidden until an event get their pipelines before racing
      }
      const distance = preview ? previewDistance(trackId) : car.distance;
      if(trackId==='coast'){coastScenery.show();coastScenery.update(distance,visual.quality);} else coastScenery.hide();
      if(trackId==='neon'||trackId==='canyon'||trackId==='aurora') classicScenery.update(trackId,distance,visual.quality); else classicScenery.hide();
      const center = trackId === 'spiral' ? skyPosition(distance)[0] : TOUR_IDS.has(trackId) ? trackPoint(trackId,distance).x : roadCenter(distance);
      // A readable driving corridor takes precedence over cinematic glare.
      // Dimming in the mountain bore is smoothed over the 38 m entrance.
      const tour=TOUR_IDS.has(trackId);
      const bore=tour&&trackId==='alpine'?race.sections.find(s=>
        (s.type==='tunnel'||s.type==='boost-tunnel')&&distance>=s.from&&distance<=s.to):null;
      const tunnelFade=bore?Math.min(1,(distance-bore.from)/38,(bore.to-distance)/38):0;
      if(tour){
        const base=trackId==='cosmic'?.62:trackId==='tokyo'?.8:.98;
        ambient.intensity=base*(1-.67*tunnelFade);
        sunlight.intensity=.75*(1-.88*tunnelFade);
        tunnelLights.forEach((light,i)=>{
          light.visible=trackId==='alpine'; // constant per track: a changing visible-light count recompiles every lit shader (black flash at the bore)
          light.intensity=.65*tunnelFade;
          light.color.set(i===0?'#ba9c74':'#9c9989');
          light.position.fromArray(trackLocalPosition(trackId,distance+21,(i===0?-1:1)*11.7,8,distance));
        });
      }else tunnelLights.forEach(light=>light.visible=false);
      const roadsideLit=tour&&['taipei','tokyo','coastal'].includes(trackId);
      roadsideLamps.forEach((light,i)=>{
        light.visible=roadsideLit&&!reducedMotion;
        if(!light.visible)return;
        light.intensity=trackId==='tokyo'?.29:trackId==='taipei'?.22:.17;
        light.color.set(trackId==='tokyo'?'#a6a4bc':trackId==='coastal'?'#c4c9b7':'#cfbf9f');
        light.position.fromArray(trackLocalPosition(trackId,distance+26,i===0?-17:17,10.5,distance));
      });

      const time = race.elapsed + idleTime;
      sea.material.uniforms.time.value = reducedMotion ? 0 : time;
      sky.material.uniforms.time.value = reducedMotion ? 0 : time;
      const touch = matchMedia('(pointer: coarse)').matches;
      weather.visible = !reducedMotion && visual.enabled && (trackId === 'neon' || trackId === 'aurora');
      weatherGeometry.setDrawRange(0, touch || visual.quality === 'low' ? 60 : 180);
      if (weather.visible) {
        for (let i = 0; i < 180; i++) weatherPositions[i * 3 + 1] = (i * 17 + time * (trackId === 'neon' ? -18 : -3)) % 32;
        weatherGeometry.attributes.position.needsUpdate = true;
        weather.position.set(car.x, car.altitude + 25, 15);
      }
      if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
        if (trackId === 'spiral') { skyScene.update(distance, visual.quality); worldTourScene.hide(); }
        else { skyScene.hide(); worldTourScene.update(trackId,distance,visual.quality,race.sections,time,reducedMotion); }
        road.visible = false;
        for (const m of [laneLines, curbs, edgeLines, railLights, pillars, poles, lamps, shortcutDeck, tunnelRoofs, tunnelWalls, cliffs, surfaceMarks]) m.visible = false;
        towers.forEach(t => { t.visible = false; });
        sectionSigns.forEach(({group}) => { group.visible = false; });
      } else {
        skyScene.hide(); worldTourScene.hide();
        road.visible = true;
        for (const m of [laneLines, curbs, edgeLines, railLights, pillars, poles, lamps, shortcutDeck, tunnelRoofs, tunnelWalls]) m.visible = true;
        towers.forEach(t => { t.visible = true; });
      }
      if (trackId !== 'spiral' && !TOUR_IDS.has(trackId)) for (let i = 0; i <= segments; i++) {
        const d = Math.floor(distance / 12) * 12 + (i - 5) * 12;
        const x = roadCenter(d) - center;
        const z = -(d - distance);
        roadVertices.set([x - 12, 0, z, x + 12, 0, z], i * 6);
        if (i === segments) continue;
        const section = race.sections.find(section => d + 6 >= section.from && d + 6 < section.to);
        if (trackId === 'canyon') for (let j = 0; j < 6; j++) roadGeometry.index.array[i * 6 + j] = section?.type === 'gap' ? 0 : baseIndices[i * 6 + j];
        if (tunnelRoofs.visible) {
          const tunnel = section?.type === 'tunnel';
          // Zero scales produce undefined lit normals that poison bloom; hide unused instances below the scene.
          put(tunnelRoofs, i, x, tunnel ? 4.25 : -1000, z - 6, 24, .5, 12.1);
          for (let side = 0; side < 2; side++) put(tunnelWalls, i * 2 + side, x + (side ? 12.6 : -12.6), tunnel ? 2 : -1000, z - 6, 1, 4, 12.1);
        }
        // Low quality and touch draw every other deck segment, as cliffs halve their count.
        const deck = section?.type === 'shortcut' && (i % 2 === 0 || !(touch || visual.quality === 'low'));
        put(shortcutDeck, i, x + (deck ? section.x : 0), deck ? section.altitude - SHORTCUT_TOLERANCE : -1000, z - 6, 6, .12, 12.1);
        if (surfaceMarks.visible) {
          const marked = section?.type === 'ice' || section?.type === 'uphill';
          put(surfaceMarks, i, x, marked ? .035 : -1000, z - 6, section?.type === 'uphill' ? 1.2 : 23, .025, section?.type === 'uphill' ? 3 : 12.1);
        }
        const angle = -roadHeading(d);
        for (let j = 0; j < 3; j++) put(laneLines, i * 3 + j, x + (j - 1) * 5, 0.018, z - 2, 0.11, 0.02, 4.7, angle);
        for (let side = 0; side < 2; side++) {
          const sx = side ? 1 : -1;
          put(curbs, i * 2 + side, x + sx * 12.4, 0.38, z - 6, 0.55, 0.76, 12.15, angle);
          put(edgeLines, i * 2 + side, x + sx * 11.5, 0.023, z - 6, 0.12, 0.02, 12.15, angle);
          put(railLights, i * 2 + side, x + sx * 12.1, 0.68, z - 6, 0.045, 0.04, 12.15, angle);
        }
      }
      if (trackId !== 'spiral' && !TOUR_IDS.has(trackId)) roadGeometry.attributes.position.needsUpdate = true;
      if (trackId === 'canyon') roadGeometry.index.needsUpdate = true;
      if (tunnelRoofs.visible) tunnelRoofs.instanceMatrix.needsUpdate = tunnelWalls.instanceMatrix.needsUpdate = true;
      if (surfaceMarks.visible) surfaceMarks.instanceMatrix.needsUpdate = true;
      shortcutDeck.instanceMatrix.needsUpdate = true;
      const pylons = race.sections.filter(section => section.type === 'shortcut').flatMap(shortcutPylons);
      for (let i = 0; i < shortcutPylonMeshes.count; i++) {
        const pylon = pylons[i], relative = pylon?.distance - distance;
        const shown = relative > -20 && relative < 900; // NaN without a pylon
        put(shortcutPylonMeshes, i, shown ? roadCenter(pylon.distance) - center + pylon.x : 0, shown ? pylon.altitude : -1000, shown ? -relative : 0, .4, SHORTCUT_TOLERANCE * 2, .4);
      }
      shortcutPylonMeshes.instanceMatrix.needsUpdate = true;
      sectionSigns.forEach(({ group, panel }, i) => {
        const section = race.sections[i];
        const relative = section ? section.from - 65 - distance : 0;
        group.visible = !!section && relative > -40 && relative < 850;
        if (!group.visible) return;
        if (TOUR_IDS.has(trackId)) {
          const signDistance = section.from - 65;
          group.position.fromArray(trackLocalPosition(trackId, signDistance, -17, 0, distance));
          const frame = trackFrame(trackId, signDistance);
          group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...frame.right), new THREE.Vector3(...frame.up),
            new THREE.Vector3(...frame.forward).negate()));
        } else {
          group.position.set(roadCenter(section.from - 65) - center - 17, 0, -relative);
          group.quaternion.identity();
        }
        // Always assign a valid material: missing boost-tunnel was a fatal
        // WebGLRenderer error as the sign entered view halfway through a race.
        panel.material = signs[sectionSignKey(section.type)];
      });
      if (cliffs.visible) {
        const count = touch || visual.quality === 'low' ? 20 : 40;
        cliffs.count = count;
        for (let i = 0; i < count; i++) {
          const d = Math.floor(distance / 75) * 75 + Math.floor(i / 2) * 75;
          put(cliffs, i, roadCenter(d) - center + (i % 2 ? 1 : -1) * (38 + i % 4 * 10), 15, -(d - distance), 28, 50 + i % 5 * 10, 40, i);
        }
        cliffs.instanceMatrix.needsUpdate = true;
      }
      if (trackId !== 'spiral' && !TOUR_IDS.has(trackId)) [laneLines, curbs, edgeLines, railLights].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
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

      // Bounded InstancedMesh: one distinct marker per reachable barrier,
      // no scene allocations or three.js collision checks on the hot path.
      let visibleHazards = 0;
      if (!preview && race.hazards.length) for (const hazard of race.hazards) {
        if (hazard.distance < distance - 16 || hazard.distance > distance + 550) continue;
        if (visibleHazards >= gauntletBarriers.instanceMatrix.count) break;
        const x = hazardX(hazard, race.elapsed);
        const xyz = trackId === 'spiral' ? skyPosition(hazard.distance, x, 1.25, distance)
          : TOUR_IDS.has(trackId) ? trackLocalPosition(trackId, hazard.distance, x, 1.25, distance)
            : [roadCenter(hazard.distance) - center + x, 1.25, distance - hazard.distance];
        put(gauntletBarriers, visibleHazards++, ...xyz, 3.1, 2.5, 1.3);
      }
      gauntletBarriers.count = visibleHazards;
      if (visibleHazards) gauntletBarriers.instanceMatrix.needsUpdate = true;

      let visibleGateParts = 0;
      if (!preview && race.checkpoint) for (const gate of race.checkpoint.gates) {
        if (gate.passed || gate.missed || gate.distance < distance - 16 || gate.distance > distance + 550) continue;
        if (visibleGateParts + 3 > checkpointGates.instanceMatrix.count) break;
        const locate = (x, y) => trackId === 'spiral' ? skyPosition(gate.distance, x, y, distance)
          : TOUR_IDS.has(trackId) ? trackLocalPosition(trackId, gate.distance, x, y, distance)
            : [roadCenter(gate.distance) - center + x, y, distance - gate.distance];
        put(checkpointGates, visibleGateParts++, ...locate(gate.x - 3.2, gate.altitude + 2.4), .32, 4.8, .44);
        put(checkpointGates, visibleGateParts++, ...locate(gate.x + 3.2, gate.altitude + 2.4), .32, 4.8, .44);
        put(checkpointGates, visibleGateParts++, ...locate(gate.x, gate.altitude + 4.8), 6.7, .34, .44);
      }
      checkpointGates.count = visibleGateParts;
      if (visibleGateParts) checkpointGates.instanceMatrix.needsUpdate = true;

      if (preview) {
        const groundedShowcase = visual.enabled && visual.airflow;
        const curated=!!HERO_PREVIEWS[trackId];
        updateCar(player, { ...previewPlayer(trackId,car,idleTime,reducedMotion,groundedShowcase), distance },
          distance,center,time,dt,true);
        rivals.forEach((mesh,i) => {
          mesh.visible = true; // show all three showcase cars even in solo practice
          const standIn = { x: [-7.5, -2.5, 7.5][i], distance: 0, speed: 0, altitude: 0, steering: 0 };
          updateCar(mesh, previewRival(trackId,i,race.rivals[i] ?? standIn,idleTime,reducedMotion),distance,center,time,dt);
        });
        traffic.forEach((mesh,i)=>{
          mesh.visible=i<race.traffic.length;
          if(mesh.visible)updateCar(mesh,{...race.traffic[i],
            distance:distance+(curated?80:65)+i*32},distance,center,time,dt);
        });
      } else {
        updateCar(player, car, distance, center, time, motionDt, true, input);
        if (race.phase === 'finished') player.position.z -= presentation.finishDistance || 0;
        rivals.forEach((mesh, i) => {
          mesh.visible = i < race.rivals.length;
          if (mesh.visible) updateCar(mesh, race.rivals[i], distance, center, time, motionDt);
        });
        traffic.forEach((mesh, i) => { mesh.visible = i < race.traffic.length; if (mesh.visible) updateCar(mesh, race.traffic[i], distance, center, time, motionDt); });
      }
      ghostCar.visible = !preview && !!ghost;
      rearLight.update(race, motionDt, reducedMotion || !visual.enabled);
      if (ghostCar.visible) {
        if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
          if(trackId==='spiral')ghostCar.position.fromArray(skyPosition(ghost.distance,ghost.x,ghost.altitude,distance));
          else {const p=trackPoint(trackId,ghost.distance),o=trackPoint(trackId,distance),f=trackFrame(trackId,ghost.distance);
            ghostCar.position.set(p.x-o.x+f.right[0]*ghost.x,p.y-o.y+f.up[1]*ghost.altitude,p.z-o.z+f.right[2]*ghost.x);}
          const frame = trackId==='spiral'?skyFrame(ghost.distance):trackFrame(trackId,ghost.distance);
          ghostCar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.right),new THREE.Vector3(...frame.up),new THREE.Vector3(...frame.forward).negate()));
        } else {
          ghostCar.position.set(roadCenter(ghost.distance) - center + ghost.x, ghost.altitude, distance - ghost.distance);
          ghostCar.rotation.y = -roadHeading(ghost.distance);
        }
      }
      shadow.position.x = player.position.x;
      shadow.position.z = player.position.z;
      shadow.scale.setScalar(1 + player.position.y * 0.04);
      shadow.material.opacity = 0.6 / (1 + player.position.y * 0.2);
      if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
        if(trackId==='spiral')finish.position.fromArray(skyPosition(race.length,0,0,distance));
        else {const p=trackPoint(trackId,race.length),o=trackPoint(trackId,distance);finish.position.set(p.x-o.x,p.y-o.y,p.z-o.z);}
        const frame=trackId==='spiral'?skyFrame(race.length):trackFrame(trackId,race.length);
        finish.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.right), new THREE.Vector3(...frame.up), new THREE.Vector3(...frame.forward).negate()));
      } else { finish.position.set(roadCenter(race.length) - center, 0, -(race.length - distance)); finish.rotation.set(0,0,0); }
      finish.visible = race.length - distance < 1400;
      effects.update(race, motionDt, center, preview, reducedMotion, flightVehicles,
        TOUR_IDS.has(trackId) ? { ...visual, worldPoint: (s,x,y,origin) => trackLocalPosition(trackId,s,x,y,origin) } : visual);
      const feedback = aero.update(race, race.phase === 'paused' ? 0 : dt, center, distance, visual, reducedMotion);
      const boostStrength = Math.max(feedback.strength, car.nitroTime > 0 ? 1 : car.miniBoost > 0 ? 0.5 : 0);
      const portrait = camera.aspect < 0.8;
      if (photoView && race.phase === 'paused') {
        desiredCamera.set(player.position.x + Math.sin(photoView.angle) * 14,
          player.position.y + 5, player.position.z + Math.cos(photoView.angle) * 14);
        lookTarget.copy(player.position); lookTarget.y += 1;
      } else if (race.phase === 'finished' && !reducedMotion) {
        desiredCamera.set(player.position.x + (portrait ? 10 : 8), player.position.y + 3.2, player.position.z + 6);
        lookTarget.copy(player.position); lookTarget.y += 0.8;
      } else if (preview && visual.view !== 'drive') {
        // The selected view wins over curated showcase framing on every map.
        const pose = showcaseCameraPose(trackId,visual.view,time,portrait);
        const frame = TOUR_IDS.has(trackId) ? trackFrame(trackId,distance)
          : trackId === 'spiral' ? skyFrame(distance) : null;
        if (frame) {
          const right = new THREE.Vector3(...frame.right);
          const forward = new THREE.Vector3(...frame.forward);
          desiredCamera.copy(player.position).addScaledVector(right,pose.cameraSide)
            .addScaledVector(forward,-pose.cameraBack)
            .add(new THREE.Vector3(0,pose.cameraHeight,0));
          lookTarget.copy(player.position).addScaledVector(right,pose.lookSide)
            .addScaledVector(forward,pose.lookAhead)
            .add(new THREE.Vector3(0,pose.lookHeight-1.6,0));
        } else {
          desiredCamera.set(player.position.x+pose.cameraSide,
            player.position.y+pose.cameraHeight,player.position.z+pose.cameraBack);
          lookTarget.copy(player.position);
          lookTarget.y+=pose.lookHeight-1.6;
        }
      } else if (preview && HERO_PREVIEWS[trackId]) {
        // Same shot scale and 3/4 chase angle as the original five course
        // previews, rotated into the local road frame (including hills).
        // A world-space lookTarget at the next waypoint previously made the
        // Alpine and Cosmic cars too small or cut off.
        const info=HERO_PREVIEWS[trackId],frame=trackFrame(trackId,distance);
        const right=new THREE.Vector3(...frame.right),forward=new THREE.Vector3(...frame.forward);
        desiredCamera.copy(player.position)
          .addScaledVector(right,portrait?7.8:info.cameraSide)
          .addScaledVector(forward,-(portrait?13.8:info.cameraBack))
          // Reference maps use absolute 5.1 m camera eye height, while the
          // showcased car floats at 1.6 m. Preserve the SAME relative view.
          .add(new THREE.Vector3(0,portrait?4.3:info.cameraHeight,0));
        lookTarget.copy(player.position)
          .addScaledVector(right,portrait?1:info.lookSide)
          .addScaledVector(forward,info.lookAhead)
          .add(new THREE.Vector3(0,info.lookHeight-1.6,0));
      } else if (!preview && visual.enabled && visual.airflow && visual.view !== 'drive') {
        const angle = visual.view === 'orbit' ? time * 0.18 : { front: Math.PI, rear: 0, left: -Math.PI / 2, right: Math.PI / 2 }[visual.view];
        desiredCamera.set(player.position.x + Math.sin(angle) * 9, player.position.y + 3.6, Math.cos(angle) * 9);
        lookTarget.copy(player.position); lookTarget.y += 0.8;
      } else if (preview) {
        desiredCamera.set(portrait ? 7.8 : 8.3, portrait ? 5.9 : 5.1, portrait ? 13.8 : 11.8);
        lookTarget.set(portrait ? 1 : -1.4, 1.4, -3.5);
      } else if (cameraMode === 1) {
        if (trackId === 'spiral' || TOUR_IDS.has(trackId)) desiredCamera.copy(player.position).add(new THREE.Vector3(0, 1.7, 0));
        else desiredCamera.set(car.x, car.altitude + 1.7, -0.95);
        if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
          const f=trackFrame(trackId,distance+65),p=f.point,o=trackPoint(trackId,distance);
          lookTarget.set(p.x-o.x+f.right[0]*car.x,p.y-o.y+car.altitude+1.5,p.z-o.z+f.right[2]*car.x);
        }
        else lookTarget.set(car.x + roadCenter(distance + 65) - center, car.altitude + 1.5, -65);
      } else {
        if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
          const frame = trackId === 'spiral' ? skyFrame(distance) : trackFrame(trackId,distance);
          const back = new THREE.Vector3(...frame.forward).multiplyScalar(- (portrait ? 14.5 : 12.5));
          desiredCamera.copy(player.position).add(back).add(new THREE.Vector3(0,5,0));
        } else desiredCamera.set(car.x * 0.74, car.altitude * 0.85 + (car.altitude > 2 ? 4.4 : 4.8), portrait ? 13.5 : 11.6);
        if (trackId === 'spiral' || TOUR_IDS.has(trackId)) {
          const f=trackFrame(trackId,distance+34),p=f.point,o=trackPoint(trackId,distance);
          lookTarget.set(p.x-o.x+f.right[0]*car.x,p.y-o.y+car.altitude+1.5,p.z-o.z+f.right[2]*car.x);
        }
        else lookTarget.set(car.x * 0.7 + (roadCenter(distance + 30) - center) * 0.35, car.altitude * 0.85 + 1.5, -25);
      }
      desiredCamera.z -= reducedMotion ? 0 : (presentation.goPush || 0) * 1.4;
      const impactAge = car.impact ? race.elapsed - car.impact.time : 10;
      const impact = !preview && impactAge < 0.65 ? (1 - impactAge / 0.65) ** 2 * car.impact.intensity : 0;
      const landingAge = car.landing ? race.elapsed - car.landing.time : 10;
      const landing = landingAge < 0.55 ? Math.exp(-landingAge * 8) * Math.min(1, car.landing.speed / 14) : 0;
      if (!reducedMotion && race.phase === 'racing') {
        desiredCamera.x += Math.sin(time * 61) * impact * 0.27;
        desiredCamera.y += Math.sin(time * 47) * impact * 0.15 - landing * 0.3;
        desiredCamera.z += impact * 0.65;
        desiredCamera.x += Math.sin(time * 65) * feedback.ignition * visual.shake * 0.12;
        desiredCamera.z += boostStrength * (visual.enabled ? 0.22 : 0);
      }
      if(preview) {
        // Preserve scenery clearance, then fit the complete car within the
        // actual viewport, regardless of track and selected camera angle.
        if(TOUR_IDS.has(trackId))avoidShowcaseObstruction(distance,time);
        frameShowcaseCar(distance,time);
      }
      const smoothing = 1 - Math.exp(-dt * 7);
      if (!initialized) { camera.position.copy(desiredCamera); smoothLook.copy(lookTarget); initialized = true; }
      camera.position.lerp(desiredCamera, smoothing);
      smoothLook.lerp(lookTarget, smoothing);
      // A paused photo needs immediate framing; dt-based camera smoothing is zero on pause.
      if (photoView && race.phase === 'paused') {
        camera.position.copy(desiredCamera);
        smoothLook.copy(lookTarget);
      }
      camera.lookAt(smoothLook);
      carBank = THREE.MathUtils.damp(carBank, !reducedMotion && car.altitude > 1 ? -(input.steer || 0) * 0.025 : 0, 5, dt);
      camera.rotation.z += carBank;
      const targetFov = preview ? 50 : reducedMotion ? 64 : 57 + car.speed * 0.115 + boostStrength * (visual.enabled ? visual.fov : 0) - impact * 4;
      camera.fov = photoView && race.phase === 'paused' ? photoView.fov : camera.fov + (targetFov - camera.fov) * smoothing;
      camera.updateProjectionMatrix();
      lens.uniforms.boost.value = reducedMotion || !visual.enabled ? 0 : boostStrength * visual.motionBlur;
      lens.uniforms.impact.value = reducedMotion ? 0 : impact;
      projectedNozzle.copy(feedback.nozzle).project(camera);
      lens.uniforms.nozzle.value.set(projectedNozzle.x * 0.5 + 0.5, projectedNozzle.y * 0.5 + 0.5);
      lens.uniforms.pressure.value = reducedMotion || visual.quality === 'low' || projectedNozzle.z > 1 ? 0 : feedback.strength * 0.6;
      lens.uniforms.time.value = time;
      bloom.strength = TOUR_IDS.has(trackId) ? .085 : (trackId==='coast'?.19:.42) + (reducedMotion || !visual.enabled ? 0 : boostStrength * visual.bloom * .25 + feedback.ignition * visual.bloom * .2);
      bloom.enabled = visual.quality !== 'low';
      if (warmupPending) { warmupPending = false; warmupShaders(renderer, scene, camera, composer.renderTarget1); }
      renderer.info.reset(); // Exclude warmup draws and previous frames.
      composer.render(dt);
      if (photoCapture) {
        const request = photoCapture;
        photoCapture = null;
        try {
          const resolution = renderer.getDrawingBufferSize(new THREE.Vector2());
          const width = resolution.x, height = resolution.y;
          if (width * height > 16_000_000) throw new RangeError('Screenshot too large');
          const pixels = new Uint8Array(width * height * 4);
          renderer.getContext().readPixels(0,0,width,height,
            renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);
          const output = document.createElement('canvas');
          output.width = width; output.height = height;
          output.getContext('2d').putImageData(new ImageData(flipRgbaRows(pixels,width,height),width,height),0,0);
          output.toBlob(blob => blob ? request.resolve(blob) : request.reject(new Error('PNG export unavailable')),'image/png');
        } catch (error) { request.reject(error); }
      }
    },
    inspectRenderLoad() { return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}; },
    inspectPrograms() { return renderer.info.programs.length; }, // QA only: shader programs compiled so far
    inspectShowcase() {
      // Read-only projection for browser QA: verify the player and all three
      // rivals stay within the real camera on curving/elevated preview roads.
      camera.updateMatrixWorld(true);
      return [player,...rivals].map((mesh,i)=>{
        const projected=mesh.getWorldPosition(new THREE.Vector3()).project(camera);
        // The axle span collapses edge-on; measure the actual body silhouette.
        const body=mesh.userData.body,vertices=body.geometry.attributes.position;
        const point=new THREE.Vector3();
        let minX=Infinity,maxX=-Infinity;
        for(let j=0;j<vertices.count;j++) {
          point.fromBufferAttribute(vertices,j).applyMatrix4(body.matrixWorld).project(camera);
          minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);
        }
        return {name:i===0?'YOU':'RIVAL '+i,visible:mesh.visible,
          x:projected.x,y:projected.y,z:projected.z,
          screenWidth:maxX-minX,jetsVisible:mesh.userData.jets.visible,
          worldY:mesh.position.y,
          ...(i===0?{bodyClearShare:showroomClearShare(camera.position,smoothLook,camera),
            carBounds:(() => {
              // Reuse the same complete-silhouette bounds for QA assertions.
              const bounds=projectedCarBounds(camera.position,smoothLook);
              return bounds;
            })()}:{})};
      });
    },
    inspectLandmarks() {
      // Read-only browser QA: projected NDC bounds of each World Tour landmark,
      // so home showcases can assert their signature landmark is in frame.
      camera.updateMatrixWorld(true);
      const raycaster=new THREE.Raycaster();
      const shown=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
      return worldTourScene.landmarks().map(hero=>{
        // Bounds from the projected mesh vertices: box corners overstate the
        // on-screen extent of cones and rings seen at an angle.
        const box=new THREE.Box3().setFromObject(hero),v=new THREE.Vector3();
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,ahead=true;
        hero.updateMatrixWorld(true);
        hero.traverse(o=>{
          if(!o.isMesh)return;
          const p=o.geometry.attributes.position;
          for(let i=0;i<p.count;i++){
            v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);
            if(v.z>=1){ahead=false;continue;}
            minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);
          }
        });
        const zs=[ahead?0:1];
        // Unobstructed share: of the on-screen 9x9 grid rays that land on the
        // landmark's own geometry (not ring holes or sky beside a tower), the
        // share whose first scene hit is the landmark rather than a blocker.
        let samples=0,hits=0;
        if(hero.visible&&zs.every(z=>z<1))for(let i=0;i<9;i++)for(let j=0;j<9;j++){
          const x=THREE.MathUtils.lerp(minX,maxX,(i+.5)/9),y=THREE.MathUtils.lerp(minY,maxY,(j+.5)/9);
          if(Math.abs(x)>1||Math.abs(y)>1)continue;
          raycaster.setFromCamera(new THREE.Vector2(x,y),camera);
          if(!raycaster.intersectObject(hero,true).some(h=>h.object.isMesh))continue;
          const hit=raycaster.intersectObjects(scene.children,true).find(h=>h.object.isMesh&&shown(h.object));
          if(!hit)continue;samples++;
          let node=hit.object;while(node&&node!==hero)node=node.parent;
          if(node)hits++;
        }
        return {kind:hero.userData.entry.kind,visible:hero.visible,minX,maxX,minY,maxY,
          inFront:zs.every(z=>z<1),unobstructed:samples?hits/samples:0,
          distance:camera.position.distanceTo(box.getCenter(new THREE.Vector3()))};
      });
    },
    dispose() {
      stopLocaleSigns();
      skyScene.dispose(); worldTourScene.dispose(); coastScenery.dispose(); classicScenery.dispose();
      effects.dispose();
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) for (const mat of [].concat(object.material)) mat.dispose();
      });
      environment.dispose();
      signTexture.dispose();
      signTextures.forEach(texture => texture.dispose());
      Object.values(signs).forEach(mat => mat.dispose());
      shadowTexture.dispose();
      composer.passes.forEach(pass => pass.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}
