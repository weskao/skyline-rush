import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../src/courses/volcanic-crown-runtime-adapter.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { VOLCANIC_ID, VOLCANIC_TRACK, volcanicFrame, volcanicLeg } from '../src/courses/volcanic-crown-race.ts';
import { COURSE_TRACKS, RACE_TRACKS, raceTrack } from '../src/race-tracks.ts';
import { trackFrame, trackPoint, trackOverview } from '../src/track-paths.ts';
import { createRace, stepRace } from '../src/game.js';
import { isUpcomingEnterable as released } from '../src/access/production.ts';
import { isUpcomingEnterable as unlocked } from '../src/access/dev-unlocked.ts';
const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);
test('Volcanic Crown race length and FINISH follow authored CourseGraph', () => {
  assert.equal(VOLCANIC_ID, 'volcanic-crown');
  assert.ok(groundLength > 12000 && groundLength < 18000);
  assert.equal(VOLCANIC_TRACK.length, Math.floor(groundLength));
  assert.equal(VOLCANIC_TRACK.topology, 'course-graph');
  assert.equal(VOLCANIC_TRACK.topologyVersion, 1);
  assert.deepEqual(volcanicLeg(0), { edgeId: graph.groundRoute[0], localS: 0 });
  assert.equal(volcanicLeg(1e9).edgeId, graph.groundRoute.at(-1));
  const finish = trackPoint(VOLCANIC_ID, VOLCANIC_TRACK.length);
  const node = graph.nodes.find(n => n.id === graph.finish).at;
  assert.ok(Math.hypot(finish.x - node[0], finish.y - node[1], finish.z - node[2]) < 2);
});
test('arc-length samples share the authored road frame with no seams', () => {
  let offset = 0;
  for (const edge of graph.groundRoute) {
    const length = routeLength(graph, edge);
    for (const local of [0.5, length / 2, length - 0.5]) {
      const frame = volcanicFrame(offset + local), expected = sampleRoute(graph, edge, local);
      assert.equal(volcanicLeg(offset + local).edgeId, edge);
      assert.ok(Math.abs(volcanicLeg(offset + local).localS - local) < 1e-6);
      assert.ok(Math.hypot(frame.point.x - expected.point[0], frame.point.y - expected.point[1], frame.point.z - expected.point[2]) < 1e-6, edge);
      assert.ok(Math.abs(Math.hypot(...frame.forward) - 1) < 1e-8);
    }
    offset += length;
  }
  for (let s = 0; s < VOLCANIC_TRACK.length; s += 11) {
    const a = trackPoint(VOLCANIC_ID, s), b = trackPoint(VOLCANIC_ID, s + 1);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1.5, 'jump at ' + s);
  }
  assert.deepEqual(trackFrame(VOLCANIC_ID, 5000).forward, volcanicFrame(5000).forward);
  assert.equal(trackOverview(VOLCANIC_ID, 64).length, 64);
});
test('three forks map to safe ground edges, preserving measured arc-length ratios', () => {
  const sections = VOLCANIC_TRACK.sections.filter(s => s.type === 'shortcut');
  assert.equal(sections.length, 3);
  for (const [i, id] of ['rift-flight','vent-risk','gorge-flight'].entries()) {
    const risky = graph.edges.find(e => e.id === id);
    const safe = graph.edges.find(e => e.from === risky.from && e.to === risky.to && e.mode === 'ground');
    const section = sections[i];
    assert.equal(volcanicLeg(section.from + 1).edgeId, safe.id);
    assert.equal(volcanicLeg(section.to - 1).edgeId, safe.id);
    assert.ok(section.from < section.to && section.to <= VOLCANIC_TRACK.length);
    assert.ok(section.altitude > 0 && Math.abs(section.x) <= 7.5);
    assert.ok(Math.abs(routeLength(graph,id)-routeLength(graph,safe.id)) / routeLength(graph,safe.id) < .20);
    if (i) assert.ok(sections[i-1].to < section.from);
  }
  assert.deepEqual(sections.map(s => !!s.deck), [false,true,false]);
});
test('Volcanic is a dev-unlocked-only classic sprint', () => {
  assert.equal(RACE_TRACKS[VOLCANIC_ID], undefined);
  assert.equal(COURSE_TRACKS[VOLCANIC_ID], VOLCANIC_TRACK);
  assert.equal(raceTrack(VOLCANIC_ID), VOLCANIC_TRACK);
  assert.equal(unlocked(VOLCANIC_ID), true);
  assert.equal(released(VOLCANIC_ID), false);
  const race = createRace(VOLCANIC_ID);
  assert.equal(race.rivals.length, 7);
  for (const mode of ['time', 'endless']) assert.equal(createRace(VOLCANIC_ID, { mode }).mode, mode);
  assert.throws(() => createRace(VOLCANIC_ID, { mode: 'circuit' }), RangeError);
});
test('Volcanic finishes once with a valid eight-car ranking', () => {
  const race = createRace(VOLCANIC_ID);
  race.phase = 'racing';
  for (let i = 0; i < 60*60*7 && race.phase !== 'finished'; i++)
    stepRace(race, { throttle: true, boost: race.player.fuel > 40 }, 1/60);
  assert.equal(race.phase, 'finished');
  assert.ok(race.player.distance >= race.length);
  assert.ok(Number.isInteger(race.result.position) && race.result.position >= 1 && race.result.position <= 8);
});
test('Volcanic race scene renders authored road chunks and disposes cleanly', async () => {
  const THREE = await import('three');
  const { createVolcanicCrownRaceScene } = await import('../src/volcanic-crown-race-scene.ts');
  const scene = new THREE.Scene(), race = createVolcanicCrownRaceScene(scene);
  assert.equal(race.group.parent, scene);
  race.update(0);
  const names = [];
  race.group.traverse(o => names.push(o.name));
  for (const id of graph.groundRoute) assert.ok(names.some(n => n.startsWith('volcanic-' + id + '-')), id);
  for (const id of ['rift-flight','vent-risk','gorge-flight']) assert.ok(!names.some(n => n.startsWith('volcanic-' + id + '-')));
  assert.equal(names.filter(n => n === 'shortcut-deck').length, 1);
  race.hide(); assert.equal(race.group.visible, false);
  race.dispose(); assert.equal(race.group.parent, null);
});

