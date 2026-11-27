import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Scene } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { CAR_STYLES, makeCar } from '../src/car-model.js';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';
import { skinVfxPalette } from '../src/garage-skin-palette.ts';
import { gold } from '../src/effects-palette.ts';
import { MAX_SPEED } from '../src/drive-rules.ts';
import { RACE_CAMERA, rigBack, rigFov, rigHeight, rigLook } from '../src/race-camera.ts';
import {
  SPARK_GRAVITY, SPARK_LIFE, SPARK_PEAK, SPARK_RATE, SPARKS_PER_FRAME, createSparkBatch, nitroSparks, sparkBudget, sparkColor,
} from '../src/nitro-sparks.ts';

// 2026-11-20: the NITRO trail had no particles at all, so it read as a smooth light cone with no combustion or speed.
const TIERS = ['low', 'medium', 'high'];
const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const POOL = Number(source('effects.js').match(/const COUNT = (\d+)/)[1]);
const seeded = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-4, `${message}: ${a} vs ${b}`);

/** Holds NITRO for `seconds` at `fps`; returns every emitted spark with its birth time. */
function hold(quality, { seconds = 1, fps = 60, chain = 1, power = 1, calm = false, random = seeded(), batch = createSparkBatch() } = {}) {
  const born = [];
  let peakFrame = 0;
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) {
    nitroSparks(batch, power, quality, 1 / fps, calm, chain, random);
    peakFrame = Math.max(peakFrame, batch.count);
    for (let i = 0; i < batch.count; i++) born.push({ ...batch.sparks[i], at: frame / fps });
  }
  return { born, peakFrame, batch };
}

test('a held NITRO throws sparks from every rear port, fewer on Medium and Low', () => {
  const counts = TIERS.map(tier => {
    const { born } = hold(tier);
    assert.ok(Math.abs(born.length - SPARK_RATE[tier]) <= 1, `${tier}: ${born.length} sparks in one second`);
    assert.deepEqual([...new Set(born.map(spark => spark.port))].sort(), REAR_PORTS.map((_, port) => port), `${tier}: every port`);
    return born.length;
  });
  assert.ok(counts[0] > 0 && counts[0] < counts[1] && counts[1] < counts[2], `low < medium < high: ${counts}`);
});

test('no sparks without NITRO, in Reduced Motion or in Comfortable mode', () => {
  assert.equal(hold('high', { power: 0 }).born.length, 0);
  const calm = hold('high', { calm: true });
  assert.equal(calm.born.length, 0);
  nitroSparks(calm.batch, 1, 'high', 1 / 60, false, 1, seeded());
  assert.ok(calm.batch.count <= 1, 'a calm stretch stores no burst for later');
});

test('the spark budget cannot starve the shared particle pool', () => {
  for (const tier of TIERS) {
    assert.ok(sparkBudget(tier) <= POOL * 0.06, `${tier}: ${sparkBudget(tier)} of ${POOL} slots`);
    // Worst case: longest chain, more power than exists, smooth and stalling frame rates.
    for (const fps of [120, 60, 30, 4]) {
      const { born, peakFrame } = hold(tier, { seconds: 6, fps, chain: 3, power: 5 });
      assert.ok(peakFrame <= SPARKS_PER_FRAME, `${tier} @${fps}: ${peakFrame} in one frame`);
      for (const spark of born) {
        const alive = born.filter(other => other.at <= spark.at && other.at + other.life > spark.at).length;
        assert.ok(alive <= sparkBudget(tier), `${tier} @${fps}: ${alive} alive, budget ${sparkBudget(tier)}`);
        // The pool is a ring: what counts for the other effects is how many slots sparks take per second.
        const second = born.filter(other => other.at >= spark.at && other.at < spark.at + 1).length;
        assert.ok(second <= SPARK_RATE[tier] + SPARKS_PER_FRAME, `${tier} @${fps}: ${second} emitted in one second`);
      }
    }
  }
  assert.ok(SPARK_RATE.high + SPARKS_PER_FRAME <= POOL * 0.11, 'High takes at most 11% of the ring per second');
});

test('each spark is small, short-lived and thrown back along the road', () => {
  const { born } = hold('high', { seconds: 20 });
  for (const spark of born) {
    assert.ok(spark.size > 0 && spark.size <= 0.15, `size ${spark.size}`);
    assert.ok(spark.life >= 0.15 && spark.life <= SPARK_LIFE, `life ${spark.life}`);
    assert.ok(spark.back >= 2, `leaves the nozzle at ${spark.back} m/s`);
    assert.ok(spark.back * spark.life >= 0.4, 'travels clear of the nozzle');
    assert.ok(Math.abs(spark.side) >= 2 && Math.abs(spark.side) <= 5 && spark.up > 0 && spark.up <= 4, `spread ${spark.side}, ${spark.up}`);
    // The plume is additive and washes out a spark that stays inside it: each port throws to its own side, off the jets.
    assert.equal(Math.sign(spark.side), Math.sign(REAR_PORTS[spark.port].position[0]), 'fans outward');
  }
  assert.ok(born.some(spark => Math.abs(spark.side) * spark.life > 0.7), 'some reach the dark road beside the car');
  assert.ok(new Set(born.map(spark => Math.sign(spark.side))).size === 2, 'both sides');
});

