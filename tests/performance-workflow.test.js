import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
const section=(name,next)=>workflow.split('  '+name+':')[1]?.split('  '+next+':')[0]||'';

test('Browser shards upload their WebGL evidence and run no second Playwright suite that would clean it',()=>{
  const browser=section('browser-tests','cloud-save');
  const cloud=section('cloud-save','world-tour-mid-race');
  assert.ok(browser.indexOf('Upload actual World Tour screenshots')>=0,'World Tour screenshots are uploaded from the shards');
  // Playwright cleans test-results at the start of a run; the layout specs already run inside the shards.
  assert.ok(!browser.includes('test:layout'),'one Playwright run per shard');
  assert.ok(!cloud.includes('matrix.shard')&&!cloud.includes('test:layout'),'cloud-save is not a Browser matrix job');
});

test('CI quality-gate validates complete structured WebGL output before reporting success',()=>{
  const browser=section('browser-tests','cloud-save');
  const quality=section('quality-gate','release-verified');
  assert.ok(browser.includes('Upload structured WebGL performance evidence'));
  assert.ok(quality.includes('actions/download-artifact@v4'));
  assert.ok(quality.includes('scripts/verify-performance-evidence.mjs'));
  assert.ok(quality.includes('Require every verification suite to pass'));
});

test('focused branch CI skips artifact download and performance gate when Browser is intentionally skipped',()=>{
  const quality=section('quality-gate','release-verified');
  for(const marker of ['- uses: actions/download-artifact@v4',
    '- name: Verify software-WebGL evidence coverage and rendering budgets']){
    const index=quality.indexOf(marker);
    assert.ok(index>=0,'missing gate: '+marker);
    const stepLines=quality.slice(index).split('\n').slice(0,3).join('\n');
    assert.match(stepLines,/if:.*refs\/heads\/develop.*full.regression/,
      'performance gate must only run for full Browser CI, not focused branch CI');
  }
});
