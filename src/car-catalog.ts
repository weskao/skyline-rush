// Player cars (Task 7). Every car drives on the same simulation, pivots and VFX ports; a car only changes what is drawn.
// The equipped car is saved on the device and rides Cloud Save as the optional `car` field (cloud-progress-merge.ts,
// firestore.rules); each car's paint is a local save, like the equipped paint.
import { PAINTS, type PaintPreset } from './appearance.ts';
import { loadPaint, savePaint } from './history-achievements.ts';
import { readStored, writeStored, type HistoryStorage } from './history-storage.ts';

export type CarId = 'roadster' | 'crimson-gt';
/** model: MODEL_MANIFEST id drawn over the procedural car, or null for the procedural Roadster itself.
 *  factory: the finish shown until the player picks a paint for this car. */
interface CarEntry { model: string | null; factory?: PaintPreset }
export const CARS: Readonly<Record<CarId, CarEntry>> = {
  roadster: { model: null },
  'crimson-gt': { model: 'crimson-gt', factory: { name: 'Factory Crimson', paint: '#9a1424', light: [2.4, 0.02, 0.05], stars: 0, metalness: 0.74, roughness: 0.17 } },
};
/** Paint id of a car's factory finish: always owned, listed only for cars that have one. */
export const FACTORY_PAINT = 'factory';
export const CAR_KEY = 'skyline-rush-car';
const CAR_PAINTS_KEY = 'skyline-rush-car-paints'; // { [car]: paint id }; the Roadster keeps the older single-paint key

export const isCar = (id: unknown): id is CarId => typeof id === 'string' && Object.hasOwn(CARS, id);
const factoryOf = (car: CarId): PaintPreset | undefined => CARS[car].factory;
export const carPaints = (car: CarId): Record<string, PaintPreset> => {
  const factory = factoryOf(car);
  return factory ? { [FACTORY_PAINT]: factory, ...PAINTS } : PAINTS;
};
export const defaultPaint = (car: CarId): string => factoryOf(car) ? FACTORY_PAINT : 'pearl';

/** The car this device's player picked; undefined until they pick one. */
export function savedCar(storage?: HistoryStorage): CarId | undefined {
  const id = readStored(CAR_KEY, storage);
  return isCar(id) ? id : undefined;
}
/** A save from before cars existed has no entry: it loads as the Roadster. */
export const loadCar = (storage?: HistoryStorage): CarId => savedCar(storage) ?? 'roadster';

export function loadCarPaint(car: CarId, owned: readonly string[], storage?: HistoryStorage): string {
  if (!factoryOf(car)) return loadPaint(owned, storage);
  const saved = readStored(CAR_PAINTS_KEY, storage);
  const id = saved !== null && typeof saved === 'object' && Object.hasOwn(saved, car) ? (saved as Record<string, unknown>)[car] : null;
  return typeof id === 'string' && (id === FACTORY_PAINT || owned.includes(id)) ? id : FACTORY_PAINT;
}
export function saveCarPaint(car: CarId, id: string, storage?: HistoryStorage): void {
  if (!factoryOf(car)) { savePaint(id, storage); return; }
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