// 2026-11-20: the first sparks left at 12 to 24 m/s. The NITRO chase eye sits under 4 m behind the nozzles, so they
// passed the lens within 0.2 s: every unit test was green and a real race showed no sparks at all.
test('a spark spends its whole life in front of the chase camera, inside the frame, in landscape and portrait', () => {
  const sparks = [1, 2, 3].flatMap(chain => hold('high', { seconds: 6, chain }).born);
  for (const [name, aspect] of [['chase', 844 / 390], ['chasePortrait', 390 / 844]]) {
    const view = RACE_CAMERA[name];
    // Slow to NITRO top speed, times the player's Camera FOV setting (0 to 14 degrees): the dolly moves the eye in.
    for (const speed of [40, MAX_SPEED, 120]) for (const setting of [0, 7, 14]) {
      const fov = rigFov(view, speed) + setting, eyeZ = rigBack(view, fov), eyeY = rigHeight(view, 0);
      const dy = rigLook(view, fov, 1) - eyeY, dz = -(view.ahead + eyeZ), length = Math.hypot(dy, dz), tan = Math.tan(fov * Math.PI / 360);
      for (const spark of sparks) for (let step = 0; step <= 8; step++) {
        const t = spark.life * step / 8, [px, py, pz] = REAR_PORTS[spark.port].position;
        const x = px + spark.side * t, y = py + spark.up * t - SPARK_GRAVITY * t * t / 2 - eyeY, z = pz + spark.back * t - eyeZ;
        const depth = (y * dy + z * dz) / length, rise = (z * dy - y * dz) / length, at = `${name} ${speed} m/s +${setting}: t ${t.toFixed(2)}`;
        assert.ok(depth >= 1.5, `${at}: ${depth.toFixed(2)} m from the lens`);
        // Drawn size in device pixels (PARTICLE_VERTEX, pixel ratio 1.5, growing 0.9 per second): a speck, never a blob.
        // 32 px is 16 CSS px on a 2x phone; the largest (28.6, longest chain, widest FOV) is at the faded end of a life.
        const drawn = spark.size * (1 + t * 0.9) * 220 * 1.5 / depth;
        assert.ok(drawn <= 32 && (name !== 'chase' || step || drawn >= 5.5), `${at}: ${drawn.toFixed(1)} px`);
        assert.ok(Math.abs(rise / (depth * tan)) <= 1 && Math.abs(x / (depth * tan * aspect)) <= 1,
          `${at}: off the frame at ${(x / (depth * tan * aspect)).toFixed(2)}, ${(rise / (depth * tan)).toFixed(2)}`);
      }
    }
  }
});

test('chained NITRO adds speed and reach, never count, size or brightness', () => {
  const single = hold('high', { seconds: 4, chain: 1 }).born, triple = hold('high', { seconds: 4, chain: 3 }).born;
  assert.equal(triple.length, single.length);
  triple.forEach((spark, i) => {
    assert.equal(spark.size, single[i].size);
    assert.ok(spark.back > single[i].back, 'faster');
    assert.ok(spark.life >= single[i].life && spark.back * spark.life > single[i].back * single[i].life, 'reaches further');
  });
  assert.doesNotMatch(source('nitro-sparks.ts'), /chain[^;\n]*(opacity|color|size)|(opacity|color|size)[^;\n]*chain/i);
});

test('sparks take the trail skin colour, NITRO gold without one, capped like the trail', () => {
  const tone = (rgb, base, label) => {
    close(Math.max(...rgb), SPARK_PEAK, `${label} peak`);
    rgb.forEach((value, i) => close(value / SPARK_PEAK, base[i] / Math.max(...base), `${label} hue`));
  };
  tone(sparkColor(), gold, 'no skin');
  tone(sparkColor({ 'drift-trail': 'drift-trail-flame' }), gold, 'another category');
  const trails = GARAGE_SKINS.filter(skin => skin.category === 'nitro-trail');
  assert.ok(trails.length >= 4);
  for (const { id } of trails) {
    const palette = skinVfxPalette({ 'nitro-trail': id })['nitro-trail'];
    tone(sparkColor({ 'nitro-trail': id }), palette.some(value => value !== 1) ? palette : gold, id); // the standard trail is untinted
  }
  assert.equal(SPARK_PEAK, 1.2); // the trail's colour cap (.claude/rules/nitro-trail-vfx.md)
  assert.doesNotMatch(source('nitro-sparks.ts'), /\[\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\]/, 'no colour table of its own');
});

