import * as THREE from 'three';
import { carShell, canopy } from './geometry.ts';

// Fictional race silhouettes; intentionally no manufacturer badges or fixed logos.
// Player liveries / future collectible emblems are separate from these body meshes.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function piece(group, material, x, y, z, w, h, d, name, tilt = 0) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.rotation.z = tilt;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}
function pair(group, material, width, y, z, w, h, d, name, tilt = 0) {
  for (const side of [-1, 1]) {
    piece(group, material, side * width, y, z, w, h, d, name, side * tilt);
  }
}
function mirrorPair(group, mat, y) {
  pair(group, mat, 1.12, y, -0.45, .16, .11, .29, 'race side mirror');
}

export const EXTRA_RACE_STYLES = {
  // VEGA: broad rear-hunched torque coupe, stacked vertical headlights and rear vents.
  vega: {
    color: '#9c80db', glass: '#1b1833', light: [1.7, .5, 3.4],
    body: carShell([
      [-2.38,.76,.41,.61],[-1.88,1.06,.39,.78],[-1.24,1.14,.39,.91],
      [.54,1.17,.38,.94],[1.42,1.22,.4,1.05],[2.42,1.03,.49,.9],
    ]),
    cabin: canopy(.79,-.87,.92,1.18,.96,.56,-.16,.51,1.38),
    trim(group, m) {
      pair(group,m.white,.87,.67,-2.35,.13,.22,.06,'vega front signature');
      pair(group,m.white,.70,.56,-2.40,.28,.04,.05,'vega front signature');
      pair(group,m.light,.92,.89,2.43,.075,.24,.05,'vega rear signature');
      pair(group,m.light,.69,.83,2.43,.29,.04,.05,'vega rear signature');
      pair(group,m.black,.98,.55,1.60,.075,.30,.81,'vega shoulder vent');
      mirrorPair(group,m.black,1.03);
      piece(group,m.black,0,.37,-2.43,2.10,.05,.26,'vega splitter');
      return piece(group,m.black,0,1.27,2.13,1.91,.055,.45,'vega bridged aerofoil');
    },
  },
  // PULSE: rounded, short-wheelbase EV sprint, twin chevron light cuts and ducktail.
  pulse: {
    color: '#37b6c1', glass: '#13353f', light: [.25,3.0,2.4],
    body: carShell([
      [-2.10,.83,.47,.71],[-1.70,1.08,.44,.83],[-1.12,1.10,.44,.98],
      [.55,1.09,.44,1.02],[1.32,1.11,.46,.98],[2.08,.92,.53,.87],
    ]),
    cabin: canopy(.89,-.93,1.0,1.27,1.01,.68,-.34,.75,1.50),
    trim(group,m) {
      pair(group,m.white,.74,.65,-2.10,.38,.043,.055,'pulse front signature',.30);
      pair(group,m.white,.96,.58,-2.03,.12,.045,.05,'pulse front signature',-.25);
      pair(group,m.light,.73,.96,2.10,.36,.045,.055,'pulse rear signature',-.25);
      pair(group,m.light,.93,.84,2.10,.11,.13,.055,'pulse rear signature');
      piece(group,m.paint,0,1.52,.38,1.33,.04,.80,'pulse floating roof crown');
      mirrorPair(group,m.black,1.13);
      return piece(group,m.paint,0,1.04,1.94,1.75,.075,.27,'pulse integrated ducktail');
    },
  },
  // COMET: tiny sharp track prototype with long nose, forward-slant lamps and central fin.
  comet: {
    color: '#e8b957', glass: '#202735', light: [3.8,1.3,.08],
    body: carShell([
      [-2.52,.62,.37,.53],[-2.02,.93,.36,.70],[-1.25,1.08,.36,.91],
      [.58,1.03,.36,.92],[1.25,1.13,.38,.95],[2.26,.86,.45,.71],
    ]),
    cabin: canopy(.74,-.78,.89,1.05,.91,.48,-.16,.48,1.30),
    trim(group,m) {
      pair(group,m.white,.60,.59,-2.42,.41,.037,.045,'comet front signature',-.28);
      pair(group,m.white,.84,.51,-2.23,.12,.05,.045,'comet front signature');
      pair(group,m.light,.69,.78,2.28,.30,.046,.055,'comet rear signature',.35);
      pair(group,m.light,.85,.71,2.28,.12,.042,.055,'comet rear signature');
      piece(group,m.black,0,.34,-2.54,1.72,.04,.23,'comet nose blade');
      piece(group,m.black,0,1.20,.76,.05,.29,.97,'comet dorsal fin');
      return piece(group,m.black,0,1.16,2.10,1.60,.05,.31,'comet narrow rear aerofoil');
    },
  },
  // RIFT: faceted stealth wedge, diagonal headlight cuts and separated X rear signatures.
  rift: {
    color: '#6e8c9f', glass: '#121b25', light: [3.2,.36,1.4],
    body: carShell([
      [-2.49,.84,.38,.53],[-2.07,1.03,.35,.64],[-1.37,1.18,.37,.89],
      [.50,1.16,.36,.90],[1.43,1.21,.38,.98],[2.43,1.08,.46,.76],
    ]),
    cabin: canopy(.75,-1.02,.92,1.42,.94,.53,-.48,.54,1.39),
    trim(group,m) {
      pair(group,m.white,.82,.62,-2.38,.35,.042,.055,'rift front signature',-.30);
      pair(group,m.white,.69,.73,-2.23,.25,.032,.05,'rift front signature',.30);
      pair(group,m.light,.81,.81,2.44,.39,.041,.055,'rift rear signature',.57);
      pair(group,m.light,.81,.81,2.44,.39,.041,.055,'rift rear signature',-.57);
      pair(group,m.black,1.09,.45,.65,.04,.25,1.0,'rift deep-cut rocker');
      mirrorPair(group,m.black,1.0);
      piece(group,m.black,0,.35,-2.49,2.1,.04,.28,'rift splitter');
      return piece(group,m.black,0,1.19,2.19,2.00,.052,.29,'rift stealth lip');
    },
  },
};

