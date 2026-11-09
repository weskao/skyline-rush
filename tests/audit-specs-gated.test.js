import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Specs that write per-device evidence into the ignored audits/ dir are long benchmarks (the sustained-FPS run takes
// 13 min): each must skip unless its own env flag is set, or the gate would run them on every CI shard.
test('every browser spec writing to audits/ skips unless an env flag opts in', () => {
  const specs = fs.readdirSync('tests').filter(name => name.endsWith('browser.spec.js'));
  const audit = specs.filter(name => fs.readFileSync(`tests/${name}`, 'utf8').includes('docs/designs/3d-pipeline/audits/'));
  assert.ok(audit.includes('sustained-fps-browser.spec.js'));
  const ungated = audit.filter(name => !/^test\.skip\(!process\.env\.[A-Z_]+,/m.test(fs.readFileSync(`tests/${name}`, 'utf8')));
  assert.deepEqual(ungated, []);
});
