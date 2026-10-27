// Pure race ranking/gap calculations. Keep the game.js exports as the stable external API.
export interface StandingsRace {
  player: { distance: number };
  rivals: readonly { distance: number; finishTime?: number | null }[];
  result?: { position: number } | null;
}

export function racePosition(race: StandingsRace): number {
  return race.result?.position ?? 1 + race.rivals.filter(rival => rival.distance > race.player.distance).length;
}

export function sprintGaps(race: StandingsRace): { ahead: number | null; behind: number | null } {
  let ahead: number | null = null, behind: number | null = null;
  for (const rival of race.rivals) {
    if (rival.finishTime != null) continue;
    const gap = rival.distance - race.player.distance;
    if (gap > 0 && (ahead === null || gap < ahead)) ahead = gap;
    if (gap < 0 && (behind === null || -gap < behind)) behind = -gap;
  }
  return { ahead, behind };
}
