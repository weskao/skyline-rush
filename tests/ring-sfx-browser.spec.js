import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Real Web Audio output (analyser on the destination), real ring collection by the game loop.
const measureAudio = () => {
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    if (destination instanceof AudioDestinationNode) {
      const analyser = this.context.createAnalyser();
      connect.call(this, analyser);
      window.audioLevel = () => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        return Math.max(...data.map(Math.abs)); // peak: a chime is short, RMS over the window would hide it
      };
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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(measureAudio);
    await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
    await page.reload();
    await page.getByRole('button', { name: 'Start race', exact: true }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
    const result = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const peaks = [];
      const sample = setInterval(() => peaks.push(window.audioLevel?.() ?? 0), 8);
      const race = () => window.gameplay.race;
      const rings = race().rings.filter(ring => !ring.row).slice(0, 6);
      await wait(600);
      const bed = Math.max(...peaks);
      peaks.length = 0;
      const solo = async make => { peaks.length = 0; make(); await wait(500); return Math.max(...peaks); };
      const pickup = await solo(() => { race().pickups.find(item => !item.taken).taken = true; });
      const single = {};
      for (const type of ['charge', 'nitro', 'slipstream', 'risk', 'mystery']) {
        const ring = race().rings.find(item => item.type === type && !item.hit);
        single[type] = ring ? await solo(() => { ring.hit = true; }) : null;
      }
      peaks.length = 0;
      let taken = 0;
      for (const ring of rings) {
        Object.assign(race().player, { distance: ring.distance - 0.2, x: ring.x, altitude: ring.altitude, speed: 50 });
        for (let i = 0; i < 200 && !ring.hit; i++) await wait(10);
        taken += ring.hit ? 1 : 0;
        await wait(250);
      }
      await wait(500);
      clearInterval(sample);
      return { bed, pickup, single, train: Math.max(...peaks), taken };
    });
    expect(result.taken).toBe(6);
    for (const [type, peak] of Object.entries(result.single)) {
      if (peak === null) continue; // this seed laid no ring of that type
      expect(peak, `${type} rises above the engine bed`).toBeGreaterThan(result.bed);
      expect(peak, `${type} is no louder than the NITRO pickup`).toBeLessThan(result.pickup * 1.25);
    }
    expect(result.train).toBeGreaterThan(result.bed);
    expect(result.train, 'a quick train stays under the limiter threshold (-12 dB)').toBeLessThan(0.25);
    expect(errors).toEqual([]);
  });
});
