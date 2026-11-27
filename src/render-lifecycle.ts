// Render on demand. Only a paused race is truly static: race time is frozen and the camera lerp
// converges in about 1.5 s, so it draws SETTLE_FRAMES then waits for input. Home, Garage, countdown,
// racing and results always animate and always draw. Simulation, audio and HUD never depend on this.
export const SETTLE_FRAMES = 90;

export interface DemandState { phase: string; covered: boolean; contextLost: boolean; pending?: boolean }

export function createRenderDemand() {
  let settle = SETTLE_FRAMES, lastPhase = '';
  return {
    invalidate() { settle = SETTLE_FRAMES; },
    wants({ phase, covered, contextLost, pending = false }: DemandState): boolean {
      if (phase !== lastPhase) { lastPhase = phase; settle = SETTLE_FRAMES; }
      // Nothing visible to update; redraw fully once uncovered or restored.
      if (covered || contextLost) { settle = SETTLE_FRAMES; return false; }
      if (phase !== 'paused' || pending) return true;
      if (settle <= 0) return false;
      settle--;
      return true;
    },
  };
}
export type RenderDemand = ReturnType<typeof createRenderDemand>;

interface StyleLike { backgroundColor: string; backgroundImage: string; opacity: string }
interface DialogLike {
  contains(node: unknown): boolean;
  matches(selector: string): boolean;
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number };
}
interface ViewLike { innerWidth: number; innerHeight: number; getComputedStyle(el: never, pseudo?: string): StyleLike }

// A gradient or image is conservatively treated as see-through: never freeze under a translucent layer.
const opaque = (style: StyleLike): boolean => {
  if (Number(style.opacity) < 1 || style.backgroundImage !== 'none') return false;
  const parts = /^rgba?\(([^)]*)\)$/.exec(style.backgroundColor)?.[1]?.split(/[\s,/]+/).filter(Boolean);
  return !!parts && (parts.length < 4 || Number(parts[3]) >= 1);
};

/** True only for an open dialog that hides the whole canvas: an opaque full-viewport panel or opaque modal backdrop. */
export function coversViewport(dialog: DialogLike, canvas: unknown, view: ViewLike): boolean {
  if (dialog.contains(canvas)) return false; // the Garage hosts the canvas itself
  const style = view.getComputedStyle(dialog as never);
  if (Number(style.opacity) < 1) return false;
  if (dialog.matches(':modal') && opaque(view.getComputedStyle(dialog as never, '::backdrop'))) return true;
  const rect = dialog.getBoundingClientRect();
  return rect.left <= 0 && rect.top <= 0 && rect.right >= view.innerWidth && rect.bottom >= view.innerHeight && opaque(style);
}

// Input that can change a paused frame: camera/photo controls, settings, clicks (photo export), keys.
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'input', 'change', 'click'];
// Structural changes that can also change whether a dialog covers the canvas.
const LAYOUT_EVENTS = ['resize', 'orientationchange', 'pageshow', 'animationend', 'transitionend'];

/** Owns every render-lifecycle listener once; a real pagehide (not bfcache) disposes it. */
export function setupRenderLifecycle(canvas: EventTarget, demand: RenderDemand, win: Window & typeof globalThis = window) {
  const doc = win.document;
  let dirty = true, covered = false, disposed = false;
  const redraw = () => demand.invalidate();
  const relayout = () => { dirty = true; demand.invalidate(); };
  const opts = { capture: true, passive: true };
  const mutations = new win.MutationObserver(relayout);
  mutations.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  const resize = new win.ResizeObserver(relayout); // the drawing buffer is cleared when the canvas resizes
  resize.observe(canvas as Element);
  const pagehide = (event: Event) => { if (!(event as PageTransitionEvent).persisted) dispose(); };
  for (const type of INPUT_EVENTS) win.addEventListener(type, redraw, opts);
  for (const type of LAYOUT_EVENTS) win.addEventListener(type, relayout, opts);
  win.addEventListener('pagehide', pagehide);
  doc.addEventListener('visibilitychange', relayout);
  canvas.addEventListener('webglcontextrestored', relayout);
  function dispose() {
    if (disposed) return;
    disposed = true;
    mutations.disconnect(); resize.disconnect();
    for (const type of INPUT_EVENTS) win.removeEventListener(type, redraw, opts);
    for (const type of LAYOUT_EVENTS) win.removeEventListener(type, relayout, opts);
    win.removeEventListener('pagehide', pagehide);
    doc.removeEventListener('visibilitychange', relayout);
    canvas.removeEventListener('webglcontextrestored', relayout);
  }
  return {
    /** Recomputed lazily after a structural change, never per pointer event or per frame. */
    get covered() {
      if (dirty) {
        dirty = false;
        covered = [...doc.querySelectorAll('dialog[open]')].some(dialog => coversViewport(dialog, canvas, win as unknown as ViewLike));
      }
      return covered;
    },
    dispose,
  };
}
