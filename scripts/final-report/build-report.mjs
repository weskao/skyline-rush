// Aggregates the measured A/B/C runs into docs/performance/final-report/comparison.json (every per-run value kept, plus
// median and min/max) and renders the report charts as SVG from that JSON. Inputs come from:
//   <in>/timing/<label>-r<n>.json    scripts/final-report/run-scene-matrix.mjs, THERMAL_FRAMES=900 (GPU/CPU timing)
//   <in>/counters/<label>-r<n>.json  same harness, all tracks (deterministic load counters)
//   <in>/vfx-<label>.json            scripts/vfx-buffer-bench.mjs --json (particle uploads)
//   <in>/app.json                    scripts/final-report/app-probe.mjs (production build, real app)
//   <in>/course-<label>-r<n>.json    scripts/course-race-bench.mjs (CPU simulation, node)
//   <in>/env.json                    optional {machine, notes, loadAverages} written by hand at run time
//   <out>/visual/visual-fidelity.json scripts/final-report/visual-fidelity.mjs
// Usage: node scripts/final-report/build-report.mjs <in-dir> [out-dir=docs/performance/final-report]
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const inDir = resolve(process.argv[2] ?? ''), outDir = resolve(process.argv[3] ?? 'docs/performance/final-report');
if (!process.argv[2]) throw Error('Usage: build-report.mjs <in-dir> [out-dir]');
const LABELS = ['A', 'B', 'C'];
const BUILDS = { A: { sha: 'd9c144ba39546378cdae32f76ae305fee1f9305f', name: 'base d9c144ba' },
  B: { sha: '32b82da7', name: 'origin/develop 32b82da7' }, C: { sha: '1fcfa98a', name: 'integration 1fcfa98a' } };
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const runFiles = (dir, prefix = '') => existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith(prefix) && /-r\d+\.json$/.test(f)).sort() : [];

