import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const root = path => new URL('../' + path, import.meta.url);
const src = path => readFileSync(root(path), 'utf8');
const webp = path => {
 const b = readFileSync(root(path));
 assert.equal(b.toString('ascii', 0, 4), 'RIFF', path);
 assert.equal(b.toString('ascii', 8, 12), 'WEBP', path);
 assert.equal(b.readUInt32LE(4) + 8, b.length, path);
 return b;
};
import { placementBadgeArtwork } from '../src/finish-placement-badge.ts';
const ids=["mission-race","mission-time","mission-drift","mission-combo","trophy-bronze","trophy-silver","trophy-gold","trophy-platinum"];
test('eight independent native 288px transparent WebP illustrations are present without PNGs', () => {
 const path='public/feature-assets/garage-rewards-and-missions/raster/';
 for (const id of ids) {
  const b=webp(path+id+'@3x.webp');
  assert.equal(b.toString('ascii',12,16),'VP8X',id);
  assert.equal(b[20]&0x10,0x10,id+' transparency');
  assert.deepEqual([1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)],[288,288],id);
 }
 assert.ok(readdirSync(root(path)).every(f=>!f.endsWith('.png')));
});
test('podium decor uses WebP at a genuine 3x size, without granting entitlements', () => {
 const badge=placementBadgeArtwork('gold','/skyline-rush/');
 assert.equal(badge.src,'/skyline-rush/feature-assets/garage-rewards-and-missions/raster/trophy-gold@3x.webp');
 assert.deepEqual([badge.cssSize,badge.sourcePixels],[96,288]);
});
test('Garage and Results use WebP artwork with a text/load failure fallback, not PNG', () => {
 const gallery=src('src/GarageSourceArtGallery.vue'),board=src('src/GarageMissionBoard.vue');
 const results=src('src/result-screen.ts'),garage=src('src/GaragePanel.vue');
 assert.match(gallery,/@3x\.webp/);
 assert.match(board,/@3x\.webp/);
 assert.match(board,/mission-drive|trophy-awaken/);
 assert.match(results,/result-trophy-art|onerror/);
 assert.match(garage,/GarageMissionBoard/);
 assert.doesNotMatch(gallery+board,/\.png/);
});
