import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID, FROSTBITE_TRACK } from '../src/courses/frostbite-race.ts';
import { createRace, stepRace, CAR_HEIGHT, RACE_TRACKS, SHORTCUT_TOLERANCE, SHORTCUT_HALF_WIDTH } from '../src/game.js';
import { DECK_DEPTH } from '../src/road-falls.ts';

// Frostbite's glacier ridge and aurora span decks are solid: no car body ever sits inside the slab.
const decks = FROSTBITE_TRACK.sections.filter(s => s.type === 'shortcut' && !s.span);
const slab = s => ({ top: s.altitude - SHORTCUT_TOLERANCE, under: s.altitude - SHORTCUT_TOLERANCE - DECK_DEPTH });

function at(trackId, section, player) {
  const race = createRace(trackId);
  race.phase = 'racing'; race.traffic = []; race.pickups = []; race.rings = [];
  Object.assign(race.player, { distance: section.from + 30, x: section.x, speed: 50, verticalSpeed: 0 }, player);
  return race;
}
/** Steps `seconds` at `hz`, returning the lowest/highest altitude seen while over the deck's footprint. */
function fly(race, section, input, seconds, hz) {
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < seconds * hz; i++) {
    stepRace(race, input, 1 / hz);
    const p = race.player;
    if (p.distance < section.to - 1 && Math.abs(p.x - section.x) < SHORTCUT_HALF_WIDTH) { low = Math.min(low, p.altitude); high = Math.max(high, p.altitude); }
  }
  return { low, high };
}

test('glacier ridge and aurora span are the solid decks; the Rift stays a span and classic shortcuts stay open', () => {
  assert.equal(decks.length, 2);
  assert.ok(decks.every(s => s.deck === true));
  assert.ok(FROSTBITE_TRACK.sections.filter(s => s.span).every(s => !s.deck));
  for (const [id, track] of Object.entries(RACE_TRACKS)) assert.ok(track.sections.every(s => !s.deck), id);
  assert.ok(DECK_DEPTH > 0);
});

for (const hz of [30, 60, 120]) {
  test(`a car flying up under a deck stops with its roof at the underside (${hz} Hz)`, () => {
    for (const section of decks) {
      const race = at(FROSTBITE_ID, section, { altitude: .5 });
      const { high } = fly(race, section, { fly: true, throttle: true }, 2.5, hz);
      assert.ok(high + CAR_HEIGHT <= slab(section).under + 1e-9, `roof ${(high + CAR_HEIGHT).toFixed(2)} > underside ${slab(section).under}`);
      assert.ok(high + CAR_HEIGHT > slab(section).under - .05, 'it reaches the ceiling (the test really flew up)');
    }
  });

  test(`a car sinking onto a deck rests on its top instead of falling through (${hz} Hz)`, () => {
    for (const section of decks) {
      const race = at(FROSTBITE_ID, section, { altitude: section.altitude });
      const { low } = fly(race, section, { throttle: true }, 3, hz);
      assert.ok(low >= slab(section).top - 1e-9, `fell to ${low.toFixed(2)} through the deck top ${slab(section).top}`);
    }
  });
}

test('beside a deck, or on a classic track shortcut, the car still rises freely through the deck height', () => {
  const [glacier] = decks;
  const beside = at(FROSTBITE_ID, glacier, { altitude: .5, x: glacier.x + Math.sign(-glacier.x) * (SHORTCUT_HALF_WIDTH + 1.5) });
  for (let i = 0; i < 150; i++) stepRace(beside, { fly: true }, 1 / 60);
  assert.ok(beside.player.altitude > slab(glacier).top, `beside: ${beside.player.altitude}`);
  const coast = RACE_TRACKS.coast.sections.find(s => s.type === 'shortcut');
  const classic = at('coast', coast, { altitude: .5 });
  for (let i = 0; i < 150; i++) stepRace(classic, { fly: true }, 1 / 60);
  assert.ok(classic.player.altitude > slab(coast).top, `coast: ${classic.player.altitude}`);
});
