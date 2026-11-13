import { classicCornerPush } from './classic-road-routes.ts';
import { prepareEndless, streamEndless, finishEndless } from './endless-highway.ts';
import { earnsAirChain } from './air-chain.ts';
import { createRings, pickupRun, spreadDistances, ITEMS_PER_CAR, RING_RADIUS, RING_FUEL, RING_NITRO, SLIPSTREAM_BOOST, PERFECT_LINE_NITRO, MYSTERY_EFFECTS, EFFECT_TIMES, NITRO_MAX, NITRO_PICKUPS } from './ring-layout.ts';
export { RING_RADIUS, RISK_RING_RADIUS, ITEMS_PER_CAR, RING_FUEL, SLIPSTREAM_BOOST, RISK_SCORE, PERFECT_LINE_NITRO, MYSTERY_EFFECTS, EFFECT_TIMES, NITRO_MAX, NITRO_PICKUPS } from './ring-layout.ts';
import { createCircuit, stepCircuit, lapItems } from './circuit-laps.ts';
import { attachCourse, stepCoursePlayer, stepCourseCars, carGap, progressGap, courseFinished, courseGapWarning, recycleCourseTraffic } from './course-race-step.ts'; import { finishRace } from './race-finish.js';
import { hitProp, clearOf, avoidObstacles, knock, aiRetention, aiImpacts, bumpCars, TRAFFIC_ACCEL } from './car-collisions.js';
import { seededRng, RACE_STREAMS } from './rng.ts';
import { createHazards } from './hazards.ts'; import { crossesRamp, launchImpulse, LAUNCH_MIN_SPEED } from './launch-ramps.ts';
import { stepPlayerHazards, hazardReach, hazardTouch, nudge } from './hazard-race.ts';
import { raceHazards, themedExtras } from './track-themes.ts'; import { mixedCourse, withHoops } from './gauntlet-course.ts';
import { createCheckpointRush, stepCheckpointRush } from './checkpoint-rush.ts';
import { createPracticeStats, samplePractice } from './practice-stats.ts';
import { createStuntAttack, scoreStuntAttack } from './stunt-attack.ts';
import { createElimination, stepElimination } from './elimination.ts';
import { bankItem, activateItem, tickItemCooldown, ringsForItemRule } from './active-items.ts';
import { decorateBonusGates, collectBonusGate, applyEMPPulse, recoveryRetention, bonusScore } from './bonus-gates.ts';
import { normalizeRaceConfig, trafficMultiplier } from './race-config.ts';
import { RACE_DRIVER_IDS, startingGrid } from './race-grid.ts';
import { raceCompletion } from './race-objectives.ts'; import { riskRules } from './risk-lines.ts'; import { spawnCatchUp } from './catch-up-items.ts';
import { createRaceSessionContract } from './race-session.ts';
import { skyJumpGap } from './sky-track.ts'; import { dropCar, stepDeck, stepRivalDeck, stepSpan, SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE } from './road-falls.ts';
/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */

import { RACE_TRACKS, raceTrack, assertTrackMode, itemScale } from './race-tracks.ts';
export { RACE_TRACKS } from './race-tracks.ts';
export const RACE_LENGTH = RACE_TRACKS.coast.length;
import { MAX_SPEED, NITRO_TIME, FLY_DRAIN, GLIDE_FUEL_REGEN, BOOST_CAP_BONUS, NITRO_CAP_BONUS, THROTTLE_ACCEL, BOOST_ACCEL, NITRO_ACCEL, OVER_CAP_DECEL, BOOST_DRAIN, GROUND_FUEL_REGEN, UPHILL_FUEL_REGEN, DRIFT_MIN_SPEED, DRIFT_BLEED, DRIFT_REWARDS } from './drive-rules.ts';
export { MAX_SPEED, NITRO_TIME, FLY_DRAIN, GLIDE_FUEL_REGEN, DRIFT_MIN_SPEED, DRIFT_BLEED, DRIFT_REWARDS, driftTier } from './drive-rules.ts';
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
export const GAP_SLOWDOWN = 0.4; // speed kept after falling into a gap
export const GAP_RESPAWN = 5; // m past the gap where the car is put back
export const CROSSWIND_SPEED = 4; // m/s sideways push
export const ICE_RAMP_FACTOR = 4; // steering takes this many times longer to respond on ice

