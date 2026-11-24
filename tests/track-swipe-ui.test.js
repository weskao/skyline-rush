import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBeginTrackSwipe } from '../src/track-swipe-ui.ts';

const base = { button: 0, phase: 'ready', tutorial: false, editing: false, busy: false, dialogOpen: false,
  pointerType: 'touch', clientX: 200, width: 390 };
test('track swipe admits touch drag in center and rejects back-edge gestures', () => {
  assert.equal(canBeginTrackSwipe(base), true);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 390 }), false);
  assert.equal(canBeginTrackSwipe({ ...base, clientX: 0, pointerType: 'mouse' }), true);
});
test('track swipe cannot capture inputs during game play, modal and layout editing', () => {
  for (const state of [{ phase: 'racing' }, { tutorial: true }, { editing: true }, { busy: true }, { dialogOpen: true }, { button: 2 }]) {
    assert.equal(canBeginTrackSwipe({ ...base, ...state }), false);
  }
});

test('swipe preview rendering always reads the live race getter instead of a stale or undeclared race variable', async () => {
  const { readFileSync } = await import('node:fs');
  const code = readFileSync(new URL('../src/track-swipe-ui.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /getWorld\(\)\.render\(race\s*,/, 'a stale undeclared race breaks track swipe render snapshots');
  assert.match(code, /world\.renderSnapshot\(getRace\(\)/, 'snapshots must use live selected race');
});

test('track preview swipe resolves playable and future card IDs without creating a Race', async () => {
  const swipe = await import('../src/track-swipe-ui.ts');
  assert.equal(typeof swipe.swipeTrackId, 'function', 'carousel must recognize upcoming cards');
  assert.equal(swipe.swipeTrackId({ dataset: { track: 'cosmic' } }), 'cosmic');
  assert.equal(swipe.swipeTrackId({ dataset: { upcomingTrack: 'dune-tempest' } }), 'dune-tempest');
  assert.equal(swipe.swipeTrackId({ dataset: {} }), '');
});

test('desktop horizontal paging accepts the lobby and collapsed track rail but leaves nested scrollers alone', async () => {
  const { acceptsTrackWheelTarget } = await import('../src/track-swipe-ui.ts');
  const target = (...ancestors) => ({ closest: selector => ancestors.some(item => selector.split(', ').includes(item)) ? {} : null });
  const scene = target('#world');
  const heading = target('#intro');
  const rail = target('#intro', '.track-select');
  assert.equal(acceptsTrackWheelTarget(scene, true), true);
  assert.equal(acceptsTrackWheelTarget(heading, true), true);
  assert.equal(acceptsTrackWheelTarget(rail, true), true);
  assert.equal(acceptsTrackWheelTarget(rail, false), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', '#track-chooser'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', '#lobby-mode-options'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('#intro', 'select'), true), false);
  assert.equal(acceptsTrackWheelTarget(target('.settings-panel'), true), false);
});

function swipeFixture(t, tracks = ['coast', 'neon']) {
  const captures = [];
  class Node extends EventTarget {
    children = [];
    dataset = {};
    classList = { contains: () => false, toggle() {} };
    style = { setProperty() {} };
    animations = [];
    get childElementCount() { return this.children.length; }
    get firstElementChild() { return this.children[0] ?? null; }
    get lastElementChild() { return this.children.at(-1) ?? null; }
    getAttribute() { return null; }
    setAttribute() {}
    setPointerCapture() {}
    querySelector() { return new Node(); }
    replaceChildren(...children) { this.children = children; }
    after(node) { this.layer = node; }
    append(...children) { this.children.push(...children); }
    getAnimations() { return this.animations; }
    getContext() { return { drawImage: canvas => captures.push(canvas.lastPaint) }; }
    animate() {
      let finish;
      const finished = new Promise(resolve => { finish = resolve; });
      const animation = { finished, finish, cancel: finish };
      this.animations = [animation];
      return animation;
    }
  }
  const canvas = new Node();
  const home = new Node();
  const buttons = tracks.map(track => Object.assign(new Node(), {
    dataset: track === 'dune-tempest' ? { upcomingTrack: track } : { track },
  }));
  const document = Object.assign(new Node(), {
    createElement: tag => Object.assign(new Node(), { tagName: tag.toUpperCase() }),
    querySelector: selector => selector === '#world' ? canvas : selector === '#intro' ? home : selector === 'dialog[open]' ? null : new Node(),
    querySelectorAll: () => buttons,
  });
  const saves = new Map();
  const rafs = [];
  for (const [key, value] of Object.entries({ document, innerWidth: 800, requestAnimationFrame: callback => rafs.push(callback), MutationObserver: class { observe() {} } })) {
    saves.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of saves) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  let race = { trackId: tracks[0], phase: 'ready' }, active = race.trackId, blocked = true;
  let stage = null, stageReady = true;
  let selected = 0;
  const world = {
    render(race) {
      if (blocked && race.trackId === 'neon') return false;
      canvas.lastPaint = stage ?? race.trackId;
      return true;
    },
    renderSnapshot(race) { return this.render(race); },
    setUpcomingTrack(id) { stage = stageReady ? id : null; return stage !== null; },
  };
  const gesture = (type, x) => canvas.dispatchEvent(Object.assign(new Event(type), {
    button: 0, pointerType: 'touch', pointerId: 1, clientX: x, clientY: 300,
  }));
  return {
    canvas, captures, world, getRace: () => race, selectedRace: trackId => ({ ...race, trackId }),
    getWorld: () => world, applyTrack: trackId => {
      selected++; active = trackId;
      if (trackId === 'dune-tempest') world.setUpcomingTrack(trackId);
      else { world.setUpcomingTrack(null); race = { ...race, trackId }; }
    },
    getSelectedTrackId: () => active, previewOnlyTrack: id => id === 'dune-tempest' ? id : null,
    calmMotion: () => false, motionOptions: () => ({}),
    isTutorialActive: () => false, isEditingLayout: () => false, touchMatches: () => true,
    drag: (x = 380) => { gesture('pointerdown', 500); gesture('pointermove', x); },
    move: x => gesture('pointermove', x),
    cancel: () => gesture('pointercancel', 0),
    release: () => gesture('pointerup', 380),
    async finishSlide() { canvas.layer.animations[0].finish(); await Promise.resolve(); await Promise.resolve(); },
    async frame() { rafs.splice(0).forEach(callback => callback()); await Promise.resolve(); },
    paint() {
      assert.equal(world.render(race), true);
      canvas.dispatchEvent(new CustomEvent('skyline:showcase-frame', { detail: canvas.lastPaint }));
    },
    failStage() { stageReady = false; },
    restoreStage() { stageReady = true; world.setUpcomingTrack(active); },
    unblock() { blocked = false; },
    selections: () => selected,
  };
}

test('a pending target never captures the previous track as its swipe page', async t => {
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t);
  const { cancelSwipe } = setupTrackSwipeUI(fixture);
  fixture.drag();
  assert.deepEqual(fixture.captures, ['coast']);
  assert.equal(fixture.canvas.layer.children[1].dataset.swipeTrack, 'neon');
  fixture.getRace().phase = 'racing';
  cancelSwipe();
});

test('slide completion holds the target page until its formal first frame', async t => {
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t);
  const { cancelSwipe } = setupTrackSwipeUI(fixture);
  try {
    fixture.drag();
    fixture.release();
    await fixture.finishSlide();
    for (let i = 0; i < 4; i++) await fixture.frame();
    assert.equal(fixture.selections(), 1);
    assert.equal(fixture.canvas.style.opacity, '0');
    fixture.unblock();
    fixture.paint();
    await Promise.resolve();
    assert.equal(fixture.canvas.style.opacity, '');
  } finally {
    fixture.getRace().phase = 'racing';
    cancelSwipe();
  }
});

test('a first frame delivered during selection waits for the slide to finish', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t);
  setupTrackSwipeUI({ ...fixture, applyTrack(id) { fixture.applyTrack(id); fixture.paint(); } });
  fixture.unblock();
  fixture.drag();
  fixture.release();
  assert.equal(fixture.canvas.style.opacity, '0');
  await fixture.finishSlide();
  assert.equal(fixture.canvas.layer.childElementCount, 0);
  assert.equal(fixture.canvas.style.opacity, '');
});

