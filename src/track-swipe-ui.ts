import { SWIPE_EDGE_PX, swipeAxis, swipeDistance, swipeOffset, swipeStep, liveSwipeStep, addSwipeSample, releaseVelocity } from './track-swipe.ts';
import { trackName, getLocale, t } from './i18n.ts';
import { isUpcomingTrack, upcomingTrackName, type PreviewTrackId } from './upcoming-tracks.ts';
import { trackLandscapeHomeScale } from './landscape-home-scale.ts';

interface SwipeStart {
  button: number;
  phase: string;
  tutorial: boolean;
  editing: boolean;
  busy: boolean;
  dialogOpen: boolean;
  pointerType: string;
  clientX: number;
  width: number;
}
interface SwipeRace { phase: string; trackId: string }
interface SwipeWorld { renderSnapshot(race: SwipeRace, time: number): boolean; setUpcomingTrack(id: PreviewTrackId | null): boolean }
interface SwipeOptions {
  getRace(): SwipeRace;
  getWorld(): SwipeWorld | null | undefined;
  selectedRace(trackId: string): SwipeRace;
  previewOnlyTrack(trackId: string): PreviewTrackId | null;
  applyTrack(trackId: string): void;
  calmMotion(): boolean;
  motionOptions(speed: string): KeyframeAnimationOptions;
  isTutorialActive(): boolean;
  isEditingLayout(): boolean;
  touchMatches(): boolean;
  getSelectedTrackId(): string;
}
interface SwipeHandoff {
  id: string;
  race: SwipeRace | null;
  page: HTMLElement;
  painted: boolean;
  slid: boolean;
  listen(event: Event): void;
  timer?: ReturnType<typeof setTimeout>;
}
const SHOWCASE_FRAME = 'skyline:showcase-frame';
const HANDOFF_TIMEOUT_MS = 1800;
const swipeTrackName = (id: string) => isUpcomingTrack(id) ? upcomingTrackName(id, getLocale()) : trackName(id, getLocale());

type SwipeSample = [number, number];
interface SwipeOrigin { id: string; race: SwipeRace }
interface DragState { id: number; origin: SwipeOrigin; x: number; y: number; axis: 'x' | 'y' | null; samples: SwipeSample[] }
interface WheelState { dx: number; origin: SwipeOrigin; spent: boolean; stamp: number; timer?: ReturnType<typeof setTimeout> }

/** The existing carousel handles playable and preview-only cards with one ordering. */
export const swipeTrackId = (button: Pick<HTMLButtonElement, 'dataset'>): string => button.dataset.track ?? button.dataset.upcomingTrack ?? '';

/** Keep swipe initiation rules testable; edge gestures belong to the OS on touch screens. */
export function canBeginTrackSwipe({ button, phase, tutorial, editing, busy, dialogOpen, pointerType, clientX, width }: SwipeStart): boolean {
  return button === 0 && phase === 'ready' && !tutorial && !editing && !busy && !dialogOpen &&
    (pointerType === 'mouse' || (clientX >= SWIPE_EDGE_PX && clientX <= width - SWIPE_EDGE_PX));
}

/** Desktop wheel paging also starts over the lobby; settings and expanded lists keep their native scrolling. */
export function acceptsTrackWheelTarget(target: Pick<Element, 'closest'>, desktop: boolean): boolean {
  if (target.closest('#world')) return true;
  return desktop && !!target.closest('#intro') && !target.closest(
    '#track-chooser, #lobby-mode-options, details[open], [role="listbox"], input, select, textarea, [contenteditable]',
  );
}

