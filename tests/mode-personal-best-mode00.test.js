import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { recordModeRace, loadModeBest, loadModeHistory, MODE_BESTS_KEY, MODE_HISTORY_KEY,
  loadHistory, loadUnlocks } from '../src/history.js';

const memory = seed => {
  const values = new Map(Object.entries(seed ?? {}));
  return {getItem: key => values.get(key) ?? null, setItem: (key, v) => values.set(key, v)};
};
const completed = (mode, scoreOrTime, options = {}) => {
  const race = createRace('coast', {mode, ...options});
  race.phase='finished';
  race.result={time:mode==='stunt'?120:scoreOrTime,score:mode==='stunt'?scoreOrTime:300,
    position:1,success:true};
  return race;
};

test('RED 10C: personal best survives fifty newer slow runs and is scoped to the full rules signature', () => {
  const store=memory();
  const first=completed('time',39,{clean:true});
  assert.deepEqual(recordModeRace(first,store),{best:39,record:true});
  for(let i=0;i<55;i++)recordModeRace(completed('time',70+i,{clean:true}),store);
  assert.equal(loadModeHistory(store).length,50);
  assert.equal(loadModeBest(first.trackId,first.config,store),39);
  assert.deepEqual(recordModeRace(completed('time',62,{clean:true}),store),{best:39,record:false});
  const ordinary=completed('time',55,{clean:false});
  assert.equal(loadModeBest(ordinary.trackId,ordinary.config,store),null);
  assert.deepEqual(recordModeRace(ordinary,store),{best:55,record:true});
  assert.equal(loadModeBest(ordinary.trackId,ordinary.config,store),55);
  assert.equal(loadModeBest(first.trackId,first.config,store),39);
  assert.deepEqual(loadHistory(store),[]);
  assert.deepEqual(loadUnlocks(store),['coast']);
});

test('RED 10C: stunt lifetime-best query uses the high score rather than the shortest time',()=>{
  const store=memory();
  const champion=completed('stunt',9000,{duration:120});
  recordModeRace(champion,store);
  for(let i=0;i<55;i++)recordModeRace(completed('stunt',1000+i,{duration:120}),store);
  assert.equal(loadModeBest(champion.trackId,champion.config,store),9000);
});

test('RED 10C: legacy challenge history and malformed saved bests never invent records',()=>{
  const race=completed('custom',78,{traffic:'off',rivals:0});
  const seed={date:'2026-10-23T00:00:00Z',mode:race.mode,track:race.trackId,
    rules:JSON.stringify(race.config),time:78};
  const store=memory({[MODE_HISTORY_KEY]:JSON.stringify([seed]),
    [MODE_BESTS_KEY]:JSON.stringify({'nonsense':-300})});
  assert.equal(loadModeBest(race.trackId,race.config,store),78);
  assert.equal(loadModeBest('neon',race.config,store),null);
  assert.deepEqual(recordModeRace(completed('custom',80,{traffic:'off',rivals:0}),store),
    {best:78,record:false});
  assert.equal(loadModeBest(race.trackId,race.config,store),78);
});