test('missing preview stage retains its own card and accepts only the late stage frame', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t, ['coast', 'dune-tempest']);
  setupTrackSwipeUI(fixture);
  fixture.failStage();
  fixture.drag();
  fixture.release();
  await fixture.finishSlide();
  fixture.paint(); // The current Race still belongs to Coast.
  t.mock.timers.tick(2000);
  assert.equal(fixture.canvas.layer.children[0].dataset.swipeTrack, 'dune-tempest');
  assert.equal(fixture.canvas.style.opacity, '0');
  fixture.restoreStage();
  fixture.paint();
  await fixture.finishSlide(); // The identification card fades over the valid preview.
  assert.equal(fixture.canvas.layer.childElementCount, 0);
});

test('a pending swipe unlocks after the deadline and a reversed cancellation restores its card', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t);
  setupTrackSwipeUI(fixture);
  fixture.drag();
  fixture.release();
  await fixture.finishSlide();
  t.mock.timers.tick(2000);
  fixture.drag(640);
  assert.deepEqual(fixture.canvas.layer.children.map(page => page.dataset.swipeTrack), ['coast', 'neon']);
  fixture.move(489); // Reverse back to the end of the carousel.
  fixture.cancel();
  assert.equal(fixture.selections(), 1);
  assert.equal(fixture.getSelectedTrackId(), 'neon');
  assert.equal(fixture.canvas.layer.children[0].dataset.swipeTrack, 'neon');
  fixture.drag(640);
  fixture.release();
  await fixture.finishSlide();
  fixture.paint();
  assert.equal(fixture.selections(), 2);
  assert.equal(fixture.getSelectedTrackId(), 'coast');
  assert.equal(fixture.canvas.layer.childElementCount, 0);
});

