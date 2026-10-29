import { hazardWarningDistance } from './hazard-safety.ts';
import type { HazardPlacement } from './hazard-schema.ts';

interface HazardCue { id?: string | number; distance: number; passed: boolean; hit: boolean; placement?: HazardPlacement }
export interface ModeAudioRace {
  phase: string;
  mode: string;
  trackId: string;
  checkpoint?: { passed: number; missed: number; timeLeft: number } | null;
  hazards?: HazardCue[] | null;
  styleAttack?: { combo: number } | null;
  player?: { distance: number; trickPayout?: { hard?: boolean } | null } | null;
  result?: { success?: boolean } | null;
}
export interface ModeAudioState {
  race: ModeAudioRace | null;
  phase: string | null;
  passed: number; missed: number; warning: boolean;
  hazardsPassed: number; hazardsHit: number;
  warned: Set<string | number>;
  combo: number;
  trickPayout?: { hard?: boolean } | null;
}
// Pure mode-specific sound events: one-shot transitions, no Web Audio dependencies.
const COURSE_MUSIC: Record<string, string> = {spiral:'spiral',neon:'neon',canyon:'canyon',aurora:'aurora',taipei:'taipei',tokyo:'tokyo',alpine:'alpine',coastal:'coastal',cosmic:'cosmic'};
const MODE_MUSIC: Record<string, string> = {checkpoint:'checkpoint',stunt:'stunt',gauntlet:'gauntlet',cup:'cup',free:'cruise',elimination:'gauntlet'};
export const musicForMode = (race: ModeAudioRace): string => ['ready','finished'].includes(race.phase) ? 'intro' : MODE_MUSIC[race.mode] || COURSE_MUSIC[race.trackId] || 'race';

export const createModeAudioState = (): ModeAudioState => ({ race:null, phase:null, passed:0, missed:0, warning:false,
  hazardsPassed:0, hazardsHit:0, warned:new Set(), combo:0, trickPayout:null });

export function modeAudioCues(race: ModeAudioRace, state: ModeAudioState): string[] {
  if (race !== state.race) {
    state.race=race; state.phase=race.phase;
    state.passed=race.checkpoint?.passed || 0;
    state.missed=race.checkpoint?.missed || 0;
    state.warning=false;
    state.hazardsPassed=race.hazards?.filter(h => h.passed && !h.hit).length || 0;
    state.hazardsHit=race.hazards?.filter(h => h.hit).length || 0;
    state.warned=new Set();
    state.combo=race.styleAttack?.combo || 0;
    state.trickPayout=race.player?.trickPayout;
    return [];
  }
  const cues: string[]=[];
  if (race.phase==='finished' && state.phase!=='finished') {
    if (race.result?.success===false) cues.push('mode-failed');
    else if(race.mode==='cup') cues.push('cup-stage');
    else if(race.mode==='stunt') cues.push('stunt-finish');
  }
  state.phase=race.phase;
  if (race.phase !== 'racing') {
    state.passed=race.checkpoint?.passed || 0;
    state.missed=race.checkpoint?.missed || 0;
    state.hazardsPassed=race.hazards?.filter(h=>h.passed && !h.hit).length || 0;
    state.hazardsHit=race.hazards?.filter(h=>h.hit).length || 0;
    state.combo=race.styleAttack?.combo || 0;
    state.trickPayout=race.player?.trickPayout;
    return cues;
  }
  const add = (cue: string): void => {if (cues.length < 2) cues.push(cue);};
  if (race.mode==='checkpoint' && race.checkpoint) {
    const cp=race.checkpoint;
    if (cp.passed > state.passed) add('gate-clear');
    else if (cp.missed > state.missed) add('gate-miss');
    state.passed=cp.passed; state.missed=cp.missed;
    if (cp.timeLeft > 10) state.warning=false;
    if (cp.timeLeft>0 && cp.timeLeft<=8 && !state.warning) { add('countdown-urgent');state.warning=true; }
  }
  if (Array.isArray(race.hazards) && race.hazards.length) {
    const passed=race.hazards.filter(h=>h.passed && !h.hit).length;
    const hit=race.hazards.filter(h=>h.hit).length;
    if (passed > state.hazardsPassed) add('hazard-clear');
    if (hit > state.hazardsHit) add('hazard-impact');
    state.hazardsPassed=passed;state.hazardsHit=hit;
    const distance=race.player?.distance ?? 0;
    const ahead=race.hazards.find(h=>!h.passed && !h.hit && h.distance>distance && h.distance-distance<=(h.placement ? hazardWarningDistance(h) : 150));
    if (ahead) {
      const id=ahead.id ?? ahead.distance;
      if (!state.warned.has(id)) {state.warned.add(id);add('hazard-warning');}
    }
  }
  if (race.mode==='stunt' && race.styleAttack) {
    const combo=race.styleAttack.combo;
    if (combo>=3 && state.combo<3 || combo>=5 && state.combo<5) add('combo-up');
    else if (combo===0 && state.combo>=2) add('combo-break');
    state.combo=combo;
    const trick=race.player?.trickPayout;
    if (trick && trick !== state.trickPayout && trick.hard===false) add('clean-landing');
    state.trickPayout=trick;
  }
  return cues;
}
