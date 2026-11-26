import { advanceCountdown } from './frame-pacing.ts';
import { stepPlayerDrift } from './player-drift.ts'; import { blockNeonPortal, onNeonRoof, overNeonRoof, supportNeonRoof } from './neon-roof.ts';
export { startRace } from './frame-pacing.ts';
import { assistSteer, meetRail, roadDrift } from './corner-force.ts';
import { prepareEndless, streamEndless } from './endless-highway.ts';
import { earnsAirChain } from './air-chain.ts';
import { createRings, pickupRun, spreadDistances, ITEMS_PER_CAR, RING_RADIUS, RING_FUEL, RING_NITRO, SLIPSTREAM_BOOST, PERFECT_LINE_NITRO, MYSTERY_EFFECTS, EFFECT_TIMES, NITRO_MAX } from './ring-layout.ts';
export { RING_RADIUS, RISK_RING_RADIUS, ITEMS_PER_CAR, RING_FUEL, SLIPSTREAM_BOOST, RISK_SCORE, PERFECT_LINE_NITRO, MYSTERY_EFFECTS, EFFECT_TIMES, NITRO_MAX, NITRO_PICKUPS } from './ring-layout.ts';
import { createCircuit, lapItems, reanchorCircuitPlayer } from './circuit-laps.ts';
import { attachCourse, stepCoursePlayer, carGap, courseGapWarning, courseResetSeat, placeCourseRecovery } from './course-race-step.ts'; import { finishRaceFrame, finishRecoveryFrame } from './race-finish.js';
import { stepRaceWorld } from './race-rivals.js';
import { seededRng, RACE_STREAMS } from './rng.ts';
import { createHazards } from './hazards.ts'; import { crossesRamp, launchImpulse, LAUNCH_MIN_SPEED, SKY_GAP_LAUNCH_MIN_SPEED, SKY_GAP_RECOVERY_RUNUP } from './launch-ramps.ts';
import { stepPlayerHazards } from './hazard-race.ts';
import { contact, resolvePlayerContacts, trackPhaseExit, clearRecoveryContacts } from './player-contacts.js';
import { raceHazards, themedExtras } from './track-themes.ts'; import { mixedCourse, withHoops } from './gauntlet-course.ts';
import { createCheckpointRush, stepCheckpointRush } from './checkpoint-rush.ts';
import { createPracticeStats, samplePractice } from './practice-stats.ts';
import { createStuntAttack, scoreStuntAttack } from './stunt-attack.ts';
import { createElimination } from './elimination.ts';
import { bankItem, mysteryEffect, tickItemCooldown, ringsForItemRule } from './active-items.ts';
export { mysteryEffect } from './active-items.ts';
import { itemHit, ITEM_HIT_SPEED } from './item-attacks.ts';
export { useHeldItem, ITEM_HIT_SPEED as FREEZE_RIVAL_SPEED } from './item-attacks.ts';
import { decorateBonusGates, collectBonusGate, bonusScore } from './bonus-gates.ts';
import { normalizeRaceConfig, trafficMultiplier } from './race-config.ts';
import { RACE_DRIVER_IDS, startingGrid } from './race-grid.ts';
import { raceCompletion } from './race-objectives.ts'; import { riskRules } from './risk-lines.ts'; import { spawnCatchUp } from './catch-up-items.ts';
import { createRaceSessionContract } from './race-session.ts';
import { skyJumpGap, SKY_JUMPS } from './sky-track.ts'; import { startRoadRecovery, advanceRoadRecovery, RESET_BACKTRACK, stepDeck, stepSpan, SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE } from './road-falls.ts';
import { planGapRecovery, clearGapFallStreak } from './gap-recovery-seat.ts';
/** @typedef {import('./game-types.js').RaceSnapshot} RaceSnapshot */

