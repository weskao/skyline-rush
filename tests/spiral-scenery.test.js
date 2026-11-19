// Task 8c: the Sky Spiral landmark kit on the course sky-scene.js builds. It stands in for the procedural tower,
// skyline and fog banks only while it is drawn (rule items 13 and 28): Low, a failed load and a kit without one of its
// nodes keep the procedural scene. Every piece is an instance of one of twelve pooled meshes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Color, FogExp2, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Scene, Vector3 } from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createSpiralLook } from '../src/spiral-look.ts';
import { readFileSync } from 'node:fs';
import { SPIRAL_EMISSIVE, SPIRAL_TRIM } from '../src/spiral-scenery.ts';
import { SPIRAL_NODES, SPIRAL_NODE_RADIUS, spiralSceneryPlan } from '../src/spiral-scenery-plan.ts';
import { createCoastAssets } from '../src/coast-assets.ts';
import { COAST_ENV_VARIANTS, coastEnvPlan } from '../src/coast-lighting.ts';
import { detailedTrackLook, trackLook } from '../src/track-look.ts';
import { skyPoint, SKY_LENGTH } from '../src/sky-track.ts';

const NODES = [...SPIRAL_NODES, 'tower', 'tower_far'];
/** A stand-in for spiral-landmarks.glb: every node a mesh on the kit's one material. */
function fakeGlb({ without } = {}) {
  const root = new Group(), material = new MeshStandardMaterial({ name: 'spiral_kit' }), geometry = new BoxGeometry();
  for (const node of NODES) if (node !== without) root.add(Object.assign(new Mesh(geometry, material), { name: node }));
  return root;
}
function rig() {
  const scene = new Scene();
  scene.background = new Color('#302657');
  scene.fog = new FogExp2('#302657', .0013);
  const home = new Mesh(), dome = new Object3D(), course = createSkyScene(scene), parts = course.parts;
  home.add(dome);
  return { scene, course, parts, look: createSpiralLook({ parts, dome, home, scene }) };
}
const kitMeshes = parts => { const found = []; parts.group.traverse(o => { if (o.isInstancedMesh && NODES.includes(o.name)) found.push(o); }); return found; };
const hex = color => `#${color.getHexString()}`;

test('Sky Spiral names its landmark kit; Low has no detailed look', () => {
  assert.equal(trackLook('spiral').landmarks, 'spiral-landmarks');
  assert.equal(detailedTrackLook('spiral', 'low'), undefined);
  assert.equal(detailedTrackLook('spiral', 'medium').landmarks, 'spiral-landmarks');
});

test('the kit is twelve pooled draws on its one material, hidden until the look shows it', () => {
  const { course, parts, look } = rig(), source = fakeGlb();
  look.attachKit(source);
  const meshes = kitMeshes(parts);
  assert.deepEqual(meshes.map(mesh => mesh.name).sort(), [...NODES].sort(), 'one instanced mesh per node');
  for (const mesh of meshes) assert.equal(mesh.material, source.children[0].material, 'no material is added');
  const visible = mesh => { for (let o = mesh; o && o !== parts.group; o = o.parent) if (!o.visible) return false; return true; };
  assert.ok(meshes.every(mesh => !visible(mesh)), 'in the scene for the warmup, not drawn yet');
  assert.ok(parts.replaced.every(material => material.visible), 'the procedural tower still stands');
  look.update('spiral', 'track', 'high', true);
  course.update(0);
  assert.ok(meshes.filter(visible).length === 11, 'ten kinds of piece and one of the two tower nodes');
  look.detachKit();
  assert.deepEqual(kitMeshes(parts), [], 'leaves the scene before the cache frees the GLB');
});

