import type { WebGLRenderer } from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { createGpuTimer } from './gpu-timer.ts';
import { PERF_WINDOW } from './perf.ts';

type Sample = { at: number; ms: number };
type Metric = { count: number; p50: number; p95: number; p99: number; mean: number };
type Bucket = { phase: string; track: string; samples: Record<string, Sample[]>; lastFrame: number | null;
  stalls: number; config: Record<string, unknown> | null; mixedConfig: boolean; load: Record<string, number> | null };
const PASS_NAMES = ['scene', 'bloom', 'lens', 'output'];
const MAX_SAMPLES = 2400;
export function metricStats(samples: readonly number[]): Metric | null {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a,b) => a-b);
  const rank = (p: number) => sorted[Math.ceil(p * sorted.length) - 1]!;
  return { count: sorted.length, p50: rank(.5), p95: rank(.95), p99: rank(.99),
    mean: sorted.reduce((sum, n) => sum + n, 0) / sorted.length };
}

export function deepPerfPhase(phase: string, garage: boolean, photo: boolean): string {
  return photo ? 'photo' : garage ? 'garage' : phase === 'ready' ? 'home' : phase === 'finished' ? 'results' : phase;
}
function sample(bucket: Bucket, name: string, at: number, ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  const series = bucket.samples[name] ??= [];
  series.push({ at, ms });
  if (series.length > MAX_SAMPLES) series.shift();
}
function summarize(bucket: Bucket, now: number) {
  const metrics = Object.fromEntries(Object.entries(bucket.samples).map(([name, samples]) => {
    const recent = samples.filter(s => now - s.at <= PERF_WINDOW * 1000);
    return [name, metricStats(recent.map(s => s.ms))];
  }));
  const frame = metrics.frameIntervalMs;
  return { phase: bucket.phase, track: bucket.track, metrics, stalls: bucket.stalls,
    actualFps: frame && frame.mean > 0 ? 1000 / frame.mean : null,
    config: bucket.config, mixedConfig: bucket.mixedConfig, load: bucket.load };
}

/** Opt-in only: no timer queries, pass wrappers, sampling or listeners in ordinary production. */
export function createDeepPerf(search: string, renderer: WebGLRenderer, composer: EffectComposer,
  quality: () => string) {
  if (new URLSearchParams(search).get('perf') !== 'deep') return null;
  const canvas = renderer.domElement;
  const gpu = createGpuTimer(renderer.getContext());
  const lost = () => gpu.contextLost(), restored = () => gpu.restore();
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  const garage = document.querySelector<HTMLDialogElement>('#garage-screen');
  const photo = document.querySelector<HTMLDialogElement>('#photo-screen');
  let bucket: Bucket | null = null, at = 0, started = 0, shownAt = -Infinity, frameNumber = 0;
  let eligible = false, timePasses = false;
  const reports: Record<string, ReturnType<typeof summarize>> = {};
  const undo = composer.passes.map((pass, index) => {
    const original = pass.render;
    pass.render = (...args) => {
      const current = bucket, time = at;
      const draw = () => original.apply(pass, args);
      if (timePasses && current) gpu.measure(ms => sample(current, PASS_NAMES[index] ?? 'pass-' + index, time, ms), draw);
      else draw();
    };
    return () => { pass.render = original; };
  });
  function publish() {
    if (!bucket) return null;
    reports[bucket.phase + '/' + bucket.track] = summarize(bucket, at);
    const snapshot = { version: 1, source: 'unclassified-browser-webgl',
      windowSeconds: PERF_WINDOW, gpuStatus: gpu.status, current: bucket.phase + '/' + bucket.track, reports };
    const output = document.getElementById('perf-overlay');
    if (output) {
      output.dataset.deep = JSON.stringify(snapshot);
      if (bucket.phase !== 'racing') output.textContent = 'DEEP ' + bucket.phase + ' · ' + bucket.track + ' · GPU ' + gpu.status;
    }
    return snapshot;
  }
  return {
    start(now: number, rawDelta: number, racePhase: string, track: string) {
      at = now;
      const phase = deepPerfPhase(racePhase, !!garage?.open, !!photo?.open);
      if (!bucket || phase !== bucket.phase || track !== bucket.track) {
        publish();
        bucket = { phase, track, samples: {}, lastFrame: null, stalls: 0, config: null, mixedConfig: false, load: null };
        shownAt = -Infinity;
      }
      eligible = !document.hidden && rawDelta >= 0 && rawDelta <= 1;
      if (!eligible) { bucket.lastFrame = null; if (!document.hidden) bucket.stalls++; }
      started = performance.now();
    },
    simulationDone() { if (eligible && bucket) sample(bucket, 'cpuSimulationMs', at, performance.now() - started); },
    submission(ms: number) { if (eligible && bucket) sample(bucket, 'cpuRenderSubmissionMs', at, ms); },
    draw(dt: number) {
      gpu.poll();
      const current = bucket, time = at;
      const draw = () => composer.render(dt);
      if (!eligible || !current || ++frameNumber % 15 !== 0) { draw(); return; }
      if (frameNumber % 30 === 0) gpu.measure(ms => sample(current, 'gpuFrameMs', time, ms), draw);
      else {
        timePasses = true;
        try { draw(); } finally { timePasses = false; }
      }
    },
    finish(drawn: boolean, targetFps: number, renderScale: number) {
      if (!bucket) return;
      if (drawn && eligible) {
        if (bucket.lastFrame !== null) sample(bucket, 'frameIntervalMs', at, at - bucket.lastFrame);
        bucket.lastFrame = at;
        const config = { quality: quality(), deviceDpr: devicePixelRatio, renderDpr: renderer.getPixelRatio(),
          width: canvas.width, height: canvas.height, targetWidth: composer.renderTarget1.width,
          targetHeight: composer.renderTarget1.height, msaa: composer.renderTarget1.samples, targetFps, renderScale };
        if (bucket.config && JSON.stringify(bucket.config) !== JSON.stringify(config)) bucket.mixedConfig = true;
        bucket.config = config;
        const { render, memory, programs } = renderer.info;
        bucket.load = { drawCalls: render.calls, triangles: render.triangles, geometries: memory.geometries,
          textures: memory.textures, shaderPrograms: programs?.length ?? 0 };
      }
      if (at - shownAt >= 500) { shownAt = at; publish(); }
    },
    snapshot: publish,
    dispose() {
      undo.forEach(restore => restore()); gpu.dispose();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
    },
  };
}
