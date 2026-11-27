import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
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
  const pick = hook.match(/^PLAYWRIGHT_PORT=\$\((.+)\)(?: \|\| exit 1)?$/m);
  assert.ok(pick, 'pre-push must assign PLAYWRIGHT_PORT');
  assert.match(hook, /^export PLAYWRIGHT_PORT$/m);
  assert.ok(hook.indexOf('export PLAYWRIGHT_PORT') < hook.indexOf('pnpm run test:layout >&2'), 'export before the gate runs');
  const held = net.createServer();
  await new Promise(resolve => held.listen(5178, '127.0.0.1', resolve).on('error', resolve));
  try {
    const port = spawnSync('sh', ['-c', pick[1]], { encoding: 'utf8' }).stdout.trim();
    assert.match(port, /^\d{1,5}$/);
    assert.notEqual(port, '5178');
  } finally { held.close(); }
});

test('make verify bypasses a busy default port and honors an override for both browser stages', async () => {
  const bin = mkdtempSync(join(tmpdir(), 'verify-port-'));
  const held = net.createServer();
  try {
    await new Promise((resolve, reject) => {
      held.once('error', error => error.code === 'EADDRINUSE' ? resolve() : reject(error));
      held.listen(5178, '127.0.0.1', resolve);
    });
    writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\nprintf "%s|%s\\n" "$*" "$PLAYWRIGHT_PORT"\n', { mode: 0o755 });
    
    for (const override of [undefined, '5198']) {
      const env = { ...process.env, PATH: bin + delimiter + process.env.PATH };
      if (override) env.PLAYWRIGHT_PORT = override;
      else delete env.PLAYWRIGHT_PORT;
      const result = spawnSync('make', ['-o', 'node_modules', 'verify'], {
        cwd: new URL('..', import.meta.url), env, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const port = result.stdout.match(/^run test:browser\|(\d{1,5})$/m)?.[1];
      assert.ok(port && Number(port) > 0 && Number(port) <= 65535, 'browser tests need a valid port');
      assert.ok(result.stdout.split('\n').includes(`exec playwright test --config=playwright.world-tour.config.js|${port}`));
      if (override) assert.equal(port, override);
      else assert.notEqual(port, '5178');
    }
  } finally {
    held.close();
    rmSync(bin, { recursive: true, force: true });
  }
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

// index.html boots src/startup-entry.ts, which imports main.js dynamically: 'domcontentloaded' fires before Home is
// rendered, so a short first wait races the bundle load (lobby summaries: 8 DRIVERS empty at 2.5 s, 1 run in 3).
test('the first wait after a page load keeps the default expect budget', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/\bpage\.goto\(/.test(line)) return [];
      const j = lines.findIndex((next, k) => k > i && k <= i + 4 && /\bexpect\(/.test(next));
      const ms = Number(lines[j]?.match(/timeout: ciTimeout\(([\d_]+)\)/)?.[1].replaceAll('_', ''));
      return j > 0 && ms < config.expect.timeout / slow ? [`tests/${file}:${j + 1}: ${lines[j].trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Drop the short timeout: Home renders after the dynamic main.js import (.claude/rules/browser-test-stability.md)');
});

test('a key press after a page load waits for the game to listen', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/\bpage\.goto\(/.test(line)) return [];
      // Blank lines, comments, the font wait, a fixed sleep and an isVisible() check (which answers at once) do not wait
      // for main.js: bootAirflowRace slept 700 ms, dismissed no music prompt and lost its `v` (toggle-feedback, 2026-11-20).
      let j = i + 1;
      while (j < lines.length && /^\s*(\/\/.*)?$|document\.fonts\.ready|waitForTimeout\(|\.isVisible\(\)/.test(lines[j])) j++;
      return /^\s*await page\.keyboard\./.test(lines[j] ?? '') ? [`tests/${file}:${j + 1}: ${lines[j].trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Load with gotoHome(page): main.js attaches the key listener after page.goto resolves (.claude/rules/browser-test-stability.md)');
});

// Same race, other shapes (develop CI 44674764907): a dispatched contextmenu found no listener yet, and
// `if (!await coins.isVisible())` saw no Home and tapped the wallet summary portrait hides, until the timeout.
test('a gesture or an absence branch after a page load waits for Home', () => {
  // Lines that neither wait for main.js nor act: blanks, comments, declarations, absence/CSS checks, loop heads.
  const INERT = /^\s*(\/\/.*)?$|^(?!.*\bawait\b)|toBeHidden\(|toHaveCSS\(|^\s*for \(/;
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/\bpage\.goto\(/.test(line)) return [];
      let j = i + 1;
      while (j < lines.length && INERT.test(lines[j]) && !/^\s*\}\);/.test(lines[j])) j++;
      return /!\s*await [^;]*\.isVisible\(\)|dispatchEvent\(/.test(lines[j] ?? '') ? [`tests/${file}:${j + 1}: ${lines[j].trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Load with gotoHome(page): isVisible() does not wait and main.js listens after page.goto resolves (.claude/rules/browser-test-stability.md)');
});

// `start()` (src/main.js) awaits the stale-pack check before it saves the recent Custom setup, so a reload straight after the
// START click drops the write (race-modes-browser "completed Custom setup", 4 of 5 runs failed on a loaded machine, 2026-11-23).
test('a spec never reloads straight after the START click, before the state it saves is written', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/#start-button'\)\.click\(\)/.test(line)) return [];
      let j = i + 1;
      while (j < lines.length && /^\s*(\/\/.*)?$/.test(lines[j])) j++;
      return /\bpage\.reload\(/.test(lines[j] ?? '') ? [`tests/${file}:${j + 1}: ${lines[j].trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Poll the saved localStorage key between the START click and the reload (.claude/rules/browser-test-stability.md)');
});

// A tap after a raw page.goto lands before main.js attaches its input and diag listeners (diag-relay probe, develop CI 44946255115:
// the 4.5 s probe poll starved on a cold Vite load). Between the goto and the tap the spec must call waitForHome.
test('a touch tap after a raw page load waits for Home', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/\btouchscreen\.tap\(/.test(line)) return [];
      const from = lines.slice(0, i).findLastIndex(prev => /\bpage\.goto\(|\bgotoHome\(|\bwaitForHome\(/.test(prev));
      return from >= 0 && /\bpage\.goto\(/.test(lines[from]) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Call waitForHome(page) after page.goto and before tapping (.claude/rules/browser-test-stability.md)');
});

// The wallet card (src/Wave3CurrencyStrip.vue) closes on any scroll. A click Playwright scrolls into view first lands its
// scroll event a frame late under load and closes the card it just opened (756x265, develop CI 44946255115, 4/4 locally).
test('a spec clicks a wallet currency only after scrolling it into view and a frame', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => /data-currency=[^)]*\)\.click\(\)/.test(line) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []);
  });
  assert.deepEqual(offenders, [], 'Hold the locator, scrollIntoViewIfNeeded(), wait two animation frames, then click (.claude/rules/browser-test-stability.md)');
});

// A spec that samples the 3-2-1 in the page already records it per frame; polling the live phase for 'countdown' as well
// misses it when a starved page spends the whole countdown inside click() (develop CI 44946255115: Received "racing" for 30 s).
test('a spec that samples the countdown in the page does not also poll the live countdown phase', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    if (!lines.some(line => line.includes('__countdownFrames'))) return [];
    return lines.flatMap((line, i) => /toHaveAttribute\('data-phase', 'countdown'/.test(line) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []);
  });
  assert.deepEqual(offenders, [], 'Read window.__countdownFrames after the race starts instead (.claude/rules/browser-test-stability.md)');
});

// The starting grid holds on its loading step until the car, scenery and pickups arrive, and their programs compile
// before GO: a shader-count baseline read before RACING counts that warmup as a mid-race compile (item-feedback shield
// flash read 4 programs, then 89; CI 45871870230).
const PROGRAM_BASELINE = /const\s+\w+\s*=\s*await\s+(?:programs\(page\)|page\.evaluate\(\(\)\s*=>\s*window\.gameScene\.renderer\.info\.programs\.length\))/;
test('a shader-count baseline taken after START waits for the race to run', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!PROGRAM_BASELINE.test(line)) return [];
      const start = lines.slice(0, i).findLastIndex(previous => /#start-button['"]\)\.click\(\)/.test(previous));
      return start >= 0 && !lines.slice(start, i).some(between => /racing|RACING/.test(between)) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Wait for data-phase racing (or #race-status RACING) before the baseline (.claude/rules/browser-test-stability.md)');
});

// One test per map: a sweep of every track inside one test grows with each new course and hit the 180 s CI timeout
// (Garage camera sweep: 2.3 m, 2.8 m, 3.1 m on software WebGL; develop runs 44925139371, 44946255115).
test('a showcase camera spec loops over the tracks outside its tests', () => {
  const offenders = FILES.filter(file => file.startsWith('showcase-camera')).flatMap(file =>
    readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').flatMap((line, i, lines) =>
      // A sweep that sets its own budget with test.setTimeout within the four lines above is deliberate.
      /^\s+for \(const id of (?:CAMERA_)?TRACKS\)/.test(line) && !lines.slice(Math.max(0, i - 4), i).some(prev => prev.includes('test.setTimeout('))
        ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Declare one test per track: for (const id of TRACKS) test(...) (.claude/rules/browser-test-stability.md)');
});

// `data-phase="ready"` precedes the first painted frame; until then #world is visibility:hidden and a press or hit-test lands on #app.
test('a spec that drags the Home preview waits for the painted world frame', () => {
  const offenders = FILES.filter(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return /#track-swipe/.test(source) && /\bmouse\.down\(\)|elementFromPoint/.test(source) && !/\bwaitForWorldFrame\(/.test(source);
  });
  assert.deepEqual(offenders, [], 'Call waitForWorldFrame(page) before pressing the preview: #world is hidden until its first frame (.claude/rules/browser-test-stability.md)');
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
// An incoming-debuff card enters the same way (player-hit-in): its 40 px artwork measured 39.99996948 px (2026-11-22).
// The track chooser too (chooser-in, scale .98): a 44 px pack action measured 43.35 px and the 320x568 footer ran 5.7 px
// past the viewport (track-pack, 2026-11-23). Closing it with #track-choose-close ends the window as settling does.
const OVERLAY_OPENER = /#garage-button'\)\.(?:click|tap)\(|#pause-button'\)\.(?:click|tap)\(|data-open-history[^;]*\.(?:click|tap)\(|#race-overlay'\)\)\.toBeVisible\(|\bhit\('(?:freeze|emp)'|#lobby-tracks-toggle'\)\.(?:click|tap)\(/;
const OVERLAY_SETTLE = /\b(?:settled|openGarage)\(|#track-choose-close'\)\.(?:click|tap)\(/;
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

test('detailed Coast and Neon specs give the countdown an explicit CI budget', () => {
  // CPU-only CI draws a detailed Coast or Neon frame in ~0.5 s and the 3 s countdown needs ~70 frames (each clamped to 0.05 s),
  // so GO came after the 30 s default expect on develop (CI 42525271964, 42538999660).
  const offenders = ['coast-scenery', 'neon-look', 'shader-warmup', 'black-frame'].flatMap(name => {
    const file = `tests/${name}-browser.spec.js`;
    return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').flatMap((line, i) =>
      line.includes("toHaveText('RACING')") ? [`${file}:${i + 1}: ${line.trim()}`] : []);
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

// Trap (2026-11-17): the gameplayPage fixture has already loaded the game once (no saved car, so the Roadster) and
// that page keeps fetching lazily. A spec that started counting requests and then navigated again also counted the
// old page's late roadster2.glb (crimson-gt-browser: five tests red). watchRequests leaves that page first.
// The preview serves dist/, so a page-side import('/src/…') there fails with "Failed to fetch dynamically imported module"
// (wave3-early-access foldable test, CI 44674764907). Only gameplay-browser.js's Vite dev server serves /src.
test('a test that imports /src in the page runs on the gameplay dev server', () => {
  const ignored = new Set(config.testIgnore.map(glob => glob.replace('**/', '')));
  const offenders = FILES.filter(file => file.endsWith('browser.spec.js') && !ignored.has(file)).flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const names = from => [...source.matchAll(new RegExp(`import \\{([^}]*)\\} from '\\./helpers/${from}'`, 'g'))]
      .flatMap(([, list]) => list.split(',').map(name => name.trim().match(/^test(?: as (\w+))?$/)).filter(Boolean)
        .map(([, alias]) => alias ?? 'test'));
    const dev = new Set(names('gameplay-browser\\.js')), all = [...dev, ...names('test\\.js')];
    let current = null;
    return source.split('\n').flatMap((line, i) => {
      const block = line.match(/^\s*(\w+)(?:\.\w+)?\(/)?.[1];
      if (all.includes(block)) current = block;
      const devServer = current ? dev.has(current) : dev.size > 0;
      return line.includes("import('/src/") && !devServer ? [`tests/${file}:${i + 1}`] : [];
    });
  });
  assert.deepEqual(offenders, [], "Run it with `test` from tests/helpers/gameplay-browser.js and load gameplayURL or gameplayPage");
});

test('a spec counting requests on the gameplay page leaves the fixture page first (watchRequests)', () => {
  const offenders = FILES.filter(file => file !== 'helpers/gameplay-browser.js').filter(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return source.includes('gameplayPage') && /\.on\(\s*['"]request['"]/.test(source);
  });
  assert.deepEqual(offenders, [], 'Count requests with watchRequests(page, pattern) from tests/helpers/gameplay-browser.js (see .claude/rules/browser-test-stability.md)');
});

// Two live renderers starve a CPU-only runner: crimson-gt's second raw page never booted while the fixture page kept
// drawing the GT, even at Low and the CI canvas size (develop 44691631919, 44716140443).
test('a test on the gameplay page never opens a second browser page beside it', () => {
  const offenders = FILES.filter(file => file.endsWith('browser.spec.js')).flatMap(file =>
    readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').flatMap((line, i) =>
      /async \(\{[^}]*\bgameplayPage\b[^}]*\}/.test(line) && /async \(\{[^}]*\bbrowser\b[^}]*\}/.test(line) ? [`tests/${file}:${i + 1}`] : []));
  assert.deepEqual(offenders, [], 'Split the second page into its own test, or open each page in turn and close it (see .claude/rules/browser-test-stability.md)');
});

// Previewing a drift trail opens GarageDriftPreview, a second live WebGL renderer: one test clicking the whole catalog
// with motion on outgrew its 360 s CI budget (crimson-gt, CI 44736477255).
test('a sweep of the whole Garage skin catalog runs one category per test, with reduced motion or a stated reason', () => {
  const offenders = FILES.flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    if (/reducedMotion: 'reduce'/.test(source)) return [];
    return source.split('\n').flatMap((line, i) => /of GARAGE_SKINS\)/.test(line) && !/\/\/ motion: \S/.test(line) ? [`tests/${file}:${i + 1}`] : []);
  });
  assert.deepEqual(offenders, [], "Split the sweep per SKIN_CATEGORIES and emulate reducedMotion: 'reduce', or end the loop line with // motion: <why it must animate> (see .claude/rules/browser-test-stability.md)");
});

// Specs start at Low (tests/helpers/test.js), which turns off the Garage GIF artwork (GarageArtworkImage.vue vfxAllowed),
// the mini-boost streaks and the full pickup collect effect. Six specs asserted them and failed on CI run 44012297806.
const LOW_GATED = /garage-animated\/|data-animation-active', ?(?:'true'|String\()|'Mini boost streaks'|'Pickup collect VFX'/;
const TIER_CHOSEN = /lowGraphics: false|skyline-rush-vfx/;

test('a spec that observes an effect Low turns off chooses a heavier tier', () => {
  const offenders = FILES.filter(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    // An isolated-fixture spec on plain @playwright/test never gets the Low default of tests/helpers/test.js.
    return LOW_GATED.test(source) && !TIER_CHOSEN.test(source) && /helpers\/test\.js/.test(source);
  });
  assert.deepEqual(offenders, [], 'Set test.use({ lowGraphics: false }) around those tests (see .claude/rules/browser-test-stability.md)');
});

// A landing is up to 2.6 s of game time; a CPU renderer plays 0.05 s of it per ~1 s frame, so a 45 s wall-clock
// poll ran out with the car at 1.09 m (hero-roadster-race, CI 44025345247). `landed()` waits per frame, by race time.
test('a spec that polls the car back to altitude 0 waits out the fall in game time first (landed)', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i, lines) => /altitude.*\)\.toBe\(0\)/.test(line) && !/^\s*await landed\(page\);/.test(lines[i - 1] ?? '')
      ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Call `await landed(page)` (tests/helpers/gameplay-browser.js) on the line before (.claude/rules/browser-test-stability.md)');
});

// The 3-2-1 lasts 3 s of wall clock; on CI two expects outlast it, so "absent during the countdown" was judged after
// GO (interactive-tutorial, CI 44025345247). Sample the countdown per frame from before the click instead.
test('a spec never asserts absence between its countdown wait and its racing wait', () => {
  const phase = name => new RegExp(`'data-phase', '${name}'`);
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!phase('countdown').test(line)) return [];
      const end = lines.findIndex((next, j) => j > i && j <= i + 12 && phase('racing').test(next));
      return lines.slice(i + 1, Math.max(end, i)).flatMap((next, k) => /toHaveCount\(0\)|toBeHidden\(|\)\.not\./.test(next) ? [`tests/${file}:${i + k + 2}: ${next.trim()}`] : []);
    });
  });
  assert.deepEqual(offenders, [], 'Record the countdown frames in the page and assert after GO (.claude/rules/browser-test-stability.md)');
});

