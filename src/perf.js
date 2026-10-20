// Frame-time readout for device checks (`?perf`); nearest-rank percentiles over the last PERF_WINDOW seconds.
export const PERF_WINDOW = 20;

export function frameStats(samples) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = p => sorted[Math.ceil(p * sorted.length) - 1];
  const mean = samples.reduce((sum, ms) => sum + ms, 0) / samples.length;
  return { count: samples.length, p50: rank(0.5), p95: rank(0.95), fps: Math.round(10000 / mean) / 10 };
}
