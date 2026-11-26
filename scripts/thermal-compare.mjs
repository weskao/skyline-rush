// Before/After table from two scripts/thermal-baseline.mjs JSON files (same harness, matrix and settings).
// Usage: node scripts/thermal-compare.mjs <before.json> <after.json>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const METRICS = ['frameIntervalMs', 'cpuSimulationMs', 'cpuRenderSubmissionMs', 'gpuFrameMs'];
const SETTINGS = ['harness', 'frames', 'width', 'height', 'dpr', 'source'];
const key = r => `${r.scenario}/${r.track}`;
// Showcase records are reported under home/<id>, so use the record's own current key.
const report = r => r.diagnostics?.reports?.[r.diagnostics.current];

/** Rows only for scenarios present and valid in both runs; a settings mismatch rejects the whole comparison. */
export function compareRuns(before, after) {
  const mismatch = SETTINGS.filter(name => before[name] !== after[name]);
  if (mismatch.length) throw Error('Runs are not comparable, differing: ' + mismatch.join(', '));
  const skipped = [], rows = [];
  const later = new Map(after.records.map(r => [key(r), r]));
  for (const a of before.records) {
    const b = later.get(key(a)), ra = report(a), rb = b && report(b);
    if (!ra || !rb || ra.mixedConfig || rb.mixedConfig) { skipped.push(key(a)); continue; }
    if (JSON.stringify(ra.config) !== JSON.stringify(rb.config)) { skipped.push(key(a) + ' (config differs)'); continue; }
    for (const metric of METRICS) {
      const x = ra.metrics[metric], y = rb.metrics[metric];
      if (x && y) rows.push({ scenario: key(a), metric, before: x.p50, after: y.p50, before95: x.p95, after95: y.p95 });
    }
    rows.push({ scenario: key(a), metric: 'drawCalls', before: ra.load.drawCalls, after: rb.load.drawCalls });
    rows.push({ scenario: key(a), metric: 'triangles', before: ra.load.triangles, after: rb.load.triangles });
  }
  return { rows, skipped };
}

export function renderTable({ rows, skipped }) {
  const f = n => (n === undefined ? '' : Number(n.toFixed(2)));
  const delta = r => (r.before ? ((r.after - r.before) / r.before * 100).toFixed(1) + '%' : 'n/a');
  return ['| Scenario | Metric | Before (p50) | After (p50) | Delta | Before p95 | After p95 |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(r => `| ${r.scenario} | ${r.metric} | ${f(r.before)} | ${f(r.after)} | ${delta(r)} | ${f(r.before95)} | ${f(r.after95)} |`),
    ...(skipped.length ? ['', 'Skipped (missing, mixed or unequal config): ' + skipped.join(', ')] : [])].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [a, b] = process.argv.slice(2).map(p => JSON.parse(readFileSync(p, 'utf8')));
  if (!a || !b) { console.error('Usage: node scripts/thermal-compare.mjs <before.json> <after.json>'); process.exit(2); }
  console.log(renderTable(compareRuns(a, b)));
}
