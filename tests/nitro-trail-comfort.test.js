import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, FrontSide } from 'three';
import { createNitroTrail } from '../src/garage-nitro-trail.js';
import { REAR_PORTS } from '../src/aero-vfx.js';

// Guards .claude/rules/nitro-trail-vfx.md: the NITRO trail skins stay under the photosensitive flash band and cap their HDR.
const trail = createNitroTrail(new Group(), REAR_PORTS);
const materials = { streaks: trail.streaks.material, pool: trail.pool.material };

// Hz seen by one screen pixel for every `time*N`: inside sin/cos it is N/2π, anything else (fract/floor/step) repeats N times a second.
function flickers(source) {
  return [...source.matchAll(/time\*(\d+\.?\d*)/g)].map(match => {
    let depth = 0, open = -1;
    for (let i = match.index - 1; i >= 0 && open < 0; i--) {
      if (source[i] === ')') depth++;
      else if (source[i] === '(') { if (depth === 0) open = i; else depth--; }
    }
    const fn = open < 0 ? '' : source.slice(0, open).match(/(\w+)$/)?.[1];
    const n = Number(match[1]);
    return { term: match[0], fn, hz: fn === 'sin' || fn === 'cos' ? n / (2 * Math.PI) : n };
  });
}

test('NITRO trail animation never flickers a pixel faster than 3 Hz', () => {
  for (const [name, material] of Object.entries(materials)) {
    for (const shader of [material.vertexShader, material.fragmentShader]) {
      for (const f of flickers(shader)) assert.ok(f.hz <= 3, `${name}: ${f.fn}(${f.term}) flickers at ${f.hz.toFixed(2)} Hz`);
    }
  }
});

test('NITRO trail colour is capped so only a thin core reaches the bloom threshold', () => {
  for (const [name, material] of Object.entries(materials)) {
    assert.match(material.fragmentShader, /gl_FragColor=vec4\(min\([^;]*vec3\(1\.2\)\)/, `${name} must clamp its colour to 1.2`);
  }
});

test('NITRO trail draws one side so the two tube walls never double the glow', () => {
  for (const [name, material] of Object.entries(materials)) assert.equal(material.side, FrontSide, name);
});
