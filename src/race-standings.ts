// Pure race ranking/gap calculations. Keep the game.js exports as the stable external API.
import type { CourseRuntime } from './course-race.ts';
import { PLAYER_ID, progressGap } from './course-race-step.ts';

export interface StandingsRace {
  player: { distance: number };
  rivals: readonly { id?: string; distance: number; finishTime?: number | null }[];
  result?: { position: number } | null;
  course?: CourseRuntime; // H7: a graph course ranks by its standings, not by odometers
}

export function racePosition(race: StandingsRace): number {
  return race.result?.position ?? (race.course ? race.course.standings.find(s => s.id === PLAYER_ID)!.place :
    1 + race.rivals.filter(rival => rival.distance > race.player.distance).length);
}

export function sprintGaps(race: StandingsRace): { ahead: number | null; behind: number | null } {
  let ahead: number | null = null, behind: number | null = null;
  for (const rival of race.rivals) {
    if (rival.finishTime != null) continue;
    const gap = progressGap(race, race.player, rival);
    if (gap > 0 && (ahead === null || gap < ahead)) ahead = gap;
    if (gap < 0 && (behind === null || -gap < behind)) behind = -gap;
  }
  return { ahead, behind };
}
