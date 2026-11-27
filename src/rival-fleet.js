import { Box3 } from 'three';
import { applyCarReflections } from './car-reflections.ts';
import { attachRivalDriveVfx } from './rival-drive-vfx.ts';
import { RACE_DRIVER_IDS } from './race-grid.ts';
import { seededRng, randomVisualSeed } from './rng.ts';
import { vehicleContactSize } from './vehicle-contact-size.js';
import { disposeRivalLods, instanceRivalWheels, makeMotorsportRival, setRivalQuality } from './rival-car-kit.js';

const driverIds = RACE_DRIVER_IDS.slice(1);

// Main coat, graphics colour and alloy finish are curated together for contrast.
// A full grid draws one entry from each hue family.
const liveries = {
  scarlet: [['#c5293f','#f7caba','#9ca3ab'],['#8d1835','#ecaa65','#b4a089'],['#e34c55','#431e26','#78838f']],
  amber: [['#daa330','#40272e','#ada592'],['#de7532','#ffe4a6','#8995a0'],['#aa713a','#f4d596','#c4ae89']],
  citrus: [['#a4b82f','#253750','#b3b2ad'],['#719239','#e7f0ac','#9daab2'],['#c7c940','#494342','#798292']],
  mint: [['#1aa98f','#d1f2de','#aaa172'],['#187e67','#debc7f','#b6bdac'],['#38958c','#d8eaff','#7f9a9b']],
  cobalt: [['#386bc9','#bddfff','#afc2d5'],['#1d459e','#e1a15f','#93a3af'],['#4d83e3','#243455','#bfc8ce']],
  orchid: [['#925ac6','#f5d7f0','#aaa3b5'],['#573ba0','#acd8e0','#c0b2a8'],['#a55694','#fbcca4','#8a8395']],
  pearl: [['#dbe7eb','#316a97','#a1abb5'],['#c3bbae','#9c4a31','#9ca3aa'],['#8a929e','#e9d16a','#bdc3b5']],
};

function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function rivalLineup(seed) {
  const random = seededRng(seed, 'rival-motorsport-lineup-v1');
  const chassis = shuffled(driverIds.keys(), random);
  const families = shuffled(Object.keys(liveries), random);
  return Object.fromEntries(driverIds.map((id, i) => {
    const family = families[i], choices = liveries[family];
    const [paint, graphics, alloy] = choices[Math.floor(random() * choices.length)];
    return [id, { chassis: chassis[i], livery: { family, paint, graphics, alloy } }];
  }));
}

export function createRivalFleet(scene, environment) {
  const pool = driverIds.map((_,index) => {
    const car = makeMotorsportRival(index);
    const { body, rivalGraphics, wheels } = car.userData;
    car.userData.rivalHull = new Box3().setFromObject(car,true);
    car.userData.defaultCoat = [body.material.color.clone(), rivalGraphics.color.clone(), wheels[0].children[1].material.color.clone()];
    applyCarReflections(car,environment,'outdoor');
    attachRivalDriveVfx(car);
    scene.add(car);
    return car;
  });
  for (const car of pool) instanceRivalWheels(car); // after every rival: flicker phases read object ids
  const cars = [...pool];
  let lastRace, lastSeed, lastQuality;
  let lastDrivers = [];
  return {
    cars,
    dispose() { for (const car of pool) disposeRivalLods(car); },
    sync(race,quality) {
      const field = race.rivals;
      const seed = race.phase === 'ready' ? undefined
        : race.rivalVisualSeed ?? (race === lastRace ? lastSeed : undefined) ?? randomVisualSeed();
      let changed = race !== lastRace || seed !== lastSeed || field.length !== lastDrivers.length;
      for (let i = 0; !changed && i < field.length; i++) changed = field[i].id !== lastDrivers[i];

      if (changed) {
        const lineup = seed === undefined ? null : rivalLineup(seed);
        const active = field.map(rival=>rival.id);
        const order = [...active,...driverIds.filter(id=>!active.includes(id))];
        order.forEach((id,i)=>{
          const { chassis, livery } = lineup?.[id] ?? { chassis: driverIds.indexOf(id) };
          const car = cars[i] = pool[chassis];
          car.userData.rivalDriverId = id;
          const { body, rivalGraphics, wheels, defaultCoat, rivalHull } = car.userData;
          body.material.color.set(livery?.paint ?? defaultCoat[0]);
          rivalGraphics.color.set(livery?.graphics ?? defaultCoat[1]);
          wheels[0].children[1].material.color.set(livery?.alloy ?? defaultCoat[2]);
          car.scale.set(1,1,1);
          car.userData.rivalFitOffset = 0;
          if (i < active.length) {
            const { front, rear, halfWidth } = vehicleContactSize(race,field[i]);
            car.scale.x = Math.min(1,halfWidth/Math.max(-rivalHull.min.x,rivalHull.max.x));
            car.scale.z = (front+rear-.014)/(rivalHull.max.z-rivalHull.min.z);
            car.userData.rivalFitOffset = -front+.007-car.scale.z*rivalHull.min.z;
          }
          car.updateMatrixWorld(true);
        });
        lastRace = race;
        lastSeed = seed;
        lastDrivers = active;
      }
      if (quality !== lastQuality) {
        for (const car of pool) setRivalQuality(car,quality);
        lastQuality = quality;
      }
      return changed;
    },
  };
}
