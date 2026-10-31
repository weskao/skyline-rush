import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GARAGE_SKINS, SKIN_CATEGORIES, normalizeSkinProfile, resolveActiveSkin, skinView, skinArtwork, skinCloudPayload } from '../src/garage-skin-catalog.ts';

const account = 'signedInA';
const profile = (value = {}) => normalizeSkinProfile({ version: 1, accountId: account, ...value }, account);
const session = (value = {}) => ({ accountId: account, now: 1000, trialEnabled: false, trialExpiresAt: 0, ...value });

test('BDD catalog groups all four categories with stable unique IDs and default entries', () => {
  assert.equal(GARAGE_SKINS.length, 8);
  assert.equal(new Set(GARAGE_SKINS.map(s => s.id)).size, 8);
  for (const category of SKIN_CATEGORIES) {
    assert.equal(GARAGE_SKINS.filter(s => s.category === category && s.default).length, 1);
    assert.equal(GARAGE_SKINS.filter(s => s.category === category && !s.default).length, 1);
  }
});

test('Given trial-only skin, When trial valid, Then skin is usable but NOT owned or written to cloud', () => {
  const saved = profile();
  const activeTrial = session({ trialEnabled: true, trialExpiresAt: 2000, trialEquipped: { thruster: 'thruster-ion' } });
  assert.equal(resolveActiveSkin('thruster', saved, activeTrial), 'thruster-ion');
  assert.deepEqual({ state: skinView('thruster-ion', saved, activeTrial)?.state, owned: skinView('thruster-ion', saved, activeTrial)?.owned }, { state: 'equipped', owned: false });
  assert.deepEqual(skinCloudPayload(saved).owned, []);
  assert.equal(skinView('airflow-slipstream', saved, activeTrial)?.state, 'trial');
});

test('Given expired trial, Then revert to default without affecting the legitimately equipped paint', () => {
  const legacy = { selectedPaint: 'cobalt', stars: 22, paints: ['pearl','cobalt'] };
  const saved = profile();
  const before = structuredClone(legacy);
  assert.equal(resolveActiveSkin('thruster', saved, session({ trialEnabled: true, trialExpiresAt: 999, trialEquipped: { thruster: 'thruster-ion' } })), 'thruster-basic');
  assert.equal(skinView('thruster-ion', saved, session({ trialEnabled: true, trialExpiresAt: 999 }))?.state, 'locked');
  assert.deepEqual(legacy, before);
  assert.deepEqual(skinCloudPayload(saved), { version: 1, accountId: account, owned: [], equipped: {} });
});

test('Owned skins are not revoked by trial expiration; default skins are always available', () => {
  const saved = profile({ owned: ['thruster-ion'], equipped: { thruster: 'thruster-ion' } });
  assert.equal(resolveActiveSkin('thruster', saved, session()), 'thruster-ion');
  assert.equal(skinView('thruster-ion', saved, session()).state, 'equipped');
  assert.equal(skinView('airflow-basic', saved, session()).owned, true);
  assert.deepEqual(skinCloudPayload(saved).owned, ['thruster-ion']);
});

test('Account switch invalidates session trial and rejects another account saved profile', () => {
  const previous = profile({ owned: ['thruster-ion'], equipped: { thruster: 'thruster-ion' } });
  const other = normalizeSkinProfile(previous, 'signedInB');
  assert.deepEqual(other.owned, []);
  assert.equal(resolveActiveSkin('thruster', previous, session({ accountId: 'signedInB', trialEnabled: true, trialExpiresAt: 9000, trialEquipped: { thruster: 'thruster-ion' } })), 'thruster-basic');
  assert.equal(resolveActiveSkin('thruster', other, session({ accountId: 'signedInB' })), 'thruster-basic');
});

test('Corrupt profile, unknown IDs, foreign keys and malformed entitlements are sanitized', () => {
  assert.deepEqual(normalizeSkinProfile({ version: 999, owned: ['thruster-ion'] }, account).owned, []);
  assert.deepEqual(normalizeSkinProfile({ version: 1, accountId: account, owned: ['thruster-ion', 'thruster-ion', '__proto__', 'nitro-trail-cyan', 12], equipped: { thruster: 'nitro-trail-cyan', airflow: '__proto__' } }, account), { version: 1, accountId: account, owned: ['thruster-ion', 'nitro-trail-cyan'], equipped: {} });
  assert.equal(skinView('__proto__', profile(), session()), null);
  assert.equal(skinArtwork('../../secret', '/skyline-rush/'), null);
  assert.equal(skinView('thruster-ion', profile(), session({ now: NaN, trialEnabled: true, trialExpiresAt: Infinity })).state, 'locked');
});

test('Raster candidates are not mistaken for committed assets; SVG fallback uses Vite base path', () => {
  const art = skinArtwork('thruster-ion', '/skyline-rush/');
  assert.deepEqual(art, { src: '/skyline-rush/feature-assets/garage-vfx-skins/thruster.svg', fallback: '/skyline-rush/feature-assets/garage-vfx-skins/thruster.svg', cssSize: 96, candidateRasterId: 'thruster-ion', hasRaster: false });
  assert.equal(skinArtwork('nitro-trail-cyan', 'https://evil.example/').src, '/feature-assets/garage-vfx-skins/nitro-trail.svg');
});

test('Cloud payload never serializes ephemeral trial/equip/preview fields', () => {
  const saved = profile({ owned: ['nitro-trail-cyan'], equipped: { 'nitro-trail': 'nitro-trail-cyan' }, trialEquipped: { thruster: 'thruster-ion' }, trialExpiresAt: 9000, selectedPaint: 'cobalt' });
  const data = skinCloudPayload(saved);
  assert.equal(data.trialEquipped, undefined);
  assert.equal(data.trialExpiresAt, undefined);
  assert.equal(data.selectedPaint, undefined);
  assert.deepEqual(data.equipped, { 'nitro-trail': 'nitro-trail-cyan' });
});
