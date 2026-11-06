import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDuneTempestVisualChunk } from '../src/courses/dune-tempest-chunk.ts';

const sample = (edgeId, s) => ({
  edgeId, localS:s, point:[s*.5, 10 + s*.05, -s],
  forward:[0,0,-1], right:[1,0,0], up:[0,1,0], width:32, curvature:0,
});
const length = () => 1000;

test('real Three.js road, sand terrain, and hazardous footprints share one streamed group', () => {
  const parent = new THREE.Group();
  const visual = createDuneTempestVisualChunk(parent,'sunset-start',0,1000,length,sample,'low');
  assert.equal(parent.children.includes(visual.group),true);
  assert.ok(visual.group.getObjectByName('Dune road') instanceof THREE.Mesh);
  assert.ok(visual.group.getObjectByName('Dune shoulder') instanceof THREE.Mesh);
  assert.ok(visual.group.getObjectByName('Dune open terrain') instanceof THREE.Mesh);
  assert.ok(visual.group.getObjectByName('Dune hazard sand-bowl-a') instanceof THREE.Mesh);
  const road = visual.group.getObjectByName('Dune road');
  assert.ok(road.geometry.getAttribute('position').count > 10);
  assert.equal(visual.group.getObjectByName('Dune hazard sand-bowl-a').geometry.parameters.radius,9.5);
  let disposed = 0;
  road.geometry.addEventListener('dispose', () => disposed++);
  visual.dispose();
  visual.dispose();
  assert.equal(disposed,1);
  assert.equal(parent.children.includes(visual.group),false);
});
test('an aerial shortcut has a real chasm rather than a solid sky bridge', () => {
  const parent = new THREE.Group();
  const mid = createDuneTempestVisualChunk(parent,'canyon-air-crossing',200,800,length,sample,'low');
  assert.equal(mid.group.getObjectByName('Dune road'), undefined);
  const chasm = mid.group.getObjectByName('Dune chasm floor');
  assert.ok(chasm instanceof THREE.Mesh);
  assert.ok(chasm.geometry.getAttribute('position').count > 20);
  mid.dispose();
  const landing = createDuneTempestVisualChunk(parent,'canyon-air-crossing',900,1000,length,sample,'low');
  assert.ok(landing.group.getObjectByName('Dune road') instanceof THREE.Mesh);
  landing.dispose();
});
test('stone arch geometry is 3D and sandstorm particle budgets respect motion preference', () => {
  const parent = new THREE.Group();
  const visual = createDuneTempestVisualChunk(parent,'stone-ring-corridor',450,600,length,sample,'medium');
  const arch = visual.group.getObjectByName('Dune landmark monumental-stone-ring');
  assert.ok(arch instanceof THREE.Group && arch.children.length >= 3);
  const dust = visual.group.getObjectByName('Dune sandstorm wall-on-horizon');
  assert.ok(dust instanceof THREE.Points);
  visual.update(3,'low',false);
  assert.equal(dust.geometry.drawRange.count,24);
  visual.update(4,'high',false);
  assert.equal(dust.geometry.drawRange.count,160);
  visual.update(5,'high',true);
  assert.equal(dust.geometry.drawRange.count,0);
  visual.dispose();
});
