import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, RIVAL_CAR_STYLES, makeCar } from '../src/car-model.js';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';

const named = (root, name) => {
  const matches = [];
  root.traverse(node => {
    if (node.name === name || node.userData.mergedPartNames?.includes(name)) matches.push(node);
  });
  return matches;
};

test('all seven AI drivers use individually sculpted silhouettes in exact race-grid order', () => {
  assert.equal(RIVAL_CAR_STYLES.length, 7);
  for (const [i, driver] of RACE_DRIVER_IDS.slice(1).entries()) {
    assert.equal(RIVAL_CAR_STYLES[i], CAR_STYLES[driver.toLowerCase()], driver);
    assert.ok(RIVAL_CAR_STYLES[i].body instanceof THREE.BufferGeometry, driver);
  }
  const profiles = RIVAL_CAR_STYLES.map(style => {
    const p = style.body.attributes.position.array;
    return Array.from(p, value => value.toFixed(3)).join(',');
  });
  assert.equal(new Set(profiles).size, 7, 'no duplicated car silhouette hidden behind a different paint color');
});

test('four newly distinguished racers have signature front/rear lighting and separate wings', () => {
  for (const id of ['vega', 'pulse', 'comet', 'rift']) {
    const car = makeCar(CAR_STYLES[id]);
    assert.ok(named(car, `${id} front signature`).length >= 2, id);
    assert.ok(named(car, `${id} rear signature`).length >= 2, id);
    assert.ok(car.userData.wing.parent === car, id);
    assert.equal(car.userData.wheels.length, 4, id);
    assert.equal(car.userData.jets.parent, car, id);
  }
});

test('commuter sedan, crossover and hatch use distinct low-key traffic silhouettes', () => {
  const styles = ['commuter', 'crossover', 'hatch'].map(id => CAR_STYLES[id]);
  assert.ok(styles.every(Boolean), 'three actual traffic model classes');
  const keys = styles.map(style => [...style.body.attributes.position.array].map(n => n.toFixed(3)).join(','));
  assert.equal(new Set(keys).size, 3);
  for (const style of styles) {
    const car = makeCar(style);
    const box = new THREE.Box3().setFromObject(car);
    assert.ok(box.min.y >= 0 && box.max.y < 2, 'traffic stays inside road-space height');
    assert.equal(car.userData.wheels.length, 4);
    assert.equal(named(car, 'Roadster recessed thruster').length, 0);
    assert.equal(named(car, 'Roadster aerofoil').length, 0);
  }
});

test('new race/traffic models do not hardcode a manufacturer badge', () => {
  for (const style of [...RIVAL_CAR_STYLES, CAR_STYLES.commuter, CAR_STYLES.crossover, CAR_STYLES.hatch]) {
    const car = makeCar(style);
    car.traverse(node => {
      assert.doesNotMatch(node.name || '', /tesla|logo|brand-badge|manufacturer/i);
    });
  }
});

test('Roadster nose and rear fascia retain distinct curved structural pieces without added logos', () => {
  const car = makeCar(CAR_STYLES.roadster);
  assert.equal(named(car, 'Roadster sculpted front fascia').length, 1);
  assert.equal(named(car, 'Roadster corner intake').length, 2);
  assert.equal(named(car, 'Roadster curved rear fascia').length, 1);
  assert.equal(named(car, 'Roadster rear light edge').length, 1);
  assert.equal(named(car, 'Roadster triangular headlamp').length, 2);
  assert.ok(car.userData.rearLight?.group?.parent === car);
  assert.equal(named(car, 'Roadster recessed thruster').length, 4);
});
