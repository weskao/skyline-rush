import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = path => new URL('../' + path, import.meta.url);
const source = path => readFileSync(root(path), 'utf8');
const rewardIds = ['mission-race', 'mission-time', 'mission-drift', 'mission-combo',
  'trophy-bronze', 'trophy-silver', 'trophy-gold', 'trophy-platinum'];
const walletIds = ['wallet-coin', 'wallet-diamond'];

test('Wave 3 reward and wallet illustration packages are WebP-only with 3x source geometry', () => {
  for (const [dir, ids] of [
    ['garage-rewards-and-missions', rewardIds],
    ['wave3-demo', [...walletIds, 'demo-points', 'demo-claim',
      'demo-collection-empty', 'demo-results-banner']],
    ['garage-store-readiness', ['store-cart', 'store-box', 'store-bundle',
      'store-tag', 'store-star', 'store-collection']],
  ]) {
    const path = 'public/feature-assets/' + dir + '/raster/';
    const filenames = readdirSync(root(path));
    assert.equal(filenames.some(file => file.endsWith('.png')), false, dir + ': no PNG runtime originals or fallbacks');
    for (const id of ids) {
      const bytes = readFileSync(root(path + id + '@3x.webp'));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', id);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', id);
      assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, id);
    }
  }
});

test('every Wave 3 decorative surface references WebP and never PNG fallback', () => {
  for (const file of ['Wave3CurrencyStrip.vue', 'Wave3DemoArt.vue',
    'GarageMissionBoard.vue', 'GarageSourceArtGallery.vue', 'GaragePanel.vue',
    'Wave3DemoStore.vue', 'wave3-demo-art.ts',
    'wave3-demo-results-integration.ts', 'finish-placement-badge.ts']) {
    assert.doesNotMatch(source('src/' + file), /\.png|['"]png['"]/, file);
  }
  assert.match(source('src/Wave3CurrencyStrip.vue'), /wallet-coin@3x\.webp/);
  assert.match(source('src/Wave3CurrencyStrip.vue'), /wallet-diamond@3x\.webp/);
  assert.match(source('src/GarageMissionBoard.vue'), /@3x\.webp/);
});

test('wallet, mission and trophy have distinct animations beyond shimmer, respecting reduced motion', () => {
  const wallet = source('src/Wave3CurrencyStrip.vue');
  const board = source('src/GarageMissionBoard.vue');
  assert.match(wallet, /wallet-coin-orbit|wallet-diamond-prism/);
  assert.match(board, /mission-drive|trophy-awaken/);
  assert.match(wallet, /prefers-reduced-motion/);
  assert.match(board, /prefers-reduced-motion/);
});


test('premium renderer must preserve original source icon contours instead of inventing new shapes', () => {
  const s = source('scripts/generate-wave3-premium-webp.py');
  assert.match(s, /ARCHIVE.*3x-asset-library/);
  assert.match(s, /WALLET_ORIGINAL/);
  assert.match(s, /silhouette_similarity/);
  assert.match(s, /score >= 0\.80/);
  assert.match(s, /"git", "show"/);
  assert.doesNotMatch(s, /class Painter|def frame\(|def race\(|def trophy\(|def diamond\(/);
});

test('rendered assets use the approved Demo Points metallic spectral treatment', () => {
  const renderer = source('scripts/generate-wave3-premium-webp.py');
  assert.match(renderer, /demo-points@3x\.webp/);
  assert.match(renderer, /spectral_rim/);
  assert.match(renderer, /energy_trails/);
  assert.match(renderer, /gloss_reflection/);
  assert.match(renderer, /original.*silhouette|silhouette.*original/i);
  const animations = source('src/GarageMissionBoard.vue');
  for (const id of ['mission-race', 'mission-time', 'mission-drift', 'mission-combo']) {
    assert.match(animations, new RegExp('data-mission-id="' + id + '"'), 'individual effect for ' + id);
  }
  assert.match(animations, /mission-flag-wave/);
  assert.match(animations, /mission-time-tick/);
  assert.match(animations, /mission-drift-pulse/);
  assert.match(animations, /mission-combo-boost/);
  assert.match(animations, /prefers-reduced-motion/);
});

test('Garage and Demo Store actually mount source WebP instead of requesting removed PNG', () => {
  const garage = source('src/GaragePanel.vue');
  const store = source('src/Wave3DemoStore.vue');
  assert.match(garage, /store-cart@3x\.webp/);
  assert.doesNotMatch(garage, /storeIconFallback|store-cart@3x\.png/);
  assert.match(source('src/App.vue'), /<Wave3CurrencyStrip/);
  assert.doesNotMatch(garage, /<Wave3CurrencyStrip/);
  assert.match(garage, /<GarageMissionBoard/);
  assert.match(garage, /<GarageSourceArtGallery[^>]*category="garage-rewards-and-missions"/);
  assert.match(store, /storeArt\(icon\)/);
  assert.doesNotMatch(store, /storeArt\(icon,\s*'png'\)|fallback-src="storeArt/);
});
