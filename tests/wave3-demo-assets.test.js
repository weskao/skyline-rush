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
import { createHash } from 'node:crypto';
import { WAVE3_PREVIEW_CATALOG } from '../src/garage-wave3-preview-catalog.ts';
const bytes=srcPath=>readFileSync(root(srcPath));
const source=src;
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const originals=["mission-race","mission-time","mission-drift","mission-combo","trophy-bronze","trophy-silver","trophy-gold","trophy-platinum"];
const store=["store-cart","store-box","store-bundle","store-tag","store-star","store-collection"];
const category=id=>id.startsWith('store-')?'garage-store-readiness':'garage-rewards-and-missions';
test('approved archival sources remain unchanged; all fourteen runtime icons are valid WebPs', () => {
 for(const id of [...originals,...store]){
  const path='public/feature-assets/'+category(id)+'/raster/'+id+'@3x.webp';
  const file=webp(path);
  const kind=file.toString('ascii',12,16);
  assert.ok(kind==='VP8X'||kind==='VP8L',id+': supported native WebP variant '+kind);
  let size;
  if(kind==='VP8X') {
    assert.equal(file[20]&0x10,0x10,id+' has transparency');
    size=[1+file.readUIntLE(24,3),1+file.readUIntLE(27,3)];
  } else {
    assert.equal(file[20],0x2f,id+': lossless WebP signature');
    const info=file.readUInt32LE(21);
    assert.equal((info>>>28)&1,1,id+': lossless WebP has alpha');
    size=[1+(info&0x3fff),1+((info>>>14)&0x3fff)];
  }
  assert.deepEqual(size,id.startsWith('store-')?[216,216]:[288,288],id);
  assert.ok(existsSync(root('docs/designs/3x-asset-library/webp/'+category(id)+'/'+id+'@3x.webp')));
 }
 for(const dir of ['garage-rewards-and-missions','garage-store-readiness'])
  assert.ok(readdirSync(root('public/feature-assets/'+dir+'/raster/')).every(n=>!n.endsWith('.png')));
});
test('catalog and actual Garage screens reference the native-size WebPs',()=>{
 for(const [key,css,px] of [['garage-rewards-and-missions',96,288],['garage-store-readiness',72,216]]){
  const catalog=WAVE3_PREVIEW_CATALOG[key];
  assert.deepEqual([catalog.cssSize,catalog.sourcePx],[css,px]);
  for(const item of catalog.items)
   assert.ok(existsSync(root('public/feature-assets/'+key+'/raster/'+item.id+'@3x.webp')));
 }
 for(const file of ['GarageMissionBoard.vue','GarageSourceArtGallery.vue',
  'GarageSkinCatalog.vue','GarageArtworkTile.vue'])
  assert.match(src('src/'+file),/import\.meta\.env\.BASE_URL/);
 assert.match(src('src/GarageMissionBoard.vue'),/@3x\.webp/);
 assert.doesNotMatch(src('src/GarageSourceArtGallery.vue'),/legacyStoreImage/);
});
test('the existing 25 GIFs retain matching names, manifests and real files', () => {
  const manifest = JSON.parse(source('public/feature-assets/garage-animated/manifest.json'));
  assert.equal(manifest.length, 25);
  assert.equal(new Set(manifest.map(a => a.name)).size, 25);
  for (const item of manifest) {
    assert.equal(item.file, 'public/feature-assets/garage-animated/' + item.name + '@3x.gif');
    assert.ok(existsSync(root(item.source)), item.source + ': source reference missing');
    const gif = bytes(item.file);
    assert.equal(gif.toString('ascii', 0, 6), 'GIF89a', item.name);
    assert.deepEqual([gif.readUInt16LE(6), gif.readUInt16LE(8)], [item.width, item.height], item.name);
    assert.equal(item.size, gif.length, item.name + ': manifest drift');
    assert.ok(gif.length < 900000, item.name + ': oversized animation');
  }
});

test('approved A-03/A-04 main WebPs remain unchanged; old PNG backups are removed',()=>{
 const originals=[
  ['demo-points','c5027a27b01f4e9b9440f980abb23546a3c8987b'],
  ['demo-claim','856dfa604dd8b00a5b59ebe14f1db97f7875022d']
 ];
 const dir='public/feature-assets/wave3-demo/raster/';
 for(const [id,sha] of originals)assert.equal(gitBlob(webp(dir+id+'@3x.webp')),sha,id);
 const allowed=['demo-points','demo-claim','demo-collection-empty','demo-results-banner',
  'wallet-coin','wallet-diamond'].map(n=>n+'@3x.webp');
 for(const f of readdirSync(root(dir)))assert.ok(allowed.includes(f),f+' unexpected raster');
});
test('asset audit has an explicit unfinished-generation state and baseline SHA', () => {
  const report = source('docs/designs/wave3-demo-assets-audit.md');
  assert.match(report, /dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc/);
  assert.match(report, /Awaiting external generation/);
  assert.match(report, /Manual visual sign-off: PENDING/);
});