import { RACE_TRACKS, raceTrack, assertTrackMode, itemScale } from './race-tracks.ts';
export { RACE_TRACKS } from './race-tracks.ts';
export const RACE_LENGTH = RACE_TRACKS.coast.length;
import { MAX_SPEED, NITRO_TIME, pressNitro, FLY_DRAIN, GLIDE_FUEL_REGEN, BOOST_CAP_BONUS, NITRO_CAP_BONUS, THROTTLE_ACCEL, BOOST_ACCEL, NITRO_ACCEL, OVER_CAP_DECEL, boostFuel, GROUND_FUEL_REGEN, UPHILL_FUEL_REGEN, DRIFT_MIN_SPEED, DRIFT_BLEED, DRIFT_LATERAL, grantMiniBoost } from './drive-rules.ts';
export { MAX_SPEED, NITRO_TIME, NITRO_EXTEND, FLY_DRAIN, GLIDE_FUEL_REGEN, DRIFT_MIN_SPEED, DRIFT_BLEED, DRIFT_REWARDS, driftTier } from './drive-rules.ts';
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
export const CROSSWIND_SPEED = 4; // m/s sideways push
export const ICE_RAMP_FACTOR = 4; // steering takes this many times longer to respond on ice

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

import { takePickups } from './pickup-take.ts'; export { MAGNET_RANGE } from './pickup-take.ts';

import { SLIPSTREAM_CAP_BONUS, SLIPSTREAM_NITRO, SLIPSTREAM_MIN_GAP, SLIPSTREAM_MAX_GAP,
  SLIPSTREAM_LATERAL, SLIPSTREAM_ALTITUDE, stepSlipstream } from './drive-rules.ts'; // SLIPSTREAM: shared with rivals
export { SLIPSTREAM_TIME, SLIPSTREAM_CAP_BONUS, SLIPSTREAM_NITRO, SLIPSTREAM_LATERAL, SLIPSTREAM_MIN_GAP, SLIPSTREAM_MAX_GAP, SLIPSTREAM_ALTITUDE } from './drive-rules.ts';

import { RIVAL_NITRO_CHARGES, ITEM_RESPAWN } from './rival-items.ts';
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
  const course = mixedCourse(trackId, track, LANES, config), hoopsAt = [...(course?.hoops ?? []), ...(themed?.hoops ?? [])].map(hoop => hoop.distance), rings = decorateBonusGates(ringsForItemRule(withHoops(withHoops(perLap(createRings(track, risk.rings, Math.round(count * (track.ringDensity ?? 1)), seed, hoopsAt), 'ring'), ownLine(course, -2)), ownLine(themed, -3)), config.itemRules), config);
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
      fuel: 100, thrusting: false, exhausted: false, fuelOuts: 0, rewardFuel: 0, pickup: null, collisions: 0, cooldown: 0,
      impact: null, landing: null, steering: 0, railContactSide: 0, boosting: false, braking: false,
      nearMiss: null, nearMisses: 0, combo: 0, scrape: null, scrapeCooldown: 0, flyBuffer: 0,
      poweredFlightTime: 0, flightBoosted: false,
      section: null, inShortcut: false, falls: 0, fall: null, span: false, cornerDrift: 0, cornerX: 0, heading: 0,
      gapFallStreak: /** @type {import('./gap-recovery-seat.ts').GapFallStreak | null} */ (null),
      nitro: 0, nitroTime: 0, nitroHeld: false, nitroUses: 0, nitroBurst: 0, nitroChain: 0, longestCombo: 0,
      slipstream: { time: 0, active: false, paid: false },
      driftHold: /** @type {import('./player-drift.ts').DriftHold | null} */ (null),
      drift: null, driftPayout: null, miniBoost: 0, miniBoostEvent: null, boostTunnelClaimed: [], boostTunnelEvent: null, trick: null, trickPayout: null, flick: null, steerSign: 0,
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
  else if (ring.type === 'slipstream') grantMiniBoost(car, SLIPSTREAM_BOOST, race.elapsed);
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

export { racePosition, sprintGaps } from './race-standings.ts';

function safeRoadDistance(race, distance) {
  for (let i = race.sections.length - 1; i >= 0; i--) {
    const section = race.sections[i];
    if (section.type !== 'gap' || distance < section.from - 4 || distance >= section.to + 4) continue;
    const ramp = race.trackId === 'spiral' && SKY_JUMPS.find(jump => jump.gapFrom === section.from);
    distance = ramp ? ramp.rampFrom - SKY_GAP_RECOVERY_RUNUP : section.from - 72;
  }
  return Math.max(0, distance);
}

