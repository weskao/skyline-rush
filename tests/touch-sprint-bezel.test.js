import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/touch-sprint-buttons.css', import.meta.url), 'utf8');
const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
const luminance = rgb => {
  const [r, g, b] = rgb.map(c => { const v = c / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };

// Top-level comma split: "a, color-mix(b, c) 5%" -> ["a", "color-mix(b, c) 5%"].
function split(list) {
  const parts = [''];
  let depth = 0;
  for (const char of list) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (char === ',' && depth === 0) parts.push(''); else parts[parts.length - 1] += char;
  }
  return parts.map(part => part.trim());
}
// State colours come from the :root NITRO / BOOST / FLY tokens in style.css.
const tokens = Object.fromEntries([...readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
  .matchAll(/(--(?:nitro|boost|fly)(?:-[a-z]+)?): (#[0-9a-f]{6});/g)].map(m => [m[1], hex(m[2])]));
// Resolve a colour: a literal, white/black, var(--token) or an srgb color-mix of those (gradient stop positions dropped).
function resolve(value, vars) {
  const expr = value.replace(/ \d+%$/, '');
  if (/^#[0-9a-f]{6}$/.test(expr)) return hex(expr);
  if (expr === 'white' || expr === 'black') return [0, 0, 0].map(() => expr === 'white' ? 255 : 0);
  const ref = expr.match(/^var\((--[a-z-]+)\)$/);
  if (ref) { assert.ok(vars[ref[1]], `unknown ${ref[1]}`); return vars[ref[1]]; }
  const mix = expr.match(/^color-mix\(in srgb, (.*)\)$/);
  assert.ok(mix, `unrecognised colour: ${value}`);
  const [from, to] = split(mix[1]), [, other, share] = to.match(/^(.*) (\d+)%$/), t = Number(share) / 100;
  const a = resolve(from, vars), b = resolve(other, vars);
  return a.map((c, i) => c * (1 - t) + b[i] * t);
}

test('every point of the bezel rim stands out from every button face and the dark road behind it', () => {
  const rule = css.match(/> button::before \{[^}]*background: linear-gradient\(148deg, (.*)\);/);
  assert.ok(rule, 'rim gradient not found');
  const stops = split(rule[1]);
  // Each state block's rim against the face it borders (the shaded side meets --face-bottom) and the darkest road the cluster sits on.
  const blocks = [...css.matchAll(/\{([^{}]*--rim: [^;]+;[^{}]*)\}/g)].map(m => m[1]);
  assert.ok(blocks.length >= 10, 'state colours not found');
  const weak = [];
  for (const block of blocks) {
    const rim = block.match(/--rim: ([^;]+);/)[1];
    const vars = { ...tokens, '--rim': resolve(rim, tokens) };
    const faces = [...block.matchAll(/--face-bottom: ([^;]+);/g)].map(m => m[1]);
    for (const stop of stops) for (const face of [...faces, '#0b1520']) {
      const ratio = contrast(resolve(stop, vars), resolve(face, tokens));
      // A fixed #162035 stop made the lower-right edges vanish on every button and DPR (ratio ~1.1).
      if (ratio < 1.6) weak.push(`${rim} ${stop} vs ${face}: ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(weak, []);
});
