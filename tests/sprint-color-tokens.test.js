import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// One set of :root tokens colours NITRO (gold), BOOST (red-orange) and FLY (cyan) on every surface.
// Before this guard each element hard-coded its own hex: a purple NITRO button beside a gold NITRO meter,
// an amber BOOST button draining a cyan bar.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const style = read('src/style.css');
const buttons = read('src/touch-sprint-buttons.css');
const app = read('src/App.vue');
const aero = read('src/aero-vfx.js');
const hud = read('src/race-hud.ts');

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function hue(hex) {
  const [r, g, b] = rgb(hex).map(c => c / 255), max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d;
  return (h * 60 + 360) % 360;
}
const tokens = Object.fromEntries([...style.matchAll(/(--(?:nitro|boost|fly)(?:-[a-z]+)?): (#[0-9a-f]{6});/g)].map(m => [m[1], m[2]]));
// Every rule whose selector matches, with its declarations, in source order.
const rules = (css, selector) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(m => selector.test(m[1].trim())).map(m => ({ selector: m[1].trim(), body: m[2] }));

test('the :root palette keeps NITRO gold, BOOST red-orange and FLY cyan, far enough apart to tell at a glance', () => {
  for (const name of ['--nitro', '--nitro-text', '--nitro-deep', '--boost', '--boost-text', '--boost-deep', '--fly', '--fly-text', '--fly-deep']) {
    assert.ok(tokens[name], `${name} is defined on :root`);
  }
  const nitro = hue(tokens['--nitro']), boost = hue(tokens['--boost']);
  assert.ok(nitro >= 38 && nitro <= 45, `NITRO matches the in-world ring gold (~41°): ${nitro.toFixed(1)}°`);
  assert.ok(boost >= 16 && boost <= 24, `BOOST is red-orange: ${boost.toFixed(1)}°`);
  assert.ok(nitro - boost >= 15, `NITRO and BOOST hues stay ≥ 15° apart: ${(nitro - boost).toFixed(1)}°`);
  assert.equal(tokens['--fly'], '#83ceeb', 'FLY keeps its cyan');
  for (const family of ['nitro', 'boost']) for (const variant of ['-text', '-deep']) {
    const drift = Math.abs(hue(tokens[`--${family}${variant}`]) - hue(tokens[`--${family}`]));
    assert.ok(drift <= 6, `--${family}${variant} stays in the --${family} hue family (${drift.toFixed(1)}°)`);
  }
});

test('the NITRO and BOOST touch buttons draw every colour from the tokens, with no purple left', () => {
  // Neutral greys (disabled) and the white flame core are the only literals allowed.
  const neutral = new Set(['#fff', '#8794a8', '#384558', '#1c2836']);
  for (const [action, selector] of [['nitro', /\.touch-nitro/], ['boost', /\.touch-boost/]]) {
    // Rules shared by the whole cluster (they also name .touch-gas) carry no action colour.
    const found = rules(buttons, selector).filter(rule => !rule.selector.includes('.touch-gas') && /--rim|--face|--flame|color|background/.test(rule.body));
    assert.ok(found.length >= 4, `${action} state rules found`);
    for (const rule of found) {
      const literals = (rule.body.match(/#[0-9a-f]{3,8}\b/g) ?? []).filter(hex => !neutral.has(hex));
      assert.deepEqual(literals, [], `${rule.selector} uses tokens, not literals`);
    }
    assert.ok(found.some(rule => rule.body.includes(`var(--${action})`)), `${action} rules reference var(--${action})`);
  }
  assert.match(rules(buttons, /\.touch-fly$/)[0].body, /--rim: var\(--fly\)/);
});

test('the NITRO and BOOST icons and the Controls preview follow the tokens', () => {
  for (const action of ['nitro', 'boost']) {
    const svg = app.match(new RegExp(`class="touch-${action}"[\\s\\S]*?</svg>`))[0];
    assert.doesNotMatch(svg, /(fill|stroke)="#/, `${action} icon has no hard-coded colour`);
    assert.match(svg, new RegExp(`var\\(--${action}`), `${action} icon uses the ${action} tokens`);
  }
  const preview = [...rules(buttons, /controls-preview-keys \.touch-nitro/), ...rules(style, /^\s*\.controls-preview-keys \.touch-(boost|fly)$/)];
  assert.equal(preview.length, 3);
  for (const rule of preview) assert.doesNotMatch(rule.body, /#[0-9a-f]{3,8}\b/, `${rule.selector} uses tokens`);
});

test('the NITRO meter, HUD text and callout are NITRO gold', () => {
  assert.match(rules(style, /^\s*\.nitro-segment i$/)[0].body, /background: var\(--nitro\)/);
  assert.match(rules(style, /^\s*\.nitro-segment\.is-full$/)[0].body, /var\(--nitro/);
  assert.match(rules(style, /^\s*\.nitro-hud$/)[0].body, /color: var\(--nitro-text\)/);
  assert.match(rules(style, /^\s*\.event-callout\[data-kind="nitro"\]$/)[0].body, /color: var\(--nitro-text\)/);
});

test('the shared charge bar, BOOST status and speed ticks turn BOOST colour only while BOOST drains', () => {
  // body.boosting also covers NITRO and the tunnel mini-boost, so BOOST gets its own narrow signal.
  assert.match(hud, /classList\.toggle\('boost-draining', car\.boosting && race\.phase === 'racing'\)/);
  const bar = rules(style, /^\s*\.boost-draining \.fuel-track > i$/);
  assert.equal(bar.length, 1);
  assert.match(bar[0].body, /background: var\(--boost\)/);
  // Low fuel stays red: every .low-charge bar rule comes after the BOOST tint at the same specificity.
  const at = selector => style.indexOf(selector);
  assert.ok(at('.low-charge .fuel-track > i { background: #ff7c76') > at('.boost-draining .fuel-track > i'), 'low-fuel red wins over the BOOST tint');
  assert.ok(at('.boost-draining .fuel-track > i') > at('.airborne .fuel-track > i'), 'BOOST tint wins over airborne cyan');
  assert.match(rules(style, /^\s*\.boost-status$/)[0].body, /color: [^;]*var\(--boost/);
  assert.match(rules(style, /^\s*\.boost-status\[data-state="active"\]$/)[0].body, /var\(--boost/);
  assert.match(rules(style, /^\s*\.boost-draining \.speed-ticks > i\.active$/)[0].body, /var\(--boost\)/);
  assert.match(rules(style, /^\s*\.nitro-active \.speed-ticks > i\.active$/)[0].body, /var\(--nitro\)/);
  assert.ok(at('.nitro-active .speed-ticks > i.active') > at('.boost-draining .speed-ticks > i.active'), 'NITRO gold wins while both run');
});

test('desktop key hints and Controls key bindings take the action colours', () => {
  for (const action of ['fly', 'boost', 'nitro']) {
    assert.match(style, new RegExp(`:is\\(\\[data-keys="${action}"\\], \\[data-rebind="${action}"\\]\\) \\{ --key: var\\(--${action}\\); \\}`));
  }
  // Each surface that draws those keys reads --key, falling back to its old neutral colour.
  for (const selector of [/^\s*kbd$/, /^\s*\.guide-screen kbd$/, /^\s*#tutorial-input kbd$/, /^\s*\.keymap-binding b$/]) {
    assert.match(rules(style, selector)[0].body, /var\(--key,/, String(selector));
  }
});

test('the default 3D NITRO trail and shock are NITRO gold; trail skins still replace them', () => {
  assert.doesNotMatch(aero, /vec3\(\.72,\.4,1\.\)|vec3\(\.68,\.42,1\.\)|#b98aff|NITRO purple|NITRO is purple/i);
  // GLSL literal of each channel, written the way the shaders do: 1 → "1.", 0.82 → ".82".
  const glsl = c => { const v = String(+(c / 255).toFixed(2)); return v === '1' ? '1.' : v.replace(/^0/, ''); };
  const shader = `mix(vec3(${rgb(tokens['--nitro']).map(glsl).join(',')}),trailAccent.rgb,trailAccent.a)`;
  assert.equal(aero.split(shader).length - 1, 2, `flow and jet shaders mix ${shader}`);
  assert.equal(aero.split(`'${tokens['--nitro']}'`).length - 1, 2, 'the standard shock ring is the --nitro hex');
});
