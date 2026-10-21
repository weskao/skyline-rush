import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, createRace, startRace, stepRace } from '../src/game.js';
const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('every World Tour track has one nonoverlapping boost tunnel in the main road', () => {
 for(const id of ids){
  const track=RACE_TRACKS[id], sections=track.sections;
  const tunnels=sections.filter(s=>s.type==='boost-tunnel');
  assert.equal(tunnels.length,1,id);
  assert.ok(tunnels[0].to-tunnels[0].from>=300,id);
  assert.ok(tunnels[0].to<track.length-100,id);
  for(let i=1;i<sections.length;i++)assert.ok(sections[i-1].to<=sections[i].from,id);
 }
});
test('entering a boost tunnel once grants speed burst and nitro without draining fuel', () => {
 for(const id of ids){
  const race=createRace(id), t=RACE_TRACKS[id].sections.find(s=>s.type==='boost-tunnel');
  startRace(race);race.phase='racing';race.traffic=[];race.rivals=[];
  Object.assign(race.player,{distance:t.from+5,speed:52,altitude:0,miniBoost:0,nitro:0.3,fuel:72});
  stepRace(race,{throttle:true},1/60);
  assert.equal(race.player.boostTunnelClaimed.length,1,id);
  assert.equal(race.player.boostTunnelClaimed[0],t.from,id);
  assert.ok(race.player.miniBoost>3,id);
  assert.ok(race.player.nitro>=0.55-1e-9,id);
  // Standard ground regeneration still applies (+13/s); the portal never burns fuel.
  assert.ok(race.player.fuel>=72&&race.player.fuel<=72+13/60+1e-9,id);
  const granted=race.player.nitro;
  for(let i=0;i<40;i++)stepRace(race,{throttle:true},1/60);
  assert.equal(race.player.nitro,granted,id);
  assert.equal(race.player.boostTunnelClaimed.length,1,id);
 }
});
test('a stopped, airborne or braking car cannot claim the boost tunnel',()=>{
 const id='taipei',t=RACE_TRACKS[id].sections.find(s=>s.type==='boost-tunnel');
 for(const value of [{speed:0},{speed:45,altitude:5},{speed:45,brake:true}]){
  const race=createRace(id);startRace(race);race.phase='racing';
  race.player.distance=t.from+1;race.player.speed=value.speed;
  race.player.altitude=value.altitude||0;race.traffic=[];race.rivals=[];
  stepRace(race,{throttle:true,brake:value.brake||false},1/60);
  assert.equal(race.player.boostTunnelClaimed.length,0);
 }
});
test('fresh race resets tunnel claims and the event is deterministic',()=>{
 const race=createRace('cosmic'),t=RACE_TRACKS.cosmic.sections.find(s=>s.type==='boost-tunnel');
 startRace(race);race.phase='racing';race.player.distance=t.from+2;race.player.speed=50;
 race.traffic=[];race.rivals=[];
 stepRace(race,{throttle:true},1/60);
 assert.deepEqual(race.player.boostTunnelEvent,{time:1/60,distance:t.from+2});
 assert.deepEqual(createRace('cosmic').player.boostTunnelClaimed,[]);
});
