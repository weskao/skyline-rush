import { aiImpacts, avoidObstacles } from './car-collisions.js';
import { stepCircuitRivals } from './circuit-laps.ts';
import { progressGap } from './course-race-step.ts';
import { coastFinishedRival, isParkedRival, parkFinishedRival } from './finished-rival.js';
import { CAR_HEIGHT, FREEZE_RIVAL_SPEED, RUBBER_BAND_FREE, RUBBER_BAND_MAX, RUBBER_BAND_RANGE } from './game.js';
import { driveRival } from './rival-driver.ts';
import { RIVAL_HOP_PERIOD, rivalCollects, rivalSeek } from './rival-items.ts';
import { stepRivalDeck } from './road-falls.ts';

export function stepRaceRivals(race, dt) {
  const car = race.player;
  race.rivals.forEach((rival, i) => {
    if (isParkedRival(rival)) {
      coastFinishedRival(race, rival, dt);
      return;
    }
    const period = RIVAL_HOP_PERIOD[rival.name] ?? 13;
    const cycle = ((race.elapsed + i * 3) % period) * (13 / period);
    const hopFrom = rival.altitude; rival.altitude = cycle > 6 && cycle < 11 ? Math.sin((cycle - 6) / 5 * Math.PI) * (5 + i) : 0;
    rival.thrusting = cycle > 6 && cycle < 9;
    rival.cooldown = Math.max(0, (rival.cooldown || 0) - dt);
    driveRival(race, rival, i, Math.floor((race.elapsed + i * 3) / period), dt); // the player's caps, fuel and NITRO
    const before = rival.distance;
    // Rubber band: a rival far ahead of the player eases off by at most RUBBER_BAND_MAX; one behind is never sped up.
    const band = Math.max(0, Math.min(1, (progressGap(race, car, rival) - RUBBER_BAND_FREE) / RUBBER_BAND_RANGE));
    const slow = (car.effects.freeze > 0 || rival.empUntil > race.elapsed ? FREEZE_RIVAL_SPEED : 1) * (1 - band * RUBBER_BAND_MAX);
    rival.pace = rival.speed * slow;
    rival.distance += rival.pace * dt;
    rivalSeek(race, rival); avoidObstacles(race, rival, rival.pace, dt); stepRivalDeck(rival, race.sections, hopFrom, CAR_HEIGHT);
    aiImpacts(race, rival, before, rival.pace); rivalCollects(race, rival, before);
    if (!race.endless && !race.circuit && !race.course && rival.distance >= race.length && rival.finishTime === null) {
      rival.finishTime = race.elapsed - dt + Math.max(0, race.length - before) / rival.pace;
      parkFinishedRival(rival);
    }
  });
  stepCircuitRivals(race, dt);
}
