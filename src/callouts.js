export function createCallouts() {
  let previousRace, previous, previousElapsed = 0, current = null;
  const pending = [];
  const enqueue = (kind, title, detail) => {
    const event = { kind, title, detail };
    const index = pending.findIndex(item => item.kind === kind);
    if (index < 0) pending.push(event);
    else pending[index] = event; // Show the latest combo/tier instead of stale repeats.
  };
  return {
    update(race, blocked = false) {
      const elapsed = Math.max(0, race.elapsed - previousElapsed);
      previousElapsed = race.elapsed;
      const car = race.player;
      const next = {
        near: car.nearMisses, perfect: car.perfectLines, nitro: car.nitro,
        nitroTime: car.nitroTime, uses: car.nitroUses,
        drift: Math.min(3, Math.floor(car.drift?.time ?? 0)),
      };
      if (race !== previousRace || race.phase !== 'racing') {
        pending.length = 0;
        current = null;
        previous = next;
        previousRace = race;
        return null;
      }
      if (next.perfect > previous.perfect) enqueue('perfect', 'PERFECT LINE', '+1 NITRO');
      if (next.near > previous.near) enqueue('near', `NEAR MISS ×${car.nearMiss.combo}`,
        `CLOSE PASS · ${car.nearMiss.charge < 0.5 ? 'CHARGE FULL' : `+${Math.round(car.nearMiss.charge)}% CHARGE`}`);
      if (next.uses > previous.uses || next.nitroTime > previous.nitroTime) {
        enqueue('nitro', 'NITRO', next.uses > previous.uses ? 'SPEED BURST' : '+2 SECONDS');
      }
      if (next.drift > previous.drift) enqueue('drift', `DRIFT · ${['', 'BLUE', 'ORANGE', 'PURPLE'][next.drift]}`, 'SPARK TIER EARNED');
      if (next.nitro > previous.nitro && next.perfect === previous.perfect) {
        enqueue('refill', `+${Number((next.nitro - previous.nitro).toFixed(2))}`, 'NITRO CHARGE');
      }
      previous = next;
      if (blocked) {
        if (current) current.started += elapsed;
        return null;
      }
      if (current && race.elapsed - current.started >= 1.2) current = null;
      if (!current && pending.length) current = { ...pending.shift(), started: race.elapsed };
      return current;
    },
  };
}
