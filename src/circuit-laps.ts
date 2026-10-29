import { CIRCUIT_LENGTH } from './circuit-track.ts';

export interface LapTime { time: number; splits: number[] }
export interface CircuitDriver {
  completed: number; nextSector: number; valid: boolean;
  previousDistance: number; previousX: number; previousAltitude: number; falls: number;
  lapStart: number; splits: number[]; lapTimes: LapTime[]; finishTime: number | null;
}
interface Car { distance: number; x: number; altitude: number; falls?: number; finishTime?: number | null; speed: number }
export interface CircuitState { laps: number; player: CircuitDriver; rivals: Record<string, CircuitDriver> }
const createDriver = (x: number): CircuitDriver => ({
  completed: 0, nextSector: 1, valid: true, previousDistance: 0, previousX: x, previousAltitude: 0,
  falls: 0, lapStart: 0, splits: [], lapTimes: [], finishTime: null,
});
export function createCircuit(laps: number): CircuitState {
  if (![1, 3, 5].includes(laps)) throw new RangeError('Circuit laps must be 1, 3 or 5');
  return { laps, player: createDriver(2.5), rivals: Object.fromEntries(
    ['NOVA', 'ORBIT', 'APEX'].map((name, i) => [name, createDriver([-7.5, -2.5, 7.5][i])]),
  ) };
}

/** Every sector must be physically swept in order, including the finish plane. */
export function stepCircuitDriver(state: CircuitDriver, car: Car, laps: number, elapsed: number, dt: number): void {
  if (!state.valid || state.finishTime !== null) return;
  const delta = car.distance - state.previousDistance;
  // Fixed-step arcade cars top out below 140 m/s. Discontinuities invalidate the run until retry.
  const sane = [car.distance, car.x, car.altitude, elapsed, dt].every(Number.isFinite) && dt > 0 && dt <= .1 &&
    delta >= 0 && delta <= 140 * dt + .01 && Math.abs(car.x) <= 10.2 + 1e-6 &&
    car.altitude >= 0 && car.altitude <= 12 && (car.falls ?? 0) === state.falls;
  if (!sane) { state.valid = false; return; }
  const sectorDistance = state.nextSector * CIRCUIT_LENGTH / 4;
  if (state.previousDistance < sectorDistance && car.distance >= sectorDistance) {
    const fraction = (sectorDistance - state.previousDistance) / delta;
    const x = state.previousX + (car.x - state.previousX) * fraction;
    const altitude = state.previousAltitude + (car.altitude - state.previousAltitude) * fraction;
    if (Math.abs(x) > 10.2 || altitude < 0 || altitude > 12) { state.valid = false; return; }
    const time = elapsed - dt + fraction * dt;
    state.splits.push(time - state.lapStart);
    state.nextSector++;
    if (state.splits.length === 4) {
      state.lapTimes.push({ time: time - state.lapStart, splits: state.splits });
      state.splits = []; state.lapStart = time; state.completed++;
      if (state.completed === laps) state.finishTime = time;
    }
  }
  state.previousDistance = car.distance;
  state.previousX = car.x;
  state.previousAltitude = car.altitude;
}
interface CircuitRace {
  circuit?: CircuitState | null; elapsed: number; length: number;
  player: Car; rivals: (Car & { name: string })[];
}
export function stepCircuit(race: CircuitRace, dt: number): void {
  const circuit = race.circuit;
  if (!circuit) return;
  stepCircuitDriver(circuit.player, race.player, circuit.laps, race.elapsed, dt);
  for (const rival of race.rivals) {
    const driver = circuit.rivals[rival.name];
    stepCircuitDriver(driver, rival, circuit.laps, race.elapsed, dt);
    rival.finishTime = driver.finishTime;
    if (driver.finishTime !== null) { rival.distance = race.length; rival.speed = 0; }
  }
}

// Identity and group are lap-specific; unwrapped distances prevent paying an earlier lap twice.
export function lapItems<T extends { distance: number; group?: number }>(items: readonly T[], laps: number, kind: string) {
  const groups = 1 + Math.max(0, ...items.map(item => item.group ?? 0));
  return Array.from({ length: laps }, (_, lap) => items.map((item, index) => ({
    ...item, id: `${kind}:${lap}:${index}`, lap, distance: item.distance + lap * CIRCUIT_LENGTH,
    ...(item.group !== undefined ? { group: item.group + lap * groups } : {}),
  }))).flat();
}
