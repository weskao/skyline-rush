// Player car catalog (Task 7): which cars exist, which one is equipped, and each car's own paint memory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAINTS } from '../src/appearance.ts';
import { CARS, FACTORY_PAINT, carPaints, defaultPaint, equipCar, equippedCar, equippedCarModel, isCar, loadCar, loadCarPaint, reloadCar, saveCarPaint, savedCar } from '../src/car-catalog.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';
import { createWorldGarageModel, dressesRaceCar } from '../src/garage-model.ts';

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, data };
};
const OWNED = ['pearl', 'aurora', 'cobalt'];

test('two cars: the procedural Roadster and the Crimson GT model from the manifest', () => {
  assert.deepEqual(Object.keys(CARS), ['roadster', 'crimson-gt']);
  assert.equal(CARS.roadster.model, null, 'the Roadster stays procedural');
  assert.ok(MODEL_MANIFEST[CARS['crimson-gt'].model], 'the GT model is a manifest entry');
  assert.equal(dressesRaceCar(CARS['crimson-gt'].model), true, 'the GT dresses the Home showcase and the race car');
  assert.ok(isCar('crimson-gt') && !isCar('toString') && !isCar(undefined));
});

test('an old save without a car field loads as the Roadster; unknown ids too', () => {
  assert.equal(loadCar(memoryStorage({ 'skyline-rush-paint': '"aurora"' })), 'roadster');
  assert.equal(loadCar(memoryStorage({ 'skyline-rush-car': '"hovercraft"' })), 'roadster');
  assert.equal(loadCar(memoryStorage({ 'skyline-rush-car': '"toString"' })), 'roadster');
  assert.equal(loadCar(memoryStorage({ 'skyline-rush-car': '{broken' })), 'roadster');
});

test('the equipped car is saved and read back', () => {
  const storage = memoryStorage();
  equipCar('crimson-gt', storage);
  assert.equal(equippedCar(), 'crimson-gt');
  assert.equal(equippedCarModel(), 'crimson-gt');
  assert.equal(loadCar(storage), 'crimson-gt');
  equipCar('roadster', storage);
  assert.equal(equippedCarModel(), null);
  assert.equal(loadCar(storage), 'roadster');
});

test('Crimson GT lists its factory red ahead of the six paints; the Roadster list is unchanged', () => {
  assert.equal(carPaints('roadster'), PAINTS);
  assert.deepEqual(Object.keys(carPaints('crimson-gt')), [FACTORY_PAINT, ...Object.keys(PAINTS)]);
  assert.equal(carPaints('crimson-gt')[FACTORY_PAINT].paint, '#9a1424');
  assert.equal(carPaints('crimson-gt')[FACTORY_PAINT].stars, 0);
  assert.equal(defaultPaint('roadster'), 'pearl');
  assert.equal(defaultPaint('crimson-gt'), FACTORY_PAINT);
});

test('paint is remembered per car; the Roadster keeps the existing save key', () => {
  const storage = memoryStorage({ 'skyline-rush-paint': '"aurora"' });
  assert.equal(loadCarPaint('roadster', OWNED, storage), 'aurora', 'existing Roadster paint still loads');
  assert.equal(loadCarPaint('crimson-gt', OWNED, storage), FACTORY_PAINT, 'a car with no choice shows its factory colour');
  saveCarPaint('crimson-gt', 'cobalt', storage);
  assert.equal(loadCarPaint('crimson-gt', OWNED, storage), 'cobalt');
  assert.equal(loadCarPaint('roadster', OWNED, storage), 'aurora', 'the GT choice never touches the Roadster');
  saveCarPaint('roadster', 'pearl', storage);
  assert.equal(JSON.parse(storage.data.get('skyline-rush-paint')), 'pearl');
  assert.equal(loadCarPaint('crimson-gt', OWNED, storage), 'cobalt');
  saveCarPaint('crimson-gt', FACTORY_PAINT, storage);
  assert.equal(loadCarPaint('crimson-gt', OWNED, storage), FACTORY_PAINT, 'back to the factory colour');
});