export function requestRaceReset(race) {
  const car = race.player;
  if (race.phase !== 'racing' || car.recovery) return false;
  const span = car.span && race.sections.find(section => section.span && car.distance < section.to && car.distance >= section.from);
  const distance = Math.min(car.distance, safeRoadDistance(race, span ? span.from : car.distance - RESET_BACKTRACK));
  const seat = race.course ? courseResetSeat(race.course) : { distance };
  startRoadRecovery(car, seat, car.distance, race.elapsed, GAP_SLOWDOWN, 'reset');
  return true;
}

export function stepRace(race, input, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
  if (race.phase === 'countdown') return advanceCountdown(race, dt);
  if (race.phase !== 'racing') return;
  if (race.player.recovery) {
    race.elapsed += dt;
    const seat = advanceRoadRecovery(race.player, dt);
    if (seat) {
      if (seat.course) placeCourseRecovery(race, seat.course);
      clearRecoveryContacts(race.player); reanchorCircuitPlayer(race);
    }
    if (race.config.activeItems || race.config.bonusGates) tickItemCooldown(race.player, dt);
    for (const name of MYSTERY_EFFECTS) race.player.effects[name] = Math.max(0, race.player.effects[name] - dt);
    stepRaceWorld(race, dt);
    return finishRecoveryFrame(race, dt);
  }
  streamEndless(race); spawnCatchUp(race);
  const car = race.player, wasSlowed = itemHit(race, car) !== null;
  if (car.gapFallStreak) car.gapFallStreak = clearGapFallStreak(car.gapFallStreak, car.distance);
  race.elapsed += dt;
  const hitSpeed = itemHit(race, car) ? ITEM_HIT_SPEED : 1;
  if (wasSlowed && hitSpeed === 1) car.speed /= ITEM_HIT_SPEED; // lift the penalty, preserving braking and impacts
  const previousScore = car.score;
  if (race.config.activeItems || race.config.bonusGates) tickItemCooldown(car, dt);
  const section = race.sections.find(s => car.distance >= s.from && car.distance < s.to);
  car.section = section?.type ?? null; const grounded = car.altitude === 0 || onNeonRoof(race.trackId, car);
  car.inShortcut = car.section === 'shortcut' && Math.abs(car.x - section.x) < SHORTCUT_HALF_WIDTH &&
    Math.abs(car.altitude - section.altitude) < SHORTCUT_TOLERANCE;
  const brake = input.brake === true;
  const throttle = input.throttle === true && !brake;
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  // AIR TRICK reads the raw input sign: the steering ramp would hide a fast flick.
  const steerSign = Math.sign(steer);
  if (car.trick) car.trick.done = (car.trick.time += dt) >= TRICK_ROLL_TIME;
  if (steerSign !== 0 && steerSign !== car.steerSign) { // a fresh press
    if (!grounded && !car.trick && car.flick?.dir === -steerSign && race.elapsed - car.flick.time <= TRICK_FLICK_WINDOW) {
      car.trick = { dir: steerSign, time: 0, done: false };
    }
    car.flick = { dir: steerSign, time: race.elapsed };
  }
  car.steerSign = steerSign;
  const boost = input.boost === true && car.fuel > 0 && !brake;
  car.boosting = boost;
  // NITRO is edge-triggered: one press spends one full charge; a press during NITRO extends it, never stacks speed.
  if (input.nitro === true && !car.nitroHeld && car.nitro >= 1) {
    if (pressNitro(car)) car.nitroBurst = 0;
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
  const driftNitro = stepPlayerDrift(car, brake, steer, dt, race.elapsed, grounded);
  if (driftNitro > 0) addNitro(car, driftNitro);
  // A one-time, on-road tunnel reward. Track it by the authored section start,
  // not a frame counter: pausing, braking or standing inside cannot farm charge.
  if (car.section === 'boost-tunnel' && !car.boostTunnelClaimed.includes(section.from) &&
      car.speed >= 20 && car.altitude < 2.5 && !brake) {
    car.boostTunnelClaimed.push(section.from);
    grantMiniBoost(car, 3.5, race.elapsed);
    addNitro(car, 0.25);
    car.boostTunnelEvent = { time: race.elapsed, distance: car.distance };
  }
  const drifting = car.drift !== null;
  const brakeDecel = brake ? 35 * (car.driftHold?.brakeBlend ?? 1) : 0;
  car.braking = brakeDecel > 0 || drifting;
  const boosted = boost || (car.miniBoost > 0 && !brake); // the mini boost shares the boost cap but burns no fuel
  const baseLimit = nitro ? MAX_SPEED + NITRO_CAP_BONUS : boosted ? MAX_SPEED + BOOST_CAP_BONUS : MAX_SPEED;
  const limit = hitSpeed * (baseLimit + (slip.active ? SLIPSTREAM_CAP_BONUS : 0) + (car.inShortcut ? SHORTCUT_CAP_BONUS : 0));
  const drive = drifting ? -DRIFT_BLEED : (throttle ? THROTTLE_ACCEL : -4) - brakeDecel;
  const acceleration = car.speed > limit ? -OVER_CAP_DECEL - brakeDecel : drive + (boosted ? BOOST_ACCEL : 0) + (nitro ? NITRO_ACCEL : 0);
  car.speed = clamp(car.speed + acceleration * hitSpeed * dt, 0, Math.max(limit, car.speed));
  car.nitroTime = Math.max(0, car.nitroTime - dt);
  car.miniBoost = Math.max(0, car.miniBoost - dt);
  trackPhaseExit(race, dt);
  for (const name of MYSTERY_EFFECTS) car.effects[name] = Math.max(0, car.effects[name] - dt);
  // Linear ramp: full deflection takes STEER_RAMP seconds (longer on ice), like an analog stick.
  const ramp = STEER_RAMP * (car.section === 'ice' ? ICE_RAMP_FACTOR : 1);
  car.steering += clamp(assistSteer(car, steer, input.laneAssist === true) - car.steering, -dt / ramp, dt / ramp);
  let lateralPosition = car.x + car.steering * Math.min(9, car.speed * 0.22) * (drifting ? DRIFT_LATERAL : 1) * dt;
  lateralPosition += roadDrift(race, car, section, drifting, dt);
  const previousX = car.x;
  car.x = meetRail(car, lateralPosition, input.laneAssist === true);
  // Re-arm sustained rail contact only after the car pulls clear.
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
  } else if (!grounded) {
    car.verticalSpeed -= (fly ? 11 : 7) * (car.section === 'low-gravity' ? 0.4 : 1) * dt; // releasing FLY glides; themed low gravity floats
    if (!fly && !boost) car.fuel = Math.min(100, car.fuel + GLIDE_FUEL_REGEN * dt);
  } else if (!flyInput && !boost) {
    car.fuel = Math.min(100, car.fuel + (car.section === 'uphill' ? UPHILL_FUEL_REGEN : GROUND_FUEL_REGEN) * dt);
  }
  car.fuel = boostFuel(race.trackId, car, boost, dt);
  const previousAltitude = car.altitude;
  // Sky Spiral launch ramps impart momentum automatically; FLY can extend the jump.
  if (car.altitude === 0 && ((race.trackId === 'spiral' && car.speed >= SKY_GAP_LAUNCH_MIN_SPEED && car.section === 'launch' &&
      car.distance >= section.to - car.speed * dt - 1) || (car.speed > LAUNCH_MIN_SPEED && crossesRamp(race.ramps, car, car.speed * dt + 1)))) {
    car.altitude = 0.02; // Event Lab ramps share the Spiral impulse
    car.verticalSpeed = Math.max(car.verticalSpeed, launchImpulse(car.speed));
  }
  car.altitude = clamp(car.altitude + car.verticalSpeed * dt, 0, 12);
  const roofHit = car.section === 'tunnel' && !overNeonRoof(race.trackId, car, previousAltitude) && car.altitude + CAR_HEIGHT > TUNNEL_CEILING; // also Neon's portal face; its roof carries cars above
  if (roofHit) {
    car.altitude = TUNNEL_CEILING - CAR_HEIGHT;
    car.verticalSpeed = Math.min(0, car.verticalSpeed);
    car.trick = null;
  }
  if (car.altitude > 0 && !onNeonRoof(race.trackId, car)) car.drift = null; // taking off loses the drift build-up
  const previousDistance = car.distance, previousContacts = car.collisions + car.falls;
  car.distance += car.speed * dt; const portalHit = blockNeonPortal(race.trackId, car, previousDistance), roofLanded = supportNeonRoof(race.trackId, car, previousAltitude);
  const skyGap = race.trackId === 'spiral' && skyJumpGap(car.distance, !!race.endless);
  const gapNow = race.course ? stepCoursePlayer(race, dt, contact) :
    skyGap || (race.trackId !== 'spiral' && race.sections.find(s => s.type === 'gap' && car.distance >= s.from && car.distance < s.to));
  if (gapNow && car.altitude < GAP_CLEARANCE && !(skyGap && car.altitude > 0 && car.verticalSpeed > 0)) {
    const from = skyGap ? skyGap.gapFrom : gapNow.from;
    const approach = skyGap ? skyGap.rampFrom - SKY_GAP_RECOVERY_RUNUP : from - 72;
    const plan = planGapRecovery({ from, to: skyGap ? skyGap.gapTo : gapNow.to }, car.distance,
      safeRoadDistance(race, approach), race.length, car.gapFallStreak);
    car.gapFallStreak = plan.streak;
    startRoadRecovery(car, { distance: plan.distance }, from, race.elapsed, GAP_SLOWDOWN);
    if (car.recovery) car.recovery.assisted = plan.assisted;
  }
  if (!car.recovery) {
    if (!grounded && (car.altitude === 0 || roofLanded)) {
      const chain = earnsAirChain(car, DRIFT_MIN_SPEED) && race.modifier !== 'no-flight';
      car.landing = { speed: Math.abs(car.verticalSpeed), time: race.elapsed, distance: previousDistance, x: car.x, chain };
      if (chain) grantMiniBoost(car, 1.2, race.elapsed);
      car.poweredFlightTime = 0;
      car.flightBoosted = false;
      if (car.trick?.done && car.section !== 'gap') {
        const hard = car.landing.speed >= TRICK_HARD_LANDING;
        if (!hard) addNitro(car, TRICK_NITRO);
        car.trickPayout = { time: race.elapsed, nitro: hard ? 0 : TRICK_NITRO, hard };
      }
      car.trick = null;
    }
    if (car.altitude === 0 || car.altitude === 12 || roofLanded) car.verticalSpeed = 0;
    stepSpan(car, section, race.elapsed, GAP_SLOWDOWN);
    if (!car.recovery) stepDeck(car, section, previousAltitude, CAR_HEIGHT);
  }

  stepRaceWorld(race, dt);
  if (car.recovery) return finishRecoveryFrame(race, dt);
  resolvePlayerContacts(race, previousDistance, previousX, lateralPosition, roofHit || portalHit, section, nitro);
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
  takePickups(race, car, previousDistance, addNitro);
  let rowTaken = NaN; // a ring row pays once per car
  for (const ring of race.rings) { // sorted by distance
    if (ring.distance > car.distance) break;
    // shortcut: tests the car's end-of-step x/altitude, not the interpolated crossing (error < 0.7 m at dt 0.1), upgrade if risk rings feel unfair
    if (ring.hit || ring.downUntil > race.elapsed || ring.distance <= previousDistance || (ring.row && ring.distance === rowTaken) || Math.hypot(ring.x - car.x, ring.altitude - car.altitude) >= ring.radius) continue;
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
  if (car.altitude > 0 && !onNeonRoof(race.trackId, car) && car.speed >= 18) car.score += dt * 10;
  if (race.checkpoint) {
    car.score += stepCheckpointRush(race.checkpoint, previousDistance, car, dt);
  }
  if (race.practice) samplePractice(race.practice, car, Math.max(0, Math.min(car.distance, race.length) - previousDistance), dt);
  if (race.styleAttack) car.score += scoreStuntAttack(race.styleAttack, car, car.score - previousScore, dt, race.elapsed);
  car.score += bonusScore(car, race.mode, car.score - previousScore);
  finishRaceFrame(race, previousDistance, dt);
}

// The next broken bridge within warning range when the charge left cannot thrust across it at the current speed.
export function gapChargeWarning(race) {
  if (race.player.recovery) return null;
  if (race.course) return courseGapWarning(race); if (race.trackId === 'spiral') return null; // its launch ramps throw the car across
  const car = race.player;
  const gap = race.sections.find(s => s.type === 'gap' && s.to > car.distance && s.from - car.distance <= GAP_WARN_DISTANCE);
  if (!gap) return null;
  const need = FLY_DRAIN * (gap.to - Math.max(car.distance, gap.from)) / Math.max(car.speed, 18) + (car.altitude >= GAP_CLEARANCE ? 0 : GAP_LIFT_RESERVE);
  return car.fuel < need ? { from: gap.from, need } : null;
}