// Since 556d163c the starting grid holds (#countdown data-step="loading") until the equipped car's GLB settles, so a spec
// that holds an asset and waits for RACING before releasing it deadlocks until the loader's 15 s deadline turns the
// car into `fallback:timeout` (crimson-gt, develop CI 44892040873). Release on the loading step, never on RACING.
test('a spec that holds an asset releases it before it waits for RACING', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      if (!/await held;/.test(line)) return [];
      const end = lines.findIndex((next, j) => j > i && /\b(?:arrive|release)\(\)/.test(next));
      return lines.slice(i + 1, end < 0 ? i + 1 : end).flatMap((next, k) => /toHaveText\('RACING'/.test(next) ? [`tests/${file}:${i + k + 2}`] : []);
    });
  });
  assert.deepEqual(offenders, [], 'Wait for #countdown data-step="loading", then release the held asset (.claude/rules/browser-test-stability.md)');
});

// The same hold sits inside COUNTDOWN: #race-status reads COUNTDOWN while the grid loads, then the 3-2-1 runs. A RACING wait
// shorter than the 10 s default budget measures the 3 s countdown only after the loading step is gone (countdown-slow-render,
// main CI 44925164077: the race started just after the 12 s budget, both attempts).
test('a short RACING wait starts after the grid has left its loading step', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => {
      const budget = /toHaveText\('RACING', \{ timeout: ciTimeout\((\d[\d_]*)\) \}\)/.exec(line)?.[1];
      return budget && Number(budget.replaceAll('_', '')) < 10000 && !lines.slice(Math.max(0, i - 4), i).some(prev => /data-step/.test(prev)) ? [`tests/${file}:${i + 1}`] : [];
    });
  });
  assert.deepEqual(offenders, [], 'Wait for #countdown to leave data-step="loading" first (.claude/rules/browser-test-stability.md)');
});

