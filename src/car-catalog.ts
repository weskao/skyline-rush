// Player cars (Task 7). Every car drives on the same simulation, pivots and VFX ports; a car only changes what is drawn.
// The equipped car is saved on the device and rides Cloud Save as the optional `car` field (cloud-progress-merge.ts,
// firestore.rules); each car's paint is a local save, like the equipped paint.
import { loadPaint, savePaint } from './history-achievements.ts';
import { readStored, writeStored, type HistoryStorage } from './history-storage.ts';

export type CarId = 'roadster' | 'crimson-gt';
/** model: MODEL_MANIFEST id drawn over the procedural car, or null for the procedural Roadster itself.
 *  defaultPaint: a shared paint shown until the player picks one for this car.
 *  No size field: car-display-size.ts measures each GLB and shows it at the Roadster's size. */
interface CarEntry { model: string | null; defaultPaint: string }
export const CARS: Readonly<Record<CarId, CarEntry>> = {
  roadster: { model: null, defaultPaint: 'pearl' },
  'crimson-gt': { model: 'crimson-gt', defaultPaint: 'crimson' },
};
export const CAR_KEY = 'skyline-rush-car';
const CAR_PAINTS_KEY = 'skyline-rush-car-paints'; // { [car]: paint id }; the Roadster keeps the older single-paint key

export const isCar = (id: unknown): id is CarId => typeof id === 'string' && Object.hasOwn(CARS, id);
export const defaultPaint = (car: CarId): string => CARS[car].defaultPaint;

/** The car this device's player picked; undefined until they pick one. */
export function savedCar(storage?: HistoryStorage): CarId | undefined {
  const id = readStored(CAR_KEY, storage);
  return isCar(id) ? id : undefined;
}
/** A save from before cars existed has no entry: it loads as the Roadster. */
export const loadCar = (storage?: HistoryStorage): CarId => savedCar(storage) ?? 'roadster';

export function loadCarPaint(car: CarId, owned: readonly string[], storage?: HistoryStorage): string {
  if (car === 'roadster') return loadPaint(owned, storage);
  const saved = readStored(CAR_PAINTS_KEY, storage);
  const id = saved !== null && typeof saved === 'object' && Object.hasOwn(saved, car) ? (saved as Record<string, unknown>)[car] : null;
  // Older GT saves used a private ID for the same red finish.
  if (car === 'crimson-gt' && id === 'factory') return 'crimson';
  return typeof id === 'string' && owned.includes(id) ? id : defaultPaint(car);
}
export function saveCarPaint(car: CarId, id: string, storage?: HistoryStorage): void {
  if (car === 'roadster') { savePaint(id, storage); return; }
  const saved = readStored(CAR_PAINTS_KEY, storage);
  writeStored(CAR_PAINTS_KEY, { ...(saved !== null && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}), [car]: id }, storage);
}

let equipped: CarId | undefined;
/** Read once from storage, then held here: the world asks every frame (garage-model.ts). */
export const equippedCar = (): CarId => equipped ??= loadCar();
export const equippedCarModel = (): string | null => CARS[equippedCar()].model;
/** Cloud Save or a backup import wrote the car into storage (cloud-progress.ts): hold that one. */
export const reloadCar = (storage?: HistoryStorage): CarId => equipped = loadCar(storage);
export function equipCar(id: CarId, storage?: HistoryStorage): void {
  equipped = id;
  writeStored(CAR_KEY, id, storage);
}
