/** Event-driven peripheral HUD slots; the frame loop never measures rectangles. */
export interface FeedbackRect { left: number; top: number; right: number; bottom: number }
interface Size { width: number; height: number }
interface Insets { left?: number; right?: number; top?: number; bottom?: number }
interface Options { preferred?: 'left' | 'right'; targetY?: number; insets?: Insets }
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
  const scan = (columns: number[]): void => {
    for (const x of columns) {
      const side = x + size.width / 2 < viewport.width / 2 ? 'left' : 'right';
      for (let y = minY; y <= maxY; y += 4) {
        const rect = { left: x, top: y, right: x + size.width, bottom: y + size.height };
        if (overlap(rect, road, 2) || obstacles.some(block => overlap(rect, block))) continue;
        const score = Math.abs(y - target) + (side === (options.preferred ?? 'left') ? 0 : 40);
        if (!best || score < best.score) best = { left: x, top: y, score };
      }
    }
  };
  scan([left, right]);
  // Edge widgets fill both edge columns (short landscape): try the gaps beside them, never a central fallback.
  if (!best) scan(obstacles.flatMap(block => [block.right + 4, block.left - 4 - size.width])
    .filter(x => x > left && x < right && (x + size.width <= road.left - 2 || x >= road.right + 2)));
  return best && { left: best.left, top: best.top };
}

const SELECTORS = '.brand, .toolbar, .aero-tools, .airflow-hud, .race-progress, .mode-indicator, .position-stat, .speedometer, .flight-telemetry, #nitro-status, .leaderboard, .race-route-map, .impact-report, #touch-controls [data-control], .touch-pad, #tutorial-coach';
const visible = (el: HTMLElement): boolean => !el.hidden && !!el.getClientRects().length &&
  getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
const rect = (box: DOMRect): FeedbackRect => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });

export function createRoadSafeFeedback(chip: HTMLElement, warning: HTMLElement) {
  const blocks = [...document.querySelectorAll<HTMLElement>(SELECTORS)];
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.append(probe);
  chip.dataset.peripheral = 'true';
  warning.dataset.peripheral = 'true';
  let placing = false;
  const refresh = (): void => {
    if (placing) return;
    placing = true;
    try {
      const safe = getComputedStyle(probe);
      const insets = { top: parseFloat(safe.paddingTop) || 0, right: parseFloat(safe.paddingRight) || 0,
        bottom: parseFloat(safe.paddingBottom) || 0, left: parseFloat(safe.paddingLeft) || 0 };
      const viewport = { width: innerWidth, height: innerHeight };
      const obstacles = blocks.filter(visible).map(el => rect(el.getBoundingClientRect()));
      const segments = (window as Window & { getWindowSegments?: () => DOMRect[] }).getWindowSegments?.();
      if (segments?.length === 2) {
        const [a, b] = segments.map(rect);
        if (a && b) {
          if (a.right < b.left || b.right < a.left) obstacles.push({ left: Math.min(a.right, b.right), right: Math.max(a.left, b.left), top: 0, bottom: viewport.height });
          else if (a.bottom < b.top || b.bottom < a.top) obstacles.push({ left: 0, right: viewport.width, top: Math.min(a.bottom, b.bottom), bottom: Math.max(a.top, b.top) });
        }
      }
      const place = (el: HTMLElement, preferred: 'left' | 'right', targetY: number, extra: FeedbackRect[] = []): FeedbackRect | null => {
        if (el.hidden || !el.textContent?.trim()) return null;
        el.style.visibility = '';
        el.dataset.compact = 'false';
        let size = el.getBoundingClientRect();
        let slot = pickPeripheralSlot(viewport, size, [...obstacles, ...extra], { preferred, targetY, insets });
        if (!slot) {
          el.dataset.compact = 'true';
          size = el.getBoundingClientRect();
          slot = pickPeripheralSlot(viewport, size, [...obstacles, ...extra], { preferred, targetY, insets });
        }
        if (!slot && el === warning) {
          // Actionable warnings still appear when every HUD-safe strip is occupied.
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
      const warningBox = place(warning, 'right', (fuel?.getBoundingClientRect().top ?? viewport.height * .55) - 35);
      const nitroReward = chip.dataset.kind === 'nitro' || chip.dataset.kind === 'refill';
      place(chip, nitroReward ? 'right' : 'left', ((nitroReward ? nitro : score)?.getBoundingClientRect().top ?? viewport.height * .43) + 10,
        warningBox ? [warningBox] : []);
    } finally { placing = false; }
  };
  window.addEventListener('resize', refresh, { passive: true });
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
  // Only structural layout changes invalidate placements; numeric HUD text changes every tick.
  for (const block of blocks.filter(el => el.matches('.race-progress, .leaderboard, .race-route-map, .mode-indicator, .aero-tools')))
    observer?.observe(block);
  const layoutChanges = new MutationObserver(refresh);
  layoutChanges.observe(document.body, { attributes: true, attributeFilter: ['data-hud-mode', 'data-fold-axis', 'data-phase'] });
  // The telemetry stays visibility:hidden while "GO!" is up after racing starts; a chip placed then must move once it appears.
  const countdown = document.getElementById('countdown');
  if (countdown) layoutChanges.observe(countdown, { attributes: true, attributeFilter: ['hidden'] });
  return { refresh };
}