export const NITRO_EXTEND = 2; // seconds added by a press during NITRO
export const NITRO_FUEL_PER_CHARGE = 32; // overflow conversion: each 0.25 charge = 8 fuel
export const NITRO_FUEL_BONUS = 20; // fuel per charge banked below the cap: each 0.25 charge = 5 fuel

// AIR TRICK: a steer press opposite to one begun moments earlier, while flying, is a barrel roll; landing it pays nitro.
export const TRICK_FLICK_WINDOW = 0.3; // s between the starts of the two presses
export const TRICK_ROLL_TIME = 0.7; // s for one full roll
export const TRICK_NITRO = 0.25; // charges for a landed roll
export const TRICK_HARD_LANDING = 11; // m/s landing.speed that loses the reward (an unpowered glide from 8.6 m)

// SHORTCUT: a flight-only corridor { x, altitude } over an edge lane; inside it flight is free and faster, pylons are the risk.
export { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE } from './road-falls.ts'; // corridor half width / altitude band (also the pylon height)
export const SHORTCUT_CAP_BONUS = 12; // m/s added to the speed cap inside
export const SHORTCUT_PYLON_SPACING = 100; // m
export const SHORTCUT_PYLON_OFFSET = 2.2; // m from the centre, alternating sides
// Derived from the section, never stored, so the simulation and the renderer always agree.
export const shortcutPylons = section => Array.from({ length: Math.ceil((section.to - section.from - 50) / SHORTCUT_PYLON_SPACING) }, (_, i) => ({
  distance: section.from + 50 + i * SHORTCUT_PYLON_SPACING, x: section.x + (i % 2 ? 1 : -1) * SHORTCUT_PYLON_OFFSET, altitude: section.altitude,
}));
const PYLON_HALF_WIDTH = 1.2; // m

export const MAGNET_RANGE = 12; // m
export const FREEZE_RIVAL_SPEED = 0.5; // rival speed multiplier while frozen

import { SLIPSTREAM_CAP_BONUS, SLIPSTREAM_NITRO, SLIPSTREAM_MIN_GAP, SLIPSTREAM_MAX_GAP,
  SLIPSTREAM_LATERAL, SLIPSTREAM_ALTITUDE, stepSlipstream } from './drive-rules.ts'; // SLIPSTREAM: shared with rivals
export { SLIPSTREAM_TIME, SLIPSTREAM_CAP_BONUS, SLIPSTREAM_NITRO, SLIPSTREAM_LATERAL, SLIPSTREAM_MIN_GAP, SLIPSTREAM_MAX_GAP, SLIPSTREAM_ALTITUDE } from './drive-rules.ts';

import { RIVAL_NITRO_CHARGES, RIVAL_HOP_PERIOD, ITEM_RESPAWN, rivalCollects, rivalSeek } from './rival-items.ts'; import { driveRival } from './rival-driver.ts';
export { RIVAL_NITRO_CHARGES, RIVAL_NITRO_BONUS, RIVAL_NITRO_NOVA_FIRST, RIVAL_NITRO_NOVA_EVERY, RIVAL_NITRO_ORBIT_ALTITUDE, RIVAL_NITRO_MIN_SPEED, RIVAL_NITRO_APEX_FROM, RIVAL_HOP_PERIOD } from './rival-items.ts';
export const RIVAL_NITRO_TIME = NITRO_TIME; // seconds one rival charge lasts
export const RUBBER_BAND_MAX = 0.04; // a leading rival's speed multiplier drops by at most this; one behind gets nothing (user, 2026-11-07)
export const RUBBER_BAND_FREE = 50; // m of lead with no effect
export const RUBBER_BAND_RANGE = 250; // m beyond the free zone to reach the full effect
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Rings and pickups sit by the track seed (repeatable: tests, tools) unless the app re-rolls it per race (race-factory.ts).
let layoutSeed = track => track.seed;
export function setLayoutSeed(next = track => track.seed) { layoutSeed = next; }

