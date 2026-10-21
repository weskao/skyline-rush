import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace,RACE_TRACKS } from '../src/game.js';
import { previewDistance,previewRival,HERO_PREVIEWS } from '../src/track-preview.js';
for(const id of ['alpine','cosmic']){
 test(id+' home preview stages a drivable visible player and three grounded rivals',()=>{
  const d=previewDistance(id);
  assert.ok(d>500&&d<RACE_TRACKS[id].length);
  const race=createRace(id);
  const rivals=race.rivals.map((r,i)=>previewRival(id,i,r));
  assert.deepEqual(rivals.map(r=>r.distance-d),[12,27,42]);
  assert.ok(rivals.every(r=>r.altitude<1&&Math.abs(r.x)<=5));
  assert.ok(HERO_PREVIEWS[id].cameraBack>=17);
 });
}
test('other tracks keep the original display distance and rival positions',()=>{
 assert.equal(previewDistance('coast'),340);
 const r=createRace('coast').rivals[0];
 assert.equal(previewRival('coast',0,r).distance,375);
 assert.equal(previewRival('coast',0,r).altitude,5);
});
