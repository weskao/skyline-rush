import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPRINT_TIERS, sprintTier } from '../src/sprint-tier.ts';

test('sprint tier: NITRO outranks BOOST and the two together are their own tier', () => {
  assert.equal(sprintTier(false, false), 'idle');
  assert.equal(sprintTier(false, true), 'boost');
  assert.equal(sprintTier(true, false), 'nitro');
  assert.equal(sprintTier(true, true), 'nitro-boost');
});

test('sprint tier: the ladder never goes down as the tier goes up', () => {
  const rows = Object.values(SPRINT_TIERS).sort((a, b) => a.level - b.level);
  assert.deepEqual(rows.map(row => row.level), [0, 1, 2, 3]);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].share >= rows[i - 1].share, `level ${i} is weaker than level ${i - 1}`);
  assert.ok(SPRINT_TIERS.boost.share < SPRINT_TIERS.nitro.share, 'BOOST must read weaker than NITRO');
  for (const row of rows) assert.ok(row.share >= 0 && row.share <= 1, 'share stays 0..1: the chain lift is applied after it');
});

// The screen layer used one formula, max(nitro, boost * 0.8), for FOV, blur and speed lines: BOOST read as NITRO at 80%
// and NITRO with BOOST held read exactly as NITRO. Each step of the ladder now reads stronger on the screen.
const held = { phase: 'racing', speed: 110, cap: 110, dt: 1 / 60, enabled: true, quality: 'high', reducedMotion: false };
const STEPS = [
  ['BOOST', { nitro: false, boost: true }], ['NITRO', { nitro: true, boost: false }],
  ['NITRO + BOOST', { nitro: true, boost: true }], ['NITRO + BOOST x3', { nitro: true, boost: true, chain: 3 }],
];
const screenAt = async state => {
  const { createSprintVfx } = await import('../src/vfx-settings.ts');
  const sprint = createSprintVfx(); let frame, punch = 0;
  for (let i = 0; i < 90; i++) { frame = sprint.update({ ...held, ...state }); punch = Math.max(punch, frame.punch); }
  return { fov: frame.fov, blur: frame.blur, lines: frame.lines, punch };
};

test('sprint screen: BOOST < NITRO < NITRO with BOOST held < x3 chain, each step measurably stronger', async () => {
  const rows = []; for (const [name, state] of STEPS) rows.push([name, await screenAt(state)]);
  const step = (cue, i, ratio) => assert.ok(rows[i][1][cue] >= rows[i - 1][1][cue] * ratio,
    `${cue}: ${rows[i][0]} ${rows[i][1][cue]} vs ${rows[i - 1][0]} ${rows[i - 1][1][cue]}`);
  for (const cue of ['blur', 'lines', 'punch']) step(cue, 1, 1.2); // NITRO is the faster sprint: a clear jump
  for (const cue of ['blur', 'lines', 'punch']) step(cue, 2, 1.1); // BOOST held on NITRO: a modest step
  for (const cue of ['fov', 'blur', 'lines']) step(cue, 3, 1.1); // the chain lifts reach and speed cues
  assert.ok(rows[1][1].fov > rows[0][1].fov, 'NITRO widens the camera past BOOST');
  assert.equal(rows[2][1].fov, rows[1][1].fov, 'NITRO with BOOST held keeps NITRO\'s top speed: no second FOV jump');
});

test('sprint screen: the punch stays inside the camera guards and comfort zeroes every camera cue', async () => {
  const { NITRO_CHAIN_LIFT } = await import('../src/vfx-settings.ts');
  for (const [name, state] of STEPS) {
    const screen = await screenAt(state);
    // race-camera.test.js checks the portrait HUD and the dolly up to a x3 NITRO punch (share and punch at the chain cap).
    assert.ok(screen.punch <= NITRO_CHAIN_LIFT.at(-1) + 1e-9, `${name} punch ${screen.punch}`);
    assert.ok(screen.blur <= 1, `${name} blur ${screen.blur}`);
    const calm = await screenAt({ ...state, reducedMotion: true });
    assert.deepEqual([calm.fov, calm.blur, calm.punch], [0, 0, 0], `${name}: Reduced Motion`);
  }
});

test('sprint screen: createSprintVfx reads its strengths from SPRINT_TIERS and the airflow lines read frame.lines', async () => {
  const source = readFileSync(new URL('../src/vfx-settings.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /boost\.intensity \* 0?\.8/, 'no BOOST share literal left in the sprint controller');
  const row = SPRINT_TIERS.boost, before = { ...row }, baseline = await screenAt(STEPS[0][1]);
  try {
    Object.assign(row, { share: before.share / 2, blur: before.blur / 2, lines: before.lines / 2, punch: before.punch / 2 });
    const halved = await screenAt(STEPS[0][1]);
    for (const cue of ['fov', 'blur', 'lines', 'punch']) assert.ok(Math.abs(halved[cue] - baseline[cue] / 2) < 1e-6, `${cue} follows the BOOST row`);
  } finally { Object.assign(row, before); }
  assert.match(readFileSync(new URL('../src/aero-vfx.js', import.meta.url), 'utf8'), /sprintFrame\?\.lines/);
});
