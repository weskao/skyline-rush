import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHaptics } from '../src/haptics.ts';

function fakeDocument() {
  const created = [];
  const doc = {
    created, appended: [],
    body: { append: node => doc.appended.push(node) },
    createElement(tag) {
      const node = { tag, style: {}, attributes: {}, children: [], clicks: 0,
        setAttribute(name, value) { this.attributes[name] = value; },
        append(child) { this.children.push(child); },
        click() { this.clicks++; } };
      created.push(node);
      return node;
    },
  };
  return doc;
}
const timers = () => { const queue = []; return { queue, setTimeout: (fn, ms) => queue.push({ fn, ms }) }; };

test('Android keeps navigator.vibrate with the full pattern and adds no DOM', () => {
  const calls = [];
  const doc = fakeDocument();
  const pulse = createHaptics({ navigator: { vibrate: p => calls.push(p) }, document: doc, setTimeout: timers().setTimeout });
  pulse([18, 30, 18]);
  pulse(25);
  assert.deepEqual(calls, [[18, 30, 18], 25]);
  assert.equal(doc.created.length, 0);
});

test('a throwing vibrate never interrupts the race', () => {
  const pulse = createHaptics({ navigator: { vibrate() { throw new Error('blocked'); } }, document: fakeDocument(), setTimeout: timers().setTimeout });
  assert.doesNotThrow(() => pulse(15));
});

test('iOS (no vibrate) clicks one hidden switch label, created once', () => {
  const doc = fakeDocument();
  const clock = timers();
  const pulse = createHaptics({ navigator: {}, document: doc, setTimeout: clock.setTimeout });
  const [label, input] = doc.created;
  assert.equal(label.tag, 'label');
  assert.equal(input.tag, 'input');
  assert.equal(input.type, 'checkbox');
  assert.equal(input.attributes.switch, '');
  assert.equal(label.attributes['aria-hidden'], 'true');
  assert.equal(label.style.display, 'none');
  assert.deepEqual(label.children, [input]);
  assert.deepEqual(doc.appended, [label]);

  pulse(25);
  pulse(15);
  assert.equal(label.clicks, 2);
  assert.equal(clock.queue.length, 0);
  assert.equal(doc.created.length, 2, 'no new elements per pulse');
});

test('iOS plays one tick per on-segment of a pattern, at the pattern offsets', () => {
  const doc = fakeDocument();
  const clock = timers();
  const pulse = createHaptics({ navigator: {}, document: doc, setTimeout: clock.setTimeout });
  const label = doc.created[0];
  pulse([18, 30, 18]);
  assert.equal(label.clicks, 1);
  assert.deepEqual(clock.queue.map(t => t.ms), [48]);
  clock.queue[0].fn();
  assert.equal(label.clicks, 2);
});

test('the race HUD sends haptics through createHaptics, not navigator.vibrate directly', () => {
  const hud = readFileSync(new URL('../src/race-hud.ts', import.meta.url), 'utf8');
  assert.match(hud, /createHaptics\(/);
  assert.doesNotMatch(hud, /navigator\.vibrate/);
});
