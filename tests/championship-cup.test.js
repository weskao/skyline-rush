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

test('five-track Cup accepts five unlocked tracks without repeat',()=>{
 const unlocked=['coast','neon','canyon','aurora','spiral'];
 assert.deepEqual(createCup(unlocked,'aurora',5).tracks,['aurora','spiral','coast','neon','canyon']);
 assert.throws(()=>createCup(['coast','neon','canyon'],'coast',5));
});

// A malformed Cup can otherwise award duplicate AI points or NaN standings.
test('Cup rejects unknown tracks, duplicate drivers and nonfinite AI projections', () => {
  assert.throws(() => createCup(['coast', 'neon', 'not-a-track'], 'coast'), /unlocked courses/);
  const cup = createCup(tracks, 'coast');
  const duplicate = finish('coast', 40, [41, 42, 43]);
  duplicate.rivals[1].name = 'NOVA';
  assert.throws(() => addCupResult(cup, duplicate), /Invalid completed Cup heat/);
  const malformed = finish('coast', 40, [41, 42, 43]);
  malformed.rivals[0].finishTime = null;
  malformed.rivals[0].distance = NaN;
  assert.throws(() => addCupResult(cup, malformed), /Invalid completed Cup heat/);
});

test('incomplete or corrupted Cup stage data never becomes NaN standings', () => {
  const empty = createCup(tracks, 'coast');
  assert.equal(cupStandings(empty)[0].points, 0); // an unstarted Cup is valid
  const good = addCupResult(empty, finish('coast', 40, [41, 42, 43]));
  assert.equal(cupStandings(good)[0].points, 10); // partial completed stages are valid

  const brokenOrder = structuredClone(good);
  brokenOrder.results[0].order = ['YOU', 'NOVA', 'ORBIT'];
  assert.throws(() => cupStandings(brokenOrder), /Invalid Cup standings/);
  assert.throws(() => addCupResult(brokenOrder, finish('neon', 39, [40, 41, 42])), /Invalid Cup standings/);

  const brokenTime = structuredClone(good);
  brokenTime.results[0].times.APEX = NaN;
  assert.throws(() => cupStandings(brokenTime), /Invalid Cup standings/);

  const foreignTrack = structuredClone(good);
  foreignTrack.results[0].track = 'not-a-track';
  assert.throws(() => cupStandings(foreignTrack), /Invalid Cup standings/);

  const duplicated = structuredClone(good);
  duplicated.results.push(structuredClone(duplicated.results[0]));
  assert.throws(() => cupStandings(duplicated), /Invalid Cup standings/);
});
