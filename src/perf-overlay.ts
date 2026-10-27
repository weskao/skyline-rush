import { frameStats, PERF_WINDOW } from './perf.ts';

export const perfLine = ({ p50, p95, fps }: { p50: number; p95: number; fps: number }, seconds: number): string =>
  `FRAME p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · ${fps} fps · ${Math.round(seconds)} s`;

/** The `?perf` frame-time strip used for device checks; null when the page was opened without ?perf. */
export function createPerfOverlay(search: string, readLoad?: () => {drawCalls:number;triangles:number}) {
  if (!new URLSearchParams(search).has('perf')) return null;
  const overlay = document.body.appendChild(Object.assign(document.createElement('output'), { id: 'perf-overlay', className: 'perf-overlay' }));
  const frames: { at: number; ms: number }[] = [];
  let shownAt = 0;
  let lastPresentedAt: number | null = null;
  return {
    /** Racing frames only; a long stall (tab switch) is not a frame time. */
    record(now: number, rawDelta: number, racing: boolean, rendered = true): void {
      if (!racing || rawDelta > 0.25) {
        lastPresentedAt = null;
        return;
      }
      if (!rendered) return;
      if (lastPresentedAt === null) { lastPresentedAt = now; return; }
      const elapsed = now - lastPresentedAt;
      lastPresentedAt = now;
      if (elapsed <= 0 || elapsed > 250) return;
      frames.push({ at: now, ms: elapsed });
      while (now - frames[0]!.at > PERF_WINDOW * 1000) frames.shift();
      if (now - shownAt < 500) return;
      shownAt = now;
      overlay.textContent = perfLine(frameStats(frames.map(frame => frame.ms))!, (now - frames[0]!.at) / 1000);
      if (readLoad) {
        const load = readLoad();
        overlay.dataset.drawCalls = String(load.drawCalls);
        overlay.dataset.triangles = String(load.triangles);
      }
    },
  };
}
