import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, FrontSide, Vector3 } from 'three';
import { createNitroTrail } from '../src/garage-nitro-trail.js';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { FLAME_CYCLES } from '../src/nitro-flame-texture.ts';
import { MAX_SPEED, NITRO_CAP_BONUS } from '../src/drive-rules.ts';
import { VFX_RANGES, sprintFovOffset } from '../src/vfx-settings.ts';
import { RACE_CAMERA, rigBack, rigLook, rigHeight, rigFov } from '../src/race-camera.ts';

// Guards .claude/rules/nitro-trail-vfx.md: the NITRO trail skins stay under the photosensitive flash band and cap their HDR.
const trail = createNitroTrail(new Group(), REAR_PORTS);
const materials = { streaks: trail.streaks.material, halo: trail.halo.material, pool: trail.pool.material };

// Hz seen by one screen pixel for every `time*N`: inside sin/cos/flow it is N/2π, anything else (fract/floor/step) repeats N times a second.
function flickers(source) {
  return [...source.matchAll(/time\*(\d*\.?\d+)/g)].map(match => {
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

// A texture scrolled along V by `time*N` moves N tiles a second past one pixel; a channel with C light-dark cycles per
// tile then changes N x C times a second there. FLAME_CYCLES is the most the shader assumes of the contract texture.
const SAMPLE = /texture2D\(flame,vec2\(([^()]*)\)\)\.([rgb]+)/g;

test('the flame texture scrolls past one pixel no faster than 3 Hz in any channel it reads', () => {
  const shader = materials.streaks.fragmentShader, samples = [...shader.matchAll(SAMPLE)];
  assert.ok(samples.length > 0, 'the streaks sample the flame texture');
  assert.equal(samples.length, shader.split('texture2D(').length - 1, 'every texture read is a flame sample this test can account for');
  for (const [sample, coords, channels] of samples) {
    const [around, along] = coords.split(',');
    assert.doesNotMatch(around, /time/, `${sample}: the pattern flows along the trail, it does not spin around it`);
    const tiles = Number(along.match(/time\*(\d*\.?\d+)/)?.[1] ?? 0), cycles = Math.max(...[...channels].map(channel => FLAME_CYCLES[channel]));
    assert.ok(tiles * cycles <= 3, `${sample} changes ${(tiles * cycles).toFixed(2)} times a second at one pixel`);
  }
  for (const name of ['halo', 'pool']) assert.doesNotMatch(materials[name].fragmentShader, /texture2D|sampler2D/, `${name}: wide overdraw takes no texture fetch`);
});

// Same projection as `pixels()` in tests/sprint-plume.test.js (not exported there): CSS px one metre covers `behind` m
// behind the nozzles in the live chase rig.
const PHONES = [['landscape 844x390', RACE_CAMERA.chase, 390], ['portrait 390x844', RACE_CAMERA.chasePortrait, 844]];
function pixelsPerMetre(view, rows, speed, share, behind) {
  const fov = rigFov(view, speed) + sprintFovOffset({ fov: share, punch: 0 }, { enabled: true, fov: VFX_RANGES.fov[4] });
  const eye = new Vector3(0, rigHeight(view, 0), rigBack(view, fov));
  const axis = new Vector3(0, rigLook(view, fov, share), -view.ahead).sub(eye).normalize();
  const [, y, z] = REAR_PORTS[0].position, depth = new Vector3(0, y, z + behind).sub(eye).dot(axis);
  return rows / depth / (2 * Math.tan(fov * Math.PI / 360));
}
// The one deliberate exception to "nothing past the exposure normalisation" (docs/designs/nitro-flame/DESIGN.md): a
// white-hot core at each nozzle. All four together cover at most this share of a phone frame, seen side-on (the chase
// camera foreshortens them to less), and nothing animates their brightness.
const CORE_SHARE = 0.0075;

test('the white-hot nozzle core is the only light past the .66 normalisation: steady, and at most 0.75% of a phone frame', () => {
  const shader = materials.streaks.fragmentShader;
  const white = shader.match(/float white=([^;]*);/)?.[1];
  assert.ok(white, 'the streaks have a nozzle core');
  const names = new Set(white.match(/[A-Za-z_]\w*/g));
  for (const name of names) assert.ok(['smoothstep', 'u', 'trailLength', 'vWide', 'f'].includes(name), `the core depends on \`${name}\`: no time, ignition, flow, hash or texture on its brightness`);
  const length = Number(white.match(/smoothstep\([\d.]+,([\d.]+),u\*trailLength\)/)?.[1]);
  const radius = Number(white.match(/smoothstep\([\d.]+,([\d.]+),vWide\)/)?.[1]);
  assert.ok(length > 0 && radius > 0, `the core ends ${length} m behind the nozzle and where the jet is ${radius} m in radius`);
  assert.match(materials.streaks.vertexShader, /varying float vWide;/);
  assert.match(materials.streaks.vertexShader, /vWide=r;/, 'vWide is the radius the jet is drawn at');
  const added = shader.split(/light\*=\.66\/max\(\.66,[^;]*;/)[1];
  assert.match(added, /^\s*light\+=([^;]*)\*white\*[\d.]+;\s*gl_FragColor=/, 'the core is the only term added after the normalisation');
  assert.doesNotMatch(added.split('gl_FragColor=')[0], /time|ignite|flow\(|hash\(|texture|power/, 'nothing animates the core colour');
  for (const [phone, view, rows] of PHONES) for (const [speed, share] of [[MAX_SPEED + NITRO_CAP_BONUS, 1], [0, 0]]) {
    const scale = pixelsPerMetre(view, rows, speed, share, length);
    const area = REAR_PORTS.length * (2 * radius * scale) * (length * scale), frame = 844 * 390;
    assert.ok(area <= CORE_SHARE * frame, `${phone} at ${speed} m/s: four cores cover up to ${area.toFixed(0)} px², ${(100 * area / frame).toFixed(2)}% of the frame`);
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
