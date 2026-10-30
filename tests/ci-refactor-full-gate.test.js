import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const pushGate = "github.event_name == 'push' && contains(github.event.head_commit.message, '[full-regression]')";

function jobSection(name, next) {
  const start = workflow.indexOf(`\n  ${name}:`);
  const end = workflow.indexOf(`\n  ${next}:`, start + 1);
  assert.ok(start >= 0 && end > start, `missing or reordered CI jobs: ${name} → ${next}`);
  return workflow.slice(start, end);
}

test('an explicit refactor push enables every full-regression job and evidence gate', () => {
  const browser = jobSection('browser-tests', 'cloud-save');
  const worldTour = jobSection('world-tour-mid-race', 'quality-gate');
  const quality = jobSection('quality-gate', 'release-verified');

  // A global count became stale when the performance artifact download and
  // verification steps acquired their own full-regression guards. Verify each
  // job separately so future gates cannot accidentally be left out.
  assert.equal(browser.split(pushGate).length - 1, 1,
    'browser matrix must recognize the explicit full-regression marker');
  assert.equal(worldTour.split(pushGate).length - 1, 1,
    'World Tour matrix must recognize the explicit full-regression marker');
  assert.equal(quality.split(pushGate).length - 1, 3,
    'artifact download, evidence verification and focused-mode detection must agree');

  for (const step of ['actions/download-artifact@v4',
    'name: Verify software-WebGL evidence coverage and rendering budgets']) {
    const offset = quality.indexOf(step);
    assert.ok(offset >= 0, `missing full-regression quality gate: ${step}`);
    assert.ok(quality.slice(offset, offset + 400).includes(pushGate),
      `performance gate ${step} must be guarded by the full-regression marker`);
  }

  // The layout specs are already in the sharded suite; a second run cost one shard 30 minutes.
  assert.doesNotMatch(browser, /test:layout/,
    'browser matrix must not rerun the layout specs the shards already cover');
});
