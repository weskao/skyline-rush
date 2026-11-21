import test from 'node:test';
import assert from 'node:assert/strict';
import { skyPoint, skyFrame, skyPosition, skyGapAt, SKY_JUMPS, SKY_SPIRAL } from '../src/sky-track.ts';
import { RACE_TRACKS, createRace, startRace, stepRace } from '../src/game.js';
import { MAX_SPEED, BOOST_CAP_BONUS } from '../src/drive-rules.ts';
import { SKY_GAP_LAUNCH_MIN_SPEED, SKY_GAP_RECOVERY_RUNUP } from '../src/launch-ramps.ts';

const close = (a, b, tolerance = 0.5) => assert.ok(Math.abs(a - b) < tolerance, `${a} should be near ${b}`);

test('Sky Spiral is a fully registered and deterministic fifth track', () => {
  assert.equal(RACE_TRACKS.spiral.name, 'Sky Spiral');
  assert.equal(RACE_TRACKS.spiral.length, 10000);
  assert.deepEqual(createRace('spiral'), createRace('spiral'));
  assert.equal(RACE_TRACKS.spiral.sections.filter(s => s.type === 'launch').length, 3);
  assert.equal(RACE_TRACKS.spiral.sections.filter(s => s.type === 'gap').length, 3);
});

test('helix traverses one entire horizontal revolution and rises', () => {
  const begin = skyPoint(1850), quarter = skyPoint(2200);
  const halfway = skyPoint(2550), threeQuarter = skyPoint(2900), end = skyPoint(3250);
  close(begin.x, end.x, .02);
  close(begin.z, end.z, .02);
  assert.ok(quarter.z < begin.z - 130);
  assert.ok(halfway.x > begin.x + 300);
  assert.ok(threeQuarter.z > begin.z + 130);
  close(end.y - begin.y, 104, 1e-5);
});

test('3D coordinate frame is normalized and right-handed', () => {
  for (const s of [0, 800, 1100, 1250, 1650, 2000, 2200, 3000, 4600, 5500]) {
    const { forward, right, up, point } = skyFrame(s);
    for (const v of [forward, right, up]) close(Math.hypot(...v), 1, 1e-8);
    close(forward.reduce((sum, x, i) => sum + x * right[i], 0), 0, 1e-8);
    close(forward.reduce((sum, x, i) => sum + x * up[i], 0), 0, 1e-8);
    const origin = skyPosition(s, 0, 0, s);
    origin.forEach(v => close(v, 0, 1e-9));
    assert.ok(Object.values(point).every(Number.isFinite));
  }
});

test('helix entry/exit are spatially and directionally continuous', () => {
  for (const boundary of [SKY_SPIRAL.start, SKY_SPIRAL.end]) {
    const a = skyPoint(boundary - 0.01), b = skyPoint(boundary + 0.01);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.04);
    const v1 = skyFrame(boundary - 0.1).forward, v2 = skyFrame(boundary + 0.1).forward;
    assert.ok(v1.reduce((sum, x, i) => sum + x * v2[i], 0) > 0.998);
  }
});

test('jump gaps are deterministic, aligned to launch sections, and bounded', () => {
  const track = RACE_TRACKS.spiral;
  for (const jump of SKY_JUMPS) {
    assert.equal(skyGapAt(jump.gapFrom - 0.1), false);
    assert.equal(skyGapAt(jump.gapFrom + 0.1), true);
    assert.equal(skyGapAt(jump.gapTo + 0.1), false);
    assert.ok(track.sections.some(s => s.type === 'launch' && s.to === jump.rampTo));
    assert.ok(track.sections.some(s => s.type === 'gap' && s.from === jump.gapFrom));
  }
});

test('Sky Spiral requires BOOST-range automatic launch speed', () => {
  assert.ok(SKY_GAP_LAUNCH_MIN_SPEED > MAX_SPEED, 'throttle-only speed cannot automatically launch');
  assert.ok(SKY_GAP_LAUNCH_MIN_SPEED <= MAX_SPEED + BOOST_CAP_BONUS, 'BOOST speed can launch');
  assert.ok(SKY_GAP_RECOVERY_RUNUP >= 180, 'enough road to regain speed after reset');
  for (const jump of SKY_JUMPS) {
    assert.ok(jump.gapTo - jump.gapFrom >= 150, 'wide gap must prevent slow coasting');
    assert.equal(jump.rampTo, jump.gapFrom);
  }
});

