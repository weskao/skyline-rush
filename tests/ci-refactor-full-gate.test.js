import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('an explicit refactor push can run browser, World Tour and layout against the exact commit', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const pushGate = "github.event_name == 'push' && contains(github.event.head_commit.message, '[full-regression]')";
  assert.equal(workflow.split(pushGate).length - 1, 3, 'browser, World Tour and focused quality gate all recognize the full-regression marker');
  assert.match(workflow, /npm run test:layout/, 'final verification must also include responsive layout suite');
  assert.match(workflow, /matrix.shard == 1/, 'run layout once, without repeating all eight shards');
});
