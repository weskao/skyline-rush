import { updateSkyline } from './skyline-scenery.ts';
import * as THREE from 'three';
import { photoFov } from './photo-export.ts';
import { capturePhoto } from './photo-capture.ts';
import { createRoomEnvironment } from './room-environment.ts';
import { createWeatherPoints } from './weather-points.ts';
import { createSectionSignMaterials } from './section-sign-materials.ts';
import { createCoastLook } from './coast-look.ts';
import { createClassicBackdrop } from './classic-backdrop.ts';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createLensPass } from './lens-pass.ts';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { roadRibbon } from './geometry.ts';
import { classicRoadRoute, legacyClassicRoad } from './classic-road-routes.ts';
import { createClassicRoadRender } from './classic-road-render.ts';
import { createEffects } from './effects.js';
import { createAeroVFX } from './aero-vfx.js';
import { vfxSettings, createSprintVfx, sprintFovOffset } from './vfx-settings.ts';
import { raceCameraView, rigBack, rigHeight, rigFov, rigShake, stepCameraSwing } from './race-camera.ts';
import { renderPixelRatioForQuality } from './render-resolution.ts';
import { warmupShaders } from './shader-warmup.ts';
import { t, getLocale, onLocaleChange } from './i18n.ts';
import { createRearLight } from './rear-light.ts';
import { createRaceVisuals, blizzardLevel, weatherDrops } from './race-visuals.ts';
import { createGarageStage, GARAGE_LIGHTING } from './garage-stage.ts';
import { applyCarReflections, createCarEnvironment } from './car-reflections.ts';
import { createCarBounds } from './car-bounds.ts';
import { createUpcomingShowcase } from './upcoming-showcase.ts';
import { UPCOMING_ENVIRONMENTS } from './upcoming-scenes/index.ts';
import { createCircuitScene } from './circuit-scene.ts';
import { createFrostbiteRaceScene } from './frostbite-race-scene.ts'; import { fitText } from './sign-text.ts'; import { MEASURED_COURSE_IDS, MEASURED_COURSE_SUN, createMeasuredCourseScenes } from './measured-course-scenes.ts';
import { createCourseRaceScene } from './course-race-scene.ts'; import { graphOrigin, graphCarVisual, graphLookAhead, graphFinishVisual } from './course-render-pose.ts'; import { courseItemFrame, courseItemPoint } from './course-items.ts'; import { isCourseRuntime } from './course-runtimes.ts';
import { FROSTBITE_ID, FROSTBITE_SPAN, frostbiteObjectSpan, frostbiteSpanLift } from './courses/frostbite-race.ts';
import { CIRCUIT_ID, physicalGap } from './circuit-track.ts';
import { instances, material, block, CAR_STYLES, RIVAL_CAR_STYLES, TRAFFIC_CAR_STYLES, makeCar, stepWing } from './car-model.js';
import { createCoastScenery, COAST_LIGHTING } from './coast-visuals.ts';
import { createWorldCoastAssets } from './coast-assets.ts';
import { landmarkBounds } from './landmark-bounds.ts';
import { createContactShadow, shadowOpacity } from './contact-shadow.ts';
import { isRaining, racePreset } from './board-effects.ts';
import { createClassicTrackScenery } from './classic-track-scenery.ts';
import { TRACK_PALETTES, applyTrackSurfaceStyle } from './track-palettes.ts';
import { createSkyScene } from './sky-scene.js';
import { skyPosition as finiteSkyPosition, skyFrame as finiteSkyFrame } from './sky-track.ts';
import { orientCarOnRoad, placeGroundShadow } from './vehicle-pose.ts';
import { poseFor, smoothDriftYaw } from './vehicle-render-motion.js';
import { trackPoint as finitePoint, trackFrame as finiteFrame, trackLocalPosition as finitePosition, lookAheadDistance } from './track-paths.ts';
import { HERO_PREVIEWS,SHOWCASE_BACKS,previewDistance,previewPlayer,previewRival,showcaseCameraPose } from './track-preview.ts';
import { sectionSignKey } from './section-signs.ts';
import { createWorldTourScene } from './world-tour-scene.js';
import { RACE_TRACKS, TRICK_ROLL_TIME, SHORTCUT_TOLERANCE, shortcutPylons } from './game.js';
import { createRampPool, drawRamps } from './ramp-view.ts'; import { createHazardRenderer } from './hazard-render.ts';
import { createWorldGarageModel } from './garage-model.ts';
import { createGraceFade, graceOpacity } from './grace-fade.ts';
/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */
/** @typedef {import('./game-types.js').TrackConfig} TrackConfig */
const box = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4();
const rotation = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const TOUR_IDS = new Set(['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']);
const framedRoad = (id, endless = false) => TOUR_IDS.has(id) || id === CIRCUIT_ID || (!endless && (id === FROSTBITE_ID || MEASURED_COURSE_IDS.has(id) || isCourseRuntime(id)));
function put(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
  position.set(x, y, z);
  scale.set(sx, sy, sz);
  rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  matrix.compose(position, rotation, scale);
  mesh.setMatrixAt(index, matrix);
}
export function createWorld(canvas) {
  // Scoped continuation: finite career/Ghost path API still clamps at the finish.
  let endlessActive=false, curvedClassic = false, classicRoute = legacyClassicRoad;
  const roadCenter = d => classicRoute.point(d)[0], roadHeading = d => classicRoute.heading(d);
  const classicPosition = (d, x, y, origin) => {
    const [px, pz] = classicRoute.point(d, x), [ox, oz] = classicRoute.point(origin);
    return [px - ox, y, pz - oz];
  };
  const skyPosition=(d,x=0,y=0,o=0)=>finiteSkyPosition(d,x,y,o,endlessActive),skyFrame=d=>finiteSkyFrame(d,endlessActive),
    trackPoint=(id,d)=>finitePoint(id,d,endlessActive),trackFrame=(id,d,span=false)=>finiteFrame(id,d,endlessActive,span),
    trackLocalPosition=(id,d,x=0,y=0,o=0)=>finitePosition(id,d,x,y,o,endlessActive);
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
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)'), touchPreference = matchMedia('(pointer: coarse)');
  // The scene is rendered into this target, not the canvas, so it must carry the MSAA samples or every
  // edge stays jagged and crawls as the camera moves (the flicker seen on the start screen and in races).
  const msaaSamples = quality => quality === 'low' ? 2 : 4;
  const sceneTarget = samples => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, sceneTarget(4)); // configureVFX re-targets for the saved quality tier
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 1.1);
  // The bloom blur spreads one NaN/Inf scene texel into a screen-sized black rectangle (seen when a nozzle shader hit
  // 0*Inf at an MSAA sliver). Dropping non-finite texels at the high pass caps such a bug at a one-pixel speck.
  const highPass = bloom.materialHighPassFilter, texel = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!highPass.fragmentShader.includes(texel)) throw new Error('UnrealBloomPass high pass changed: move the NaN guard');
  highPass.fragmentShader = highPass.fragmentShader.replace(texel, `${texel} if ( any( isnan( texel ) ) || any( isinf( texel ) ) ) texel = vec4( 0.0 );`);
  composer.addPass(bloom);
  const lens = createLensPass();
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  const environment = createRoomEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.42; let garageStage = null, garagePaint = null, garagePreviewSkins = {};
  const carEnvironment = createCarEnvironment(renderer);
  const upcomingStage = createUpcomingShowcase(UPCOMING_ENVIRONMENTS, environment.texture, carEnvironment, host => garageModel?.release(host)); // runs after createWorld returns, so garageModel is initialised
  const ambient = new THREE.HemisphereLight('#90bcff', '#15273f', 1.7);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight('#ffb88a', 2.3);
  const tunnelLights = [-1,1].map(()=>new THREE.PointLight('#b5a27b',0,35,2));
  tunnelLights.forEach(light=>{light.visible=false;scene.add(light);});
  const roadsideLamps=[-1,1].map(()=>new THREE.PointLight('#d0bd9b',0,46,2));
  roadsideLamps.forEach(light=>{light.visible=false;scene.add(light);});
  sunlight.position.set(-170, 100, -190);
  scene.add(sunlight);
  const coastLook = createCoastLook({ scene, renderer, lens, room: environment.texture, roomIntensity: 0.42, baseUrl: import.meta.env.BASE_URL, bloom, sun: sunlight });
  const { sky, sun, sea, seaLines, mountains } = createClassicBackdrop(scene, box, put);
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
  const roadMaterial = material('#142534', 0.3, 0.5);
  roadMaterial.envMapIntensity = 0.25;
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.name = 'classic-road'; road.frustumCulled = false;
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
  const hazardMeshes = createHazardRenderer(scene, box, instances, put, (id, s, x, y, origin, center) => id === 'spiral' ? skyPosition(s, x, y, origin)
    : framedRoad(id, endlessActive) ? trackLocalPosition(id, s, x, y, origin) : classicPosition(s, x, y, origin),
    (_, s) => curvedClassic ? -roadHeading(s) : 0);
  const launchRamps = createRampPool(scene);
  // Neon uprights + beam for each timed checkpoint; pooled like the gauntlet barriers.
  const checkpointGates = instances(box, new THREE.MeshBasicMaterial({ color: '#54f3dd' }), 48, scene);
  checkpointGates.name = 'checkpoint-gates'; checkpointGates.count = 0;
  shortcutDeck.name = 'shortcut-deck'; shortcutPylonMeshes.name = 'shortcut-pylons';
  const surfaceMarks = instances(box, new THREE.MeshBasicMaterial({ color: '#9ae6ff', transparent: true, opacity: .3, depthWrite: false }), segments, scene);
  const cliffs = instances(new THREE.ConeGeometry(1, 1, 5), material('#a15339'), 40, scene);
  const { positions: weatherPositions, geometry: weatherGeometry, points: weather } = createWeatherPoints();
  scene.add(weather);
  const { signs, signTextures, signPaints } = createSectionSignMaterials();
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
  applyCarReflections(player, carEnvironment);
  const graceFade = createGraceFade(player); // before aero VFX attach to it
  const rearLight = player.userData.rearLight;
  const rivals = RIVAL_CAR_STYLES.map(style => { const car = makeCar(style); scene.add(car); return car; });
  const flightVehicles = [player, ...rivals];
  const trafficColors = ['#6e879c', '#ded6c9', '#a15b60', '#8c99a4', '#48545e'];
  // ×2 covers the double-traffic daily modifier.
  const traffic = Array.from({ length: Math.max(...Object.values(RACE_TRACKS).map(track => Math.round(36 * track.trafficDensity * 2))) }, (_, i) => {
    const car = makeCar(TRAFFIC_CAR_STYLES[i % TRAFFIC_CAR_STYLES.length], trafficColors[i % trafficColors.length]);
    car.scale.setScalar(0.96);
    scene.add(car);
    return car;
  });
  // Best-run ghost: the player's shape in one translucent material.
  const ghostCar = makeCar(CAR_STYLES.roadster);
  const ghostMaterial = new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.3, depthWrite: false });
  ghostCar.traverse(object => { if (object.material) { [].concat(object.material).forEach(mat => mat.dispose()); object.material = ghostMaterial; } });
  ghostCar.userData.jets.visible = ghostCar.visible = false; ghostCar.name = 'ghost-car';
  scene.add(ghostCar);
  const { shadow, texture: shadowTexture } = createContactShadow(scene);
  const skyScene = createSkyScene(scene);
  const worldTourScene = createWorldTourScene(scene);
  const coastScenery = createCoastScenery(scene), classicScenery = createClassicTrackScenery(scene);
  const coastAssets = createWorldCoastAssets(renderer, { scenery: coastScenery, road }, canvas.dataset); // ?look=3d Medium+ Coast: scenery GLB + KTX2 asphalt + wet mirror; else null
  // Inspect car occlusion only when the showroom angle changes.
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
  let clearanceKey = '', clearancePlan = [0,0,0];
  // Orbit reuses eight fitted poses.
  const orbitTurns = [0,1,2,3,4,5,6,7].map(i=>i*Math.PI/4), spin = (v,a) => v.clone().sub(player.position).applyAxisAngle(camera.up,a).add(player.position);
  // Frame the full vehicle silhouette, including wheels.
  const { projectedCarBounds, carCorner } = createCarBounds(showcaseProbe, camera, player, () => aero.group);
  let framingKey = '', framingBack = 0, framingLookY = 0; const framingAxis = new THREE.Vector3();

  function frameShowcaseCar(distance) {
    // Hover wheels fold out over ~0.5 s and widen the car: reframe as they move, not once from the first frame.
    const key=[trackId,visual.view,visual.airflow,visual.quality,camera.aspect.toFixed(3),garageHomePreview,
      Math.round(player.userData.wheels[0].rotation.z*4)].join(':');
    // Dolly straight away from the car for the chosen angle (re-aimed each frame as orbit turns); only drive follows the road's chase axis.
    if(visual.view!=='drive') framingAxis.copy(desiredCamera).sub(player.position).setY(0).normalize();
    if(key!==framingKey) {
      framingKey=key;
      framingBack=0;
      framingLookY=0;
      const originalEye=desiredCamera.clone(), originalLook=lookTarget.clone();
      const frame=trackId==='spiral'?skyFrame(distance):
        curvedClassic||framedRoad(trackId, endlessActive)?trackFrame(trackId,distance):null;
      if(visual.view==='drive') framingAxis.set(...(frame?frame.forward:[0,0,-1])).negate();
      // Try the smallest look adjustment first, then dolly out if a wide
      // vehicle cannot fit. No per-track offsets or expensive per-frame probes.
      // A portrait phone (aspect ~0.46) needs far more dolly than a desktop; when
      // nothing fits, keep the least-cropped candidate instead of the unframed shot.
      let found=false, bestScore=Infinity, bestLookY=0, bestBack=0;
      const turns=visual.view==='orbit'?orbitTurns:[0];
      projectedCarBounds(originalEye,originalLook); // measure the car once; candidates only re-project it
      // The drive shot also owns the signature landmark: tilting down to catch the wheels
      // must not push its top out of frame, so that top is a fit constraint too.
      // Frostbite keeps its race-only framing: the home landmark fit stays on Tour/Circuit roads.
      const landmark=visual.view==='drive'&&framedRoad(trackId, endlessActive)&&trackId!==FROSTBITE_ID&&!MEASURED_COURSE_IDS.has(trackId)?landmarkBounds(trackId===CIRCUIT_ID?circuitScene.landmarks():worldTourScene.landmarks(),originalLook):null;
      // Landscape keeps the landmark clear of the home panel on the left (NDC x >= .04).
      const clearLeft=camera.aspect>1;
      // Fine steps near the camera: a tight landmark leaves only a ~1 m dolly window.
      search: for(const back of SHOWCASE_BACKS) {
        const eye=originalEye.clone().addScaledVector(framingAxis,back);
        for(const down of [0,.25,.5,.75,1,1.5,2,3,4,5,6,8,10,12]) {
          const look=originalLook.clone();look.y-=down;
          // Fit inside the edge limits with a small margin: the hovering car bobs after this
          // one-off search, so a zero-margin fit crops it again a moment later.
          const carMiss=Math.max(...turns.map(a=>{ const b=projectedCarBounds(spin(eye,a),spin(look,a),false);
            return Math.max(-.92-b.minX,b.maxX-.92,-.88-b.minY,b.maxY-.88); }));
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
            bestBack=back;
            bestLookY=-down;
          }
          if(miss<0) {
            framingBack=back;
            framingLookY=-down;
            found=true;
            break search;
          }
        }
      }
      if(!found) { framingBack=bestBack; framingLookY=bestLookY; }
    }
    desiredCamera.addScaledVector(framingAxis,framingBack);
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
  function avoidShowcaseObstruction(distance) {
    if(!showcaseOccluders?.visible)return;
    const frame=trackFrame(trackId,distance);
    const right=new THREE.Vector3(...frame.right);
    const forward=new THREE.Vector3(...frame.forward);
    // Offsets follow the chosen angle: "back" means away from the car, not along the road.
    if(visual.view!=='drive') right.crossVectors(forward.copy(player.position).sub(desiredCamera).setY(0).normalize(),camera.up);
    const offset=([side,up,back])=>right.clone().multiplyScalar(side).addScaledVector(forward,-back).add(new THREE.Vector3(0,up,0));
    // One decision per mode; orbit judges each move around its whole circle and re-aims it as it turns.
    const key=[trackId,visual.view,visual.airflow,visual.quality,camera.aspect<.8].join(':');
    if(key!==clearanceKey) {
      clearanceKey=key;
      clearancePlan=[0,0,0];
      const turns=visual.view==='orbit'?orbitTurns:[0];
      const share=eye=>Math.min(...turns.map(a=>showroomClearShare(spin(eye,a),spin(lookTarget,a))));
      let best=share(desiredCamera);
      // Try a small dolly-back first: for a high landmark aim (Tokyo/Alpine),
      // a tall camera can actually push the car BELOW the screen. Alternative
      // lateral/height moves handle viaducts, facades and mountain shoulders;
      // orbit never sidesteps, so it keeps circling the car itself.
      // The per-track landmark target is never changed or removed.
      if(best<.8) for(const plan of [[0,0,3],[0,0,5],[-4,0,3],[4,0,3],
        [0,2.5,4],[-4,3,5],[4,3,5],[0,5,6],[-7,6,5],[7,6,5]]) {
        if(plan[0]&&turns.length>1)continue;
        const value=share(desiredCamera.clone().add(offset(plan)));
        if(value>best) { best=value; clearancePlan=plan; }
        if(value===1)break;
      }
    }
    desiredCamera.add(offset(clearancePlan));
  }
  const effectFrame = s => trackFrame(trackId, s);
  const circuitScene = createCircuitScene(scene), frostbiteScene = createFrostbiteRaceScene(scene), courseScene = createCourseRaceScene(scene), measuredScenes = createMeasuredCourseScenes(scene);
  const effects = createEffects(scene, (s) => trackId === CIRCUIT_ID ? 0 : framedRoad(trackId, endlessActive) ? trackPoint(trackId,s).x : trackId === 'spiral' ? skyPosition(s)[0] : roadCenter(s), { camera, renderer, pickupEnvironment: carEnvironment });
  const aero = createAeroVFX(scene, player, shadow);
  const garageModel = createWorldGarageModel(canvas, renderer, camera), homeModelHost = { name: 'home', car: player, keep: aero.group, scene, fitAirflow: aero.fitAirflow }; // idle for the procedural Roadster; ?model= or the equipped car's GLB
  const sprintVisual = createSprintVfx();
  // Stable rendering-only adapter: never changes the race simulation or Vue reactive state.
  const sprintInput = { phase: 'ready', nitro: false, boost: false, speed: 0, cap: 110, dt: 0, enabled: true, quality: 'high', reducedMotion: false };
  let visual = vfxSettings(), garageHomeVisual = { ...visual, airflow: true };
  const projectedNozzle = new THREE.Vector3(), aeroOrigin = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const smoothLook = new THREE.Vector3(0, 2, -25);
  let cameraMode = 0, cameraSwing = 0;
  let initialized = false, lastRace = null, trackId, carBank = 0, seenFall = null, spanLift = new THREE.Vector3(), nextLift = new THREE.Vector3(); const courseOriginPoint = [0, 0, 0]; // Frostbite span: a respawn (up to ~500 m back) cuts the camera; the lift carries it
  const classicRoadRender = createClassicRoadRender({ road, laneLines, curbs, edgeLines, railLights, tunnelRoofs, tunnelWalls, shortcutDeck, surfaceMarks }, segments, put, SHORTCUT_TOLERANCE);
  let photoView = null, photoCapture = null, garageCamera = null, garageHomePreview = false, garagePose = null, garageLighting = 'bright';
  const syncGarageLighting = () => { lens.uniforms.gain.value = garageCamera || garagePose ? GARAGE_LIGHTING[garageLighting] : 1; };
  const raceVisuals = createRaceVisuals({ scene, renderer, sky: sky.material.uniforms });
  let sizeKey = '', warmupPending = true, garageWarmupPending = true;
  const restoreWarmup = () => { warmupPending = garageWarmupPending = true; };
  canvas.addEventListener('webglcontextrestored', restoreWarmup);
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
  function updateCar(mesh, car, distance, center, time, dt, isPlayer = false, input = {}, pose = car) {
    const graphView = lastRace?.course && isCourseRuntime(trackId) ? graphCarVisual(lastRace.course, isPlayer ? 'YOU' : car.id, courseOriginPoint) : null;
    const relative = graphView ? graphView.separation : physicalGap(trackId, distance, pose.distance);
    // Tour and sky routes end at the finish and trackPoint clamps there, so cars
    // past it would pile up at the arch like parked cars; they leave the scene instead.
    const pastFinish = graphView?.finished || (!endlessActive && (trackId === 'spiral' || TOUR_IDS.has(trackId) || trackId === FROSTBITE_ID || MEASURED_COURSE_IDS.has(trackId)) && pose.distance > lastRace.length);
    mesh.visible = isPlayer || (graphView ? relative < 900 && !pastFinish : relative > -55 && relative < 900 && !pastFinish);
    if (!mesh.visible) return; mesh.userData.roadDistance = pose.distance; mesh.userData.span = !!car.span; mesh.userData.altitude = (pose.altitude || 0) - (car.span ? FROSTBITE_SPAN.altitude - SHORTCUT_TOLERANCE : 0); // the pose the shadow sits under (a span car's on the deck)
    if (curvedClassic || trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
      if (curvedClassic) mesh.position.fromArray(classicPosition(pose.distance, pose.x, pose.altitude || 0, distance));
      else if (graphView) mesh.position.fromArray(graphView.position);
      else if (trackId === 'spiral') mesh.position.fromArray(skyPosition(pose.distance, pose.x, pose.altitude || 0, distance));
      else {
        const f=trackFrame(trackId,pose.distance,car.span),p=f.point,o=trackPoint(trackId,distance);
        mesh.position.set(p.x-o.x+f.right[0]*pose.x+f.up[0]*(pose.altitude||0),p.y-o.y+f.right[1]*pose.x+f.up[1]*(pose.altitude||0),p.z-o.z+f.right[2]*pose.x+f.up[2]*(pose.altitude||0));
      }
      const frame = graphView?.frame ?? (trackId === 'spiral' ? skyFrame(pose.distance) : trackFrame(trackId,pose.distance,car.span));
      // Compose every visual offset in local car axes, retaining the actual road pitch/bank.
      // Reading/writing Euler rotation after setting the track quaternion used to
      // overwrite its banking and snap near 90-degree spiral headings.
      const driftYaw = mesh.userData.driftYaw = smoothDriftYaw(mesh.userData.driftYaw ?? 0, car.drift, dt);
      const bank = isPlayer ? -(pose.steering || 0) * (pose.altitude > 0.8 ? 0.12 : 0.045) : 0;
      const trick = !(motionPreference.matches || visual.comfortable) && car.trick;
      const trickRoll = trick ? trick.dir * Math.PI * 2 * THREE.MathUtils.smoothstep(trick.time, 0, TRICK_ROLL_TIME) : 0;
      const pitch = car.thrusting ? -0.06 : Math.min(0.08, -(pose.verticalSpeed || 0) * 0.006);
      orientCarOnRoad(mesh, frame, bank + trickRoll, pitch, driftYaw);
    } else {
      mesh.position.set(roadCenter(pose.distance) - center + pose.x, pose.altitude || 0, -relative);
      const driftYaw = mesh.userData.driftYaw = smoothDriftYaw(mesh.userData.driftYaw ?? 0, car.drift, dt);
      mesh.rotation.y = -roadHeading(pose.distance) + driftYaw;
      const bank = isPlayer ? -(pose.steering || 0) * (pose.altitude > 0.8 ? 0.12 : 0.045) : 0;
      const trick = !(motionPreference.matches || visual.comfortable) && car.trick;
      const bankFrom = THREE.MathUtils.euclideanModulo(mesh.rotation.z + Math.PI, Math.PI * 2) - Math.PI;
      mesh.rotation.z = trick ? bank + trick.dir * Math.PI * 2 * THREE.MathUtils.smoothstep(trick.time, 0, TRICK_ROLL_TIME) : THREE.MathUtils.damp(bankFrom, bank, 8, dt);
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, car.thrusting ? -0.06 : Math.min(0.08, -(pose.verticalSpeed || 0) * 0.006), 7, dt);
    }
    mesh.userData.jets.visible = !!car.thrusting;
    mesh.userData.brakeLight.color.copy(mesh.userData.lightColor).multiplyScalar(car.braking ? 2.3 : 1);
    const { wing } = mesh.userData;
    const downforce = isPlayer && visual.enabled && visual.airflow && visual.aeroMode === 'downforce';
    const boosting = car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
    if (wing.userData.lift) stepWing(wing, boosting || car.braking, downforce || pose.altitude > 0.8, dt);
    else wing.rotation.x = THREE.MathUtils.damp(wing.rotation.x, car.braking || downforce ? -0.35 : boosting ? 0.08 : 0, 8, dt);
    mesh.userData.wheels.forEach(wheel => {
      const target = (pose.altitude > 0.8 ? Math.PI / 2.6 : 0) * Math.sign(wheel.position.x);
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, target, 7, dt);
      wheel.rotation.y = wheel.position.z < 0 ? -(pose.steering || 0) * 0.3 : 0;
      if (wheel.children[2]) wheel.children[2].rotation.x -= pose.speed * dt / 0.44;
    });
  }
  return {
    resize, setUpcomingTrack(id) { return upcomingStage.setTrack(id); }, setGarageCamera(snapshot) { if (!!garageCamera !== !!snapshot) initialized = false; garageCamera = snapshot; if (snapshot && !garageStage) { garageStage = createGarageStage(environment.texture, carEnvironment); garageWarmupPending = true; if (garagePaint) garageStage.setPaint(garagePaint); garageStage.configureVFX(visual); garageStage.setSkins(garagePreviewSkins); } if (!snapshot) renderPass.scene = scene; syncGarageLighting(); }, setCosmeticSkins(ids) { aero.setSkins(ids); upcomingStage.setAirflowSkin(ids?.airflow); }, setGaragePose(pose) { garagePose = pose; syncGarageLighting(); }, setGarageLighting(level) { garageLighting = level; syncGarageLighting(); },
    setGarageSkinPreview(ids, home = false) { garagePreviewSkins = ids; garageHomePreview = home && !garageCamera; garageStage?.setSkins(ids); if (garageHomePreview) { aero.setSkins(ids); upcomingStage.setAirflowSkin(ids?.airflow); } }, inspectCosmeticPreview() { return garageCamera && garageStage ? garageStage.inspectCosmetics() : aero.inspectCosmetics(); },
        inspectGarageStudio() { if (garageStage && garageCamera) return garageStage.inspectBounds(camera); if (!garageHomePreview) return null; const { minX, maxX, minY, maxY } = projectedCarBounds(camera.position, smoothLook); return { minX, maxX, minY, maxY, inFrame: minX > -.94 && maxX < .94 && minY > -.94 && maxY < .94 }; }, // Home: QA reads how much of the showroom the car fills
    previewAppearance(paint) {
      garagePaint = paint; garageStage?.setPaint(paint); upcomingStage.setPaint(paint);
      const paintMaterial = player.userData.body.material; paintMaterial.color.set(paint.paint); paintMaterial.metalness = paint.metalness; paintMaterial.roughness = paint.roughness;
      player.userData.lightColor.fromArray(paint.light);
    },
    setRenderScale(scale) {
      adaptiveScale = scale; this.configureVFX(visual);
    },
    configureVFX(options) {
      visual=vfxSettings(options); garageHomeVisual = { ...visual, airflow: true }; garageStage?.configureVFX(visual);
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
      raceVisuals.photo(options ? options.sky : null);
      if (!options) {
        photoView = null;
        return;
      }
      const angle = Number.isFinite(options.angle) ? options.angle : 0;
      photoView = { angle: angle * Math.PI / 180, fov: photoFov(options.fov), sky: options.sky };
    },
    capturePhoto() {
      if (photoCapture) return Promise.reject(new Error('Photo capture already in progress'));
      return new Promise((resolve,reject) => { photoCapture = { resolve, reject }; });
    },
    render(race, dt, idleTime, input = {}, presentation = {}, ghost = null, motion = null) {
      garageModel?.frame(visual.quality === 'low' ? 'low' : 'high', race.phase, garageHomePreview || !!garageCamera, garageCamera ? garageStage?.modelHost ?? null : null, race.phase === 'ready' ? upcomingStage.modelHost : null, homeModelHost);
      if (garageCamera && garageStage && race.phase === 'ready') { renderPass.scene = garageStage.scene; garageStage.update(camera, garageCamera, idleTime, motionPreference.matches || visual.comfortable); lens.uniforms.boost.value = lens.uniforms.impact.value = lens.uniforms.pressure.value = 0; bloom.enabled = visual.quality !== 'low'; bloom.strength = 0.01; if (garageWarmupPending) { garageWarmupPending = false; warmupShaders(renderer, garageStage.scene, camera, composer.renderTarget1); } renderer.info.reset(); composer.render(dt); return; } // r186 bloom is stronger in the Studio's bright environment.
      // The original home showcase owns only scenery and camera; no race state or entry.
      if (race.phase === 'ready' && upcomingStage.scene) {
        renderPass.scene = upcomingStage.scene;
        upcomingStage.update(camera, idleTime, visual, motionPreference.matches || visual.comfortable);
        lens.uniforms.boost.value = lens.uniforms.impact.value = lens.uniforms.pressure.value = 0;
        bloom.enabled = visual.quality !== 'low'; bloom.strength = 0.14;
        renderer.info.reset(); composer.render(dt); return;
      }
      renderPass.scene = scene;
      endlessActive=!!race.endless;
      const authoredClassic = race.endless?.practice ? undefined : classicRoadRoute(race.trackId);
      curvedClassic = !!authoredClassic;
      classicRoute = authoredClassic ?? legacyClassicRoad;
      const preview = race.phase === 'ready';
      const car = race.player;
      const alpha = race.phase === 'racing' ? motion?.alpha ?? 1 : 1, visualCar = poseFor(player, car, motion?.previous?.player, alpha);
      const reducedMotion = motionPreference.matches || visual.comfortable;
      const motionDt = preview || race.phase === 'racing' || race.phase === 'countdown' ? dt : 0;
      if (lastRace !== race) { effects.reset(); aero.reset(); sprintVisual.reset(); rearLight.reset(); lastRace = race; initialized = false; carBank = 0; for (const mesh of [player, ...rivals, ...traffic]) mesh.userData.driftYaw = 0; }
      if (trackId !== race.trackId) {
        sprintVisual.reset();
        raceVisuals.reset();
        trackId = race.trackId;
        const palette = TRACK_PALETTES[trackId];
        hazardMeshes.setTrack(trackId);
        scene.background.set(palette.fog); scene.fog.color.set(palette.fog);
        sky.material.uniforms.top.value.set(palette.top); sky.material.uniforms.horizon.value.set(palette.horizon);
        sky.material.uniforms.warmth.value = palette.warmth; sky.material.uniforms.aurora.value = trackId === 'aurora' || trackId === FROSTBITE_ID ? 1 : 0;
        sky.material.uniforms.cloudOpacity.value = trackId==='cosmic'?0:trackId==='tokyo'?.14:trackId==='alpine'?.45:trackId==='coastal'?.32:trackId==='taipei'?.36:1;
        sky.material.uniforms.cloudTint.value.set(trackId==='alpine'?'#647575':trackId==='coastal'?'#82989a':trackId==='taipei'?'#77898b':trackId==='tokyo'?'#394354':'#4d3d60');
        sunlight.color.set(palette.sun);
        sunlight.intensity = TOUR_IDS.has(trackId) ? .75 : MEASURED_COURSE_SUN[trackId] ?? (trackId === 'coast' ? COAST_LIGHTING.sun : trackId === 'neon' ? .8 : trackId === 'aurora' || trackId === FROSTBITE_ID ? 1.2 : 2.3);
        sunlight.position.set(TOUR_IDS.has(trackId)?-400:-170,TOUR_IDS.has(trackId)?230:100,TOUR_IDS.has(trackId)?260:-190);
        renderer.toneMappingExposure=TOUR_IDS.has(trackId)?.86:trackId==='coast'?COAST_LIGHTING.exposure:1.12;
        ambient.intensity = TOUR_IDS.has(trackId) ? (trackId==='cosmic'?.62:.98) : trackId==='coast'?COAST_LIGHTING.ambient:trackId==='neon'?1.1:1.7;
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
        warmupPending = true; // track-specific props hidden until an event get their pipelines before racing
      }
      const visualPreset = racePreset(race);
      coastLook.update(trackId, visualPreset, visual.quality);
      raceVisuals.apply(visualPreset); const blizzard = preview ? 0 : blizzardLevel(trackId, visualCar.distance, !!race.config.themes); raceVisuals.blizzard(blizzard);
      const distance = preview ? previewDistance(trackId) : visualCar.distance;
      if(trackId==='coast'){coastScenery.show();coastScenery.update(classicRoute,distance,visual.quality,race.endless ? race.seed : undefined);} else coastScenery.hide();
      if (coastAssets?.update(trackId, visual.quality, race.phase === 'racing', visualPreset, visual.ultra)) warmupPending = true; // new materials compile before GO
      if(trackId==='neon'||trackId==='canyon'||trackId==='aurora') classicScenery.update(trackId,classicRoute,distance,visual.quality); else classicScenery.hide();
      const graphCentre = race.course ? graphOrigin(race.course) : null;
      if (graphCentre) for (let axis = 0; axis < 3; axis++) courseOriginPoint[axis] = graphCentre[axis];
      const origin = graphCentre ? aeroOrigin.set(...graphCentre) : curvedClassic || trackId === 'spiral' || framedRoad(trackId, endlessActive) ? trackPoint(trackId,distance) : null, center = origin ? origin.x : roadCenter(distance);
      // Smooth mountain bore lighting over 38 m for road readability.
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
      const touch = touchPreference.matches;
      const raining = isRaining(visualPreset, trackId);
      weather.visible = !reducedMotion && visual.enabled && (raining || visualPreset === 'snow' || blizzard > 0 || (visualPreset === 'track' && (trackId === 'aurora' || trackId === FROSTBITE_ID)));
      weather.material.size = raining ? .12 : .24;
      weatherGeometry.setDrawRange(0, weatherDrops(visual.quality, touch));
      if (weather.visible) {
        for (let i = 0; i < 180; i++) weatherPositions[i * 3 + 1] = (i * 17 + time * (raining ? -18 : -3)) % 32;
        weatherGeometry.attributes.position.needsUpdate = true;
        weather.position.set(visualCar.x, visualCar.altitude + 25, 15);
      }
      if (trackId === CIRCUIT_ID) circuitScene.update(distance); else circuitScene.hide(); if (trackId === FROSTBITE_ID && !endlessActive) frostbiteScene.update(distance); else frostbiteScene.hide(); if (graphCentre) courseScene.update(race, visual.quality, time, reducedMotion); else courseScene.hide(); measuredScenes.update(endlessActive ? '' : trackId, distance, time, reducedMotion);
      if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
        if (trackId === CIRCUIT_ID || trackId === FROSTBITE_ID || MEASURED_COURSE_IDS.has(trackId) || isCourseRuntime(trackId) || graphCentre) { skyScene.hide(); worldTourScene.hide(); }
        else if (trackId === 'spiral') { skyScene.update(distance, visual.quality, !!race.endless); worldTourScene.hide(); }
        else { skyScene.hide(); worldTourScene.update(trackId,distance,visual.quality,race.sections,time,reducedMotion,!!race.endless); }
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
      if (road.visible) classicRoadRender.update(trackId, classicRoute, distance, race.sections, touch || visual.quality === 'low', curvedClassic);
      const pylons = race.sections.filter(section => section.type === 'shortcut').flatMap(shortcutPylons);
      for (let i = 0; i < shortcutPylonMeshes.count; i++) {
        const pylon = pylons[i], relative = pylon?.distance - distance;
        const shown = relative > -20 && relative < 900; // NaN without a pylon
        put(shortcutPylonMeshes, i, ...(shown ? (trackId === 'spiral' ? skyPosition : classicPosition)(pylon.distance, pylon.x, pylon.altitude, distance) : [0, -1000, 0]), .4, SHORTCUT_TOLERANCE * 2, .4);
      }
      shortcutPylonMeshes.instanceMatrix.needsUpdate = true;
      sectionSigns.forEach(({ group, panel }, i) => {
        const section = race.sections[i];
        const relative = section ? section.from - 65 - distance : 0;
        group.visible = !!section && relative > -40 && relative < 850;
        if (!group.visible) return;
        if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
          const signDistance = section.from - 65;
          group.position.fromArray(trackLocalPosition(trackId, signDistance, -17, 0, distance));
          const frame = trackFrame(trackId, signDistance);
          group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...frame.right), new THREE.Vector3(...frame.up),
            new THREE.Vector3(...frame.forward).negate()));
        } else {
          group.position.fromArray(classicPosition(section.from - 65, -17, 0, distance));
          group.rotation.set(0, curvedClassic ? -roadHeading(section.from - 65) : 0, 0);
        }
        // Every section sign needs a valid material, including boost tunnels.
        panel.material = signs[sectionSignKey(section.type)];
      });
      if (cliffs.visible) {
        const count = touch || visual.quality === 'low' ? 20 : 40;
        cliffs.count = count;
        for (let i = 0; i < count; i++) {
          const d = Math.floor(distance / 75) * 75 + Math.floor(i / 2) * 75;
          put(cliffs, i, ...classicPosition(d, (i % 2 ? 1 : -1) * (38 + i % 4 * 10), 15, distance), 28, 50 + i % 5 * 10, 40, i);
        }
        cliffs.instanceMatrix.needsUpdate = true;
      }
      towers.forEach((tower, i) => {
        const d = Math.floor(distance / 1100) * 1100 + (i + 1) * 1100 - 500;
        tower.position.fromArray(classicPosition(d, 0, 0, distance));
        tower.rotation.y = -roadHeading(d);
      });
      for (let i = 0; i < 40; i++) {
        const d = Math.floor(distance / 36) * 36 + (i - 2) * 36;
        put(pillars, i, ...classicPosition(d, 0, -3.4, distance), 16, 6.5, 2, curvedClassic ? -roadHeading(d) : 0);
      }
      pillars.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 24; i++) {
        const d = Math.floor(distance / 60) * 60 + (i - 1) * 60;
        const side = i % 2 ? 1 : -1;
        const yaw = curvedClassic ? -roadHeading(d) : 0;
        put(poles, i * 2, ...classicPosition(d, side * 12.7, 6.5, distance), .14, 13, .14, yaw);
        put(poles, i * 2 + 1, ...classicPosition(d, side * 10.9, 12.9, distance), 3.7, .14, .18, yaw);
        put(lamps, i, ...classicPosition(d, side * 9.4, 12.8, distance), .85, .06, .4, yaw);
      }
      poles.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true;
      if (city.visible) updateSkyline(city, buildings, windows, buildingData, put, distance, center, race.endless ? race.seed : undefined, authoredClassic);

      const at = (d, x, y) => trackId === 'spiral' ? skyPosition(d, x, y, distance) // one road frame for every authored object
        : framedRoad(trackId, endlessActive) ? trackLocalPosition(trackId, d, x, y, distance) : classicPosition(d, x, y, distance);
      hazardMeshes.update(race, trackId, distance, center, preview);

      let visibleGateParts = 0;
      if (!preview && race.checkpoint) for (const gate of race.checkpoint.gates) {
        if (gate.passed || gate.missed || gate.distance < distance - 16 || gate.distance > distance + 550) continue;
        if (visibleGateParts + 3 > checkpointGates.instanceMatrix.count) break;
        const yaw = curvedClassic ? -roadHeading(gate.distance) : 0;
        put(checkpointGates, visibleGateParts++, ...at(gate.distance, gate.x - 3.2, gate.altitude + 2.4), .32, 4.8, .44, yaw);
        put(checkpointGates, visibleGateParts++, ...at(gate.distance, gate.x + 3.2, gate.altitude + 2.4), .32, 4.8, .44, yaw);
        put(checkpointGates, visibleGateParts++, ...at(gate.distance, gate.x, gate.altitude + 4.8), 6.7, .34, .44, yaw);
      }
      checkpointGates.count = visibleGateParts;
      if (visibleGateParts) checkpointGates.instanceMatrix.needsUpdate = true;
      drawRamps(launchRamps, preview ? null : race.ramps, distance, at, curvedClassic ? roadHeading : undefined);

      if (preview) {
        const groundedShowcase = visual.enabled && visual.airflow;
        const curated=!!HERO_PREVIEWS[trackId];
        updateCar(player, { ...previewPlayer(trackId,car,idleTime,reducedMotion,groundedShowcase,garagePose), distance },
          distance,center,time,dt,true);
        rivals.forEach((mesh,i) => {
          mesh.visible = i < 3; if (!mesh.visible) return; // Preserve Wave 1 showcase.
          const standIn = { x: [-7.5, -2.5, 7.5][i], distance: 0, speed: 0, altitude: 0, steering: 0 };
          updateCar(mesh, previewRival(trackId,i,race.rivals[i] ?? standIn,idleTime,reducedMotion),distance,center,time,dt);
        });
        traffic.forEach((mesh,i)=>{
          mesh.visible=i<race.traffic.length;
          if(mesh.visible)updateCar(mesh,{...race.traffic[i],
            distance:distance+(curated?80:65)+i*32},distance,center,time,dt);
        });
      } else {
        updateCar(player, car, distance, center, time, motionDt, true, input, visualCar);
        if (race.phase === 'finished') {
          const finishTravel = presentation.finishDistance || 0;
          if (curvedClassic) player.position.fromArray(classicPosition(visualCar.distance + finishTravel, visualCar.x, visualCar.altitude, distance));
          else player.position.z -= finishTravel;
        }
        rivals.forEach((mesh, i) => {
          mesh.visible = i < race.rivals.length;
          if (mesh.visible) updateCar(mesh, race.rivals[i], distance, center, time, motionDt, false, {}, poseFor(mesh, race.rivals[i], motion?.previous?.rivals?.[i], alpha));
        });
        traffic.forEach((mesh, i) => { mesh.visible = i < race.traffic.length; if (mesh.visible) updateCar(mesh, race.traffic[i], distance, center, time, motionDt, false, {}, poseFor(mesh, race.traffic[i], motion?.previous?.traffic?.[i], alpha)); });
      }
      graceFade(preview || race.phase === 'finished' ? 1 : graceOpacity(car.cooldown, race.elapsed, reducedMotion));
      ghostCar.visible = !preview && !!ghost;
      rearLight.update(race, motionDt, reducedMotion || !visual.enabled);
      if (ghostCar.visible) { // samples carry no span flag: a Frostbite ghost inside the Rift corridor box is drawn on the span
        const ghostSpan = trackId === FROSTBITE_ID && frostbiteObjectSpan(ghost.distance, ghost.x, ghost.altitude);
        if (curvedClassic) {
          ghostCar.position.fromArray(classicPosition(ghost.distance, ghost.x, ghost.altitude, distance));
          ghostCar.rotation.set(0, -roadHeading(ghost.distance), 0);
        } else if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
          if(trackId==='spiral')ghostCar.position.fromArray(skyPosition(ghost.distance,ghost.x,ghost.altitude,distance));
          else {const f=trackFrame(trackId,ghost.distance,ghostSpan),p=f.point,o=trackPoint(trackId,distance);
            ghostCar.position.set(p.x-o.x+f.right[0]*ghost.x,p.y-o.y+f.up[1]*ghost.altitude,p.z-o.z+f.right[2]*ghost.x);}
          const frame = trackId==='spiral'?skyFrame(ghost.distance):trackFrame(trackId,ghost.distance,ghostSpan);
          ghostCar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.right),new THREE.Vector3(...frame.up),new THREE.Vector3(...frame.forward).negate()));
        } else {
          ghostCar.position.set(roadCenter(ghost.distance) - center + ghost.x, ghost.altitude, distance - ghost.distance);
          ghostCar.rotation.y = -roadHeading(ghost.distance);
        }
      }
      const { roadDistance, altitude: lift, span } = player.userData; // Classic: equals player.position.y; banked/sloped roads: height above the road
      if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) placeGroundShadow(shadow, graphCentre ? race.course.cars.get('YOU').pose : trackId === 'spiral' ? skyFrame(roadDistance) : trackFrame(trackId, roadDistance, span), player.position, lift);
      else { shadow.position.set(player.position.x, 0.03, player.position.z); shadow.rotation.set(-Math.PI / 2, 0, 0); }
      shadow.scale.setScalar(1 + lift * 0.04); shadow.material.opacity = shadowOpacity(lift);
      const graphFinish = graphCentre ? graphFinishVisual(race.course, courseOriginPoint) : null;
      if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
        if (graphFinish) finish.position.fromArray(graphFinish.position);
        else if(trackId==='spiral')finish.position.fromArray(skyPosition(race.length,0,0,distance));
        else {const p=trackPoint(trackId,race.length),o=trackPoint(trackId,distance);finish.position.set(p.x-o.x,p.y-o.y,p.z-o.z);}
        const frame=graphFinish?.frame ?? (trackId==='spiral'?skyFrame(race.length):trackFrame(trackId,race.length));
        finish.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...frame.right), new THREE.Vector3(...frame.up), new THREE.Vector3(...frame.forward).negate()));
      } else { finish.position.fromArray(classicPosition(race.length, 0, 0, distance)); finish.rotation.set(0, curvedClassic ? -roadHeading(race.length) : 0, 0); }
      finish.visible = graphFinish ? graphFinish.separation < 1400 : trackId === CIRCUIT_ID || (!race.endless && race.length - distance < 1400);
      if (effects.update(race, motionDt, center, preview, reducedMotion, flightVehicles,
        curvedClassic ? { ...visual, classicRoute, roadDistance: distance, worldPoint: classicPosition, worldFrame: effectFrame } :
        framedRoad(trackId, endlessActive) || trackId === 'spiral' ? { ...visual, worldPoint: (s,x,y,origin,item) => race.course && item ? courseItemPoint(race.course,item,x,y,courseOriginPoint) : trackLocalPosition(trackId,s,x,y,origin), worldFrame: race.course ? (s,item) => courseItemFrame(race.course,item) : trackId === CIRCUIT_ID || trackId === 'spiral' ? effectFrame : undefined } : visual)) warmupPending = true; // loaded pickup models compile before GO
      Object.assign(sprintInput, {
        phase: race.phase, nitro: car.nitroTime > 0, boost: !!(car.boosting || car.miniBoost > 0),
        speed: visualCar.speed, dt: motionDt, enabled: visual.enabled, quality: visual.quality, reducedMotion, ultra: visual.ultra,
      });
      const sprintFrame = sprintVisual.update(sprintInput);
      const feedback = aero.update(race, race.phase === 'paused' ? 0 : dt, origin ?? aeroOrigin.set(center, 0, -distance), garageHomePreview ? garageHomeVisual : visual, reducedMotion, sprintFrame, garageHomePreview);
      const boostStrength = race.phase === 'racing' ? sprintFrame.power : 0;
      const portrait = camera.aspect < 0.8, view = raceCameraView(cameraMode, portrait);
      if (photoView && race.phase === 'paused') {
        desiredCamera.set(player.position.x + Math.sin(photoView.angle) * 14,
          player.position.y + 5, player.position.z + Math.cos(photoView.angle) * 14);
        lookTarget.copy(player.position); lookTarget.y += 1;
      } else if (race.phase === 'finished' && !reducedMotion) {
        desiredCamera.set(player.position.x + (portrait ? 10 : 8), player.position.y + 3.2, player.position.z + 6);
        lookTarget.copy(player.position); lookTarget.y += 0.8;
      } else if (preview && visual.view !== 'drive') {
        // The selected view wins over curated showcase framing on every map, but only on the ready screen: it never moves the race camera.
        const pose = showcaseCameraPose(trackId,visual.view,time,portrait||garageHomePreview||visual.enabled&&visual.airflow); // centred unless the landscape home panel shows
        const frame = curvedClassic || framedRoad(trackId, endlessActive) ? trackFrame(trackId,distance)
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
          lookTarget.copy(player.position).add(new THREE.Vector3(pose.lookSide,pose.lookHeight-1.6,-pose.lookAhead));
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
      } else if (preview) {
        desiredCamera.fromArray(classicPosition(distance - (portrait ? 13.8 : 11.8), portrait ? 7.8 : 8.3, portrait ? 5.9 : 5.1, distance));
        lookTarget.fromArray(classicPosition(distance + 3.5, portrait ? 1 : -1.4, 1.4, distance));
      } else {
        const first = cameraMode === 1, back = rigBack(view, visualCar.speed), height = rigHeight(view, visualCar.altitude);
        cameraSwing = reducedMotion ? 0 : stepCameraSwing(cameraSwing, player.userData.driftYaw ?? 0, view, dt);
        if (curvedClassic) {
          const heading = roadHeading(distance);
          desiredCamera.fromArray(classicPosition(distance, visualCar.x * view.follow, visualCar.altitude + height, distance));
          desiredCamera.x += Math.sin(cameraSwing - heading) * back;
          desiredCamera.z += Math.cos(cameraSwing - heading) * back;
          const ahead = lookAheadDistance(trackId, distance, view.ahead, endlessActive);
          lookTarget.fromArray(classicPosition(distance + ahead, visualCar.x * view.follow, visualCar.altitude + view.look, distance));
        } else if (trackId === 'spiral' || framedRoad(trackId, endlessActive)) {
          const frame = race.course ? race.course.cars.get('YOU').pose : trackId === 'spiral' ? skyFrame(distance) : trackFrame(trackId,distance,car.span);
          desiredCamera.fromArray(frame.forward).multiplyScalar(-back).applyAxisAngle(camera.up, cameraSwing).add(player.position).y += height;
          const f=race.course?graphLookAhead(race.course,visualCar.x,view.ahead):trackFrame(trackId,distance+lookAheadDistance(trackId,distance,view.ahead,endlessActive),car.span),p=f.point,o=race.course?courseOriginPoint:trackPoint(trackId,distance);
          lookTarget.set((race.course?p[0]-o[0]:p.x-o.x)+f.right[0]*visualCar.x,(race.course?p[1]-o[1]:p.y-o.y)+visualCar.altitude+view.look,(race.course?p[2]-o[2]:p.z-o.z)+f.right[2]*visualCar.x);
        } else if (first) {
          desiredCamera.set(visualCar.x * view.follow, visualCar.altitude + height, back);
          lookTarget.set(visualCar.x + roadCenter(distance + view.ahead) - center, visualCar.altitude + view.look, -view.ahead);
        } else {
          desiredCamera.set(visualCar.x * view.follow + Math.sin(cameraSwing) * back, visualCar.altitude * 0.85 + height, Math.cos(cameraSwing) * back);
          lookTarget.set(visualCar.x * 0.7 + (roadCenter(distance + 30) - center) * 0.35, visualCar.altitude * 0.85 + view.look, -25);
        }
      }
      desiredCamera.z -= reducedMotion ? 0 : (presentation.goPush || 0) * 1.4;
      const impactAge = car.impact ? race.elapsed - car.impact.time : 10; const impact = !preview && impactAge < 0.65 ? (1 - impactAge / 0.65) ** 2 * car.impact.intensity : 0;
      const landingAge = car.landing ? race.elapsed - car.landing.time : 10; const landing = landingAge < 0.55 ? Math.exp(-landingAge * 8) * Math.min(1, car.landing.speed / 14) : 0;
      if (!reducedMotion && race.phase === 'racing') {
        desiredCamera.x += Math.sin(time * 61) * impact * 0.27;
        desiredCamera.y += Math.sin(time * 47) * impact * 0.15 - landing * 0.3;
        desiredCamera.z += impact * 0.65;
        desiredCamera.x += Math.sin(time * 65) * feedback.ignition * visual.shake * 0.12;
        desiredCamera.z += boostStrength * (visual.enabled ? 0.22 : 0);
      }
      if(preview && !garageCamera) {
        // Preserve scenery clearance, then fit the complete car within the
        // actual viewport, regardless of track and selected camera angle.
        if(TOUR_IDS.has(trackId))avoidShowcaseObstruction(distance);
        frameShowcaseCar(distance);
      }
      const smoothing = 1 - Math.exp(-dt * 7); if (trackId === FROSTBITE_ID && !endlessActive) { nextLift.fromArray(frostbiteSpanLift(distance, !!car.span)); camera.position.add(nextLift).sub(spanLift); smoothLook.add(nextLift).sub(spanLift); spanLift.copy(nextLift); } // a span car moves fast in road-local space: no lerp lag
      if (!initialized || (car.fall !== seenFall && (trackId === FROSTBITE_ID || !!race.course))) { camera.position.copy(desiredCamera); smoothLook.copy(lookTarget); initialized = true; } seenFall = car.fall;
      camera.position.lerp(desiredCamera, smoothing); smoothLook.lerp(lookTarget, smoothing);
      // A paused photo needs immediate framing; dt-based camera smoothing is zero on pause.
      if (photoView && race.phase === 'paused') {
        camera.position.copy(desiredCamera);
        smoothLook.copy(lookTarget);
      }
      camera.lookAt(smoothLook);
      carBank = THREE.MathUtils.damp(carBank, !reducedMotion && cameraMode === 1 && visualCar.altitude > 1 ? -(input.steer || 0) * 0.025 : 0, 5, dt); // flight banks first person only: the chase horizon stays level
      camera.rotation.z += carBank;
      // Applied after lookAt, so the shake never feeds the smoothed camera position.
      const shake = reducedMotion || race.phase !== 'racing' ? 0 : rigShake(view, visualCar.speed, boostStrength, visual.enabled ? visual.shake : 0);
      if (shake) { camera.rotateX(Math.sin(time * 53) * shake); camera.rotateY(Math.sin(time * 37) * shake * 0.6); }
      const targetFov = preview ? 50 : reducedMotion ? 64 : rigFov(view, visualCar.speed) + sprintFovOffset(sprintFrame, visual) - impact * 4;
      camera.fov = photoView && race.phase === 'paused' ? photoView.fov : camera.fov + (targetFov - camera.fov) * smoothing;
      camera.updateProjectionMatrix();
      lens.uniforms.boost.value = reducedMotion || !visual.enabled ? 0 : sprintFrame.blur * visual.motionBlur;
      lens.uniforms.impact.value = reducedMotion ? 0 : impact;
      projectedNozzle.copy(feedback.nozzle).project(camera);
      lens.uniforms.nozzle.value.set(projectedNozzle.x * 0.5 + 0.5, projectedNozzle.y * 0.5 + 0.5);
      lens.uniforms.pressure.value = reducedMotion || visual.quality === 'low' || projectedNozzle.z > 1 ? 0 : feedback.strength * 0.6;
      lens.uniforms.time.value = time;
      bloom.strength = TOUR_IDS.has(trackId) ? .085 : (trackId==='coast'?coastLook.bloomStrength(COAST_LIGHTING.bloom):.42) + (reducedMotion || !visual.enabled ? 0 : boostStrength * visual.bloom * .25 + feedback.ignition * visual.bloom * .2);
      bloom.enabled = visual.quality !== 'low';
      if (warmupPending) { warmupPending = false; warmupShaders(renderer, scene, camera, composer.renderTarget1); }
      renderer.info.reset(); // Exclude warmup draws and previous frames.
      composer.render(dt);
      if (photoCapture) {
        const request = photoCapture;
        photoCapture = null;
        void capturePhoto(renderer).then(request.resolve, request.reject);
      }
    },
    inspectRenderLoad() { return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries}; },
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
      coastLook.dispose(); garageModel?.dispose(); upcomingStage.dispose(); garageStage?.dispose(); stopLocaleSigns(); // the GLB leaves the cars before their materials are disposed
      canvas.removeEventListener('webglcontextrestored', restoreWarmup);
      circuitScene.dispose(); frostbiteScene.dispose(); courseScene.dispose(); measuredScenes.dispose(); skyScene.dispose(); worldTourScene.dispose(); coastAssets?.dispose(); coastScenery.dispose(); classicScenery.dispose();
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
