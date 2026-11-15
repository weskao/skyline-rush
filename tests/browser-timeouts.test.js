import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import config from '../playwright.config.js';
import { ciTimeout, slow } from './helpers/ci.js';

// The main suite (playwright.config.js) plus its shared helpers; the world-tour config tunes its own two specs.
const IGNORED = new Set(['world-tour-mid-race-browser.spec.js', 'world-tour-showcase-browser.spec.js']);
const FILES = [
  ...readdirSync(new URL('.', import.meta.url)).filter(name => name.endsWith('browser.spec.js') && !IGNORED.has(name)),
  ...readdirSync(new URL('./helpers/', import.meta.url)).filter(name => name.endsWith('.js')).map(name => `helpers/${name}`),
];
// A bare number never grows on CI, so it ends up below the scaled default it replaces (45s test, 10s expect, x3).
const LITERAL = [/\.setTimeout\(\s*[\d_]+(?![\d_])\s*\)/, /\b(?:timeout|[a-z]+Timeout):\s*[\d_]+(?![\d_])(?!\s*\*)/];

test('the suite scales its default budgets by the CI factor', () => {
  assert.equal(slow, process.env.CI ? 3 : 1);
  assert.equal(ciTimeout(1000), 1000 * slow);
  assert.equal(config.timeout, ciTimeout(45000));
  assert.equal(config.expect.timeout, ciTimeout(10000));
});

test('a worktree can select its own browser preview port', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import config from './playwright.config.js'; console.log(JSON.stringify({ url: config.use.baseURL, server: config.webServer.url, command: config.webServer.command, reuse: config.webServer.reuseExistingServer }));"],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, PLAYWRIGHT_PORT: '5198' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const { url, server, command, reuse } = JSON.parse(result.stdout);
  assert.equal(url, 'http://127.0.0.1:5198');
  assert.equal(server, url);
  assert.match(command, /--port 5198 --strictPort/);
  assert.equal(reuse, false);
});

test('browser preview port rejects shell text', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import './playwright.config.js';"],
    { cwd: new URL('..', import.meta.url), env: { ...process.env, PLAYWRIGHT_PORT: '5198; exit 0' }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid Playwright port/);
});

test('World Tour uses the worktree port for both its fixture server and browser', () => {
  for (const port of ['5198', undefined]) {
    const env = { ...process.env };
    if (port) env.PLAYWRIGHT_PORT = port; else delete env.PLAYWRIGHT_PORT;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import config from './playwright.world-tour.config.js'; console.log(JSON.stringify(config));"],
      { cwd: new URL('..', import.meta.url), env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout), url = 'http://127.0.0.1:' + (port ?? '5183');
    assert.equal(config.use.baseURL, url);
    assert.equal(config.webServer.url, url + '/tests/fixtures/world-tour-mid-race.html');
    assert.ok(config.webServer.command.includes('--port ' + (port ?? '5183') + ' --strictPort'));
  }
});

test('World Tour rejects invalid worktree ports before creating a server command', () => {
  for (const port of ['5198; exit 0', '0', '65536']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import './playwright.world-tour.config.js';"],
      { cwd: new URL('..', import.meta.url), env: { ...process.env, PLAYWRIGHT_PORT: port }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid Playwright port/);
  }
});

// The gate blocks every home-screen push: 2 local workers ran it in 100 s against 187-194 s on one. 4 workers ran 73-135 s but
// timed out 4 tests in 2 of 5 runs while other sessions held the machine at a load above 150 (2026-11-14).
test('the pre-push layout gate runs both Playwright halves on 2 workers', () => {
  const script = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts['test:layout'];
  const runs = script.split('&&').filter(part => part.includes('playwright test'));
  assert.equal(runs.length, 2);
  for (const run of runs) assert.match(run, /--workers=2\b/, run.trim());
});

test('the pre-push layout gate runs on a free port, not the default one a stray server may hold', async () => {
  const hook = readFileSync(new URL('../.githooks/pre-push', import.meta.url), 'utf8');
  const pick = hook.match(/^PLAYWRIGHT_PORT=\$\((.+)\)$/m);
  assert.ok(pick, 'pre-push must assign PLAYWRIGHT_PORT');
  assert.match(hook, /^export PLAYWRIGHT_PORT$/m);
  assert.ok(hook.indexOf('export PLAYWRIGHT_PORT') < hook.indexOf('npm run test:layout >&2'), 'export before the gate runs');
  const held = net.createServer();
  await new Promise(resolve => held.listen(5178, '127.0.0.1', resolve).on('error', resolve));
  try {
    const port = spawnSync('sh', ['-c', pick[1]], { encoding: 'utf8' }).stdout.trim();
    assert.match(port, /^\d{1,5}$/);
    assert.notEqual(port, '5178');
  } finally { held.close(); }
});

test('browser specs never set a wall-clock budget that skips the CI factor', () => {
  // A budget that must stay fixed (it races a real animation) says so on the line above: "fixed budget: never scaled".
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i, lines) => LITERAL.some(pattern => pattern.test(line)) && !lines[i - 1]?.includes('fixed budget: never scaled')
      ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Wrap per-test and per-assertion timeouts in ciTimeout() from tests/helpers/ci.js');
});

