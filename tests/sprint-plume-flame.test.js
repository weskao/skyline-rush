import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Scene, Mesh, BoxGeometry, Vector3, Vector4 } from 'three';
import { REAR_PORTS, createAeroVFX } from '../src/aero-vfx.js';
import { createSprintPlume } from '../src/sprint-plume.ts';
import { THRUSTER_LOOKS, TIER_LOOKS, CHAIN_FLOW } from '../src/sprint-plume-looks.ts';
import { SPRINT_TIERS } from '../src/sprint-tier.ts';
import { FLAME_CYCLES, nitroFlame } from '../src/nitro-flame-texture.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';
import { createRace } from '../src/game.js';
import { NITRO_CHAIN_LIFT, vfxSettings } from '../src/vfx-settings.ts';

// Guards the textured sprint exhaust (.claude/rules/sprint-plume.md, docs/designs/sprint-tiers/DESIGN.md): the jets
// sample the shared flame texture, a thruster skin and a sprint tier are one row of data each, and the texture's
// scroll stays under the flash limits of .claude/rules/nitro-trail-vfx.md at the fastest tier and chain.
const frame = (over = {}) => ({ time: 2, power: 1, nitroMix: 0, reach: 5, brightness: 1, diamonds: 0.5, extreme: 0, tail: 0,
  quality: 1, enabled: true, calm: false, voidPulse: false, racing: true, grounded: true, ...over });
const build = () => { const parent = new Group(), plume = createSprintPlume(parent, REAR_PORTS); return { plume, jets: plume.jets, u: plume.jets[0].material.uniforms }; };
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fragment = build().jets[0].material.fragmentShader;
const TIER_IDS = Object.keys(SPRINT_TIERS).sort((a, b) => SPRINT_TIERS[a].level - SPRINT_TIERS[b].level);
const tierRow = id => [TIER_LOOKS[id].core, TIER_LOOKS[id].tongues, TIER_LOOKS[id].sheath, TIER_LOOKS[id].taper];
const near = (actual, expected, name) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-6, `${name}: ${actual} vs ${expected}`));

test('every jet samples the shared flame texture through the loader, with its sampler from creation', () => {
  const { jets } = build();
  for (const jet of jets) {
    assert.equal(jet.material.uniforms.flame, nitroFlame.uniform, `${jet.name} holds the loader's uniform: the image arrives as a value swap`);
    assert.ok(jet.material.uniforms.flame.value.isDataTexture, 'the neutral 1 x 1 until the image loads: same program before and after');
  }
  assert.match(fragment, /uniform sampler2D flame;/);
  assert.doesNotMatch(source('src/sprint-plume.ts'), /flame-noise|TextureLoader/, 'only src/nitro-flame-texture.ts names or loads the image');
});

// Same accounting as tests/nitro-trail-comfort.test.js (its helpers are not exported). The jets scroll by `clock`,
// which advances at most 1 s per second (the fastest tier on a x3 chain), so `clock*N` is at most N a second.
const SAMPLE = /texture2D\(flame,vec2\(([^()]*)\)\)\.([rgb]+)/g;
function flickers(shader) {
  return [...shader.matchAll(/(?:time|clock)\*(\d*\.?\d+)/g)].map(match => {
    let depth = 0, open = -1;
    for (let i = match.index - 1; i >= 0 && open < 0; i--) {
      if (shader[i] === ')') depth++;
      else if (shader[i] === '(') { if (depth === 0) open = i; else depth--; }
    }
    const fn = open < 0 ? '' : shader.slice(0, open).match(/(\w+)$/)?.[1], n = Number(match[1]);
    return { term: match[0], fn, texture: fn === 'vec2', hz: ['sin', 'cos', 'flow'].includes(fn) ? n / (2 * Math.PI) : n };
  });
}

