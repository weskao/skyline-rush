import { test as base } from './test.js';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Inspect the real scene and seed distant scenarios without shipping test hooks in the app.
export const test = base.extend({
  // `make dev-unlocked`'s module alias (src/access/dev-unlocked.ts): enters gated Coming Soon runtimes.
  unlockedAccess: [false, { option: true, scope: 'worker' }],
  gameplayURL: [async ({ unlockedAccess }, use) => {
    const server = await createServer({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      ...(unlockedAccess && { configFile: fileURLToPath(new URL('../../vite.unlocked.config.js', import.meta.url)) }),
      server: { host: '127.0.0.1', port: 0 },
    });
    try {
      await server.listen();
      await use(server.resolvedUrls.local[0]);
    } finally { await server.close(); }
  }, { scope: 'worker' }],
  gameplayPage: async ({ page, gameplayURL }, use) => {
    for (const [file, anchor, replacement] of [
      ['main.js', 'let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };'],
      ['world.js', 'scene.add(player);', 'scene.add(player); window.gameScene = { scene, player, renderer, camera, composer };'],
    ]) await page.route(`**/src/${file}`, async route => {
      const response = await route.fetch();
      const source = await response.text();
      if (!source.includes(anchor)) throw new Error(`Missing capture anchor in ${file}`);
      await route.fulfill({ response, body: source.replace(anchor, replacement) });
    });
    await page.goto(gameplayURL);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await use(page);
  },
});
