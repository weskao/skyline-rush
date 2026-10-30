import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Every active development branch must run the same required quality gate.
test('CI push events include fix branches while leaving retired MODE-00 disabled', () => {
  const yaml = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const branches = yaml.match(/^    branches:\n((?:      - [^\n]+\n)+)/m)?.[1] ?? '';
  assert.match(branches, /^      - ['"]?develop['"]?$/m);
  assert.match(branches, /^      - ['"]?fix\/\*\*['"]?$/m);
  assert.match(branches, /^      - ['"]?!feature\/mode00-objective-contract['"]?$/m);
});
