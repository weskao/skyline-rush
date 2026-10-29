import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');

test('ENV-06 hazard drawing lives in its own renderer module', async () => {
  const { createHazardRenderer } = await import('../src/hazard-render.ts');
  assert.equal(typeof createHazardRenderer, 'function');
  assert.doesNotMatch(world, /one distinct marker per reachable barrier/);
  assert.match(world, /createHazardRenderer\(/);
});

const THREE = await import('three');
const { createHazardRenderer, HAZARD_POOLS } = await import('../src/hazard-render.ts');
const { validateHazardPlacement } = await import('../src/hazard-schema.ts');
const { THEMED_TRACKS, raceHazards } = await import('../src/track-themes.ts');
const { RACE_TRACKS, LANES } = await import('../src/game.js');

const instances = (geometry, material, count, scene) => { const m = new THREE.InstancedMesh(geometry, material, count); scene.add(m); return m; };
const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
const put = (mesh, i, x, y, z, sx, sy, sz, angle = 0) => mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle), new THREE.Vector3(sx, sy, sz)));
const place = (_id, s, x, y, origin) => [x, y, origin - s];
const entry = (type, distance, extra = {}) => {
  const placement = validateHazardPlacement({ id: `r-${type}-${distance}`, trackId: 'coast', distance, lateralOffset: 2.5, altitude: 0, type,
    triggerWindow: { from: distance - 60, to: distance + 20 }, warningLeadSeconds: 1.5, movementPattern: { kind: 'static' }, difficulty: 'standard', seed: 3, ...extra });
  return { id: placement.id, type, distance, x: 2.5, altitude: 0, hit: false, passed: false, moving: false, phase: 0, speed: 0,
    halfWidth: placement.hitbox.halfWidth, halfLength: placement.hitbox.halfLength, height: placement.hitbox.height, placement };
};
const setup = () => { const scene = new THREE.Scene(); const r = createHazardRenderer(scene, new THREE.BoxGeometry(), instances, put, place); return { scene, r, mesh: name => scene.getObjectByName(name) }; };

test('ENV-05 each effect has its own colour and silhouette, all attached before racing', () => {
  const { mesh } = setup();
  const walls = mesh('gauntlet-barriers'), gusts = mesh('hazard-gusts'), surfaces = mesh('hazard-surfaces');
  for (const m of [walls, gusts, surfaces]) assert.ok(m?.isInstancedMesh && m.count === 0, 'pooled and present for shader warm-up');
  assert.notEqual(gusts.geometry, walls.geometry, 'a gust is an arrow, not a wall');
  assert.notEqual(surfaces.material.color.getHex(), walls.material.color.getHex());
  assert.notEqual(gusts.material.color.getHex(), surfaces.material.color.getHex());
});

test('ENV-05 the renderer routes each hazard to its pool and skips triggers and off-phase barriers', () => {
  const { r, mesh } = setup();
  const race = { elapsed: 2.5, hazards: [entry('barrier', 100), entry('gust', 110), entry('terrain', 120), entry('checkpoint', 130),
    entry('energy-barrier', 140, { movementPattern: { kind: 'pulse', period: 4, phase: 0 } })] };
  r.update(race, 'coast', 50, 0, false);
  assert.deepEqual(['gauntlet-barriers', 'hazard-gusts', 'hazard-surfaces'].map(n => mesh(n).count), [1, 1, 1]);
  const at = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), rq = new THREE.Quaternion();
  mesh('hazard-surfaces').getMatrixAt(0, at); at.decompose(p, rq, s);
  assert.ok(p.y < 0.1 && s.y < 0.1, 'ice and rough ground lie flat on the road');
  r.update(race, 'coast', 50, 0, true);
  assert.deepEqual(['gauntlet-barriers', 'hazard-gusts', 'hazard-surfaces'].map(n => mesh(n).count), [0, 0, 0], 'previews draw none');
});

test('ENV-06 pools hold the busiest stretch of every themed and generated course, so no solid hazard is ever undrawn', () => {
  for (const trackId of Object.keys(RACE_TRACKS)) for (const config of [{ mode: 'custom', themes: true }, { mode: 'gauntlet', hazardTier: 'extreme', themes: true }, { mode: 'custom', hazards: 'extreme', themes: true }]) {
    const hazards = raceHazards(trackId, { ...RACE_TRACKS[trackId], seed: RACE_TRACKS[trackId].seed }, LANES, config);
    const pool = h => h.placement ? { block: 'block', push: 'push', slow: 'slow' }[OBJECT_CATALOG[h.placement.type].effect] : 'block';
    for (const h of hazards) {
      const window = hazards.filter(o => o.distance >= h.distance - 16 && o.distance <= h.distance + 566);
      for (const kind of ['block', 'push', 'slow']) assert.ok(window.filter(o => pool(o) === kind).length <= HAZARD_POOLS[kind], `${trackId} ${config.mode} ${kind} near ${h.distance}`);
    }
  }
});
const { OBJECT_CATALOG } = await import('../src/object-catalog.ts');

