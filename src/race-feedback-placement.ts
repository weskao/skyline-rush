/** Event-driven peripheral HUD slots; the frame loop never measures rectangles. */
export interface FeedbackRect { left: number; top: number; right: number; bottom: number }
interface Size { width: number; height: number }
interface Insets { left?: number; right?: number; top?: number; bottom?: number }
/** `sky`: as a last resort, also try the band above the road between top-HUD blocks (portrait edges can all be HUD). */
interface Options { preferred?: 'left' | 'right'; targetY?: number; insets?: Insets; sky?: boolean }
const overlap = (a: FeedbackRect, b: FeedbackRect, gap = 3): boolean =>
  a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;

export function pickPeripheralSlot(viewport: Size, size: Size, obstacles: FeedbackRect[], options: Options = {}): { left: number; top: number } | null {
  const insets = options.insets ?? {};
  const left = Math.max(8, insets.left ?? 0) + 4;
  const right = viewport.width - Math.max(8, insets.right ?? 0) - size.width - 4;
  const minY = Math.max(8, insets.top ?? 0) + 4;
  const maxY = viewport.height - Math.max(8, insets.bottom ?? 0) - size.height - 4;
  if (left > right || minY > maxY) return null;
  const road = { left: viewport.width * .325, right: viewport.width * .675,
    top: viewport.height * .2, bottom: viewport.height * .72 };
  const target = Math.max(minY, Math.min(maxY, options.targetY ?? viewport.height * .43));
  let best = null as { left: number; top: number; score: number } | null; // `as`: scan() assigns it, so no null narrowing
  const scan = (columns: number[], maxBottom = Infinity): void => {
    for (const x of columns) {
      const side = x + size.width / 2 < viewport.width / 2 ? 'left' : 'right';
      for (let y = minY; y <= maxY && y + size.height <= maxBottom; y += 4) {
        const rect = { left: x, top: y, right: x + size.width, bottom: y + size.height };
        if (overlap(rect, road, 2) || obstacles.some(block => overlap(rect, block))) continue;
        const score = Math.abs(y - target) + (side === (options.preferred ?? 'left') ? 0 : 40);
        if (!best || score < best.score) best = { left: x, top: y, score };
      }
    }
  };
  scan([left, right]);
  // Edge widgets fill both edge columns (short landscape): try the gaps beside them, never a central fallback.
  const gaps = obstacles.flatMap(block => [block.right + 4, block.left - 4 - size.width]).filter(x => x > left && x < right);
  if (!best) scan(gaps.filter(x => x + size.width <= road.left - 2 || x >= road.right + 2));
  if (!best && options.sky) scan(gaps, road.top - 2);
  return best && { left: best.left, top: best.top };
}

const SELECTORS = '.brand, .toolbar, .aero-tools, .airflow-hud, .race-progress, .progress-bar, .mode-indicator, .position-stat, .speedometer, .flight-telemetry, #nitro-status, .leaderboard, .race-route-map, .impact-report, #touch-controls [data-control], .touch-pad, #tutorial-coach';
const visible = (el: HTMLElement): boolean => !el.hidden && !!el.getClientRects().length &&
  getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
// The countdown hides the telemetry footer (speed, mode chip, flight stats) with visibility only; the mode chip keeps clear of it for GO.
const reserved = (el: HTMLElement): boolean => visible(el) || (!el.hidden && !!el.getClientRects().length && !!el.closest('.telemetry'));
const rect = (box: DOMRect): FeedbackRect => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });

