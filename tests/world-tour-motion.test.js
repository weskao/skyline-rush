import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MOTION_KINDS, motionPose } from '../src/world-tour-motion.js';
import { createWorldTourScene, roadObstacles } from '../src/world-tour-scene.js';
import { RACE_TRACKS, ROAD_LIMIT } from '../src/game.js';

const ids=['taipei','tokyo','alpine','coastal','cosmic'];
const moving=scene=>{const out=[];scene.traverse(o=>{if(o.name.startsWith('motion:'))out.push(o);});return out;};

test('each World Tour road has one moving background piece posed by time alone', () => {
  for(const id of ids){
    assert.ok(MOTION_KINDS[id],id);
    const a=motionPose(id,1200,10),b=motionPose(id,1200,10),c=motionPose(id,1200,14);
    assert.deepEqual(a,b);
    assert.notDeepEqual(a,c,id+' does not move');
    for(const t of [0,3,40,900]){
      const p=motionPose(id,1200,t);
      assert.ok(Number.isFinite(p.distance)&&p.distance>=0&&p.distance<=RACE_TRACKS[id].length,id+' '+t);
    }
  }
});

test('moving pieces stay outside the road and never become obstacles', () => {
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  for(const id of ids){
    for(const t of [0,7,33]){
      tour.update(id,1213,'high',[],t);
      const [piece]=moving(scene).filter(o=>o.visible);
      assert.ok(piece,id);
      const p=motionPose(id,1213,t);
      // Conservative: the model's longest horizontal side, whichever way it faces.
      const size=new THREE.Box3().setFromObject(piece.children[0]).getSize(new THREE.Vector3());
      assert.ok(p.offset-Math.max(size.x,size.z)/2>ROAD_LIMIT+.85||p.altitude>6,`${id} offset ${p.offset}`);
    }
    assert.ok(roadObstacles(id).every(o=>!o.kind.startsWith('motion')));
  }
});

test('reduced motion freezes the pieces, Low hides them and nothing is allocated per frame', () => {
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  tour.update('tokyo',1213,'high',[],5,true);
  const [piece]=moving(scene).filter(o=>o.visible);
  const frozen=piece.position.clone();
  tour.update('tokyo',1213,'high',[],25,true);
  assert.ok(piece.position.equals(frozen),'reduced motion still moves the train');
  tour.update('tokyo',1213,'high',[],25,false);
  assert.ok(!piece.position.equals(frozen),'normal motion should move the train');
  for(const id of ids)tour.update(id,1213,'high',[],1);
  const count=moving(scene).length;
  assert.equal(count,new Set(Object.values(MOTION_KINDS)).size,'one piece per kind');
  for(let t=0;t<200;t++)tour.update(ids[t%5],1213,'high',[],t*.016);
  assert.equal(moving(scene).length,count,'pieces are reused, not rebuilt');
  tour.update('tokyo',1213,'low',[],25);
  assert.ok(moving(scene).every(o=>!o.visible),'Low sheds the moving decoration');
});
