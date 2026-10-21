import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SCENERY_KINDS,ROAD_CHARACTER,sceneryPlan,createSceneryKit } from '../src/world-tour-scenery.js';

const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('each world-tour destination has a distinct material, road and asset catalog',()=>{
  assert.equal(new Set(ids.map(id=>ROAD_CHARACTER[id].markings)).size,5);
  for(const id of ids)assert.ok(SCENERY_KINDS[id].length>=6);
  assert.equal(new Set(ids.map(id=>SCENERY_KINDS[id].join(','))).size,5);
});
test('stable distance-anchored scenery does not restart or jump every 12 metre road sector',()=>{
  for(const id of ids)for(let chunk=0;chunk<12;chunk++){
    const first=sceneryPlan(id,chunk),second=sceneryPlan(id,chunk);
    assert.deepEqual(first,second);
    assert.ok(first.length>=6);
    for(const item of first){
      assert.ok(item.distance>=chunk*120&&item.distance<(chunk+1)*120);
      assert.ok(SCENERY_KINDS[id].includes(item.kind));
    }
  }
});
test('six different specific props per world have actual multipart authored forms',()=>{
  const kit=createSceneryKit();
  for(const id of ids)for(const kind of SCENERY_KINDS[id]){
    const group=kit.build(id,kind,1.1);
    assert.equal(group.name,kind);
    assert.ok(group.children.length>=3,id+':'+kind+' must not be a lone block');
    kit.place(group,id,1234,56,0);
    assert.ok(group.position.toArray().every(Number.isFinite));
    for(const mesh of group.children)assert.ok(mesh.isMesh&&mesh.material&&mesh.geometry);
  }
  kit.dispose();
});
