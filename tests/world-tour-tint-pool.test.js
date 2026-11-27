import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { poolStaticChunks, releaseStaticPool } from '../src/world-tour-batching.ts';
import { createSceneryKit, SCENERY_KINDS, DETAIL_KINDS } from '../src/world-tour-scenery.js';
import { createWorldTourScene } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';

// Everything that shapes a material's shading except its base colour.
const shading = material => JSON.stringify(Object.entries(material).filter(([k, v]) =>
  !['uuid', 'id', 'name', 'color', 'version', 'userData', '_listeners'].includes(k) && typeof v !== 'function')
  .map(([k, v]) => [k, v?.isColor ? v.getHexString() : v]));

function chunksOf(kit, colours, glow = false, geometry = new THREE.BoxGeometry(1, 1, 1)) {
  const layer = new THREE.Group();
  const chunks = [0, 1].map(index => {
    const chunk = new THREE.Group(); chunk.userData.chunkIndex = index; layer.add(chunk); return chunk;
  });
  colours.forEach((hex, i) => {
    const mesh = new THREE.Mesh(geometry, kit.material(hex, glow));
    mesh.userData.tintable = true; // an isolated part, as the kit marks it
    mesh.position.set(i * 3, 1, -i * 7); mesh.scale.set(1 + i, 2, 1);
    chunks[i % 2].add(mesh);
  });
  layer.updateMatrixWorld(true);
  return { layer, chunks, geometry };
}

test('kit colour variants share a white tint base that matches them in every shading input', () => {
  const kit = createSceneryKit();
  for (const glow of [false, true]) {
    const a = kit.material('#507786', glow), b = kit.material('#c84b31', glow);
    const base = a.userData.tintBase;
    assert.ok(base, 'each kit material names its colour-only tint base');
    assert.equal(b.userData.tintBase, base, 'one base per material kind');
    assert.equal(base.color.getHex(), 0xffffff);
    assert.equal(base.type, a.type);
    assert.equal(shading(base), shading(a), 'base differs only in colour');
  }
  kit.dispose();
});

test('colour-only variants of one geometry pool into one draw with exact per-instance colours', () => {
  const kit = createSceneryKit();
  const colours = ['#507786', '#c84b31', '#f2d16b', '#507786', '#22313f'];
  const { layer, chunks, geometry } = chunksOf(kit, colours);
  // Depth ties went to the later-drawn colour (three sorts opaque draws by material id), so the
  // pooled instances follow material id; equal colours keep their source order (stable sort).
  const expected = chunks.flatMap(c => c.children).sort((a, b) => a.material.id - b.material.id)
    .map(m => [m.matrixWorld.clone(), m.material.color.clone()]);
  const pool = poolStaticChunks(layer, chunks, null, 2);
  try {
    assert.equal(pool.children.length, 1, 'five meshes in four colours are one draw');
    const batch = pool.children[0];
    assert.equal(batch.material, kit.material('#507786').userData.tintBase);
    assert.equal(batch.count, 5);
    assert.ok(batch.instanceColor, 'colour travels per instance');
    const matrix = new THREE.Matrix4(), colour = new THREE.Color();
    expected.forEach(([world, want], i) => {
      batch.getMatrixAt(i, matrix);
      assert.ok(matrix.equals(world), 'instance ' + i + ' keeps its transform');
      batch.getColorAt(i, colour);
      // uniform3f also uploads float32, so the GPU sees the same bits either way.
      assert.deepEqual(colour.toArray(), want.toArray().map(Math.fround), 'instance ' + i + ' keeps its exact linear colour');
    });
    assert.equal(pool.userData.drawsSaved, 4);
  } finally { releaseStaticPool(pool); geometry.dispose(); kit.dispose(); }
});

test('a single colour keeps its own material, so no instance-colour program is added', () => {
  const kit = createSceneryKit();
  const { layer, chunks, geometry } = chunksOf(kit, ['#507786', '#507786', '#507786']);
  const pool = poolStaticChunks(layer, chunks, null, 2);
  try {
    assert.equal(pool.children.length, 1);
    assert.equal(pool.children[0].material, kit.material('#507786'));
    assert.equal(pool.children[0].instanceColor, null);
  } finally { releaseStaticPool(pool); geometry.dispose(); kit.dispose(); }
});

