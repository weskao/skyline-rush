import { SWIPE_EDGE_PX, swipeAxis, swipeDistance, swipeOffset, swipeStep, addSwipeSample, releaseVelocity } from './track-swipe.js';
import { trackName, getLocale, t } from './i18n.js';

/** Keep swipe initiation rules testable; edge gestures belong to the OS on touch screens. */
export function canBeginTrackSwipe({ button, phase, tutorial, editing, busy, dialogOpen, pointerType, clientX, width }) {
  return button === 0 && phase === 'ready' && !tutorial && !editing && !busy && !dialogOpen &&
    (pointerType === 'mouse' || (clientX >= SWIPE_EDGE_PX && clientX <= width - SWIPE_EDGE_PX));
}

export function setupTrackSwipeUI({ getRace, getWorld, selectedRace, calmMotion, motionOptions, isTutorialActive, isEditingLayout, touchMatches }) {
  const $ = selector => document.querySelector(selector);
  // Home screen: swipe (touch) or drag (mouse) the 3D preview to change track, like a carousel page.
  const worldCanvas = $('#world');
  const swipeChip = $('#track-swipe');
  let swipe = null, wheelSwipe = null, swipeTarget = null, swipeBusy = false, swipeChipTimer = 0, swipeHintSeen = false;
  const swipeTracks = () => [...document.querySelectorAll('[data-track]:not(:disabled)')];
  const swipeNeighbour = step => { const tracks = swipeTracks(); return tracks[tracks.findIndex(button => button.dataset.track === getRace().trackId) + step]; };
  function showSwipeChip(state, id, note = '') {
    clearTimeout(swipeChipTimer);
    swipeChip.dataset.state = state;
    $('#track-swipe-name').textContent = trackName(id, getLocale()).toUpperCase();
    $('#track-swipe-note').textContent = note;
    swipeChip.querySelector('.swipe-dots').replaceChildren(...swipeTracks().map(button => {
      const dot = document.createElement('i');
      dot.classList.toggle('is-current', button.dataset.track === id);
      return dot;
    }));
    if (state !== 'drag') swipeChipTimer = setTimeout(() => { swipeChip.dataset.state = ''; }, state === 'hint' ? 6000 : 1400);
  }
  function showSwipeHint() {
    if (swipeHintSeen || getRace().phase !== 'ready' || isTutorialActive()) return;
    swipeHintSeen = true; // Per page load, not localStorage: reload makes the gesture discoverable again.
    showSwipeChip('hint', getRace().trackId, t(touchMatches() ? 'swipe.hintTouch' : 'swipe.hintMouse'));
  }
  // Keep both 3D scenes edge-to-edge while swiping. Only the active scene renders each frame;
  // the neighbor is drawn once into a temporary 2D snapshot (no second WebGL context).
  const swipeScenes = document.createElement('div');
  swipeScenes.id = 'track-swipe-scenes';
  swipeScenes.setAttribute('aria-hidden', 'true');
  worldCanvas.after(swipeScenes);
  let swipeSceneStep = 0, swipeSnapback = null;
  function captureSwipeFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = worldCanvas.width;
    canvas.height = worldCanvas.height;
    canvas.getContext('2d').drawImage(worldCanvas, 0, 0);
    return canvas;
  }
  function clearSwipeScenes() {
    swipeSnapback = null;
    swipeScenes.getAnimations().forEach(animation => animation.cancel());
    swipeScenes.replaceChildren();
    swipeScenes.style.transform = '';
    swipeSceneStep = 0;
    worldCanvas.style.opacity = '';
    swipeBusy = false;
  }
  function prepareSwipeScenes(step) {
    const button = swipeNeighbour(step);
    if (!button || !getWorld() || calmMotion()) return false;
    swipeSnapback = null;
    swipeScenes.getAnimations().forEach(animation => animation.cancel());
    if (step === swipeSceneStep && swipeScenes.childElementCount === 2) return true;
    try {
      const time = performance.now() / 1000;
      // A non-preserved WebGL drawing buffer may be empty after compositing;
      // explicitly render both frames immediately before copying their pixels.
      getWorld().render(race, 0, time);
      const current = captureSwipeFrame();
      getWorld().render(selectedRace(button.dataset.track), 0, time);
      const neighbor = captureSwipeFrame();
      swipeScenes.replaceChildren(...(step > 0 ? [current, neighbor] : [neighbor, current]));
      swipeSceneStep = step;
      // Opacity preserves pointer capture; visibility:hidden would lose hit-testing.
      worldCanvas.style.opacity = '0';
      return true;
    } catch (error) {
      clearSwipeScenes();
      console.warn('Preview snapshot unavailable:', error);
      return false;
    } finally {
      getWorld().render(race, 0, performance.now() / 1000);
    }
  }
  function positionSwipeScenes(offset) {
    swipeScenes.style.transform = `translateX(calc(${swipeSceneStep > 0 ? 0 : -100}vw + ${offset.toFixed(1)}px))`;
  }
  // On cancellation, the joined pages snap back without showing any underlying background.
  function cancelSwipe() {
    swipe = null; swipeTarget = null;
    if (swipeChip.dataset.state === 'drag') swipeChip.dataset.state = '';
    if (!swipeScenes.childElementCount) return;
    const from = swipeScenes.style.transform;
    const to = swipeSceneStep > 0 ? 'translateX(0px)' : 'translateX(-100vw)';
    if (calmMotion()) { clearSwipeScenes(); return; }
    swipeBusy = true;
    // Keep the last keyframe painted until the snapshot layer is removed.
    // Without fill, Web Animations reverts to the drag's inline transform for a frame.
    // A resumed swipe cancels this snap-back and owns the snapshots from then on.
    const animation = swipeSnapback = swipeScenes.animate([{ transform: from }, { transform: to }], { ...motionOptions('fast'), fill: 'forwards' });
    animation.finished.catch(() => {}).then(() => { if (swipeSnapback === animation) clearSwipeScenes(); });
  }
  // Slide the outgoing and incoming track as adjacent full-screen pages, never as faded empty canvas.
  async function commitSwipe(button, step) {
    swipe = null; swipeTarget = null; swipeBusy = true;
    const prepared = prepareSwipeScenes(step);
    if (prepared && !calmMotion()) {
      const from = swipeScenes.style.transform || (step > 0 ? 'translateX(0px)' : 'translateX(-100vw)');
      const to = step > 0 ? 'translateX(-100vw)' : 'translateX(0px)';
      const animation = swipeScenes.animate([{ transform: from }, { transform: to }], { ...motionOptions('base'), fill: 'forwards' });
      await animation.finished.catch(() => {});
      // Persist the final (incoming-only) position before cancelling the finished animation.
      // Otherwise its original dragged transform briefly uncovers the outgoing track again.
      swipeScenes.style.transform = to;
      animation.cancel();
    }
    button.click();
    showSwipeChip('done', getRace().trackId);
    // Wait for the live WebGL scene to reflect the new track before uncovering it.
    if (prepared) await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    clearSwipeScenes();
  }
  // The two complete scenes stay touching at the center seam throughout the drag.
  function dragSwipe(dx) {
    swipeBusy = false;
    const step = dx < 0 ? 1 : -1;
    const neighbour = swipeNeighbour(step);
    if (!calmMotion() && neighbour && prepareSwipeScenes(step)) {
      positionSwipeScenes(swipeOffset(dx, innerWidth, true));
    } else if (swipeScenes.childElementCount) clearSwipeScenes();
    const target = neighbour?.dataset.track ?? getRace().trackId;
    if (target !== swipeTarget) { swipeTarget = target; showSwipeChip('drag', target, neighbour?.classList.contains('is-locked') ? t('track.locked') : ''); }
    swipeChip.style.setProperty('--swipe', Math.min(1, Math.abs(dx) / swipeDistance(innerWidth)).toFixed(3));
  }
  // The newest finger takes the swipe over, so a touch whose release WebKit withholds cannot hold the preview.
  worldCanvas.addEventListener('pointerdown', event => {
    if (!canBeginTrackSwipe({ button: event.button, phase: getRace().phase,
      tutorial: isTutorialActive(), editing: isEditingLayout(), busy: swipeBusy,
      dialogOpen: !!document.querySelector('dialog[open]'), pointerType: event.pointerType,
      clientX: event.clientX, width: innerWidth })) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, samples: [[event.timeStamp, event.clientX]] };
    worldCanvas.setPointerCapture(event.pointerId);
  });
  worldCanvas.addEventListener('pointermove', event => {
    if (event.pointerId !== swipe?.id) return;
    const dx = event.clientX - swipe.x;
    swipe.axis ??= swipeAxis(dx, event.clientY - swipe.y);
    if (swipe.axis !== 'x') return;
    addSwipeSample(swipe.samples, event.timeStamp, event.clientX);
    dragSwipe(dx);
  });
  // Trackpad two-finger swipe (horizontal wheel): the preview follows the scroll and changes track once it travels the swipe
  // distance; the rest of that gesture, momentum included, is spent so one swipe is one track. A pause of WHEEL_END_MS ends it,
  // timed on the events' own timeStamp: a stalled frame or late delivery must not turn the momentum tail into a second swipe.
  const WHEEL_END_MS = 160;
  worldCanvas.addEventListener('wheel', event => {
    if (wheelSwipe && event.timeStamp - wheelSwipe.stamp >= WHEEL_END_MS) { clearTimeout(wheelSwipe.timer); wheelSwipe = null; }
    if (!wheelSwipe && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (swipe || getRace().phase !== 'ready' || isTutorialActive() || isEditingLayout() || document.querySelector('dialog[open]')) return;
    event.preventDefault(); // also keeps the browser's two-finger back/forward swipe off the preview
    clearTimeout(wheelSwipe?.timer);
    wheelSwipe ??= { dx: 0, spent: swipeBusy };
    wheelSwipe.stamp = event.timeStamp;
    // No input for a while: spring an unfinished drag back. Only the timeStamp gap above ends the gesture itself.
    wheelSwipe.timer = setTimeout(() => { if (!wheelSwipe.spent && !swipe) cancelSwipe(); }, WHEEL_END_MS);
    if (wheelSwipe.spent) return;
    wheelSwipe.dx -= event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1); // lines / pages to px
    const step = swipeStep(wheelSwipe.dx, 0, innerWidth);
    const button = step && swipeNeighbour(step);
    if (button) { wheelSwipe.spent = true; commitSwipe(button, step); } else dragSwipe(wheelSwipe.dx);
  }, { passive: false });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) worldCanvas.addEventListener(type, event => {
    if (event.pointerId !== swipe?.id) return;
    const { axis, x, samples } = swipe;
    const dx = samples.at(-1)[1] - x; // pointercancel carries no position
    const step = type === 'pointerup' && axis === 'x' ? swipeStep(dx, releaseVelocity(samples, event.timeStamp), innerWidth) : 0;
    const button = step && swipeNeighbour(step);
    if (button) commitSwipe(button, step); else cancelSwipe();
  });
  
  
  return { showSwipeHint, cancelSwipe };
}
