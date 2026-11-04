import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyfallWorld } from '../src/courses/skyfall-world.ts';
import { SKYFALL_COURSE, getSkyfallEdgeLength, sampleSkyfallRoad } from '../src/courses/skyfall-archipelago.ts';

test('Skyfall streams geometry-backed roads, islands, cloud ocean and sky rings',()=>{
  const scene=new THREE.Scene();
  const env=createSkyfallWorld(scene,'medium');
  assert.ok(scene.children.includes(env.group));
  for(const e of SKYFALL_COURSE.edges){
    env.setFocus([{edgeId:e.id,localS:0}]);
    const road=env.group.getObjectByName(`Skyfall ${e.id} banked playable road`);
    assert.ok(road?.isMesh && road.geometry.getAttribute('position').count>20,e.id);
  }
  assert.ok(env.group.getObjectByName('Skyfall playable hanging island meshes')?.isInstancedMesh);
  assert.ok(env.group.getObjectByName('Skyfall playable cloud ocean')?.isInstancedMesh);
  assert.ok(env.group.children.filter(o=>o.name==='Skyfall giant stone sky ring').length>=2);
  assert.ok(env.group.children.filter(o=>o.name==='Skyfall hanging waterfall').length>=2);
  env.dispose();
  assert.ok(!scene.children.includes(env.group));
});

test('decorative cloud movement is deterministic, reduced motion freezes and dispose is idempotent',()=>{
  const scene=new THREE.Scene();
  const env=createSkyfallWorld(scene,'low');
  const cloud=env.group.getObjectByName('Skyfall playable cloud ocean');
  env.update(0,false);const a=cloud.position.x;
  env.update(25,false);assert.notEqual(cloud.position.x,a);
  env.update(25,false);const b=cloud.position.x;
  env.update(25,false);assert.equal(cloud.position.x,b);
  env.update(100,true);assert.equal(cloud.position.x,0);
  const resources=new Set();
  env.group.traverse(o=>{
    if(o.geometry)resources.add(o.geometry);
    if(o.material)for(const m of [].concat(o.material))resources.add(m);
  });
  let count=0;
  for(const resource of resources){resource.dispose=()=>{count++}};
  env.dispose();env.dispose();env.update(34,false);
  assert.equal(count,resources.size);
});

test('landing roads reconnect at the same authoritative end pose and remain broad',()=>{
  for(const edgeId of ['a-air','b-air','c-air']){
    const edge=SKYFALL_COURSE.edges.find(e=>e.id===edgeId);
    const landing=sampleSkyfallRoad(edgeId,getSkyfallEdgeLength(edgeId));
    const grounded=sampleSkyfallRoad(edgeId.replace('air','ground'),getSkyfallEdgeLength(edgeId.replace('air','ground')));
    assert.ok(landing.width>=34);
    assert.ok(Math.hypot(landing.point.x-grounded.point.x,landing.point.y-grounded.point.y,landing.point.z-grounded.point.z)<1e-5);
  }
});

test('Skyfall unloads distant chunks and follows positions of eight graph-aware vehicles', () => {
  const scene = new THREE.Scene();
  const env = createSkyfallWorld(scene, 'low');
  const initial = env.group.getObjectByName('Skyfall approach banked playable road');
  assert.ok(initial?.isMesh);
  assert.equal(env.group.getObjectByName('Skyfall c-air banked playable road'), undefined);
  let released = false;
  const originalDispose = initial.geometry.dispose.bind(initial.geometry);
  initial.geometry.dispose = () => { released = true; originalDispose(); };

  env.setFocus([{ edgeId: 'c-air', localS: getSkyfallEdgeLength('c-air') / 2 }]);
  assert.equal(released, true, 'obsolete GPU road geometry must be released');
  assert.equal(env.group.getObjectByName('Skyfall approach banked playable road'), undefined);
  const eightEdges = ['approach', 'a-ground', 'a-air', 'b-ground',
    'b-air', 'c-ground', 'c-air', 'descent'];
  env.setFocus(eightEdges.map(edgeId => ({ edgeId, localS: getSkyfallEdgeLength(edgeId) / 2 })));
  for (const edgeId of eightEdges) {
    assert.ok(env.group.getObjectByName(`Skyfall ${edgeId} banked playable road`),
      `eight-car streaming failed on ${edgeId}`);
  }
  env.dispose();
});

test('Skyfall waterfalls animate deterministically and freeze under Reduced Motion', () => {
  const scene = new THREE.Scene();
  const env = createSkyfallWorld(scene, 'medium');
  const waterfall = env.group.getObjectByName('Skyfall hanging waterfall');
  assert.ok(waterfall);
  const baseY = waterfall.position.y;
  env.update(20, false);
  assert.notEqual(waterfall.position.y, baseY);
  const movedY = waterfall.position.y;
  env.update(20, false);
  assert.equal(waterfall.position.y, movedY);
  env.update(20, true);
  assert.equal(waterfall.position.y, baseY);
  env.dispose();
});

test('Skyfall streams both sides of split and merge before the next 420 m chunk boundary', () => {
  const scene = new THREE.Scene();
  const env = createSkyfallWorld(scene, 'low');
  const road = edgeId => env.group.getObjectByName(`Skyfall ${edgeId} banked playable road`);

  // Within one streamed chunk of a split, both possible routes must be visible.
  env.setFocus([{ edgeId: 'approach', localS: getSkyfallEdgeLength('approach') - 300 }]);
  for (const edgeId of ['a-ground', 'a-air']) {
    assert.ok(road(edgeId), `missing next route ${edgeId} within 420 m of split`);
  }

  // Within one chunk of a merge, retain both prior approaches for the camera/rivals.
  env.setFocus([{ edgeId: 'midway-one', localS: 300 }]);
  for (const edgeId of ['a-ground', 'a-air']) {
    assert.ok(road(edgeId), `missing previous route ${edgeId} within 420 m of merge`);
  }
  env.dispose();
});

test('Skyfall landing guidance appears only beyond each unsupported flight gap and releases GPU resources', () => {
  const scene = new THREE.Scene();
  const env = createSkyfallWorld(scene, 'low');
  for (const edgeId of ['a-air', 'b-air', 'c-air']) {
    const edge = SKYFALL_COURSE.edges.find(e => e.id === edgeId);
    const gap = edge.gaps[0];
    assert.equal(hasSkyfallRoadContact(edgeId, (gap.from + gap.to) / 2), false);
    assert.equal(hasSkyfallRoadContact(edgeId, gap.to + 10), true);
    env.setFocus([{ edgeId, localS: gap.to + 20 }]);

    const guides = env.group.getObjectByName(`Skyfall ${edgeId} landing approach markings`);
    assert.ok(guides?.isMesh, `${edgeId} has no visibly supported landing guidance`);
    assert.ok(guides.geometry.getAttribute('position').count >= 6);
    let geometryDisposed = false, materialDisposed = false;
    guides.geometry.dispose = () => { geometryDisposed = true; };
    guides.material.dispose = () => { materialDisposed = true; };
    env.setFocus([{ edgeId: 'approach', localS: 0 }]);
    assert.equal(geometryDisposed, true, `${edgeId} guide geometry leaked`);
    assert.equal(materialDisposed, true, `${edgeId} guide material leaked`);
  }
  env.dispose();
});
