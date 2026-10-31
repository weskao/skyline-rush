import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('quality-gate reports upstream test failure before downloading WebGL evidence', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const start = workflow.indexOf('\n  quality-gate:\n');
  const end = workflow.indexOf('\n  release-verified:\n', start);
  assert.ok(start >= 0 && end > start, 'quality-gate job exists');
  const gate = workflow.slice(start, end);
  assert.match(gate, /needs: \[unit-tests, browser-tests, cloud-save, world-tour-mid-race\]/);
  assert.match(gate, /if: "\$\{\{ always\(\)/);
  const upstream = gate.indexOf('- name: Require every verification suite to pass');
  const artifacts = gate.indexOf('- uses: actions/download-artifact@v4');
  const evidence = gate.indexOf('- name: Verify software-WebGL evidence coverage and rendering budgets');
  assert.ok(upstream >= 0 && artifacts > upstream && evidence > artifacts,
    'check upstream suites before reading artifacts; preserve performance verification');
  assert.ok(gate.includes('for result in "$UNIT" "$BROWSER" "$CLOUD" "$WORLD_TOUR"; do'),
    'all four mandatory suites remain required');
  assert.ok(gate.includes('if [ "$result" != success ]; then'),
    'cancelled, skipped and failed mandatory suites cannot pass');
});
