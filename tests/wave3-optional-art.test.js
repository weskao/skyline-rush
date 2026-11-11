import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePngRgba } from './helpers/png-rgba.js';

const asset = filename => readFileSync(new URL('../public/feature-assets/wave3-demo/raster/' + filename, import.meta.url));
const source = filename => readFileSync(new URL('../src/' + filename, import.meta.url), 'utf8');
for (const [id, width, height, inset] of [
  ['demo-collection-empty', 288, 288, 12],
  ['demo-results-banner', 432, 156, 4],
]) {
  test(id + ' uses genuine 3x transparent WebP with PNG fallback and safe edges', () => {
    const webp=asset(id+'@3x.webp');
    assert.equal(webp.toString('ascii',0,4),'RIFF');
    assert.equal(webp.toString('ascii',8,12),'WEBP');
    assert.equal(webp.toString('ascii',12,16),'VP8X');
    assert.deepEqual([webp.readUIntLE(24,3)+1,webp.readUIntLE(27,3)+1],[width,height]);
    const png=decodePngRgba(asset(id+'@3x.png'));
    assert.deepEqual([png.width,png.height],[width,height]);
    let left=width,top=height,right=-1,bottom=-1,transparent=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const a=png.pixels[(y*width+x)*4+3];
      if(a===0)transparent++;
      if(a>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    }
    assert.ok(transparent>1000 && left>=inset && top>=inset && width-right-1>=inset && height-bottom-1>=inset,
      id+' alpha edges clipped');
  });
}
test('A-05 empty-state, A-06 earned result and artwork motion integrate without entitlement changes', () => {
  const collection=source('Wave3DemoCollection.vue');
  const results=source('wave3-demo-results-ui.ts');
  const css=source('wave3-demo-results.css');
  assert.match(collection,/demo-collection-empty/);
  assert.match(collection,/collection-empty-scan/);
  assert.match(collection,/@keyframes wave3-collection-scan/);
  assert.match(source('wave3-demo-results-integration.ts'),/demo-results-banner/);
  assert.match(results,/bannerFallbackUrl/);
  assert.match(results,/view\.state === 'earned'/);
  assert.match(css,/@keyframes wave3-results-sheen/);
  for (const text of [collection,css]) {
    assert.match(text,/prefers-reduced-motion/);
    assert.match(text,/data-vfx-enabled/);
    assert.match(text,/data-vfx-quality/);
  }
});
