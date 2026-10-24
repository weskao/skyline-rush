import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

test('browser specs never set a wall-clock budget that skips the CI factor', () => {
  // A budget that must stay fixed (it races a real animation) says so on the line above: "fixed budget: never scaled".
  const offenders = FILES.flatMap(file => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n')
    .flatMap((line, i, lines) => LITERAL.some(pattern => pattern.test(line)) && !lines[i - 1]?.includes('fixed budget: never scaled')
      ? [`tests/${file}:${i + 1}: ${line.trim()}`] : []));
  assert.deepEqual(offenders, [], 'Wrap per-test and per-assertion timeouts in ciTimeout() from tests/helpers/ci.js');
});
