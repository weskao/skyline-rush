import test from 'node:test';
import assert from 'node:assert/strict';
import { createFramePacer, parseFpsPreference, FPS_STORAGE_KEY, AUTO_SAMPLE_WINDOW_MS } from '../src/frame-pacing.ts';

test('preferences are sanitized: old installations default to Auto and corrupt storage never crashes', () => {
  assert.equal(FPS_STORAGE_KEY, 'skyline-rush-target-fps-v1');
  for (const invalid of [null, undefined, '', 120, 90, '144', {}, [], 'NaN', '"60"', 'off'])
    assert.equal(parseFpsPreference(invalid), 'auto');
  assert.equal(parseFpsPreference('30'), '30');
  assert.equal(parseFpsPreference('60'), '60');
  assert.equal(parseFpsPreference('90'), '90');
  assert.equal(parseFpsPreference('120'), '120');
  assert.equal(parseFpsPreference('auto'), 'auto');
});

test('manual 30 and 60 cap drawing only; both receive every simulation callback', () => {
  for (const [preference, expected] of [['30', 30], ['60', 60]]) {
    const pacer = createFramePacer(preference);
    let paints = 0;
    let simulationTicks = 0;
    for (let i = 0; i < 60; i++) {
      simulationTicks++; // fixed-step simulation occurs before pacing and is never skipped
      if (pacer.tick(i * 1000 / 60, { racing: true })) {
        paints++;
        pacer.completeRender(2);
      }
    }
    assert.equal(simulationTicks, 60);
    assert.ok(Math.abs(paints - expected) <= 1, `${preference}: ${paints} paints`);
    assert.equal(pacer.targetFps, expected);
    assert.equal(pacer.renderScale, 1);
  }
});

test('manual preference always overrides Auto and restores the full user-selected visual budget', () => {
  const pacer = createFramePacer('auto');
  let now = 0;
  for (let i = 0; i < 1800; i++) {
    now += 1000 / 60;
    if (pacer.tick(now, { racing: true })) pacer.completeRender(19);
  }
  assert.equal(pacer.targetFps, 30);
  assert.ok(pacer.renderScale < 1);
  pacer.setPreference('60');
  assert.equal(pacer.preference, '60');
  assert.equal(pacer.targetFps, 60);
  assert.equal(pacer.renderScale, 1);
  for (let i = 0; i < 1200; i++) {
    now += 1000 / 60;
    if (pacer.tick(now, { racing: true })) pacer.completeRender(32);
  }
  assert.equal(pacer.targetFps, 60, 'Auto must never silently overwrite manual 60');
  pacer.setPreference('30');
  assert.equal(pacer.targetFps, 30);
});

test('Auto reacts to sustained measured render load, not CPU-count or touchscreen guesses', () => {
  const pacer = createFramePacer('auto');
  let now = 0;
  for (let i = 0; i < 700; i++) {
    now += 1000 / 60;
    if (pacer.tick(now, { racing: true })) pacer.completeRender(19);
  }
  assert.ok(AUTO_SAMPLE_WINDOW_MS >= 6000);
  assert.equal(pacer.renderScale, 0.85, 'first degrade resolution, retaining gameplay geometry');
  assert.equal(pacer.targetFps, 60);
  for (let i = 0; i < 1000; i++) {
    now += 1000 / 60;
    if (pacer.tick(now, { racing: true })) pacer.completeRender(19);
  }
  assert.equal(pacer.targetFps, 30, 'continued load steps down to 30 without rapid toggling');
});

test('Auto does not switch from one slow frame, and takes consecutive good windows to recover', () => {
  const pacer = createFramePacer('auto');
  let now = 0;
  const run = (frames, cost) => {
    for (let i = 0; i < frames; i++) {
      now += 1000 / 60;
      if (pacer.tick(now, { racing: true })) pacer.completeRender(cost);
    }
  };
  run(700, 25);
  run(1000, 25);
  assert.equal(pacer.targetFps, 30);
  run(40, 2);
  assert.equal(pacer.targetFps, 30);
  run(2200, 3);
  assert.equal(pacer.targetFps, 60);
});

test('hidden page / long suspension / invalid timestamps do not create giant samples or advance a fake clock', () => {
  const pacer = createFramePacer('auto');
  assert.equal(pacer.tick(1000, { racing: true }), true);
  pacer.completeRender(4);
  assert.equal(pacer.tick(200000, { racing: true, hidden: true }), false);
  assert.equal(pacer.tick(300000, { racing: true }), true, 'first visible frame resumes immediately');
  pacer.completeRender(4);
  assert.equal(pacer.tick(NaN, { racing: true }), false);
  assert.equal(pacer.targetFps, 60);
});

test('30fps rendering keeps 60Hz simulated positions/fuel/elapsed time identical to 60fps rendering', () => {
  const drive = preference => {
    const pacer = createFramePacer(preference);
    const state = { elapsed: 0, distance: 0, fuel: 1, combo: 0, ghostSamples: [] };
    let accum = 0, last = 0, paints = 0;
    for (let i = 1; i <= 600; i++) {
      const now = i * 1000 / 60;
      accum += (now - last) / 1000;
      last = now;
      while (accum + 1e-8 >= 1 / 60) {
        state.elapsed += 1 / 60;
        state.distance += 42 / 60;
        state.fuel -= 0.01 / 60;
        state.combo++;
        state.ghostSamples.push(state.distance);
        accum -= 1 / 60;
      }
      if (pacer.tick(now, { racing: true })) { paints++; pacer.completeRender(1); }
    }
    return { state, paints };
  };
  const slow = drive('30'), fast = drive('60');
  assert.deepEqual(slow.state, fast.state);
  assert.ok(slow.paints < fast.paints);
});

test('real game engine preserves flight, speed, collision and race clock under different render caps', async () => {
  const { createRace, startRace, stepRace } = await import('../src/game.js');
  const raceUnder = cap => {
    const race = createRace();
    startRace(race);
    race.traffic = [];
    const pacer = createFramePacer(cap);
    let drawn = 0;
    for (let frame = 0; frame < 780; frame++) {
      const input = { throttle: true, steer: frame < 250 ? 0.3 : 0, fly: frame >= 340 && frame < 480, nitro: frame >= 500 && frame < 550 };
      stepRace(race, input, 1 / 60);
      if (pacer.tick(frame * 1000 / 60, { racing: race.phase === 'racing' })) {
        drawn++;
        pacer.completeRender(2);
      }
    }
    return { race, drawn };
  };
  const capped = raceUnder('30'), uncapped = raceUnder('60');
  assert.deepEqual(capped.race, uncapped.race);
  assert.ok(capped.drawn < uncapped.drawn);
});