// A held model response on the gameplay (Vite dev) server must not race the loader's 15 s deadline on a slow runner.
test('a gameplay-server spec that holds a model GLB widens the loader deadline (widenModelDeadline)', () => {
  const offenders = FILES.filter(file => file.endsWith('browser.spec.js')).flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const holds = /page\.route\([^\n]*\/models\/[^\n]*await held|page\.route\([^\n]*GLB[^\n]*await held/.test(source);
    return holds && /gameplayURL/.test(source) && !/widenModelDeadline\(/.test(source) ? [`tests/${file}`] : [];
  });
  assert.deepEqual(offenders, [], 'Call widenModelDeadline(page) from tests/helpers/gameplay-browser.js before holding the GLB (.claude/rules/browser-test-stability.md)');
});

// A page-wide wait on document.getAnimations() also sees a toast that unmounts mid-wait: cancel rejects `finished` with
// AbortError (airflow showcase, 7 of 7 viewports red once pressing `v` raised the toast). Scope to a node or catch.
test('a page-wide animation wait tolerates a cancelled animation (finished.catch)', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i) => /document\.getAnimations\(/.test(line) && /\.finished(?!\.catch)/.test(line) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Use `animation.finished.catch(() => {})` or scope getAnimations() to one element (.claude/rules/browser-test-stability.md)');
});

