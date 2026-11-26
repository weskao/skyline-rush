// A render-only pacer. The fixed 60 Hz physics accumulator runs on EVERY rAF callback.
// Auto holds a stable 60 (never above). 90/120 are manual choices; resolution is untouched unless opted in.
// Load = what the player sees: missed vsyncs and, when a GPU timer reports, GPU time. CPU submission time is not load.
export const FPS_STORAGE_KEY = 'skyline-rush-target-fps-v1';
export const ADAPTIVE_RESOLUTION_KEY = 'skyline-rush-adaptive-resolution-v1';
export const AUTO_SAMPLE_WINDOW_MS = 8000;
export type FpsPreference = 'auto' | '30' | '60' | '90' | '120';
export function parseFpsPreference(raw: unknown): FpsPreference {
  return raw === '30' || raw === '60' || raw === '90' || raw === '120' ? raw : 'auto';
}
export const parseAdaptiveResolution = (raw: unknown): boolean => raw === '1';
export interface PaceFlags { racing: boolean; hidden?: boolean }
const STRESS_WINDOWS = 2;
const MAX_RECOVERY_WINDOWS = 24;
export function createFramePacer(initial: unknown = 'auto', { adaptiveResolution = false } = {}) {
  let preference = parseFpsPreference(initial);
  let adaptive = adaptiveResolution;
  let refreshCeiling = 60; // Until rAF measurements establish the display rate.
  const wanted = () => (preference === 'auto' ? 60 : Number(preference));
  let target = Math.min(wanted(), refreshCeiling);
  let scale = 1;
  let lastPaint = -Infinity;
  let lastTick = -Infinity;
  let refreshSamples: number[] = [];
  let sampleAt = -1, callbacks = 0, missed = 0, gpuTotal = 0, gpuCount = 0, pressure = 0, recovery = 0;
  let recoveryNeeded = 3; // Doubles on each repeated step-down so marginal load cannot oscillate.
  let stepDowns = 0;
  function resetSamples() {
    sampleAt = -1; callbacks = 0; missed = 0; gpuTotal = 0; gpuCount = 0; pressure = 0; recovery = 0;
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
    const effective = Math.min(preference === 'auto' ? target : wanted(), refreshCeiling);
    if (effective !== target) { target = effective; lastPaint = -Infinity; resetSamples(); }
  }
  function evaluateWindow() {
    const budget = 1000 / target;
    const gpu = gpuCount >= 10 ? gpuTotal / gpuCount : null;
    const dropRatio = missed / callbacks;
    const stressed = dropRatio > 0.1 || (gpu !== null && gpu > budget * 0.85);
    const upTarget = preference === 'auto' ? Math.min(60, refreshCeiling) : target;
    const relaxed = dropRatio < 0.02 && (gpu === null || gpu < (1000 / upTarget) * 0.6);
    pressure = stressed ? pressure + 1 : 0;
    recovery = relaxed ? recovery + 1 : 0;
    const stepDown = () => {
      pressure = 0; recovery = 0;
      if (stepDowns++) recoveryNeeded = Math.min(recoveryNeeded * 2, MAX_RECOVERY_WINDOWS);
    };
    if (pressure >= STRESS_WINDOWS && adaptive && scale === 1) { scale = 0.85; stepDown(); }
    else if (pressure >= STRESS_WINDOWS && preference === 'auto' && target > 30) {
      target = 30; lastPaint = -Infinity; stepDown();
    } else if (recovery >= recoveryNeeded && preference === 'auto' && target < upTarget) {
      target = upTarget; lastPaint = -Infinity; recovery = 0; pressure = 0;
    } else if (recovery >= recoveryNeeded && scale < 1) { scale = 1; recovery = 0; pressure = 0; }
  }
  return {
    get preference() { return preference; },
    get targetFps() { return target; },
    get renderScale() { return scale; },
    get adaptiveResolution() { return adaptive; },
    setAdaptiveResolution(on: boolean) {
      adaptive = on;
      if (!on) scale = 1;
    },
    setPreference(raw: unknown) {
      preference = parseFpsPreference(raw);
      target = Math.min(wanted(), refreshCeiling);
      scale = 1; lastPaint = -Infinity; recoveryNeeded = 3; stepDowns = 0; resetSamples();
    },
    /** GPU time of a drawn frame (ms) from a timer query, when one is available. */
    observeGpu(ms: number) {
      if (sampleAt >= 0 && Number.isFinite(ms) && ms >= 0 && ms < 200) { gpuTotal += ms; gpuCount++; }
    },
    tick(now: number, { racing, hidden = false }: PaceFlags): boolean {
      if (!Number.isFinite(now)) return false;
      if (hidden || (Number.isFinite(lastTick) && now - lastTick > 250)) {
        lastPaint = -Infinity; refreshSamples = []; refreshCeiling = 60; resetSamples();
        target = Math.min(preference === 'auto' ? target : wanted(), 60);
        lastTick = now;
        if (hidden) return false;
      } else if (Number.isFinite(lastTick)) {
        const delta = now - lastTick;
        observeRefresh(delta);
        if (racing && sampleAt >= 0) {
          callbacks++;
          if (delta > 1.5 * 1000 / refreshCeiling) missed++; // a missed vsync: the frame was not delivered on time
        }
      }
      lastTick = now;
      if (!racing) { if (sampleAt >= 0) resetSamples(); }
      else if (sampleAt < 0) sampleAt = now;
      else if (now - sampleAt >= AUTO_SAMPLE_WINDOW_MS) {
        if (callbacks >= 40) evaluateWindow();
        sampleAt = now; callbacks = 0; missed = 0; gpuTotal = 0; gpuCount = 0;
      }
      const interval = 1000 / target;
      // Keep fractional deadlines: a naive 'lastPaint = now' gives 60, not 90 FPS on 120 Hz.
      if (now - lastPaint < interval - 0.6) return false;
      lastPaint = !Number.isFinite(lastPaint) || now - lastPaint > interval * 2
        ? now : lastPaint + interval;
      return true;
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

interface StartingGrid {
  phase: string;
  countdown: number;
  mode?: string;
  standingStart?: boolean;
  player: { speed: number };
  rivals: { speed: number }[];
}

/** Free Drive skips the 3-2-1 (it only holds for scenery); practice, a standing-start Free Drive, keeps it. */
export const skipsCountdown = (race: Pick<StartingGrid, 'mode' | 'standingStart'>): boolean =>
  race.mode === 'free' && !race.standingStart;

export function startRace(race: Pick<StartingGrid, 'phase' | 'mode'>, waitingForScenery = false): void {
  if (race.phase !== 'ready') return;
  race.phase = race.mode === 'free' && !waitingForScenery ? 'racing' : 'countdown';
}

/** Count down in elapsed seconds while the grid is stationary. Race physics start on the next tick. */
export function advanceCountdown(race: StartingGrid, elapsed: number): void {
  if (skipsCountdown(race)) { race.phase = 'racing'; return; }
  race.countdown = Math.max(0, race.countdown - elapsed);
  if (race.countdown >= 0.00001) return;
  race.phase = 'racing';
  if (!race.standingStart) for (const car of [race.player, ...race.rivals]) car.speed = Math.max(car.speed, 20);
}