export const median = values => {
  const s = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export const stat = runs => {
  const v = runs.filter(Number.isFinite);
  return { runs, n: v.length, median: median(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null };
};
export const change = (from, to) => (Number.isFinite(from) && Number.isFinite(to) && from !== 0 ? (100 * (to - from)) / from : null);
if (median([3, 1, 2]) !== 2 || median([4, 1, 2, 3]) !== 2.5 || change(10, 7) !== -30 || stat([1, NaN]).n !== 1) throw Error('stat self-check failed');

/** {sceneKey: {label: {metric: [values per round]}}} from scene-probe JSON files. */
function sceneRuns(dir, keep = () => true) {
  const out = {};
  for (const file of runFiles(dir)) {
    const label = file.split('-r')[0], json = read(join(dir, file));
    for (const record of json.records) {
      const key = `${record.scenario ?? record.phase}/${record.track ?? record.id}`, report = record.diagnostics?.reports?.[record.diagnostics.current];
      const slot = ((out[key] ??= {})[label] ??= {});
      const push = (name, value) => keep(name) && (slot[name] ??= []).push(value ?? null);
      if (!report) { (slot.error ??= []).push(record.status ?? 'no report'); continue; }
      const m = report.metrics;
      for (const [name, metric] of Object.entries(m)) {
        if (!metric) continue;
        const alias = name === 'pass-3' ? 'output' : name; // A/B OutputPass; C folds tone mapping into lens
        for (const q of ['p50', 'p95', 'p99']) push(`${alias}.${q}`, metric[q]);
        if (['scene', 'bloom', 'lens', 'output', 'gpuFrameMs'].includes(alias)) push(`${alias}.n`, metric.count);
      }
      push('actualFps', report.actualFps);
      push('stalls', report.stalls);
      for (const [name, value] of Object.entries(report.load ?? {})) push(`load.${name}`, value);
      push('passes', Object.keys(m).filter(n => ['scene', 'bloom', 'lens', 'pass-3'].includes(n)).length);
      push('renderSize', `${report.config.width}x${report.config.height} msaa${report.config.msaa}`);
    }
  }
  for (const scene of Object.values(out)) for (const metrics of Object.values(scene))
    for (const [name, runs] of Object.entries(metrics)) if (typeof runs[0] === 'number' || runs[0] === null) metrics[name] = stat(runs);
  return out;
}

function appRuns(path) {
  if (!existsSync(path)) return null;
  const json = read(path), out = {};
  for (const run of json.runs) {
    const slot = (out[run.label] ??= {});
    const push = (name, value) => (slot[name] ??= []).push(value ?? null);
    push('startReadyMs', run.startReadyMs); push('firstDrawMs', run.firstDrawMs);
    for (const phase of ['home', 'racing', 'paused']) for (const [name, value] of Object.entries(run[phase])) push(`${phase}.${name}`, value);
    push('errors', run.errors.length);
  }
  for (const metrics of Object.values(out)) for (const [name, runs] of Object.entries(metrics)) metrics[name] = stat(runs);
  return { environment: json.environment, viewport: json.viewport, windows: json.windows, byBuild: out };
}

function courseRuns(dir) {
  const out = {};
  for (const file of runFiles(dir, 'course-')) {
    const label = file.slice('course-'.length).split('-r')[0], json = read(join(dir, file));
    for (const track of ['coast', 'dune']) for (const name of ['meanUs', 'p95Us', 'heapBytesPerFrame'])
      ((out[label] ??= {})[`${track}.${name}`] ??= []).push(json[track][name]);
  }
  for (const metrics of Object.values(out)) for (const [name, runs] of Object.entries(metrics)) metrics[name] = stat(runs);
  return out;
}

const vfx = Object.fromEntries(LABELS.filter(l => existsSync(join(inDir, `vfx-${l}.json`))).map(l => [l, read(join(inDir, `vfx-${l}.json`))]));
const timing = sceneRuns(join(inDir, 'timing')), counters = sceneRuns(join(inDir, 'counters'), name => /^(load\.|passes|renderSize|error)/.test(name));
const app = appRuns(join(inDir, 'app.json')), course = courseRuns(inDir);
const visualPath = join(outDir, 'visual/visual-fidelity.json'), visual = existsSync(visualPath) ? read(visualPath) : null;
const med = (table, key, label, metric) => table[key]?.[label]?.[metric]?.median ?? null;

// Target progress, C against the original base A (medians of medians across the compared scenes).
const racingKeys = Object.keys(timing).filter(k => k.startsWith('racing/') && med(timing, k, 'A', 'gpuFrameMs.p50') !== null && med(timing, k, 'C', 'gpuFrameMs.p50') !== null);
const sceneChange = (table, keys, metric) => keys.map(k => ({ scene: k, A: med(table, k, 'A', metric), B: med(table, k, 'B', metric), C: med(table, k, 'C', metric),
  changeCvsA: change(med(table, k, 'A', metric), med(table, k, 'C', metric)), changeCvsB: change(med(table, k, 'B', metric), med(table, k, 'C', metric)) }));
const counterKeys = Object.keys(counters).filter(k => LABELS.every(l => med(counters, k, l, 'load.drawCalls') !== null));
const complexKeys = counterKeys.filter(k => !k.startsWith('showcase/')).sort((a, b) => med(counters, b, 'A', 'load.drawCalls') - med(counters, a, 'A', 'load.drawCalls')).slice(0, 6);
const particleRows = Object.keys(vfx.A?.rows ?? {}).map(row => ({ scene: row, A: vfx.A.rows[row].uploadBytesPerFrame, B: vfx.B?.rows[row]?.uploadBytesPerFrame ?? null,
  C: vfx.C?.rows[row]?.uploadBytesPerFrame ?? null, digestsMatch: LABELS.every(l => vfx[l]?.rows[row]?.digest === vfx.A.rows[row].digest),
  changeCvsA: change(vfx.A.rows[row].uploadBytesPerFrame, vfx.C?.rows[row]?.uploadBytesPerFrame) }));
const targets = [
  { id: 'gpu', label: 'GPU frame time p50 (racing)', target: -30, rows: sceneChange(timing, racingKeys, 'gpuFrameMs.p50') },
  { id: 'cpu', label: 'CPU render submission p50 (racing)', target: -25, rows: sceneChange(timing, racingKeys, 'cpuRenderSubmissionMs.p50') },
  { id: 'draws', label: 'Draw calls, six most complex scenes', target: -40, rows: sceneChange(counters, complexKeys, 'load.drawCalls') },
  { id: 'particles', label: 'Particle upload bytes per frame', target: -50, rows: particleRows },
].map(t => ({ ...t, medianChangeCvsA: median(t.rows.map(r => r.changeCvsA)) }));
for (const t of targets) t.met = t.medianChangeCvsA !== null && t.medianChangeCvsA <= t.target;

const env = existsSync(join(inDir, 'env.json')) ? read(join(inDir, 'env.json')) : {};
const comparison = { generatedBy: 'scripts/final-report/build-report.mjs', environment: 'LOCAL-CHROME', builds: BUILDS, ...env,
  method: 'A/B/C interleaved, build order rotated each round; values are per-round medians (runs) with median, min and max across rounds',
  targets, timing, counters, particles: vfx, app, course, visual };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'comparison.json'), JSON.stringify(comparison, null, 1) + '\n');

