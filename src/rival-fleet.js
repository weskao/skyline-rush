import { Box3 } from 'three';
import { makeCar, RIVAL_CAR_STYLES } from './car-model.js';
import { applyCarReflections } from './car-reflections.ts';
import { attachRivalDriveVfx } from './rival-drive-vfx.ts';
import { RACE_DRIVER_IDS } from './race-grid.ts';
import { seededRng } from './rng.ts';
import { vehicleContactSize } from './vehicle-contact-size.js';
import { addRivalAero, setRivalDetails } from './rival-body.js';

const drivers = RACE_DRIVER_IDS.slice(1);
// Keep each field readable in the chase camera: a separate hue family per
// car, two hand-paired finishes per family, with paint, trim and wheel tones.
const finishes = {
  red: [['#d63444', '#f4b0a1', '#b5a7a6'], ['#bf254e', '#f6b996', '#728199']],
  gold: [['#e3a13c', '#f8ddaa', '#b7aca1'], ['#cd7035', '#ffd18c', '#8a919b']],
  lime: [['#a8c638', '#eef5b5', '#666d84'], ['#7caa3f', '#d6f3ab', '#afb6b5']],
  jade: [['#0eb39e', '#a2f1d3', '#6b908d'], ['#249860', '#a9d1ad', '#c3ac85']],
  blue: [['#3879df', '#a5d7ff', '#a7bdcf'], ['#245ebf', '#83c9f8', '#92a4b0']],
  violet: [['#9a57cb', '#e9b9f6', '#adb4c5'], ['#7749ad', '#c8a9f8', '#a69b92']],
  pearl: [['#dbe5ee', '#557eaa', '#878e98'], ['#c6c2bc', '#efa258', '#748197']],
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
  const random = seededRng(seed, 'rival-supercar-lineup-v1');
  const chassis = shuffled(RIVAL_CAR_STYLES.keys(), random);
  const families = shuffled(Object.keys(finishes), random);
  return Object.fromEntries(drivers.map((id, i) => {
    const family = families[i];
    const [paint, accent, wheels] = finishes[family][Math.floor(random() * finishes[family].length)];
    return [id, { chassis: chassis[i], livery: { family, paint, accent, wheels } }];
  }));
}

export function createRivalFleet(scene, environment) {
  const pool = RIVAL_CAR_STYLES.map((style, chassis) => {
    const car = makeCar(style, style.color, true);
    addRivalAero(car, chassis);
    car.userData.rivalHull = new Box3().setFromObject(car, true);
    applyCarReflections(car, environment);
    attachRivalDriveVfx(car);
    scene.add(car);
    return car;
  });
  const cars = [...pool];
  let lastRace, lastSeed, lastDetailed;
  let lastDrivers = [];
  return {
    cars,
    sync(race, quality) {
      const seed = race.phase === 'ready' ? undefined : race.rivalVisualSeed;
      const field = race.rivals;
      let changed = race !== lastRace || seed !== lastSeed || field.length !== lastDrivers.length;
      for (let i = 0; !changed && i < field.length; i++) changed = field[i].id !== lastDrivers[i];
      if (changed) {
        const lineup = seed === undefined ? null : rivalLineup(seed);
        // Append the unused drivers to keep the seven lobby/preview slots populated.
        const active = field.map(rival => rival.id);
        const order = [...active, ...drivers.filter(id => !active.includes(id))];
        order.forEach((id, i) => {
          const { chassis, livery } = lineup?.[id] ?? { chassis: drivers.indexOf(id) };
          const car = cars[i] = pool[chassis];
          const { body, wheels, rivalAccent, rivalHull } = car.userData;
          body.material.color.set(livery?.paint ?? RIVAL_CAR_STYLES[chassis].color);
          wheels[0].children[1].material.color.set(livery?.wheels ?? '#8a96a0'); // all four rims share this material
          rivalAccent.color.set(livery?.accent ?? '#aebbc1');
          car.scale.set(1, 1, 1);
          car.userData.rivalFitOffset = 0;
          if (lineup && i < active.length) {
            // Fit to each driver's original longitudinal contacts without changing simulation,
            // the physics pivot, track-relative pose, or the wheel-to-road height.
            const { front, rear, halfWidth } = vehicleContactSize(race, field[i]);
            car.scale.x = Math.min(1, halfWidth / Math.max(-rivalHull.min.x, rivalHull.max.x));
            car.scale.z = (front + rear - 0.014) / (rivalHull.max.z - rivalHull.min.z);
            car.userData.rivalFitOffset = -front + 0.007 - car.scale.z * rivalHull.min.z;
          }
          car.updateMatrixWorld(true);
        });
        lastRace = race;
        lastSeed = seed;
        lastDrivers = active;
      }
      const detailed = quality !== 'low';
      if (detailed !== lastDetailed) {
        for (const car of pool) setRivalDetails(car, detailed);
        lastDetailed = detailed;
      }
      return changed;
    },
  };
}