test('first-frame readiness identifies a new preview stage on the same race and preserves grid loading', async () => {
  const { createWorldFrameReadiness } = await import('../src/world-frame-readiness.ts');
  const canvas = Object.assign(new EventTarget(), {
    attributes: new Set(),
    setAttribute(key) { this.attributes.add(key); },
    removeAttribute(key) { this.attributes.delete(key); },
  });
  const frames = createWorldFrameReadiness(canvas);
  const home = [], grid = [];
  canvas.addEventListener('skyline:showcase-frame', event => home.push(event.detail));
  canvas.addEventListener('skyline:race-grid-frame', event => grid.push(event.detail));
  const race = { phase: 'ready', trackId: 'coast' };
  frames.presented(race, race.trackId);
  assert.equal(frames.wait(true), false);
  assert.equal(canvas.attributes.has('data-frame-loading'), false);
  frames.invalidate();
  assert.equal(canvas.attributes.has('data-frame-loading'), true);
  frames.presented(race, null); // Garage may become visible without claiming a track's first frame.
  frames.presented(race, 'dune-tempest');
  frames.presented(race, 'dune-tempest');
  frames.presented(race, 'monsoon-ruins');
  assert.deepEqual(home, ['coast', 'dune-tempest', 'monsoon-ruins']);
  race.phase = 'countdown';
  assert.equal(frames.racePending(race), true);
  frames.presented(race, 'coast');
  assert.equal(frames.racePending(race), false);
  assert.deepEqual(grid, ['coast']);
});

test('context loss during the slide invalidates an early frame until WebGL paints again', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t);
  setupTrackSwipeUI(fixture);
  fixture.unblock();
  fixture.drag();
  fixture.release();
  fixture.paint();
  fixture.canvas.dispatchEvent(new Event('webglcontextlost'));
  await fixture.finishSlide();
  assert.equal(fixture.canvas.layer.children[0].dataset.swipeTrack, 'neon');
  assert.equal(fixture.canvas.style.opacity, '0');
  fixture.paint();
  assert.equal(fixture.canvas.layer.childElementCount, 0);
});

test('reversing a drag reuses the already painted outgoing page', async t => {
  const { setupTrackSwipeUI } = await import('../src/track-swipe-ui.ts');
  const fixture = swipeFixture(t, ['neon', 'coast', 'canyon']);
  fixture.unblock();
  fixture.applyTrack('coast');
  const { cancelSwipe } = setupTrackSwipeUI(fixture);
  try {
    fixture.drag();
    fixture.move(620);
    assert.deepEqual(fixture.captures, ['coast', 'canyon', 'neon']);
  } finally {
    fixture.getRace().phase = 'racing';
    cancelSwipe();
  }
});
