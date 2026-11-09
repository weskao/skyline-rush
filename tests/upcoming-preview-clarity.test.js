import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';
import { UPCOMING_ENVIRONMENTS } from '../src/upcoming-scenes/index.ts';
import { PAINTS } from '../src/appearance.ts';

// Home-preview readability: the shared Pearl Roadster and three pale rivals must stand out from the map's road.
// Monsoon/Volcanic/Stormline/Frostbite give Pearl >= 6x road luminance; Dune (1.7x) and Skyfall (1.5x) washed out.
const MIN_PEARL_TO_ROAD = 3;
const MAX_LIT_ROAD = 0.4; // road albedo luminance x hemisphere/sun irradiance / pi, before exposure: stays off the ACES shoulder
const ROADS = { 'dune-tempest': 'Ground sand road', 'skyfall-archipelago': 'Skyfall ground road' };
const luminance = c => .2126 * c.r + .7152 * c.g + .0722 * c.b;

function stage(id, airflow = true, aspect = 16 / 10) {
  const showcase = createUpcomingShowcase(UPCOMING_ENVIRONMENTS, new THREE.Texture(), new THREE.Texture());
  assert.equal(showcase.setTrack(id), true);
  const camera = new THREE.PerspectiveCamera(50, aspect, .1, 2000);
  showcase.update(camera, 3, { quality: 'high', view: 'drive', enabled: true, airflow }, false);
  const scene = showcase.scene;
  scene.updateMatrixWorld(true);
  const cars = scene.children.filter(child => child.userData?.jets);
  const environment = [];
  const shared = [...cars, showcase.modelHost.keep]; // the map owns everything except the shared cars and their VFX
  for (const child of scene.children) if (!shared.includes(child))
    child.traverse(o => { if (o.isMesh && o.visible && o.material.side !== THREE.BackSide) environment.push(o); });
  return { showcase, scene, camera, cars, environment };
}

/** Lambert irradiance factor (/pi) of an up-facing surface from every hemisphere and directional light in the stage. */
function upIrradiance(scene) {
  let total = 0;
  scene.traverse(o => {
    if (o.isHemisphereLight) total += o.intensity * luminance(o.color);
    if (o.isDirectionalLight) {
      const toLight = o.getWorldPosition(new THREE.Vector3()).sub(o.target.getWorldPosition(new THREE.Vector3())).normalize();
      total += o.intensity * luminance(o.color) * Math.max(0, toLight.y);
    }
  });
  return total / Math.PI;
}

function roadUnder(environment, x, z) {
  const hits = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0)).intersectObjects(environment, false);
  return hits.find(hit => !hit.object.material.transparent && hit.object.material.isMeshStandardMaterial);
}

test('every Coming Soon preview road leaves the Pearl showcase car and rivals readable', () => {
  const pearl = luminance(new THREE.Color(PAINTS.pearl.paint));
  for (const id of Object.keys(UPCOMING_ENVIRONMENTS)) {
    const { showcase, scene, environment } = stage(id);
    const road = roadUnder(environment, 0, -1);
    assert.ok(road, id + ': a real road lies under the showcase car');
    const albedo = luminance(road.object.material.color);
    assert.ok(pearl / albedo >= MIN_PEARL_TO_ROAD,
      `${id}: Pearl/road luminance ${(pearl / albedo).toFixed(2)} < ${MIN_PEARL_TO_ROAD} (${road.object.name})`);
    const lit = albedo * upIrradiance(scene);
    assert.ok(lit <= MAX_LIT_ROAD, `${id}: lit road luminance ${lit.toFixed(3)} > ${MAX_LIT_ROAD}`);
    showcase.dispose();
  }
});

test('Dune Tempest and Skyfall rest grounded showcase cars on their road with clear camera sight lines', () => {
  for (const [id, roadName] of Object.entries(ROADS)) {
    for (const airflow of [true, false]) for (const aspect of [16 / 10, 390 / 844]) {
      const { showcase, camera, cars, environment } = stage(id, airflow, aspect);
      cars.forEach((car, i) => {
        const label = `${id} car ${i} airflow ${airflow} aspect ${aspect.toFixed(2)}`;
        if (car.position.y < 1) {
          const hit = roadUnder(environment, car.position.x, car.position.z);
          assert.equal(hit?.object.name, roadName, label + ': grounded car must sit on the road, not inside terrain');
          assert.ok(Math.abs(hit.point.y - car.position.y) < .5, label + ': wheel contact with the road');
        }
        const target = car.position.clone().add(new THREE.Vector3(0, .6, 0));
        const toCar = target.clone().sub(camera.position);
        const ray = new THREE.Raycaster(camera.position.clone(), toCar.clone().normalize(), 0, toCar.length() - 2.5);
        const blockers = ray.intersectObjects(environment, false).map(hit => hit.object.name || hit.object.type);
        assert.deepEqual(blockers, [], label + ': scenery between camera and car');
      });
      showcase.dispose();
    }
  }
});
