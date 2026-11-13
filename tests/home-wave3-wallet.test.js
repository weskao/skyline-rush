import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');

test('three icons and numbers move from Garage to tiny Home row', () => {
  const app = source('App.vue');
  const garage = source('GaragePanel.vue');
  const mission = source('GarageMissionBoard.vue');
  const wallet = source('Wave3CurrencyStrip.vue');
  assert.match(app, /<Wave3CurrencyStrip[^>]*compact/);
  assert.match(app, /:experience="wave3DemoExperience"/);
  assert.doesNotMatch(garage, /<Wave3CurrencyStrip/);
  assert.doesNotMatch(mission, /class="garage-demo-balance"/);
  assert.match(wallet, /data-compact/);
  assert.match(wallet, /\.wave3-wallet-strip\[data-compact="true"\]/);
  assert.match(wallet, /22px/);
  assert.match(wallet, /v-if="!compact"/);
  assert.match(wallet, /:aria-label="row\.label/);
  assert.match(wallet, /wallet-coin@3x\.webp/);
  assert.match(wallet, /wallet-diamond@3x\.webp/);
  assert.match(wallet, /projectWave3Currency/);
  assert.match(wallet, /subscribe/);
});
