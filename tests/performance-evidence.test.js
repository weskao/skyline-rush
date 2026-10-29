import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePerformanceEvidence,
  comparePerformanceEvidence,
  checkPerformanceEvidenceCoverage,
  WORLD_TOUR_SOFTWARE_BASELINE,
} from '../src/performance-evidence.ts';

const sample = (overrides={}) => ({
  track:'taipei', quality:'medium', width:1440, height:900, pixelRatio:.25,
  browser:'chromium-software-webgl', commit:'f2e32feb', drawCalls:532, triangles:60000,
  line:'FRAME p50 50.0 ms · p95 80.0 ms · 12.5 fps · 5 s', ...overrides,
});

test('read exact WebGL draw/frame metrics into finite versioned records', () => {
  const result=parsePerformanceEvidence(sample());
  assert.deepEqual(result,{
    version:1,source:'software-webgl-ci',track:'taipei',quality:'medium',
    viewport:{width:1440,height:900,pixelRatio:.25},browser:'chromium-software-webgl',
    commit:'f2e32feb',drawCalls:532,triangles:60000,p50Ms:50,p95Ms:80,
    fps:12.5,windowSeconds:5,
  });
  assert.equal(WORLD_TOUR_SOFTWARE_BASELINE.taipei.drawCalls,839);
});

test('reject incomplete, invalid or misleading metrics instead of recording zero FPS', () => {
  for(const input of [
    sample({line:'FRAME p50 0.0 ms · p95 0.0 ms · 0 fps · 0 s'}),
    sample({line:'FRAME p50 92.0 ms · p95 50.0 ms · 12 fps · 4 s'}),
    sample({drawCalls:NaN}),sample({triangles:-1}),
    sample({pixelRatio:0}),sample({quality:'ultra'}),
    sample({line:'unknown timing line'}),
  ]) assert.throws(()=>parsePerformanceEvidence(input));
});

test('only compare equal track, quality, size, pixel ratio and browser context', () => {
  const baseline=parsePerformanceEvidence(sample({commit:'before',drawCalls:839,triangles:55000}));
  const after=parsePerformanceEvidence(sample({commit:'after',drawCalls:532,triangles:60000}));
  const result=comparePerformanceEvidence(baseline,after);
  assert.equal(result.comparable,true);
  assert.equal(result.drawCallsDelta,-307);
  assert.equal(result.trianglesDelta,5000);
  assert.ok(result.drawCallsPercent< -36 && result.drawCallsPercent> -37);
  for(const bad of [
    sample({quality:'high'}),sample({width:390}),sample({pixelRatio:1}),
    sample({browser:'hardware-webgl'}),sample({track:'tokyo'}),
  ]) {
    const comparison=comparePerformanceEvidence(baseline,parsePerformanceEvidence(bad));
    assert.equal(comparison.comparable,false);
    assert.equal(comparison.drawCallsPercent,null);
  }
});

test('all-ten-track screenshot coverage must be unique and complete', () => {
  const tracks=['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic'];
  const records=tracks.map(track=>parsePerformanceEvidence(sample({track})));
  const ok=checkPerformanceEvidenceCoverage(records,tracks.map(track=>({track,width:1440,height:900,quality:'medium'})));
  assert.deepEqual(ok,{missing:[],duplicates:[]});
  const bad=checkPerformanceEvidenceCoverage([...records,records[0]],[
    ...tracks.map(track=>({track,width:1440,height:900,quality:'medium'})),
    {track:'coast',width:390,height:844,quality:'medium'},
  ]);
  assert.ok(bad.duplicates.includes('coast/1440x900/medium'));
  assert.ok(bad.missing.includes('coast/390x844/medium'));
});
