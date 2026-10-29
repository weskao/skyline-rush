import { seededRng, RACE_STREAMS } from './rng.ts';
import { stepPlayerHazards, hazardReach, hazardTouch, nudge } from './hazard-race.ts';
import { raceHazards } from './track-themes.ts';
import { createCheckpointRush, stepCheckpointRush } from './checkpoint-rush.ts';
import { createPracticeStats, samplePractice } from './practice-stats.ts';
import { createStuntAttack, scoreStuntAttack } from './stunt-attack.ts';
import { createElimination, stepElimination } from './elimination.ts';
import { bankItem, activateItem, tickItemCooldown } from './active-items.ts';
import { normalizeRaceConfig, trafficMultiplier } from './race-config.ts';
import { raceCompletion } from './race-objectives.ts';
import { createRaceSessionContract } from './race-session.ts';
import { SKY_JUMPS, skyGapAt, skyFrame } from './sky-track.ts';

/** @typedef {import('./game-types.js').TrackConfig} TrackConfig */
/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */

// Special sections are { from, to, type } in metres; `dir` (+1 / -1) is the crosswind direction,
// `x` / `altitude` place a shortcut corridor.
/** @type {Record<string, TrackConfig>} */
export const RACE_TRACKS = {
  coast: { // fixedRings: the original gate grid
    name: 'Coast', length: 5000, trafficDensity: 1, seed: 1001, fixedRings: true,
    sections: [{ from: 2200, to: 2700, type: 'shortcut', x: -7.5, altitude: 6 }],
  },
  neon: {
    name: 'Neon Downtown', length: 4000, trafficDensity: 1.5, seed: 2002,
    sections: [
      { from: 600, to: 1100, type: 'tunnel' }, { from: 1150, to: 1650, type: 'shortcut', x: 7.5, altitude: 6 },
      { from: 1700, to: 2300, type: 'tunnel' }, { from: 2900, to: 3400, type: 'tunnel' },
    ],
  },
  canyon: {
    name: 'Canyon Skyway', length: 6000, trafficDensity: 1, seed: 3003,
    sections: [
      { from: 700, to: 1300, type: 'crosswind', dir: 1 }, { from: 1500, to: 1560, type: 'gap' },
      { from: 2000, to: 2500, type: 'shortcut', x: -7.5, altitude: 6 },
      { from: 3000, to: 3070, type: 'gap' }, { from: 3300, to: 4100, type: 'crosswind', dir: -1 },
      { from: 4400, to: 4470, type: 'gap' },
    ],
  },
  aurora: {
    name: 'Aurora Pass', length: 5500, trafficDensity: 1, seed: 4004,
    sections: [
      { from: 900, to: 1500, type: 'ice' }, { from: 1800, to: 2600, type: 'uphill' }, { from: 2800, to: 3500, type: 'ice' },
      { from: 3800, to: 4200, type: 'uphill' }, { from: 4300, to: 4900, type: 'ice' },
      { from: 4920, to: 5380, type: 'shortcut', x: 7.5, altitude: 6 },
    ],
  },
  spiral: {
    name: 'Sky Spiral', length: 5600, trafficDensity: 0.75, seed: 5005,
    sections: [
      { from: 1100, to: 2200, type: 'spiral' },
      { from: 2800, to: 2870, type: 'launch' },
      { from: 2870, to: 2935, type: 'gap' },
      { from: 3700, to: 3775, type: 'launch' },
      { from: 3775, to: 3840, type: 'gap' },
      { from: 4550, to: 4630, type: 'launch' },
      { from: 4630, to: 4700, type: 'gap' },
      { from: 4950, to: 5450, type: 'shortcut', x: -7.5, altitude: 6 },
    ],
  },
  taipei: {"name":"Taipei Heritage","length":6200,"trafficDensity":1.1,"seed":6006,"sections":[{"from":850,"to":1200,"type":"tunnel"},{"from":1950,"to":2450,"type":"shortcut","x":-7.5,"altitude":6},{"from":3120,"to":3450,"type":"boost-tunnel"},{"from":4100,"to":4450,"type":"tunnel"}]},
  tokyo: {"name":"Tokyo Afterdark","length":6800,"trafficDensity":1.4,"seed":7007,"sections":[{"from":850,"to":1350,"type":"tunnel"},{"from":2450,"to":2950,"type":"shortcut","x":7.5,"altitude":6},{"from":4150,"to":4650,"type":"tunnel"},{"from":5050,"to":5450,"type":"boost-tunnel"}]},
  alpine: {"name":"Alpine Rail Pass","length":7600,"trafficDensity":0.8,"seed":8008,"sections":[{"from":900,"to":1420,"type":"uphill"},{"from":1600,"to":2200,"type":"tunnel"},{"from":3100,"to":3600,"type":"shortcut","x":-7.5,"altitude":6},{"from":3850,"to":4200,"type":"boost-tunnel"},{"from":4700,"to":5200,"type":"tunnel"},{"from":5900,"to":6400,"type":"uphill"}]},
  coastal: {"name":"Coastal Horizon","length":5800,"trafficDensity":1,"seed":9009,"sections":[{"from":850,"to":1300,"type":"crosswind","dir":1},{"from":2100,"to":2600,"type":"shortcut","x":7.5,"altitude":6},{"from":2950,"to":3310,"type":"boost-tunnel"},{"from":3950,"to":4600,"type":"crosswind","dir":-1}]},
  cosmic: {"name":"Cosmic Orbit","length":8000,"trafficDensity":0.65,"seed":1010,"sections":[{"from":1400,"to":1900,"type":"crosswind","dir":1},{"from":3000,"to":3500,"type":"shortcut","x":-7.5,"altitude":6},{"from":5100,"to":5600,"type":"crosswind","dir":-1},{"from":6100,"to":6540,"type":"boost-tunnel"}]},
};
export const RACE_LENGTH = RACE_TRACKS.coast.length;
export const MAX_SPEED = 88;
export const ROAD_LIMIT = 10.2;
export const LANES = [-7.5, -2.5, 2.5, 7.5];
export const STEER_RAMP = 0.15;
export const TAKEOFF_BUFFER = 1.5; // seconds a FLY press below takeoff speed stays remembered
export const SCRAPE_RATIO = 0.1; // lateral/forward speed below this is a shallow-angle scrape

export const TUNNEL_CEILING = 4; // m; the car's roof (altitude + CAR_HEIGHT) may not pass it
export const CAR_HEIGHT = 1.2;
export const GAP_CLEARANCE = 1; // altitude needed to fly over a missing bridge section
export const GAP_WARN_DISTANCE = 300; // m ahead of a broken bridge where too little charge to cross is flagged
export const GAP_LIFT_RESERVE = 6; // charge to climb from the road to GAP_CLEARANCE (about 0.3 s of thrust)
export const FLY_DRAIN = 15; // Phase 1: more room to fly while preserving ground recharge
export const GAP_SLOWDOWN = 0.4; // speed kept after falling into a gap
export const GAP_RESPAWN = 5; // m past the gap where the car is put back
export const CROSSWIND_SPEED = 4; // m/s sideways push
export const ICE_RAMP_FACTOR = 4; // steering takes this many times longer to respond on ice

