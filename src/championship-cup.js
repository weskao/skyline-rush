import { RACE_TRACKS } from './game.js';
// Simple offline championship: three point-to-point heats on unlocked tracks, never fake laps.
const NAMES = ['YOU', 'NOVA', 'ORBIT', 'APEX'];
const POINTS = [10, 7, 5, 3];
export function createCup(unlocked, startingTrack, count = 3) {
  if (!Array.isArray(unlocked) || new Set(unlocked).size !== unlocked.length ||
    unlocked.some(id => !Object.hasOwn(RACE_TRACKS, id)) || ![3, 5].includes(count) ||
    unlocked.length < count || !unlocked.includes(startingTrack)) throw new RangeError('Cup requires unlocked courses');
  const start = unlocked.indexOf(startingTrack);
  return { tracks: Array.from({length:count},(_,i)=>unlocked[(start+i)%unlocked.length]), results:[] };
}
export function addCupResult(cup, race) {
  if (!cup || !Array.isArray(cup.tracks) || !Array.isArray(cup.results) ||
    race?.trackId !== cup.tracks[cup.results.length] || race.phase !== 'finished' ||
    !Number.isFinite(race.result?.time) || race.result.time <= 0 ||
    !Array.isArray(race.rivals) || race.rivals.length !== 3 ||
    race.rivals.some(r => !NAMES.slice(1).includes(r.name)) ||
    new Set(race.rivals.map(r => r.name)).size !== 3) throw new RangeError('Invalid completed Cup heat');
  const drivers = [{name:'YOU',time:race.result.time}, ...race.rivals.map(r=>({
    name:r.name,
    time:Number.isFinite(r.finishTime) && r.finishTime>0 ? r.finishTime :
      race.elapsed + Math.max(0,race.length-r.distance)/Math.max(1,r.speed),
  }))];
  if (drivers.some(driver => !Number.isFinite(driver.time) || driver.time <= 0))
    throw new RangeError('Invalid completed Cup heat');
  drivers.sort((a,b)=>a.time-b.time || a.name.localeCompare(b.name));
  return { tracks:cup.tracks, results:[...cup.results,{
    track:race.trackId, time:race.result.time, order:drivers.map(x=>x.name),
    times:Object.fromEntries(drivers.map(x=>[x.name,x.time])),
  }] };
}
export function cupStandings(cup) {
  return NAMES.map(name=>({name,
    points:cup.results.reduce((sum,r)=>sum+POINTS[r.order.indexOf(name)],0),
    time:cup.results.reduce((sum,r)=>sum+r.times[name],0),
  })).sort((a,b)=>b.points-a.points || a.time-b.time || a.name.localeCompare(b.name));
}
export const cupComplete = cup => cup.results.length === cup.tracks.length;
export const cupTotalTime = cup => cup.results.reduce((t,r)=>t+r.time,0);