export function setupTrackSwipeUI({ getRace, getWorld, selectedRace, previewOnlyTrack, applyTrack, calmMotion, motionOptions, isTutorialActive, isEditingLayout, touchMatches, getSelectedTrackId }: SwipeOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const home = $('#intro');
  trackLandscapeHomeScale(home, $('.toolbar')); // the home strip's short-landscape panel + rail scale
  // Home screen: swipe (touch) or drag (mouse) the 3D preview to change track, like a carousel page.
  const worldCanvas = $<HTMLCanvasElement>('#world');
  const swipeChip = $('#track-swipe');
  let swipe: DragState | null = null;
  let wheelSwipe: WheelState | null = null;
  let swipeTarget: string | null = null;
  let swipeBusy = false;
  let swipeChipTimer: ReturnType<typeof setTimeout> | undefined;
  let swipeHintSeen = false;
  const selection = (): SwipeOrigin => ({ id: getSelectedTrackId(), race: getRace() });
  const swipeTracks = (): HTMLButtonElement[] => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-track]:not(:disabled), [data-upcoming-track]:not(:disabled)'));
  const swipeNeighbour = (step: number): HTMLButtonElement | undefined => {
    const tracks = swipeTracks();
    const current = tracks.findIndex(button => swipeTrackId(button) === getSelectedTrackId());
    return current < 0 ? undefined : tracks[current + step];
  };
  function showSwipeChip(state: string, id: string, note = ''): void {
    clearTimeout(swipeChipTimer);
    swipeChip.dataset.state = state;
    $('#track-swipe-name').textContent = swipeTrackName(id).toUpperCase();
    $('#track-swipe-note').textContent = note;
    swipeChip.querySelector('.swipe-dots')!.replaceChildren(...swipeTracks().map(button => {
      const dot = document.createElement('i');
      dot.classList.toggle('is-current', swipeTrackId(button) === id);
      return dot;
    }));
    if (state !== 'drag') swipeChipTimer = setTimeout(() => { swipeChip.dataset.state = ''; }, state === 'hint' ? 6000 : 1400);
  }
  function showSwipeHint() {
    if (swipeHintSeen || getRace().phase !== 'ready' || isTutorialActive()) return;
    swipeHintSeen = true; // Per page load, not localStorage: reload makes the gesture discoverable again.
    showSwipeChip('hint', getSelectedTrackId(), t(touchMatches() ? 'swipe.hintTouch' : 'swipe.hintMouse'));
  }
  // Snapshot both pages on the existing renderer. A missing frame gets that track's own card.
  const swipeScenes = document.createElement('div');
  swipeScenes.id = 'track-swipe-scenes';
  swipeScenes.setAttribute('aria-hidden', 'true');
  worldCanvas.after(swipeScenes);
  let swipeSceneStep = 0;
  let sceneRace: SwipeRace | null = null;
  let sceneTrack: string | null = null;
  let swipeSnapback: Animation | null = null;
  let handoff: SwipeHandoff | null = null;

  function fallbackPage(id: string, step: number): HTMLElement {
    const page = document.createElement('div');
    page.className = 'track-swipe-card';
    page.dataset.swipeTrack = id;
    page.dataset.edge = step > 0 ? 'left' : step < 0 ? 'right' : 'center';
    const source = swipeTracks().find(button => swipeTrackId(button) === id)
      ?.querySelector<HTMLImageElement>('.track-preview img')?.getAttribute('src');
    const card = document.createElement('div');
    if (source) {
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      card.append(image);
    }
    const label = document.createElement('strong');
    label.textContent = swipeTrackName(id);
    card.append(label);
    page.append(card);
    return page;
  }

  function captureSwipeFrame(id: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.dataset.swipeTrack = id;
    canvas.width = worldCanvas.width;
    canvas.height = worldCanvas.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Swipe snapshot context unavailable');
    context.drawImage(worldCanvas, 0, 0);
    return canvas;
  }

  function stopHandoff() {
    if (!handoff) return;
    worldCanvas.removeEventListener(SHOWCASE_FRAME, handoff.listen);
    clearTimeout(handoff.timer);
    handoff = null;
  }

  function clearSwipeScenes() {
    stopHandoff();
    swipeSnapback = null;
    swipeScenes.getAnimations().forEach(animation => animation.cancel());
    swipeScenes.replaceChildren();
    swipeScenes.style.transform = '';
    swipeSceneStep = 0;
    sceneRace = null; sceneTrack = null;
    worldCanvas.style.opacity = '';
    swipeBusy = false;
  }

  function prepareSwipeScenes(button: HTMLButtonElement, step: number): void {
    if (calmMotion()) return;
    if (swipeSnapback) {
      swipeSnapback.cancel();
      swipeSnapback = null;
    }
    if (swipeSceneStep === step) return;
    swipeScenes.getAnimations().forEach(animation => animation.cancel());
    const world = getWorld();
    const fromId = getSelectedTrackId();
    const outgoing = (swipeSceneStep > 0 ? swipeScenes.firstElementChild : swipeScenes.lastElementChild) as HTMLElement | null;
    let current = sceneRace === getRace() && outgoing?.tagName === 'CANVAS' && outgoing.dataset.swipeTrack === fromId
      ? outgoing : undefined;
    sceneTrack = fromId;
    sceneRace = getRace();
    const toId = swipeTrackId(button);
    const fromStage = previewOnlyTrack(fromId);
    const toStage = previewOnlyTrack(toId);
    const time = performance.now() / 1000;
    let neighbor: HTMLElement | undefined;
    let neighborDrawn = false;
    if (world) try {
      const fromStageReady = world.setUpcomingTrack(fromStage);
      if (!current && (!fromStage || fromStageReady) && world.renderSnapshot(getRace(), time)) {
        current = captureSwipeFrame(fromId);
      }
      const target = toStage ? getRace() : selectedRace(toId);
      const stageReady = world.setUpcomingTrack(toStage);
      if (toStage ? stageReady : target.trackId === toId) {
        neighborDrawn = world.renderSnapshot(target, time);
        if (neighborDrawn) neighbor = captureSwipeFrame(toId);
      }
    } catch (error) {
      console.warn('Preview snapshot unavailable:', error);
    } finally {
      world.setUpcomingTrack(fromStage);
      if (neighborDrawn) world.renderSnapshot(getRace(), time);
    }
    current ??= handoff?.page ?? fallbackPage(fromId, -step);
    neighbor ??= fallbackPage(toId, step);
    swipeScenes.replaceChildren(...(step > 0 ? [current, neighbor] : [neighbor, current]));
    swipeSceneStep = step;
    // Keep pointer capture and hit testing on the single live canvas.
    worldCanvas.style.opacity = '0';
  }
  function positionSwipeScenes(offset: number): void {
    swipeScenes.style.transform = `translateX(calc(${swipeSceneStep > 0 ? 0 : -100}vw + ${offset.toFixed(1)}px))`;
  }

  function presentHandoff(next: SwipeHandoff) {
    if (!next.painted || !next.slid || swipeSceneStep || handoff !== next) return;
    clearTimeout(next.timer);
    worldCanvas.style.opacity = '';
    if (next.page.className !== 'track-swipe-card' || calmMotion()) { clearSwipeScenes(); return; }
    swipeBusy = false;
    const fade = swipeScenes.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
    void fade.finished.catch(() => {}).then(() => { if (handoff === next && next.painted && !swipeSceneStep) clearSwipeScenes(); });
  }

  function holdPage(next: SwipeHandoff) {
    swipeSceneStep = 0;
    swipeScenes.style.transform = '';
    next.page.dataset.edge = 'center';
    swipeScenes.replaceChildren(next.page);
    presentHandoff(next);
  }

  function resetSwipe() {
    swipe = null; swipeTarget = null;
    clearTimeout(wheelSwipe?.timer);
    wheelSwipe = null;
    if (swipeChip.dataset.state === 'drag') swipeChip.dataset.state = '';
    clearSwipeScenes();
  }

  function cancelSwipe() {
    swipe = null; swipeTarget = null;
    if (swipeChip.dataset.state === 'drag') swipeChip.dataset.state = '';
    if (getRace().phase !== 'ready') { resetSwipe(); return; }
    if (!swipeSceneStep) return;
    const restore = () => {
      swipeBusy = false;
      if (handoff) holdPage(handoff); else clearSwipeScenes();
    };
    if (calmMotion()) { restore(); return; }
    swipeBusy = true;
    const from = swipeScenes.style.transform;
    const to = swipeSceneStep > 0 ? 'translateX(0px)' : 'translateX(-100vw)';
    const animation = swipeSnapback = swipeScenes.animate([{ transform: from }, { transform: to }], { ...motionOptions('fast'), fill: 'forwards' });
    void animation.finished.catch(() => {}).then(() => {
      if (swipeSnapback !== animation) return;
      swipeSnapback = null;
      animation.cancel();
      restore();
    });
  }

  async function commitSwipe(button: HTMLButtonElement, step: number): Promise<void> {
    swipe = null; swipeTarget = null; swipeBusy = true;
    prepareSwipeScenes(button, step);
    const id = swipeTrackId(button);
    const page = (step > 0 ? swipeScenes.lastElementChild : swipeScenes.firstElementChild) as HTMLElement | null;
    stopHandoff();
    const next: SwipeHandoff = { id, race: null, page: swipeSceneStep && page ? page : fallbackPage(id, 0),
      painted: false, slid: false, listen(event) {
        if (next.painted || (event as CustomEvent<string>).detail !== next.id || getSelectedTrackId() !== next.id ||
          getRace().phase !== 'ready' || (next.race && getRace() !== next.race)) return;
        next.painted = true;
        presentHandoff(next);
      },
    };
    handoff = next;
    worldCanvas.addEventListener(SHOWCASE_FRAME, next.listen);
    if (!swipeSceneStep) holdPage(next);
    worldCanvas.style.opacity = '0';
    applyTrack(id);
    next.race = getRace();
    if (getSelectedTrackId() !== id) { clearSwipeScenes(); return; }
    showSwipeChip('done', id);
    if (swipeSceneStep && !calmMotion()) {
      const from = swipeScenes.style.transform || (step > 0 ? 'translateX(0px)' : 'translateX(-100vw)');
      const to = step > 0 ? 'translateX(-100vw)' : 'translateX(0px)';
      next.page.dataset.edge = 'center';
      const animation = swipeScenes.animate([{ transform: from }, { transform: to }], { ...motionOptions('base'), fill: 'forwards' });
      await animation.finished.catch(() => {});
      if (handoff !== next) return;
      swipeScenes.style.transform = to;
      animation.cancel();
    }
    next.slid = true;
    holdPage(next);
    if (!next.painted) next.timer = setTimeout(() => {
      if (handoff !== next) return;
      if (next.page.className !== 'track-swipe-card') next.page = fallbackPage(id, step);
      swipeBusy = false;
      holdPage(next);
    }, HANDOFF_TIMEOUT_MS);
  }

  worldCanvas.addEventListener('webglcontextlost', () => {
    if (!handoff) return;
    handoff.painted = false;
    worldCanvas.style.opacity = '0';
    if (handoff.slid && !swipeSceneStep) {
      swipeScenes.getAnimations().forEach(animation => animation.cancel());
    }
  });
  const observeSelection = new MutationObserver(() => {
    const origin = handoff ?? swipe?.origin ?? (wheelSwipe?.spent ? null : wheelSwipe?.origin);
    const changed = origin ? origin.race !== getRace() || origin.id !== getSelectedTrackId()
      : swipeSceneStep && (sceneRace !== getRace() || sceneTrack !== getSelectedTrackId());
    if (changed || worldCanvas.parentElement !== swipeScenes.parentElement) resetSwipe();
  });
  observeSelection.observe(home, { attributes: true, attributeFilter: ['data-lobby-track'] });
  observeSelection.observe(swipeScenes.parentElement!, { childList: true }); // Garage moves the single canvas.
  // The two complete scenes stay touching at the center seam throughout the drag.
  function dragSwipe(dx: number): void {
    swipeBusy = false;
    const step = dx < 0 ? 1 : -1;
    const neighbour = swipeNeighbour(step);
    if (!calmMotion() && neighbour) {
      prepareSwipeScenes(neighbour, step);
      positionSwipeScenes(swipeOffset(dx, innerWidth, true));
    } else if (swipeSceneStep) {
      if (handoff) holdPage(handoff); else clearSwipeScenes();
    }
    const target = neighbour ? swipeTrackId(neighbour) : getSelectedTrackId();
    if (target !== swipeTarget) { swipeTarget = target; showSwipeChip('drag', target, isUpcomingTrack(target) ? t('track.comingSoon') : neighbour?.classList.contains('is-locked') ? t('track.locked') : ''); }
    swipeChip.style.setProperty('--swipe', Math.min(1, Math.abs(dx) / swipeDistance(innerWidth)).toFixed(3));
  }
  // The newest finger takes the swipe over, so a touch whose release WebKit withholds cannot hold the preview.
  worldCanvas.addEventListener('pointerdown', event => {
    if (!canBeginTrackSwipe({ button: event.button, phase: getRace().phase,
      tutorial: isTutorialActive(), editing: isEditingLayout(), busy: swipeBusy,
      dialogOpen: !!document.querySelector('dialog[open]'), pointerType: event.pointerType,
      clientX: event.clientX, width: innerWidth })) return;
    swipe = { id: event.pointerId, origin: selection(), x: event.clientX, y: event.clientY, axis: null, samples: [[event.timeStamp, event.clientX]] };
    worldCanvas.setPointerCapture(event.pointerId);
  });
  worldCanvas.addEventListener('pointermove', event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    swipe.axis ??= swipeAxis(dx, event.clientY - swipe.y);
    if (swipe.axis !== 'x') return;
    addSwipeSample(swipe.samples, event.timeStamp, event.clientX);
    dragSwipe(dx);
    // Touch keeps carousel release semantics; a mouse switches mid-drag (commitSwipe clears swipe, so one drag = one track).
    const step = event.pointerType === 'mouse' ? liveSwipeStep(dx, innerWidth) : 0;
    const button = step && swipeNeighbour(step);
    if (button) void commitSwipe(button, step);
  });
  // Trackpad two-finger swipe (horizontal wheel): the preview follows the scroll and changes track once it travels the swipe
  // distance; the rest of that gesture, momentum included, is spent so one swipe is one track. A pause of WHEEL_END_MS ends it,
  // timed on the events' own timeStamp: a stalled frame or late delivery must not turn the momentum tail into a second swipe.
  const WHEEL_END_MS = 160;
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || !(event.target instanceof Element) ||
      !acceptsTrackWheelTarget(event.target, !touchMatches())) return;
    if (wheelSwipe && event.timeStamp - wheelSwipe.stamp >= WHEEL_END_MS) { clearTimeout(wheelSwipe.timer); wheelSwipe = null; }
    if (event.deltaX === 0 || (!wheelSwipe && Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
    if (swipe || getRace().phase !== 'ready' || isTutorialActive() || isEditingLayout() || document.querySelector('dialog[open]')) return;
    event.preventDefault(); // also keeps the browser's two-finger back/forward swipe off the preview
    clearTimeout(wheelSwipe?.timer);
    const gesture = wheelSwipe ?? { dx: 0, origin: selection(), spent: swipeBusy, stamp: event.timeStamp };
    wheelSwipe = gesture;
    gesture.stamp = event.timeStamp;
    // A stale timer must never cancel a newer gesture.
    gesture.timer = setTimeout(() => {
      if (wheelSwipe === gesture && !gesture.spent && !swipe) cancelSwipe();
    }, WHEEL_END_MS);
    if (gesture.spent) return;
    gesture.dx -= event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1); // lines / pages to px
    const step = swipeStep(gesture.dx, 0, innerWidth);
    const button = step && swipeNeighbour(step);
    if (button) { gesture.spent = true; void commitSwipe(button, step); } else dragSwipe(gesture.dx);
  }, { passive: false });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) worldCanvas.addEventListener(type, event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const { axis, x, samples } = swipe;
    const dx = samples.at(-1)![1] - x; // pointercancel carries no position
    const step = type === 'pointerup' && axis === 'x' ? swipeStep(dx, releaseVelocity(samples, event.timeStamp), innerWidth) : 0;
    const button = step && swipeNeighbour(step);
    if (button) commitSwipe(button, step); else cancelSwipe();
  });

  return { showSwipeHint, cancelSwipe };
}
