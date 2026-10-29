import { RACE_TRACKS } from './game.js';

// Decorative, non-colliding detail sets that sit behind each World Tour street (11C).
// Kept apart from SCENERY_KINDS so sceneryPlan, solid props and saved races never change.
export const DETAIL_KINDS = Object.freeze({
  taipei: ['spectators','billboard','service-van'],
  tokyo: ['billboard','spectators','service-van'],
  alpine: ['rail-platform','service-van','spectators'],
  coastal: ['ship','spectators','billboard'],
  cosmic: ['drone','billboard'],
});
const hash = (a, b) => {
  const n = Math.sin(a * 91.17 + b * 47.53) * 43758.5453;
  return n - Math.floor(n);
};

// `blocks` (optional) reports a landmark sightline hit; such details move across
// the road or farther out, and drop only when no clear spot exists.
export function detailSetPlan(trackId, chunk, quality = 'high', blocks = null) {
  const kinds = DETAIL_KINDS[trackId];
  if (!kinds) return [];
  const length = RACE_TRACKS[trackId].length, items = [];
  // High: one per kerb per chunk; Medium: one per chunk; Low: none (decoration only).
  if (quality === 'low' || quality === true) return [];
  const sides = quality === 'high' ? [-1, 1] : [chunk % 4 < 2 ? -1 : 1];
  for (const side of sides) {
    const seed = chunk * 13 + (side === 1 ? 5 : 0);
    const distance = chunk * 120 + 40 + hash(seed, 3) * 40;
    if (distance > length) continue;
    // Ships stay on the open-water (right) side of the coast road.
    const pool = kinds.filter(kind => kind !== 'ship' || side === 1);
    const kind = pool[Math.floor(hash(seed, trackId.length) * pool.length)];
    items.push({ distance, side, kind, size: .9 + hash(seed, 7) * .3,
      offset: (kind === 'ship' ? 110 : 48) + Math.round(hash(seed, 11) * 14) });
  }
  if (!blocks) return items;
  return items.map(item => blocks(item) ? [
    ...(item.kind === 'ship' ? [] : [{ ...item, side: -item.side }]),
    { ...item, offset: item.offset + 60 }, { ...item, offset: item.offset + 120 },
  ].find(c => !blocks(c)) : item).filter(Boolean);
}

// Models built from the scenery kit's primitives: x across the road, y up, z along it.
// Boxes in three shared kit colours, so a chunk's parts batch into a handful of draws.
const DARK = '#303a41', CREAM = '#c6c0ad', ACCENT = '#a45d47';
export function detailModels({ B, R }) {
  return {
    spectators(g){B(g,DARK,0,1,0,6,2,16);B(g,DARK,1.8,2.6,0,3,1.2,16);B(g,DARK,1.5,6.2,0,6.5,.4,17);
      for(const z of [-8,8])R(g,DARK,4.4,3.1,z,.15,6.2);B(g,ACCENT,-1.5,2.5,0,.9,1,15);B(g,CREAM,1.2,3.8,0,.9,1,15);
    },
    billboard(g){for(const z of [-5,5])R(g,DARK,0,6,z,.35,12);
      B(g,DARK,0,13,0,.7,6.4,14.4);B(g,ACCENT,0,13,0,.9,5.4,13.2);B(g,CREAM,0,14.2,-2,.95,1,6);
    },
    'service-van'(g){B(g,CREAM,0,2.4,0,2.6,2.6,5.8);B(g,DARK,0,3.1,2.3,2.4,1.1,.9);
      B(g,ACCENT,0,1.8,0,2.65,.35,5.85);for(const z of [-1.9,1.9])B(g,DARK,0,.7,z,2.9,1.4,1.4);
    },
    'rail-platform'(g){B(g,CREAM,0,.8,0,6,1.6,30);B(g,ACCENT,-2.85,1.65,0,.3,.1,30);
      for(const z of [-12,0,12])R(g,DARK,1.8,3.6,z,.18,4);B(g,DARK,.6,5.7,0,5.2,.35,28);
    },
    ship(g){B(g,DARK,0,1.6,0,9,3.2,34);B(g,CREAM,0,3.4,0,8.6,.5,33);B(g,CREAM,0,5.8,7,6.5,4.4,9);B(g,ACCENT,0,10,6,1.6,3.6,1.6);},
    drone(g){B(g,CREAM,0,14,0,1.8,1,1.8);B(g,DARK,0,14,0,4.4,.25,.35);B(g,DARK,0,14,0,.35,.25,4.4);},
  };
}
