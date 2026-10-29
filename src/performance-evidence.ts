/** Machine-readable software-WebGL CI evidence; not a physical GPU benchmark. */
export const WORLD_TOUR_SOFTWARE_BASELINE = {
  tokyo: { drawCalls: 657, triangles: 40833 },
  alpine: { drawCalls: 447, triangles: 40297 },
  taipei: { drawCalls: 839, triangles: 52455 },
  coastal: { drawCalls: 538, triangles: 41037 },
  cosmic: { drawCalls: 438, triangles: 38967 },
} as const;

type Quality = 'low' | 'medium' | 'high';
interface RawEvidence {
  track: string; quality: string; width: number; height: number; pixelRatio: number;
  browser: string; commit: string; drawCalls: number; triangles: number; line: string;
}
export interface PerformanceEvidence {
  version: 1; source: 'software-webgl-ci' | 'browser-webgl'; track: string;
  quality: Quality; viewport: { width: number; height: number; pixelRatio: number };
  browser: string; commit: string; drawCalls: number; triangles: number;
  p50Ms: number; p95Ms: number; fps: number; windowSeconds: number;
}
const frameLine = /^FRAME p50 (\d+(?:\.\d+)?) ms · p95 (\d+(?:\.\d+)?) ms · (\d+(?:\.\d+)?) fps · (\d+(?:\.\d+)?) s$/;
const finite = (value: number, positive = false): boolean =>
  Number.isFinite(value) && (positive ? value > 0 : value >= 0);
const key = (item: { track: string; width: number; height: number; quality: string }): string =>
  `${item.track}/${item.width}x${item.height}/${item.quality}`;

export function parsePerformanceEvidence(raw: RawEvidence): PerformanceEvidence {
  const match = frameLine.exec(raw.line);
  if (!match) throw Error('Missing or malformed FRAME p50/p95/fps metrics');
  const [, p50, p95, fps, seconds] = match.map(Number);
  if (!finite(p50, true) || !finite(p95, true) || p95 < p50 ||
      !finite(fps, true) || !finite(seconds, true) ||
      !Number.isInteger(raw.drawCalls) || !finite(raw.drawCalls) ||
      !Number.isInteger(raw.triangles) || !finite(raw.triangles) ||
      !Number.isInteger(raw.width) || !finite(raw.width, true) ||
      !Number.isInteger(raw.height) || !finite(raw.height, true) ||
      !finite(raw.pixelRatio, true) ||
      !['low','medium','high'].includes(raw.quality) ||
      !raw.track || !raw.browser || !raw.commit) {
    throw Error('Invalid WebGL performance evidence: non-finite or incompatible fields');
  }
  return {
    version: 1,
    source: raw.browser.includes('software') ? 'software-webgl-ci' : 'browser-webgl',
    track: raw.track, quality: raw.quality as Quality,
    viewport: { width: raw.width, height: raw.height, pixelRatio: raw.pixelRatio },
    browser: raw.browser, commit: raw.commit, drawCalls: raw.drawCalls,
    triangles: raw.triangles, p50Ms: p50, p95Ms: p95, fps,
    windowSeconds: seconds,
  };
}

export function comparePerformanceEvidence(before: PerformanceEvidence, after: PerformanceEvidence) {
  const comparable = before.track === after.track &&
    before.quality === after.quality && before.browser === after.browser &&
    before.source === after.source &&
    before.viewport.width === after.viewport.width &&
    before.viewport.height === after.viewport.height &&
    before.viewport.pixelRatio === after.viewport.pixelRatio;
  if (!comparable) return { comparable: false, drawCallsDelta: null,
    trianglesDelta: null, drawCallsPercent: null, trianglesPercent: null };
  const percent = (original: number, updated: number): number | null =>
    original ? (updated - original) / original * 100 : null;
  return { comparable: true, drawCallsDelta: after.drawCalls - before.drawCalls,
    trianglesDelta: after.triangles - before.triangles,
    drawCallsPercent: percent(before.drawCalls, after.drawCalls),
    trianglesPercent: percent(before.triangles, after.triangles) };
}

export function checkPerformanceEvidenceCoverage(
  records: PerformanceEvidence[],
  expected: {track: string; width: number; height: number; quality: string}[],
) {
  const found = new Set<string>(), duplicates: string[] = [];
  for (const record of records) {
    const id = key({track:record.track,width:record.viewport.width,
      height:record.viewport.height,quality:record.quality});
    if (found.has(id) && !duplicates.includes(id)) duplicates.push(id);
    found.add(id);
  }
  return { missing: expected.map(key).filter(id => !found.has(id)), duplicates };
}
