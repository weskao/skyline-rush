import { test as base } from './test.js';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Inspect the real scene and seed distant scenarios without shipping test hooks in the app.
export async function captureHooks(page) {
  for (const [file, anchor, replacement] of [
    ['main.js', 'let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };'],
    ['world.js', 'scene.add(player);', 'scene.add(player); window.gameScene = { scene, player, renderer, camera, composer };'],
  ]) await page.route(`**/src/${file}`, async route => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes(anchor)) throw new Error(`Missing capture anchor in ${file}`);
    await route.fulfill({ response, body: source.replace(anchor, replacement) });
  });
}

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
    await captureHooks(page);
    await page.goto(gameplayURL);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await use(page);
  },
});

// `?model=roadster` (Task 4b): GLB roots in the main Home/race scene (Coming Soon and Garage stages have their own scenes),
// compiled shader programs, and the hosts currently dressed (`#world[data-garage-model-instances]`).
export const glbRoots = page => page.evaluate(() => { let n = 0; window.gameScene.scene.traverse(o => { if (o.userData.garageModel) n++; }); return n; });
export const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);
export const modelInstances = async page => JSON.parse((await page.locator('#world').getAttribute('data-garage-model-instances')) ?? '{}');