export const NITRO_MAX = 3; // charges
export const NITRO_TIME = 2.5; // seconds one charge lasts
export const NITRO_EXTEND = 2; // seconds added by a press during NITRO
export const NITRO_FUEL_PER_CHARGE = 32; // overflow conversion: each 0.25 charge = 8 fuel
export const NITRO_FUEL_BONUS = 20; // fuel per charge banked below the cap: each 0.25 charge = 5 fuel
export const GLIDE_FUEL_REGEN = 4; // fuel/s while airborne with FLY and boost released (ground is 13)
export const NITRO_PICKUPS = { cell: 0.25, can: 0.5, tank: 1, overcharge: NITRO_MAX }; // overcharge only tops up to the cap, no fuel

export const DRIFT_MIN_SPEED = 45; // m/s needed to start or hold a drift
export const DRIFT_BLEED = 3; // m/s^2 lost while drifting (normal braking is 35)
// Payout on release for the highest threshold reached: seconds drifted, nitro charges, mini-boost seconds.
export const DRIFT_REWARDS = [{ time: 3, nitro: 0.5, boost: 1.2 }, { time: 2, nitro: 0.3, boost: 0.8 }, { time: 1, nitro: 0.15, boost: 0.5 }];

// AIR TRICK: a steer press opposite to one begun moments earlier, while flying, is a barrel roll; landing it pays nitro.
export const TRICK_FLICK_WINDOW = 0.3; // s between the starts of the two presses
export const TRICK_ROLL_TIME = 0.7; // s for one full roll
export const TRICK_NITRO = 0.25; // charges for a landed roll
export const TRICK_HARD_LANDING = 11; // m/s landing.speed that loses the reward (an unpowered glide from 8.6 m)

// SHORTCUT: a flight-only corridor { x, altitude } over an edge lane; inside it flight is free and faster, pylons are the risk.
export const SHORTCUT_HALF_WIDTH = 3; // m either side of the corridor centre
export const SHORTCUT_TOLERANCE = 2.5; // m above or below the corridor altitude (also the pylon height)
export const SHORTCUT_CAP_BONUS = 12; // m/s added to the speed cap inside
export const SHORTCUT_PYLON_SPACING = 100; // m
export const SHORTCUT_PYLON_OFFSET = 2.2; // m from the centre, alternating sides
// Derived from the section, never stored, so the simulation and the renderer always agree.
export const shortcutPylons = section => Array.from({ length: Math.ceil((section.to - section.from - 50) / SHORTCUT_PYLON_SPACING) }, (_, i) => ({
  distance: section.from + 50 + i * SHORTCUT_PYLON_SPACING, x: section.x + (i % 2 ? 1 : -1) * SHORTCUT_PYLON_OFFSET, altitude: section.altitude,
}));
const PYLON_HALF_WIDTH = 1.2; // m

export const RING_RADIUS = 4.8;
export const RISK_RING_RADIUS = 2.4;
export const RING_FUEL = 20; // charge ring
export const SLIPSTREAM_BOOST = 3; // seconds, burns no fuel (shares the mini-boost)
export const RISK_SCORE = 500;
export const PERFECT_LINE_NITRO = 1;
export const RING_SPACING = 220;
export const MYSTERY_EFFECTS = ['shield', 'magnet', 'ghost', 'freeze'];
export const EFFECT_TIMES = { shield: 10, magnet: 5, ghost: 3, freeze: 2 }; // seconds; shield also ends on the first absorbed hit
export const MAGNET_RANGE = 12; // m
export const FREEZE_RIVAL_SPEED = 0.5; // rival speed multiplier while frozen

// SLIPSTREAM: right behind a rival or traffic car (same lane, in draft range) long enough pays once per engagement.
export const SLIPSTREAM_TIME = 1.5; // seconds in the draft before it pays
export const SLIPSTREAM_CAP_BONUS = 6; // m/s added to the speed cap while the draft is active
export const SLIPSTREAM_NITRO = 0.25; // charges, once per engagement (leave the draft to re-arm)
export const SLIPSTREAM_LATERAL = 1.9; // m, max sideways offset from the car ahead
export const SLIPSTREAM_MIN_GAP = 4.4; // m behind; closer is a collision
export const SLIPSTREAM_MAX_GAP = 14; // m behind
export const SLIPSTREAM_ALTITUDE = 1.8; // m, max altitude difference

// Rival NITRO and rubber-banding (rivals get RIVAL_NITRO_CHARGES charges, fired by personality).
export const RIVAL_NITRO_CHARGES = 2;
export const RIVAL_NITRO_TIME = NITRO_TIME; // seconds one rival charge lasts
export const RIVAL_NITRO_BONUS = 12; // m/s added to the rival's speed cap during NITRO
export const RIVAL_NITRO_NOVA_FIRST = 8; // NOVA (steady): first charge at this race second...
export const RIVAL_NITRO_NOVA_EVERY = 18; // ...then one every this many seconds
export const RIVAL_NITRO_ORBIT_ALTITUDE = 2; // ORBIT (loves flying): fires in the air, once per hop...
export const RIVAL_NITRO_MIN_SPEED = 60; // ...and only once up to speed (a charge only lifts the cap)
export const RIVAL_NITRO_APEX_FROM = 0.75; // APEX (late surge): fires from this fraction of the race
export const RIVAL_HOP_PERIOD = { NOVA: 13, ORBIT: 9, APEX: 13 }; // seconds per hop cycle; shorter = more hops
export const RUBBER_BAND_MAX = 0.04; // speed multiplier changes by at most +/- this
export const RUBBER_BAND_FREE = 50; // m of lead/deficit with no effect
export const RUBBER_BAND_RANGE = 250; // m beyond the free zone to reach the full effect

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Pickups come only from the track's 'pickups' stream so every run of a track is identical.
function createPickups(track) {
  const random = seededRng(track.seed, RACE_STREAMS.pickups);
  const pick = list => list[Math.floor(random() * list.length)];
  // Ground pickups would sit over a gap's hole; air pickups would be stuck in a tunnel roof.
  const blocked = pickup => track.sections.some(s => pickup.distance >= s.from - 10 && pickup.distance < s.to + 10 &&
    (s.type === 'gap' ? pickup.altitude === 0 : s.type === 'tunnel' && pickup.altitude > 0));
  const pickups = [];
  for (let distance = 300; distance < track.length - 300; distance += Math.round(120 + random() * 160)) {
    const roll = random();
    if (roll < 0.6) {
      const x = pick(LANES); // a row of cells down one lane
      for (let i = 0; i < 4; i++) pickups.push({ distance: distance + i * 8, x, altitude: 0, tier: 'cell' });
    } else if (roll < 0.85) {
      pickups.push({ distance, x: pick([-5, 0, 5]), altitude: 0, tier: 'can' }); // between lanes
    } else {
      pickups.push({ distance, x: pick(LANES), altitude: Math.round(30 + random() * 40) / 10, tier: 'tank' });
    }
  }
  let overcharge; // high-risk: near the flight ceiling over an edge lane; bounded retries so a tunnel-heavy track cannot hang
  for (let tries = 0; tries < 50 && (!overcharge || blocked(overcharge)); tries++) {
    overcharge = { distance: Math.round(track.length * (0.5 + random() * 0.3)), x: pick([LANES[0], LANES[3]]), altitude: 10, tier: 'overcharge' };
  }
  for (const s of track.sections) if (s.type === 'shortcut') { // the corridor's reward line: cells down the centre, a tank halfway
    for (let distance = s.from + 30; distance < s.to; distance += 60) pickups.push({ distance, x: s.x, altitude: s.altitude, tier: 'cell' });
    pickups.push({ distance: (s.from + s.to) / 2, x: s.x, altitude: s.altitude, tier: 'tank' });
  }
  return [...pickups.filter(pickup => !blocked(pickup)), overcharge].sort((a, b) => a.distance - b.distance);
}

