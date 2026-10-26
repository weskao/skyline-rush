export type SwipeSample = [time: number, x: number];

// Home-screen track swipe: pure gesture math for dragging the 3D preview like a carousel page (main.js binds it).
export const SWIPE_EDGE_PX = 20; // a touch starting here is the iOS back/forward edge swipe (.claude/rules/touch-input.md)
const AXIS_LOCK_PX = 8;
const FLICK_PX_PER_MS = 0.45;
const VELOCITY_WINDOW_MS = 100;

// Locks the drag to one axis once it has moved AXIS_LOCK_PX: 'x', 'y', or null while undecided.
export function swipeAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

// Distance that changes track without a flick: a fifth of the screen, capped for wide desktops.
export const swipeDistance = (width: number): number => Math.min(width * 0.2, 96);

// How far the preview follows the finger: an iOS-style rubber band, stiff where there is no track to reveal.
export function swipeOffset(dx: number, width: number, hasNeighbour: boolean): number {
  const reach = width * (hasNeighbour ? 0.6 : 0.12);
  return Math.sign(dx) * (1 - 1 / (Math.abs(dx) * 0.55 / reach + 1)) * reach;
}

// Keeps the last VELOCITY_WINDOW_MS of [time, x] samples, so release speed reflects the final flick only.
export function addSwipeSample(samples: SwipeSample[], time: number, x: number): void {
  samples.push([time, x]);
  while (samples.length > 2 && samples[0][0] < time - VELOCITY_WINDOW_MS) samples.shift();
}

// px/ms over the samples still inside the window at release; a finger that paused before lifting has none.
export function releaseVelocity(samples: SwipeSample[], now: number): number {
  const recent = samples.filter(([time]) => time >= now - VELOCITY_WINDOW_MS);
  if (recent.length < 2) return 0;
  const [[t0, x0], [t1, x1]] = [recent[0], recent.at(-1)];
  return t1 > t0 ? (x1 - x0) / (t1 - t0) : 0;
}

// 1 = next track (finger moved left), -1 = previous, 0 = snap back. Far enough or flicked commits; flung back cancels.
export function swipeStep(dx: number, velocity: number, width: number): number {
  if (Math.abs(velocity) >= FLICK_PX_PER_MS && Math.sign(velocity) !== Math.sign(dx)) return 0;
  const commit = Math.abs(dx) >= swipeDistance(width) || (Math.abs(dx) >= 24 && Math.abs(velocity) >= FLICK_PX_PER_MS);
  return commit ? (dx < 0 ? 1 : -1) : 0;
}
