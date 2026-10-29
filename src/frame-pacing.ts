// A render-only pacer. The 60 Hz physics accumulator must run on EVERY rAF callback.
export const FPS_STORAGE_KEY = 'skyline-rush-target-fps-v1';
export const AUTO_SAMPLE_WINDOW_MS = 8000;
export type FpsPreference = 'auto' | '30' | '60';
export function parseFpsPreference(raw: unknown): FpsPreference {
  return raw === '30' || raw === '60' ? raw : 'auto';
}
export interface PaceFlags { racing: boolean; hidden?: boolean }
export function createFramePacer(initial: unknown = 'auto') {
  let preference = parseFpsPreference(initial);
  let target = preference === '30' ? 30 : 60;
  let scale = 1;
  let lastPaint = -Infinity;
  let lastTick = -Infinity;
  let sampleAt = -1;
  let totalCost = 0;
  let costCount = 0;
  let pressure = 0;
  let recovery = 0;
  let pending = false;
  function resetSamples() {
    sampleAt = -1; totalCost = 0; costCount = 0; pressure = 0; recovery = 0;
  }
  return {
    get preference() { return preference; },
    get targetFps() { return target; },
    get renderScale() { return scale; },
    setPreference(raw: unknown) {
      preference = parseFpsPreference(raw);
      target = preference === '30' ? 30 : 60;
      scale = 1; lastPaint = -Infinity; resetSamples();
    },
    tick(now: number, { racing, hidden = false }: PaceFlags): boolean {
      if (!Number.isFinite(now)) return false;
      if (hidden || (Number.isFinite(lastTick) && now - lastTick > 250)) {
        lastPaint = -Infinity; resetSamples();
        lastTick = now;
        if (hidden) return false;
      }
      lastTick = now;
      const interval = 1000 / target;
      // Allow a small epsilon for rAF timestamps on 60 Hz and 120 Hz monitors.
      if (now - lastPaint < interval - 0.6) return false;
      lastPaint = now;
      pending = preference === 'auto' && racing;
      if (pending && sampleAt < 0) sampleAt = now;
      if (pending && now - sampleAt >= AUTO_SAMPLE_WINDOW_MS) {
        const mean = costCount ? totalCost / costCount : 0;
        // Short, noisy windows cannot trigger adaptation.
        if (costCount >= 40) {
          const stressed = mean > (1000 / target) * 0.90;
          const relaxed = mean < (1000 / 60) * 0.48;
          pressure = stressed ? pressure + 1 : 0;
          recovery = relaxed ? recovery + 1 : 0;
          if (pressure >= 1 && scale === 1) {
            scale = 0.85; pressure = 0; recovery = 0;
          } else if (pressure >= 1 && target === 60) {
            target = 30; pressure = 0; recovery = 0; lastPaint = -Infinity;
          } else if (recovery >= 2 && target === 30) {
            target = 60; recovery = 0; pressure = 0; lastPaint = -Infinity;
          } else if (recovery >= 2 && scale < 1) {
            scale = 1; recovery = 0; pressure = 0;
          }
        }
        sampleAt = now; costCount = 0; totalCost = 0;
      }
      return true;
    },
    completeRender(costMs: number) {
      if (pending && Number.isFinite(costMs) && costMs >= 0 && costMs < 200) {
        totalCost += costMs; costCount++;
      }
      pending = false;
    },
  };
}

/** Physics always advances in whole 1/60 s steps, whatever the display rate; a hitch counts as at most 0.05 s. */
export const SIM_STEP = 1 / 60;
export function drainSteps(accumulator: number, dt: number): { steps: number; accumulator: number } {
  accumulator += Math.max(0, Math.min(dt, 0.05));
  let steps = 0;
  while (accumulator >= SIM_STEP) { accumulator -= SIM_STEP; steps++; }
  return { steps, accumulator };
}
