import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FREEZE_SHELL } from '../src/debuff/freeze/freeze-shell.ts';

// The Freeze look on the HUD and the shell (user 2026-11-21): frost feathers and cracks at the screen edge, a frosted
// hex card with icicles, an icy speedometer; motion only when it is allowed, a static look otherwise.
const read = file => readFileSync(new URL(`../src/debuff/freeze/${file}`, import.meta.url), 'utf8');
const css = read('freeze.css');

/** The CSS with every `@media (prefers-reduced-motion: no-preference) { … }` block cut out, and those blocks. */
function splitMotion(source) {
  const blocks = [];
  let rest = source, at;
  while ((at = rest.indexOf('@media (prefers-reduced-motion: no-preference)')) >= 0) {
    let depth = 0, end = rest.indexOf('{', at);
    for (let i = end; i < rest.length; i++) {
      if (rest[i] === '{') depth++;
      else if (rest[i] === '}' && --depth === 0) { end = i; break; }
    }
    blocks.push(rest.slice(at, end + 1));
    rest = rest.slice(0, at) + rest.slice(end + 1);
  }
  return { still: rest, blocks };
}

test('Freeze animates only when motion is allowed and the HUD is not calm; disabled VFX stays static', () => {
  const { still, blocks } = splitMotion(css);
  assert.doesNotMatch(still.replace(/animation:\s*none[^;]*;/g, ''), /animation:/, 'every animation sits behind the reduced-motion query');
  const rules = blocks.join('\n').match(/[^{}]+\{[^{}]*animation:[^{}]*\}/g) ?? [];
  assert.ok(rules.length >= 8, `screen, card and speedometer move (${rules.length} rules)`);
  for (const rule of rules) assert.match(rule.split('{')[0], /data-calm="false"/, `calm stops ${rule.split('{')[0].trim()}`);
  const off = css.match(/body\[data-vfx-enabled="false"\][^{]*\{[^}]*\}/g)?.join('\n') ?? '';
  for (const part of ['freeze-screen', 'freeze-panel', 'speedometer[data-debuff="freeze"]']) assert.ok(off.includes(part), `disabled VFX stills ${part}`);
  assert.match(off, /animation:\s*none\s*!important/);
  for (const name of css.matchAll(/@keyframes\s+([\w-]+)/g)) assert.match(name[1], /^(freeze-|speed-frost)/);
});

test('the frost frames the screen edge and keeps its centre and the HUD clear', () => {
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.match(css, /\.freeze-screen\s*\{[^}]*mask-image:\s*radial-gradient\([^;]*transparent/, 'the centre stays clear');
  assert.match(css, /#player-hit-screen\[data-hit="freeze"\]\s*\{[^}]*background:/, 'no flat blue tint over the whole view');
  for (const scope of ['[data-hit-layer="freeze"][data-phase="recovery"]', '[data-debuff="freeze"][data-phase="recovery"]']) {
    assert.ok(css.includes(scope), `${scope} thaws`);
  }
  const screen = read('FreezeScreen.vue');
  assert.match(screen, /freeze-frost/, 'frost feathers');
  assert.match(screen, /freeze-crack/, 'ice cracks');
  assert.match(screen, /freeze-snow/, 'drifting snow');
  for (const file of ['FreezeScreen.vue', 'FreezePanelDecor.vue']) assert.match(read(file), /:key="hits"/, `${file} replays on a repeated hit`);
  assert.match(read('FreezePanelDecor.vue'), /freeze-panel-icicles/);
});

test('the shell frosts with feathered frost and cracks, detail only above Low, and dissolves as it fades', () => {
  const { glsl } = FREEZE_SHELL;
  assert.match(glsl, /vec3 freezeShell\(vec3 p,vec3 tint,float body,float edge,float age,float seed,float level\)/);
  assert.doesNotMatch(glsl, /for\s*\(/, 'no per-pixel loops: the shell is drawn per car, additive');
  assert.match(glsl, /if\(rim>0\.\)/, 'Low draws the tint only');
  assert.match(glsl, /fern/, 'feathered frost');
  assert.match(glsl, /crack/, 'crackle');
  assert.match(glsl, /melt/, 'the frost dissolves in patches as the level fades');
  assert.equal(FREEZE_SHELL.pop(0), 1);
});