/** `mode` (ROAD/FLIGHT chip) and `impact` (collision chip) dock at an edge too; both have a fixed CSS size, so text updates never re-place them. */
export function createRoadSafeFeedback(chip: HTMLElement, warning: HTMLElement, impact?: HTMLElement, mode?: HTMLElement) {
  const blocks = [...document.querySelectorAll<HTMLElement>(SELECTORS)];
  const yielding = blocks.filter(el => el.matches('.leaderboard, .progress-bar'));
  const controls = blocks.filter(el => el.matches('#touch-controls [data-control], .touch-pad'));
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.append(probe);
  chip.dataset.peripheral = 'true';
  warning.dataset.peripheral = 'true';
  for (const el of [impact, mode]) if (el) el.dataset.peripheral = 'true';
  let placing = false;
  const refresh = (): void => {
    if (placing) return;
    placing = true;
    try {
      const safe = getComputedStyle(probe);
      const insets = { top: parseFloat(safe.paddingTop) || 0, right: parseFloat(safe.paddingRight) || 0,
        bottom: parseFloat(safe.paddingBottom) || 0, left: parseFloat(safe.paddingLeft) || 0 };
      const viewport = { width: innerWidth, height: innerHeight };
      // A touch control the player placed (Controls panel hand/size/layout) wins: the leaderboard and progress bar yield rather than sit under a thumb.
      for (const el of yielding) {
        el.style.visibility = '';
        const area = visible(el) ? rect(el.getBoundingClientRect()) : null;
        if (area && controls.some(control => visible(control) && overlap(area, rect(control.getBoundingClientRect())))) el.style.visibility = 'hidden';
      }
      const obstacles = blocks.filter(el => el !== impact && el !== mode && visible(el)).map(el => rect(el.getBoundingClientRect()));
      const segments = (window as Window & { getWindowSegments?: () => DOMRect[] }).getWindowSegments?.();
      if (segments?.length === 2) {
        const [a, b] = segments.map(rect);
        if (a && b) {
          if (a.right < b.left || b.right < a.left) obstacles.push({ left: Math.min(a.right, b.right), right: Math.max(a.left, b.left), top: 0, bottom: viewport.height });
          else if (a.bottom < b.top || b.bottom < a.top) obstacles.push({ left: 0, right: viewport.width, top: Math.min(a.bottom, b.bottom), bottom: Math.max(a.top, b.top) });
        }
      }
      const place = (el: HTMLElement, preferred: 'left' | 'right', targetY: number, extra: FeedbackRect[] = [], sky = false): FeedbackRect | null => {
        if (el.hidden || !el.textContent?.trim()) return null;
        el.style.visibility = '';
        el.dataset.compact = 'false';
        let size = el.getBoundingClientRect();
        let slot = pickPeripheralSlot(viewport, size, [...obstacles, ...extra], { preferred, targetY, insets, sky });
        if (!slot) {
          el.dataset.compact = 'true';
          size = el.getBoundingClientRect();
          slot = pickPeripheralSlot(viewport, size, [...obstacles, ...extra], { preferred, targetY, insets, sky });
        }
        if (!slot && (el === warning || el === mode)) {
          // Warnings and the flight state still appear when every HUD-safe strip is occupied.
          slot = pickPeripheralSlot(viewport, size, [], { preferred, targetY, insets });
        }
        if (!slot) {
          // Decorative rewards yield rather than cover the road.
          el.style.visibility = 'hidden';
          return null;
        }
        el.style.left = `${slot.left}px`;
        el.style.top = `${slot.top}px`;
        el.style.right = 'auto';
        el.style.margin = '0';
        return { left: slot.left, top: slot.top, right: slot.left + size.width, bottom: slot.top + size.height };
      };
      const fuel = document.querySelector<HTMLElement>('.fuel-stat');
      const nitro = document.getElementById('nitro-status');
      const score = document.getElementById('style-score');
      // Persistent mode chip first (beside the flight stats), then transient chips around it.
      const flight = document.querySelector<HTMLElement>('.flight-telemetry');
      // Placed during the countdown too, so GO reveals the chip in a clear slot rather than at its CSS default.
      const hiddenTelemetry = blocks.filter(el => el !== mode && !visible(el) && reserved(el)).map(el => rect(el.getBoundingClientRect()));
      const modeBox = mode && reserved(mode) ? place(mode, 'right', (flight && reserved(flight) ? flight.getBoundingClientRect().top : viewport.height * .6) - 40, hiddenTelemetry) : null;
      if (modeBox) obstacles.push(modeBox);
      // The collision chip never shares the screen with a callout or warning.
      const impactBox = impact && !impact.hidden ? place(impact, 'left', viewport.height * .43, [], true) : null;
      const warningBox = place(warning, 'right', (fuel?.getBoundingClientRect().top ?? viewport.height * .55) - 35);
      const nitroReward = chip.dataset.kind === 'nitro' || chip.dataset.kind === 'refill';
      // A callout raised while the collision chip is still up (its wait can be cut short) keeps off it too.
      place(chip, nitroReward ? 'right' : 'left', ((nitroReward ? nitro : score)?.getBoundingClientRect().top ?? viewport.height * .43) + 10,
        [warningBox, impactBox].filter(box => box !== null));
    } finally { placing = false; }
  };
  window.addEventListener('resize', refresh, { passive: true });
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
  // Only structural layout changes invalidate placements; numeric HUD text changes every tick.
  for (const block of blocks.filter(el => el.matches('.race-progress, .leaderboard, .race-route-map, .mode-indicator, .aero-tools, .flight-telemetry')))
    observer?.observe(block);
  new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-hud-mode', 'data-fold-axis', 'data-phase'] });
  const watch = (id: string, attributeFilter: string[]): void => {
    const el = document.getElementById(id);
    if (el) new MutationObserver(refresh).observe(el, { attributes: true, attributeFilter });
  };
  // Steering mode can toggle a CSS transform on telemetry without resizing it.
  // Hand and size move or resize the controls; a custom layout writes each button's inline left/top (never per frame).
  watch('touch-controls', ['data-steer-mode', 'data-fold-axis', 'data-hand', 'data-size']);
  for (const el of controls) new MutationObserver(refresh).observe(el, { attributes: true, attributeFilter: ['style'] });
  // The GO countdown hides the flight telemetry via CSS :has(); when GO clears, that space is taken again.
  watch('countdown', ['hidden']);
  return { refresh };
}
