import { frameStats, PERF_WINDOW } from './perf.ts';

export const perfLine = ({ p50, p95, fps }: { p50: number; p95: number; fps: number }, seconds: number): string =>
  `FRAME p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · ${fps} fps · ${Math.round(seconds)} s`;

// A gap this long is a stall (tab switch, backgrounding), not a frame time. 250 ms hid every frame of a 3-4 fps device.
const STALL_MS = 1000;

export interface PerfStats { p50: number; p95: number; fps: number; seconds: number; drawCalls?: number; triangles?: number }
let latest: PerfStats | null = null;
/** The newest racing-window stats (null outside racing); the diag relay adds them to its 500 ms beat. */
export const latestPerf = (): PerfStats | null => latest;
const tenth = (value: number): number => Math.round(value * 10) / 10;

/** The `?perf` frame-time strip used for device checks; null when the page was opened without ?perf.
 *  `record` (diag builds) measures without ?perf too, but draws no strip: the stats only reach the diag log. */
export function createPerfOverlay(search: string, readLoad?: () => {drawCalls:number;triangles:number}, record = false) {
  const strip = new URLSearchParams(search).has('perf');
  if (!strip && !record) return null;
  const overlay = strip ? document.body.appendChild(Object.assign(document.createElement('output'), { id: 'perf-overlay', className: 'perf-overlay' })) : null;
  const frames: { at: number; ms: number }[] = [];
  let shownAt = 0;
  let lastPresentedAt: number | null = null;
  latest = null;
  return {
    /** Racing frames only; a long stall (tab switch) is not a frame time. */
    record(now: number, rawDelta: number, racing: boolean, rendered = true): void {
      if (!racing) latest = null;
      if (!racing || rawDelta * 1000 > STALL_MS) {
        lastPresentedAt = null;
        return;
      }
      if (!rendered) return;
      if (lastPresentedAt === null) { lastPresentedAt = now; return; }
      const elapsed = now - lastPresentedAt;
      lastPresentedAt = now;
      if (elapsed <= 0 || elapsed > STALL_MS) return;
      frames.push({ at: now, ms: elapsed });
      while (now - frames[0]!.at > PERF_WINDOW * 1000) frames.shift();
      if (now - shownAt < 500) return;
      shownAt = now;
      const stats = frameStats(frames.map(frame => frame.ms))!, seconds = (now - frames[0]!.at) / 1000;
      const load = readLoad?.();
      latest = { p50: tenth(stats.p50!), p95: tenth(stats.p95!), fps: stats.fps, seconds: Math.round(seconds), ...load };
      if (!overlay) return;
      overlay.textContent = perfLine(stats as { p50: number; p95: number; fps: number }, seconds);
      if (load) {
        overlay.dataset.drawCalls = String(load.drawCalls);
        overlay.dataset.triangles = String(load.triangles);
      }
    },
  };
}
