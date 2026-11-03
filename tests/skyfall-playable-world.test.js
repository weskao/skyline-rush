import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyfallWorld } from '../src/courses/skyfall-world.ts';
import { SKYFALL_COURSE, getSkyfallEdgeLength, sampleSkyfallRoad } from '../src/courses/skyfall-archipelago.ts';

test('Skyfall renders ten real geometry-backed roads, islands, cloud ocean and sky rings',()=>{
  const scene=new THREE.Scene();
  const env=createSkyfallWorld(scene,'medium');
  assert.ok(scene.children.includes(env.group));
  for(const e of SKYFALL_COURSE.edges){
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