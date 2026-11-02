import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { docOnly, needsCi } from '../scripts/ci-changes.mjs';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const job = (name) => {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  assert.ok(start >= 0, `CI job ${name} exists`);
  const next = workflow.slice(start + 1).search(/\n  [a-z][a-z-]*:\n/);
  return workflow.slice(start, next === -1 ? undefined : start + 1 + next);
};

test('docs and media outside shipped paths skip the suites', () => {
  assert.equal(needsCi(['README.md', 'README.zh-TW.md', 'CHANGELOG.md', 'TODO.md', 'docs/a/b.png',
    'artifacts/clip.mp4', '.claude/rules/x.md', 'notes.txt', 'docs/demo.webm']), false);
});

test('code, config, shipped assets, test inputs and empty retriggers run the suites', () => {
  for (const path of ['src/App.vue', 'src/assets/logo.png', 'public/whats-new/0.26.0/a.webp', 'public/og-image.jpeg',
    'tests/fixtures/a.txt', 'scripts/notes.md', '.github/workflows/ci.yml', 'package.json', 'index.html',
    'Makefile', 'docs/garage-release-policy.md']) {
    assert.equal(docOnly(path), false, path);
    assert.equal(needsCi(['README.md', path]), true, path);
  }
  assert.equal(needsCi([]), true, 'an empty commit is a deliberate retrigger');
});

test('every doc a unit or browser test reads is classified as needing CI', () => {
  const read = /read\w*\(\s*(?:new URL\(\s*)?['"`](?:\.\.\/|\.\/)?([\w./-]+\.(?:md|txt|log|png|jpe?g|gif|webp|svg|mp4|mov|webm))['"`]/g;
  const docs = readdirSync(new URL('.', import.meta.url)).filter((name) => name.endsWith('.js'))
    .flatMap((name) => [...readFileSync(new URL(name, import.meta.url), 'utf8').matchAll(read)].map((m) => m[1]));
  assert.ok(docs.includes('docs/garage-release-policy.md'), 'the scan still finds known doc reads');
  for (const path of docs) assert.equal(docOnly(path), false, `${path} is read by a test; add it to NEEDS_CI`);
});

test('the CLI reads names from stdin', () => {
  const run = (input) => spawnSync('node', ['scripts/ci-changes.mjs'], { input, encoding: 'utf8' }).stdout.trim();
  assert.equal(run('README.md\ndocs/x.png\n'), 'false');
  assert.equal(run('README.md\nsrc/game.js\n'), 'true');
  assert.equal(run(''), 'true');
});

test('every suite waits on the change check; history and release checks never skip', () => {
  assert.match(job('changes'), /scripts\/ci-changes\.mjs/);
  assert.match(job('changes'), /gh run list .*--commit "\$BEFORE" --status success/,
    'a docs-only skip trusts only a parent tree whose own run passed');
  for (const name of ['unit-tests', 'browser-tests', 'cloud-save', 'world-tour-mid-race']) {
    assert.match(job(name), /needs: changes/, name);
    assert.match(job(name), /needs\.changes\.outputs\.code == 'true'/, name);
  }
  for (const name of ['main-merge-source', 'release-verified', 'deploy']) {
    assert.doesNotMatch(job(name), /needs\.changes\.outputs/, `${name} must not skip on docs-only changes`);
  }
  const gate = job('quality-gate');
  assert.match(gate, /CODE: \$\{\{ needs\.changes\.outputs\.code \}\}/);
  for (const step of ['- uses: actions/download-artifact@v4', '- name: Verify software-WebGL evidence']) {
    const lines = gate.slice(gate.indexOf(step)).split('\n').slice(0, 3).join('\n');
    assert.match(lines, /needs\.changes\.outputs\.code == 'true'/, `${step} needs the browser evidence`);
  }
});