test('Volcanic uses a fixed shader light budget while streaming its road and crater', async () => {
  const THREE = await import('three');
  const { createVolcanicCrownRaceScene } = await import('../src/volcanic-crown-race-scene.ts');
  const race = createVolcanicCrownRaceScene(new THREE.Scene());
  const lights = [];
  race.group.traverse(object => { if (object instanceof THREE.PointLight) lights.push(object); });
  assert.deepEqual(lights.map(light => light.name).sort(),
    ['pooled-lava-light', 'pooled-lava-light', 'pooled-crater-glow'].sort());
  assert.ok(lights.every(light => light.parent === race.group), 'chunk visibility must not change shader light count');
  for (const distance of [0, 240, 800, 2400, 5400, 9000, VOLCANIC_TRACK.length - 1]) {
    race.update(distance, 4);
    assert.ok(lights.every(light => light.visible && light.parent === race.group), 'stable light count @' + distance);
    assert.ok(lights.some(light => light.name === 'pooled-lava-light' && light.intensity > 0),
      'nearby road lighting @' + distance);
  }
  race.dispose();
});

async function inspectVolcanicSurfaces(check) {
  const THREE = await import('three');
  const { createVolcanicCrownRaceScene } = await import('../src/volcanic-crown-race-scene.ts');
  const scene = new THREE.Scene(), race = createVolcanicCrownRaceScene(scene);
  const ray = new THREE.Raycaster(), roads = [];
  race.group.traverse(object => { if (object.name === 'physical-road') roads.push(object); });
  const hitsFromAbove = (distance, x, height, targets) => {
    const f = volcanicFrame(distance);
    const up = new THREE.Vector3(...f.up);
    const origin = new THREE.Vector3(f.point.x, f.point.y, f.point.z)
      .addScaledVector(new THREE.Vector3(...f.right), x).addScaledVector(up, height);
    ray.set(origin, up.negate());
    ray.far = height + .5;
    return ray.intersectObjects(targets);
  };
  try {
    race.update(0);
    race.group.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    check(race, hitsFromAbove, roads);
  } finally {
    race.dispose();
  }
}

test('Volcanic ground cars stay visible through the elevated shortcut', () =>
  inspectVolcanicSurfaces((race, hitsFromAbove, roads) => {
    const deck = race.group.getObjectByName('shortcut-deck');
    const section = VOLCANIC_TRACK.sections.find(item => item.deck);
    const hits = hitsFromAbove((section.from + section.to) / 2, section.x, 8, [deck, ...roads]);
    assert.equal(hits[0]?.object, deck, 'the shortcut still spans the right lane');
    assert.ok(deck.material.transparent && !deck.material.depthWrite && deck.material.opacity <= .45,
      'the solid upper road must let the chase camera see the lower-lane car beneath it');
  }));

test('Volcanic road mesh stays below the car and leaves no holes at edge joins', () =>
  inspectVolcanicSurfaces((_race, hitsFromAbove, roads) => {
    let seam = 0;
    for (const edgeId of graph.groundRoute.slice(0, -1)) {
      seam += routeLength(graph, edgeId);
      for (const metres of [-12, -4, -1, -.05, .05, 1, 4, 12]) for (const lane of [-10.2, 0, 10.2]) {
        const hit = hitsFromAbove(seam + metres, lane, 4, roads)[0];
        assert.ok(hit, `${edgeId} seam ${metres}m, lane ${lane}: road hole`);
        assert.ok(Math.abs(hit.distance - 4) <= .18,
          `${edgeId} seam ${metres}m, lane ${lane}: road is ${(4 - hit.distance).toFixed(2)}m above contact`);
      }
    }
  }));

test('Volcanic chase camera keeps the car in frame at the gorge join on portrait phones', async () => {
  const { PerspectiveCamera, Vector3 } = await import('three');
  const { RACE_CAMERA, frameChaseSightline } = await import('../src/race-camera.ts');
  const { lookAheadDistance } = await import('../src/track-paths.ts');
  const view = RACE_CAMERA.chasePortrait, camera = new PerspectiveCamera(view.fov, 390 / 844);
  const distance = 11321, lane = 8.5;
  const f = volcanicFrame(distance);
  const car = new Vector3(f.point.x, f.point.y, f.point.z).addScaledVector(new Vector3(...f.right), lane);
  camera.position.copy(car).addScaledVector(new Vector3(...f.forward), -view.back).y += view.height;
  const next = volcanicFrame(distance + lookAheadDistance(VOLCANIC_ID, distance, view.ahead));
  const look = new Vector3(next.point.x + next.right[0] * lane, next.point.y + view.look, next.point.z + next.right[2] * lane);
  frameChaseSightline(camera.position, look, car, camera.aspect, view.fov);
  camera.lookAt(look);
  camera.updateMatrixWorld();
  assert.ok(Math.abs(car.clone().project(camera).x) < .65, 'the rear silhouette needs room on both sides');
});
