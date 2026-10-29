import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { THEMED_TRACKS, themedPlacements } from '../src/track-themes.ts';
import { courseSafetyIssues } from '../src/hazard-safety.ts';

// 11A acceptance across every themed track, through the real simulation.
const themed = trackId => createRace(trackId, { mode: 'custom', themes: true, rivals: 0, traffic: 'off' });
const drive = (race, seconds, input = { throttle: true, nitro: true }) => {
  startRace(race);
  for (let i = 0; i < seconds * 60 && race.phase !== 'finished'; i++) stepRace(race, input, 1 / 60);
  return race;
};

test('11A deterministic placement: the same track and rules always build the same hazards', () => {
  for (const trackId of THEMED_TRACKS) {
    const a = themed(trackId), b = themed(trackId);
    assert.ok(a.hazards.length > 0, trackId);
    assert.deepEqual(a.hazards, b.hazards, trackId);
    assert.deepEqual(courseSafetyIssues(themedPlacements(trackId)), [], `${trackId}: no impossible gates`);
  }
});

test('11A cross-frame sweeps: a full-NITRO run resolves every hazard it drives past, exactly once', () => {
  for (const trackId of THEMED_TRACKS) {
    const race = drive(themed(trackId), 90);
    const behind = race.hazards.filter(h => h.distance < race.player.distance);
    assert.ok(behind.length > 0, `${trackId}: the run reached its hazards`);
    for (const h of behind) assert.ok(h.hit !== h.passed, `${trackId} ${h.id ?? h.distance}: resolved exactly once`);
  }
});

test('11A no device-specific differences: identical inputs give identical races', () => {
  for (const trackId of THEMED_TRACKS) {
    const a = drive(themed(trackId), 40), b = drive(themed(trackId), 40);
    assert.deepEqual([a.player.distance, a.player.x, a.player.score, a.player.collisions], [b.player.distance, b.player.x, b.player.score, b.player.collisions], trackId);
  }
  // The simulation path never reads the device, viewport or input method.
  for (const file of ['game.js', 'hazards.ts', 'hazard-race.ts', 'hazard-behavior.ts', 'hazard-schema.ts', 'hazard-safety.ts', 'object-catalog.ts', 'track-themes.ts', 'car-collisions.js', 'ring-layout.ts', 'risk-lines.ts', 'gauntlet-course.ts']) {
    assert.doesNotMatch(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'), /navigator|matchMedia|devicePixelRatio|ontouch|window\./, file);
  }
});

test('11A out-of-range cleanup: hazards left behind stop being drawn', async () => {
  const THREE = await import('three');
  const { createHazardRenderer } = await import('../src/hazard-render.ts');
  const scene = new THREE.Scene();
  const instances = (g, m, n, s) => { const mesh = new THREE.InstancedMesh(g, m, n); s.add(mesh); return mesh; };
  const r = createHazardRenderer(scene, new THREE.BoxGeometry(), instances, (mesh, i) => mesh.setMatrixAt(i, new THREE.Matrix4()), (_id, s, x, y, o) => [x, y, o - s]);
  const race = themed(THEMED_TRACKS[0]);
  const drawn = () => ['gauntlet-barriers', 'hazard-gusts', 'hazard-surfaces'].reduce((n, name) => n + scene.getObjectByName(name).count, 0);
  r.update(race, race.trackId, race.hazards[0].distance - 10, 0, false);
  assert.ok(drawn() > 0);
  r.update(race, race.trackId, RACE_TRACKS[race.trackId].length + 100, 0, false);
  assert.equal(drawn(), 0);
});
