import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, NITRO_FUEL_BONUS, createRace, startRace, stepRace } from '../src/game.js';
const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('World Tour sections keep Tokyo two spaced charge tunnels while other tracks retain one', () => {
 for(const id of ids){
  const track=RACE_TRACKS[id], sections=track.sections;
  const tunnels=sections.filter(s=>s.type==='boost-tunnel');
  assert.equal(tunnels.length,id==='tokyo'?2:1,id);
   if(id==='tokyo'){
    assert.deepEqual(tunnels.map(t=>[t.from,t.to]),[[4880,5520],[8220,8900]]);
    assert.ok(tunnels[1].from-tunnels[0].to>=2500,'Tokyo charge sectors stay well separated');
   }
  assert.ok(tunnels[0].to-tunnels[0].from>=300,id);
  assert.ok(tunnels[0].to<track.length-100,id);
  for(let i=1;i<sections.length;i++)assert.ok(sections[i-1].to<=sections[i].from,id);
 }
});
test('entering a boost tunnel once grants speed burst and nitro without draining fuel', () => {
 for(const id of ids){
  const race=createRace(id), t=RACE_TRACKS[id].sections.find(s=>s.type==='boost-tunnel');
  startRace(race);race.phase='racing';race.traffic=[];race.rivals=[];race.rings=[];race.pickups=[]; // only the portal pays
  Object.assign(race.player,{distance:t.from+5,speed:52,altitude:0,miniBoost:0,nitro:0.3,fuel:72});
  stepRace(race,{throttle:true},1/60);
  assert.equal(race.player.boostTunnelClaimed.length,1,id);
  assert.equal(race.player.boostTunnelClaimed[0],t.from,id);
  assert.ok(race.player.miniBoost>3,id);
  assert.ok(race.player.nitro>=0.55-1e-9,id);
  const granted=race.player.nitro;
  // Ground regeneration (+13/s) and the banked-nitro fuel bonus apply; the portal never burns fuel.
  assert.ok(race.player.fuel>=72&&race.player.fuel<=72+(13+(id==='tokyo'?4:0))/60+(granted-0.3)*NITRO_FUEL_BONUS+1e-9,id);
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

test('Tokyo charges while driving through either sector without giving unlimited stationary or airborne energy', () => {
 const tunnels=RACE_TRACKS.tokyo.sections.filter(s=>s.type==='boost-tunnel');
 for(const t of tunnels)for(const state of [{speed:60,altitude:0,bonus:4},{speed:0,altitude:0,bonus:0},{speed:60,altitude:5,bonus:0}]){
  const race=createRace('tokyo');startRace(race);race.phase='racing';
  race.traffic=[];race.rivals=[];race.rings=[];race.pickups=[];
  Object.assign(race.player,{distance:t.from+20,speed:state.speed,altitude:state.altitude,fuel:40,boostTunnelClaimed:[t.from]});
  const before=race.player.fuel;
  stepRace(race,{throttle:true,boost:true},1/60);
  const expected=before-10/60+state.bonus/60;
  assert.ok(Math.abs(race.player.fuel-expected)<0.02,
   `Tokyo ${t.from}m speed=${state.speed} altitude=${state.altitude}: ${race.player.fuel} versus ${expected}`);
 }
});

test('Tokyo awards each Hyperdrive tunnel only once per race, not on re-entry', () => {
 const tunnels=RACE_TRACKS.tokyo.sections.filter(s=>s.type==='boost-tunnel');
 const race=createRace('tokyo');startRace(race);race.phase='racing';
 race.traffic=[];race.rivals=[];race.rings=[];race.pickups=[];
 race.player.nitro=0;race.player.fuel=40;
 for(const t of tunnels){
  Object.assign(race.player,{distance:t.from+15,speed:60,altitude:0});
  stepRace(race,{throttle:true},1/60);
  assert.equal(race.player.boostTunnelClaimed.length,race.player.boostTunnelClaimed.indexOf(t.from)+1);
  const after=race.player.nitro;
  stepRace(race,{throttle:true},1/60);
  assert.equal(race.player.nitro,after,'cannot farm the same Tokyo sector');
 }
 assert.deepEqual(race.player.boostTunnelClaimed,tunnels.map(t=>t.from));
 assert.ok(race.player.nitro<=0.5+1e-9,'two tunnels grant only half a NITRO charge in total');
});
