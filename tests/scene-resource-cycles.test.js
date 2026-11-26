import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMeasuredCourseScenes, MEASURED_COURSE_IDS } from '../src/measured-course-scenes.ts';
import { createFrostbiteRaceScene } from '../src/frostbite-race-scene.ts';
import { createCourseRaceScene } from '../src/course-race-scene.ts';
import { createWorldTourScene } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';

// GPU-backed resources reachable from the scene, plus a dispose listener on each one ever seen.
function tracker(scene) {
  const disposed = new Set(), seen = new Set();
  const watch = resource => { if (seen.has(resource)) return; seen.add(resource); resource.addEventListener('dispose', () => disposed.add(resource)); };
  const reachable = () => {
    const out = new Set();
    scene.traverse(o => {
      if (o.geometry) out.add(o.geometry);
      for (const m of [].concat(o.material ?? [])) { out.add(m); for (const v of Object.values(m)) if (v?.isTexture) out.add(v); }
    });
    out.forEach(watch);
    return out;
  };
  return { reachable, seen, disposed };
}

test('switching tracks, restarting and returning never accumulates scene resources', () => {
  const scene = new THREE.Scene(), measured = createMeasuredCourseScenes(scene), frost = createFrostbiteRaceScene(scene);
  const course = createCourseRaceScene(scene), tour = createWorldTourScene(scene), t = tracker(scene);
  const dune = { trackId: 'dune-tempest', elapsed: 1, course: { spec: DUNE_TEMPEST_RACE,
    cars: new Map([['YOU', { travel: { currentEdgeId: DUNE_TEMPEST_RACE.graph.groundRoute[0], localS: 300 } }]]) } };
  const visit = (id, distance) => { // what world.js does each frame for one track
    measured.update(id, distance, distance / 30, false);
    if (id === 'frostbite-canyon') frost.update(distance); else frost.hide();
    course.update(id === 'dune-tempest' ? dune : { trackId: id }, 'high');
    tour.update(id, distance, 'high', RACE_TRACKS[id]?.sections ?? [], distance / 30);
  };
  const tracks = [...MEASURED_COURSE_IDS, 'frostbite-canyon', 'dune-tempest', 'taipei', 'tokyo'];
  // Undisposed = on screen, parked, or held by a shared kit cache. It may grow while the first visit
  // builds each track; after that, a cycle that adds any undisposed resource is an accumulation leak.
  const undisposed = [];
  try {
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const id of tracks) for (const distance of [40, 1500, 40]) { visit(id, distance); t.reachable(); } // restart = back to the grid
      undisposed.push(t.seen.size - t.disposed.size);
    }
    assert.deepEqual(undisposed.slice(1), Array(3).fill(undisposed[1]), `undisposed resources per cycle: ${undisposed}`);
    assert.ok(t.disposed.size > 0, 'streamed resources are released and rebuilt across the cycle');
  } finally { measured.dispose(); frost.dispose(); course.dispose(); tour.dispose(); }
});