export const TRAFFIC_STYLES = {
  // Everyday five-door crossover; deliberately less vivid than race cars.
  crossover: {
    color: '#85939b', glass: '#263941', light: [1.9,.18,.14],
    body: carShell([
      [-2.28,.89,.49,.79],[-1.79,1.13,.43,1.01],[-1.23,1.16,.44,1.18],
      [.72,1.14,.44,1.20],[1.49,1.14,.46,1.15],[2.22,1.0,.52,.94],
    ]),
    cabin: canopy(.95,-1.07,1.19,1.39,1.18,.78,-.48,.93,1.72),
    trim(group,m) {
      pair(group,m.white,.75,.87,-2.29,.42,.056,.045,'crossover modest headlamp');
      pair(group,m.light,.77,1.06,2.24,.45,.059,.045,'crossover modest tail');
      pair(group,m.black,1.07,.58,.65,.044,.15,1.63,'crossover sill');
      mirrorPair(group,m.black,1.31);
      return piece(group,m.black,0,1.17,2.09,1.98,.042,.25,'crossover bumper garnish');
    },
  },
  // Compact city hatchback with short bonnet and upright tailgate.
  hatch: {
    color: '#98a9a6', glass: '#26373c', light: [2,.16,.16],
    body: carShell([
      [-1.94,.76,.51,.78],[-1.56,.98,.47,.91],[-.99,1.04,.46,1.10],
      [.56,1.03,.46,1.16],[1.22,1.04,.47,1.11],[1.84,.96,.52,.89],
    ]),
    cabin: canopy(.83,-1.00,1.11,1.40,1.09,.73,-.56,.99,1.59),
    trim(group,m) {
      pair(group,m.white,.72,.82,-1.94,.34,.07,.045,'hatch modest headlamp');
      pair(group,m.light,.78,.94,1.87,.22,.15,.045,'hatch modest tail');
      mirrorPair(group,m.black,1.19);
      return piece(group,m.paint,0,1.12,1.70,1.75,.06,.17,'hatch short roof spoiler');
    },
  },
};
