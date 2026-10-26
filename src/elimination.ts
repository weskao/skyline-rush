export interface EliminationState {
  nextAt: number;
  eliminated: string[];
  outcome: 'won' | 'lost' | null;
}
interface EliminationRacer { name: string; distance: number }
interface EliminationRace {
  elapsed: number;
  player: { distance: number };
  rivals: EliminationRacer[];
}
// Four-racer Last Driver Standing: one deterministic knockout every ten seconds.
export const createElimination = (): EliminationState => ({ nextAt: 10, eliminated: [], outcome: null });
export function stepElimination(state: EliminationState, race: EliminationRace): { eliminated: string; outcome: EliminationState['outcome'] } | null {
  if (state.outcome || race.elapsed < state.nextAt) return null;
  const racers = [{ name:'YOU', distance:race.player.distance }, ...race.rivals];
  if (racers.length <= 1) return null;
  const loser = racers.reduce((last,racer) => racer.distance <= last.distance ? racer : last);
  state.eliminated.push(loser.name);
  if (loser.name === 'YOU') state.outcome = 'lost';
  else race.rivals.splice(race.rivals.findIndex(racer => racer.name === loser.name),1);
  state.nextAt += 10;
  if (!state.outcome && !race.rivals.length) state.outcome = 'won';
  return { eliminated:loser.name, outcome:state.outcome };
}