// `count` single pickups from the 'pickups' stream of `seed`, plus one overcharge and each shortcut's reward line.
function createPickups(track, count, seed) {
  const random = seededRng(seed, RACE_STREAMS.pickups), runs = seededRng(seed, RACE_STREAMS.pickupRuns);
  const pick = list => list[Math.floor(random() * list.length)];
  // Ground pickups would sit over a gap's hole; air pickups would be stuck in a tunnel roof.
  const blocked = pickup => track.sections.some(s => s.type === (pickup.altitude === 0 ? 'gap' : 'tunnel') && pickup.distance >= s.from - 10 && pickup.distance < s.to + 10);
  const pickups = spreadDistances(count, 300, track.length - 300, random).flatMap(distance => {
    const roll = random(), air = Math.round(30 + random() * 40) / 10;
    const pickup = roll < 0.6 ? { distance, x: pick(LANES), altitude: 0, tier: 'cell' }
      : roll < 0.85 ? { distance, x: pick([-5, 0, 5]), altitude: 0, tier: 'can' } // between lanes
        : { distance, x: pick(LANES), altitude: air, tier: 'tank' };
    // Blocked: over a gap it flies, in a tunnel it sits on the road.
    return pickupRun(!blocked(pickup) ? pickup : pickup.altitude === 0 ? { ...pickup, altitude: air, tier: 'tank' } : { ...pickup, altitude: 0, tier: 'can' }, runs, blocked);
  });
  let overcharge; // high-risk: near the flight ceiling over an edge lane; bounded retries so a tunnel-heavy track cannot hang
  for (let tries = 0; tries < 50 && (!overcharge || blocked(overcharge)); tries++) {
    overcharge = { distance: Math.round(track.length * (0.5 + random() * 0.3)), x: pick([LANES[0], LANES[3]]), altitude: 10, tier: 'overcharge' };
  }
  for (const s of track.sections) if (s.type === 'shortcut') { // the corridor's reward line: cells down the centre, a tank halfway
    for (let distance = s.from + 30; distance < s.to; distance += 60) pickups.push({ distance, x: s.x, altitude: s.altitude, tier: 'cell' });
    pickups.push({ distance: (s.from + s.to) / 2, x: s.x, altitude: s.altitude, tier: 'tank' });
  }
  return [...pickups, overcharge].sort((a, b) => a.distance - b.distance);
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

// Authored hoops keep out of the layout's group 0 (they pushed its count past groupSize, 6/5) and, like catch-up
// rings, form no PERFECT LINE of their own: a lone mixed-Gauntlet hoop would otherwise pay one per hit.
const ownLine = (extras, group) => extras && { hoops: extras.hoops.map(hoop => ({ ...hoop, group, groupSize: Infinity })) };
export function createRace(trackId = 'coast', modifier = null, presentation = {}, nextGrid = undefined) {
  const track = raceTrack(trackId);
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const options = modifier !== null && typeof modifier === 'object' && !Array.isArray(modifier) ? modifier : null;
  const dailyModifier = options ? null : modifier;
  if (dailyModifier !== null && !DAILY_MODIFIERS.includes(dailyModifier)) throw new Error(`Unknown modifier: ${dailyModifier}`);
  const config = normalizeRaceConfig(options ?? {});
  const driverIds = RACE_DRIVER_IDS.slice(1, config.rivals + 1);
  const grid = startingGrid(driverIds, nextGrid);
  const slots = new Map(grid.map(slot => [slot.id, slot]));
  const playerSlot = slots.get('YOU');
  assertTrackMode(trackId, config.mode);
  const session = createRaceSessionContract(trackId, track.seed, config, presentation), risk = riskRules(config), themed = themedExtras(trackId, config, risk);
  const density = track.trafficDensity * (dailyModifier === 'double-traffic' ? 2 : 1) * (config.mode !== 'classic' ? trafficMultiplier(config.traffic) : 1);
  const seed = layoutSeed(track), count = Math.round(ITEMS_PER_CAR * (driverIds.length + 1) * itemScale(track)), perLap = (items, kind) => config.mode === 'circuit' ? lapItems(items, config.laps, kind) : items;
  const course = mixedCourse(trackId, track, LANES, config), hoopsAt = [...(course?.hoops ?? []), ...(themed?.hoops ?? [])].map(hoop => hoop.distance), rings = decorateBonusGates(ringsForItemRule(withHoops(withHoops(perLap(createRings(track, risk.rings, count, seed, hoopsAt), 'ring'), ownLine(course, -2)), ownLine(themed, -3)), config.itemRules), config);
  if (dailyModifier === 'gold-rings') for (const ring of rings) Object.assign(ring, { type: 'nitro', radius: RING_RADIUS });
  const race = {
    trackId, modifier: dailyModifier, mode: config.mode, config, grid, session, objective: session.objective, seed: track.seed, length: track.length * (config.laps ?? 1), sections: (themed?.sections.length ? [...track.sections, ...themed.sections].sort((a, b) => a.from - b.from) : track.sections).map(section => ({ ...section })),
    phase: 'ready', countdown: 3, elapsed: 0, result: null, rivalPace: track.rivalPace ?? 1, rivalSpread: track.rivalSpread, pickups: config.items ? perLap(createPickups(track, count, seed), 'pickup') : [], rings,
    circuit: config.mode === 'circuit' ? createCircuit(config.laps, grid) : null,
    props: [], risk, ...(themed && { ramps: themed.ramps }), // props: solid World Tour scenery parts; main.js fills them from roadObstacles()
    hazards: raceHazards(trackId, track, LANES, config, course),
    checkpoint: config.mode === 'checkpoint' ? createCheckpointRush(track) : null,
    practice: config.mode === 'free' ? createPracticeStats() : null,
    styleAttack: config.mode === 'stunt' ? createStuntAttack() : null,
    elimination: config.mode === 'elimination' ? createElimination() : null,
    stuntLimit: config.mode === 'stunt' ? config.duration : null,
    player: {
      distance: playerSlot.distance, x: playerSlot.x, speed: 0, altitude: 0, verticalSpeed: 0,
      fuel: 100, thrusting: false, exhausted: false, fuelOuts: 0, rewardFuel: 0, collisions: 0, cooldown: 0,
      impact: null, landing: null, steering: 0, railContactSide: 0, boosting: false, braking: false,
      nearMiss: null, nearMisses: 0, combo: 0, scrape: null, scrapeCooldown: 0, flyBuffer: 0,
      poweredFlightTime: 0, flightBoosted: false,
      section: null, inShortcut: false, falls: 0, fall: null, span: false,
      nitro: 0, nitroTime: 0, nitroHeld: false, nitroUses: 0, nitroBurst: 0, nitroChain: 0, longestCombo: 0,
      slipstream: { time: 0, active: false, paid: false },
      drift: null, driftPayout: null, miniBoost: 0, boostTunnelClaimed: [], boostTunnelEvent: null, trick: null, trickPayout: null, flick: null, steerSign: 0,
      rings: 0, perfectLines: 0, score: 0, cleanDistance: 0, groupHits: {}, effects: { shield: 0, magnet: 0, ghost: 0, freeze: 0 },
      heldItem: null, itemCooldown: 0,
    },
    rivals: driverIds.map((name, i) => ({
      id: name, name, x: slots.get(name).x, homeX: slots.get(name).x, distance: slots.get(name).distance, speed: 0,
      altitude: 0, thrusting: false, fuel: 100, boosting: false, slipstream: { time: 0, active: false, paid: false }, finishTime: null, nitro: RIVAL_NITRO_CHARGES, nitroUses: 0, nitroTime: 0, nitroHop: -1, pace: 0, cooldown: 0, itemTakes: 0, lastTake: null,
    })),
    traffic: Array.from({ length: Math.round(36 * density) }, (_, i) => ({
      x: LANES[(i * 7 + 1) % 4], homeX: LANES[(i * 7 + 1) % 4], distance: 170 + i * 125 / density,
      speed: 23 + (i % 5) * 3, cruise: 23 + (i % 5) * 3, altitude: 0, cooldown: 0, color: i % 5,
    })),
  };
  prepareEndless(race); attachCourse(race); // H1: graph courses only (spec §5.1)
  return race;
}
function collectRing(race, ring, index) {
  const car = race.player;
  Object.assign(ring, { hit: true, downUntil: race.elapsed + ITEM_RESPAWN }); // gone until it respawns, like one any car takes
  car.rings++;
  car.score += 150;
  if (ring.type === 'charge') car.fuel = Math.min(100, car.fuel + RING_FUEL);
  else if (ring.type === 'nitro') addNitro(car, RING_NITRO.nitro);
  else if (ring.type === 'slipstream') car.miniBoost = Math.max(car.miniBoost, SLIPSTREAM_BOOST);
  else if (ring.type === 'risk') {
    addNitro(car, RING_NITRO.risk);
    car.score += race.risk.ringScore;
  } else if (ring.type === 'mystery') {
    const effect = mysteryEffect(race.seed, ring.mysteryIndex ?? index);
    if (race.config.activeItems) bankItem(car, effect);
    else car.effects[effect] = EFFECT_TIMES[effect];
  } else collectBonusGate(race, ring);
  car.groupHits[ring.group] = (car.groupHits[ring.group] ?? 0) + 1;
  if (car.groupHits[ring.group] === (ring.groupSize ?? race.rings.filter(other => other.group === ring.group).length)) {
    car.perfectLines++; // PERFECT LINE: every ring of the group cleared
    car.score += 500;
    addNitro(car, PERFECT_LINE_NITRO);
  }
}

export function startRace(race) {
  if (race.phase === 'ready') race.phase = race.mode === 'free' ? 'racing' : 'countdown';
}

export function useHeldItem(race) {
  if (!race?.config?.activeItems || race.phase !== 'racing') return null;
  if (race.player.heldItem === 'emp' && (race.mode !== 'custom' || race.config.itemRules !== 'all')) race.player.heldItem = 'magnet';
  const effect = activateItem(race.player, race.rivals.length > 0);
  if (effect === 'emp') applyEMPPulse(race);
  return effect;
}

export { racePosition, sprintGaps } from './race-standings.ts';

function contact(race, kind, obstacleX, intensity, retention) {
  const car = race.player;
  if (car.effects.shield > 0) { // the shield eats this hit: no damage, brief grace to clear the obstacle
    car.effects.shield = 0; car.shieldBlock = { x: car.x, altitude: car.altitude, distance: car.distance, time: race.elapsed };
    car.cooldown = 1;
    return;
  }
  const side = Math.sign(car.x - obstacleX) || -1, x = car.x;
  const speedLost = knock(race, car, side, intensity, recoveryRetention(car, retention));
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
    // GO rolls the grid just past FLY's 18 m/s takeoff, so input answers at once; practice (standingStart) waits for THROTTLE.
    if (race.countdown < 0.00001) { race.phase = 'racing'; if (!race.standingStart) for (const car of [race.player, ...race.rivals]) car.speed = Math.max(car.speed, 20); }
    return;
  }
  if (race.phase !== 'racing') return;
  streamEndless(race); spawnCatchUp(race);
  race.elapsed += dt;
  const car = race.player;
  const previousScore = car.score;
  if (race.config.activeItems || race.config.bonusGates) tickItemCooldown(car, dt);
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
  const drafts = other => {
    const gap = carGap(race, car, other) ?? -Infinity; // different graph branches cannot draft
    return gap >= SLIPSTREAM_MIN_GAP && gap <= SLIPSTREAM_MAX_GAP &&
      Math.abs(other.x - car.x) < SLIPSTREAM_LATERAL &&
      Math.abs((other.altitude || 0) - car.altitude) < SLIPSTREAM_ALTITUDE;
  };
  if (stepSlipstream(slip, race.traffic.some(drafts) || race.rivals.some(drafts), dt)) addNitro(car, SLIPSTREAM_NITRO);
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
  const limit = (nitro ? MAX_SPEED + NITRO_CAP_BONUS : boosted ? MAX_SPEED + BOOST_CAP_BONUS : MAX_SPEED) + (slip.active ? SLIPSTREAM_CAP_BONUS : 0) +
    (car.inShortcut ? SHORTCUT_CAP_BONUS : 0);
  const drive = drifting ? -DRIFT_BLEED : (throttle ? THROTTLE_ACCEL : -4) - (brake ? 35 : 0);
  const acceleration = car.speed > limit ? -OVER_CAP_DECEL - (brake && !drifting ? 35 : 0) : drive + (boosted ? BOOST_ACCEL : 0) + (nitro ? NITRO_ACCEL : 0);
  car.speed = clamp(car.speed + acceleration * dt, 0, Math.max(limit, car.speed));
  car.nitroTime = Math.max(0, car.nitroTime - dt);
  car.miniBoost = Math.max(0, car.miniBoost - dt);
  for (const name of MYSTERY_EFFECTS) car.effects[name] = Math.max(0, car.effects[name] - dt);
  // Linear ramp: full deflection takes STEER_RAMP seconds (longer on ice), like an analog stick.
  const ramp = STEER_RAMP * (car.section === 'ice' ? ICE_RAMP_FACTOR : 1);
  car.steering += clamp(steer - car.steering, -dt / ramp, dt / ramp);
  let lateralPosition = car.x + car.steering * Math.min(9, car.speed * 0.22) * dt;
  if (car.altitude < .1 && !race.endless?.practice) lateralPosition += classicCornerPush(race.trackId, car.distance, car.speed) * dt;
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
    car.verticalSpeed -= (fly ? 11 : 7) * (car.section === 'low-gravity' ? 0.4 : 1) * dt; // releasing FLY glides; themed low gravity floats
    if (!fly && !boost) car.fuel = Math.min(100, car.fuel + GLIDE_FUEL_REGEN * dt);
  } else if (!flyInput && !boost) {
    car.fuel = Math.min(100, car.fuel + (car.section === 'uphill' ? UPHILL_FUEL_REGEN : GROUND_FUEL_REGEN) * dt);
  }
  // AIR DASH: combined drain is 18/s (15 FLY + 3 BOOST), rather than adding 10/s to FLY.
  if (boost) car.fuel = Math.max(0, car.fuel - (car.thrusting ? 3 : BOOST_DRAIN) * dt);
  const previousAltitude = car.altitude;
  // Sky Spiral launch ramps impart momentum automatically; FLY can extend the jump.
  if (car.altitude === 0 && car.speed > LAUNCH_MIN_SPEED && (race.trackId === 'spiral' && car.section === 'launch' &&
      car.distance >= section.to - car.speed * dt - 1 || crossesRamp(race.ramps, car, car.speed * dt + 1))) {
    car.altitude = 0.02; // Event Lab ramps share the Spiral impulse
    car.verticalSpeed = Math.max(car.verticalSpeed, launchImpulse(car.speed));
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
    const chain = earnsAirChain(car, DRIFT_MIN_SPEED) && race.modifier !== 'no-flight';
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
  const skyGap = race.trackId === 'spiral' && skyJumpGap(car.distance, !!race.endless);
  const gapNow = race.course ? stepCoursePlayer(race, dt, contact) : race.trackId === 'spiral' ? skyGap : car.section === 'gap';
  if (gapNow && car.altitude < GAP_CLEARANCE && !(skyGap && car.altitude > 0 && car.verticalSpeed > 0)) {
    dropCar(car, (skyGap ? skyGap.gapTo : section.to) + GAP_RESPAWN, skyGap ? skyGap.gapFrom : section.from, race.elapsed, GAP_SLOWDOWN);
  }
  stepSpan(car, section, race.elapsed, GAP_SLOWDOWN); stepDeck(car, section, previousAltitude, CAR_HEIGHT);

  for (const traffic of race.traffic) {
    traffic.cooldown = Math.max(0, (traffic.cooldown || 0) - dt);
    if (traffic.speed < traffic.cruise) traffic.speed = Math.min(traffic.cruise, traffic.speed + TRAFFIC_ACCEL * dt); // back up to cruise after a knock
    const before = traffic.distance;
    traffic.distance += traffic.speed * dt;
    avoidObstacles(race, traffic, traffic.speed, dt);
    aiImpacts(race, traffic, before, traffic.speed);
    // Recycle distant traffic so the same small scene stays populated for the full sprint.
    if (!race.endless && (race.course ? recycleCourseTraffic(race, traffic) : traffic.distance < car.distance - 60)) traffic.distance += 1400;
  }
  race.rivals.forEach((rival, i) => {
    const period = RIVAL_HOP_PERIOD[rival.name] ?? 13;
    const cycle = ((race.elapsed + i * 3) % period) * (13 / period);
    const hopFrom = rival.altitude; rival.altitude = cycle > 6 && cycle < 11 ? Math.sin((cycle - 6) / 5 * Math.PI) * (5 + i) : 0;
    rival.thrusting = cycle > 6 && cycle < 9;
    rival.cooldown = Math.max(0, (rival.cooldown || 0) - dt);
    driveRival(race, rival, i, Math.floor((race.elapsed + i * 3) / period), dt); // the player's caps, fuel and NITRO
    const before = rival.distance;
    // Rubber band: a rival far ahead of the player eases off by at most RUBBER_BAND_MAX; one behind is never sped up.
    const band = clamp((progressGap(race, car, rival) - RUBBER_BAND_FREE) / RUBBER_BAND_RANGE, 0, 1);
    const slow = (car.effects.freeze > 0 || rival.empUntil > race.elapsed ? FREEZE_RIVAL_SPEED : 1) * (1 - band * RUBBER_BAND_MAX);
    rival.pace = rival.speed * slow;
    rival.distance += rival.pace * dt;
    rivalSeek(race, rival); avoidObstacles(race, rival, rival.pace, dt); stepRivalDeck(rival, race.sections, hopFrom, CAR_HEIGHT);
    aiImpacts(race, rival, before, rival.pace); rivalCollects(race, rival, before);
    if (!race.endless && !race.circuit && courseFinished(race, rival) && rival.finishTime === null) {
      rival.finishTime = race.elapsed - dt + Math.max(0, race.length - before) / rival.pace;
    }
  });
  stepCourseCars(race, dt); // H2 rivals: graph poses, gates, hazards and finish from this frame's odometers
  const { rivals, traffic } = race;
  for (let i = 0; i < rivals.length; i++) {
    for (let j = i + 1; j < rivals.length; j++) bumpCars(race, rivals[i], rivals[j]);
    for (const other of traffic) bumpCars(race, rivals[i], other);
  }
  for (let i = 0; i < traffic.length; i++) for (let j = i + 1; j < traffic.length; j++) bumpCars(race, traffic[i], traffic[j]);

  if (car.cooldown === 0) {
    const obstacle = car.effects.ghost > 0 ? null : [...race.traffic, ...race.rivals].find(other =>
      Math.abs(carGap(race, car, other) ?? Infinity) < 4.4 && Math.abs(other.x - car.x) < 1.7 &&
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
    if (pickup.taken || pickup.downUntil > race.elapsed) continue; // gone: another car took it (respawns)
    const crossed = pickup.distance <= car.distance && pickup.distance > previousDistance &&
      Math.abs(pickup.x - car.x) < 1.7 && Math.abs(pickup.altitude - car.altitude) < 1.8;
    const pulled = car.effects.magnet > 0 &&
      Math.hypot(pickup.distance - car.distance, pickup.x - car.x, pickup.altitude - car.altitude) < MAGNET_RANGE;
    if (crossed || pulled) {
      pickup.taken = true; pickup.downUntil = race.elapsed + ITEM_RESPAWN;
      if (pickup.tier === 'overcharge') addNitro(car, NITRO_MAX - car.nitro, 0);
      else addNitro(car, NITRO_PICKUPS[pickup.tier]);
    }
  }
  let rowTaken = NaN; const fell = car.fall?.time === race.elapsed; // a respawn jump skips the rings it covers; a ring row pays once per car
  for (const ring of race.rings) { // sorted by distance
    if (ring.distance > car.distance) break;
    // shortcut: tests the car's end-of-step x/altitude, not the interpolated crossing (error < 0.7 m at dt 0.1), upgrade if risk rings feel unfair
    if (fell || ring.hit || ring.downUntil > race.elapsed || ring.distance <= previousDistance || (ring.row && ring.distance === rowTaken) || Math.hypot(ring.x - car.x, ring.altitude - car.altitude) >= ring.radius) continue;
    collectRing(race, ring, race.rings.indexOf(ring)); if (ring.row) rowTaken = ring.distance;
  }
  stepPlayerHazards(race, car, previousDistance, contact);
  const travelled = (race.endless ? car.distance : Math.min(car.distance, race.length)) - previousDistance;
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
  car.score += bonusScore(car, race.mode, car.score - previousScore);
  if (race.elimination) {
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
  if (finishEndless(race)) return;
  stepCircuit(race, dt);
  finishRace(race, previousDistance, dt);
}

// The next broken bridge within warning range when the charge left cannot thrust across it at the current speed.
export function gapChargeWarning(race) {
  if (race.course) return courseGapWarning(race); if (race.trackId === 'spiral') return null; // its launch ramps throw the car across
  const car = race.player;
  const gap = race.sections.find(s => s.type === 'gap' && s.to > car.distance && s.from - car.distance <= GAP_WARN_DISTANCE);
  if (!gap) return null;
  const need = FLY_DRAIN * (gap.to - Math.max(car.distance, gap.from)) / Math.max(car.speed, 18) + (car.altitude >= GAP_CLEARANCE ? 0 : GAP_LIFT_RESERVE);
  return car.fuel < need ? { from: gap.from, need } : null;
}