// ---------- SVG charts (one axis, fixed categorical order A/B/C, legend + direct labels, light/dark) ----------
const STYLE = `<style>
svg{--surface:#ffffff;--ink:#1f2328;--muted:#59636e;--grid:#d1d9e0;--a:#257de0;--b:#f47230;--c:#00b894;--goal:#59636e;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme: dark){svg{--surface:#0d1117;--ink:#e6edf3;--muted:#9198a1;--grid:#3d444d;--a:#338ced;--b:#e76624;--c:#00a888;--goal:#9198a1}}
.bg{fill:var(--surface)}.t{fill:var(--ink);font-size:15px;font-weight:600}.s{fill:var(--muted);font-size:12px}.l{fill:var(--ink);font-size:12px}
.v{fill:var(--muted);font-size:11px}.g{stroke:var(--grid);stroke-width:1}.A{fill:var(--a)}.B{fill:var(--b)}.C{fill:var(--c)}
.r{stroke:var(--ink);stroke-width:1;opacity:.55}.goal{stroke:var(--goal);stroke-width:2;stroke-dasharray:4 3}
</style>`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const niceStep = raw => { const p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const fmt = v => (v === null ? 'n/a' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
const pct = v => (v === null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(0)}%`);
// Round only the data end of a horizontal bar (4px), square at the baseline.
const bar = (x, y, w, h, cls, tip) => {
  const r = Math.min(4, w / 2, h / 2);
  return `<path class="${cls}" d="M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - r}z"><title>${esc(tip)}</title></path>`;
};

/** Grouped horizontal bars; groups = [{name, values:{A,B,C}, ranges:{A:[min,max]}}]. C carries the direct label. */
function groupedBars({ title, subtitle, unit, groups, file }) {
  const W = 760, left = 190, right = 110, barH = 10, gap = 2, groupGap = 16, top = 78;
  const series = LABELS.filter(l => groups.some(g => Number.isFinite(g.values[l])));
  const max = Math.max(...groups.flatMap(g => series.flatMap(l => [g.values[l], g.ranges?.[l]?.[1]]).filter(Number.isFinite)));
  const scale = v => ((W - left - right) * v) / (max * 1.05);
  const groupH = series.length * (barH + gap) - gap;
  const H = top + groups.length * (groupH + groupGap) + 34;
  const step = niceStep(max / 4), ticks = Array.from({ length: Math.floor((max * 1.05) / step) + 1 }, (_, i) => i * step);
  let body = ticks.map(t => `<line class="g" x1="${left + scale(t)}" x2="${left + scale(t)}" y1="${top - 6}" y2="${H - 30}"/><text class="s" x="${left + scale(t)}" y="${H - 14}" text-anchor="middle">${fmt(t)}</text>`).join('');
  groups.forEach((g, gi) => {
    const y0 = top + gi * (groupH + groupGap);
    body += `<text class="l" x="${left - 10}" y="${y0 + groupH / 2 + 4}" text-anchor="end">${esc(g.name)}</text>`;
    series.forEach((l, si) => {
      const v = g.values[l], y = y0 + si * (barH + gap);
      if (!Number.isFinite(v)) { body += `<text class="v" x="${left + 4}" y="${y + barH - 1}">${l}: not measurable</text>`; return; }
      body += bar(left, y, Math.max(1, scale(v)), barH, l, `${BUILDS[l].name} · ${g.name}: ${fmt(v)} ${unit}`);
      const range = g.ranges?.[l];
      if (range && range[1] > range[0]) body += `<line class="r" x1="${left + scale(range[0])}" x2="${left + scale(range[1])}" y1="${y + barH / 2}" y2="${y + barH / 2}"/>`;
      if (l === 'C') body += `<text class="v" x="${left + Math.max(scale(v), range ? scale(range[1]) : 0) + 6}" y="${y + barH - 1}">${fmt(v)} ${unit} ${pct(change(g.values.A, v))}</text>`;
    });
  });
  const legend = series.map((l, i) => `<rect class="${l}" x="${left + i * 190}" y="48" width="12" height="12" rx="2"/><text class="l" x="${left + i * 190 + 18}" y="58">${l} · ${esc(BUILDS[l].name)}</text>`).join('');
  writeFileSync(join(outDir, file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">${STYLE}
<rect class="bg" width="${W}" height="${H}"/><text class="t" x="16" y="24">${esc(title)}</text><text class="s" x="16" y="40">${esc(subtitle)}</text>${legend}${body}</svg>\n`);
}

