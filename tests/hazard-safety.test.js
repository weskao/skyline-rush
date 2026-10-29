import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHazardPlacement } from '../src/hazard-schema.ts';
import { courseSafetyIssues, hazardWarningDistance, MAX_APPROACH_SPEED } from '../src/hazard-safety.ts';
import { CAR_PROBE } from '../src/hazard-behavior.ts';
import { THEMED_TRACKS, themedPlacements } from '../src/track-themes.ts';
import { MAX_SPEED } from '../src/game.js';

const at = (id, distance, lateralOffset, type = 'barrier', extra = {}) => validateHazardPlacement({ id, trackId: 'coast', distance, lateralOffset,
  altitude: 0, type, triggerWindow: { from: distance - 60, to: distance + 20 }, warningLeadSeconds: 1.5,
  movementPattern: { kind: 'static' }, difficulty: 'standard', seed: 1, ...extra });

test('ENV-05 a course always leaves two lanes open at every blocker', () => {
  assert.deepEqual(courseSafetyIssues([at('a', 1000, -7.5), at('b', 1004, -2.5)]), []);
  assert.deepEqual(courseSafetyIssues([at('a', 1000, -7.5), at('b', 1004, -2.5), at('c', 1006, 2.5)]), ['a: fewer than two open lanes']);
  const sweeping = at('g', 2000, 0, 'gate', { movementPattern: { kind: 'sweep', amplitude: 1.8, period: 4, phase: 0 } });
  assert.deepEqual(courseSafetyIssues([sweeping, at('h', 2000, 7.5)]), ['g: fewer than two open lanes'], 'a sweep closes everything it crosses');
  assert.deepEqual(courseSafetyIssues([at('far', 1000, -7.5), at('apart', 1040, -2.5), at('x', 1080, 2.5)]), [], 'spaced hazards leave time to change lanes');
  const crossing = at('rail', 3000, 0, 'rail-crossing', { movementPattern: { kind: 'pulse', period: 8, phase: 0 } });
  assert.deepEqual(courseSafetyIssues([crossing]), [], 'a timed crossing opens again: waiting is the escape');
  assert.deepEqual(courseSafetyIssues([at('gust', 3000, 0, 'gust')]), [], 'gusts and terrain never close a lane');
});

test('ENV-05 nothing spawns on the start grid', () => {
  assert.deepEqual(courseSafetyIssues([at('grid', 120, 2.5)]), ['grid: on the start grid']);
});

test('ENV-05 warnings give at least the authored lead even at full NITRO speed', async () => {
  const { SLIPSTREAM_CAP_BONUS, SHORTCUT_CAP_BONUS } = await import('../src/game.js');
  assert.equal(MAX_APPROACH_SPEED, MAX_SPEED + 30 + SLIPSTREAM_CAP_BONUS + SHORTCUT_CAP_BONUS, 'the full NITRO cap');
  const legacy = { distance: 1000, x: 0, altitude: 0, hit: false, passed: false, moving: false, phase: 0, speed: 0 };
  assert.equal(hazardWarningDistance(legacy), 170, 'generated hazards keep the existing 170 m warning');
  for (const lead of [0.5, 1.5, 3, 6]) {
    const p = at('w', 2000, 0, 'barrier', { warningLeadSeconds: lead });
    const metres = hazardWarningDistance({ ...legacy, placement: p });
    assert.ok(metres / MAX_APPROACH_SPEED >= Math.max(lead, 1), `lead ${lead}s`);
  }
});

test('ENV-05 hit tolerance is forgiving and identical on every device', () => {
  assert.ok(CAR_PROBE.halfWidth < 0.85, 'contact reach is narrower than the drawn car');
  assert.equal(Object.isFrozen(CAR_PROBE), true);
});

test('ENV-05 every themed track passes the safety rules', () => {
  for (const trackId of THEMED_TRACKS) assert.deepEqual(courseSafetyIssues(themedPlacements(trackId)), [], trackId);
});

test('ENV-05 the audio cue follows the same warning distance; generated hazards keep 150 m', async () => {
  const { createModeAudioState, modeAudioCues } = await import('../src/mode-audio.ts');
  const race = hazards => ({ mode: 'custom', phase: 'racing', trackId: 'coast', player: { distance: 0 }, hazards });
  const cues = hazards => { const state = createModeAudioState(), r = race(hazards); modeAudioCues(r, state); return modeAudioCues(r, state); };
  const authored = { distance: 260, x: 0, altitude: 0, hit: false, passed: false, placement: at('early', 260, 0, 'barrier', { warningLeadSeconds: 2 }) };
  assert.deepEqual(cues([authored]), ['hazard-warning'], '2 s at full NITRO is 272 m');
  assert.deepEqual(cues([{ distance: 160, hit: false, passed: false }]), [], 'generated: still 150 m');
  assert.deepEqual(cues([{ distance: 150, hit: false, passed: false }]), ['hazard-warning']);
});

test('ENV-05 legacy entries resolve exactly as before, never through hazardFrame', async () => {
  const { hazardTouch, hazardPose } = await import('../src/hazard-race.ts');
  const { hazardX } = await import('../src/hazards.ts');
  for (let i = 0; i < 200; i++) {
    const h = { distance: 1000, x: [-7.5, -2.5, 2.5, 7.5][i % 4], altitude: 0, hit: false, passed: false, moving: i % 3 === 0, phase: i * 1.7, speed: i % 2 ? 1.65 : 1.05 };
    const t = i * 0.37, car = { distance: 1000, x: (i % 19) - 9, altitude: (i % 5) * 0.6, speed: 60 }, x = hazardX(h, t);
    assert.equal(hazardPose(h, t).x, x);
    assert.equal(hazardTouch(h, car, t).effect, Math.abs(car.x - x) < 1.8 && car.altitude < 2.4 ? 'block' : null);
  }
});

test('ENV-04 a branch marker is a sign, not a hazard: it neither warns nor hides the warning behind it', async () => {
  const { createModeAudioState, modeAudioCues } = await import('../src/mode-audio.ts');
  const { isWarnedHazard } = await import('../src/hazard-safety.ts');
  const marker = { distance: 100, x: 0, altitude: 0, hit: false, passed: false, placement: at('sign', 100, 0, 'branch-marker') };
  const barrier = { distance: 200, x: 0, altitude: 0, hit: false, passed: false, placement: at('wall', 200, 2.5, 'barrier') };
  assert.equal(isWarnedHazard(marker), false);
  assert.equal(isWarnedHazard(barrier), true);
  assert.equal(isWarnedHazard({ distance: 1, hit: false, passed: false }), true, 'generated hazards always warn');
  const cues = hazards => { const state = createModeAudioState(), r = { mode: 'custom', phase: 'racing', trackId: 'coast', player: { distance: 0 }, hazards }; modeAudioCues(r, state); return modeAudioCues(r, state); };
  assert.deepEqual(cues([marker]), []);
  assert.deepEqual(cues([marker, barrier]), ['hazard-warning']);
  const hud = readFileSync(new URL('../src/race-hud-modes.ts', import.meta.url), 'utf8');
  assert.match(hud, /isWarnedHazard\(/, 'the HUD warning skips signs the same way');
});
