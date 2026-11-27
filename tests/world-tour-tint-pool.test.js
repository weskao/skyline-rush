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

// A source that would draw alone keeps its own transform path (model × position, or its chunk's
// instance matrix); pooling it recomputes the vertex position through the layer, which can move
// its depth by an ulp and flip a near-coplanar seam. So it joins a tinted draw only if it touches
// nothing; groups already pooled keep the identical matrices.
test('a source that would draw alone joins a tinted draw only when it touches nothing', () => {
  const kit = createSceneryKit(), geometry = new THREE.BoxGeometry(1, 1, 1);
  const layer = new THREE.Group(), chunk = new THREE.Group();
  chunk.userData.chunkIndex = 0; layer.add(chunk);
  const put = (hex, x) => {
    const mesh = new THREE.Mesh(geometry, kit.material(hex)); mesh.userData.tintable = true;
    mesh.position.set(x, 0, 0); chunk.add(mesh); return mesh;
  };
  const [alone, other] = [put('#507786', 0), put('#c84b31', 10)]; // isolated lone colours
  const pair = [put('#f2d16b', 20), put('#f2d16b', 30)];             // pooled anyway
  const touching = put('#22313f', 30.9);                              // lone, touches the pair
  layer.updateMatrixWorld(true);
  const pool = poolStaticChunks(layer, [chunk], null);
  try {
    assert.ok(!alone.visible && !other.visible, 'isolated lone colours share the tinted draw');
    assert.ok(touching.visible, 'a lone part touching another part keeps its own draw');
    assert.ok(pair.every(m => !m.visible), 'the pooled pair still pools');
    assert.equal(pool.children.find(b => b.instanceColor)?.count, 2);
  } finally { releaseStaticPool(pool); geometry.dispose(); kit.dispose(); }
});

// Placed props overlap their neighbours and the chunk's own parts (a 38 m Tokyo train on 27 m
// spacing), so contact is checked in the streamed world: a tinted instance never touches an
// instance drawn by another opaque draw. Boxes are axis-aligned in the scenery layer, the frame the
// pool is built in (a conservative bound in any frame, but only one frame gives the same answer).
test('in the streamed world a tinted instance touches no instance of another draw', () => {
  const scene = new THREE.Scene(), renderer = createWorldTourScene(scene);
  const box = new THREE.Box3(), matrix = new THREE.Matrix4(), world = new THREE.Matrix4();
  try {
    for (const [id, at] of [['tokyo', 86], ['tokyo', 1550], ['taipei', 86], ['coastal', 86], ['alpine', 1550]]) {
      renderer.update(id, at, 'high', RACE_TRACKS[id].sections, 0, true);
      const pool = scene.getObjectByName('World Tour shared draw batches');
      scene.updateMatrixWorld(true); // as the next render does
      const inverse = pool.parent.matrixWorld.clone().invert();
      const draws = [];
      pool.parent.traverseVisible(o => {
        if (o.isMesh && !o.material.transparent && !o.userData.ownGeometry && o.renderOrder === 0) draws.push(o);
      });
      const items = [];
      for (const draw of draws) {
        draw.geometry.boundingBox ?? draw.geometry.computeBoundingBox();
        for (let i = 0; i < (draw.isInstancedMesh ? draw.count : 1); i++) {
          world.multiplyMatrices(inverse, draw.matrixWorld);
          if (draw.isInstancedMesh) world.multiply(draw.getMatrixAt(i, matrix));
          items.push({ draw, box: box.copy(draw.geometry.boundingBox).applyMatrix4(world).expandByScalar(REACH / 2).clone() });
        }
      }
      items.sort((a, b) => a.box.min.x - b.box.min.x);
      const touching = new Set();
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length && items[j].box.min.x <= items[i].box.max.x; j++) {
        const a = items[i], b = items[j];
        if (a.draw !== b.draw && (a.draw.instanceColor || b.draw.instanceColor) && a.box.intersectsBox(b.box))
          touching.add(id + '@' + at + ': ' + (a.draw.instanceColor ? b : a).draw.parent.name);
      }
      assert.deepEqual([...touching], [], 'tinted instances touching another draw');
      assert.ok(pool.children.some(b => b.instanceColor), id + ': isolated colour variants still share a draw');
    }
  } finally { renderer.dispose(); }
});

// A look's untinted batch must keep every instance: dropping some moves its bounding sphere, so
// three's z sort can swap it with a touching same-colour batch and flip their seam pixels.
test('every part of one look (geometry and colour) pools tinted, or none does', () => {
  const kit = createSceneryKit();
  const kinds = [...new Set([...Object.values(SCENERY_KINDS), ...Object.values(DETAIL_KINDS)].flat())];
  const looks = new Map();
  try {
    for (const kind of kinds) for (const part of kit.build('', kind, 1).children) {
      const look = part.geometry.uuid + part.material.uuid;
      looks.set(look, [...(looks.get(look) ?? []), kind + ':' + !!part.userData.tintable]);
    }
    const mixed = [...looks.values()].filter(parts => new Set(parts.map(p => p.endsWith('true'))).size > 1);
    assert.deepEqual(mixed, [], 'looks with tinted and untinted parts');
  } finally { kit.dispose(); }
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
