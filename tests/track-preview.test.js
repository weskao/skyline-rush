import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace,RACE_TRACKS } from '../src/game.js';
import { previewDistance,previewRival,previewPlayer,HERO_PREVIEWS } from '../src/track-preview.ts';
import { WORLD_THEMES } from '../src/world-tour-scene.js';

for(const id of ['taipei','tokyo','alpine','coastal','cosmic']) {
  test(id+' showcase retains the original home-camera distance and hovering vehicle scale',()=>{
    const info=HERO_PREVIEWS[id],d=previewDistance(id),race=createRace(id);
    assert.ok(d>500&&d<RACE_TRACKS[id].length);
    assert.equal(info.cameraSide,8.3);
    assert.equal(info.cameraBack,11.8);
    assert.equal(info.cameraHeight,3.5);
    const player=previewPlayer(id,race.player,3,false,false);
    assert.ok(player.altitude>1.4&&player.altitude<1.8);
    assert.equal(player.thrusting,true);
    const others=race.rivals.map((r,i)=>previewRival(id,i,r,3,false));
    assert.deepEqual(others.map(r=>r.distance-d),[12,27,42]);
    assert.ok(others[0].altitude>4&&others[0].altitude<5);
    assert.equal(others[0].thrusting,true);
    assert.ok(others.slice(1).every(r=>r.altitude===0&&!r.thrusting));
  });
  test(id+' hover animation respects reduced motion while preserving vehicle positioning',()=>{
    const race=createRace(id);
    const flying=previewPlayer(id,race.player,0,false);
    const later=previewPlayer(id,race.player,1,false);
    assert.notEqual(flying.altitude,later.altitude);
    const stopped=previewPlayer(id,race.player,1,true);
    assert.equal(stopped.altitude,1.6);
    assert.equal(stopped.thrusting,false);
    assert.equal(previewRival(id,0,race.rivals[0],1,true).thrusting,false);
  });
}
// Regression: AIRFLOW is a grounded aerodynamic showroom on every map,
// including landmark-curated and future (uncurated) routes. The normal hero
// remains airborne until the player explicitly enables AIRFLOW.
test('AIRFLOW grounds the preview player on all ten routes and new routes',()=>{
  const sample = createRace('coast').player;
  for (const id of [...Object.keys(RACE_TRACKS), 'future-road']) {
    const flying=previewPlayer(id,sample,3,false,false);
    const grounded=previewPlayer(id,sample,3,false,true);
    assert.ok(flying.altitude>1.4, `${id}: non-AIRFLOW keeps the airborne hero`);
    assert.equal(flying.thrusting,true, `${id}: airborne hero uses jet effects`);
    assert.equal(grounded.altitude,0, `${id}: AIRFLOW must put wheels on road`);
    assert.equal(grounded.thrusting,false, `${id}: no hover jets in AIRFLOW`);
    assert.equal(grounded.x,sample.x, `${id}: keep lateral lane position`);
  }
});

for(const [id,kind] of [['taipei','office'],['tokyo','tower'],['alpine','mountain'],['coastal','lighthouse'],['cosmic','cosmic-gate']]) {
  test(id+' home showcase frames its signature landmark from open road',()=>{
    const info=HERO_PREVIEWS[id],landmark=WORLD_THEMES[id].landmarks.find(l=>l.kind===kind);
    assert.equal(info.landmark,kind);
    const ahead=landmark.at-info.distance;
    assert.ok(ahead>150&&ahead<600,'landmark must sit ahead of the showcase camera');
    // Neither the camera (12 m behind the car) nor the landmark may sit in a
    // tunnel or shortcut, and the plaza keeps props out of the sightline.
    // Crosswind / uphill stretches are open road and do not hide the view.
    for(const s of RACE_TRACKS[id].sections.filter(s=>['tunnel','boost-tunnel','shortcut'].includes(s.type))){
      assert.ok(info.distance-info.cameraBack-5>=s.to||info.distance+5<=s.from,`${id} camera inside ${s.type}`);
      assert.ok(landmark.at>=s.to||landmark.at<=s.from,`${id} landmark inside ${s.type}`);
    }
    assert.ok(landmark.at-landmark.plaza<=info.distance,'plaza must start at the showcase');
  });
}
test('all original tracks retain their original player/rival animation and home preview distance',()=>{
  const r=createRace('coast');
  assert.equal(previewDistance('coast'),340);
  assert.equal(previewPlayer('coast',r.player,0,false,false).thrusting,true);
  assert.equal(previewPlayer('coast',r.player,0,false,true).altitude,0);
  const rival=previewRival('coast',0,r.rivals[0]);
  assert.equal(rival.distance,375);
  assert.equal(rival.altitude,5);
  assert.equal(rival.thrusting,true);
});
