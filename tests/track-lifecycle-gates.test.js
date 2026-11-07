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
