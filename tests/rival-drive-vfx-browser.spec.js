import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { pausedRace } from './helpers/traffic-browser.js';
import { onTier, serveBefore, stage } from './helpers/rival-drive-browser.js';

// Rival NITRO/BOOST drive cues (src/rival-drive-vfx.ts) in the real race scene. BEFORE=<git ref> serves that ref's
// module (RED check). Captures and frame cost: tests/rival-drive-vfx-evidence-browser.spec.js.
test.describe('rival drive cues', () => {
  test('High: BOOST draws a smaller, dimmer NITRO flame near the player, none beyond the cue range', async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(90000));
    await serveBefore(page);
    await pausedRace(page, gameplayURL, 'coast');
    const [boost, nitro, far] = await stage(page);
    expect(nitro).toMatchObject({ flame: true, trail: true });
    expect(boost).toMatchObject({ flame: true, trail: false });
    expect(boost.scale).toBeLessThan(nitro.scale * 0.8);
    expect(boost.opacity).toBeLessThan(nitro.opacity);
    expect(far.flame).toBe(false);
  });
  test('Low: BOOST keeps the tail light only, no flame', async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(90000));
    await serveBefore(page);
    await onTier(page, 'low');
    await pausedRace(page, gameplayURL, 'coast');
    const [boost, nitro] = await stage(page);
    expect(boost.flame).toBe(false); expect(nitro.flame).toBe(false);
  });
});