test('the procedural tower, skyline and fog banks leave only while the kit is drawn, and the trim takes the day palette', () => {
  const { course, parts, look } = rig();
  const before = { beacons: hex(parts.trim.beacons.color), rails: hex(parts.trim.rails.color), lanes: hex(parts.trim.lanes.color) };
  const trim = () => ({ beacons: hex(parts.trim.beacons.color), rails: hex(parts.trim.rails.color), lanes: hex(parts.trim.lanes.color) });
  assert.equal(parts.replaced.length, 7, 'tower, core, two halo colours, skyline blocks, skyline lights, fog banks');
  const beaconMesh = parts.group.children.find(o => o.isInstancedMesh && o.material === parts.trim.beacons);
  assert.ok(beaconMesh && !parts.replaced.includes(parts.trim.beacons), 'the skyline lights no longer share the rail beacons\' material');
  look.update('spiral', 'track', 'high', true);
  assert.ok(parts.replaced.every(material => material.visible), 'the kit is still loading: nothing leaves');
  look.attachKit(fakeGlb());
  look.update('spiral', 'track', 'high', true);
  course.update(1650);
  assert.ok(parts.replaced.every(material => !material.visible));
  assert.equal(parts.trim.beacons.visible, true);
  assert.deepEqual(trim(), { beacons: hex(parts.trim.accent.color), rails: SPIRAL_TRIM.rails, lanes: SPIRAL_TRIM.lanes });
  look.update('spiral', 'track', 'low', false); // Low: the host no longer wants the kit
  assert.ok(parts.replaced.every(material => material.visible), 'Low keeps the procedural scene');
  assert.deepEqual(trim(), before);
  assert.equal(parts.stream, undefined, 'no streaming work while hidden');
  look.update('spiral', 'night', 'medium', true);
  assert.ok(parts.replaced.every(material => !material.visible), 'the kit is drawn on every preset of Medium and above');
  look.dispose();
  assert.ok(parts.replaced.every(material => material.visible));
  assert.deepEqual(trim(), before);
});

test('pieces stand where the plan puts them, and only those near the car are drawn', () => {
  const { course, parts, look } = rig();
  look.attachKit(fakeGlb());
  look.update('spiral', 'track', 'high', true);
  const pools = new Map(kitMeshes(parts).map(mesh => [mesh.name, mesh])), plan = spiralSceneryPlan();
  const drawn = () => SPIRAL_NODES.reduce((sum, node) => sum + pools.get(node).count, 0);
  const within = at => plan.filter(p => Math.hypot(p.x - at.x, p.z - at.z) <= 2600 + SPIRAL_NODE_RADIUS[p.node] * p.scale);
  const seen = new Set(), matrix = new Matrix4(), position = new Vector3();
  for (let distance = 0; distance <= SKY_LENGTH; distance += 200) {
    course.update(distance);
    const expected = within(skyPoint(distance));
    assert.equal(drawn(), expected.length, `at ${distance} m`);
    for (const p of expected) seen.add(p);
  }
  assert.equal(seen.size, plan.length, 'every placement is drawn from somewhere on the lap');
  course.update(0);
  assert.ok(drawn() < plan.length, 'the far end of the lap is not drawn from the start');
  // The pieces ride under the road, which the course keeps in track space: an instance matrix is the placement itself.
  const station = plan.find(p => p.node === 'station'), mesh = pools.get('station');
  assert.equal(mesh.parent.parent, parts.road);
  const at = [];
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); at.push(position.setFromMatrixPosition(matrix).toArray().map(v => +v.toFixed(2))); }
  assert.ok(at.some(([x, y, z]) => Math.abs(x - station.x) < .01 && Math.abs(y - station.y) < .01 && Math.abs(z - station.z) < .01));
  const version = mesh.instanceMatrix.version;
  course.update(60);
  assert.equal(mesh.instanceMatrix.version, version, 'matrices are rewritten only when the 200 m sector changes');
});

test('the tower rides the landmark anchor: the full node near, the decimated one far', () => {
  const { course, parts, look } = rig();
  look.attachKit(fakeGlb());
  look.update('spiral', 'track', 'high', true);
  const [tower, far] = ['tower', 'tower_far'].map(name => kitMeshes(parts).find(mesh => mesh.name === name));
  assert.equal(tower.parent.parent, parts.landmark);
  course.update(0); // 1,850 m before the helix entry
  assert.deepEqual([tower.visible, far.visible], [false, true]);
  course.update(1650);
  assert.deepEqual([tower.visible, far.visible], [true, false], 'the approach frame of the look brief');
  course.update(2550);
  assert.deepEqual([tower.visible, far.visible], [true, false], 'mid-helix');
});

/** The asset host with the Sky Spiral target and a model cache the test resolves. */
function host(result) {
  const r = rig(), dataset = {};
  const assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {} }, spiral: r.look, dataset,
    cache: { load: id => id === 'spiral-landmarks' ? Promise.resolve(result) : new Promise(() => {}) },
  });
  const settle = async (...args) => { assets.update(...args); await new Promise(done => setTimeout(done, 0)); return assets.update(...args); };
  return { ...r, dataset, assets, settle };
}
const model = source => { let released = 0; return { kind: 'model', instance: () => source, release: () => { released++; }, get released() { return released; } }; };

