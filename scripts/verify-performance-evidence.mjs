import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WORLD_TOUR_SOFTWARE_BASELINE,
  checkPerformanceEvidenceCoverage,
} from '../src/performance-evidence.ts';

const root = process.argv[2];
if (!root) throw Error('Pass the downloaded render-performance artifact directory');
const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const path = join(folder, entry.name);
  return entry.isDirectory() ? walk(path)
    : entry.name.startsWith('render-performance-') && entry.name.endsWith('.json') ? [path] : [];
});
const files = walk(root);
const records = files.map(path => JSON.parse(readFileSync(path, 'utf8')));
const classics = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
const worldTour = ['tokyo', 'alpine', 'taipei', 'coastal', 'cosmic'];
const expected = [...classics.flatMap(track => [
  [1440, 900], [390, 844], [844, 390],
].map(([width, height]) => ({ track, quality: 'medium', width, height }))),
...worldTour.flatMap(track => [
  [1440, 900], [390, 844], [320, 740], [844, 390],
].map(([width, height]) => ({ track, quality: 'medium', width, height })))];
const { missing, duplicates } = checkPerformanceEvidenceCoverage(records, expected);
const problems = [
  ...missing.map(id => 'Missing WebGL capture: ' + id),
  ...duplicates.map(id => 'Duplicate WebGL capture: ' + id),
];
const lines = [
  '### Ten-track software-WebGL performance evidence',
  '',
  'These are CI software-renderer observations at 30 FPS preference, Medium quality.',
  'They are **not** controlled real-device GPU, thermal or battery measurements.',
  '',
  'Baseline: Phase 5 pre-pooling CI [40803061305](https://github.com/weskao/skyline-rush/actions/runs/40803061305). Only 1440×900 Medium World Tour has a reference.',
  '',
  '| Track | Viewport | DPR | Draw Calls | Pre-pool draws | Change | Triangles | FPS | Frame p50 / p95 |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|',
];
for (const record of records.sort((a,b) => a.track.localeCompare(b.track)
    || b.viewport.width-a.viewport.width)) {
  if (record.version !== 1 || !Number.isFinite(record.drawCalls) ||
      !Number.isFinite(record.triangles) || !Number.isFinite(record.p95Ms) ||
      record.source !== 'software-webgl-ci' || record.commit !== process.env.GITHUB_SHA) {
    problems.push('Untrusted or mismatched performance record: ' + record.track);
    continue;
  }
  const baseline = WORLD_TOUR_SOFTWARE_BASELINE[record.track];
  const matchedBaseline = baseline && record.viewport.width === 1440 &&
    record.viewport.height === 900 && record.quality === 'medium';
  const before = matchedBaseline ? baseline.drawCalls : null;
  const change = before ? ((record.drawCalls - before) / before * 100).toFixed(1) + '%' : '—';
  lines.push(`| ${record.track} | ${record.viewport.width}×${record.viewport.height} | ${record.viewport.pixelRatio} | ${record.drawCalls} | ${before ?? '—'} | ${change} | ${record.triangles} | ${record.fps} | ${record.p50Ms} / ${record.p95Ms} ms |`);
  // Flag large rendering regressions on exactly matching 1440x900 Medium software WebGL.
  // Deliberately do not gate on FPS/p95: CI CPU scheduling is noisy.
  if (baseline && record.viewport.width === 1440 && record.viewport.height === 900 &&
      record.quality === 'medium') {
    if (record.drawCalls > baseline.drawCalls * 1.1) {
      problems.push(`${record.track}: ${record.drawCalls} draws exceeds pre-pool budget ${baseline.drawCalls} (+10% tolerance)`);
    }
    if (record.triangles > baseline.triangles * 1.65) {
      problems.push(`${record.track}: ${record.triangles} triangles exceeds pre-pool budget ${baseline.triangles} (+65% tolerance)`);
    }
  }
}
lines.push('', `Recorded ${records.length}/${expected.length} mandatory track/viewport combinations.`);
if (problems.length) lines.push('', '### Verification failures', ...problems.map(p => '- ' + p));
const report = lines.join('\n') + '\n';
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, report, {flag: 'a'});
if (problems.length) process.exitCode = 1;
