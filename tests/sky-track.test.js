import test from 'node:test';
import assert from 'node:assert/strict';
import { skyPoint, skyFrame, skyPosition, skyGapAt, SKY_JUMPS } from '../src/sky-track.ts';
import { RACE_TRACKS, createRace, startRace, stepRace } from '../src/game.js';

const close = (a, b, tolerance = 0.5) => assert.ok(Math.abs(a - b) < tolerance, `${a} should be near ${b}`);

test('Sky Spiral is a fully registered and deterministic fifth track', () => {
  assert.equal(RACE_TRACKS.spiral.name, 'Sky Spiral');
  assert.equal(RACE_TRACKS.spiral.length, 5600);
  assert.deepEqual(createRace('spiral'), createRace('spiral'));
  assert.equal(RACE_TRACKS.spiral.sections.filter(s => s.type === 'launch').length, 3);
  assert.equal(RACE_TRACKS.spiral.sections.filter(s => s.type === 'gap').length, 3);
});

test('helix traverses one entire horizontal revolution and rises', () => {
  const begin = skyPoint(1100), quarter = skyPoint(1375);
  const halfway = skyPoint(1650), threeQuarter = skyPoint(1925), end = skyPoint(2200);
  close(begin.x, end.x, 1e-5);
  close(begin.z, end.z, 1e-5);
  assert.ok(quarter.z < begin.z - 130);
  assert.ok(halfway.x > begin.x + 300);
  assert.ok(threeQuarter.z > begin.z + 130);
  close(end.y - begin.y, 82, 1e-5);
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
  for (const boundary of [1100, 2200]) {
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

test('ramp automatically launches a sufficiently fast car', () => {
  const race = createRace('spiral');
  startRace(race);
  race.phase = 'racing';
  race.traffic = [];
  race.rivals = [];
  race.player.distance = 2869;
  race.player.speed = 75;
  stepRace(race, { throttle: true }, 0.04);
  assert.ok(race.player.altitude > 0);
  assert.ok(race.player.verticalSpeed > 0);
  assert.equal(race.player.falls, 0);
});

test('missing a Sky Spiral gap triggers the existing recovery path', () => {
  const race = createRace('spiral');
  race.phase = 'racing';
  race.traffic = [];
  race.rivals = [];
  race.player.distance = 2880;
  race.player.speed = 30;
  race.player.altitude = 0;
  stepRace(race, { throttle: true }, 0.05);
  assert.equal(race.player.falls, 1);
  assert.ok(race.player.distance >= 2940);
});

test('Sky Spiral has sweepers before and after the helix, with straight jump corridors', () => {
  for (const [from, to] of [[170, 690], [2260, 2730], [3100, 3600], [4010, 4460], [4900, 5480]]) {
    const headings = Array.from({ length: 20 }, (_, i) => skyFrame(from + i * (to - from) / 20).forward[0]);
    assert.ok(Math.max(...headings) > .23 && Math.min(...headings) < -.23, `${from}–${to} needs visible turns`);
  }
  for (const { rampFrom, gapTo } of SKY_JUMPS) {
    for (let d = rampFrom - 50; d <= gapTo + 150; d += 5) close(skyFrame(d).forward[0], 0, .01);
  }
});

test('Sky Spiral streaming races drive through the former sprint gaps on solid road', () => {
  for (const mode of ['endless', 'elimination']) {
    const race = createRace('spiral', { mode });
    race.phase = 'racing';
    for (const { gapFrom, gapTo } of SKY_JUMPS) {
      Object.assign(race.player, { distance: gapFrom - 5, speed: 75, altitude: 0, x: 0, cooldown: 5 });
      for (let step = 0; step < 120 && race.player.distance < gapTo + 5; step++) stepRace(race, { throttle: true }, 1 / 60);
      assert.ok(race.player.distance >= gapTo + 5, mode);
      assert.equal(race.player.falls, 0, mode);
      assert.equal(race.player.altitude, 0, mode);
    }
  }
});
