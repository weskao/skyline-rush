import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { seededRng } from '../src/rng.ts';
import { trackLocalPosition, trackFrame, trackPoint } from '../src/track-paths.ts';
import { courseItemPoint } from '../src/course-items.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';

// The effects `worldPoint(s, x, y, origin, item, out)` contract: it may write into `out` and return it
// instead of allocating a point per particle placement. Callers always use the returned array.

test('trackLocalPosition and courseItemPoint write into out and match the allocating result', () => {
  for (const [id, s, x, y, o] of [['tokyo', 900, 3, 1.2, 870], ['spiral', 1500, -2, 4, 1480], [FROSTBITE_ID, 2000, 1, 0, 1950], ['coastal', 50, 0, 0, 0]]) {
    const out = [7, 7, 7], fresh = trackLocalPosition(id, s, x, y, o);
    assert.equal(trackLocalPosition(id, s, x, y, o, false, out), out, `${id} returns out`);
    assert.deepEqual(out, fresh, `${id} identical point`);
  }
  const id = Object.keys(COURSE_RUNTIMES)[0], race = createRace(id, { mode: 'classic' }), item = race.rings[3], origin = [10, -4, 2];
  const out = [0, 0, 0], fresh = courseItemPoint(race.course, item, item.x, item.altitude, origin);
  assert.equal(courseItemPoint(race.course, item, item.x, item.altitude, origin, out), out);
  assert.deepEqual(out, fresh);
});

// Seeded race on a framed road: one effects instance gets an allocating worldPoint (the old contract), the
// other an out-param one. Every particle, ring and marker position must match on every frame.
function run(t, outParam) {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), trackId = 'tokyo', outs = new Set();
  const effects = createEffects(scene, s => trackPoint(trackId, s).x);
  const race = createRace(trackId, { mode: 'custom', rivals: 3, traffic: 'off' });
  t.mock.method(Math, 'random', seededRng(90, 'world-point-out')); // after createRace: its layout cache makes its draws vary
  race.phase = 'racing';
  const worldPoint = outParam
    ? (s, x, y, o, item, out) => { outs.add(out); return trackLocalPosition(trackId, s, x, y, o, false, out); }
    : (s, x, y, o) => trackLocalPosition(trackId, s, x, y, o);
  const options = { enabled: true, quality: 'high', worldPoint, worldFrame: s => trackFrame(trackId, s) };
  const frames = [];
  for (let i = 0; i < 160; i++) {
    const p = race.player;
    p.distance = 400 + i * 0.7; race.elapsed += 1 / 60;
    Object.assign(p, { speed: 60, thrusting: i % 40 < 30, boosting: i % 90 < 60, nitroTime: i % 120 < 50 ? 1 : 0, nitroBurst: 2, altitude: i % 70 < 20 ? 3 : 0 });
    p.effects = { ...p.effects, magnet: i % 100 < 40 ? 1 : 0 };
    if (i % 50 === 0) p.landing = { speed: 8, time: race.elapsed, distance: p.distance, x: 0, chain: 1 };
    if (i % 60 === 10) { const ring = race.rings.find(r => r.distance > p.distance); if (ring) ring.hit = true; }
    const origin = trackPoint(trackId, p.distance);
    effects.update(race, 1 / 60, origin.x, false, false, null, options, origin);
    const meshes = [];
    scene.traverse(o => { if (o.visible && (o.isMesh || o.isInstancedMesh)) meshes.push(...o.position.toArray(), ...(o.instanceMatrix?.array ?? [])); });
    frames.push([...scene.children.find(o => o.isPoints).geometry.attributes.position.array, ...meshes]);
  }
  return { frames, outs };
}

test('effects place particles, rings and markers identically through an out-param worldPoint', t => {
  const fresh = run(t, false), reused = run(t, true);
  assert.ok(reused.outs.size > 0 && [...reused.outs].every(Array.isArray), 'effects passes a reusable out array');
  assert.ok(reused.outs.size <= 2, `a fixed scratch array, not one per call (${reused.outs.size})`);
  assert.ok(fresh.frames.some(f => f.some(v => v !== 0)), 'the scenario draws something');
  for (let i = 0; i < fresh.frames.length; i++) assert.deepEqual(reused.frames[i], fresh.frames[i], `frame ${i}`);
});

test('world.js hands effects one hoisted options object, not a spread and closures per frame', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  const call = world.slice(world.indexOf('effects.update(race'), world.indexOf('warmupPending = true; // loaded pickup'));
  assert.doesNotMatch(call, /\{\s*\.\.\.effectsVisual/, 'no per-frame spread of the visual settings');
  assert.doesNotMatch(call, /=>/, 'no per-frame closures');
});
