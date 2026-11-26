// Measurement-only overlay for an OLD temporary checkout (e.g. base d9c144ba or develop) that predates the opt-in
// `?perf=deep` diagnostics. Copies this tree's diagnostics, fixtures and bench scripts into <dir> and wires
// createDeepPerf into <dir>/src/world.js exactly as Wave 0 (fe75f5fe) did. Graphics, passes and simulation are untouched.
// Never run it on a branch you commit from. Usage: node scripts/final-report/overlay-probe.mjs <checkout-dir>
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '../..'), dir = resolve(process.argv[2] ?? '');
if (!process.argv[2] || dir === here) throw Error('Usage: overlay-probe.mjs <other checkout>');
for (const file of ['src/deep-perf.ts', 'src/gpu-timer.ts', 'tests/fixtures/thermal-baseline.html',
  'tests/fixtures/thermal-scenarios.js', 'tests/fixtures/showcase-probe-draw.js', 'tests/helpers/gpu-upload-shadow.js',
  'scripts/thermal-baseline.mjs', 'scripts/thermal-report.mjs', 'scripts/course-race-bench.mjs',
  'scripts/vfx-buffer-bench.mjs', 'scripts/final-report/visual-fidelity.html']) {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  copyFileSync(join(here, file), join(dir, file));
}
const path = join(dir, 'src/world.js');
let src = readFileSync(path, 'utf8');
if (src.includes('createDeepPerf')) { console.log('already wired:', path); process.exit(0); }
const edits = [
  [/^import /m, "import { createDeepPerf } from './deep-perf.ts';\nimport "],
  ['composer.addPass(new OutputPass());', 'composer.addPass(new OutputPass());\n  const deepPerf = createDeepPerf(location.search, renderer, composer, () => visual.quality);'],
  [/(function drawFrame\([^)]*\) \{\n[^\n]*\n\s*)composer\.render\(dt\);/, '$1if (deepPerf && !snapshot) deepPerf.draw(dt); else composer.render(dt);'],
  ['return {\n    resize: sizing.resize', 'return {\n    deepPerf,\n    resize: sizing.resize'],
  ['composer.passes.forEach(pass => pass.dispose());', 'deepPerf?.dispose(); composer.passes.forEach(pass => pass.dispose());'],
];
for (const [from, to] of edits) {
  const next = src.replace(from, to);
  if (next === src) throw Error('overlay anchor not found: ' + from);
  src = next;
}
writeFileSync(path, src);
console.log('wired deep-perf probe into', path);
