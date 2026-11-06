import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/main-ui-contract.json', import.meta.url), 'utf8'));

test('main CSS contract remains byte-identical while Wave 1 NITRO and Wave 2 Foldable append overrides', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const wave1 = '\n/* NITRO availability is read from the engine';
  const wave2 = '\n/* Foldable viewport segments:';
  assert.ok(css.includes(wave1));
  assert.ok(css.includes(wave2));
  const main = Buffer.from(css.slice(0, css.indexOf(wave1)), 'utf8');
  const header = Buffer.from('blob ' + main.byteLength + '\0');
  const gitSha = createHash('sha1').update(header).update(main).digest('hex');
  assert.equal(gitSha, baseline.cssBlob);
  const nitro = css.slice(css.indexOf(wave1), css.indexOf(wave2));
  for (const state of ['charging', 'ready', 'active', 'disabled']) {
    assert.ok(nitro.includes(`data-nitro-state="${state}"`), state);
  }
  const fold = css.slice(css.indexOf(wave2));
  assert.ok(fold.includes('data-fold-axis="vertical"'));
  assert.ok(fold.includes('data-fold-axis="horizontal"'));
});
