import { cupComplete, cupStandings } from './championship-cup.ts';
import type { Settlement } from './race-results.ts';
import { getWave3DemoReceipt } from '#wave3-demo-race';
import type { ExperienceResult } from './wave3-experience-contract.ts';

type ResultFeedback = Pick<Settlement, 'record' | 'medals' | 'challengeMedals' | 'unlockedTrack' | 'intermediateStage' | 'series'>;
type RaceOutcome = { mode: string; rivals?: readonly unknown[]; result: { success?: boolean; position?: number } | null };
type PlayCue = (name: string, delay: number) => void;

const heard = new WeakSet<RaceOutcome>();
export function playResultFeedbackOnce(cue: PlayCue, race: RaceOutcome, result: ResultFeedback, instantReveal: boolean): void {
  if (heard.has(race)) return;
  heard.add(race);
  // The instant/comfortable reveal may occur in the same frame as the finish chime.
  // The demo receipt settles asynchronously (Web Lock + checkpoint), so the cues wait for it.
  void Promise.resolve(getWave3DemoReceipt(race))
    .then(receipt => playResultFeedback(cue, race, result, receipt, instantReveal ? .8 : .18));
}

export function playResultFeedback(
  cue: PlayCue, race: RaceOutcome, result: ResultFeedback, receipt: ExperienceResult | null, delay: number,
): void {
  if (!race.result || race.result.success === false || result.intermediateStage) return;
  const { cup } = result.series;
  if ((race.mode === 'elimination' && race.result.success) ||
      (race.mode === 'classic' && race.result.position === 1 && race.rivals?.length) ||
      (cup && cupComplete(cup) && cupStandings(cup)[0]?.name === 'YOU')) {
    cue('victory', delay);
    delay += 1.72;
  } else if (result.unlockedTrack || result.medals.length || result.challengeMedals.length) {
    cue('achievement-earned', delay);
    delay += .92;
  } else if (result.record) {
    cue('record-earned', delay);
    delay += .42;
  }

  if (receipt?.status === 'completed' && receipt.deltaDemoPoints > 0) {
    cue(receipt.missionReady ? 'reward-mission-ready' : 'reward-credited', delay);
  } else if (receipt?.status === 'completed' && receipt.missionReady) {
    cue('mission-ready', delay);
  }
}
