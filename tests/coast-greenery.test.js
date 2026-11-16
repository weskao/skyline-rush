import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { COAST_PIECES } from '../src/coast-scenery-glb.ts';
import { GREENERY_ID, GREENERY_SHRUBS, greenTops, greeneryAnchors, withGreenery } from '../src/coast-greenery.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { seededRng } from '../src/rng.ts';

// Cliff greenery (?look=3d, Medium+): grass on the up-facing scan surfaces and shrub cards rooted on the cliff tops.
const quad = (x0, x1, y, z0 = 0, z1 = 1) => [x0, y, z0, x1, y, z1, x1, y, z0, x0, y, z0, x0, y, z1, x1, y, z1]; // up-facing, two triangles
const points = anchors => Array.from({ length: anchors.length / 3 }, (_, i) => [...anchors.subarray(i * 3, i * 3 + 3)]);
const sequential = positions => Array.from({ length: positions.length / 3 }, (_, i) => i);

test('anchors land only on the up-facing faces of a mesh', () => {
  const box = new THREE.BoxGeometry(2, 2, 2).translate(0, 1, 0); // top face at y = 2
  const anchors = greeneryAnchors(box.attributes.position.array, box.index.array, 40, seededRng(1, 'box'));
  assert.equal(anchors.length, 40 * 3);
  for (const [x, y, z] of points(anchors)) {
    assert.ok(Math.abs(y - 2) < 1e-6, `on the top face, got y ${y}`);
    assert.ok(Math.abs(x) <= 1 && Math.abs(z) <= 1, 'inside the face');
  }
});

test('anchors are spread by area: a face nine times larger takes about nine tenths of them', () => {
  const positions = [...quad(0, 1, 5), ...quad(10, 19, 5)];
  const anchors = points(greeneryAnchors(positions, sequential(positions), 400, seededRng(7, 'area')));
  const large = anchors.filter(([x]) => x >= 10).length;
  assert.ok(large > 330 && large < 390, `expected about 360 of 400 on the large face, got ${large}`);
});

test('faces below the minimum height and faces that are not up-facing carry no anchors', () => {
  const wall = [0, 0, 0, 0, 9, 0, 1, 9, 0]; // vertical
  const positions = [...quad(0, 1, .5), ...quad(0, 1, 6), ...wall];
  const anchors = points(greeneryAnchors(positions, sequential(positions), 30, seededRng(3, 'h'), { minHeight: 3 }));
  assert.equal(anchors.length, 30);
  assert.ok(anchors.every(([, y]) => y === 6), 'the wave-washed ledge at 0.5 m stays bare');
  assert.equal(greeneryAnchors(wall, [0, 1, 2], 30, seededRng(3, 'h')).length, 0, 'a bare wall gets none');
});

test('anchors are deterministic per seed', () => {
  const positions = quad(0, 50, 4, 0, 50), index = sequential(positions);
  const a = greeneryAnchors(positions, index, 12, seededRng(5, 'x'));
  assert.deepEqual(a, greeneryAnchors(positions, index, 12, seededRng(5, 'x')));
  assert.notDeepEqual(a, greeneryAnchors(positions, index, 12, seededRng(6, 'x')));
});

const standardShader = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader });

test('greenTops blends grass into a scan material by world up-ness, after the normal map, and keeps its own program', () => {
  const material = new THREE.MeshStandardMaterial(), plain = new THREE.MeshStandardMaterial();
  greenTops(material);
  assert.notEqual(material.customProgramCacheKey(), plain.customProgramCacheKey(), 'never shares the unpatched program');
  const shader = standardShader();
  material.onBeforeCompile(shader, null);
  const frag = shader.fragmentShader, at = frag.indexOf('inverseTransformDirection( normal, viewMatrix )');
  assert.ok(at > frag.indexOf('#include <normal_fragment_maps>'), 'reads the normal-mapped normal: the scan detail shapes the grass edge');
  assert.ok(at < frag.indexOf('#include <lights_physical_fragment>'), 'changes the albedo before lighting');
  assert.match(frag, /diffuseColor\.rgb = mix\( diffuseColor\.rgb/);
  assert.match(shader.vertexShader, /instanceMatrix \* vec4\( transformed, 1\.0 \)/, 'the pattern is fixed to the piece, not to the moving layer');
  const again = material.onBeforeCompile;
  greenTops(material);
  assert.equal(material.onBeforeCompile, again, 'patching twice is a no-op (the cache shares materials between attaches)');
  assert.throws(() => material.onBeforeCompile({ ...standardShader(), fragmentShader: 'void main() {}' }, null), /three shader chunks moved/);
});

const handle = (id, log, root = new THREE.Group()) => ({ kind: 'model', id, instance: () => root.clone(true), release: () => log.push(`release ${id}`) });
const fallback = id => ({ kind: 'fallback', id, fallback: 'procedural-scenery', reason: 'network' });

test('the scenery load brings the greenery GLB along: one instance tree, one release for both', async () => {
  const log = [], shrubs = new THREE.Group();
  shrubs.add(Object.assign(new THREE.Group(), { name: 'shrub_a' }));
  const cache = withGreenery({ load: async (id, options) => { log.push(`load ${id} ${options?.signal ? 'signal' : ''}`); return handle(id, log, id === GREENERY_ID ? shrubs : undefined); } });
  const result = await cache.load('coast-scenery', { signal: new AbortController().signal });
  assert.deepEqual(log.sort(), [`load ${GREENERY_ID} signal`, 'load coast-scenery signal']);
  assert.equal(result.kind, 'model');
  assert.equal(result.id, 'coast-scenery');
  assert.ok(result.instance().getObjectByName('shrub_a'), 'the shrub nodes ride in the scenery tree');
  result.release();
  assert.deepEqual(log.slice(-2).sort(), [`release ${GREENERY_ID}`, 'release coast-scenery']);
  assert.deepEqual(await withGreenery({ load: async id => handle(id, log) }).load('roadster2').then(r => r.id), 'roadster2', 'other models pass through');
});

test('a failed greenery load keeps the scan coast; a failed scenery load frees the greenery', async () => {
  const log = [], warn = console.warn;
  console.warn = () => {};
  try {
    const bare = await withGreenery({ load: async id => (id === GREENERY_ID ? fallback(id) : handle(id, log)) }).load('coast-scenery');
    assert.equal(bare.kind, 'model');
    assert.equal(bare.instance().children.length, 0, 'the scans alone');
    const thrown = await withGreenery({ load: async id => { if (id === GREENERY_ID) throw new Error('boom'); return handle(id, log); } }).load('coast-scenery');
    assert.equal(thrown.kind, 'model');
    const none = await withGreenery({ load: async id => (id === GREENERY_ID ? handle(id, log) : fallback(id)) }).load('coast-scenery');
    assert.equal(none.kind, 'fallback');
    assert.deepEqual(log, [`release ${GREENERY_ID}`]);
    await assert.rejects(withGreenery({ load: async id => { if (id === GREENERY_ID) return handle(id, log); throw new DOMException('aborted', 'AbortError'); } }).load('coast-scenery'), /aborted/);
    await new Promise(resolve => setTimeout(resolve));
    assert.deepEqual(log, [`release ${GREENERY_ID}`, `release ${GREENERY_ID}`], 'an aborted scenery load leaks no greenery handle');
  } finally { console.warn = warn; }
});

const road = { point: (d, lane = 0) => [lane, -d], heading: () => 0 };
/** Stand-in for coast-scenery.glb plus the greenery nodes: 8 m tall cliffs (top face at y = 8), 2 m shrub cards. */
function fakeCoast(shrubs = GREENERY_SHRUBS) {
  const root = new THREE.Group(), small = new THREE.BoxGeometry(1, 1, 1), tall = new THREE.BoxGeometry(2, 8, 2);
  const mat = name => Object.assign(new THREE.MeshStandardMaterial(), { name });
  const rock = mat('coast_rock'), other = mat('other');
  for (const piece of COAST_PIECES) {
    const cliff = piece.startsWith('cliff_');
    const mesh = Object.assign(new THREE.Mesh(cliff ? tall : small, cliff ? mat(`coast_${piece}`) : piece.startsWith('rock_') ? rock : other), { name: piece });
    if (cliff) mesh.position.y = 4;
    root.add(mesh);
  }
  const leaf = mat('coast_shrub'), card = new THREE.PlaneGeometry(2, 2).translate(0, 1, 0);
  for (const name of shrubs) root.add(Object.assign(new THREE.Mesh(card, leaf), { name }));
  return root;
}
const instanced = (kit, names) => kit.group.children.filter(o => o.isInstancedMesh && names.includes(o.name));
const matrices = mesh => Array.from({ length: mesh.count }, (_, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; });

test('shrubs stand on the top of every cliff in the window, follow it down the road and leave with Low', () => {
  const kit = createCoastScenery(new THREE.Scene());
  kit.attachModel(fakeCoast());
  kit.update(road, 0, 'high');
  const cliffs = () => instanced(kit, ['cliff_a', 'cliff_b']).flatMap(matrices), shrubs = () => instanced(kit, GREENERY_SHRUBS);
  assert.equal(shrubs().length, GREENERY_SHRUBS.length, 'one instanced draw per shrub variant');
  const onACliffTop = shrub => cliffs().some(cliff => {
    const p = new THREE.Vector3().setFromMatrixPosition(shrub).applyMatrix4(cliff.clone().invert()); // cliff geometry space: top at y = 4
    return Math.abs(p.x) <= 1 && Math.abs(p.z) <= 1 && p.y <= 4 + 1e-4 && p.y > 3.7;
  });
  const first = shrubs().flatMap(matrices);
  assert.ok(first.length >= cliffs().length * 30, `a full fringe per cliff, got ${first.length} for ${cliffs().length} cliffs`);
  assert.ok(first.every(onACliffTop), 'every shrub is rooted on a cliff top');
  const sizes = first.map(m => m.getMaxScaleOnAxis());
  assert.ok(Math.max(...sizes) > 4 * Math.min(...sizes), 'shrubs grow with their cliff: headlands carry canopy-size clumps');
  assert.ok(shrubs().every(mesh => mesh.visible && !mesh.frustumCulled));
  kit.update(road, 1400, 'high');
  const later = shrubs().flatMap(matrices);
  assert.notDeepEqual(later[0].elements, first[0].elements, 'replaced with the window');
  assert.ok(later.every(onACliffTop));
  kit.update(road, 1400, 'low');
  assert.ok(shrubs().every(mesh => !mesh.visible), 'Low keeps the procedural coast');
  kit.detachModel();
  assert.equal(shrubs().length, 0);
});

test('the scan rock materials get the grass blend; palms and rails do not; a GLB without shrub nodes still attaches', () => {
  const kit = createCoastScenery(new THREE.Scene()), source = fakeCoast([]);
  kit.attachModel(source);
  kit.update(road, 0, 'medium');
  assert.equal(instanced(kit, GREENERY_SHRUBS).length, 0);
  const plain = new THREE.MeshStandardMaterial().customProgramCacheKey();
  for (const piece of ['cliff_a', 'cliff_b', 'rock_a']) assert.notEqual(source.getObjectByName(piece).material.customProgramCacheKey(), plain, piece);
  assert.equal(source.getObjectByName('palm_a').material.customProgramCacheKey(), plain);
});

test('the greenery manifest entry names the shrub nodes the runtime instances, as CC0 scans with a no-shrub fallback', () => {
  const entry = MODEL_MANIFEST[GREENERY_ID];
  assert.deepEqual(entry.nodes, [...GREENERY_SHRUBS]);
  assert.equal(entry.license.id, 'CC0-1.0');
  assert.equal(entry.fallback, 'procedural-scenery');
});