// Rings come only from the track's 'rings' stream. Coast keeps its original gate grid (x 2.5, altitude 8);
// other tracks scatter them. Rings are consecutive groups of 3-5 (the last group absorbs the remainder).
function createRings(track) {
  const random = seededRng(track.seed, RACE_STREAMS.rings);
  const rings = [];
  const inTunnel = distance => track.sections.some(s => s.type === 'tunnel' && distance >= s.from && distance < s.to);
  for (let distance = RING_SPACING; distance < track.length - 100;) {
    const roll = random();
    let type = roll < 0.35 ? 'charge' : roll < 0.6 ? 'nitro' : roll < 0.78 ? 'slipstream' : roll < 0.9 ? 'risk' : 'mystery';
    let x = 2.5;
    let altitude = 8;
    if (!track.fixedRings) {
      x = Math.round((random() * 2 - 1) * 70) / 10;
      altitude = type === 'risk' ? 10 : Math.round((3 + random() * 6) * 10) / 10;
    }
    if (inTunnel(distance)) { // the car cannot climb in a tunnel, so a 'risk' ring there would be free
      altitude = 1.5;
      if (type === 'risk') type = 'nitro';
    }
    rings.push({ distance, x, altitude, radius: type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS, type, group: 0 });
    distance += track.fixedRings ? RING_SPACING : Math.round(200 + random() * 120);
  }
  for (let i = 0, group = 0; i < rings.length; group++) {
    const left = rings.length - i;
    let size = 3 + Math.floor(random() * 3);
    if (left - size < 3) size = left <= 5 ? left : left - 3;
    for (let j = i; j < i + size; j++) rings[j].group = group;
    i += size;
  }
  return rings;
}

// The mystery effect of ring `index`: its own seed-derived stream, so it is reproducible and needs no race state.
export const mysteryEffect = (seed, index) => MYSTERY_EFFECTS[Math.floor(seededRng(seed, `${RACE_STREAMS.mysteryPrefix}${index}`)() * MYSTERY_EFFECTS.length)];

// Charges cap at NITRO_MAX; the excess becomes fuel so nothing is wasted. Banked charge also refills flight fuel.
function addNitro(car, amount, fuelBonus = NITRO_FUEL_BONUS) {
  const overflow = Math.max(0, car.nitro + amount - NITRO_MAX);
  car.nitro = Math.min(NITRO_MAX, car.nitro + amount);
  const fuel = Math.min(100, car.fuel + (amount - overflow) * fuelBonus + overflow * NITRO_FUEL_PER_CHARGE);
  car.rewardFuel += fuel - car.fuel; // running total the callouts diff to announce the charge gained
  car.fuel = fuel;
}

// Daily challenge: one track + modifier per local calendar day, from its own date-named stream.
export const DAILY_MODIFIERS = ['no-flight', 'double-traffic', 'gold-rings'];
export function dailyChallenge(date = new Date()) {
  const id = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  const random = seededRng(0, `daily-${id}`);
  const tracks = Object.keys(RACE_TRACKS);
  const track = tracks[Math.floor(random() * tracks.length)];
  // Broken bridges need flight, so a gap track never gets no-flight.
  const modifiers = DAILY_MODIFIERS.filter(m => m !== 'no-flight' || !RACE_TRACKS[track].sections.some(s => s.type === 'gap'));
  return { id, track, modifier: modifiers[Math.floor(random() * modifiers.length)] };
}

