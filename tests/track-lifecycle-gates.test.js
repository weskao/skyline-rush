import test from 'node:test';
import assert from 'node:assert/strict';
import { jpegSize, parseEvidence, parseApprovals, R_GATES } from '../scripts/track-lifecycle/gates.mjs';

test('JPEG marker parser gets dimensions from the SOF segment', () => {
  const jpeg = Uint8Array.from([0xff,0xd8,0xff,0xe0,0,4,0,0,0xff,0xc0,0,11,8,0,205,2,56,3,1,0,2,0x11,3,0x11,0xff,0xd9]);
  assert.deepEqual(jpegSize(jpeg), { width: 568, height: 205 });
  assert.equal(jpegSize(Uint8Array.of(0x89,0x50)), null);
});

test('R gate evidence requires tick and a hex SHA', () => {
  const e = parseEvidence('- [x] R1 Desktop and phone — sha: abc1234\n- [x] R2 collision — sha: xyz\nreleased-at: deadbeef1');
  assert.deepEqual(R_GATES, ['R1','R2','R3','R4','R5','R6']);
  assert.deepEqual(e.gates.R1, { ticked:true, sha:'abc1234' });
  assert.deepEqual(e.gates.R2, { ticked:true, sha:null });
  assert.deepEqual(e.gates.R6, { ticked:false, sha:null });
  assert.equal(e.releasedAt, 'deadbeef1');
});

test('release approval must be ticked under the exact approval heading', () => {
  const markdown = '## Random\n- [x] RELEASE APPROVED: wrong\n## Track release approvals\n- [x] RELEASE APPROVED: frostbite-canyon\n- [X] RELEASE APPROVED: monsoon-ruins\n- [ ] RELEASE APPROVED: skyfall-archipelago\n## Next\n- [x] RELEASE APPROVED: volcanic-crown';
  assert.deepEqual([...parseApprovals(markdown)].sort(), ['frostbite-canyon','monsoon-ruins']);
});


const validPreview = () => ({
  id:'dune-tempest', stage:'preview', names:{ en:'Dune Tempest', 'zh-TW':'沙暴裂谷' },
  teaserJpeg: Uint8Array.from([255,216,255,192,0,11,8,0,205,2,56,3,1,0,2,17,3,17,255,217]),
  routeSvgExists:true, hasEnvironment:true, productionEnterable:false,
  productionAvailableWithStaleUnlock:false, homeStatuses:['coming-soon','coming-soon'],
  raceTrackDefined:false, devModeCompatible:true, unitTestExists:false, browserSpecExists:false,
  developmentEnterable:false, evidence:null,
});
const gate = (results, id) => results.find(x => x.gate === id);

test('preview check evaluates every mandatory P gate', async () => {
  const {checkCourse} = await import('../scripts/track-lifecycle/gates.mjs');
  assert.ok(checkCourse(validPreview()).every(g => g.ok));
  const cases = [
    [{teaserJpeg:Uint8Array.of(0x89,0x50)},'P1'],
    [{routeSvgExists:false},'P2'],
    [{hasEnvironment:false},'P3'],
    [{names:{en:'Dune', 'zh-TW':''}},'P4'],
    [{productionEnterable:true},'P5'],
    [{productionAvailableWithStaleUnlock:true},'P5'],
    [{homeStatuses:['coming-soon','unlocked']},'P6'],
  ];
  for(const [patch,id] of cases) assert.equal(gate(checkCourse({...validPreview(),...patch}),id)?.ok,false,id);
});

test('playable must have engine, tests, and development entry', async () => {
  const {checkCourse} = await import('../scripts/track-lifecycle/gates.mjs');
  const base={...validPreview(),stage:'playable',raceTrackDefined:true,devModeCompatible:true,unitTestExists:true,browserSpecExists:true,developmentEnterable:true};
  assert.ok(checkCourse(base).every(g=>g.ok));
  for(const [patch,id] of [[{devModeCompatible:false},'D1'],[{browserSpecExists:false},'D2'],[{developmentEnterable:false},'D3']])
    assert.equal(gate(checkCourse({...base,...patch}),id)?.ok,false,id);
});

test('ready refuses empty or invalid evidence, nextGates lists R gates', async () => {
  const {checkCourse,nextGates} = await import('../scripts/track-lifecycle/gates.mjs');
  const base={...validPreview(),stage:'playable',raceTrackDefined:true,devModeCompatible:true,unitTestExists:true,browserSpecExists:true,developmentEnterable:true};
  assert.deepEqual(nextGates(base),R_GATES);
  const result=checkCourse({...base,stage:'ready'});
  for(const id of R_GATES) assert.equal(gate(result,id)?.ok,false,id);
  const records=Object.fromEntries(R_GATES.map(k=>[k,{ticked:true,sha:'abcdef1'}]));
  assert.equal(gate(checkCourse({...base,stage:'ready',evidence:{gates:{...records,R4:{ticked:true,sha:null}},releasedAt:null}}),'R4')?.ok,false);
  assert.ok(checkCourse({...base,stage:'ready',evidence:{gates:records,releasedAt:null}}).every(g=>g.ok));
});

test('released catalog rejects unapproved, duplicated, and stamped upcoming courses', async () => {
  const {LEGACY_RELEASED_TRACKS,checkCatalog} = await import('../scripts/track-lifecycle/gates.mjs');
  assert.deepEqual(LEGACY_RELEASED_TRACKS, ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']);
  const input = {raceTrackIds:[...LEGACY_RELEASED_TRACKS,'new-race'],upcomingIds:[],evidenceById:new Map(),approvals:new Set()};
  assert.equal(checkCatalog(input).some(x=>!x.ok),true);
  const withApproval={...input,evidenceById:new Map([['new-race',{releasedAt:'abcd1234'}]]),approvals:new Set(['new-race'])};
  assert.ok(checkCatalog(withApproval).every(x=>x.ok));
  assert.equal(checkCatalog({...withApproval,upcomingIds:['new-race']}).some(x=>!x.ok),true);
  assert.equal(checkCatalog({...withApproval,upcomingIds:['other'],evidenceById:new Map([['new-race',{releasedAt:'abcd1234'}],['other',{releasedAt:'abc1234'}]])}).some(x=>!x.ok),true);
});

test('release requires ready R-gates and explicit approval', async () => {
  const {checkRelease} = await import('../scripts/track-lifecycle/gates.mjs');
  const evidence={gates:Object.fromEntries(R_GATES.map(id=>[id,{ticked:true,sha:'abcdef1'}])),releasedAt:null};
  const course={...validPreview(),stage:'ready',raceTrackDefined:true,devModeCompatible:true,unitTestExists:true,browserSpecExists:true,developmentEnterable:true,evidence};
  const approvals=new Set(['dune-tempest']);
  assert.ok(checkRelease('dune-tempest',course,approvals).every(x=>x.ok));
  assert.ok(checkRelease('dune-tempest',{...course,stage:'playable'},approvals).some(x=>!x.ok));
  assert.ok(checkRelease('dune-tempest',course,new Set()).some(x=>!x.ok));
  assert.ok(checkRelease('dune-tempest',{...course,evidence:{gates:{...evidence.gates,R3:{ticked:false,sha:null}},releasedAt:null}},approvals).some(x=>!x.ok));
});
