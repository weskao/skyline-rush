import { DEMO_REPLAY_LIMIT } from './wave3-experience-contract.ts';
import type { GameEvent, MissionProgress } from './wave3-experience-contract.ts';
import { DEMO_ELIGIBLE_MODES } from './wave3-demo-settlement.ts';

/** Pure local demo rules. F01 owns rewards and the only authoritative mission snapshot. */
export type MissionFamily = 'race' | 'time' | 'drift' | 'combo';
export type MissionCadence = 'daily' | 'weekly';
export type MissionStatus = 'not-started' | 'in-progress' | 'completed' | 'claimable' | 'claimed' | 'unavailable';
export type MissionDefinition = Readonly<{id:string;family:MissionFamily;cadence:MissionCadence;goal:number}>;
export const MISSION_DEFINITIONS: readonly MissionDefinition[] = Object.freeze(([
  ['race',1,5],['time',1,3],['drift',2,6],['combo',1,4],
] as const).flatMap(([family,daily,weekly]) => [
  Object.freeze({id:'mission-'+family+':daily',family,cadence:'daily' as const,goal:daily}),
  Object.freeze({id:'mission-'+family+':weekly',family,cadence:'weekly' as const,goal:weekly}),
]));
export type MissionPeriodState = Readonly<{
  accountId:string;dayStart:number;weekStart:number;
  counts:Readonly<Record<string,number>>;seenEventIds:readonly string[];
}>;
const DAY_MS=86400000, MAX_EVENT_AGE=300000;
export function missionPeriodBounds(now:number):{dayStart:number;weekStart:number}{
  const dayStart=Math.floor(now/DAY_MS)*DAY_MS;
  return {dayStart,weekStart:dayStart-((new Date(dayStart).getUTCDay()+6)%7)*DAY_MS};
}
export function missionPeriodId(missionId: string, now: number): number {
  const bounds = missionPeriodBounds(now);
  return missionId.endsWith(':daily') ? bounds.dayStart : missionId.endsWith(':weekly') ? bounds.weekStart : 0;
}
export function createMissionPeriodState(accountId:string,now:number):MissionPeriodState{
  return {accountId,...missionPeriodBounds(now),counts:{},seenEventIds:[]};
}
const matches=(family:MissionFamily,e:GameEvent):boolean=>
  family==='race' ? e.kind==='finish'&&e.mode!=='time' :
  family==='time' ? e.kind==='finish'&&e.mode==='time' : e.kind===family;
/** Pure reducer called by F02 at genuine eligible event boundaries; never by a display click. */
export function reduceMissionEvent(state:MissionPeriodState,event:GameEvent,now:number):MissionPeriodState{
  if(!event||event.schemaVersion!==1||!event.eligible||
    !['finish','drift','combo'].includes(event.kind)||
    !event.eventId||!event.completionId||!event.trackId||!DEMO_ELIGIBLE_MODES.has(event.mode)||
    (event.accountId!==undefined&&event.accountId!==state.accountId)||
    !Number.isFinite(event.occurredAt)||event.occurredAt>now||
    event.occurredAt<now-MAX_EVENT_AGE||state.seenEventIds.includes(event.eventId)) return state;
  const {dayStart,weekStart}=missionPeriodBounds(now);
  const counts:Record<string,number>={};
  for(const d of MISSION_DEFINITIONS){
    const boundary=d.cadence==='daily'?dayStart:weekStart;
    const old=d.cadence==='daily'?state.dayStart:state.weekStart;
    const base=boundary===old?(state.counts[d.id]??0):0;
    counts[d.id]=Math.min(d.goal,base+Number(event.occurredAt>=boundary&&matches(d.family,event)));
  }
  return {accountId:state.accountId,dayStart,weekStart,counts,
    seenEventIds:[...state.seenEventIds.slice(-(DEMO_REPLAY_LIMIT-1)),event.eventId]};
}
export function projectMissionState(state:MissionPeriodState,now:number):Record<string,MissionProgress>{
  const bounds=missionPeriodBounds(now);
  return Object.fromEntries(MISSION_DEFINITIONS.map(d=>[d.id,{
    goal:d.goal,progress:Math.min(d.goal,Math.max(0,
      (d.cadence==='daily'?bounds.dayStart===state.dayStart:bounds.weekStart===state.weekStart)
      ?(state.counts[d.id]??0):0)),claimed:false,rewardDemoPoints:0,
  }]));
}
export function missionStatus(p:MissionProgress|null|undefined,canClaim=true):MissionStatus{
  if(!p||!Number.isFinite(p.goal)||p.goal<=0)return 'unavailable';
  if(p.claimed)return 'claimed';
  if(p.progress>=p.goal)return canClaim?'claimable':'completed';
  return p.progress>0?'in-progress':'not-started';
}
export const trophyTier=(claimed:number):'none'|'bronze'|'silver'|'gold'|'platinum'=>
  claimed>=4?'platinum':claimed>=3?'gold':claimed>=2?'silver':claimed>=1?'bronze':'none';