test('ENV-06 the per-frame path allocates no three.js objects and ignores the quality tier', () => {
  const source = readFileSync(new URL('../src/hazard-render.ts', import.meta.url), 'utf8');
  const update = source.slice(source.indexOf('    update('));
  assert.doesNotMatch(update, /new THREE\./, 'materials and geometry are built once at setup');
  assert.doesNotMatch(source, /quality/i, 'hazards are gameplay: drawn the same on Low, Medium and High');
});

test('13C ice and rough ground differ from walls by shape and brightness, not colour alone', () => {
  const { mesh } = setup();
  const walls = mesh('gauntlet-barriers'), surfaces = mesh('hazard-surfaces');
  assert.notEqual(surfaces.geometry, walls.geometry, 'a striped plate, not a recoloured wall');
  assert.ok(surfaces.geometry.attributes.position.count > walls.geometry.attributes.position.count, 'raised stripes on a plate');
  const colors = surfaces.geometry.attributes.color;
  assert.ok(colors && surfaces.material.vertexColors, 'the stripe pattern is built into the geometry, not a texture');
  const lum = i => 0.2126 * colors.getX(i) + 0.7152 * colors.getY(i) + 0.0722 * colors.getZ(i);
  const levels = Array.from({ length: colors.count }, (_, i) => lum(i));
  assert.ok(Math.max(...levels) - Math.min(...levels) > 0.4, 'stripes contrast in brightness, readable without colour vision');
});

test('13C reduced motion: hazard visuals carry no decorative motion, only the simulated pose', () => {
  const source = readFileSync(new URL('../src/hazard-render.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /performance\.now|Date\.now|clock|requestAnimationFrame/, 'no wall-clock-driven glow, bob or spin');
  const { r, mesh } = setup();
  const race = { elapsed: 1, hazards: [entry('gust', 110), entry('terrain', 120), entry('barrier', 130)] };
  const snapshot = () => ['gauntlet-barriers', 'hazard-gusts', 'hazard-surfaces'].map(n => Array.from(mesh(n).instanceMatrix.array.slice(0, 16)));
  r.update(race, 'coast', 50, 0, false);
  const first = snapshot();
  r.update(race, 'coast', 50, 0, false);
  assert.deepEqual(snapshot(), first, 'the same race state always draws the same frame');
});

test('ENV-04 branch markers are drawn as a road-wide gantry whose arrow points at the risky side', () => {
  const { r, mesh } = setup();
  const markers = mesh('hazard-markers');
  assert.ok(markers?.isInstancedMesh && markers.count === 0, 'pooled and present for shader warm-up');
  assert.notEqual(markers.geometry, mesh('gauntlet-barriers').geometry);
  const at = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), rq = new THREE.Quaternion();
  const yaw = seed => {
    r.update({ elapsed: 0, hazards: [entry('branch-marker', 100, { seed })] }, 'coast', 50, 0, false);
    assert.equal(markers.count, 1);
    assert.equal(mesh('gauntlet-barriers').count, 0, 'a sign is never drawn as a wall');
    markers.getMatrixAt(0, at); at.decompose(p, rq, s);
    assert.equal(p.x, 0, 'spans the road from its centre');
    return 2 * Math.atan2(rq.y, rq.w);
  };
  assert.ok(Math.abs(yaw(3)) < 1e-6, 'odd seed: arrow points +x (right)');
  assert.ok(Math.abs(Math.abs(yaw(4)) - Math.PI) < 1e-6, 'even seed: turned to point left');
  r.update({ elapsed: 0, hazards: [] }, 'coast', 50, 0, false);
  assert.equal(markers.count, 0);
});

test('ENV-06 the per-frame path reuses one pose object instead of allocating one per hazard', async () => {
  const { hazardPose } = await import('../src/hazard-race.ts');
  const source = readFileSync(new URL('../src/hazard-render.ts', import.meta.url), 'utf8');
  const update = source.slice(source.indexOf('    update('));
  assert.match(update, /hazardPose\(hazard, race\.elapsed, pose\)/, 'update() hands hazardPose its reused pose');
  assert.match(source.slice(0, source.indexOf('    update(')), /const pose = \{/, 'the pose is built once at setup');
  const pose = { x: 0, altitude: 0, active: true };
  const generated = { distance: 100, x: 2.5, altitude: 0, hit: false, passed: false, moving: true, phase: 0, speed: 1.05 };
  for (const hazard of [generated, entry('gust', 110), entry('gate', 120, { movementPattern: { kind: 'sweep', amplitude: 1.2, period: 4, phase: 0 } })])
    for (const t of [0, 1.3, 2.7]) {
      assert.equal(hazardPose(hazard, t, pose), pose, 'written in place');
      assert.deepEqual({ ...pose }, hazardPose(hazard, t), 'the same pose the simulation resolves');
    }
});
