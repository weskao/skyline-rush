import test from 'node:test';
import assert from 'node:assert/strict';
import { createFramePacer, parseFpsPreference, parseAdaptiveResolution, drainSteps, FPS_STORAGE_KEY, ADAPTIVE_RESOLUTION_KEY, AUTO_SAMPLE_WINDOW_MS } from '../src/frame-pacing.ts';

// Load is what the player sees: missed vsyncs (frame delivery) and, when a timer exists, GPU time.
// `cpuMs` replays the old CPU submission feed, which must never count as load.
function drive(pacer, { hz = 60, seconds, dropEvery = 0, gpuMs = null, cpuMs = null, startAt = 0 }) {
  let now = startAt;
  for (let i = 1; i <= Math.round(hz * seconds); i++) {
    now += (dropEvery && i % dropEvery === 0 ? 2 : 1) * 1000 / hz; // a doubled interval is one missed vsync
    if (!pacer.tick(now, { racing: true })) continue;
    if (gpuMs !== null) pacer.observeGpu(gpuMs);
    if (cpuMs !== null) pacer.completeRender?.(cpuMs);
  }
  return now;
}

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
      if (pacer.tick(i * 1000 / 60, { racing: true })) paints++;
    }
    assert.equal(simulationTicks, 60);
    assert.ok(Math.abs(paints - expected) <= 1, `${preference}: ${paints} paints`);
    assert.equal(pacer.targetFps, expected);
    assert.equal(pacer.renderScale, 1);
  }
});

test('manual preference always overrides Auto and restores the full user-selected visual budget', () => {
  const pacer = createFramePacer('auto', { adaptiveResolution: true });
  let now = drive(pacer, { seconds: 40, dropEvery: 4 });
  assert.equal(pacer.targetFps, 30);
  assert.ok(pacer.renderScale < 1);
  pacer.setPreference('60');
  assert.equal(pacer.preference, '60');
  assert.equal(pacer.targetFps, 60);
  assert.equal(pacer.renderScale, 1);
  now = drive(pacer, { seconds: 20, dropEvery: 3, gpuMs: 32, startAt: now });
  assert.equal(pacer.targetFps, 60, 'Auto must never silently overwrite manual 60');
  pacer.setPreference('30');
  assert.equal(pacer.targetFps, 30);
});

test('Auto reacts to sustained missed frame deadlines, not CPU-count or touchscreen guesses', () => {
  const pacer = createFramePacer('auto', { adaptiveResolution: true });
  let now = drive(pacer, { seconds: 17, dropEvery: 4 });
  assert.ok(AUTO_SAMPLE_WINDOW_MS >= 6000);
  assert.equal(pacer.renderScale, 0.85, 'opted-in: first degrade resolution, retaining gameplay geometry');
  assert.equal(pacer.targetFps, 60);
  drive(pacer, { seconds: 17, dropEvery: 4, startAt: now });
  assert.equal(pacer.targetFps, 30, 'continued load steps down to 30 without rapid toggling');
});

test('Auto does not switch from one slow window, and takes consecutive good windows to recover', () => {
  const pacer = createFramePacer('auto');
  let now = drive(pacer, { seconds: AUTO_SAMPLE_WINDOW_MS / 1000 + 0.5, dropEvery: 4 });
  assert.equal(pacer.targetFps, 60, 'one stressed window does not switch');
  now = drive(pacer, { seconds: 20, dropEvery: 4, startAt: now });
  assert.equal(pacer.targetFps, 30);
  now = drive(pacer, { seconds: 0.7, startAt: now });
  assert.equal(pacer.targetFps, 30);
  drive(pacer, { seconds: 40, startAt: now });
  assert.equal(pacer.targetFps, 60);
});

test('CPU submission time is not GPU load: on-time frame delivery never degrades Auto', () => {
  const pacer = createFramePacer('auto');
  drive(pacer, { seconds: 60, cpuMs: 19 });
  assert.equal(pacer.targetFps, 60);
  assert.equal(pacer.renderScale, 1);
});

