// A render-only pacer. The fixed 60 Hz physics accumulator runs on EVERY rAF callback.
export const FPS_STORAGE_KEY = 'skyline-rush-target-fps-v1';
export const AUTO_SAMPLE_WINDOW_MS = 8000;
export type FpsPreference = 'auto' | '30' | '60' | '90' | '120';
export function parseFpsPreference(raw: unknown): FpsPreference {
  return raw === '30' || raw === '60' || raw === '90' || raw === '120' ? raw : 'auto';
}
export interface PaceFlags { racing: boolean; hidden?: boolean }
export function createFramePacer(initial: unknown = 'auto') {
  let preference = parseFpsPreference(initial);
  let target = preference === '30' ? 30 : 60;
  let refreshCeiling = 60; // Until rAF measurements establish a faster display.
  let scale = 1;
  let lastPaint = -Infinity;
  let lastTick = -Infinity;
  let refreshSamples: number[] = [];
  let sampleAt = -1;
  let totalCost = 0;
  let costCount = 0;
  let pressure = 0;
  let recovery = 0;
  let pending = false;
  function resetSamples() {
    sampleAt = -1; totalCost = 0; costCount = 0; pressure = 0; recovery = 0;
    pending = false;
  }
  function observeRefresh(delta: number) {
    if (delta <= 0 || delta > 50) { refreshSamples = []; return; }
    refreshSamples.push(delta);
    if (refreshSamples.length < 48) return;
    refreshSamples.sort((a, b) => a - b);
    const median = refreshSamples[24]!;
    refreshSamples = [];
    // The browser may throttle rAF below the panel's advertised refresh rate.
    const observed = median <= 1000 / 110 ? 120 : median <= 1000 / 85 ? 90
      : median <= 1000 / 45 ? 60 : 30;
    if (observed === refreshCeiling) return;
    refreshCeiling = observed;
    const effective = preference === 'auto' ? Math.min(target, refreshCeiling)
      : Math.min(Number(preference), refreshCeiling);
    if (effective !== target) {
      target = effective; lastPaint = -Infinity; resetSamples();
    }
  }
  return {
    get preference() { return preference; },
    get targetFps() { return target; },
    get renderScale() { return scale; },
    setPreference(raw: unknown) {
      preference = parseFpsPreference(raw);
      target = preference === 'auto' ? Math.min(60, refreshCeiling) : Math.min(Number(preference), refreshCeiling);
      scale = 1; lastPaint = -Infinity; resetSamples();
    },
    tick(now: number, { racing, hidden = false }: PaceFlags): boolean {
      if (!Number.isFinite(now)) return false;
      if (hidden || (Number.isFinite(lastTick) && now - lastTick > 250)) {
        lastPaint = -Infinity; refreshSamples = []; refreshCeiling = 60; resetSamples();
        target = preference === 'auto' ? Math.min(target, 60) : Math.min(Number(preference), 60);
        lastTick = now;
        if (hidden) return false;
      } else if (Number.isFinite(lastTick)) {
        observeRefresh(now - lastTick);
      }
      lastTick = now;
      if (!racing && sampleAt >= 0) resetSamples();
      const interval = 1000 / target;
      // Keep fractional deadlines: a naive 'lastPaint = now' gives 60, not 90 FPS on 120 Hz.
      if (now - lastPaint < interval - 0.6) return false;
      lastPaint = !Number.isFinite(lastPaint) || now - lastPaint > interval * 2
        ? now : lastPaint + interval;
      pending = preference === 'auto' && racing;
      if (pending && sampleAt < 0) sampleAt = now;
      if (pending && now - sampleAt >= AUTO_SAMPLE_WINDOW_MS) {
        const mean = costCount ? totalCost / costCount : 0;
        if (costCount >= 40) {
          const next = target === 30 ? 60 : target === 60 ? 90 : 120;
          const stressed = mean > (1000 / target) * 0.90;
          const relaxed = mean < (1000 / next) * 0.60;
          pressure = stressed ? pressure + 1 : 0;
          recovery = relaxed ? recovery + 1 : 0;
          if (pressure >= 1 && scale === 1) {
            scale = 0.85; pressure = 0; recovery = 0;
          } else if (pressure >= 1 && target > 30) {
            target = target === 120 ? 90 : target === 90 ? 60 : 30;
            pressure = 0; recovery = 0; lastPaint = -Infinity;
          } else if (recovery >= 2 && scale < 1) {
            scale = 1; recovery = 0; pressure = 0;
          } else if (recovery >= 2 && target < refreshCeiling) {
            target = Math.min(next, refreshCeiling);
            recovery = 0; pressure = 0; lastPaint = -Infinity;
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
