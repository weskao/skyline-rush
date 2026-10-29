import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DETAIL_KINDS, detailSetPlan } from '../src/world-tour-details.js';
import { SCENERY_KINDS, propParts, createSceneryKit } from '../src/world-tour-scenery.js';
import { WORLD_THEMES, createWorldTourScene, blocksLandmark, roadObstacles } from '../src/world-tour-scene.js';
import { RACE_TRACKS, ROAD_LIMIT } from '../src/game.js';

const ids=['taipei','tokyo','alpine','coastal','cosmic'];
const chunks=id=>Array.from({length:Math.ceil(RACE_TRACKS[id].length/120)+1},(_,i)=>i);
const blocks=id=>item=>WORLD_THEMES[id].landmarks.some(l=>blocksLandmark(id,l,item));

test('every World Tour road gets its own decorative detail kinds, separate from street props', () => {
  for(const id of ids){
    assert.ok(DETAIL_KINDS[id].length>=2,id);
    for(const kind of DETAIL_KINDS[id])assert.ok(!SCENERY_KINDS[id].includes(kind),id+' '+kind);
  }
  const kit=createSceneryKit();
  for(const kind of new Set(ids.flatMap(id=>DETAIL_KINDS[id])))assert.ok(kit.build('',kind).children.length>0,kind);
});

test('detail placement is deterministic, thins out on Medium and is off on Low', () => {
  for(const id of ids){
    let high=0,medium=0,low=0;
    for(const c of chunks(id)){
      assert.deepEqual(detailSetPlan(id,c,'high'),detailSetPlan(id,c,'high'));
      for(const item of detailSetPlan(id,c,'high')){
        assert.ok(DETAIL_KINDS[id].includes(item.kind));
        assert.ok(item.distance>=0&&item.distance<=RACE_TRACKS[id].length);
      }
      high+=detailSetPlan(id,c,'high').length;medium+=detailSetPlan(id,c,'medium').length;low+=detailSetPlan(id,c,'low').length;
    }
    // Low sheds decoration entirely: weak hardware pays no extra draws for it.
    assert.ok(high>medium&&medium>0&&low===0,`${id} ${high}/${medium}/${low}`);
  }
});

test('details never reach the road, so no car can hit them and the obstacle list is unchanged', () => {
  const reach=ROAD_LIMIT+.85;
  for(const id of ids){
    for(const c of chunks(id))for(const item of detailSetPlan(id,c,'high'))for(const b of propParts(item.kind)){
      const near=Math.min(Math.abs(item.side*item.offset+b.min.x*item.size),Math.abs(item.side*item.offset+b.max.x*item.size));
      assert.ok(near>reach,`${id} ${item.kind} ${near}`);
    }
    assert.ok(roadObstacles(id).every(p=>!DETAIL_KINDS[id].includes(p.kind)),id);
  }
});

test('details never cover a signature landmark: blocked ones move out of the sightline', () => {
  let moved=0;
  for(const id of ids)for(const c of chunks(id)){
    const raw=detailSetPlan(id,c,'high'),safe=detailSetPlan(id,c,'high',blocks(id));
    moved+=raw.filter(blocks(id)).length;
    assert.ok(safe.every(item=>!blocks(id)(item)),id+' chunk '+c);
  }
  assert.ok(moved>0,'the fixture should exercise at least one blocked detail');
});

test('streamed chunks draw the detail sets beside the existing street props', () => {
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  for(const id of ids){
    tour.update(id,1213,'high');
    const names=new Set();
    scene.getObjectByName('Distance-anchored continuous scenery').traverse(o=>names.add(o.name));
    assert.ok(DETAIL_KINDS[id].some(kind=>names.has(kind)),id+' streams no details');
  }
});

test('weak hardware draws fewer background stars; High keeps all of them', () => {
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  const stars=[];scene.traverse(o=>{if(o.isPoints)stars.push(o);});
  assert.equal(stars.length,1);
  const total=stars[0].geometry.attributes.position.count;
  const drawn=q=>{tour.update('cosmic',1213,q);return Math.min(total,stars[0].geometry.drawRange.count);};
  assert.equal(drawn('high'),total);
  assert.ok(drawn('medium')<total&&drawn('low')<drawn('medium'),`${drawn('medium')} / ${drawn('low')}`);
  assert.equal(drawn('high'),total,'returning to High restores every star');
});
