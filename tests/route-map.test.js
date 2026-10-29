import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { trackPoint } from '../src/track-paths.ts';
import { routePolyline, routeMarker, routeSamples, routeElevationCues } from '../src/route-map.ts';

test('the public route preview is only a single sampled main centreline', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const points = routePolyline(id).split(' ');
    assert.equal(points.length, 128);
    assert.equal(routeSamples(id).length, 128);
    assert.ok(points.every(p => /^\d+\.\d+,\d+\.\d+$/.test(p)));
    assert.equal(routePolyline(id), routePolyline(id));
  }
});
test('markers interpolate the same path and clamp invalid progress', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    assert.deepEqual(routeMarker(id, -50), routeMarker(id, 0));
    assert.deepEqual(routeMarker(id, Infinity), routeMarker(id, 0));
    assert.deepEqual(routeMarker(id, RACE_TRACKS[id].length + 10), routeMarker(id, RACE_TRACKS[id].length));
    assert.notDeepEqual(routeMarker(id, 0), routeMarker(id, RACE_TRACKS[id].length));
  }
});

test('Alpine and Cosmic mark real uphill and downhill stretches on the cached route',()=>{
  for(const id of ['alpine','cosmic']){
    const cues=routeElevationCues(id);
    assert.strictEqual(routeElevationCues(id),cues,'height annotations are not regenerated every frame');
    assert.deepEqual(cues.map(c=>c.direction),['up','down']);
    for(const cue of cues){
      assert.deepEqual({x:cue.x,y:cue.y},routeMarker(id,cue.distance));
      const grade=trackPoint(id,cue.distance+50).y-trackPoint(id,cue.distance-50).y;
      assert.ok(cue.direction==='up'?grade>1.2:grade< -1.2,id+' cue must reflect the actual road elevation');
    }
  }
  for(const id of ['coast','neon','canyon','aurora','spiral','taipei','tokyo','coastal']){
    assert.deepEqual(routeElevationCues(id),[],id+' does not need an elevated mini-map overlay');
  }
});