test('the kit is required scenery: it joins before GO, never mid-race, and is warmed', async () => {
  const handle = model(fakeGlb()), { parts, dataset, assets, settle } = host(handle);
  assert.equal(assets.sceneryPending('spiral', 'low'), false, 'Low never waits for it');
  assert.equal(assets.sceneryPending('spiral', 'high'), true, 'the start waits for the kit');
  assert.equal(await settle('spiral', 'high', true), false);
  assert.equal(dataset.spiralLandmarks, 'waiting-for-race-end');
  assert.deepEqual(kitMeshes(parts), []);
  assert.equal(assets.update('spiral', 'high', false), true, 'its programs are compiled by the warmup');
  assert.equal(dataset.spiralLandmarks, 'attached');
  assert.equal(assets.sceneryPending('spiral', 'high'), false);
  assert.ok(parts.replaced.every(material => !material.visible));
  assets.update('spiral', 'low', false);
  assert.ok(parts.replaced.every(material => material.visible), 'Low');
  assets.update('spiral', 'medium', false);
  assert.ok(parts.replaced.every(material => !material.visible));
  assets.dispose();
  assert.deepEqual(kitMeshes(parts), []);
  assert.ok(parts.replaced.every(material => material.visible));
  assert.equal(handle.released, 1);
});

test('a kit that fails to load, or lacks a node, keeps the procedural scene and lets the race start', async t => {
  t.mock.method(console, 'warn', () => {});
  const failed = host({ kind: 'fallback', reason: 'offline', fallback: 'procedural' });
  assert.equal(await failed.settle('spiral', 'high', false), false);
  assert.equal(failed.dataset.spiralLandmarks, 'fallback:offline');
  assert.equal(failed.assets.sceneryPending('spiral', 'high'), false);
  assert.ok(failed.parts.replaced.every(material => material.visible));
  const handle = model(fakeGlb({ without: 'tower_far' })), broken = host(handle);
  assert.equal(await broken.settle('spiral', 'high', false), false);
  assert.equal(broken.dataset.spiralLandmarks, 'fallback:attach');
  assert.deepEqual(kitMeshes(broken.parts), [], 'half a kit never joins the scene');
  assert.ok(broken.parts.replaced.every(material => material.visible));
  assert.equal(handle.released, 1);
});

test('the blue trim lamps reach the day bloom without blowing out (rule items 21 and 22)', () => {
  const { parts } = rig(), { r, g, b } = parts.trim.accent.color;
  const threshold = COAST_ENV_VARIANTS[coastEnvPlan('spiral', 'track', 'high').variant].bloom.threshold;
  const luminance = .2126 * r + .7152 * g + .0722 * b; // the beacons take this colour while the kit is drawn
  assert.ok(luminance > threshold && luminance < threshold * 2, `${luminance} against ${threshold}`);
  const white = new Color(SPIRAL_TRIM.lanes), rails = new Color(SPIRAL_TRIM.rails);
  for (const color of [white, rails]) assert.ok(.2126 * color.r + .7152 * color.g + .0722 * color.b <= threshold, 'paint, not a lamp');
});

test('the kit\'s blue lamps land just over the day bloom and its windows under it (rule items 21 and 22)', () => {
  const { lamps } = JSON.parse(readFileSync(new URL('../assets-src/spiral-landmarks/contract.json', import.meta.url)));
  const threshold = COAST_ENV_VARIANTS[coastEnvPlan('spiral', 'track', 'high').variant].bloom.threshold;
  // The tower's strip is a large lit surface beside the car on the helix: over the bloom, never past a fifth over it.
  for (const lamp of ['strip', 'chevron', 'beacon']) {
    const lit = lamps[lamp].luminance * SPIRAL_EMISSIVE;
    assert.ok(lit >= threshold && lit <= threshold * 1.2, `${lamp}: ${lit.toFixed(3)} against ${threshold}`);
  }
  assert.ok(lamps.window.luminance * SPIRAL_EMISSIVE < threshold, 'windows glow, they do not bloom');
  const { parts, look } = rig(), source = fakeGlb();
  look.attachKit(source);
  assert.equal(source.children[0].material.emissiveIntensity, SPIRAL_EMISSIVE, 'the GLB stores strength 1: the layer sets it');
  assert.ok(kitMeshes(parts).length);
});
