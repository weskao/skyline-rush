import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPRINT_TIERS } from '../src/sprint-tier.ts';
import { CATALOGS } from '../src/i18n.ts';
import { createSprintTierHud } from '../src/sprint-tier-hud.ts';

// The in-race HUD reads the sprint ladder (src/sprint-tier.ts) through one module and one body attribute.
// Before this guard BOOST, NITRO and both together were told apart by three body classes: with both running the
// speed caption said BOOST ENGAGED while the flight state said NITRO ACTIVE, and both touch buttons burned the same
// full-height flame on the same 0.7 s loop. Rule: .claude/rules/touch-sprint-buttons.md.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const style = read('src/style.css'), buttons = read('src/touch-sprint-buttons.css'), hud = read('src/race-hud.ts');
const rules = (css, selector) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(m => selector.test(m[1].trim())).map(m => ({ selector: m[1].trim(), body: m[2] }));
const number = (body, name) => Number.parseFloat(body.match(new RegExp(`${name}:\\s*([\\d.]+)`))?.[1] ?? 'NaN');
const tiers = Object.keys(SPRINT_TIERS).filter(id => id !== 'idle').sort((a, b) => SPRINT_TIERS[a].level - SPRINT_TIERS[b].level);
const rising = values => values.every((value, index) => Number.isFinite(value) && (index === 0 || value > values[index - 1]));

// A body stand-in that counts attribute writes: the HUD tick runs ~13 times a second.
function root() {
  const writes = [];
  const dataset = new Proxy({}, {
    set(target, key, value) { writes.push(`${key}=${value}`); target[key] = value; return true; },
    deleteProperty(target, key) { writes.push(`-${key}`); delete target[key]; return true; },
  });
  return { dataset, writes };
}
const en = CATALOGS.en, zh = CATALOGS['zh-TW'];

test('the body carries the tier id while racing, written on change only', () => {
  const body = root(), tier = createSprintTierHud(body);
  for (let tick = 0; tick < 5; tick++) tier.update(true, false, false, 0, en);
  assert.deepEqual(body.writes, [], 'idle writes nothing');
  for (let tick = 0; tick < 5; tick++) tier.update(true, false, true, 0, en);
  assert.deepEqual(body.writes, ['sprintTier=boost']);
  for (let tick = 0; tick < 5; tick++) tier.update(true, true, false, 1, en);
  for (let tick = 0; tick < 5; tick++) tier.update(true, true, true, 1, en);
  assert.deepEqual(body.writes, ['sprintTier=boost', 'sprintTier=nitro', 'sprintTier=nitro-boost']);
  for (let tick = 0; tick < 5; tick++) tier.update(false, true, true, 1, en);
  assert.deepEqual(body.writes.slice(3), ['-sprintTier'], 'removed once outside a race');
  assert.equal('sprintTier' in body.dataset, false);
});

test('a NITRO chain adds its step, capped at the x3 look, and leaves with NITRO', () => {
  const body = root(), tier = createSprintTierHud(body);
  tier.update(true, false, true, 3, en);
  assert.equal(body.dataset.sprintChain, undefined, 'a stale burst count without NITRO is no chain');
  tier.update(true, true, false, 1, en);
  assert.equal(body.dataset.sprintChain, undefined, 'the first charge is the plain tier');
  tier.update(true, true, false, 2, en); tier.update(true, true, false, 2, en);
  assert.equal(body.dataset.sprintChain, '2');
  tier.update(true, true, true, 3, en);
  assert.equal(body.dataset.sprintChain, '3');
  tier.update(true, true, true, 5, en);
  assert.equal(body.dataset.sprintChain, '3');
  assert.deepEqual(body.writes.filter(write => write.includes('sprintChain')), ['sprintChain=2', 'sprintChain=3']);
  tier.update(true, false, true, 5, en);
  assert.equal('sprintChain' in body.dataset, false);
});

test('every tier above idle has one caption per language; the combined tier has its own', () => {
  for (const [locale, copy] of Object.entries(CATALOGS)) {
    const captions = tiers.map(id => copy[`hud.tier.${id}`]);
    for (const [index, caption] of captions.entries()) assert.ok(caption, `${locale} hud.tier.${tiers[index]}`);
    assert.equal(new Set(captions).size, captions.length, `${locale}: each tier reads differently`);
    assert.match(copy['hud.tier.nitro-boost'], /NITRO.*BOOST/, `${locale}: the combined tier names both, once`);
    assert.equal(copy['hud.tier.nitro-boost'].match(/NITRO|BOOST/g).length, 2);
  }
  assert.equal(en['hud.boostEngaged'], undefined, 'the BOOST caption has one home: hud.tier.boost');
  assert.equal(en['hud.nitroChain'], undefined, 'the chain caption has one home: hud.tierChain.nitro');
});

