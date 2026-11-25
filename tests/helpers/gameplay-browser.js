import { seedGtCareer } from './gt-progress.js';
import { test as base, markStartupSeen } from './test.js';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { CARS } from '../../src/car-catalog.ts';

// Inspect the real scene and seed distant scenarios without shipping test hooks in the app.
export async function captureHooks(page, mainEdits = []) {
  await markStartupSeen(page);
  for (const [file, anchor, replacement] of [
    ['main.js', 'let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };'],
    ['world.js', 'scene.add(player);', 'scene.add(player); window.gameScene = { scene, player, renderer, camera, composer, get rivals() { return rivals; } };'],
  ]) await page.route(url => url.pathname === `/src/${file}`, async route => {
    const response = await route.fetch();
    let source = await response.text();
    for (const [from, to] of [[anchor, replacement], ...(file === 'main.js' ? mainEdits : [])]) {
      if (source.split(from).length !== 2) throw new Error(`Missing or repeated capture anchor in ${file}: ${from}`);
      source = source.replace(from, to);
    }
    await route.fulfill({ response, body: source });
  });
}

/**
 * Records the pathnames matching `pattern` requested from the next navigation on. gameplayPage has already loaded the
 * game once (no saved car: the Roadster) and that page keeps fetching lazily, so leave it first or its late
 * roadster2.glb lands in the count (.claude/rules/browser-test-stability.md).
 */
export async function watchRequests(page, pattern) {
  await page.goto('about:blank');
  const seen = [];
  page.on('request', request => { const { pathname } = new URL(request.url()); if (pattern.test(pathname)) seen.push(pathname); });
  return seen;
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
  // Optional URL search for flows that use query parameters.
  gameplaySearch: ['', { option: true }],
  gameplayPage: async ({ page, gameplayURL, gameplaySearch }, use) => {
    await captureHooks(page);
    await seedHeroCar(page);
    await page.goto(`${gameplayURL}${gameplaySearch}`);
    await page.locator('#start-button').waitFor({ state: 'attached' });
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await use(page);
  },
});

// HERO_CAR=crimson-gt reruns the track and equipment matrices with that car equipped.
export const seedHeroCar = async page => {
  if (process.env.HERO_CAR === 'crimson-gt') await seedGtCareer(page);
  if (process.env.HERO_CAR) await page.addInitScript(car => localStorage.setItem('skyline-rush-car', JSON.stringify(car)), process.env.HERO_CAR);
};
/** MODEL_MANIFEST id those matrices must see on the car: the equipped car's GLB. */
export const HERO_MODEL = (process.env.HERO_CAR && CARS[process.env.HERO_CAR]?.model) || CARS.roadster.model;
/** MODEL_MANIFEST id of the GLB dressing the main scene's player car, or null while it is procedural. */
export const dressedAs = page => page.evaluate(() => window.gameScene.player.children.find(part => part.userData.garageModel)?.userData.garageModel ?? null);

// GLB roots in the main Home/race scene (Coming Soon and Garage stages have their own scenes),
// compiled shader programs, and the hosts currently dressed (`#world[data-garage-model-instances]`).
export const glbRoots = page => page.evaluate(() => { let n = 0; window.gameScene.scene.traverse(o => { if (o.userData.garageModel) n++; }); return n; });
export const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);
/** Waits out a fall in game time, per frame: a CPU renderer plays 0.05 s of game per ~1 s frame, so a wall-clock poll alone runs out. */
export const landed = page => page.evaluate(async () => {
  const { race } = window.gameplay, until = race.elapsed + 6;
  while (race.player.altitude !== 0 && race.elapsed < until) await new Promise(requestAnimationFrame);
});
/**
 * A test that holds a GLB response past a slow software render would race the loader's 15 s download deadline
 * (`timeoutMs` in src/asset-model-loader.ts) and see `fallback:timeout`. Serve the dev module with a wider deadline;
 * the shipped value is untouched, and the timeout/fallback paths have their own tests. Gameplay (Vite dev) server only.
 */
export const widenModelDeadline = (page, includeDecode = false) => page.route(url => url.pathname === '/src/asset-model-loader.ts', async route => {
  const response = await route.fetch();
  const source = await response.text();
  const deadline = /\btimeoutMs\s*=\s*(?:15000|15e3)\b/;
  if (!deadline.test(source)) throw new Error('src/asset-model-loader.ts no longer holds the normal model download deadline');
  let body = source.replace(deadline, 'timeoutMs = 90000');
  if (includeDecode) {
    const decodeDeadline = /\bdecodeTimeoutMs\s*=\s*(?:30000|3e4)\b/;
    if (!decodeDeadline.test(body)) throw new Error('Model decode deadline changed');
    body = body.replace(decodeDeadline, 'decodeTimeoutMs = 90000');
  }
  await route.fulfill({ response, body });
});
export const modelInstances = async page => JSON.parse((await page.locator('#world').getAttribute('data-garage-model-instances')) ?? '{}');
