import { test as base } from './test.js';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Inspect the real scene and seed distant scenarios without shipping test hooks in the app.
export const test = base.extend({
  gameplayURL: [async ({}, use) => {
    const server = await createServer({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      server: { host: '127.0.0.1', port: 0 },
    });
    try {
      await server.listen();
      await use(server.resolvedUrls.local[0]);
    } finally { await server.close(); }
  }, { scope: 'worker' }],
  // A number pins every app race's ring/pickup layout to that seed instead of re-rolling it (race-factory.ts).
  layoutSeed: [null, { option: true }],
  gameplayPage: async ({ page, gameplayURL, layoutSeed }, use) => {
    for (const [file, anchor, replacement] of [
      ['main.js', 'let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };'],
      ['world.js', 'scene.add(player);', 'scene.add(player); window.gameScene = { scene, player, renderer, camera, composer };'],
      // A regex: Vite's TypeScript transform reprints the call.
      ...(Number.isInteger(layoutSeed) ? [['race-factory.ts', /setLayoutSeed\(\(\) =>[^;\n]*\);/, `setLayoutSeed(() => ${layoutSeed});`]] : []),
    ]) await page.route(`**/src/${file}`, async route => {
      const response = await route.fetch();
      const source = await response.text();
      if (typeof anchor === 'string' ? !source.includes(anchor) : !anchor.test(source)) throw new Error(`Missing capture anchor in ${file}`);
      await route.fulfill({ response, body: source.replace(anchor, replacement) });
    });
    await page.goto(gameplayURL);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await use(page);
  },
});
