import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCup,addCupResult,cupStandings,cupComplete,cupTotalTime} from '../src/championship-cup.js';
const tracks=['coast','neon','canyon','aurora'];
const finish = (trackId, playerTime, aiTimes) => ({
  trackId, phase:'finished', length:5000, elapsed:playerTime, result:{time:playerTime,position:aiTimes.filter(t=>t<playerTime).length+1},
  rivals:['NOVA','ORBIT','APEX'].map((name,i)=>({name,finishTime:aiTimes[i],distance:4900,speed:60})),
});
test('cup rotates only through already unlocked tracks and rejects incomplete access',()=>{
  assert.deepEqual(createCup(tracks,'canyon').tracks,['canyon','aurora','coast']);
  assert.throws(()=>createCup(['coast','neon'],'coast'));
  assert.throws(()=>createCup(tracks,'tokyo'));
  assert.throws(()=>createCup(['coast','coast','neon'],'coast'));
});
test('three stages award deterministic points and name a champion',()=>{
  let cup=createCup(tracks,'coast');
  assert.throws(()=>addCupResult(cup,finish('neon',40,[39,45,46])));
  cup=addCupResult(cup,finish('coast',40,[42,43,44]));
  cup=addCupResult(cup,finish('neon',39,[42,43,44]));
  cup=addCupResult(cup,finish('canyon',38,[42,43,44]));
  assert.equal(cupComplete(cup),true);
  assert.equal(cupTotalTime(cup),117);
  assert.equal(cupStandings(cup)[0].name,'YOU');
  assert.equal(cupStandings(cup)[0].points,30);
  assert.throws(()=>addCupResult(cup,finish('aurora',39,[40,41,42])));
});
test('tie uses aggregate race time; missing rival completion extrapolates by distance/speed',()=>{
  let cup=createCup(tracks,'coast');
  const race=finish('coast',40,[39,50,60]);
  race.rivals[1].finishTime=null;
  cup=addCupResult(cup,race);
  assert.equal(cup.results[0].order[0],'NOVA');
  assert.equal(cup.results[0].order[1],'YOU');
  assert.equal(cup.results[0].order[2],'ORBIT');
  assert.equal(cupStandings(cup).length,4);
});
