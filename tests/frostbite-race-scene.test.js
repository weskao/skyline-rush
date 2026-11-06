import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrostbiteRaceScene, ROAD_HALF } from '../src/frostbite-race-scene.ts';
import { FROSTBITE_TRACK, frostbiteFrame } from '../src/courses/frostbite-race.ts';
import { SHORTCUT_TOLERANCE, shortcutPylons } from '../src/game.js';

const scene = new THREE.Scene();
const race = createFrostbiteRaceScene(scene);
race.group.updateMatrixWorld(true);
const named = name => { const found = []; race.group.traverse(o => { if (o.name === name) found.push(o); }); return found; };
const down = new THREE.Vector3(0, -1, 0);

test('the drawn road is the simulation road: every lane point lies on a race-road triangle at the frame height', () => {
  const roads = named('race-road');
  for (let s = 3; s < FROSTBITE_TRACK.length; s += 47) for (const lateral of [-10.2, 0, 10.2]) {
    const f = frostbiteFrame(s), x = f.point.x + f.right[0] * lateral, z = f.point.z + f.right[2] * lateral;
    const hit = new THREE.Raycaster(new THREE.Vector3(x, f.point.y + 30, z), down).intersectObjects(roads)[0];
    assert.ok(hit && Math.abs(hit.point.y - f.point.y) < .05, `road at ${s}/${lateral}: ${hit?.point.y} vs ${f.point.y}`);
  }
});

test('no terrain, deck or landmark covers the driving line anywhere, including the hairpins', () => {
  const blockers = [...named('canyon-terrain'), ...named('ice-arch'), ...named('crystal-sentinels'), ...named('cyan-crystals')];
  let buried = 0;
  for (let s = 2; s < FROSTBITE_TRACK.length; s += 9) for (const lateral of [-ROAD_HALF + .5, 0, ROAD_HALF - .5]) {
    const f = frostbiteFrame(s), x = f.point.x + f.right[0] * lateral, z = f.point.z + f.right[2] * lateral;
    // From 8 m above the road: anything hit before the road surface would block a car (2 m tall) or the chase camera.
    const hit = new THREE.Raycaster(new THREE.Vector3(x, f.point.y + 8, z), down, 0, 7.95).intersectObjects(blockers, true)[0];
    if (hit) buried++;
  }
  assert.equal(buried, 0);
});

test('shortcut ice decks and pylons sit at the section x/altitude the simulation tests', () => {
  const decks = named('shortcut-ice-decks'), [pylons] = named('shortcut-pylons');
  const sections = FROSTBITE_TRACK.sections.filter(s => s.type === 'shortcut');
  for (const s of sections) {
    const f = frostbiteFrame((s.from + s.to) / 2, s.span), x = f.point.x + f.right[0] * s.x, z = f.point.z + f.right[2] * s.x;
    const hit = new THREE.Raycaster(new THREE.Vector3(x, f.point.y + 30, z), down).intersectObjects(decks)[0];
    assert.ok(hit && Math.abs(hit.point.y - (f.point.y + s.altitude - SHORTCUT_TOLERANCE)) < .05);
  }
  const spots = sections.flatMap(s => shortcutPylons(s).map(p => ({ ...p, span: s.span }))), m = new THREE.Matrix4(), p = new THREE.Vector3();
  assert.equal(pylons.count, spots.length);
  spots.forEach((spot, i) => {
    const f = frostbiteFrame(spot.distance, spot.span); // the Rift corridor is drawn on its span
    pylons.getMatrixAt(i, m); p.setFromMatrixPosition(m);
    assert.ok(p.distanceTo(new THREE.Vector3(f.point.x + f.right[0] * spot.x, f.point.y + spot.altitude, f.point.z + f.right[2] * spot.x)) < 1e-3); // float32 matrices
  });
});

test('chunks are culled by distance from the car, the origin follows the race frame, and dispose frees GPU data', () => {
  const chunks = race.group.children.filter(c => c.name.startsWith('frostbite-chunk-') || c.name.startsWith('frostbite-tile-'));
  assert.ok(chunks.length >= 40);
  race.update(800);
  const p = frostbiteFrame(800).point;
  assert.deepEqual(race.group.position.toArray(), [-p.x, -p.y, -p.z]);
  const shown = chunks.filter(c => c.visible).length;
  assert.ok(shown >= 4 && shown < chunks.length / 2, `visible chunks ${shown}/${chunks.length}`);
  assert.equal(chunks[0].visible, true);
  assert.equal(chunks.find(c => c.name === 'frostbite-chunk-13200').visible, false);
  let disposed = 0;
  race.group.traverse(o => { if (o.geometry) o.geometry.addEventListener('dispose', () => disposed++); });
  race.dispose();
  assert.ok(disposed > chunks.length); // each tile, road + paint per chunk, decks, pylons, landmarks
  assert.equal(race.group.parent, null);
});
