import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { jpegSize } from '../scripts/track-lifecycle/gates.mjs';
import { RACE_TRACKS } from '../src/race-tracks.ts';

test('each classic track has its own 1136 × 410 teaser JPEG', async () => {
  const hashes = new Set();
  for (const id of Object.keys(RACE_TRACKS)) {
    const path = new URL(`../public/track-teasers/${id}.jpg`, import.meta.url);
    const jpeg = await readFile(path).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      assert.fail(`${id} is missing its track teaser JPEG`);
    });
    assert.deepEqual(jpegSize(jpeg), { width: 1136, height: 410 }, id);
    const hash = createHash('sha256').update(jpeg).digest('hex');
    assert.ok(!hashes.has(hash), `${id} reuses another track's teaser`);
    hashes.add(hash);
  }
});