// The rival fleet pools one car per chassis and deals each race a shuffled lineup, so scene order is not race
// order: the drive-cue helper judged rival 1's flame on another car (trail false, CI 44395376200).
test('a spec pairs a rival with its scene car through gameScene.rivals, not scene order', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i) => /scene\.children\b.*\b(driveCue|rival)/i.test(line) ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Read `window.gameScene.rivals[i]` (tests/helpers/gameplay-browser.js) (.claude/rules/browser-test-stability.md)');
});

// The halfway card lives 2.15 s of race time. toBeVisible, then a text check, then a measure outlived it on CI (a detached
// node in 44269822759; a zero rect, dx 480, in 44395376200). Read it in one page tick (page.waitForFunction); a locator
// may only wait for it to go. The setting toast pill unmounts TOAST_MS (1.8 s) after it shows: three locator reads
// outlived it and the next one found no pill (toggle-feedback, 3 tests red on both attempts, CI 44674764907).
test('a spec reads a self-expiring element (halfway card, setting toast) in one page tick', () => {
  const offenders = FILES.flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return ['#race-halfway-card', '#game-toast .game-toast-pill'].flatMap(selector => {
      const locator = String.raw`page\.locator\(['"]${selector.replaceAll('.', '\\.')}['"]\)`;
      const names = [...source.matchAll(new RegExp(String.raw`(\w+)\s*=\s*(?:page\s*=>\s*)?${locator}`, 'g'))].map(([, name]) => name);
      const reads = [new RegExp(String.raw`${locator}\s*\.(?!.*toBeHidden)`), ...names.map(name => new RegExp(
        String.raw`expect\(${name}(?:\(page\))?\)\.(?!toBeHidden|toHaveCount\(0\b)|\b${name}(?:\(page\))?\.(?:evaluate|boundingBox|textContent|innerText|locator)\(`))];
      return source.split('\n').flatMap((line, i) => reads.some(read => read.test(line)) ? [`tests/${file}:${i + 1}`] : []);
    });
  });
  assert.deepEqual(offenders, [], 'find, read and measure it inside one page.waitForFunction (.claude/rules/browser-test-stability.md)');
});

