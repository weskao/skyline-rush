import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { collectState } from './track-lifecycle/collect.mjs';
import { checkCourse, checkCatalog, checkRelease, nextGates } from './track-lifecycle/gates.mjs';

const root=process.cwd();
const flag=process.argv[2], target=process.argv[3];
const state=await collectState(root);
let checks=[];
if(flag==='--stage') {
  const course=state.courses.find(c=>c.id===target);
  if(!course) {console.error('FAIL '+target+' UNKNOWN');process.exitCode=1;}
  else console.log(target+': '+course.stage+'; next gates: '+(nextGates(course).join(', ') || 'none'));
} else if(flag==='--release') {
  const course=state.courses.find(c=>c.id===target);
  checks=course?checkRelease(target,course,state.approvals):[{id:target,gate:'RELEASE',ok:false,reason:'unknown course'}];
  for(const c of checks) console.log((c.ok?'PASS':'FAIL')+' '+c.id+' '+c.gate+(c.ok?'':' '+c.reason));
  if(checks.every(c=>c.ok)) {
    const path=join(root,'docs/track-lifecycle/'+target+'.md');
    const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    const file=readFileSync(path,'utf8');
    if(/\breleased-at:\s*[a-f0-9]{7,40}\b/i.test(file)) console.error('Already stamped; do not stamp twice.');
    else appendFileSync(path,'\nreleased-at: '+sha+'\n');
    console.log('Next: move to RACE_TRACKS, migrate results, remove Coming Soon view, add release notes and run full regression.');
  }
} else if(flag===undefined) {
  checks=[...state.courses.flatMap(checkCourse),...checkCatalog(state)];
  for(const c of checks) console.log((c.ok?'PASS':'FAIL')+' '+c.id+' '+c.gate+(c.ok?'':' '+c.reason));
} else {
  console.error('Usage: node scripts/check-track-lifecycle.mjs [--stage <id> | --release <id>]');
  process.exitCode=1;
}
if(checks.some(x=>!x.ok))process.exitCode=1;
