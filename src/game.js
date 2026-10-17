export const RACE_LENGTH = 5000;
export const MAX_SPEED = 88;
export const ROAD_LIMIT = 10.2;
export const LANES = [-7.5, -2.5, 2.5, 7.5];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createRace() {
  return {
    phase: 'ready', countdown: 3, elapsed: 0, result: null,
    player: {
      distance: 0, x: 2.5, speed: 0, altitude: 0, verticalSpeed: 0,
      fuel: 100, thrusting: false, exhausted: false, collisions: 0, cooldown: 0,
    },
    rivals: ['NOVA', 'ORBIT', 'APEX'].map((name, i) => ({
      name, x: LANES[i === 2 ? 3 : i], distance: 0, speed: 0,
      altitude: 0, thrusting: false, finishTime: null,
    })),
    traffic: Array.from({ length: 36 }, (_, i) => ({
      x: LANES[(i * 7 + 1) % 4], distance: 170 + i * 125,
      speed: 23 + (i % 5) * 3, color: i % 5,
    })),
  };
}

export function startRace(race) {
  if (race.phase === 'ready') race.phase = 'countdown';
}

export function racePosition(race) {
  return race.result?.position ?? 1 + race.rivals.filter(rival => rival.distance > race.player.distance).length;
}

export function stepRace(race, input, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
  if (race.phase === 'countdown') {
    race.countdown = Math.max(0, race.countdown - dt);
    if (race.countdown < 0.00001) race.phase = 'racing';
    return;
  }
  if (race.phase !== 'racing') return;
  race.elapsed += dt;
  const car = race.player;
  const throttle = input.throttle === true;
  const brake = input.brake === true;
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  const boost = input.boost === true && car.fuel > 0 && !brake;
  car.speed = clamp(car.speed + ((throttle ? 15 : -4) - (brake ? 35 : 0) + (boost ? 12 : 0)) * dt, 0, boost ? MAX_SPEED + 14 : MAX_SPEED);
  car.x = clamp(car.x + steer * Math.min(12, car.speed * 0.22) * dt, -ROAD_LIMIT, ROAD_LIMIT);
  car.cooldown = Math.max(0, car.cooldown - dt);

  if (!input.fly && car.altitude === 0 && car.fuel >= 15) car.exhausted = false;
  car.thrusting = !!input.fly && car.speed >= 18 && car.fuel > 0 && !car.exhausted;
  if (car.thrusting) {
    car.verticalSpeed = Math.min(7, car.verticalSpeed + 19 * dt);
    car.fuel = Math.max(0, car.fuel - 19 * dt);
    if (car.fuel === 0) car.exhausted = true;
  } else if (car.altitude > 0) {
    car.verticalSpeed -= 11 * dt;
  } else if (!input.fly && !boost) {
    car.fuel = Math.min(100, car.fuel + 13 * dt);
  }
  if (boost) car.fuel = Math.max(0, car.fuel - 10 * dt);
  car.altitude = clamp(car.altitude + car.verticalSpeed * dt, 0, 12);
  if (car.altitude === 0 || car.altitude === 12) car.verticalSpeed = 0;
  const previousDistance = car.distance;
  car.distance += car.speed * dt;

  for (const traffic of race.traffic) {
    traffic.distance += traffic.speed * dt;
    // Recycle distant traffic so the same small scene stays populated for the full sprint.
    if (traffic.distance < car.distance - 60) traffic.distance += 1400;
  }
  race.rivals.forEach((rival, i) => {
    rival.speed = Math.min(70 + i * 3, rival.speed + (14 + i) * dt);
    const before = rival.distance;
    rival.distance += rival.speed * dt;
    const cycle = (race.elapsed + i * 3) % 13;
    rival.altitude = cycle > 6 && cycle < 11 ? Math.sin((cycle - 6) / 5 * Math.PI) * (5 + i) : 0;
    rival.thrusting = cycle > 6 && cycle < 9;
    if (rival.distance >= RACE_LENGTH && rival.finishTime === null) {
      rival.finishTime = race.elapsed - dt + Math.max(0, RACE_LENGTH - before) / rival.speed;
    }
  });

  if (car.cooldown === 0) {
    const obstacle = [...race.traffic, ...race.rivals].find(other =>
      Math.abs(other.distance - car.distance) < 4.4 && Math.abs(other.x - car.x) < 1.9 &&
      Math.abs((other.altitude || 0) - car.altitude) < 1.8,
    );
    if (obstacle) {
      car.speed *= 0.45;
      car.cooldown = 1.5;
      car.collisions++;
    }
  }
  if (car.distance >= RACE_LENGTH) {
    const finishTime = race.elapsed - dt + dt * (RACE_LENGTH - previousDistance) / (car.distance - previousDistance);
    const position = 1 + race.rivals.filter(rival => rival.finishTime !== null && rival.finishTime < finishTime).length;
    car.distance = RACE_LENGTH;
    race.elapsed = finishTime;
    race.result = { position, time: finishTime, collisions: car.collisions };
    race.phase = 'finished';
    car.thrusting = false;
  }
}
