import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RACE_TRACKS } from '../src/game.js';
import { createWorldTourScene } from '../src/world-tour-scene.js';
import { trackLocalPosition, trackFrame } from '../src/track-paths.ts';

// The renderer must use the exact physics centreline and road frame at both
// road edges — even at tunnel transitions, steep grades and finish boundaries.
test('Phase 5 World Tour ribbon and physics centreline agree for five tracks and three tiers',()=>{
  const scene=new THREE.Scene(),visual=createWorldTourScene(scene);
  const root=scene.getObjectByName('World Tour authored scenery');
  const road=root.children.find(mesh=>mesh.isMesh&&mesh.geometry?.index);
  assert.ok(road,'actual indexed road mesh exists');
  const qualities=['low','medium','high'];
  try {
    for(const id of ['tokyo','alpine','taipei','coastal','cosmic']){
      const length=RACE_TRACKS[id].length,sections=RACE_TRACKS[id].sections;
      for(const [index,distance] of [0,1100,3300,length-48].entries()){
        const quality=qualities[index%3];
        visual.update(id,distance,quality,sections,0,true);
        const origin=Math.floor(Math.max(0,distance)/12)*12;
        const start=Math.max(0,origin-160);
        const positions=road.geometry.getAttribute('position');
        const normals=road.geometry.getAttribute('normal');
        for(const row of [0,1,30,78,130,138]){
          const s=Math.max(0,Math.min(length,start+row*12));
          const up=trackFrame(id,s).up;
          for(const [side,lateral] of [-12,12].entries()){
            const vertex=row*2+side;
            const expected=trackLocalPosition(id,s,lateral,0,origin);
            const actual=[positions.getX(vertex),positions.getY(vertex),positions.getZ(vertex)];
            const error=Math.hypot(...actual.map((n,i)=>n-expected[i]));
            assert.ok(error<.005,`${id}/${quality}/${distance}m row ${row}: road vs physics ${error}`);
            for(let axis=0;axis<3;axis++){
              const normal=[normals.getX(vertex),normals.getY(vertex),normals.getZ(vertex)][axis];
              assert.ok(Math.abs(normal-up[axis])<.0001,`${id} road normal mismatch`);
            }
          }
        }
      }
    }
  }finally{visual.dispose();}
});