const timingGroups = (metric, keys) => keys.map(k => ({ name: k.replace('racing/', 'race · ').replace('home/', 'home · ').replace('showcase/', 'showcase · '),
  values: Object.fromEntries(LABELS.map(l => [l, med(timing, k, l, metric)])),
  ranges: Object.fromEntries(LABELS.map(l => [l, [timing[k]?.[l]?.[metric]?.min, timing[k]?.[l]?.[metric]?.max]])) }));
const rounds = Math.max(0, ...Object.values(timing).flatMap(s => Object.values(s).map(m => m['gpuFrameMs.p50']?.n ?? 0)));
const sub = `LOCAL-CHROME 390x844 DPR3 High, seed 12345, 900 frames; median of ${rounds} interleaved rounds, thin line = min-max`;
const sceneOrder = Object.keys(timing).sort((a, b) => a.localeCompare(b));
groupedBars({ title: 'GPU frame time p50 (ms, lower is better)', subtitle: sub, unit: 'ms', groups: timingGroups('gpuFrameMs.p50', sceneOrder), file: 'gpu-frame-p50.svg' });
groupedBars({ title: 'CPU render submission p50 (ms, lower is better)', subtitle: sub, unit: 'ms', groups: timingGroups('cpuRenderSubmissionMs.p50', sceneOrder), file: 'cpu-render-p50.svg' });
groupedBars({ title: 'Draw calls per frame (lower is better)', subtitle: 'Deterministic renderer.info counters, same fixture and seed; six highest-draw scenes on base A',
  unit: '', file: 'draw-calls.svg', groups: complexKeys.map(k => ({ name: k.replace('racing/', 'race · ').replace('home/', 'home · '), values: Object.fromEntries(LABELS.map(l => [l, med(counters, k, l, 'load.drawCalls')])) })) });
groupedBars({ title: 'Particle buffer upload per frame (bytes, lower is better)', subtitle: 'node vfx-buffer-bench, 600 frames, identical simulation digests across builds',
  unit: 'B', file: 'particle-upload.svg', groups: particleRows.map(r => ({ name: r.scene, values: { A: r.A, B: r.B, C: r.C } })) });

