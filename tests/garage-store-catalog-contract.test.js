import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as previewCatalog from '../src/garage-wave3-preview-catalog.ts';
const { WAVE3_PREVIEW_CATALOG } = previewCatalog;
const STORE_ITEM_PRESENTATION = previewCatalog.STORE_ITEM_PRESENTATION ?? {};
import { storeReadiness } from '../src/garage-store-readiness.ts';

test('all six Store cards have explicit presentation status but no transaction data', () => {
  const items = WAVE3_PREVIEW_CATALOG['garage-store-readiness'].items;
  const ids = items.map(item => item.id);
  assert.deepEqual(Object.keys(STORE_ITEM_PRESENTATION).sort(), [...ids].sort());
  assert.equal(new Set(ids).size, 6);
  assert.equal(STORE_ITEM_PRESENTATION['store-star'].featured, true);
  assert.equal(STORE_ITEM_PRESENTATION['store-box'].availability, 'unavailable');
  for (const id of ids) {
    const state = STORE_ITEM_PRESENTATION[id];
    assert.ok(['coming-soon', 'unavailable'].includes(state.availability), id);
    assert.equal(typeof state.featured, 'boolean', id);
    assert.equal('price' in state || 'balance' in state || 'owned' in state || 'buy' in state, false, id);
  }
  assert.equal(storeReadiness().canBuy, false);
  assert.equal(storeReadiness().canClaim, false);
});

test('Store readiness is mounted as an actual catalog, with accessible real statuses rather than just a source gallery', () => {
  const component = readFileSync(new URL('../src/GarageSourceArtGallery.vue', import.meta.url), 'utf8');
  for (const token of ['data-store-catalog', 'data-store-card-status', 'data-store-featured', 'storeStatusLabel', 'aria-disabled']) {
    assert.ok(component.includes(token), `Missing Store UI contract: ${token}`);
  }
  assert.ok(component.includes('prefers-reduced-motion'), 'reduced motion required');
  assert.ok(component.includes('import.meta.env.BASE_URL'), 'public asset paths must work on GitHub Pages');
});

test('Store detail status uses the selected item state, instead of hardcoding Coming soon', () => {
  const component = readFileSync(new URL('../src/GarageSourceArtGallery.vue', import.meta.url), 'utf8');
  assert.match(component, /category === 'garage-store-readiness' \? storeStatusLabel\(current\.id\) :/);
});
