import type { RaceSnapshot } from './game-types.ts';

// Presentation time is independent of the fixed-step race clock and saved result.
type PresentedRace = Pick<RaceSnapshot, 'phase'> & { player: Pick<RaceSnapshot['player'], 'speed'> };
interface PresentationState {
  results: boolean;
  finishDistance: number;
  finishProgress: number;
  count: number;
  goPush: number;
}
export function createPresentation() {
  let previousRace: PresentedRace | undefined;
  let previousPhase: string | null | undefined;
  let finish = 0;
  let go = 1;
  const state: PresentationState = { results: false, finishDistance: 0, finishProgress: 0, count: 0, goPush: 0 };
  return {
    update(race: PresentedRace, dt: number, calm = false): PresentationState {
      if (race !== previousRace) { previousRace = race; previousPhase = null; finish = 0; go = 1; }
      if (previousPhase === 'countdown' && race.phase === 'racing') go = 0;
      if (race.phase === 'racing') go = Math.min(1, go + dt / 0.6);
      if (race.phase === 'finished') finish = calm ? Math.max(finish, 1.8) : finish + dt;
      else finish = 0;
      state.results = race.phase === 'finished' && finish >= 0.6;
      state.finishProgress = race.phase === 'finished' && !calm ? Math.min(1, finish / 0.6) : 0;
      state.finishDistance = (race.player.speed || 0) * 0.12 * 0.6 * state.finishProgress * (2 - state.finishProgress);
      state.count = Math.max(0, Math.min(1, (finish - 0.6) / 1.2));
      state.goPush = !calm && race.phase === 'racing' && go < 1 ? Math.sin(go * Math.PI) : 0;
      previousPhase = race.phase;
      return state;
    },
  };
}