export function createRace(trackId = 'coast', modifier = null) {
  const track = RACE_TRACKS[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const options = modifier !== null && typeof modifier === 'object' && !Array.isArray(modifier) ? modifier : null;
  const dailyModifier = options ? null : modifier;
  if (dailyModifier !== null && !DAILY_MODIFIERS.includes(dailyModifier)) throw new Error(`Unknown modifier: ${dailyModifier}`);
  const config = normalizeRaceConfig(options ?? {});
  const session = createRaceSessionContract(trackId, track.seed, config);
  const density = track.trafficDensity * (dailyModifier === 'double-traffic' ? 2 : 1) * (config.mode !== 'classic' ? trafficMultiplier(config.traffic) : 1);
  const rings = createRings(track);
  if (dailyModifier === 'gold-rings') for (const ring of rings) Object.assign(ring, { type: 'nitro', radius: RING_RADIUS });
  return {
    trackId, modifier: dailyModifier, mode: config.mode, config, session, objective: session.objective, seed: track.seed, length: track.length, sections: track.sections.map(section => ({ ...section })),
    phase: 'ready', countdown: 3, elapsed: 0, result: null, pickups: config.items ? createPickups(track) : [], rings,
    props: [], // solid World Tour scenery parts; main.js fills them from roadObstacles()
    hazards: raceHazards(trackId, track, LANES, config),
    checkpoint: config.mode === 'checkpoint' ? createCheckpointRush(track) : null,
    practice: config.mode === 'free' ? createPracticeStats() : null,
    styleAttack: config.mode === 'stunt' ? createStuntAttack() : null,
    elimination: config.mode === 'elimination' ? createElimination() : null,
    stuntLimit: config.mode === 'stunt' ? config.duration : null,
    player: {
      distance: 0, x: 2.5, speed: 0, altitude: 0, verticalSpeed: 0,
      fuel: 100, thrusting: false, exhausted: false, fuelOuts: 0, rewardFuel: 0, collisions: 0, cooldown: 0,
      impact: null, landing: null, steering: 0, railContactSide: 0, boosting: false, braking: false,
      nearMiss: null, nearMisses: 0, combo: 0, scrape: null, scrapeCooldown: 0, flyBuffer: 0,
      poweredFlightTime: 0, flightBoosted: false,
      section: null, inShortcut: false, falls: 0, fall: null,
      nitro: 0, nitroTime: 0, nitroHeld: false, nitroUses: 0, nitroBurst: 0, nitroChain: 0, longestCombo: 0,
      slipstream: { time: 0, active: false, paid: false },
      drift: null, driftPayout: null, miniBoost: 0, boostTunnelClaimed: [], boostTunnelEvent: null, trick: null, trickPayout: null, flick: null, steerSign: 0,
      rings: 0, perfectLines: 0, score: 0, cleanDistance: 0, groupHits: {}, effects: { shield: 0, magnet: 0, ghost: 0, freeze: 0 },
      heldItem: null, itemCooldown: 0,
    },
    rivals: ['NOVA', 'ORBIT', 'APEX'].slice(0, config.rivals).map((name, i) => ({
      name, x: LANES[i === 2 ? 3 : i], homeX: LANES[i === 2 ? 3 : i], distance: 0, speed: 0,
      altitude: 0, thrusting: false, finishTime: null, nitro: RIVAL_NITRO_CHARGES, nitroTime: 0, nitroHop: -1, pace: 0, cooldown: 0,
    })),
    traffic: Array.from({ length: Math.round(36 * density) }, (_, i) => ({
      x: LANES[(i * 7 + 1) % 4], homeX: LANES[(i * 7 + 1) % 4], distance: 170 + i * 125 / density,
      speed: 23 + (i % 5) * 3, cruise: 23 + (i % 5) * 3, altitude: 0, cooldown: 0, color: i % 5,
    })),
  };
}

function collectRing(race, ring, index) {
  const car = race.player;
  ring.hit = true;
  car.rings++;
  car.score += 150;
  if (ring.type === 'charge') car.fuel = Math.min(100, car.fuel + RING_FUEL);
  else if (ring.type === 'nitro') addNitro(car, 0.5);
  else if (ring.type === 'slipstream') car.miniBoost = Math.max(car.miniBoost, SLIPSTREAM_BOOST);
  else if (ring.type === 'risk') {
    addNitro(car, 1);
    car.score += RISK_SCORE;
  } else if (ring.type === 'mystery') {
    const effect = mysteryEffect(race.seed, index);
    if (race.config.activeItems) bankItem(car, effect);
    else car.effects[effect] = EFFECT_TIMES[effect];
  }
  car.groupHits[ring.group] = (car.groupHits[ring.group] ?? 0) + 1;
  if (car.groupHits[ring.group] === race.rings.filter(other => other.group === ring.group).length) {
    car.perfectLines++; // PERFECT LINE: every ring of the group cleared
    car.score += 500;
    addNitro(car, PERFECT_LINE_NITRO);
  }
}

// Personality decides when a rival spends a charge (it must have one and no NITRO running).
function rivalWantsNitro(race, rival, hop) {
  if (rival.name === 'NOVA') return race.elapsed >= RIVAL_NITRO_NOVA_FIRST + (RIVAL_NITRO_CHARGES - rival.nitro) * RIVAL_NITRO_NOVA_EVERY;
  if (rival.name === 'ORBIT') {
    const fire = rival.altitude > RIVAL_NITRO_ORBIT_ALTITUDE && rival.speed >= RIVAL_NITRO_MIN_SPEED && rival.nitroHop !== hop;
    if (fire) rival.nitroHop = hop;
    return fire;
  }
  if (rival.name === 'APEX') return rival.distance >= race.length * RIVAL_NITRO_APEX_FROM;
  return false;
}

export function startRace(race) {
  if (race.phase === 'ready') race.phase = race.mode === 'free' ? 'racing' : 'countdown';
}

export function useHeldItem(race) {
  if (!race?.config?.activeItems || race.phase !== 'racing') return null;
  return activateItem(race.player, race.rivals.length > 0);
}

export { racePosition, sprintGaps } from './race-standings.ts';

// Index of the first scenery part (sorted by `from`, each under 20 m deep) that can still reach distance d.
function firstProp(props, d) {
  let lo = 0, hi = props.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (props[mid].from < d - 20) lo = mid + 1; else hi = mid; }
  return lo;
}

// Car body against scenery parts (sorted by distance); the swept range catches thin parts at high speed.
function hitProp(props, car, previousDistance) {
  const altitude = car.altitude || 0;
  for (let i = firstProp(props, previousDistance - 2.2); i < props.length; i++) {
    const p = props[i];
    if (p.from > car.distance + 2.2) break;
    if (p.to > previousDistance - 2.2 && p.right > car.x - 0.85 && p.left < car.x + 0.85 &&
      p.top > altitude && p.bottom < altitude + 1.8) return p;
  }
  return null;
}
// A solid prop cannot be driven through: step out to its open-road side (it never reaches past ROAD_CLEARANCE).
const clearOf = (prop, x) => prop.left > 0 ? Math.min(x, prop.left - 1.1) : Math.max(x, prop.right + 1.1);

// Rivals and traffic steer around solid scenery, gauntlet barriers and slower cars ahead instead of driving
// through them: they keep their own lane while it is clear, else take the nearest free line beside the obstacle.
// Scenery parts stay under 20 m deep (largest: a scaled train, ~9 m), which bounds the look-back.
const AI_LOOKAHEAD = 80, LANE_SHIFT = 6, AI_HALF_WIDTH = 0.85, AI_MARGIN = 1.4; // m ahead, m/s sideways, m, m
const BARRIER_HEIGHT = 2.5; // drawn gauntlet barrier: 3.1 x 2.5 m (width in hazard-race.ts)
const TRAFFIC_ACCEL = 5; // m/s² a knocked traffic car regains toward its cruise speed
const blockers = []; // reused every call: no per-frame allocation on this hot path
function laneFree(x) {
  if (Math.abs(x) > ROAD_LIMIT) return false;
  for (let i = 0; i < blockers.length; i += 2) if (x + AI_HALF_WIDTH > blockers[i] && x - AI_HALF_WIDTH < blockers[i + 1]) return false;
  return true;
}
// A car alongside, or one ahead this car closes on within ~3 s, blocks its own width.
function carBlocker(d, altitude, pace, car, carPace) {
  const gap = car.distance - d;
  if (gap > -4.4 && gap < Math.min(AI_LOOKAHEAD, 4.4 + (pace - carPace) * 3) && Math.abs((car.altitude || 0) - altitude) < 1.8) {
    blockers.push(car.x - AI_HALF_WIDTH, car.x + AI_HALF_WIDTH);
  }
}
function avoidObstacles(race, other, pace, dt) {
  const { props, hazards } = race, d = other.distance, altitude = other.altitude || 0;
  blockers.length = 0;
  for (const car of race.traffic) if (car !== other) carBlocker(d, altitude, pace, car, car.speed);
  for (const car of race.rivals) if (car !== other) carBlocker(d, altitude, pace, car, car.pace ?? car.speed);
  carBlocker(d, altitude, pace, race.player, race.player.speed);
  for (let i = firstProp(props, d); i < props.length && props[i].from < d + AI_LOOKAHEAD; i++) {
    const p = props[i];
    if (p.to > d - 2.2 && p.top > altitude && p.bottom < altitude + 1.8) blockers.push(p.left, p.right);
  }
  if (altitude < BARRIER_HEIGHT) for (const h of hazards) {
    if (h.distance > d + AI_LOOKAHEAD) break;
    if (h.distance < d - 2.2) continue;
    const reach = hazardReach(h); // covers a moving hazard's whole sweep; 0 = a trigger, never steered around
    if (reach) blockers.push(h.x - reach, h.x + reach);
  }
  let target = other.homeX ?? other.x;
  if (!laneFree(target)) {
    target = other.x; // nowhere free: hold the line rather than swerve into something else
    let best = Infinity;
    for (let i = 0; i < blockers.length; i++) {
      const x = i % 2 ? blockers[i] + AI_MARGIN : blockers[i] - AI_MARGIN;
      if (Math.abs(x - other.x) < best && laneFree(x)) { best = Math.abs(x - other.x); target = x; }
    }
  }
  other.x += clamp(target - other.x, -LANE_SHIFT * dt, LANE_SHIFT * dt);
}