// Trap (2026-11-21, main CI 44925164077): the swipe hint chip clears itself 6 s after it shows (track-swipe-ui.ts). The spec's
// toggleAirflowPreview opens Settings, clicks and closes it; on CI that outlived the chip, so the live data-state read "" for
// the whole 30 s (track-swipe-browser phone reload hint, red on both attempts). Record the hint with an observer instead.
test('a spec records the self-clearing swipe hint with an observer, not its live data-state', () => {
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').flatMap(
    (line, i) => /toHaveAttribute\(\s*'data-state',\s*'hint'\s*\)/.test(line) ? [`tests/${file}:${i + 1}`] : []));
  assert.deepEqual(offenders, [], 'record the hint in a MutationObserver (watchHints, tests/track-swipe-browser.spec.js) (.claude/rules/browser-test-stability.md)');
});

// Trap (2026-11-20, CI 44674764907): hazard-captures and track-themes end on page.reload(), so the test ended while
// captureHooks' route.fetch() for the reload was still in flight; closing the context disposed the response and
// `apiResponse.text: Response has been disposed` failed a passing test. Teardown unroutes with ignoreErrors first.
test('a route handler that fetches cannot outlive its test (unrouteAll ignoreErrors)', () => {
  const shared = readFileSync(new URL('helpers/test.js', import.meta.url), 'utf8');
  const unroute = /await use\(context\);[^}]*\bunrouteAll\(\{ behavior: 'ignoreErrors' \}\)/;
  assert.match(shared, unroute, 'the shared context fixture unroutes every page and the context after use');
  const offenders = FILES.filter(file => file.endsWith('browser.spec.js')).filter(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    return source.includes('route.fetch()') && !/import \{[^}]*\btest\b[^}]*\} from '\.\/helpers\//.test(source)
      && !source.includes("unrouteAll({ behavior: 'ignoreErrors' })");
  }).map(file => `tests/${file}`);
  assert.deepEqual(offenders, [], "Take `test` from tests/helpers/test.js, or unrouteAll({ behavior: 'ignoreErrors' }) after each test");
});

