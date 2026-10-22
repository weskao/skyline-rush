import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipRgbaRows, photoFov, photoFilename } from '../src/photo-export.js';
test('readPixels origin is flipped to top-down canvas pixels',()=>{
  const bottomLeft=[1,2,3,255],bottomRight=[4,5,6,255],topLeft=[7,8,9,255],topRight=[10,11,12,255];
  const packed=new Uint8Array([...bottomLeft,...bottomRight,...topLeft,...topRight]);
  assert.deepEqual([...flipRgbaRows(packed,2,2)],[...topLeft,...topRight,...bottomLeft,...bottomRight]);
  assert.deepEqual([...packed.slice(0,8)],[...bottomLeft,...bottomRight]);
});
test('FOV is bounded and invalid values use the default',()=>{
  assert.equal(photoFov(20),35);
  assert.equal(photoFov(100),85);
  assert.equal(photoFov(55),55);
  assert.equal(photoFov(NaN),58);
});
test('export filename safely includes a track and fixed date',()=>{
  assert.equal(photoFilename('coast',new Date('2026-10-22T08:09:10Z')),'skyline-rush-coast-20261022-080910.png');
  assert.equal(photoFilename('../evil',new Date('2026-10-22T08:09:10Z')),'skyline-rush-race-20261022-080910.png');
});
test('invalid buffer dimensions throw rather than reading out of bounds',()=>{
  assert.throws(()=>flipRgbaRows(new Uint8Array(4),2,2));
  assert.throws(()=>flipRgbaRows(new Uint8Array(4),0,1));
});
