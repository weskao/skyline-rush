import assert from 'node:assert/strict';
import test from 'node:test';
import { createRace, RACE_TRACKS, stepRace } from '../src/game.js';
import { carGap } from '../src/course-race-step.ts';
import { placeCourseCar } from '../src/course-race.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { graphCarVisual, graphOrigin } from '../src/course-render-pose.ts';
import { trackFrame, trackRunoutFrame } from '../src/track-paths.ts';

const measuredTracks = ['frostbite-canyon', 'monsoon-ruins', 'volcanic-crown', 'stormline-megacity'];

function finishApproach(trackId, mode, speed = 45) {
  const race = createRace(trackId, { mode, laps: 1 });
  const [rival] = race.rivals;
  Object.assign(race, { phase: 'racing', elapsed: 30, rivals: [rival], props: [], traffic: [], pickups: [], rings: [], hazards: [] });
  const edge = race.course?.spec.graph.groundRoute.at(-1);
  const end = edge ? routeLength(race.course.spec.graph, edge) : race.length;
  function place(car, offset, x, speed, altitude = 0) {
    Object.assign(car, { distance: race.length + offset, x, speed, altitude });
    if (car !== race.player) Object.assign(car, { homeX: x, pace: speed });
    if (edge) placeCourseCar(race.course, car.id ?? 'YOU', edge, end + offset, car);
    if (race.circuit) Object.assign(car === race.player ? race.circuit.player : race.circuit.rivals[car.name], {
      nextSector: 4, splits: [7, 7, 7], previousDistance: car.distance, previousX: x,
    });
  }
  place(race.player, -30, 0, 0);
  place(rival, -0.5, 0, speed);
  return { race, rival, end, place };
}

const sprintTracks = [...Object.keys(RACE_TRACKS), ...measuredTracks, 'dune-tempest', 'skyfall-archipelago'];
for (const trackId of [...sprintTracks, 'harbor-circuit']) {
  const mode = trackId === 'harbor-circuit' ? 'circuit' : 'classic';
  test(`${trackId}: the same rival parks, gets pushed, and retains its finish time`, () => {
    const { race, rival, end, place } = finishApproach(trackId, mode);
    stepRace(race, {}, 1 / 60);
    const finishTime = rival.finishTime;
    assert.ok(finishTime > 30 && finishTime <= race.elapsed, 'a real crossing records the finish time');
    assert.equal(rival.speed, 0);
    assert.equal(rival.pace, 0);
    const parkedAt = rival.distance;
    const parkedPose = race.course && graphCarVisual(race.course, rival.id, graphOrigin(race.course));
    for (let i = 0; i < 45; i++) stepRace(race, {}, 1 / 60);
    assert.equal(rival.distance, parkedAt, 'a parked car holds its position on its own');
    assert.equal(rival.x, 0);

    place(race.player, -6, 0, 12);
    for (let i = 0; i < 45 && race.phase === 'racing'; i++) stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(race.phase, 'finished', 'the driver in the same lane can reach the finish');
    assert.ok(rival.distance > parkedAt + 3, 'the stationary car rolls ahead of the bumper');
    assert.ok(rival.speed > 0, 'the rival receives forward speed');
    assert.ok(race.player.speed > 0, 'the impact cannot pin the player at zero');
    assert.equal(race.result.position, 2);
    assert.equal(rival.finishTime, finishTime);
    if (race.course) {
      const car = race.course.cars.get(rival.id);
      const pose = graphCarVisual(race.course, rival.id, graphOrigin(race.course));
      assert.ok(car.travel.finished);
      assert.equal(car.travel.localS, end, 'the timed gate is still at the end of the edge');
      assert.ok(car.runout > 3);
      assert.ok(carGap(race, race.player, rival) > 3);
      assert.ok(pose.separation > 3 && pose.separation < 12);
      assert.ok(parkedPose.separation > 20);
    }
  });
}

