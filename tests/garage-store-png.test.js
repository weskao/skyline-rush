import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const names = ['store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection'];
const folder = new URL('../public/feature-assets/garage-store-readiness/raster/', import.meta.url);

function inspect(name) {
  const b = readFileSync(new URL(name + '@3x.png', folder));
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name + ': real PNG signature');
  let w=0, h=0, type=-1, bytes=[];
  for(let i=8; i<b.length;) {
    const len=b.readUInt32BE(i), key=b.toString('ascii',i+4,i+8);
    if(key==='IHDR'){w=b.readUInt32BE(i+8); h=b.readUInt32BE(i+12); type=b[i+17];}
    if(key==='IDAT') bytes.push(b.subarray(i+8,i+8+len));
    i+=12+len;
    if(key==='IEND') break;
  }
  assert.deepEqual([w,h,type],[216,216,6], name + ': RGBA 3× raster');
  const pixels=inflateSync(Buffer.concat(bytes));
  let left=w, top=h, right=-1, bottom=-1, transparent=0, filled=0, vivid=0;
  const palette=new Set();
  for(let y=0;y<h;y++){
    assert.equal(pixels[y*(w*4+1)],0,name + ': expected unfiltered RGBA rows');
    for(let x=0;x<w;x++){
      const i=y*(w*4+1)+1+x*4, a=pixels[i+3];
      if(a===0)transparent++;
      if(a<=16)continue;
      filled++;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      const r=pixels[i],g=pixels[i+1],blue=pixels[i+2],v=Math.max(r,g,blue),lo=Math.min(r,g,blue);
      if(v>127 && (v-lo)/Math.max(v,1)>.55)vivid++;
      palette.add(`${r>>4}-${g>>4}-${blue>>4}`);
    }
  }
  assert.ok(filled>1500 && transparent>2000,name + ': real transparent independent artwork');
  assert.ok(left>=20 && top>=20 && right<=195 && bottom<=195,name + ': safety margins');
  assert.ok(vivid/filled>.24,name + ': retain colorful neon art');
  assert.ok(palette.size>350,name + ': retain rich gradient details');
  return createHash('sha256').update(b).digest('hex');
}

test('six independent 216×216 true-alpha 3× Store PNG assets with safe margins', () => {
  const checksums=names.map(inspect);
  assert.equal(new Set(checksums).size,names.length,'no duplicate or reused unrelated product artwork');
});
