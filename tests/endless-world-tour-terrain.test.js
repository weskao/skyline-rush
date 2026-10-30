import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneryKit, SCENERY_CHUNK_METRES } from '../src/world-tour-scenery.js';
import { RACE_TRACKS } from '../src/game.js';

test('alpine/coastal Endless terrain is a bounded two-bank ribbon past the finite course', () => {
  const kit = createSceneryKit();
  try {
    for (const id of ['alpine','coastal']) {
      const beyond = Math.ceil(RACE_TRACKS[id].length / SCENERY_CHUNK_METRES) + 12;
      for (const chunk of [beyond,beyond+300]) {
        const finite = kit.terrain(id,chunk,false);
        const endless = kit.terrain(id,chunk,false,true);
        assert.equal(finite.children.length,0,'original sprint terrain still ends at the authored finish');
        assert.equal(endless.children.length,2,`${id} should retain two continuous landscape banks`);
        for(const mesh of endless.children) {
          assert.ok(mesh.geometry.attributes.position.count <= 44,'terrain geometry stays bounded per 120m chunk');
          const position=mesh.geometry.attributes.position.array;
          assert.ok([...position].every(Number.isFinite), 'world-space terrain vertices must be finite');
          mesh.geometry.dispose();
        }
        for(const mesh of finite.children) mesh.geometry.dispose();
      }
    }
  } finally { kit.dispose(); }
});