test('a saved paint the player does not own, or a damaged save, falls back to the car default', () => {
  assert.equal(loadCarPaint('crimson-gt', ['pearl'], memoryStorage({ 'skyline-rush-car-paints': '{"crimson-gt":"obsidian"}' })), FACTORY_PAINT);
  assert.equal(loadCarPaint('crimson-gt', OWNED, memoryStorage({ 'skyline-rush-car-paints': '"cobalt"' })), FACTORY_PAINT);
  assert.equal(loadCarPaint('crimson-gt', OWNED, memoryStorage({ 'skyline-rush-car-paints': '{"crimson-gt":"toString"}' })), FACTORY_PAINT);
  assert.equal(loadCarPaint('roadster', OWNED, memoryStorage({ 'skyline-rush-paint': '"factory"' })), 'pearl', 'the Roadster has no factory entry');
});

test('world adapter: no model for the Roadster, the equipped GT without any URL flag, the Roadster again after switching back', () => {
  const canvas = { dataset: {}, addEventListener() {}, removeEventListener() {} };
  let car = null;
  const home = { name: 'home', car: { children: [], userData: {}, traverse() {}, add() {} }, keep: {}, scene: {} };
  const world = createWorldGarageModel(canvas, { compileAsync: async () => {} }, {}, '', '/', () => car);
  world.frame('high', 'ready', false, null, null, home);
  assert.equal(canvas.dataset.garageModel, undefined, 'Roadster: the adapter stays idle');
  car = 'crimson-gt';
  world.frame('high', 'ready', false, null, null, home);
  assert.equal(canvas.dataset.garageModel, 'loading', 'GT: requested on Home, outside the Garage');
  car = null;
  world.frame('high', 'racing', false, null, null, home);
  assert.equal(canvas.dataset.garageModel, 'loading', 'never swapped mid-race');
  world.frame('high', 'ready', false, null, null, home);
  assert.equal(canvas.dataset.garageModel, 'off', 'back to the procedural Roadster');
  world.dispose();
});

test('a car restored into storage by Cloud Save replaces the one held in memory', () => {
  const storage = memoryStorage();
  equipCar('roadster', storage);
  storage.setItem('skyline-rush-car', '"crimson-gt"');
  assert.equal(equippedCar(), 'roadster', 'held in memory until asked to reload');
  assert.equal(reloadCar(storage), 'crimson-gt');
  assert.equal(equippedCar(), 'crimson-gt');
  assert.equal(savedCar(memoryStorage()), undefined, 'no explicit choice');
  assert.equal(savedCar(storage), 'crimson-gt');
});

test('the simulation does not know the car: the same drive collides and ends identically in either car', async () => {
  const { createRace, startRace, stepRace } = await import('../src/game.js');
  const drive = car => {
    equipCar(car, memoryStorage());
    const race = createRace('coast');
    startRace(race);
    // Full throttle, weaving across the road: 11 collisions in 45 s on Coast.
    for (let i = 0; i < 60 * 45; i++) stepRace(race, { throttle: true, steer: Math.sin(i / 90), laneAssist: false }, 1 / 60);
    return race;
  };
  const roadster = drive('roadster'), gt = drive('crimson-gt');
  assert.ok(roadster.player.distance > 500, `the drive covers ground: ${roadster.player.distance}`);
  assert.ok(roadster.player.collisions > 0, 'the drive includes collisions, so the collision box is exercised');
  assert.deepEqual(JSON.parse(JSON.stringify(gt.player)), JSON.parse(JSON.stringify(roadster.player)));
  assert.deepEqual(JSON.parse(JSON.stringify(gt.rivals)), JSON.parse(JSON.stringify(roadster.rivals)));
});
