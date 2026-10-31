import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installGameTouchGuard } from '../src/ios-touch-guard.ts';

function node({ native = false, scroll = false, parent = null } = {}) {
  return {
    nodeType: 1, parentElement: parent,
    closest: () => native ? {} : null,
    scrollHeight: scroll ? 201 : 100, clientHeight: 100,
    scrollWidth: 100, clientWidth: 100,
    overflowY: scroll ? 'auto' : 'visible', overflowX: 'visible',
  };
}
function fixture() {
  let handler, options, removed = false;
  const root = {
    defaultView: { getComputedStyle: el => ({ overflowY: el.overflowY, overflowX: el.overflowX }) },
    addEventListener(type, listener, opts) { assert.equal(type, 'touchstart'); handler = listener; options = opts; },
    removeEventListener(type, listener, capture) { removed = type === 'touchstart' && listener === handler && capture === true; },
  };
  function touch(target, { fingers = 1, cancelable = true } = {}) {
    const event = new Event('touchstart', { cancelable });
    Object.defineProperty(event, 'target', { value: target });
    Object.defineProperty(event, 'touches', { value: Array(fingers).fill({}) });
    handler(event);
    return event.defaultPrevented;
  }
  return { root, touch, get options() { return options; }, get removed() { return removed; } };
}

test('noninteractive game surface cancels iOS long-press on a single finger', () => {
  const f = fixture();
  installGameTouchGuard(f.root);
  assert.deepEqual(f.options, { capture: true, passive: false });
  assert.equal(f.touch(node()), true);
});

test('native buttons, links, inputs, labels, and custom focus targets keep their touch/click', () => {
  const f = fixture();
  installGameTouchGuard(f.root);
  assert.equal(f.touch(node({ native: true })), false);
});

test('touches inside a scrollable parent preserve native panel scrolling', () => {
  const f = fixture();
  installGameTouchGuard(f.root);
  assert.equal(f.touch(node({ parent: node({ scroll: true }) })), false);
});

test('pinch zoom, uncancelable events and cleanup preserve native accessibility behavior', () => {
  const f = fixture();
  const remove = installGameTouchGuard(f.root);
  assert.equal(f.touch(node(), { fingers: 2 }), false);
  assert.equal(f.touch(node(), { cancelable: false }), false);
  remove();
  assert.equal(f.removed, true);
});
