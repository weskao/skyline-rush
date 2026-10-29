import { createFramePacer, FPS_STORAGE_KEY } from './frame-pacing.ts';

// A render-only controller; physics and race timing never depend on whether a frame is drawn.
export function setupFpsUI(setRenderScale: (scale: number) => void) {
  let stored: string | null = null;
  try { stored = localStorage.getItem(FPS_STORAGE_KEY); } catch { /* In-memory fallback. */ }
  const pacer = createFramePacer(stored);
  const control = document.querySelector<HTMLSelectElement>('#target-fps')!;
  let lastScale = 1;
  let elapsed = 0;
  control.value = pacer.preference;
  control.addEventListener('input', () => {
    pacer.setPreference(control.value);
    lastScale = 1;
    setRenderScale(1);
    try { localStorage.setItem(FPS_STORAGE_KEY, pacer.preference); } catch { /* In-memory fallback. */ }
  });
  return {
    shouldRender(now: number, dt: number, racing: boolean, hidden: boolean): boolean {
      elapsed += dt;
      const render = pacer.tick(now, { racing, hidden });
      if (render && lastScale !== pacer.renderScale) {
        lastScale = pacer.renderScale;
        setRenderScale(lastScale);
      }
      return render;
    },
    takeElapsed(): number {
      const result = Math.min(elapsed, 0.05);
      elapsed = 0;
      return result;
    },
    completeRender(ms: number): void { pacer.completeRender(ms); },
  };
}
