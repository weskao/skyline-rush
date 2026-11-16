import test from 'node:test';
import assert from 'node:assert/strict';
import { presentationPlacementBadge, placementBadgeArtwork } from '../src/finish-placement-badge.ts';

test('real top-three classic results show display-only podium badges, not inventory', () => {
  const first = presentationPlacementBadge(1, 8, 'en');
  assert.deepEqual(first, { tier: 'gold', name: 'Gold', displayOnly: true });
  assert.equal(presentationPlacementBadge(2, 8, 'en')?.name, 'Silver');
  assert.equal(presentationPlacementBadge(3, 8, 'en')?.name, 'Bronze');
  assert.equal(presentationPlacementBadge(4, 8, 'en'), null);
});

test('invalid position or insufficient opponents never grants a podium badge', () => {
  for (const [position, players] of [[0, 8], [-1, 8], [1, 1], [3, 2], [NaN, 8], [1.5, 8], [1, Infinity]]) {
    assert.equal(presentationPlacementBadge(position, players, 'en'), null);
  }
});

test('labels are bilingual and never include an award or currency', () => {
  assert.deepEqual(presentationPlacementBadge(2, 8, 'zh-TW'), { tier: 'silver', name: '銀牌', displayOnly: true });
  const badge = presentationPlacementBadge(1, 8, 'en');
  assert.equal(Object.hasOwn(badge, 'reward'), false);
  assert.equal(Object.hasOwn(badge, 'balance'), false);
});

test('Wave 3 podium artwork uses checked GitHub 3x assets with safe Pages prefix and display-only sizing', () => {
  assert.deepEqual(placementBadgeArtwork('gold', '/skyline-rush/'), {
    src: '/skyline-rush/feature-assets/garage-rewards-and-missions/raster/trophy-gold@3x.webp',
    cssSize: 96, sourcePixels: 288,
  });
  assert.match(placementBadgeArtwork('silver', '/').src, /trophy-silver@3x\.webp$/);
  assert.match(placementBadgeArtwork('bronze', '//evil/path/').src, /^\/feature-assets\//);
});
