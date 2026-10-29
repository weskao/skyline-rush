import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parsePerformanceEvidence } from '../src/performance-evidence.ts';

const classic=['coast','neon','canyon','aurora','spiral'];
const tour=['tokyo','alpine','taipei','coastal','cosmic'];
const runs=[
  ...classic.flatMap(track=>[[1440,900],[390,844],[844,390]].map(([width,height])=>({track,width,height}))),
  ...tour.flatMap(track=>[[1440,900],[390,844],[320,740],[844,390]].map(([width,height])=>({track,width,height}))),
];
const emit=(dir,item,drawCalls=200)=>{
  const record=parsePerformanceEvidence({
    ...item,quality:'medium',pixelRatio:.25,browser:'chromium-software-webgl',
    commit:'test-head',drawCalls,triangles:8000,
    line:'FRAME p50 30.0 ms · p95 80.0 ms · 12.5 fps · 3 s',
  });
  const path=join(dir,`render-performance-${item.track}-${item.width}x${item.height}.json`);
  writeFileSync(path,JSON.stringify(record));
  return path;
};
const verify=dir=>spawnSync(process.execPath,
  [new URL('../scripts/verify-performance-evidence.mjs',import.meta.url).pathname,dir],
  { encoding:'utf8',env:{...process.env,GITHUB_SHA:'test-head'} });

test('CI evidence gate requires all 35 ten-track/viewpoint records and rejects major regressions',()=>{
  const dir=mkdtempSync(join(tmpdir(),'skyline-perf-gate-'));
  try {
    const paths=runs.map(x=>emit(dir,x));
    const good=verify(dir);
    assert.equal(good.status,0,good.stderr+good.stdout);
    assert.match(good.stdout,/Recorded 35\/35 mandatory/);
    assert.match(good.stdout,/\| taipei \| 1440×900/);

    unlinkSync(paths[0]);
    const missing=verify(dir);
    assert.notEqual(missing.status,0,'missing evidence cannot silently pass CI');
    assert.match(missing.stdout,/Missing WebGL capture/);
    emit(dir,runs[0]);

    const target=runs.find(x=>x.track==='taipei'&&x.width===1440);
    emit(dir,target,2000);
    const regression=verify(dir);
    assert.notEqual(regression.status,0,'massive extra draw calls must fail the quality gate');
    assert.match(regression.stdout,/pre-pool budget/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
