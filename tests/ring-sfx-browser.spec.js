import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Real Web Audio, real ring collection by the game loop. Two meters:
// - mix: an analyser on the destination, for the engine bed the chimes must rise above;
// - cues: a tap on every sine cue envelope that feeds the master bus (pickup, ring chimes, GO), scaled by the master
//   gain. The engine is a sawtooth through a filter and wind/thrust are noise, so the tap hears cues alone: the race
//   that keeps driving cannot lift a chime's level, and its ~0.7 s buffer outlasts a main-thread stall on a slow
//   CI runner, so a short chime never slips between two reads.
const measureAudio = () => {
  const connect = AudioNode.prototype.connect;
  const meter = (context, fftSize) => {
    const analyser = context.createAnalyser(), data = new Float32Array(fftSize);
    analyser.fftSize = fftSize;
    return { analyser, level: () => {
      analyser.getFloatTimeDomainData(data);
      let peak = 0; // peak: a chime is short, RMS over the window would hide it
      for (const value of data) peak = Math.max(peak, Math.abs(value));
      return peak;
    } };
  };
  const sineFed = new WeakSet();
  let master = null, cues = null;
  // A fresh tap hears only the cues that start after the reset, not ones already ringing.
  window.cueReset = () => { cues = null; };
  window.cueLevel = () => (cues?.level() ?? 0) * (master?.gain.value ?? 0);
  window.cueWindowMs = () => 32768 / (master?.context.sampleRate ?? 48000) * 1000; // what the cue tap still holds
  AudioNode.prototype.connect = function(destination, ...args) {
    if (destination instanceof AudioDestinationNode) {
      const mix = meter(this.context, 2048);
      connect.call(this, mix.analyser);
      window.audioLevel = mix.level;
    }
    if (this instanceof GainNode && destination instanceof DynamicsCompressorNode && master?.context !== this.context) master = this; // master is wired to the limiter first
    if (this instanceof OscillatorNode && this.type === 'sine' && destination instanceof GainNode) sineFed.add(destination);
    if (this instanceof GainNode && destination === master && sineFed.has(this)) { // music voices feed the music bus instead
      cues ??= meter(this.context, 32768);
      connect.call(this, cues.analyser);
    }
    return connect.call(this, destination, ...args);
  };
};

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`ring collect sounds ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('every ring type is audible at about the pickup level and a 6-ring train stays under the limiter', async ({ gameplayPage: page }) => {
    // 30 timed solo rounds of real audio: passing CI runs took 55-90 s of the 135 s default, and ~110 s with 300 ms
    // frames, so the budget left no room for a slower runner (.claude/rules/browser-test-stability.md).
    test.setTimeout(ciTimeout(75000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(measureAudio);
    await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
    await page.reload();
    await page.getByRole('button', { name: 'Start race', exact: true }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
    const result = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const median = values => values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : null;
      const frame = () => new Promise(requestAnimationFrame); // resolves after the game's own frame (registered first)
      const race = () => window.gameplay.race;
      await wait(1000); // let the GO cue fade out of the cue buffer
      const beds = [];
      for (let i = 0; i < 12; i++) { beds.push(window.audioLevel?.() ?? 0); await wait(50); }
      const bed = median(beds);
      // One read 250 ms after the cue covers its every note (the latest ends 220 ms in). The cue sounds on the next game
      // frame, which a CPU-only runner can start 300 ms later, so the clock starts after that frame. A read that a stall
      // pushed past the tap's buffer (~680 ms at 48 kHz) may have lost the cue, so that round is dropped, not judged.
      const solo = async make => {
        await wait(300);
        window.cueReset();
        make(); await frame();
        const start = performance.now();
        await wait(250);
        const peak = window.cueLevel?.() ?? 0;
        return performance.now() - start < window.cueWindowMs() - 20 ? peak : null;
      };
      // The live race can add its own cue (a rival's pickup, a near miss) to a window, or a loaded runner can drop
      // one: the median of five rounds is the chime alone.
      const types = ['pickup', 'charge', 'nitro', 'slipstream', 'risk', 'mystery'];
      const rounds = Object.fromEntries(types.map(type => [type, []]));
      for (let round = 0; round < 5; round++) for (const type of types) {
        const item = type === 'pickup' ? race().pickups.find(pickup => !pickup.taken) : race().rings.find(ring => ring.type === type && !ring.hit);
        const peak = item ? await solo(() => { item[type === 'pickup' ? 'taken' : 'hit'] = true; }) : null;
        if (peak !== null) rounds[type].push(peak);
      }
      const level = Object.fromEntries(types.map(type => [type, median(rounds[type])]));
      // The train runs ahead of every car. The first rings lie behind the field by now (the player has driven on), where
      // a rival steps first and takes the ring (src/game.js) or a car in the pack knocks the player off it (CI
      // 42489399352). GHOST (game seconds) lets the player pass through traffic.
      const lead = Math.max(...[race().player, ...race().rivals].map(car => car.distance));
      const rings = race().rings.filter(ring => !ring.row && !ring.hit && ring.distance > lead + 300).slice(0, 6);
      race().player.effects.ghost = 30;
      await wait(300);
      window.cueReset();
      const peaks = [];
      const sample = setInterval(() => peaks.push(window.cueLevel?.() ?? 0), 100);
      let taken = 0;
      const missed = [];
      for (const ring of rings) {
        Object.assign(race().player, { distance: ring.distance - 0.2, x: ring.x, altitude: ring.altitude, speed: 50 });
        // One game step decides it: the car collects the ring or passes it. Wait per frame, bounded by race time, never
        // by a count of wall-clock sleeps: a CPU-only runner stretches each sleep to a ~300 ms frame.
        const until = race().elapsed + 1;
        while (!ring.hit && race().player.distance <= ring.distance && race().elapsed < until) await frame();
        if (ring.hit) taken++;
        else missed.push({ ring: { distance: ring.distance, x: ring.x, altitude: ring.altitude }, player: (({ distance, x, altitude, speed }) => ({ distance, x, altitude, speed }))(race().player) });
        await wait(250);
      }
      await wait(500);
      clearInterval(sample);
      return { bed, level, train: Math.max(...peaks), taken, missed, size: rings.length };
    });
    expect(result.taken, JSON.stringify({ size: result.size, missed: result.missed })).toBe(6);
    const { pickup, ...single } = result.level;
    expect(pickup, 'every pickup round was cut short by a stall').not.toBeNull();
    for (const [type, peak] of Object.entries(single)) {
      if (peak === null) continue; // this seed laid no ring of that type
      // The chime alone, a bright sine, against the peak of the full engine mix (sawtooth + noise): within 6 dB keeps
      // it clear of the engine's low rumble.
      expect(peak, `${type} stays within 6 dB of the engine bed`).toBeGreaterThan(result.bed / 2);
      expect(peak, `${type} is no louder than the NITRO pickup`).toBeLessThan(pickup * 1.25);
    }
    expect(result.train).toBeGreaterThan(result.bed / 2);
    expect(result.train, 'a quick train stays under the limiter threshold (-12 dB)').toBeLessThan(0.25);
    expect(errors).toEqual([]);
  });
});
