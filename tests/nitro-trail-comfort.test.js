import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, FrontSide } from 'three';
import { createNitroTrail } from '../src/garage-nitro-trail.js';
import { REAR_PORTS } from '../src/aero-vfx.js';

// Guards .claude/rules/nitro-trail-vfx.md: the NITRO trail skins stay under the photosensitive flash band and cap their HDR.
const trail = createNitroTrail(new Group(), REAR_PORTS);
const materials = { streaks: trail.streaks.material, halo: trail.halo.material, pool: trail.pool.material };

// Hz seen by one screen pixel for every `time*N`: inside sin/cos/flow it is N/2π, anything else (fract/floor/step) repeats N times a second.
function flickers(source) {
  return [...source.matchAll(/time\*(\d+\.?\d*)/g)].map(match => {
    let depth = 0, open = -1;
    for (let i = match.index - 1; i >= 0 && open < 0; i--) {
      if (source[i] === ')') depth++;
      else if (source[i] === '(') { if (depth === 0) open = i; else depth--; }
    }
    const fn = open < 0 ? '' : source.slice(0, open).match(/(\w+)$/)?.[1];
    const n = Number(match[1]);
    return { term: match[0], fn, hz: ['sin', 'cos', 'flow'].includes(fn) ? n / (2 * Math.PI) : n };
  });
}

// Fast flow is how the jet reads as speed, so a term may beat faster than 3 Hz only as `flow(…)`: a thin streak on the
// streaks' axis, modulated by at most ±20%, at most 12 Hz. Every other term (the whole plume, the halo, the road glow) stays ≤ 3 Hz.
const FLOW = /float flow\(float x\)\{return 1\.\+(\.\d+)\*sin\(x\);\}/;

test('NITRO trail animation never flickers a large area faster than 3 Hz', () => {
  for (const [name, material] of Object.entries(materials)) {
    for (const shader of [material.vertexShader, material.fragmentShader]) {
      for (const f of flickers(shader)) {
        if (name === 'streaks' && f.fn === 'flow') assert.ok(f.hz <= 12, `streaks: flow(${f.term}) runs at ${f.hz.toFixed(2)} Hz`);
        else assert.ok(f.hz <= 3, `${name}: ${f.fn}(${f.term}) flickers at ${f.hz.toFixed(2)} Hz`);
      }
    }
  }
});

test('NITRO streaks carry a fast, low-contrast flow along the core so the jet reads as speed', () => {
  const shader = materials.streaks.fragmentShader;
  const amplitude = Number(shader.match(FLOW)?.[1]);
  assert.ok(amplitude > 0 && amplitude <= 0.2, `flow() modulates by ±${amplitude}, at most ±0.2`);
  const fast = flickers(shader).filter(f => f.fn === 'flow' && f.hz >= 6);
  assert.ok(fast.length > 0, 'the core streaks flow back at 6 Hz or more');
  for (const name of ['halo', 'pool']) assert.doesNotMatch(materials[name].fragmentShader, /flow\(/, `${name} is a wide area: no fast flow`);
});

test('NITRO trail stretches with car speed', () => {
  const t = createNitroTrail(new Group(), REAR_PORTS), length = () => t.streaks.material.uniforms.trailLength.value;
  t.setStyle(1, [.5, .8, 1]);
  t.update(0, 1, 1, true, 20); const slow = length();
  t.update(0, 1, 1, true, 88); const fast = length();
  t.update(0, 1, 1, true, 118);
  assert.ok(fast > slow * 1.8, `88 m/s (${fast.toFixed(1)}) runs far longer than 20 m/s (${slow.toFixed(1)})`);
  assert.ok(length() <= 18, 'NITRO top speed stays within the overdraw budget');
});

test('the halo hugs the jet: a narrow shell, never the 1.9x wash', () => {
  const shell = Number(materials.halo.vertexShader.match(/sqrt\(u\)\)\*([\d.]+)\*/)?.[1]);
  assert.ok(shell > 1 && shell <= 1.4, `halo shell ${shell}x the streak`);
});

test('NITRO trail colour is capped so only a thin core reaches the bloom threshold', () => {
  for (const [name, material] of Object.entries(materials)) {
    assert.match(material.fragmentShader, /gl_FragColor=vec4\(min\([^;]*vec3\(1\.2\)\)/, `${name} must clamp its colour to 1.2`);
  }
});

test('NITRO trail draws one side so the two tube walls never double the glow', () => {
  for (const [name, material] of Object.entries(materials)) assert.equal(material.side, FrontSide, name);
});

test('NITRO ignition swells the trail once per start, never as a repeating pulse', () => {
  const t = createNitroTrail(new Group(), REAR_PORTS), ignite = () => t.streaks.material.uniforms.ignite.value;
  t.setStyle(2, [1, .7, .2]);
  t.update(0, 0, 1, true);
  t.update(1, 1, 1, true);
  assert.equal(ignite(), 1, 'NITRO starts with a full swell');
  t.update(1.2, 1, 1, true);
  assert.ok(ignite() > 0 && ignite() < 1, 'the swell fades');
  for (const time of [1.5, 3, 9]) { t.update(time, 1, 1, true); assert.equal(ignite(), 0, `no second swell at ${time} s`); }
  t.update(10, 0, 1, true); t.update(11, 1, 1, true);
  assert.equal(ignite(), 1, 'the next NITRO swells again');
});

test('the halo shares the streaks\' visibility and, like the road glow, skips Low', () => {
  const t = createNitroTrail(new Group(), REAR_PORTS);
  t.setStyle(4, [.6, .35, 1.6]);
  t.update(0, 1, 1, true);
  assert.ok(t.halo.visible && t.halo.isInstancedMesh && t.halo.count === REAR_PORTS.length);
  t.update(0, 1, 0, true);
  assert.ok(t.streaks.visible && !t.halo.visible, 'Low skips the halo overdraw');
  t.update(0, 1, 1, false);
  assert.equal(t.halo.visible, false, 'VFX Off');
});