test('a GPU timer near the 60 FPS budget counts as load even while frames still arrive on time', () => {
  const pacer = createFramePacer('auto');
  drive(pacer, { seconds: 20, gpuMs: 15.5 });
  assert.equal(pacer.targetFps, 30);
  const light = createFramePacer('auto');
  drive(light, { seconds: 60, gpuMs: 6 });
  assert.equal(light.targetFps, 60);
});

test('marginal load backs off recovery instead of oscillating 30 <-> 60', () => {
  const pacer = createFramePacer('auto');
  let now = 0, changes = 0, last = pacer.targetFps;
  for (let second = 0; second < 600; second++) {
    // This device holds 30 but misses vsyncs whenever it attempts 60.
    now = drive(pacer, { seconds: 1, dropEvery: pacer.targetFps === 60 ? 4 : 0, startAt: now });
    if (pacer.targetFps !== last) { changes++; last = pacer.targetFps; }
  }
  assert.ok(changes >= 1 && changes <= 10, `10 minutes of marginal load switched ${changes} times`);
});

test('adaptive resolution is opt-in: by default sustained load never lowers render scale', () => {
  for (const preference of ['auto', '60', '120']) {
    const pacer = createFramePacer(preference);
    drive(pacer, { seconds: 90, dropEvery: 3, gpuMs: 20, cpuMs: 19 });
    assert.equal(pacer.adaptiveResolution, false);
    assert.equal(pacer.renderScale, 1, `${preference}: High must not be lowered silently`);
  }
});

test('opted-in adaptive resolution keeps a manual FPS, and turning it off restores full resolution', () => {
  const manual = createFramePacer('60', { adaptiveResolution: true });
  drive(manual, { seconds: 40, dropEvery: 4 });
  assert.equal(manual.renderScale, 0.85);
  assert.equal(manual.targetFps, 60, 'adaptive resolution never changes a manual FPS');
  manual.setAdaptiveResolution(false);
  assert.equal(manual.adaptiveResolution, false);
  assert.equal(manual.renderScale, 1);
});

test('saved explicit FPS choices survive the Auto / adaptive-resolution split; adaptive storage defaults off', () => {
  assert.equal(ADAPTIVE_RESOLUTION_KEY, 'skyline-rush-adaptive-resolution-v1');
  for (const raw of [null, undefined, '', '0', 'true', 'on', 1, {}]) assert.equal(parseAdaptiveResolution(raw), false);
  assert.equal(parseAdaptiveResolution('1'), true);
  for (const saved of ['30', '60', '90', '120']) {
    const pacer = createFramePacer(saved, { adaptiveResolution: parseAdaptiveResolution(null) });
    assert.equal(pacer.preference, saved);
    assert.equal(pacer.adaptiveResolution, false);
    assert.equal(pacer.renderScale, 1);
  }
  assert.equal(createFramePacer('auto').targetFps, 60);
});

test('a long background gap or hitch never replays a burst of physics steps', () => {
  let accumulator = 0, steps = 0;
  for (const dt of [1 / 60, 12, 1 / 60, 0.4, 1 / 60]) {
    const due = drainSteps(accumulator, dt);
    accumulator = due.accumulator; steps += due.steps;
    assert.ok(due.steps <= 3, `a ${dt}s gap replayed ${due.steps} steps`);
  }
  assert.ok(steps <= 9);
});

test('hidden page / long suspension / invalid timestamps do not create giant samples or advance a fake clock', () => {
  const pacer = createFramePacer('auto');
  assert.equal(pacer.tick(1000, { racing: true }), true);
  assert.equal(pacer.tick(200000, { racing: true, hidden: true }), false);
  assert.equal(pacer.tick(300000, { racing: true }), true, 'first visible frame resumes immediately');
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
      if (pacer.tick(now, { racing: true })) paints++;
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
      if (pacer.tick(frame * 1000 / 60, { racing: race.phase === 'racing' })) drawn++;
    }
    return { race, drawn };
  };
  const capped = raceUnder('30'), uncapped = raceUnder('60');
  assert.deepEqual(capped.race, uncapped.race);
  assert.ok(capped.drawn < uncapped.drawn);
});
