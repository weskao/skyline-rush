import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COAST_PALETTE, COAST_LIGHTING, createCoastScenery } from '../src/coast-visuals.ts';

const center = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;

test('Coast palette is grounded and road/shoreline materials stay matte', () => {
  assert.match(COAST_PALETTE.road, /^#[0-9a-f]{6}$/i);
  assert.notEqual(COAST_PALETTE.road, COAST_PALETTE.ground);
  assert.ok(COAST_PALETTE.warmth < 0.6, 'Coast sky should avoid the old oversaturated sunset');
  const scene = new THREE.Scene();
  const kit = createCoastScenery(scene, center);
  const root = scene.getObjectByName('Coast scenic details');
  assert.equal(kit.group, root);
  assert.equal(root.children.length, 3, 'three shared-material submissions, never one draw per tree');
  for (const mesh of root.children) {
    assert.ok(mesh.isInstancedMesh);
    assert.ok(mesh.material.roughness >= .75, 'weathered matte materials');
    assert.ok(mesh.material.metalness <= .1, 'shoreline scenery is not metallic');
    assert.ok(mesh.geometry.attributes.position.count <= 120, 'low-poly geometries only');
    assert.equal(mesh.frustumCulled, false);
  }
  kit.dispose();
  assert.equal(scene.children.includes(root), false);
});

test('Coast detail density is bounded by quality, not by time or total race length', () => {
  const scene = new THREE.Scene(), kit = createCoastScenery(scene, center);
  const root = kit.group;
  let previous = 0;
  for (const [quality, expected] of [['low',12],['medium',20],['high',32]]) {
    kit.update(340,quality);
    for (const mesh of root.children) assert.equal(mesh.count, expected);
    assert.ok(expected >= previous);
    previous = expected;
  }
  kit.dispose();
});

test('Coast scenery tiles do not teleport all instances at a 60 m streaming boundary', () => {
  const kit = createCoastScenery(new THREE.Scene(), center);
  kit.update(359.9,'high');
  const rock = kit.group.getObjectByName('Coast shoreline rocks');
  const prior = Array.from({ length: rock.count }, (_, i) => {
    const m = new THREE.Matrix4();rock.getMatrixAt(i,m);return m.elements.slice();
  });
  kit.update(360.1,'high');
  let unchanged = 0;
  for(let i=0;i<rock.count;i++){
    const m = new THREE.Matrix4();rock.getMatrixAt(i,m);
    if (m.elements.every((v,j)=>Math.abs(v-prior[i][j])<1e-8)) unchanged++;
  }
  assert.ok(unchanged>=rock.count-1, 'only the expired tile may be recycled');
  for(const mesh of kit.group.children){
    for(let i=0;i<mesh.count;i++){
      const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      mesh.getMatrixAt(i,m);m.decompose(p,q,s);
      const absoluteDistance = -p.z;
      assert.ok(Math.abs(p.x-center(absoluteDistance)) >= 30, 'scenic props stay outside the 24m road');
      assert.ok(s.x>0&&s.y>0&&s.z>0,'never create zero-scaled lit normals');
    }
  }
  kit.dispose();
});

test('Endless Coast scenery remains near its floating origin and changes from absolute chunk seeds', () => {
  const scene = new THREE.Scene(), kit = createCoastScenery(scene, center);
  const matrix = new THREE.Matrix4();
  const sample = distance => {
    kit.update(distance, 'low', 1001);
    scene.updateMatrixWorld(true);
    return kit.group.children.map(mesh => {
      const entries = [];
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        assert.ok(Math.abs(matrix.elements[14]) < 3000, 'GPU translations must remain local at billion-metre progress');
        entries.push([matrix.elements[0], matrix.elements[5], matrix.elements[10]]);
      }
      return entries;
    });
  };
  const first = sample(1_000_000_000);
  const positions = kit.group.children.map(mesh => { mesh.getMatrixAt(0, matrix); return matrix.elements.slice(); });
  assert.deepEqual(sample(1_000_000_000), first);
  assert.notDeepEqual(sample(1_000_005_000), first, 'a bounded pool must not repeat slot-derived scenery forever');
  sample(1_000_000_000);
  assert.deepEqual(kit.group.children.map(mesh => { mesh.getMatrixAt(0, matrix); return matrix.elements.slice(); }), positions);
  assert.equal(scene.children.length, 1);
  kit.dispose(); assert.equal(scene.children.length, 0);
});

test('Coast keeps readable light and glow: not dimmer than the Phase 2 floor, not the old blown-out look', () => {
  assert.ok(COAST_LIGHTING.sun >= 1.7 && COAST_LIGHTING.sun <= 2.3, 'sun between Phase 2 dimming and the original 2.3');
  assert.ok(COAST_LIGHTING.ambient >= 1.4 && COAST_LIGHTING.ambient <= 1.7);
  assert.ok(COAST_LIGHTING.exposure >= 1.05 && COAST_LIGHTING.exposure <= 1.12);
  assert.ok(COAST_LIGHTING.bloom >= .28 && COAST_LIGHTING.bloom <= .42, 'in-race glow survives');
  assert.ok(COAST_PALETTE.warmth >= .45 && COAST_PALETTE.warmth < .6, 'warm sunset returns without the old oversaturation');
});
