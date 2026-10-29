import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { SECTION_SIGN_LABELS, sectionSignKey } from '../src/section-signs.ts';

test('every gameplay section type, including World Tour speed tunnels, has a renderable sign',()=>{
 const sectionTypes=new Set(Object.values(RACE_TRACKS).flatMap(track=>track.sections.map(s=>s.type)));
 for(const type of sectionTypes){
  assert.equal(typeof SECTION_SIGN_LABELS[type],'string',type+' needs a material label');
  assert.ok(SECTION_SIGN_LABELS[type].length>2);
  assert.equal(sectionSignKey(type),type);
 }
});
test('future unknown section types always resolve to an existing fallback material',()=>{
 assert.equal(sectionSignKey('boost-tunnel'),'boost-tunnel');
 assert.equal(sectionSignKey('not-yet-supported'),'gap');
 assert.equal(sectionSignKey(''),'gap');
});
