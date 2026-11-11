import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { decodePngRgba, alphaComponentSizes } from './helpers/png-rgba.js';
import { WAVE3_PREVIEW_CATALOG } from '../src/garage-wave3-preview-catalog.ts';

// Pinned original archives and runtime revisions: a repair must be explicitly
// approved and accompanied by a changed baseline + before/after evidence.
const originals = [
  ['mission-race', '29ef3c4428a90e245146d38852a1870aff3b467a', 'dd62626ba5dda50a5055913604a578d9af5fcd0b'],
  ['mission-time', 'a34c583f513ec47fd8c78574390cbe41aa90757c', 'd7d0577e981acb185e121f179ad451fd964beb9c'],
  ['mission-drift', '01c89de3dc38103f5a55ccbd0f15c0ad50038736', '2254190d54337a072331b52c106427b747a79007'],
  ['mission-combo', '50274af65f5eb7270ced933e29f52e659b062fb8', 'bbd394fb034e099247e0df89bc05d4cf0003e919'],
  ['trophy-bronze', '02e0cdc6c95cfca90a3f8c81bcc64d9d8d69f674', '5d9c00546f088b42ec16678679557dcd69b425f5'],
  ['trophy-silver', '14060c3c0ce8c9b4b2ffae0e528894de26a6c0a6', '32f9f0cc202295ebffd41983d2fdd697beecde7f'],
  ['trophy-gold', '93097c103bddbe8e4aac1302ba9df467b83ae12b', 'b9c14b7cf044972d6c798384c151ff65382c19db'],
  ['trophy-platinum', '728fa01f442db9e6ae0793b9c9170cd39d088bc0', '2dbb9945800a20a598143e1f52de1bc2b36bb353'],
  ['store-cart', '87614922a57a1ad9b0a068db2a9c664491d01c60', '9dcd7fb18d83e7811f8d1e12f185646644b16da6', '1bfc221dfc6c454fb1834324699c9f1486358b66'],
  ['store-box', '529df6e087571fa4adef7435bab887e7452f831e', '26d64f8bdcc729276996fb30cdba7123cbd0aa01', '4919f83451672fd8031b0b5f491846ee76cf98ba'],
  ['store-bundle', '64de8dcb4429994a029a5f6bb86dc44d08e21129', 'a1692822de25afee72f515797aed9d461a8859dd', '560b72ccca71593b2536e58ce9288a7fee681775'],
  ['store-tag', 'e5a9690f2d318f054c0ccf81afca1aeeb986d32f', 'dd8fff4e72873c3c37667d3bd95c231a07f91402', '2055041f122c4e571b876f1b3d31b3bd002d5655'],
  ['store-star', '9bb8af9589d711e4656d145b3301bc647cc87ffd', '24863d81f973a817fe22cd89ab91171dcc2c4b4e', '5112dfc7bfde28aa24374a945edf7c4035bc4cd3'],
  ['store-collection', 'b55e84a485eef3164a5955f98bfe0d4b2e2173a6', '72a8c4ec3fcdfa27098a67be3c7ca50f4e67432a', '4bda9a899a3529292b0a573de7b4eeeb3f6f90dc'],
];
const root = path => new URL('../' + path, import.meta.url);
const bytes = path => readFileSync(root(path));
const source = path => bytes(path).toString('utf8');
const gitBlob = b => createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
const category = id => id.startsWith('store-') ? 'garage-store-readiness' : 'garage-rewards-and-missions';

function alphaInsets(image) {
  const { width, height, pixels } = image;
  let left = width, top = height, right = -1, bottom = -1;
  let translucent = 0, transparent = 0, painted = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const a = pixels[(y * width + x) * 4 + 3];
    if (a === 0) transparent++;
    if (a > 0 && a < 255) translucent++;
    if (a <= 16) continue;
    painted++;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  assert.ok(painted > 1000 && transparent > 1000 && translucent > 0,
    'real independently decoded transparent RGBA artwork');
  return [left, top, width - right - 1, height - bottom - 1];
}

test('original fourteen 3x WebPs and current PNG / repaired WebP revisions remain source-locked', () => {
  for (const [id, originalSha, pngSha, repairedWebpSha] of originals) {
    const folder = category(id);
    const archive = bytes('docs/designs/3x-asset-library/webp/' + folder + '/' + id + '@3x.webp');
    const runtime = 'public/feature-assets/' + folder + '/raster/' + id + '@3x.';
    assert.equal(gitBlob(archive), originalSha, id + ': approved archival source was altered');
    assert.equal(gitBlob(bytes(runtime + 'webp')), repairedWebpSha || originalSha,
      id + ': WebP was changed without an approved source-linked repair');
    assert.equal(gitBlob(bytes(runtime + 'png')), pngSha,
      id + ': PNG changed; record approved before/after screenshots and update this baseline');
  }
});

