import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { icons, ICON_ATTRS, icon } from '../src/icons.ts';
import { SECTION_SIGN_LABELS, sectionSignKey } from '../src/section-signs.ts';

test('typed SVG icon contract preserves Vue and imperative renderer output', () => {
  const names = ['arrow', 'sound', 'mute', 'assist', 'camera', 'pause', 'restart',
    'lock', 'fly', 'road', 'left', 'right', 'pedal', 'brake', 'nitro', 'boost', 'star'];
  for (const name of names) {
    assert.ok(icons[name]?.startsWith('<'), `${name} SVG content must remain available`);
    assert.ok(icon(name).includes(icons[name]), `${name} must render identical paths`);
  }
  assert.equal(ICON_ATTRS.viewBox, '0 0 24 24');
  assert.equal(ICON_ATTRS['aria-hidden'], 'true');
  assert.equal(existsSync(new URL('../src/icons.js', import.meta.url)), false);
});

test('typed section-sign lookup never requests an unallocated WebGL material', () => {
  assert.equal(sectionSignKey('boost-tunnel'), 'boost-tunnel');
  for (const kind of Object.keys(SECTION_SIGN_LABELS))
    assert.equal(sectionSignKey(kind), kind);
  assert.equal(sectionSignKey('new-future-section'), 'gap');
  assert.equal(existsSync(new URL('../src/section-signs.js', import.meta.url)), false);
});