test('the flame texture scrolls past one pixel no faster than 3 Hz in any channel, at the fastest tier and chain', () => {
  const samples = [...fragment.matchAll(SAMPLE)];
  assert.ok(samples.length >= 2, 'tongues (R) and turbulence + filaments (GB)');
  assert.equal(samples.length, fragment.split('texture2D(').length - 1, 'every texture read is a flame sample this test can account for');
  assert.deepEqual([...new Set(samples.flatMap(sample => [...sample[2]]))].sort(), ['b', 'g', 'r'], 'all three channels shape the jet');
  for (const [sample, coords, channels] of samples) {
    const [around, along] = coords.split(',');
    assert.doesNotMatch(around, /time|clock/, `${sample}: the pattern flows along the jet, it does not spin around it`);
    assert.doesNotMatch(along, /time/, `${sample}: scrolled by the tier clock, which Reduced Motion freezes`);
    const tiles = Number(along.match(/clock\*(\d*\.?\d+)/)?.[1] ?? 0), cycles = Math.max(...[...channels].map(channel => FLAME_CYCLES[channel]));
    assert.ok(tiles > 0, `${sample} flows`);
    assert.ok(tiles * cycles <= 3, `${sample} changes ${(tiles * cycles).toFixed(2)} times a second at one pixel`);
  }
});

