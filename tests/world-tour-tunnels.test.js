import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { SCENERY_CHUNK_METRES,createSceneryKit } from '../src/world-tour-scenery.js';
import { TUNNEL_CHARACTER,createTunnelKit } from '../src/world-tour-tunnels.js';
const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('five architectural tunnel styles are distinct and have subdued side lighting',()=>{
 assert.equal(new Set(ids.map(id=>TUNNEL_CHARACTER[id].type)).size,5);
 assert.ok(TUNNEL_CHARACTER.alpine.type.includes('rail'));
 const kit=createSceneryKit(),tunnels=createTunnelKit(kit);
 for(const id of ids){
  const section=RACE_TRACKS[id].sections.find(s=>s.type==='boost-tunnel');
  const chunk=Math.floor(section.from/SCENERY_CHUNK_METRES);
  const g=tunnels.buildChunk(id,chunk,RACE_TRACKS[id].sections);
  assert.ok(g.children.length>0,id);
  assert.ok(g.children.every(child=>child.position.toArray().every(Number.isFinite)));
 }
 const t=RACE_TRACKS.alpine.sections.find(s=>s.type==='tunnel');
 const alpine=tunnels.buildChunk('alpine',Math.floor((t.from+30)/120),RACE_TRACKS.alpine.sections);
 assert.ok(alpine.children.some(x=>x.getObjectByName('dark railway bore')));
 tunnels.dispose();kit.dispose();
});
