import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classicRoadCenter } from '../src/track-paths.ts';

// The original four flat courses used to rewrite their entire road ribbon,
// lane / shoulder instance matrices and send GPU buffers on *every* frame,
// even while the car remained inside one 12 m streaming sector.
test('all four classic roads upload geometry and lane instances only on sector/invalidation changes', () => {
  const renderer=readFileSync(new URL('../src/world.js', import.meta.url),'utf8');
  assert.match(renderer,/const refreshClassicRoad\s*=/,
    'renderer must explicitly gate classic road refresh');
  assert.match(renderer,/if\s*\(refreshClassicRoad\)\s*for\s*\(let i = 0; i <= segments; i\+\+\)/,
    'road/lane instance transforms must not be recomputed on every frame');
  assert.match(renderer,/if\s*\(refreshClassicRoad\)\s*roadGeometry\.attributes\.position\.needsUpdate\s*=\s*true;/,
    'road vertex GPU upload must be skipped inside a stable sector');
  assert.match(renderer,/if\s*\(refreshClassicRoad\)\s*\[laneLines, curbs, edgeLines, railLights\]/,
    'lane/rail GPU uploads must be skipped inside a stable sector');
  assert.match(renderer,/for\(const mesh of \[road,laneLines,[^\]]+\]\)mesh\.position\.set\(-center,0,distance\)/,
    'translate road and all retained lane/shoulder instances together');
});

test('same visual road and shoulder coordinates under stable-local origin for all classic tracks',()=>{
  const classicCenter=classicRoadCenter;
  for(const distance of [0,55.3,599.5,610.1,1799.99,3200.5]){
    const center=classicCenter(distance),tile=Math.floor(distance/12)*12;
    for(let i=0;i<=120;i++){
      const d=tile+(i-5)*12;
      for(const lateral of [-12,0,12,12.4]){
        const original=[classicCenter(d)-center+lateral,0,distance-d];
        const cached=[classicCenter(d)+lateral-center,0,-d+distance];
        assert.ok(original.every((v,k)=>Math.abs(v-cached[k])<1e-10));
      }
    }
  }
});