test('update returns the caption of the running tier, in the catalog it was handed', () => {
  const tier = createSprintTierHud(root());
  assert.equal(tier.update(true, false, false, 0, en), undefined);
  assert.equal(tier.update(true, false, true, 0, en), en['hud.tier.boost']);
  assert.equal(tier.update(true, true, false, 1, en), 'NITRO ACTIVE');
  assert.equal(tier.update(true, true, true, 1, en), en['hud.tier.nitro-boost']);
  assert.equal(tier.update(true, true, true, 1, zh), zh['hud.tier.nitro-boost'], 'a language switch needs no tier change');
  assert.equal(tier.update(true, true, false, 2, en), 'NITRO ×2');
  assert.equal(tier.update(true, true, false, 3, en), 'NITRO ×3');
  assert.match(tier.update(true, true, true, 3, en), /NITRO ×3.*BOOST/);
  assert.match(tier.update(true, true, true, 3, zh), /NITRO ×3.*BOOST/);
  assert.equal(tier.update(false, true, true, 3, en), undefined, 'no tier caption outside a race');
});

test('each tier is one CSS rule on body[data-sprint-tier]: taller, faster, brighter with its level', () => {
  const ladder = tiers.map(id => {
    const found = rules(style, new RegExp(`^body\\[data-sprint-tier="${id}"\\]$`));
    assert.equal(found.length, 1, `one rule for ${id}`);
    assert.doesNotMatch(found[0].body, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, `${id}: colours come from the :root tokens`);
    return found[0].body;
  });
  assert.ok(rising(ladder.map(body => number(body, '--tier-lift'))), 'flame height rises');
  assert.ok(rising(ladder.map(body => -number(body, '--tier-loop'))), 'the loop gets faster');
  assert.ok(rising(ladder.map(body => number(body, '--tier-glow'))), 'the glow grows');
  const combined = ladder.at(-1);
  assert.match(combined, /var\(--nitro\b/, 'gold core');
  assert.match(combined, /var\(--boost\b/, 'red-orange rim');
  for (const body of ladder.slice(0, -1)) assert.ok(!(body.includes('var(--nitro') && body.includes('var(--boost')), 'only the combined tier mixes the two');
});

test('the x2 and x3 chain each step up again, and the tallest flame stays inside the flame box', () => {
  const chain = [2, 3].map(n => rules(style, new RegExp(`^body\\[data-sprint-chain="${n}"\\]$`)));
  for (const found of chain) assert.equal(found.length, 1);
  const lifts = chain.map(found => number(found[0].body, '--chain-lift')), paces = chain.map(found => number(found[0].body, '--chain-pace'));
  assert.ok(rising([1, ...lifts]), 'chain lifts the flame');
  assert.ok(rising([-1, ...paces.map(pace => -pace)]), 'chain speeds the loop');
  assert.ok(rising([0, ...chain.map(found => number(found[0].body, '--chain-glow'))]), 'chain widens the glow');
  // Above ~1.05 the NITRO flame covers the NITRO meter (landscape) and the mode panel (portrait).
  const top = number(rules(style, /^body\[data-sprint-tier="nitro-boost"\]$/)[0].body, '--tier-lift') * lifts[1];
  assert.ok(top <= 1.05, `tallest flame ${top}`);
});

test('the touch buttons read the ladder through variables, with no tier id of their own', () => {
  assert.doesNotMatch(buttons, /data-sprint-tier="/, 'a new tier is one rule in style.css, not a second one here');
  const active = rules(buttons, /^body\[data-sprint-tier\] #touch-controls :is\(\[data-nitro-state="active"\], \[data-boost-state="active"\]\)$/);
  assert.equal(active.length, 1);
  assert.match(active[0].body, /--flame-lift:[^;]*var\(--tier-lift[^;]*var\(--chain-lift/);
  assert.match(active[0].body, /--flame-loop:[^;]*var\(--tier-loop[^;]*var\(--chain-pace/);
  assert.match(active[0].body, /--flame-glow:[^;]*var\(--tier-glow[^;]*var\(--chain-glow/);
  assert.match(active[0].body, /box-shadow:[^;]*var\(--flame-glow/, 'the glow is static: it is the ladder when motion is off');
  // --flame-rest stays the per-state size (tests/hud-3x-artwork-browser.spec.js reads it); the tier scales beside it.
  assert.match(rules(buttons, /^#touch-controls \.sprint-ready-effect::before$/)[0].body, /scaleY\(calc\(var\(--flame-rest, \.2\) \* var\(--flame-lift, 1\)\)\)/);
});

test('race-hud.ts reads the tier from the wiring module and names no tier itself', () => {
  assert.match(hud, /from '\.\/sprint-tier-hud\.ts'/);
  assert.doesNotMatch(hud, /sprintTier\(|'nitro-boost'|hud\.tier|hud\.boostEngaged|hud\.nitroChain/);
});