// The one collision response every car shares (player, rivals, traffic): speed loss, a sideways knock, a short grace.
function knock(race, car, side, intensity, retention) {
  const retainedSpeed = race.config.collision === 'relaxed' ? Math.max(retention, 0.8) : retention;
  const speedLost = car.speed * (1 - retainedSpeed);
  car.speed *= retainedSpeed;
  car.x = clamp(car.x + side * (0.4 + intensity * 0.6), -ROAD_LIMIT, ROAD_LIMIT);
  car.cooldown = 1.5;
  return speedLost;
}

// Rivals and traffic take the player's hits, with the same boxes, when avoidance cannot save them.
const aiRetention = other => other.nitroTime > 0 ? 0.7 : 0.45;
function aiImpacts(race, other, before, pace) {
  if (other.cooldown > 0) return;
  const prop = hitProp(race.props, other, before);
  if (prop) {
    knock(race, other, Math.sign(other.x - (prop.left + prop.right) / 2) || -1, clamp(pace / 100, 0.25, 1), aiRetention(other));
    other.x = clearOf(prop, other.x);
    return;
  }
  if ((other.altitude || 0) >= 2.4) return;
  for (const hazard of race.hazards) {
    if (hazard.distance > other.distance) break;
    if (hazard.distance <= before) continue;
    const { effect, x: obstacleX } = hazardTouch(hazard, other, race.elapsed);
    if (effect === 'block') return void knock(race, other, Math.sign(other.x - obstacleX) || -1, 0.7, 0.6);
    nudge(other, effect, hazard); // gusts and rough terrain treat every car alike
  }
}
function bumpCars(race, a, b) {
  if ((a.cooldown > 0 && b.cooldown > 0) || Math.abs(a.distance - b.distance) >= 4.4 || Math.abs(a.x - b.x) >= 1.7 ||
    Math.abs((a.altitude || 0) - (b.altitude || 0)) >= 1.8) return;
  const side = Math.sign(a.x - b.x) || -1, intensity = clamp(Math.abs(a.speed - b.speed) / 70, 0.25, 1);
  if (!(a.cooldown > 0)) knock(race, a, side, intensity, aiRetention(a));
  if (!(b.cooldown > 0)) knock(race, b, -side, intensity, aiRetention(b));
}

