// MODE-00: explicit, immutable race objectives. No UI or persistence side effects.
// Stage-based sprints remain distinct point-to-point heats, never simulated laps.
export function createRaceObjective(config = {}) {
  const mode = config.mode ?? 'classic';
  switch (mode) {
    case 'classic':
    case 'custom':
    case 'gauntlet':
    case 'cup':
      return Object.freeze({ type: 'placement' });
    case 'time':
      return Object.freeze({ type: 'finish-time' });
    case 'checkpoint':
      return Object.freeze({ type: 'checkpoint-timer' });
    case 'free':
      return Object.freeze({ type: 'no-auto-finish' });
    case 'elimination':
      return Object.freeze({ type: 'survival' });
    case 'stunt':
      return Object.freeze({
        type: 'timed-score',
        durationSeconds: [120, 180, 300].includes(config.duration) ? config.duration : 120,
        routeEndAllowed: true,
      });
    default:
      throw new RangeError('Unknown race mode: ' + String(mode));
  }
}

// Pure completion query. An Elimination win is determined by knockout rules, not route length.
// A Checkpoint timeout is distinguishable from a physically completed course.
export function raceCompletion(race) {
  const objective = race.objective ?? createRaceObjective(race.config ?? { mode: race.mode });
  const distance = race.player.distance;
  const routeEnd = distance >= race.length;
  switch (objective.type) {
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
    case 'finish-time':
      return routeEnd ? { done: true, reason: 'route' } : { done: false, reason: null };
    default:
      throw new RangeError('Unknown race objective: ' + String(objective.type));
  }
}