for (const [trackId, mode] of [['coast', 'classic'], ['harbor-circuit', 'circuit'], ['dune-tempest', 'classic']]) {
  test(`${trackId}: a rival pushes a parked car, finishes, and the parked car settles again`, () => {
    const { race, rival, place } = finishApproach(trackId, mode);
    const active = createRace(trackId, { mode, laps: 1 }).rivals[1];
    stepRace(race, {}, 1 / 60);
    const parkedAt = rival.distance, time = rival.finishTime;
    race.rivals.push(active);
    race.elapsed = 35; // Both rivals are between their scripted flight windows here.
    place(active, -6, 0, 17);
    Object.assign(active, { laneShift: 0, cooldown: 1 });
    rival.cooldown = 1;

    let receivedSpeed = 0;
    for (let i = 0; i < 40; i++) {
      stepRace(race, {}, 1 / 60);
      receivedSpeed = Math.max(receivedSpeed, rival.speed);
    }
    assert.ok(active.finishTime > time);
    assert.ok(receivedSpeed > 0, 'collision grace still permits momentum transfer');
    assert.ok(rival.distance > parkedAt + 3);
    assert.equal(rival.finishTime, time);
    for (let i = 0; i < 180; i++) stepRace(race, {}, 1 / 60);
    assert.equal(rival.speed, 0, 'the push bleeds off from rolling resistance');
    const stoppedAt = rival.distance;
    stepRace(race, {}, 1 / 60);
    assert.equal(rival.distance, stoppedAt);
    assert.equal(rival.finishTime, time);
  });
}

test('an offset lane or an airborne racer can pass without moving the parked car', () => {
  for (const [x, altitude] of [[4, 0], [0, 5]]) {
    const { race, rival, place } = finishApproach('coast', 'classic');
    stepRace(race, {}, 1 / 60);
    const parkedAt = rival.distance;
    place(race.player, -5, x, 45, altitude);
    for (let i = 0; i < 20 && race.phase === 'racing'; i++) stepRace(race, { throttle: true }, 1 / 60);
    assert.equal(race.phase, 'finished');
    assert.equal(rival.distance, parkedAt);
    assert.equal(race.player.collisions, 0);
  }
});

test('a pushed rival on each measured track follows the built road past its finish frame', () => {
  for (const id of measuredTracks) {
    const { length } = createRace(id);
    const end = trackFrame(id, length);
    const rolled = trackRunoutFrame(id, length + 12);
    for (const [i, axis] of ['x', 'y', 'z'].entries()) {
      assert.ok(Math.abs(rolled.point[axis] - end.point[axis] - end.forward[i] * 12) < 1e-6, id + ' ' + axis);
    }
  }
});

for (const hz of [30, 60, 120]) {
  test(`a low-speed player clears two parked rivals in the same lane at ${hz} Hz`, () => {
    const { race, rival, place } = finishApproach('coast', 'classic');
    for (let i = 0; i < 2 && rival.finishTime === null; i++) stepRace(race, {}, 1 / hz);
    assert.ok(rival.finishTime > 30);
    const second = createRace('coast').rivals[1];
    Object.assign(second, { x: 0, distance: rival.distance + 5.8, finishTime: rival.finishTime + 0.01 });
    race.rivals.push(second);
    const positions = race.rivals.map(car => car.distance);
    const times = race.rivals.map(car => car.finishTime);
    place(race.player, -6, 0, 3);

    for (let i = 0; i < hz * 1.2 && race.phase === 'racing'; i++) {
      const before = race.player.distance;
      stepRace(race, { throttle: true }, 1 / hz);
      assert.ok(race.player.distance > before, 'the bumper never rewinds the incoming car');
      assert.ok(race.player.speed > 0, 'a stationary leader never pins the player at zero');
    }
    assert.equal(race.phase, 'finished');
    assert.equal(race.result.position, 3);
    assert.ok(race.rivals.every((car, i) => car.distance > positions[i]));
    assert.deepEqual(race.rivals.map(car => car.finishTime), times);
  });
}

test('a stationary player in bumper range leaves a parked rival motionless', () => {
  const { race, rival, place } = finishApproach('harbor-circuit', 'circuit');
  stepRace(race, {}, 1 / 60);
  const { distance, finishTime } = rival;
  place(race.player, -4, 0, 0);
  for (let i = 0; i < 120; i++) stepRace(race, {}, 1 / 60);
  assert.equal(rival.distance, distance);
  assert.equal(rival.speed, 0);
  assert.equal(rival.finishTime, finishTime);
  assert.equal(race.phase, 'racing');
  assert.equal(race.player.collisions, 0);
});
