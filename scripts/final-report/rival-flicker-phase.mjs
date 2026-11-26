// Checks that a rival flame size difference between two builds comes only from the flicker phase (car.id * 1.7, and
// Object3D ids follow creation order): predicts every recorded BOOST/NITRO flame from its parent car id and race time
// with rivalDriveCue, for both builds.
// Usage: node scripts/final-report/rival-flicker-phase.mjs <visual-rng-hide-watch:rival nitro-*.json>...
import { readFileSync } from 'node:fs';
import { rivalDriveCue } from '../../src/rival-drive-vfx.ts';

const FLAME_HEIGHT = 0.62, BOOST_OPACITY = 0.9 * 0.65; // rival-drive-vfx.ts: FLAME.height, boostFlame opacity
const flame = (id, t, nitro) => rivalDriveCue({ nitroTime: nitro ? 1 : 0, boosting: !nitro }, 'high', true, false, t, id * 1.7,
  { light: 1, flame: 0, trail: 0 }, 0).flame;
let worst = 0;
for (const file of process.argv.slice(2)) {
  for (const s of JSON.parse(readFileSync(file, 'utf8')).scenes) {
    if (s.error) { console.log(s.id, 'ERROR', s.error); continue; }
    s.watched.forEach((list, b) => {
      const t = s.elapsed[b];
      for (const w of list ?? []) {
        const nitro = Math.abs(w.opacity - BOOST_OPACITY) > 1e-6, seen = w.world[5] / FLAME_HEIGHT; // world y scale = height * cue.flame (Volcanic Crown parents scale x and z by 0.999)
        const predicted = flame(w.parent, t, nitro), err = Math.abs(predicted - seen);
        worst = Math.max(worst, err);
        console.log(s.id, b ? 'cand' : 'base', 'car', w.parent, nitro ? 'NITRO' : 'BOOST', 't', t.toFixed(4), 'seen', seen.toFixed(4), 'predicted', predicted.toFixed(4),
          '| same car with the other build\'s id:', flame(s.watched[1 - b]?.find(o => o.world[12] === w.world[12] && o.world[14] === w.world[14])?.parent ?? NaN, t, nitro).toFixed(4));
      }
    });
  }
}
console.log('worst |predicted - seen|', worst.toFixed(5), worst < 2e-4 ? 'PASS (4 dp rounding)' : 'FAIL');