test('every other animated term stays at or under 3 Hz; only flow() runs faster: at most 12 Hz and +-20%', () => {
  const amplitude = Number(fragment.match(/float flow\(float x\)\{return 1\.\+(\.\d+)\*sin\(x\);\}/)?.[1]);
  assert.ok(amplitude > 0 && amplitude <= 0.2, `flow() modulates by +-${amplitude}`);
  const terms = flickers(fragment).filter(f => !f.texture);
  assert.ok(terms.some(f => f.fn === 'flow' && f.hz >= 6), 'thin filaments race back at 6 Hz or more: speed without glow');
  for (const f of terms) assert.ok(f.hz <= (f.fn === 'flow' ? 12 : 3), `${f.fn}(${f.term}) runs at ${f.hz.toFixed(2)} Hz`);
  const hair = fragment.match(/float hair=([^;]*);/)?.[1] ?? '';
  assert.match(hair, /flow\(/, 'flow() rides the thin filaments');
  assert.equal(fragment.split('flow(').length - 1, 2, 'and nothing else: its definition and that one use');
});

test('the tier clock never runs faster than real time and holds still when the frame clock does', () => {
  const chain = Math.max(...NITRO_CHAIN_LIFT) - 1;
  for (const id of TIER_IDS) assert.ok(TIER_LOOKS[id].flow > 0 && TIER_LOOKS[id].flow + CHAIN_FLOW * chain <= 1 + 1e-9, `${id}: at most 1 on a x3 chain`);
  const { plume, jets, u } = build();
  plume.update(frame({ tier: 'nitro-boost', chain: 5, time: 0 }));
  const start = u.clock.value;
  for (let i = 1; i <= 40; i++) plume.update(frame({ tier: 'nitro-boost', chain: 5, time: i * 0.05 }));
  assert.ok(u.clock.value - start <= 2 + 1e-9, `a runaway chain still advances ${u.clock.value - start} s in 2 s`);
  assert.ok(u.clock.value - start > 1.5, 'the fastest tier runs close to real time');
  const held = u.clock.value;
  plume.update(frame({ tier: 'nitro-boost', time: 2 })); // Reduced Motion / Comfortable: aero-vfx.js stops `time`
  assert.equal(u.clock.value, held, 'frozen with the frame clock');
  assert.equal(new Set(jets.map(jet => jet.material.uniforms.clock.value)).size, jets.length, 'each jet reads its own stretch of the texture');
});

// The image may be late or missing (slow network, failed load): on the loader's mid-grey texel the jet is the whole,
// smooth flame, never a torn or dark one.
test('on the neutral fallback texel the jet is whole: no tongues torn out, no filaments, mean turbulence', () => {
  const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lick = fragment.match(/float lick=mix\(1\.,(\.\d+)\+(\d*\.\d+)\*smoothstep\((\.\d+),(\.\d+),tongue\),tear\);/);
  assert.ok(lick, 'tongues modulate the body');
  const [floor, gain, low, high] = lick.slice(1).map(Number);
  assert.ok(Math.abs(floor + gain * smoothstep(low, high, 0.5) - 1) < 1e-9, 'a mid-grey R leaves the body at 1');
  assert.ok(floor > 0, 'a gap between tongues dims, it never cuts to black');
  const hair = fragment.match(/float hair=smoothstep\((\.\d+),(\.\d+),fine\.y\)/);
  assert.ok(hair && Number(hair[1]) >= 0.5, 'a mid-grey B draws no filament');
  assert.match(fragment, /float tip=clamp\(t\+\(\.5-tongue\)\*/, 'a mid-grey R leaves the flame its plain length');
  assert.match(fragment, /\(\.5\+\.5\*fine\.x\)/, 'G is the old shimmer: 0.75 on mid-grey, as bright as before');
});

test('a thruster skin is one row of data: the shader has no hand-written skin branch and never changes', () => {
  const thrusters = GARAGE_SKINS.filter(skin => skin.category === 'thruster');
  assert.equal(THRUSTER_LOOKS.length, thrusters.length, 'one row per thruster skin, in catalog order');
  const code = source('src/sprint-plume.ts') + source('src/sprint-plume-looks.ts');
  for (const skin of thrusters) assert.ok(!code.includes(skin.id), `${skin.id} is not named: rows are picked by index`);
  assert.doesNotMatch(source('src/sprint-plume.ts'), /skinPattern>/, 'the envelope chain is generated from the table');
  assert.equal(fragment.split('skinPattern').length - 1, THRUSTER_LOOKS.length, 'declared once, then one generated select per row after the first');
  for (const row of THRUSTER_LOOKS) {
    assert.ok(Number.isInteger(row.tiles) && row.tiles >= 1 && Number.isInteger(row.strands), 'whole repeats around the tube: no seam');
    assert.ok(row.floor > 0 && row.floor + row.depth <= 1 + 1e-9, 'the envelope dims, it never adds light or cuts to black');
    assert.ok(row.spin / (2 * Math.PI) <= 3, 'the envelope turns under 3 Hz');
  }
  const { plume, jets } = build(), looks = new Set();
  THRUSTER_LOOKS.forEach((row, pattern) => {
    plume.setSkin([1, 1, 1], pattern, new Vector4(1, 1, 1, 0), 0);
    for (const jet of jets) {
      assert.equal(jet.material.fragmentShader, fragment, 'same program for every skin');
      near(jet.material.uniforms.look.value.toArray(), [row.tear, row.hair, row.tiles, row.stretch], `row ${pattern}`);
      assert.equal(jet.material.uniforms.skinPattern.value, pattern);
    }
    looks.add(jets[0].material.uniforms.look.value.toArray().join());
  });
  assert.equal(looks.size, THRUSTER_LOOKS.length, 'every skin has its own flame');
  plume.setSkin([1, 1, 1], THRUSTER_LOOKS.length + 3, new Vector4(1, 1, 1, 0), 0);
  near(jets[0].material.uniforms.look.value.toArray(), Object.values(build().u.look.value.toArray()), 'a skin with no row yet burns as the first row');
});

test('the tier arrives in the PlumeFrame and each tier is one row; no tier is the idle row', () => {
  assert.deepEqual(Object.keys(TIER_LOOKS).sort(), Object.keys(SPRINT_TIERS).sort(), 'one look per tier of src/sprint-tier.ts');
  for (const id of TIER_IDS) { const { plume, u } = build(); plume.update(frame({ tier: id })); near(u.tier.value.toArray(), tierRow(id), id); }
  const { plume, u } = build();
  plume.update(frame());
  near(u.tier.value.toArray(), tierRow('idle'), 'no tier');
  assert.doesNotMatch(source('src/sprint-plume.ts'), /sprintTier\(|nitroTime|boosting/, 'the plume does not re-derive the tier');
  assert.match(source('src/aero-vfx.js'), /jet\.tier = sprintTier\(/, 'aero-vfx.js names the tier with the shared ladder');
});

/** A held sprint at top speed through the real createAeroVFX. */
function held(player) {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace(), origin = new Vector3(), options = vfxSettings({ quality: 'high' });
  race.phase = 'racing'; Object.assign(race.player, { speed: 100 }, player);
  for (let i = 0; i < 40; i++) vfx.update(race, 0.05, origin, options, false);
  return scene.getObjectByName('Cold gas nozzle 1').material.uniforms.tier.value.toArray();
}

test('createAeroVFX tells the plume which tier the car is in: BOOST, NITRO, and NITRO with BOOST held', () => {
  near(held({ boosting: true }), tierRow('boost'), 'held BOOST');
  near(held({ miniBoost: 3 }), tierRow('boost'), 'a mini-boost is BOOST');
  near(held({ nitroTime: 30 }), tierRow('nitro'), 'NITRO');
  near(held({ nitroTime: 30, boosting: true }), tierRow('nitro-boost'), 'NITRO with BOOST held');
});

test('each tier is a visible step up: longer core, more tongues, longer flame, faster flow; the sheath is the combined look', () => {
  const sprints = TIER_IDS.filter(id => SPRINT_TIERS[id].level > 0).map(id => TIER_LOOKS[id]);
  assert.ok(sprints.length >= 3);
  for (let i = 1; i < sprints.length; i++) {
    const [low, high] = [sprints[i - 1], sprints[i]];
    assert.ok(high.core < low.core, 'the white-hot core falls off more slowly: a longer core');
    assert.ok(high.tongues > low.tongues && high.flow > low.flow, 'more tongues, faster flow');
    assert.ok(high.taper < low.taper, 'the flame keeps its light further back: BOOST is the short, tight jet');
  }
  assert.deepEqual(sprints.map(row => row.sheath > 0), sprints.map((_, i) => i === sprints.length - 1), 'only the top tier wears the second layer');
  assert.match(fragment, /mix\(color,vec3\(1\.,\.5,\.25\),/, 'the sheath is the --boost red-orange (#ff7f3f) around the NITRO core');
});

test('a tier change eases in: no pop when BOOST is pressed or released during NITRO', () => {
  const { plume, u } = build();
  plume.update(frame({ tier: 'nitro', time: 2 }));
  plume.update(frame({ tier: 'nitro-boost', time: 2.016 }));
  assert.ok(u.tier.value.z > 0 && u.tier.value.z < 0.5 * TIER_LOOKS['nitro-boost'].sheath, `one frame in, the sheath is at ${u.tier.value.z}`);
  for (let i = 2; i < 60; i++) plume.update(frame({ tier: 'nitro-boost', time: 2 + i * 0.016 }));
  near(u.tier.value.toArray(), tierRow('nitro-boost'), 'settled within a second');
});

test('a NITRO chain adds flow speed, never light: every light uniform matches the unchained jet', () => {
  const run = chain => {
    const { plume, jets } = build();
    for (let i = 0; i <= 20; i++) plume.update(frame({ tier: 'nitro', nitroMix: 1, chain, time: i * 0.05 }));
    const u = jets[0].material.uniforms;
    return { clock: u.clock.value, light: [u.power.value, u.brightness.value, u.glare.value, u.thick.value, ...u.tier.value.toArray(), ...u.look.value.toArray()] };
  };
  const plain = run(0), chained = run(Math.max(...NITRO_CHAIN_LIFT) - 1);
  assert.deepEqual(chained.light, plain.light);
  assert.ok(chained.clock > plain.clock, 'the flame flows faster');
});