test('all fourteen runtime PNGs decode at real 3x with alpha edges and no clipped visible silhouette', () => {
  for (const [id] of originals) {
    const store = id.startsWith('store-');
    const file = 'public/feature-assets/' + category(id) + '/raster/' + id + '@3x.png';
    const img = decodePngRgba(bytes(file));
    assert.deepEqual([img.width, img.height], store ? [216, 216] : [288, 288], id);
    const inset = alphaInsets(img);
    assert.ok(inset.every(edge => edge >= 20), id + ': clipped alpha / highlight at alpha >16: ' + inset);
    assert.ok(alphaComponentSizes(img)[0] > 1000, id + ': incomplete main object / neighboring fragment');
  }
});

test('catalog ids, runtime source paths and 1x CSS sizes agree with the actual mounted screens', () => {
  for (const [key, css, px] of [
    ['garage-rewards-and-missions', 96, 288], ['garage-store-readiness', 72, 216],
  ]) {
    const cfg = WAVE3_PREVIEW_CATALOG[key];
    assert.deepEqual([cfg.cssSize, cfg.sourcePx], [css, px]);
    assert.deepEqual(cfg.items.map(item => item.id), originals.filter(([id]) =>
      category(id) === key).map(([id]) => id));
    for (const item of cfg.items) {
      assert.ok(item.name.en && item.name['zh-TW'], item.id + ': localized live caption');
      assert.ok(existsSync(root('public/feature-assets/' + key + '/raster/' + item.id + '@3x.png')));
    }
  }
  for (const file of ['GarageMissionBoard.vue', 'GarageSourceArtGallery.vue',
    'GarageSkinCatalog.vue', 'GarageArtworkTile.vue']) {
    assert.match(source('src/' + file), /import\.meta\.env\.BASE_URL/, file + ': Vite subpath support');
  }
  assert.match(source('src/GarageMissionBoard.vue'), /@3x\.png/);
  assert.match(source('src/GarageSourceArtGallery.vue'), /legacyStoreImage/);
  assert.match(source('src/GarageArtworkTile.vue'), /object-fit:\s*contain/);
  assert.match(source('src/GarageArtworkTile.vue'), /padding:\s*8px/);
  assert.match(source('src/GarageArtworkImage.vue'), /animationFailed\.value = true/);
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

test('A-03 and A-04 exact approved 216px WebP + PNG assets have safe RGBA source insets', () => {
  const dir = 'public/feature-assets/wave3-demo/raster/';
  const approved = [
    ['demo-points', 'c5027a27b01f4e9b9440f980abb23546a3c8987b', '1e42ee8cafd6c3bee1c5993497df7d6cdbecc9d7'],
    ['demo-claim', '856dfa604dd8b00a5b59ebe14f1db97f7875022d', '7901ff2864dd5d3c4d0f3aae986284f36ed6a173'],
  ];
  const allowed = [...approved.flatMap(([id]) => [id + '@3x.webp', id + '@3x.png']),
    'demo-collection-empty@3x.webp',
    'demo-results-banner@3x.webp',
    'wallet-coin@3x.png', 'wallet-diamond@3x.png', 'wallet-sparkle-strip.png'];
  for (const file of readdirSync(root(dir)).filter(name => !name.startsWith('.'))) {
    assert.ok(allowed.includes(file), file + ': unapproved art');
  }
  for (const [id, webpSha, pngSha] of approved) {
    const webp = bytes(dir + id + '@3x.webp');
    assert.equal(gitBlob(webp), webpSha, id + ': WebP differs from approved source');
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
    assert.equal(webp.readUInt32LE(4) + 8, webp.length);
    const png = bytes(dir + id + '@3x.png');
    assert.equal(gitBlob(png), pngSha, id + ': PNG backup differs from approved source');
    const image = decodePngRgba(png);
    assert.deepEqual([image.width, image.height], [216, 216]);
    assert.ok(alphaInsets(image).every(edge => edge >= 20), id + ': unsafe transparent edge');
  }
  const art = source('src/wave3-demo-art.ts');
  assert.match(art, /import\.meta\.env\.BASE_URL/);
  for (const id of ['demo-points', 'demo-claim']) assert.match(art, new RegExp(id));
});

test('asset audit has an explicit unfinished-generation state and baseline SHA', () => {
  const report = source('docs/designs/wave3-demo-assets-audit.md');
  assert.match(report, /dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc/);
  assert.match(report, /Awaiting external generation/);
  assert.match(report, /Manual visual sign-off: PENDING/);
});
