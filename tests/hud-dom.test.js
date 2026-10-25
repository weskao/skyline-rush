import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTextIfChanged, setHiddenIfChanged } from '../src/hud-dom.js';

// A DOM-like setter is enough to prove that high-frequency HUD updates do not
// reassign properties when their displayed value is already current.
function observed(initial) {
  let value = initial;
  let writes = 0;
  return {
    get value() { return value; },
    get writes() { return writes; },
    get textContent() { return value; },
    set textContent(next) { writes++; value = next; },
  };
}

test('steady HUD text writes are idempotent; locale/value changes still render', () => {
  const node = observed('RACING');
  setTextIfChanged(node, 'RACING');
  assert.equal(node.writes, 0);
  setTextIfChanged(node, '比賽中');
  assert.equal(node.value, '比賽中');
  assert.equal(node.writes, 1);
  setTextIfChanged(node, '比賽中');
  assert.equal(node.writes, 1);
});

test('steady HUD visibility does not thrash the DOM', () => {
  let hidden = true, writes = 0;
  const node = {
    get hidden() { return hidden; },
    set hidden(next) { hidden = next; writes++; },
  };
  setHiddenIfChanged(node, true);
  assert.equal(writes, 0);
  setHiddenIfChanged(node, false);
  assert.equal(writes, 1);
  setHiddenIfChanged(node, false);
  assert.equal(writes, 1);
});
