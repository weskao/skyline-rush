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

// Resolve one gradient stop of the rim for a given --rim colour (srgb color-mix with white/black, or a literal).
function resolveStop(stop, rim) {
  const literal = stop.match(/^#[0-9a-f]{6}/);
  if (literal) return hex(literal[0]);
  const mix = stop.match(/^color-mix\(in srgb, var\(--rim\), (white|black) (\d+)%\)/);
  if (mix) { const t = Number(mix[2]) / 100, to = mix[1] === 'white' ? 255 : 0; return rim.map(c => c * (1 - t) + to * t); }
  assert.match(stop, /^var\(--rim\)/, `unrecognised rim stop: ${stop}`);
  return rim;
}

test('every point of the bezel rim stands out from every button face and the dark road behind it', () => {
  const rule = css.match(/> button::before \{[^}]*background: linear-gradient\(148deg, (.*)\);/);
  assert.ok(rule, 'rim gradient not found');
  const stops = [''];
  let depth = 0;
  for (const char of rule[1]) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (char === ',' && depth === 0) stops.push(''); else stops[stops.length - 1] += char;
  }
  stops.forEach((stop, i) => { stops[i] = stop.trim(); });
  // Each state block's rim against the face it borders (the shaded side meets --face-bottom) and the darkest road the cluster sits on.
  const blocks = [...css.matchAll(/\{([^{}]*--rim: #[0-9a-f]{6}[^{}]*)\}/g)].map(m => m[1]);
  assert.ok(blocks.length >= 10, 'state colours not found');
  const weak = [];
  for (const block of blocks) {
    const rim = block.match(/--rim: (#[0-9a-f]{6})/)[1];
    const faces = [...block.matchAll(/--face-bottom: (#[0-9a-f]{6})/g)].map(m => m[1]);
    for (const stop of stops) for (const face of [...faces, '#0b1520']) {
      const ratio = contrast(resolveStop(stop, hex(rim)), hex(face));
      // A fixed #162035 stop made the lower-right edges vanish on every button and DPR (ratio ~1.1).
      if (ratio < 1.6) weak.push(`${rim} ${stop} vs ${face}: ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(weak, []);
});
