// Interleaved A/B/C runs of scripts/thermal-baseline.mjs across several checkouts (each prepared with overlay-probe.mjs
// when it predates ?perf=deep). Rotates the build order every round (ABC, BCA, CAB) so no build always runs first.
// Usage: node scripts/final-report/run-scene-matrix.mjs <out-dir> <rounds> <label=dir>... [-- track ...]
//   THERMAL_FRAMES / THERMAL_VIEWPORT / THERMAL_DPR pass through. PARALLEL=1 runs the builds of a round concurrently
//   (counters only; never use PARALLEL timings).
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2), split = argv.indexOf('--');
const [out, roundsArg, ...pairs] = split < 0 ? argv : argv.slice(0, split);
const tracks = split < 0 ? [] : argv.slice(split + 1);
const builds = pairs.map(p => { const [label, dir] = p.split('='); return { label, dir: resolve(dir) }; });
if (!out || !(+roundsArg > 0) || builds.length < 2) throw Error('Usage: run-scene-matrix.mjs <out> <rounds> A=dir B=dir ... [-- tracks]');
mkdirSync(out, { recursive: true });

const newest = dir => readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
function run({ label, dir }, round) {
  return new Promise((done, fail) => {
    const started = Date.now();
    const child = spawn('node', ['scripts/thermal-baseline.mjs', ...tracks], { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', d => process.stdout.write(`[${label} r${round}] ${d}`));
    child.on('exit', code => {
      const file = newest(join(dir, 'docs/performance/local'));
      if (!file || statSync(file).mtimeMs < started) return fail(Error(`${label} r${round}: no output (exit ${code})`));
      copyFileSync(file, join(out, `${label}-r${round}.json`));
      console.log(`[${label} r${round}] exit ${code} -> ${label}-r${round}.json`);
      done();
    });
  });
}
for (let round = 1; round <= +roundsArg; round++) {
  const order = builds.map((_, i) => builds[(i + round - 1) % builds.length]);
  if (process.env.PARALLEL === '1') await Promise.all(order.map(b => run(b, round)));
  else for (const build of order) await run(build, round);
}