// Trap (2026-11-21, develop CI 44892040873): at 320x740 the Event Lab walk (quick: one pass plus two Tabs) ended on the
// browser's own UI (activeElement <body>), so the Escape pressed next went to the address bar, never to the page, and
// #event-lab-dialog stayed open (red on attempt 1, green on retry). The walk hands focus back inside the dialog itself.
test('a Tab-trap walk ends with focus back inside the dialog, so the next key reaches the page', () => {
  const offenders = FILES.filter(file => file.endsWith('browser.spec.js')).flatMap(file => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const start = source.indexOf('async function assertTrapped(');
    if (start < 0) return [];
    const body = source.slice(start, source.indexOf('\n}\n', start));
    return body.lastIndexOf('.focus(') > body.lastIndexOf('keyboard.press(key)') ? [] : [`tests/${file}`];
  });
  assert.deepEqual(offenders, [], 'End assertTrapped by focusing a control inside the dialog (.claude/rules/browser-test-stability.md)');
});

// Trap (2026-11-22, main CI 44953782730): toggle-feedback read the Visual effects toast only after two settled-state
// assertions (not.toBeChecked, toBeDisabled). On a starved CI page they outlived the 1.8 s pill, so the read timed out on
// both attempts although the switch had worked. Read the toast straight after the action that raises it.
test('a spec reads the setting toast straight after the action that raises it', () => {
  const offenders = FILES.flatMap(file => {
    const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
    return lines.flatMap((line, i) => /\bexpectToast\(page,/.test(line) && !/^\s*const expectToast/.test(line)
      && !/\.(click|tap|press)\(/.test(lines[i - 1]) ? [`tests/${file}:${i + 1}`] : []);
  });
  assert.deepEqual(offenders, [], 'call expectToast on the line after the click/press, assert settled state after (.claude/rules/browser-test-stability.md)');
});
