// Player cars (Task 7). Every car drives on the same simulation, pivots and VFX ports; a car only changes what is drawn.
// The equipped car is saved on the device and rides Cloud Save as the optional `car` field (cloud-progress-merge.ts,
// firestore.rules); each car's paint is a local save, like the equipped paint.
import { loadPaint, loadStars, savePaint } from './history-achievements.ts';
import { starTotal } from './history-stats.ts';
import { readStored, writeStored, type HistoryStorage } from './history-storage.ts';
import { garagePlaytestStorage } from '#garage-playtest-storage';

export const GT_UNLOCK_STARS = 18;
/** model: MODEL_MANIFEST id drawn over the procedural fallback.
 *  defaultPaint: a shared paint shown until the player picks one for this car.
 *  No size field: car-display-size.ts measures each GLB and shows it at the Roadster's size. */
interface CarEntry { model: string; defaultPaint: string; stars: number }
export const CARS = Object.freeze({
  roadster: { model: 'roadster2', defaultPaint: 'pearl', stars: 0 },
  'crimson-gt': { model: 'crimson-gt', defaultPaint: 'crimson', stars: GT_UNLOCK_STARS },
} satisfies Record<string, CarEntry>);
export type CarId = keyof typeof CARS;
export const CAR_KEY = 'skyline-rush-car';
export const GT_TRIAL_KEY = 'skyline-rush-gt-trial-started-at';
const GT_TRIAL_MS = 24 * 60 * 60 * 1000;
type CarAccess = 'locked' | 'trial' | 'owned';

export function validTrialStart(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
export function savedGtTrial(storage?: HistoryStorage): number | undefined {
  const value = readStored(GT_TRIAL_KEY, storage);
  return validTrialStart(value) ? value : undefined;
}
export function gtAccess(stars: number, startedAt: number | undefined, now = Date.now()): CarAccess {
  if (stars >= GT_UNLOCK_STARS) return 'owned';
  return startedAt !== undefined && startedAt <= now && now < startedAt + GT_TRIAL_MS ? 'trial' : 'locked';
}
export function gtTrialEndsAt(startedAt: number): number {
  return startedAt + GT_TRIAL_MS;
}
export function startGtTrial(stars: number, storage?: HistoryStorage, now = Date.now()): boolean {
  if (!validTrialStart(now) || stars >= GT_UNLOCK_STARS || savedGtTrial(storage) !== undefined) return false;
  writeStored(GT_TRIAL_KEY, now, storage);
  return savedGtTrial(storage) === now;
}
const CAR_PAINTS_KEY = 'skyline-rush-car-paints'; // { [car]: paint id }; the Roadster keeps the older single-paint key

export const isCar = (id: unknown): id is CarId => typeof id === 'string' && Object.hasOwn(CARS, id);
export const defaultPaint = (car: CarId): string => CARS[car].defaultPaint;
export const carArtwork = (id: CarId): string => `feature-assets/garage-public/car-picker/${id}@3x.webp`;
export const earnedCars = (stars: number): CarId[] =>
  Object.keys(CARS).filter(isCar).filter(id => stars >= CARS[id].stars);

/** The car this device's player picked; undefined until they pick one. */
export function savedCar(storage?: HistoryStorage): CarId | undefined {
  const id = readStored(CAR_KEY, storage);
  return isCar(id) ? id : undefined;
}
export function carAccess(id: CarId, stars: number, gtTrial?: number, now = Date.now()): CarAccess {
  if (garagePlaytestStorage || stars >= CARS[id].stars) return 'owned';
  return id === 'crimson-gt' ? gtAccess(stars, gtTrial, now) : 'locked';
}
function canUseCar(id: CarId, stars: number, storage?: HistoryStorage): boolean {
  return carAccess(id, stars, id === 'crimson-gt' ? savedGtTrial(storage) : undefined) !== 'locked';
}

/** A legacy selection by itself conveys no eligibility. Keep it for a future qualified restore. */
export function loadCar(storage?: HistoryStorage, stars = starTotal(loadStars(storage))): CarId {
  const testPick = garagePlaytestStorage && savedCar(garagePlaytestStorage);
  const id = testPick ?? savedCar(storage) ?? 'roadster';
  return canUseCar(id, stars, storage) ? id : 'roadster';
}

export function loadCarPaint(car: CarId, owned: readonly string[], storage?: HistoryStorage): string {
  storage = garagePlaytestStorage ?? storage;
  if (car === 'roadster') return loadPaint(owned, storage);
  const saved = readStored(CAR_PAINTS_KEY, storage);
  const id = saved !== null && typeof saved === 'object' && Object.hasOwn(saved, car) ? (saved as Record<string, unknown>)[car] : null;
  // Older GT saves used a private ID for the same red finish.
  if (car === 'crimson-gt' && id === 'factory') return 'crimson';
  return typeof id === 'string' && owned.includes(id) ? id : defaultPaint(car);
}
export function saveCarPaint(car: CarId, id: string, storage?: HistoryStorage): void {
  storage = garagePlaytestStorage ?? storage;
  if (car === 'roadster') { savePaint(id, storage); return; }
  const saved = readStored(CAR_PAINTS_KEY, storage);
  writeStored(CAR_PAINTS_KEY, { ...(saved !== null && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}), [car]: id }, storage);
}

let equipped: CarId | undefined;
/** Read once from storage, then held here: the world asks every frame (garage-model.ts). */
export const equippedCar = (): CarId => equipped ??= loadCar();
export const equippedCarModel = (): string => CARS[equippedCar()].model;
/** Cloud Save or a backup import wrote the car into storage (cloud-progress.ts): hold that one. */
export const reloadCar = (storage?: HistoryStorage, stars?: number): CarId => equipped = loadCar(storage, stars);

/** Re-evaluate time-limited access at a new race boundary, outside the renderer's frame loop. */
export function validateEquippedCar(stars: number, storage?: HistoryStorage): CarId {
  if (!canUseCar(equippedCar(), stars, storage)) equipped = 'roadster';
  return equippedCar();
}
export function equipCar(id: CarId, storage?: HistoryStorage, stars = starTotal(loadStars(storage))): boolean {
  if (!isCar(id) || !canUseCar(id, stars, storage)) return false;
  equipped = id;
  writeStored(CAR_KEY, id, garagePlaytestStorage ?? storage);
  return true;
}

let garagePreview: CarId | null = null;
export const setGaragePreviewCar = (id: CarId | null): void => { garagePreview = id; };
export const garagePreviewModel = (): string | undefined => garagePreview ? CARS[garagePreview].model : undefined;
