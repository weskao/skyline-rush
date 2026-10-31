#!/usr/bin/env node
// Duration-balanced CI shards. Playwright's --shard cuts the test list into equal contiguous slices, so one shard
// that lands on the heavy track-theme/i18n tests set the wall time (48 min against a 25 min mean).
//   node scripts/ci-shards.mjs plan <config> <shard 1-based> <total>  → --test-list file on stdout
//   node scripts/ci-shards.mjs refresh <run-id>                      → rewrites tests/ci-durations.json from a CI run
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DURATIONS = new URL('../tests/ci-durations.json', import.meta.url);

// Longest-first greedy bin packing: every test lands in exactly one shard, ordered deterministically.
export function partition(tests, durations, total) {
  const unique = [...new Set(tests)];
  const known = unique.map((t) => durations[t]).filter((s) => s > 0).sort((a, b) => a - b);
  const fallback = known.length ? known[Math.floor(known.length / 2)] : 1; // a test added since the refresh costs the median
  const cost = (t) => durations[t] ?? fallback;
  const bins = Array.from({ length: total }, () => ({ seconds: 0, tests: [] }));
  for (const t of unique.sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : 1))) {
    const bin = bins.reduce((min, b) => (b.seconds < min.seconds ? b : min));
    bin.seconds += cost(t);
    bin.tests.push(t);
  }
  return bins;
}

// "file › describe › title" relative to testDir, the form --test-list matches.
export function listedTests(report) {
  if (report.errors?.length) throw new Error(`playwright --list failed: ${report.errors[0].message}`);
  const out = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) out.push([spec.file, ...titles, spec.title].join(' › '));
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  };
  for (const file of report.suites) walk(file, []);
  return out;
}

// One line of the CI list reporter: "✓  12 tests/x.spec.js:20:3 › describe › title (23.5s)".
export function parseLog(text) {
  const unit = { ms: 0.001, s: 1, m: 60 };
  const durations = {};
  for (const m of text.matchAll(/[✓✘](?:\x1b\[\d+m)?\s+\d+\s+tests\/(\S+?):\d+:\d+ › (.*) \(([\d.]+)(ms|s|m)\)/g)) {
    const key = `${m[1]} › ${m[2]}`;
    durations[key] = Math.round(((durations[key] ?? 0) + Number(m[3]) * unit[m[4]]) * 10) / 10;
  }
  return durations;
}

const playwrightList = (config, extra = []) => JSON.parse(execFileSync('npx',
  ['playwright', 'test', `--config=${config}`, '--list', '--reporter=json', ...extra],
  { encoding: 'utf8', maxBuffer: 256 << 20 }));

function plan(config, shard, total) {
  const bin = partition(listedTests(playwrightList(config)), JSON.parse(readFileSync(DURATIONS, 'utf8')), total)[shard - 1];
  if (!bin) throw new Error(`shard ${shard} is outside 1..${total}`);
  const text = `${bin.tests.join('\n')}\n`;
  // A title --test-list cannot match (trimmed whitespace, a "›" inside it) would silently never run.
  const file = join(mkdtempSync(join(tmpdir(), 'ci-shard-')), 'list.txt');
  writeFileSync(file, text);
  const matched = listedTests(playwrightList(config, ['--test-list', file])).length;
  if (matched !== bin.tests.length) throw new Error(`test list matched ${matched} of ${bin.tests.length} tests`);
  process.stderr.write(`shard ${shard}/${total}: ${bin.tests.length} tests, ~${Math.round(bin.seconds / 60)} min\n`);
  process.stdout.write(text);
}

function refresh(runId) {
  const durations = parseLog(execFileSync('gh', ['run', 'view', runId, '--log'], { encoding: 'utf8', maxBuffer: 1 << 30 }));
  const sorted = Object.fromEntries(Object.entries(durations).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(DURATIONS, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`${Object.keys(sorted).length} test durations written from run ${runId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'plan' && args.length === 3) plan(args[0], Number(args[1]), Number(args[2]));
  else if (cmd === 'refresh' && args.length === 1) refresh(args[0]);
  else { console.error('usage: ci-shards.mjs plan <config> <shard> <total> | refresh <run-id>'); process.exit(2); }
}
