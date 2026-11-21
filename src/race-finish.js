import { stepCheckpointRush } from './checkpoint-rush.ts';
import { scoreStuntAttack } from './stunt-attack.ts';
import { stepElimination } from './elimination.ts';
import { finishEndless } from './endless-highway.ts';
import { stepCircuit } from './circuit-laps.ts';
import { stepRivalAttacks } from './item-attacks.ts';
import { raceCompletion } from './race-objectives.ts';
import { courseFinished, PLAYER_ID } from './course-race-step.ts';

// End of stepRace: player completion and the result object. H5: a graph course completes at its FINISH gate
// crossing, timed by that sweep's node-plane fraction (spec §6); every other track keeps the 1D rule.
export function finishRace(race, previousDistance, dt) {
  const car = race.player;
  const completion = raceCompletion(race, courseFinished(race, car));
  if (completion.done) {
    const finishTime = race.circuit?.player.finishTime ?? (completion.reason === 'timer' ? race.stuntLimit : completion.reason === 'expired' ? race.elapsed :
      race.course ? race.elapsed - dt + dt * race.course.cars.get(PLAYER_ID).finishFraction :
        race.elapsed - dt + dt * (race.length - previousDistance) / (car.distance - previousDistance));
    const position = 1 + race.rivals.filter(rival => rival.finishTime !== null && rival.finishTime < finishTime).length;
    car.distance = Math.min(car.distance, race.length); // An expired timer must not teleport the car to the finish.
    race.elapsed = finishTime;
    const score = Math.round(car.score);
    race.result = { position, time: finishTime, collisions: car.collisions, nearMisses: car.nearMisses,
      nitroUses: car.nitroUses, nitroChain: car.nitroChain, longestCombo: car.longestCombo,
      rings: car.rings, perfectLines: car.perfectLines, fuelOuts: car.fuelOuts, gapFalls: car.falls, score,
      stars: score >= race.length * 0.5 ? 3 : score >= race.length * 0.25 ? 2 : 1,
      success: race.checkpoint ? !race.checkpoint.expired && race.checkpoint.passed === race.checkpoint.gates.length :
        !(race.mode === 'time' && race.config.clean && car.collisions > 0),
      ...(race.circuit ? { lapTimes: race.circuit.player.lapTimes } : {}),
      ...(race.mode === 'stunt' ? { endReason: completion.reason } : {}) };
    race.phase = 'finished';
    car.thrusting = false;
    car.boosting = false;
  }
}

export function finishRecoveryFrame(race, dt) {
  const car = race.player;
  if (race.checkpoint) stepCheckpointRush(race.checkpoint, car.distance, car, dt);
  if (race.styleAttack) scoreStuntAttack(race.styleAttack, car, 0, dt, race.elapsed);
  finishRaceFrame(race, car.distance, dt, true);
}

export function finishRaceFrame(race, previousDistance, dt, recovering = false) {
  const car = race.player;
  if (race.elimination) {
    const knockout = stepElimination(race.elimination,race);
    if (knockout?.outcome) {
      race.result = {position:knockout.outcome === 'won' ? 1 : race.rivals.length + 1, time:race.elapsed,
        success:knockout.outcome === 'won', score:Math.round(car.score),
        collisions:car.collisions, nearMisses:car.nearMisses, nitroUses:car.nitroUses,
        rings:car.rings, perfectLines:car.perfectLines, stars:1};
      race.phase='finished'; car.speed=0; car.thrusting=false; car.boosting=false;
      return;
    }
  }
  if (finishEndless(race)) return;
  if (!recovering) stepCircuit(race, dt);
  finishRace(race, previousDistance, dt);
  if (!recovering) stepRivalAttacks(race);
}
