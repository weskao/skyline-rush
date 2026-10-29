import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
const section=(name,next)=>workflow.split('  '+name+':')[1]?.split('  '+next+':')[0]||'';

test('responsive layout executes inside Browser shard 1 after screenshot artifacts are uploaded',()=>{
  const browser=section('browser-tests','cloud-save');
  const cloud=section('cloud-save','world-tour-mid-race');
  const shots=browser.indexOf('Upload actual World Tour screenshots');
  const layout=browser.indexOf('Verify responsive layout for final refactor or World Tour polish');
  assert.ok(layout>shots&&shots>=0,'do not let layout clean the WebGL artifacts before upload');
  assert.ok(browser.includes("feature/all-tracks-render-cache"),'run layout in the all-track optimization branch');
  assert.ok(browser.includes("refs/heads/main"),'protect main after integration too');
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

test('focused refactor CI skips artifact download and performance gate when Browser is intentionally skipped',()=>{
  const quality=section('quality-gate','release-verified');
  for(const marker of ['- uses: actions/download-artifact@v4',
    '- name: Verify software-WebGL evidence coverage and rendering budgets']){
    const index=quality.indexOf(marker);
    assert.ok(index>=0,'missing gate: '+marker);
    const preceding=quality.slice(0,index).trimEnd().split('\n').slice(-2).join('\n');
    assert.match(preceding,/if:.*refactor.*full.regression/,
      'performance gate must only run for full Browser CI, not focused refactor CI');
  }
});
