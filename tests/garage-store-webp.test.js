import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const names=['store-cart','store-box','store-bundle','store-tag','store-star','store-collection'];
const folder=new URL('../public/feature-assets/garage-store-readiness/raster/',import.meta.url);

test('six independently encoded true-alpha Store WebPs have native 216×216 pixels and safe names',()=>{
 const signatures=[];
 for(const name of names){
  const b=readFileSync(new URL(name+'@3x.webp',folder));
  assert.equal(b.toString('ascii',0,4),'RIFF',name);
  assert.equal(b.toString('ascii',8,12),'WEBP',name);
  assert.equal(b.readUInt32LE(4)+8,b.length,name);
  const codec=b.toString('ascii',12,16);
  let size;
  if(codec==='VP8L'){
    assert.equal(b[20],0x2f,name+': lossless header');
    const packed=b.readUInt32LE(21);
    assert.equal((packed>>>28)&1,1,name+': transparent WebP');
    size=[1+(packed&0x3fff),1+((packed>>>14)&0x3fff)];
  }else{
    assert.equal(codec,'VP8X',name+': extended WebP header');
    assert.equal(b[20]&0x10,0x10,name+': transparent WebP');
    size=[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  }
  assert.deepEqual(size,[216,216],name+': 3x the 72 CSS pixel gallery artwork');
  signatures.push(createHash('sha256').update(b).digest('hex'));
 }
 assert.equal(new Set(signatures).size,names.length,'six real distinct Store illustrations');
 assert.ok(readdirSync(folder).every(file=>!file.endsWith('.png')),'no PNG runtime fallback');
});
