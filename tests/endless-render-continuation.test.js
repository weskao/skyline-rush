import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createWorldTourScene, endlessRoadObstacles } from '../src/world-tour-scene.js';
import { SKY_JUMPS, SKY_LENGTH, SKY_SPIRAL, skyPoint } from '../src/sky-track.ts';
import { RACE_TRACKS } from '../src/game.js';

test('Sky Spiral road buffers continue past the authored finish with bounded live GPU instances',()=>{
  const scene=new THREE.Scene(),sky=createSkyScene(scene);
  try{
    const group=scene.getObjectByName('Sky Spiral 3D course');
    const road=group.children.find(m=>m.isMesh&&m.geometry?.index);
    assert.ok(road);
    const size=group.children.length,positions=road.geometry.getAttribute('position');
    for(const d of [7000,22500,55500,105500]){
      sky.update(d,'high',true);
      assert.equal(group.visible,true);
      assert.equal(group.children.length,size,'no new meshes as infinite distance increases');
      const minZ=Math.min(...Array.from({length:181},(_,i)=>positions.getZ(i*2)));
      const maxZ=Math.max(...Array.from({length:181},(_,i)=>positions.getZ(i*2)));
      assert.ok(Number.isFinite(minZ)&&Number.isFinite(maxZ));
      assert.ok(maxZ-minZ>400,'road mesh retains a full local drawing window');
    }
  }finally{sky.dispose();}
});

test('all five World Tour Endless roads generate bounded themed chunks and colliders past finish',()=>{
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  const layer=scene.getObjectByName('Distance-anchored continuous scenery');
  const root=scene.getObjectByName('World Tour authored scenery');
  const road=root.children.find(m=>m.isMesh&&m.geometry?.index);
  assert.ok(road);
  try {
    for(const id of ['taipei','tokyo','alpine','coastal','cosmic']){
      const length=RACE_TRACKS[id].length;
      for(const d of [length+2000,40000,85000]){
        tour.update(id,d,'medium',[],0,true,true);
        const chunks=layer.children.filter(child=>child.name.startsWith('world-tour-'+id+'-chunk-'));
        assert.ok(chunks.length>=10&&chunks.length<=15,id+' must keep fixed active chunks');
        assert.ok(chunks.every(c=>c.userData.chunkIndex*120>=d-1200),id+' must evict old chunks');
        const positions=road.geometry.getAttribute('position');
        assert.ok(Number.isFinite(positions.getX(20))&&Number.isFinite(positions.getZ(20)));
        const obstacles=endlessRoadObstacles(id,d);
        assert.ok(obstacles.length<500,id+' must not retain infinite collision arrays');
        assert.ok(obstacles.every(o=>o.from>=d-1200 && o.to<=d+2000),id+' collision window must be local');
      }
    }
  }finally{tour.dispose();}
});

test('Sky Spiral Endless keeps its visible hero fixed through repeating scenery seams',()=>{
  const scene=new THREE.Scene(),sky=createSkyScene(scene);
  const root=scene.getObjectByName('Sky Spiral 3D course');
  const hero = root.children.find(node => node.children.some(child => child.geometry?.type === 'CylinderGeometry'));
  try {
    for (const lap of [0, 1, 2, 10]) {
      const entry = lap * SKY_LENGTH + (lap % 2 ? SKY_LENGTH - SKY_SPIRAL.end : SKY_SPIRAL.start);
      sky.update(entry - .25, 'high', true);
      assert.ok(hero.visible);
      const before = hero.position.clone();
      sky.update(entry + .25, 'high', true);
      assert.ok(hero.visible && before.distanceTo(hero.position) < .55);
    }
  }finally{sky.dispose();}
});

test('Sky Spiral Endless hero fades smoothly at the forward visibility threshold',()=>{
  const scene=new THREE.Scene(),sky=createSkyScene(scene);
  const root=scene.getObjectByName('Sky Spiral 3D course');
  const hero=root.children.find(node=>node.children.some(child=>child.geometry?.type==='CylinderGeometry'));
  const tower=hero.children.find(child=>child.geometry?.type==='CylinderGeometry');
  try{
    const opacity=distance=>{
      sky.update(distance,'high',true);
      return hero.visible?tower.material.opacity:0;
    };
    const approach = SKY_LENGTH * 2 + SKY_SPIRAL.start - 1500;
    const before=opacity(approach - .5),after=opacity(approach + .5);
    assert.ok(before>0 && before<1,'approaching distant landmark must already be fading in');
    assert.ok(after>0 && after<1,'distant landmark must not appear at full opacity');
    assert.ok(Math.abs(after-before)<.05,'visibility across a 1m drive must be smooth');
  }finally{sky.dispose();}
});

test('Sky Spiral uses the exact sprint gap edges and rebuilds solid deck when switching modes in the same sector', () => {
  const scene = new THREE.Scene(), sky = createSkyScene(scene);
  try {
    const road = scene.getObjectByName('Sky Spiral 3D course').children.find(m => m.isMesh && m.geometry?.index);
    const station = SKY_JUMPS[1].gapFrom, approach = station - 5;
    sky.update(approach, 'low', false);
    const index = road.geometry.index.array, positions = road.geometry.attributes.position;
    const row = Array.from({ length: 180 }, (_, i) => i).find(i => index[i * 6] === index[i * 6 + 1]);
    assert.ok(Number.isInteger(row), 'sprint draws a real gap');
    const expected = skyPoint(station);
    for (const [axis, value] of [['X', expected.x], ['Y', expected.y], ['Z', expected.z]]) {
      const midpoint = (positions['get' + axis](row * 2) + positions['get' + axis](row * 2 + 1)) / 2;
      assert.ok(Math.abs(midpoint - value) < .001, 'takeoff lip matches the simulation on ' + axis);
    }
    sky.update(approach, 'low', true);
    assert.ok(index[row * 6] !== index[row * 6 + 1], 'the streaming version draws a solid deck');
  } finally { sky.dispose(); }
});