function contact(race, kind, obstacleX, intensity, retention) {
  const car = race.player;
  if (car.effects.shield > 0) { // the shield eats this hit: no damage, brief grace to clear the obstacle
    car.effects.shield = 0;
    car.cooldown = 1;
    return;
  }
  const side = Math.sign(car.x - obstacleX) || -1, x = car.x;
  const speedLost = knock(race, car, side, intensity, retention);
  car.impact = { kind, intensity, side, speedLost, x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
  car.collisions++;
  car.combo = 0;
  car.drift = null; // a crash loses the drift build-up
  car.trick = null;
}

export function stepRace(race, input, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
  if (race.phase === 'countdown') {
    race.countdown = Math.max(0, race.countdown - dt);
    if (race.countdown < 0.00001) race.phase = 'racing';
    return;
  }
  if (race.phase !== 'racing') return;
  race.elapsed += dt;
  const car = race.player;
  const previousScore = car.score;
  if (race.config.activeItems) tickItemCooldown(car, dt);
  const section = race.sections.find(s => car.distance >= s.from && car.distance < s.to);
  car.section = section?.type ?? null;
  car.inShortcut = car.section === 'shortcut' && Math.abs(car.x - section.x) < SHORTCUT_HALF_WIDTH &&
    Math.abs(car.altitude - section.altitude) < SHORTCUT_TOLERANCE;
  const brake = input.brake === true;
  const throttle = input.throttle === true && !brake;
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  // AIR TRICK reads the raw input sign: the steering ramp would hide a fast flick.
  const steerSign = Math.sign(steer);
  if (car.trick) car.trick.done = (car.trick.time += dt) >= TRICK_ROLL_TIME;
  if (steerSign !== 0 && steerSign !== car.steerSign) { // a fresh press
    if (car.altitude > 0 && !car.trick && car.flick?.dir === -steerSign && race.elapsed - car.flick.time <= TRICK_FLICK_WINDOW) {
      car.trick = { dir: steerSign, time: 0, done: false };
    }
    car.flick = { dir: steerSign, time: race.elapsed };
  }
  car.steerSign = steerSign;
  const boost = input.boost === true && car.fuel > 0 && !brake;
  car.boosting = boost;
  car.braking = brake;
  // NITRO is edge-triggered: one press spends one full charge; a press during NITRO extends it, never stacks speed.
  if (input.nitro === true && !car.nitroHeld && car.nitro >= 1) {
    car.nitro -= 1;
    if (car.nitroTime > 0) car.nitroTime += NITRO_EXTEND;
    else {
      car.nitroTime = NITRO_TIME;
      car.nitroUses++;
      car.nitroBurst = 0;
    }
    car.nitroChain = Math.max(car.nitroChain, ++car.nitroBurst); // charges spent in this one burst
  }
  car.nitroHeld = input.nitro === true;
  const nitro = car.nitroTime > 0;
  // SLIPSTREAM: judged on last frame's positions; the timer runs while a car is ahead in draft range.
  const slip = car.slipstream;
  const inDraft = other => {
    const gap = other.distance - car.distance;
    return gap >= SLIPSTREAM_MIN_GAP && gap <= SLIPSTREAM_MAX_GAP && Math.abs(other.x - car.x) < SLIPSTREAM_LATERAL &&
      Math.abs((other.altitude || 0) - car.altitude) < SLIPSTREAM_ALTITUDE;
  };
  const drafted = race.traffic.some(inDraft) || race.rivals.some(inDraft);
  slip.time = drafted ? slip.time + dt : 0;
  slip.active = drafted && slip.time >= SLIPSTREAM_TIME;
  if (!drafted) slip.paid = false;
  else if (slip.active && !slip.paid) {
    slip.paid = true;
    addNitro(car, SLIPSTREAM_NITRO);
  }
  // DRIFT: brake + steer on the ground at speed slides instead of hard-braking; releasing it pays out by drift time.
  if (brake && steer !== 0 && car.altitude === 0 && car.speed >= DRIFT_MIN_SPEED &&
      car.railContactSide !== Math.sign(steer)) {
    car.drift ??= { time: 0, dir: Math.sign(steer) };
    car.drift.time += dt;
  } else if (car.drift) {
    const reward = DRIFT_REWARDS.find(r => car.drift.time >= r.time);
    if (reward) {
      addNitro(car, reward.nitro);
      car.miniBoost = Math.max(car.miniBoost, reward.boost);
      car.driftPayout = { time: race.elapsed, nitro: reward.nitro };
    }
    car.drift = null;
  }
  // A one-time, on-road tunnel reward. Track it by the authored section start,
  // not a frame counter: pausing, braking or standing inside cannot farm charge.
  if (car.section === 'boost-tunnel' && !car.boostTunnelClaimed.includes(section.from) &&
      car.speed >= 20 && car.altitude < 2.5 && !brake) {
    car.boostTunnelClaimed.push(section.from);
    car.miniBoost = Math.max(car.miniBoost, 3.5);
    addNitro(car, 0.25);
    car.boostTunnelEvent = { time: race.elapsed, distance: car.distance };
  }
  const drifting = car.drift !== null;
  const boosted = boost || (car.miniBoost > 0 && !brake); // the mini boost shares the boost cap but burns no fuel
  const limit = (nitro ? MAX_SPEED + 30 : boosted ? MAX_SPEED + 14 : MAX_SPEED) + (slip.active ? SLIPSTREAM_CAP_BONUS : 0) +
    (car.inShortcut ? SHORTCUT_CAP_BONUS : 0);
  const drive = drifting ? -DRIFT_BLEED : (throttle ? 15 : -4) - (brake ? 35 : 0);
  const acceleration = car.speed > limit ? -18 - (brake && !drifting ? 35 : 0) : drive + (boosted ? 12 : 0) + (nitro ? 40 : 0);
  car.speed = clamp(car.speed + acceleration * dt, 0, Math.max(limit, car.speed));
  car.nitroTime = Math.max(0, car.nitroTime - dt);
  car.miniBoost = Math.max(0, car.miniBoost - dt);
  for (const name of MYSTERY_EFFECTS) car.effects[name] = Math.max(0, car.effects[name] - dt);
  // Linear ramp: full deflection takes STEER_RAMP seconds (longer on ice), like an analog stick.
  const ramp = STEER_RAMP * (car.section === 'ice' ? ICE_RAMP_FACTOR : 1);
  car.steering += clamp(steer - car.steering, -dt / ramp, dt / ramp);
  let lateralPosition = car.x + car.steering * Math.min(9, car.speed * 0.22) * dt;
  if (car.section === 'crosswind') lateralPosition += (section.dir ?? 1) * CROSSWIND_SPEED * dt;
  if (input.laneAssist === true && steer === 0 && car.cooldown === 0 && car.speed > 5) {
    const lane = LANES.reduce((best, centre) => Math.abs(centre - car.x) < Math.abs(best - car.x) ? centre : best);
    lateralPosition += (lane - lateralPosition) * (1 - Math.exp(-3 * dt));
  }
  car.x = clamp(lateralPosition, -ROAD_LIMIT, ROAD_LIMIT);
  // A continuous press against the same rail is one contact, not a fresh crash
  // each time collision grace expires. Re-arm after the car pulls clear.
  if (Math.abs(car.x) < ROAD_LIMIT - 1.2) car.railContactSide = 0;
  car.cooldown = Math.max(0, car.cooldown - dt);
  car.scrapeCooldown = Math.max(0, car.scrapeCooldown - dt);
  if (car.nearMiss && race.elapsed - car.nearMiss.time > 5) car.combo = 0;

  // Takeoff buffer: FLY held while too slow is remembered; it counts as held until the window runs out.
  const flyInput = !!input.fly && race.modifier !== 'no-flight';
  car.flyBuffer = flyInput && car.speed < 18 ? TAKEOFF_BUFFER : flyInput ? 0 : Math.max(0, car.flyBuffer - dt);
  const fly = flyInput || car.flyBuffer > 0;
  if (!flyInput && car.fuel >= 15) car.exhausted = false; // glide regen and rewards can unlock it mid-air
  car.thrusting = fly && car.speed >= 18 && car.fuel > 0 && !car.exhausted;
  if (car.altitude > 0 && car.thrusting) {
    car.poweredFlightTime += dt;
    if (nitro || boost) car.flightBoosted = true;
  }
  if (car.thrusting) {
    car.verticalSpeed = Math.min(7, car.verticalSpeed + 19 * dt);
    car.fuel = Math.max(0, car.fuel - (car.inShortcut ? 0 : FLY_DRAIN) * dt); // the corridor carries the car
    if (car.fuel === 0) { car.exhausted = true; car.fuelOuts++; } // thrusting needs !exhausted, so this counts each run-out once
  } else if (car.altitude > 0) {
    car.verticalSpeed -= (fly ? 11 : 7) * dt; // releasing FLY glides
    if (!fly && !boost) car.fuel = Math.min(100, car.fuel + GLIDE_FUEL_REGEN * dt);
  } else if (!flyInput && !boost) {
    car.fuel = Math.min(100, car.fuel + (car.section === 'uphill' ? 6.5 : 13) * dt);
  }
  // AIR DASH: combined drain is 18/s (15 FLY + 3 BOOST), rather than adding 10/s to FLY.
  if (boost) car.fuel = Math.max(0, car.fuel - (car.thrusting ? 3 : 10) * dt);
  const previousAltitude = car.altitude;
  // Sky Spiral launch ramps impart momentum automatically; FLY can extend the jump.
  if (race.trackId === 'spiral' && car.section === 'launch' && car.altitude === 0 && car.speed > 32 &&
      car.distance >= section.to - car.speed * dt - 1) {
    car.altitude = 0.02;
    car.verticalSpeed = Math.max(car.verticalSpeed, 6 + car.speed * 0.075);
  }
  car.altitude = clamp(car.altitude + car.verticalSpeed * dt, 0, 12);
  const roofHit = car.section === 'tunnel' && car.altitude + CAR_HEIGHT > TUNNEL_CEILING;
  if (roofHit) {
    car.altitude = TUNNEL_CEILING - CAR_HEIGHT;
    car.verticalSpeed = Math.min(0, car.verticalSpeed);
    car.trick = null;
  }
  if (car.altitude > 0) car.drift = null; // taking off loses the drift build-up
  if (previousAltitude > 0 && car.altitude === 0) {
    // Reward an earned, controlled NITRO/BOOST-to-flight-to-road transition once per landing.
    const chain = car.poweredFlightTime >= 0.4 && car.flightBoosted &&
      Math.abs(car.verticalSpeed) < TRICK_HARD_LANDING && car.speed >= DRIFT_MIN_SPEED && race.modifier !== 'no-flight';
    car.landing = { speed: Math.abs(car.verticalSpeed), time: race.elapsed, distance: car.distance, x: car.x, chain };
    if (chain) car.miniBoost = Math.max(car.miniBoost, 1.2);
    car.poweredFlightTime = 0;
    car.flightBoosted = false;
    if (car.trick?.done && car.section !== 'gap') { // touching down over a gap is a fall, not a landing
      const hard = car.landing.speed >= TRICK_HARD_LANDING;
      if (!hard) addNitro(car, TRICK_NITRO);
      car.trickPayout = { time: race.elapsed, nitro: hard ? 0 : TRICK_NITRO, hard };
    }
    car.trick = null;
  }
  if (car.altitude === 0 || car.altitude === 12) car.verticalSpeed = 0;
  const previousDistance = car.distance;
  const previousContacts = car.collisions + car.falls;
  car.distance += car.speed * dt;
  const gapNow = race.trackId === 'spiral' ? skyGapAt(car.distance) : car.section === 'gap';
  if (gapNow && car.altitude < GAP_CLEARANCE && !(race.trackId === 'spiral' && car.altitude > 0 && car.verticalSpeed > 0)) {
    car.speed *= GAP_SLOWDOWN;
    const gapEnd = race.trackId === 'spiral' ? SKY_JUMPS.find(j => car.distance >= j.gapFrom && car.distance < j.gapTo)?.gapTo : section.to;
    car.distance = (gapEnd ?? section.to) + GAP_RESPAWN;
    car.altitude = car.verticalSpeed = 0;
    car.cooldown = 1.5; // respawn grace: no instant collision with traffic parked past the gap
    car.combo = 0;
    car.drift = null;
    car.trick = null;
    car.poweredFlightTime = 0;
    car.flightBoosted = false;
    car.falls++;
    car.fall = { from: section.from, distance: car.distance, time: race.elapsed };
  }

  for (const traffic of race.traffic) {
    traffic.cooldown = Math.max(0, (traffic.cooldown || 0) - dt);
    if (traffic.speed < traffic.cruise) traffic.speed = Math.min(traffic.cruise, traffic.speed + TRAFFIC_ACCEL * dt); // back up to cruise after a knock
    const before = traffic.distance;
    traffic.distance += traffic.speed * dt;
    avoidObstacles(race, traffic, traffic.speed, dt);
    aiImpacts(race, traffic, before, traffic.speed);
    // Recycle distant traffic so the same small scene stays populated for the full sprint.
    if (traffic.distance < car.distance - 60) traffic.distance += 1400;
  }
  race.rivals.forEach((rival, i) => {
    const period = RIVAL_HOP_PERIOD[rival.name] ?? 13;
    const cycle = ((race.elapsed + i * 3) % period) * (13 / period);
    rival.altitude = cycle > 6 && cycle < 11 ? Math.sin((cycle - 6) / 5 * Math.PI) * (5 + i) : 0;
    rival.thrusting = cycle > 6 && cycle < 9;
    if (rival.nitro > 0 && rival.nitroTime === 0 && rivalWantsNitro(race, rival, Math.floor((race.elapsed + i * 3) / period))) {
      rival.nitro--;
      rival.nitroTime = RIVAL_NITRO_TIME;
    }
    rival.nitroTime = Math.max(0, rival.nitroTime - dt);
    rival.cooldown = Math.max(0, (rival.cooldown || 0) - dt);
    const cap = (70 + i * 3) * (race.config.difficulty === 'easy' ? 0.90 : race.config.difficulty === 'hard' ? 1.07 : 1) + (rival.nitroTime > 0 ? RIVAL_NITRO_BONUS : 0);
    rival.speed = rival.speed > cap ? Math.max(cap, rival.speed - (14 + i) * dt) : Math.min(cap, rival.speed + (14 + i) * dt);
    const before = rival.distance;
    // Rubber band: a rival far ahead of the player eases off, one far behind speeds up, by at most RUBBER_BAND_MAX.
    const gap = rival.distance - car.distance;
    const band = Math.sign(gap) * clamp((Math.abs(gap) - RUBBER_BAND_FREE) / RUBBER_BAND_RANGE, 0, 1);
    const slow = (car.effects.freeze > 0 ? FREEZE_RIVAL_SPEED : 1) * (1 - band * RUBBER_BAND_MAX);
    rival.pace = rival.speed * slow;
    rival.distance += rival.pace * dt;
    avoidObstacles(race, rival, rival.pace, dt);
    aiImpacts(race, rival, before, rival.pace);
    if (rival.distance >= race.length && rival.finishTime === null) {
      rival.finishTime = race.elapsed - dt + Math.max(0, race.length - before) / rival.pace;
    }
  });
  const { rivals, traffic } = race;
  for (let i = 0; i < rivals.length; i++) {
    for (let j = i + 1; j < rivals.length; j++) bumpCars(race, rivals[i], rivals[j]);
    for (const other of traffic) bumpCars(race, rivals[i], other);
  }
  for (let i = 0; i < traffic.length; i++) for (let j = i + 1; j < traffic.length; j++) bumpCars(race, traffic[i], traffic[j]);

  if (car.cooldown === 0) {
    const obstacle = car.effects.ghost > 0 ? null : [...race.traffic, ...race.rivals].find(other =>
      Math.abs(other.distance - car.distance) < 4.4 && Math.abs(other.x - car.x) < 1.7 &&
      Math.abs((other.altitude || 0) - car.altitude) < 1.8,
    );
    const prop = car.effects.ghost > 0 ? null : hitProp(race.props, car, previousDistance);
    const pylon = car.section === 'shortcut' && shortcutPylons(section).find(p => p.distance > previousDistance && p.distance <= car.distance &&
      Math.abs(p.x - car.x) < PYLON_HALF_WIDTH && Math.abs(p.altitude - car.altitude) < SHORTCUT_TOLERANCE);
    if (obstacle) {
      const side = Math.sign(car.x - obstacle.x) || -1, intensity = clamp(Math.abs(car.speed - obstacle.speed) / 70, 0.25, 1);
      contact(race, 'vehicle', obstacle.x, intensity, nitro ? 0.7 : 0.45);
      if (!(obstacle.cooldown > 0)) knock(race, obstacle, -side, intensity, aiRetention(obstacle)); // the other car feels it too
    } else if (prop) {
      contact(race, 'barrier', (prop.left + prop.right) / 2, clamp(car.speed / 100, 0.25, 1), nitro ? 0.7 : 0.45);
      car.x = clearOf(prop, car.x);
    } else if (roofHit) {
      contact(race, 'barrier', Math.sign(car.x) * (ROAD_LIMIT + 1), clamp(car.speed / 100, 0.25, 1), 0.75); // pushed toward the centre
    } else if (pylon) {
      contact(race, 'barrier', pylon.x, clamp(car.speed / 100, 0.25, 1), 0.75);
    } else if (Math.abs(lateralPosition) > ROAD_LIMIT && car.altitude < 1.3 && car.speed > 12 && car.railContactSide !== Math.sign(lateralPosition)) {
      const side = Math.sign(lateralPosition);
      if (Math.abs(car.steering) < 0.9 && Math.abs(car.steering * Math.min(9, car.speed * 0.22)) / car.speed < SCRAPE_RATIO) {
        car.x = side * (ROAD_LIMIT - 0.3);
        if (car.scrapeCooldown === 0) {
          car.speed *= 0.92;
          car.scrapeCooldown = 0.5;
          car.scrape = { side, x: car.x, time: race.elapsed };
        }
      } else {
        contact(race, 'barrier', side * (ROAD_LIMIT + 1), clamp(car.speed / 100, 0.25, 1), 0.75);
        car.railContactSide = side;
      }
    }
  }
  for (const traffic of race.traffic) {
    const gap = traffic.distance - traffic.speed * dt - previousDistance;
    const clearance = Math.abs(traffic.x - car.x);
    if (gap > -4.4 && traffic.distance - car.distance <= -4.4 &&
        clearance >= 2 && clearance < 3.5 && car.altitude < 1.8 && car.speed > 35 && car.cooldown === 0) {
      car.combo = Math.min(5, car.combo + (drifting ? 2 : 1)); // drifting doubles the combo points
      car.longestCombo = Math.max(car.longestCombo, car.combo);
      car.nearMisses++;
      car.score += 100 * car.combo;
      const charge = Math.min(100 - car.fuel, 6 + car.combo * 2);
      car.fuel += charge;
      car.nearMiss = { time: race.elapsed, combo: car.combo, charge };
    }
  }
  for (const pickup of race.pickups) { // sorted by distance
    if (pickup.distance > car.distance + MAGNET_RANGE) break;
    if (pickup.taken) continue;
    const crossed = pickup.distance <= car.distance && pickup.distance > previousDistance &&
      Math.abs(pickup.x - car.x) < 1.7 && Math.abs(pickup.altitude - car.altitude) < 1.8;
    const pulled = car.effects.magnet > 0 &&
      Math.hypot(pickup.distance - car.distance, pickup.x - car.x, pickup.altitude - car.altitude) < MAGNET_RANGE;
    if (crossed || pulled) {
      pickup.taken = true;
      if (pickup.tier === 'overcharge') addNitro(car, NITRO_MAX - car.nitro, 0);
      else addNitro(car, NITRO_PICKUPS[pickup.tier]);
    }
  }
  const fell = car.fall?.time === race.elapsed; // a respawn jump skips the rings it covers
  for (const ring of race.rings) { // sorted by distance
    if (ring.distance > car.distance) break;
    // shortcut: tests the car's end-of-step x/altitude, not the interpolated crossing (error < 0.7 m at dt 0.1), upgrade if risk rings feel unfair
    if (fell || ring.distance <= previousDistance || Math.hypot(ring.x - car.x, ring.altitude - car.altitude) >= ring.radius) continue;
    collectRing(race, ring, race.rings.indexOf(ring));
  }
  stepPlayerHazards(race, car, previousDistance, contact);
  const travelled = Math.min(car.distance, race.length) - previousDistance;
  if (car.collisions + car.falls !== previousContacts) car.cleanDistance = 0;
  else {
    car.cleanDistance += travelled;
    car.score += Math.floor(car.cleanDistance / 500) * 100;
    car.cleanDistance %= 500;
  }
  if (car.altitude > 0 && car.speed >= 18) car.score += dt * 10;
  if (race.checkpoint) {
    car.score += stepCheckpointRush(race.checkpoint, previousDistance, car, dt);
  }
  if (race.practice) samplePractice(race.practice, car, Math.max(0, Math.min(car.distance, race.length) - previousDistance), dt);
  if (race.styleAttack) car.score += scoreStuntAttack(race.styleAttack, car, car.score - previousScore, dt, race.elapsed);
  if (race.mode === 'free' && car.distance >= race.length) {
    car.distance = race.length; // authored point-to-point road ends here; no fake infinite road
    car.speed = 0;
    car.thrusting = false;
    car.boosting = false;
  }
  if (race.elimination) {
    // Keep the original course bounded even if a future car tuning reaches the end early.
    if (car.distance >= race.length) { car.distance = race.length; car.speed = 0; }
    const knockout = stepElimination(race.elimination,race);
    if (knockout?.outcome) {
      race.result = {position:knockout.outcome === 'won' ? 1 : race.rivals.length + 1, time:race.elapsed,
        success:knockout.outcome === 'won', score:Math.round(car.score),
        collisions:car.collisions, nearMisses:car.nearMisses, nitroUses:car.nitroUses,
        rings:car.rings, perfectLines:car.perfectLines, stars:1};
      race.phase='finished'; car.speed=0; car.thrusting=false; car.boosting=false;
      return;
    }
  }
  const completion = raceCompletion(race);
  if (completion.done) {
    const finishTime = completion.reason === 'timer' ? race.stuntLimit : completion.reason === 'expired' ? race.elapsed :
      race.elapsed - dt + dt * (race.length - previousDistance) / (car.distance - previousDistance);
    const position = 1 + race.rivals.filter(rival => rival.finishTime !== null && rival.finishTime < finishTime).length;
    car.distance = Math.min(car.distance, race.length); // An expired timer must not teleport the car to the finish.
    race.elapsed = finishTime;
    const score = Math.round(car.score);
    race.result = { position, time: finishTime, collisions: car.collisions, nearMisses: car.nearMisses,
      nitroUses: car.nitroUses, nitroChain: car.nitroChain, longestCombo: car.longestCombo,
      rings: car.rings, perfectLines: car.perfectLines, fuelOuts: car.fuelOuts, gapFalls: car.falls, score,
      stars: score >= race.length * 0.5 ? 3 : score >= race.length * 0.25 ? 2 : 1,
      success: race.checkpoint ? !race.checkpoint.expired && race.checkpoint.passed === race.checkpoint.gates.length :
        !(race.mode === 'time' && race.config.clean && car.collisions > 0),
      ...(race.mode === 'stunt' ? { endReason: completion.reason } : {}) };
    race.phase = 'finished';
    car.thrusting = false;
    car.boosting = false;
  }
}

// The next broken bridge within warning range when the charge left cannot thrust across it at the current speed.
export function gapChargeWarning(race) {
  if (race.trackId === 'spiral') return null; // its launch ramps throw the car across
  const car = race.player;
  const gap = race.sections.find(s => s.type === 'gap' && s.to > car.distance && s.from - car.distance <= GAP_WARN_DISTANCE);
  if (!gap) return null;
  const need = FLY_DRAIN * (gap.to - Math.max(car.distance, gap.from)) / Math.max(car.speed, 18) + (car.altitude >= GAP_CLEARANCE ? 0 : GAP_LIFT_RESERVE);
  return car.fuel < need ? { from: gap.from, need } : null;
}