test('animated or side-changed variants never share a tinted draw', () => {
  const kit = createSceneryKit();
  kit.material('#ffd36a', true).userData.pulse = 'beacon';
  const { layer, chunks, geometry } = chunksOf(kit, ['#ffd36a', '#8fe8ff', '#ffd36a', '#8fe8ff'], true);
  const sided = kit.material('#4c5b50'); sided.side = THREE.DoubleSide;
  for (const hex of ['#4c5b50', '#507786']) {
    const mesh = new THREE.Mesh(geometry, kit.material(hex)); chunks[0].add(mesh);
  }
  layer.updateMatrixWorld(true);
  const pool = poolStaticChunks(layer, chunks, null, 2);
  try {
    const pulsing = pool.children.filter(b => b.material === kit.material('#ffd36a', true));
    assert.equal(pulsing.length, 1, 'the per-frame pulse colour stays on its own material');
    assert.ok(pool.children.every(b => b.material !== sided.userData.tintBase || !b.instanceColor ||
      b.count === 1), 'a DoubleSide variant is not drawn with the FrontSide base');
    assert.equal(sided.userData.tintBase.side, THREE.FrontSide, 'the shared base is never mutated');
  } finally { releaseStaticPool(pool); geometry.dispose(); kit.dispose(); }
});

test('real World Tour pools draw each geometry once per bucket and material kind', () => {
  const scene = new THREE.Scene(), renderer = createWorldTourScene(scene);
  try {
    for (const id of ['taipei', 'tokyo', 'alpine', 'coastal']) {
      renderer.update(id, 1550, 'high', RACE_TRACKS[id].sections, 0, true);
      const pool = scene.getObjectByName('World Tour shared draw batches');
      const seen = new Map();
      for (const batch of pool.children) {
        // Parts touching another draw keep their own colour material (see the contact test below).
        const key = batch.geometry.uuid + batch.material.uuid + batch.userData.bucket;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const split = [...seen.values()].filter(n => n > 1).length;
      assert.equal(split, 0, id + ': each geometry draws once per bucket and material');
      assert.ok(pool.children.some(b => b.instanceColor), id + ': isolated colour variants still share a draw');
      const rack = scene.getObjectByName('shader rack ' + id);
      const tinted = [];
      rack.traverse(o => { if (o.isInstancedMesh && o.instanceColor) tinted.push(o.material.type); });
      assert.deepEqual([...new Set(tinted)].sort(), ['MeshBasicMaterial', 'MeshStandardMaterial'],
        id + ': the hidden shader rack warms both tinted programs');
    }
  } finally { renderer.dispose(); }
});

// Bounds closer than this can share a depth value at the far end of the 24-bit depth buffer
// (near 0.1 m: about 0.21 m per step 600 m away), so their draw order decides the pixel.
const REACH = 0.25;
test('a prop part draws tinted only when every part it touches lands in the same draw', () => {
  const kit = createSceneryKit();
  const kinds = [...new Set([...Object.values(SCENERY_KINDS), ...Object.values(DETAIL_KINDS)].flat())];
  let tinted = 0;
  try {
    for (const kind of kinds) {
      const layer = new THREE.Group(), chunk = new THREE.Group();
      chunk.userData.chunkIndex = 0; layer.add(chunk);
      const [prop] = [0, 600].map(x => { const g = kit.build('', kind, 1); g.position.x = x; chunk.add(g); return g; });
      layer.updateMatrixWorld(true);
      const pool = poolStaticChunks(layer, [chunk], null);
      const parts = prop.children.filter(o => o.isMesh);
      // The batch drawing a part is the one holding an instance at the part's transform.
      const owner = new Map(), matrix = new THREE.Matrix4();
      const at = m => m.elements.map(n => n.toFixed(4)).join();
      for (const b of pool.children) for (let i = 0; i < b.count; i++) owner.set(at(b.getMatrixAt(i, matrix)) + b.geometry.uuid, b);
      const drawOf = part => {
        const batch = !part.visible && owner.get(at(part.matrixWorld) + part.geometry.uuid);
        return batch?.instanceColor ? 'tint ' + batch.uuid : 'own ' + part.uuid;
      };
      const boxes = parts.map(p => new THREE.Box3().setFromObject(p).expandByScalar(REACH / 2));
      parts.forEach((part, i) => {
        if (!drawOf(part).startsWith('tint')) return;
        tinted++;
        parts.forEach((other, j) => {
          if (i !== j && boxes[i].intersectsBox(boxes[j])) assert.equal(drawOf(other), drawOf(part),
            kind + ': part ' + i + ' is tinted but touches part ' + j + ' in another draw');
        });
      });
      releaseStaticPool(pool);
    }
    assert.ok(tinted > 0, 'isolated parts still pool their colours');
  } finally { kit.dispose(); }
});
