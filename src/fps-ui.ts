import { createFramePacer, FPS_STORAGE_KEY, ADAPTIVE_RESOLUTION_KEY, parseAdaptiveResolution } from './frame-pacing.ts';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* In-memory fallback. */ } };

// A render-only controller; physics and race timing never depend on whether a frame is drawn.
// gpuSource: the opt-in GPU timer (?perf=deep); without it Auto reads frame delivery only.
export function setupFpsUI(setRenderScale: (scale: number) => void,
  gpuSource?: { onGpuFrame: ((ms: number) => void) | null } | null) {
  const pacer = createFramePacer(read(FPS_STORAGE_KEY), { adaptiveResolution: parseAdaptiveResolution(read(ADAPTIVE_RESOLUTION_KEY)) });
  const control = document.querySelector<HTMLSelectElement>('#target-fps')!;
  const adaptive = document.querySelector<HTMLInputElement>('#adaptive-resolution');
  let lastScale = 1;
  let elapsed = 0;
  const applyScale = () => { if (lastScale !== pacer.renderScale) { lastScale = pacer.renderScale; setRenderScale(lastScale); } };
  control.value = pacer.preference;
  control.addEventListener('input', () => {
    pacer.setPreference(control.value);
    applyScale();
    write(FPS_STORAGE_KEY, pacer.preference);
  });
  if (adaptive) {
    adaptive.checked = pacer.adaptiveResolution;
    adaptive.addEventListener('change', () => {
      pacer.setAdaptiveResolution(adaptive.checked);
      applyScale();
      write(ADAPTIVE_RESOLUTION_KEY, adaptive.checked ? '1' : '0');
    });
  }
  if (gpuSource) gpuSource.onGpuFrame = ms => pacer.observeGpu(ms);
  return {
    get targetFps() { return pacer.targetFps; },
    get renderScale() { return pacer.renderScale; },
    shouldRender(now: number, dt: number, racing: boolean, hidden: boolean): boolean {
      elapsed += dt;
      const render = pacer.tick(now, { racing, hidden });
      if (render) applyScale();
      return render;
    },
    takeElapsed(): number {
      const result = Math.min(elapsed, 0.05);
      elapsed = 0;
      return result;
    },
  };
}