// A UI action resolves once its events are dispatched, not once the race rebuilds or the frame repaints, so a one-shot
// read on the next line races a slow CI runner (bonus-gates read race.rings after .check() and failed 1 run in 8).
const UI_ACTION = /^\s*await [^;]*\.(?:click|check|uncheck|selectOption|press|tap|fill|setChecked|dispatchEvent)\(/;
const ONE_SHOT_READ = /^\s*expect\(await [^;]*\.evaluate\(/;

test('browser specs poll page state after a UI action instead of reading it once', () => {
  // A read that is settled by the action itself says why on its own line: "// settled: <reason>".
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i, lines) => ONE_SHOT_READ.test(line) && UI_ACTION.test(lines[i - 1] ?? '') && !line.includes('// settled:')
      ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Use await expect.poll(() => page.evaluate(...)) (see .claude/rules/browser-test-stability.md)');
});

test('CI retries a failed browser test once and still reports it; local runs never retry', () => {
  for (const ci of ['1', undefined]) {
    const env = { ...process.env };
    if (ci) env.CI = ci; else delete env.CI;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import config from './playwright.config.js'; console.log(JSON.stringify({ retries: config.retries, reporter: config.reporter }));"],
    { cwd: new URL('..', import.meta.url), env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const { retries, reporter } = JSON.parse(result.stdout);
    assert.equal(retries, ci ? 1 : 0);
    // The github reporter annotates a test that passed only on retry, so a flake stays visible on a green run; the
    // budget reporter does the same for a test that used more than half its timeout.
    if (ci) assert.deepEqual(reporter, [['list'], ['github'], ['./tests/helpers/budget-reporter.js']]); else assert.equal(reporter, 'list');
  }
});

test('the budget reporter flags a test past half its own timeout, by file, line and title', async () => {
  const { default: BudgetReporter, nearBudget } = await import('./helpers/budget-reporter.js');
  const spec = (timeout, line = 49) => ({ timeout, location: { file: `${process.cwd()}/tests/ring-sfx-browser.spec.js`, line },
    titlePath: () => ['', '', 'ring-sfx-browser.spec.js', 'ring collect sounds desktop', 'train'] });
  assert.equal(nearBudget(spec(135000), { duration: 67500 }), false);
  assert.equal(nearBudget(spec(135000), { duration: 90000 }), true);
  assert.equal(nearBudget(spec(0), { duration: 90000 }), false, 'test.setTimeout(0) disables the budget');
  const reporter = new BudgetReporter(), lines = [], log = console.log;
  console.log = line => lines.push(line);
  try {
    reporter.onTestEnd(spec(135000), { duration: 55000, status: 'passed' });
    reporter.onTestEnd(spec(135000), { duration: 90000, status: 'passed' });
  } finally { console.log = log; }
  assert.deepEqual(lines, ['::warning file=tests/ring-sfx-browser.spec.js,line=49,title=Near its test timeout::' +
    'ring collect sounds desktop › train: 90.0 s of 135 s (67%), passed']);
});

// ring-sfx waited for a ring with `for (i < 200 && !ring.hit) await wait(10)`: on a CPU-only runner each sleep lasts a
// whole ~300 ms frame, so one ring a rival had taken burned 60 s and the test hit its 135 s budget (CI 42489399352).
// Wait on game state per frame (`await new Promise(requestAnimationFrame)`) until it decides, bounded by race time.
const COUNTED_SLEEP = /for \(let (\w+) = 0; \1 < \d+ && [^;]+; \1\+\+\) await (?:wait|sleep|new Promise\(\w+ => setTimeout)\(/;

test('browser specs never poll game state with a counted wall-clock sleep', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i) => COUNTED_SLEEP.test(line) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Poll per frame until the game decides, bounded by race.elapsed (see .claude/rules/browser-test-stability.md)');
});

// A shim that stalled every requestAnimationFrame callback charged the results credit roll's second rAF loop too:
// 17 slow frames cost 39 x 300 ms, past the 10 s expect (result-actions slow-frame test, 2026-11-15).
test('a slow-frame shim stalls each frame once, not each animation-frame callback', () => {
  const offenders = FILES.flatMap(file => [...readFileSync(new URL(file, import.meta.url), 'utf8')
    .matchAll(/window\.requestAnimationFrame\s*=[\s\S]{0,300}?while\s*\(performance\.now\(\)/g)]
    .filter(([shim]) => !shim.includes('stalledFrame')).map(([shim]) => `tests/${file}: ${shim.split('\n')[0].trim()}`));
  assert.deepEqual(offenders, [], 'Stall only when the frame timestamp changes (stalledFrame); see .claude/rules/browser-test-stability.md');
});

// Overlays enter with a transform; a rect read mid-entry is shifted and can be off by a float32 ULP: the Garage car picker
// thumbnail measured 144.00001526 px in 1 of 30 runs, the paused Race again button 43.99998474 px (2026-11-15).
// After opening the Garage, pause, results or history, a spec settles the overlay (settled()/openGarage()) before measuring.
const OVERLAY_OPENER = /#garage-button'\)\.(?:click|tap)\(|#pause-button'\)\.(?:click|tap)\(|data-open-history[^;]*\.(?:click|tap)\(|#race-overlay'\)\)\.toBeVisible\(/;
const OVERLAY_SETTLE = /\b(?:settled|openGarage)\(/;
const RECT_READ = /getBoundingClientRect|\.boundingBox\(\)/;

test('overlay geometry is measured after the entry animation settles', () => {
  const offenders = FILES.flatMap(file => {
    let opened = 0;
    return readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').flatMap((line, i) => {
      if (/\btest\(['`]/.test(line)) opened = 0;
      if (OVERLAY_SETTLE.test(line)) opened = 0;
      else if (OVERLAY_OPENER.test(line)) opened = i + 1;
      return opened && RECT_READ.test(line) ? [`tests/${file}:${i + 1} (overlay opened on line ${opened})`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'await settled(<overlay locator>) or openGarage() from tests/helpers/test.js before measuring');
});

// The keyboard full-practice tests ran on the 135 s default while their touch twins had 720 s; a passing CI run took
// 1.7 min, so slower runners timed out mid-lesson (develop, 2026-11-07). The shared flow helper owns the budget.
test('every full practice run declares the full-practice budget', () => {
  const spec = readFileSync(new URL('./interactive-tutorial-browser.spec.js', import.meta.url), 'utf8');
  assert.match(spec, /const FULL_PRACTICE_BUDGET = ciTimeout\(\d+\)/);
  assert.match(spec, /const keyboardToNitro = async page => \{\n\s*test\.setTimeout\(FULL_PRACTICE_BUDGET\);/);
  assert.match(spec, /real touch controls finish practice[\s\S]{0,400}test\.setTimeout\(FULL_PRACTICE_BUDGET\)/);
});

test('a ?look=3d spec gives its countdown an explicit CI budget', () => {
  // CPU-only CI draws a ?look=3d High frame in ~0.5 s and the 3 s countdown needs ~70 frames (each clamped to 0.05 s),
  // so GO came after the 30 s default expect on develop (CI 42525271964, 42538999660).
  const offenders = FILES.filter(file => file.endsWith('.spec.js')).flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return source.includes("gameplaySearch: '?look=3d'") ? source.split('\n').flatMap((line, i) =>
      line.includes("toHaveText('RACING')") ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []) : [];
  });
  assert.deepEqual(offenders, [], "Pass { timeout: ciTimeout(30000) } to the RACING wait (.claude/rules/browser-test-stability.md)");
});

// A spec that spawns its own server on a fixed default port collides with PLAYWRIGHT_PORT: Vite --strictPort exited on
// EADDRINUSE and the readiness poll accepted the preview server already there, which has no diag relay (404, no beat).
test('a spec that spawns a server takes a free port and fails loudly when the server exits', () => {
  const offenders = FILES.flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    if (!/\bspawn\([^)]*vite/.test(source)) return [];
    return [
      ...(/process\.env\.\w+\s*\|\|\s*\d{4,5}\b/.test(source) ? [`tests/${file}: defaults its server port to a fixed number`] : []),
      ...(!/\.exitCode\b/.test(source) ? [`tests/${file}: readiness never checks whether the spawned server exited`] : []),
    ];
  });
  assert.deepEqual(offenders, [], 'Listen on port 0 for a free port and throw if server.exitCode !== null (diag-relay-browser.spec.js)');
});

// "Something changed" passed on the live loop's own HUD tick, then a one-shot read asserted all eight minimap markers had
// moved before the stepped frames were drawn (volcanic-crown, 2 in 3 runs). Poll the asserted condition itself.
test('browser specs poll the condition they assert, not a weaker change that a one-shot read then judges', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i, lines) => /await expect\.poll\(.*\)\.not\.toEqual\(/.test(line) && /=\s*await page\.evaluate\(/.test(lines[i + 1] ?? '')
      ? [`tests/${file}:${i + 2}: ${lines[i + 1].trim()}`] : []));
  assert.deepEqual(offenders, [], 'Put the final assertion inside expect.poll (.claude/rules/browser-test-stability.md)');
});

// In-race cues share confirmation pitches (a cell pickup starts at 880 Hz); a slow runner left the race driving long enough
// to collect pickups, so "the result chime played once" counted 4 (audio-feedback, 1 in 6 runs at 6 workers).
test('a spec counting Web Audio notes by pitch leaves out notes scheduled during the race', () => {
  const offenders = FILES.filter(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return source.includes('OscillatorNode.prototype.start') && /\.filter\(note => note === /.test(source) && !/\['countdown', 'racing'\]\.includes\(document\.body\.dataset\.phase\)/.test(source);
  }).map(file => `tests/${file}`);
  assert.deepEqual(offenders, [], "Skip notes while data-phase is 'countdown' or 'racing' (audio-feedback-browser.spec.js)");
});
