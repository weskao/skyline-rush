export interface ObjectiveConfig { mode?: string; duration?: number }
export type RaceObjective =
  | Readonly<{ type: 'placement' | 'stage-points' | 'finish-time' | 'checkpoint-timer' | 'no-auto-finish' | 'survival' | 'valid-laps' }>
  | Readonly<{ type: 'timed-score'; durationSeconds: number; routeEndAllowed: true }>;
export interface ObjectiveRace {
  objective?: RaceObjective;
  config?: ObjectiveConfig;
  mode?: string;
  player: { distance: number };
  length: number;
  checkpoint?: { expired?: boolean };
  circuit?: { player: { finishTime: number | null } } | null;
  elapsed: number;
  stuntLimit?: number;
}
export interface RaceCompletion { done: boolean; reason: 'route' | 'timer' | 'expired' | null }

// MODE-00: explicit, immutable race objectives. No UI or persistence side effects.
// Stage-based sprints remain distinct point-to-point heats, never simulated laps.
export function createRaceObjective(config: ObjectiveConfig = {}): RaceObjective {
  const mode = config.mode ?? 'classic';
  switch (mode) {
    case 'classic':
    case 'custom':
    case 'gauntlet':
      return Object.freeze({ type: 'placement' as const });
    case 'circuit':
      return Object.freeze({ type: 'valid-laps' as const });
    case 'cup':
      return Object.freeze({ type: 'stage-points' as const });
    case 'time':
      return Object.freeze({ type: 'finish-time' as const });
    case 'checkpoint':
      return Object.freeze({ type: 'checkpoint-timer' as const });
    case 'free':
      return Object.freeze({ type: 'no-auto-finish' as const });
    case 'elimination':
      return Object.freeze({ type: 'survival' as const });
    case 'stunt':
      return Object.freeze({
        type: 'timed-score' as const,
        durationSeconds: config.duration !== undefined && [120, 180, 300].includes(config.duration) ? config.duration : 120,
        routeEndAllowed: true,
      });
    default:
      throw new RangeError('Unknown race mode: ' + String(mode));
  }
}

// Pure completion query. An Elimination win is determined by knockout rules, not route length.
// A Checkpoint timeout is distinguishable from a physically completed course.
export function raceCompletion(race: ObjectiveRace): RaceCompletion {
  const objective = race.objective ?? createRaceObjective(race.config ?? { mode: race.mode });
  const distance = race.player.distance;
  const routeEnd = distance >= race.length;
  switch (objective.type) {
    case 'valid-laps':
      return { done: race.circuit?.player.finishTime != null, reason: race.circuit?.player.finishTime != null ? 'route' : null };
    case 'no-auto-finish':
    case 'survival':
      return { done: false, reason: null };
    case 'checkpoint-timer':
      if (race.checkpoint?.expired) return { done: true, reason: 'expired' };
      return routeEnd ? { done: true, reason: 'route' } : { done: false, reason: null };
    case 'timed-score':
      if (race.elapsed >= (race.stuntLimit ?? objective.durationSeconds)) return { done: true, reason: 'timer' };
      return routeEnd ? { done: true, reason: 'route' } : { done: false, reason: null };
    case 'placement':
    case 'stage-points':
    case 'finish-time':
      return routeEnd ? { done: true, reason: 'route' } : { done: false, reason: null };
    default:
      throw new RangeError('Unknown race objective: ' + String((objective as { type: string }).type));
  }
}