// Target progress: one bar per target (C vs A median change), dashed tick at the target.
{
  const W = 760, left = 270, top = 64, rowH = 34, H = top + targets.length * rowH + 40, lo = -100, hi = 40;
  const x = v => left + ((W - left - 70) * (Math.max(lo, Math.min(hi, v)) - lo)) / (hi - lo);
  let body = [-100, -75, -50, -25, 0, 25].map(t => `<line class="g" x1="${x(t)}" x2="${x(t)}" y1="${top - 8}" y2="${H - 30}"/><text class="s" x="${x(t)}" y="${H - 14}" text-anchor="middle">${t}%</text>`).join('');
  targets.forEach((t, i) => {
    const y = top + i * rowH, v = t.medianChangeCvsA;
    body += `<text class="l" x="${left - 10}" y="${y + 12}" text-anchor="end">${esc(t.label)}</text>`;
    if (v === null) { body += `<text class="v" x="${x(0) + 6}" y="${y + 12}">not measured</text>`; return; }
    const x0 = Math.min(x(0), x(v)), w = Math.max(1, Math.abs(x(v) - x(0)));
    body += `<rect class="C" x="${x0}" y="${y}" width="${w}" height="16" rx="3"><title>${esc(t.label)}: ${pct(v)} (target ${t.target}%)</title></rect>`;
    body += `<line class="goal" x1="${x(t.target)}" x2="${x(t.target)}" y1="${y - 4}" y2="${y + 20}"/>`;
    body += `<text class="v" x="${Math.max(x(0), x0 + w) + 6}" y="${y + 12}">${pct(v)} ${t.met ? '(met)' : `(target ${t.target}%)`}</text>`;
  });
  writeFileSync(join(outDir, 'targets.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Target progress">${STYLE}
<rect class="bg" width="${W}" height="${H}"/><text class="t" x="16" y="24">Integration 1fcfa98a vs base d9c144ba: median change against target</text>
<text class="s" x="16" y="42">LOCAL-CHROME; bar = median per-scene change, dashed line = program target; left of the line meets it</text>${body}</svg>\n`);
}
console.log('wrote', join(outDir, 'comparison.json'), 'and SVG charts');
for (const t of targets) console.log(`${t.id}: ${t.medianChangeCvsA?.toFixed(1)}% (target ${t.target}%) ${t.met ? 'MET' : 'not met'} over ${t.rows.length} scenes`);

// ---------- Markdown tables for docs/performance/final-report.md (written next to the inputs, pasted by hand) ----------
const n = (v, d = 2) => (v === null || v === undefined ? 'n/a' : typeof v === 'number' ? v.toFixed(d) : String(v));
const trio = (table, key, metric, d = 2) => LABELS.map(l => n(med(table, key, l, metric), d)).join(' / ');
const spread = (table, key, l, metric, d = 2) => { const s = table[key]?.[l]?.[metric]; return s?.median == null ? 'n/a' : `${n(s.median, d)} (${n(s.min, d)}-${n(s.max, d)})`; };
const md = [];
md.push('### Targets', '', '| Target | Goal | C vs A (median of scenes) | Met | Scenes |', '| --- | --- | --- | --- | --- |',
  ...targets.map(t => `| ${t.label} | ${t.target}% | ${pct(t.medianChangeCvsA)} | ${t.met ? 'yes' : 'no'} | ${t.rows.length} |`), '');
md.push('### GPU and CPU timing (median (min-max) of rounds, ms)', '', '| Scene | Build | GPU frame p50 | GPU frame p95 | GPU p99 | CPU submit p50 | CPU submit p95 | CPU sim p50 | CPU sim p95 | GPU samples |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const k of sceneOrder) for (const l of LABELS) md.push(`| ${l === 'A' ? k : ''} | ${l} | ${spread(timing, k, l, 'gpuFrameMs.p50')} | ${spread(timing, k, l, 'gpuFrameMs.p95')} | ${n(med(timing, k, l, 'gpuFrameMs.p99'))} | ${spread(timing, k, l, 'cpuRenderSubmissionMs.p50')} | ${spread(timing, k, l, 'cpuRenderSubmissionMs.p95')} | ${n(med(timing, k, l, 'cpuSimulationMs.p50'))} | ${n(med(timing, k, l, 'cpuSimulationMs.p95'))} | ${n(med(timing, k, l, 'gpuFrameMs.n'), 0)} |`);
md.push('', '### GPU pass breakdown p50 (ms, A / B / C; output pass exists on A/B only)', '', '| Scene | scene | bloom | lens | output | passes |', '| --- | --- | --- | --- | --- | --- |',
  ...sceneOrder.map(k => `| ${k} | ${trio(timing, k, 'scene.p50')} | ${trio(timing, k, 'bloom.p50')} | ${trio(timing, k, 'lens.p50')} | ${trio(timing, k, 'output.p50')} | ${trio(timing, k, 'passes', 0)} |`), '');
md.push('### Frame interval and FPS (fixture, A / B / C)', '', '| Scene | interval p50 | p95 | p99 | actual FPS | stalls |', '| --- | --- | --- | --- | --- | --- |',
  ...sceneOrder.map(k => `| ${k} | ${trio(timing, k, 'frameIntervalMs.p50', 1)} | ${trio(timing, k, 'frameIntervalMs.p95', 1)} | ${trio(timing, k, 'frameIntervalMs.p99', 1)} | ${trio(timing, k, 'actualFps', 1)} | ${trio(timing, k, 'stalls', 0)} |`), '');
md.push('### Renderer load counters (latest frame, A / B / C)', '', '| Scene | draw calls | triangles | geometries | textures | programs |', '| --- | --- | --- | --- | --- | --- |',
  ...Object.keys(counters).sort().map(k => `| ${k} | ${trio(counters, k, 'load.drawCalls', 0)} | ${trio(counters, k, 'load.triangles', 0)} | ${trio(counters, k, 'load.geometries', 0)} | ${trio(counters, k, 'load.textures', 0)} | ${trio(counters, k, 'load.shaderPrograms', 0)} |`), '');
md.push('### Particle buffer upload (node vfx-buffer-bench, 600 frames)', '', '| Row | bytes/frame A / B / C | C vs A | upload calls/frame A / B / C | CPU ms/frame A / B / C | digests equal |', '| --- | --- | --- | --- | --- | --- |',
  ...particleRows.map(r => `| ${r.scene} | ${[r.A, r.B, r.C].map(v => n(v, 0)).join(' / ')} | ${pct(r.changeCvsA)} | ${LABELS.map(l => n(vfx[l]?.rows[r.scene]?.uploadCallsPerFrame, 1)).join(' / ')} | ${LABELS.map(l => n(vfx[l]?.rows[r.scene]?.cpuMsPerFrame)).join(' / ')} | ${r.digestsMatch ? 'yes' : 'NO'} |`), '');
if (app) {
  const rows = [['startReadyMs', 'Load: Start button enabled (ms)', 0], ['firstDrawMs', 'Load: first WebGL draw (ms)', 0],
    ['home.renderedPerSecond', 'Home: rendered frames/s', 1], ['home.drawsPerRenderedFrame', 'Home: draws/frame', 0], ['home.subBytesPerSecond', 'Home: bufferSubData bytes/s', 0], ['home.mainThreadBusy', 'Home: main-thread busy', 3], ['home.heapUsedMB', 'Home: JS heap MB', 1],
    ['racing.renderedPerSecond', 'Race: rendered frames/s', 1], ['racing.intervalP50', 'Race: rAF interval p50 ms', 1], ['racing.intervalP95', 'Race: rAF interval p95 ms', 1], ['racing.intervalP99', 'Race: rAF interval p99 ms', 1],
    ['racing.longFrames33', 'Race: frames > 33 ms (15 s)', 0], ['racing.longFrames50', 'Race: frames > 50 ms (15 s)', 0], ['racing.drawsPerRenderedFrame', 'Race: draws/frame', 0],
    ['racing.subBytesPerRenderedFrame', 'Race: bufferSubData bytes/frame', 0], ['racing.subBytesPerSecond', 'Race: bufferSubData bytes/s', 0], ['racing.texBytesPerSecond', 'Race: texture upload bytes/s', 0],
    ['racing.mainThreadBusy', 'Race: main-thread busy', 3], ['racing.scriptBusy', 'Race: script busy', 3], ['racing.heapUsedMB', 'Race: JS heap MB', 1], ['racing.heapDeltaMB', 'Race: heap change over 15 s MB', 1],
    ['paused.renderedPerSecond', 'Paused: rendered frames/s (idle render count)', 1], ['paused.mainThreadBusy', 'Paused: main-thread busy', 3], ['paused.scriptBusy', 'Paused: script busy', 3], ['errors', 'Page errors', 0]];
  md.push('### Real app, production build (median (min-max) of rounds)', '', '| Metric | A | B | C |', '| --- | --- | --- | --- |',
    ...rows.map(([m, label, d]) => `| ${label} | ${LABELS.map(l => { const s = app.byBuild[l]?.[m]; return s?.median == null ? 'n/a' : `${n(s.median, d)} (${n(s.min, d)}-${n(s.max, d)})`; }).join(' | ')} |`), '');
}
if (Object.keys(course).length) md.push('### CPU simulation, 8-car race (node course-race-bench, median (min-max) of rounds)', '', '| Metric | A | B | C |', '| --- | --- | --- | --- |',
  ...['coast.meanUs', 'coast.p95Us', 'dune.meanUs', 'dune.p95Us', 'coast.heapBytesPerFrame', 'dune.heapBytesPerFrame'].map(m => `| ${m} | ${LABELS.map(l => { const s = course[l]?.[m]; return s?.median == null ? 'n/a' : `${n(s.median, 1)} (${n(s.min, 1)}-${n(s.max, 1)})`; }).join(' | ')} |`), '');
if (visual) {
  const ab = `${visual.base}vs${visual.candidate}`, cc = `${visual.candidate}vs${visual.candidate}`;
  md.push('### Visual fidelity', '', `| Scene | Canvas | Max channel delta | Pixels > 8 | PSNR dB | ${visual.candidate} repeat max | Evidence |`, '| --- | --- | --- | --- | --- | --- | --- |',
    ...visual.scenes.map(s => s.error ? `| ${s.id} | | ERROR: ${s.error} | | | | |` : `| ${s.id} | ${s.canvas.join('x')} | ${s[ab].maxDelta} | ${s[ab].over8} (${s[ab].over8Pct.toFixed(3)}%) | ${s[ab].psnr === null ? 'identical' : s[ab].psnr.toFixed(1)} | ${s[cc].maxDelta} | \`final-report/visual/${s.webp}\` |`), '');
}
writeFileSync(join(inDir, 'tables.md'), md.join('\n') + '\n');
console.log('wrote', join(inDir, 'tables.md'));
