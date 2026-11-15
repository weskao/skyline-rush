import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3 } from 'three';
import { parseGlb } from '../scripts/assets/check-glb.mjs';
import { CAR_STYLES, RIVAL_CAR_STYLES, TRAFFIC_CAR_STYLES, makeCar } from '../src/car-model.js';
import { fitToRoadsterSize } from '../src/car-display-size.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { vehicleContactSize } from '../src/vehicle-contact-size.js';

function assertCalibrated(size, model, hull) {
  const outer = new Box3().setFromObject(model, true);
  for (const [part, measured, allowed] of [
    ['flank', Math.max(hull.max.x, -hull.min.x), size.halfWidth],
    ['nose', -outer.min.z, size.front],
    ['tail', outer.max.z, size.rear],
  ]) {
    assert.ok(allowed >= measured - 1e-6, `${part} ${measured} m exceeds contact envelope ${allowed} m`);
    assert.ok(allowed - measured < 0.24, `${part} contact envelope at ${allowed} m blocks empty space`);
  }
}

test('neutral race hulls and tires fit inside their calibrated vehicle contact envelopes', () => {
  const player = {}, traffic = TRAFFIC_CAR_STYLES.map(() => ({}));
  const race = { player, traffic };
  const rivals = RACE_DRIVER_IDS.slice(1).map(name => ({ name }));
  for (const [index, car] of [player, ...rivals, ...traffic].entries()) {
    const styles = [CAR_STYLES.roadster, ...RIVAL_CAR_STYLES, ...TRAFFIC_CAR_STYLES];
    const model = makeCar(styles[index]);
    model.scale.setScalar(traffic.includes(car) ? 0.96 : 1);
    model.updateMatrixWorld(true);
    const hull = new Box3().setFromObject(model.userData.body, true);
    for (const wheel of model.userData.wheels) hull.expandByObject(wheel, true);
    assertCalibrated(vehicleContactSize(race, car), model, hull);
  }
});

for (const model of ['roadster2', 'crimson-gt']) for (const quality of ['', '-low']) {
  test(`${model}${quality} fits the same collision rules once dressed for the race`, async () => {
    const { scene } = await parseGlb(readFileSync(new URL(`../public/models/${model}/${model}${quality}.glb`, import.meta.url)));
    fitToRoadsterSize(scene);
    const player = {};
    assertCalibrated(vehicleContactSize({ player }, player), scene, new Box3().setFromObject(scene, true));
  });
}
