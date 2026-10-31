import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
function job(name) {
  const start = workflow.indexOf(`  ${name}:\n`);
  assert.notEqual(start, -1, `CI job ${name} must exist`);
  const tail = workflow.slice(start + 3);
  const nextJob = tail.search(/\n  [a-z][a-z-]*:\n/);
  return workflow.slice(start, nextJob === -1 ? undefined : start + 3 + nextJob);
}

test('only main and develop run the browser suites; other branches opt in via full regression', () => {
  assert.match(workflow, /workflow_dispatch:\s*\n\s+inputs:\s*\n\s+full_regression:/);
  for (const name of ['browser-tests', 'world-tour-mid-race']) {
    const suite = job(name);
    assert.match(suite, /github\.ref == 'refs\/heads\/main' \|\| github\.ref == 'refs\/heads\/develop'/, name);
    assert.match(suite, /inputs\.full_regression\s*==\s*true/, name);
    // A per-prefix rule (refactor/ only) let feature/ and fix/ pushes spend runner-hours on every commit.
    assert.doesNotMatch(suite, /refs\/heads\/(refactor|feature|fix)\//, `${name} must not branch on a prefix`);
  }
  for (const name of ['unit-tests', 'cloud-save']) {
    assert.doesNotMatch(job(name), /full_regression/, `${name} must always run`);
  }
});

test('focused quality gate requires both unit and cloud, full gate requires all suites', () => {
  const gate = job('quality-gate');
  assert.match(gate, /FOCUSED:/);
  assert.match(gate, /\$UNIT/);
  assert.match(gate, /\$CLOUD/);
  assert.match(gate, /\$BROWSER/);
  assert.match(gate, /\$WORLD_TOUR/);
  assert.match(gate, /skipped/, 'focused mode must explicitly accept skipped heavy suites');
  assert.match(gate, /\bfull\b/, 'full suite must remain the final acceptance gate');
});