test('a frame reuses its batch: no allocation while NITRO burns', () => {
  const batch = createSparkBatch(), slots = [...batch.sparks];
  assert.equal(slots.length, SPARKS_PER_FRAME);
  for (let frame = 0; frame < 240; frame++) assert.equal(nitroSparks(batch, 1, 'high', 1 / 30, false, 2, seeded(frame + 1)), batch);
  assert.equal(batch.sparks.length, SPARKS_PER_FRAME);
  batch.sparks.forEach((spark, i) => assert.equal(spark, slots[i]));
});

function raceScene(t, { moved = [0, 0, 0] } = {}) {
  // effects.js feeds the sparks Math.random; one seeded stream per scene keeps tier counts comparable (CI saw 4, 4, 12).
  t.mock.method(Math, 'random', seeded());
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), car = makeCar(CAR_STYLES.roadster), race = createRace();
  const rear = new Group(); // aero-vfx.js's group; garage-model.ts moves it onto a dressed GLB's nozzles
  rear.name = 'Rear ports'; rear.position.fromArray(moved); car.add(rear); scene.add(car);
  const effects = createEffects(scene, () => 0, { player: car });
  Object.assign(race, { phase: 'racing', pickups: [], rings: [] });
  Object.assign(race.player, { speed: 80, nitroTime: 30, nitroBurst: 1 });
  const { position, color, alpha, kind } = scene.children.find(object => object.isPoints).geometry.attributes;
  /** Live pool particles in `rgb`, as scene positions. */
  const live = rgb => [...alpha.array].flatMap((a, i) => a > 0 && kind.array[i] === 0
    && rgb.every((value, c) => Math.abs(color.array[i * 3 + c] - value) < 1e-4) ? [[...position.array.slice(i * 3, i * 3 + 3)]] : []);
  const run = (frames, options = {}, reducedMotion = false) => {
    for (let i = 0; i < frames; i++) {
      race.player.distance += race.player.speed / 60;
      effects.update(race, 1 / 60, 0, false, reducedMotion, [car], options);
    }
  };
  return { effects, race, live, run };
}

test('the race draws the sparks in the shared pool, starting at the rear ports wherever a car carries them', t => {
  for (const moved of [[0, 0, 0], [0.1, 0.2, 0.3]]) {
    const { live, run } = raceScene(t, { moved }), rgb = sparkColor();
    for (let frame = 0; frame < 60 && !live(rgb).length; frame++) run(1);
    const [first] = live(rgb);
    assert.ok(first, 'a spark within one second');
    const port = REAR_PORTS.find(({ position }) => Math.abs(position[0] + moved[0] - first[0]) < 1e-3);
    assert.ok(port, `starts at a port's x: ${first}`);
    close(first[1], port.position[1] + moved[1], 'port height');
    close(first[2], port.position[2] + moved[2], 'port depth');
    run(3);
    assert.ok(live(rgb).some(([, , z]) => z > port.position[2] + moved[2] + 0.1), 'then falls behind the car');
    run(120);
    const sparks = live(rgb);
    assert.ok(sparks.length >= 8 && sparks.length <= sparkBudget('high'), `${sparks.length} sparks alive on High`);
    assert.ok(sparks.every(([, , z]) => z > 2), 'none ahead of the nozzles');
    assert.ok(new Set(sparks.map(([x]) => Math.sign(x))).size === 2, 'both sides of the car');
  }
});

test('the race shows no sparks with VFX off, in calm modes or without NITRO, and fewer on Low', t => {
  const rgb = sparkColor();
  const alive = (options, reducedMotion, nitroTime = 30) => {
    const { race, live, run } = raceScene(t);
    race.player.nitroTime = nitroTime;
    run(90, options, reducedMotion);
    return live(rgb).length;
  };
  assert.equal(alive({ enabled: false }, false), 0, 'VFX off');
  assert.equal(alive({}, true), 0, 'Reduced Motion / Comfortable');
  assert.equal(alive({}, false, 0), 0, 'no NITRO');
  const low = alive({ quality: 'low' }, false), medium = alive({ quality: 'medium' }, false), high = alive({ quality: 'high' }, false);
  assert.ok(low > 0 && low < medium && medium < high, `low < medium < high: ${low}, ${medium}, ${high}`);
});

test('an equipped trail skin recolours the sparks', t => {
  const { effects, live, run } = raceScene(t), cyan = { 'nitro-trail': 'nitro-trail-cyan' };
  effects.setNitroTrail(cyan);
  run(60);
  assert.ok(live(sparkColor(cyan)).length > 0);
  assert.equal(live(sparkColor()).length, 0);
  assert.match(source('world.js'), /effects\.setNitroTrail\(ids\)/, 'the world passes the equipped skins on');
});

test('sparks add no mesh, material or draw call, and effects.js holds only the call', () => {
  assert.doesNotMatch(source('nitro-sparks.ts'), /from 'three'|Mesh|Material|Points|BufferGeometry/);
  const effects = source('effects.js');
  assert.match(effects, /createNitroSparks\(emit\)/);
  assert.equal(effects.match(/nitroSparks\./g).length, 2, 'one skin setter and one per-frame call');
});