for (const jump of SKY_JUMPS) for (const [mode, shouldCross] of [['throttle', false], ['boost', true], ['fly', true]]) {
  test(`Sky Spiral ${jump.gapFrom}: ${mode} ${shouldCross ? 'crosses' : 'falls'} across real missing road`, () => {
    const race = createRace('spiral'), car = race.player;
    race.phase = 'racing';
    race.rivals = race.traffic = race.rings = race.pickups = [];
    Object.assign(car, { distance: jump.rampFrom - 55, speed: mode === 'fly' ? 70 : MAX_SPEED, fuel: 100, altitude: 0, verticalSpeed: 0, x: 0 });
    for (let frame = 0; frame < 420 && !car.recovery && car.distance < jump.gapTo + 10; frame++) {
      stepRace(race, { throttle: true, boost: mode === 'boost', fly: mode === 'fly' }, 1 / 60);
    }
    assert.equal(car.falls, Number(!shouldCross), `${mode} at ${jump.gapFrom}`);
    if (shouldCross) assert.ok(car.distance >= jump.gapTo + 10, 'car must reach the far deck');
    else assert.equal(car.recovery?.reason, 'fall');
  });
}

test('ramp automatically launches a sufficiently fast car', () => {
  const race = createRace('spiral');
  startRace(race);
  race.phase = 'racing';
  race.traffic = [];
  race.rivals = [];
  race.player.distance = SKY_JUMPS[0].rampTo - 1;
  race.player.speed = SKY_GAP_LAUNCH_MIN_SPEED + 4;
  stepRace(race, { throttle: true, boost: true }, 0.04);
  assert.ok(race.player.altitude > 0);
  assert.ok(race.player.verticalSpeed > 0);
  assert.equal(race.player.falls, 0);
});

test('missing a Sky Spiral gap returns to the approach before its launch ramp', () => {
  const race = createRace('spiral');
  race.phase = 'racing';
  race.traffic = [];
  race.rivals = [];
  race.player.distance = SKY_JUMPS[0].gapFrom + 10;
  race.player.speed = 30;
  race.player.altitude = 0;
  stepRace(race, { throttle: true }, 0.05);
  assert.equal(race.player.falls, 1);
  for (let i = 0; i < 120 && race.player.recovery; i++) stepRace(race, {}, 1 / 60);
  assert.equal(race.player.recovery, undefined);
  assert.ok(race.player.distance < SKY_JUMPS[0].rampFrom);
  assert.ok(race.player.distance >= SKY_JUMPS[0].rampFrom - SKY_GAP_RECOVERY_RUNUP - 2);
});

test('Sky Spiral has sweepers before and after the helix, with straight jump corridors', () => {
  for (const [from, to] of [[0, 1800], [3350, 4450], [6800, 9000]]) {
    const headings = Array.from({ length: 20 }, (_, i) => skyFrame(from + i * (to - from) / 20).forward[0]);
    assert.ok(Math.max(...headings) - Math.min(...headings) > .12, `${from}–${to} needs visible turns`);
  }
  for (const { rampFrom, gapTo } of SKY_JUMPS) {
    const bearing = s => Math.atan2(skyFrame(s).forward[0], -skyFrame(s).forward[2]);
    for (let d = rampFrom - 20; d <= gapTo + 55; d += 5) close(bearing(d), bearing(rampFrom), .001);
  }
});

test('Sky Spiral streaming races drive through the former sprint gaps on solid road', () => {
  for (const mode of ['endless', 'elimination']) {
    const race = createRace('spiral', { mode });
    race.phase = 'racing';
    for (const { gapFrom, gapTo } of SKY_JUMPS) {
      Object.assign(race.player, { distance: gapFrom - 5, speed: 75, altitude: 0, x: 0, cooldown: 5 });
      for (let step = 0; step < 240 && race.player.distance < gapTo + 5; step++) stepRace(race, { throttle: true }, 1 / 60);
      assert.ok(race.player.distance >= gapTo + 5, mode);
      assert.equal(race.player.falls, 0, mode);
      assert.equal(race.player.altitude, 0, mode);
    }
  }
});
