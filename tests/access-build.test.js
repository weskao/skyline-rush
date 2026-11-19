import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import productionConfig from '../vite.config.js';
import unlockedConfig from '../vite.unlocked.config.js';
import { availableTracks as devTracks, availablePaints as devPaints, isUpcomingEnterable } from '../src/access/dev-unlocked.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { availableTracks as prodTracks, availablePaints as prodPaints } from '../src/access/production.ts';
import { RACE_TRACKS } from '../src/game.js';
import { PAINTS } from '../src/appearance.ts';
import { createWave3LocalDemo } from '../src/wave3-local-demo.ts';

test('local-only build exposes every track and paint without writing storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('storage inaccessible'); } });
  try {
    const allLocal = [...Object.keys(RACE_TRACKS), ...Object.keys(UPCOMING_TRACKS).filter(isUpcomingEnterable)];
    assert.deepEqual(devTracks(), allLocal);
    assert.equal(allLocal.length, 16, 'all six approved previews are available only in local-unlocked');
    assert.deepEqual(devPaints(), Object.keys(PAINTS));
    assert.deepEqual(prodTracks(), ['coast']);
    assert.deepEqual(prodPaints(0), ['pearl', 'crimson']);
    assert.deepEqual(prodPaints(24), Object.keys(PAINTS));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('normal Vite config resolves the production access module, unlocked config only serves', () => {
  const standardConfig = productionConfig({ command: 'build', mode: 'production' });
  assert.match(standardConfig.resolve.alias['@progression-access'], /access\/production\.ts$/);
  assert.match(standardConfig.resolve.alias['#garage-skin-runtime'], /garage-skin-runtime-locked\.ts$/);
  assert.throws(() => unlockedConfig({ command: 'build', mode: 'production' }), /development-server only/);
  const cfg = unlockedConfig({ command: 'serve', mode: 'development' });
  assert.match(cfg.resolve.alias['@progression-access'], /access\/dev-unlocked\.ts$/);
});

test('unlocked Vite only serves the full local catalog, even in production mode', () => {
  assert.throws(() => unlockedConfig({ command: 'serve', mode: 'production', isPreview: true }), /development-server only/);
  const config = unlockedConfig({ command: 'serve', mode: 'production' });
  assert.match(config.resolve.alias['#garage-skin-runtime'], /garage-skin-runtime\.ts$/);
  assert.match(config.resolve.alias['#wave3-demo-ui'], /Wave3DemoEntry\.vue$/);
  assert.match(config.resolve.alias['#wave3-preview-store'], /wave3-preview-disabled\.ts$/);
});

for (const unlocked of [false, true]) {
  test(`Vite ${unlocked ? 'unlocked' : 'standard'} catalog uses the corresponding car and Store policies`, async () => {
    const server = await createServer({
      configFile: unlocked ? 'vite.unlocked.config.js' : 'vite.config.js',
      server: { middlewareMode: true, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const saved = new Map();
    const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const reads = [];
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      ...storage, getItem: key => { reads.push(key); return storage.getItem(key); },
    } });
    try {
      const cars = await server.ssrLoadModule('/src/car-catalog.ts');
      for (const [id, car] of Object.entries(cars.CARS)) {
        const canEquip = unlocked || car.stars === 0;
        assert.equal(cars.equipCar(id, storage, 0), canEquip, `equip ${id} at zero stars`);
        if (canEquip) assert.equal(cars.validateEquippedCar(0, storage), id, `race selection for ${id}`);
      }
      assert.equal(cars.savedCar(storage), unlocked ? undefined : 'roadster');

      const { default: store } = await server.ssrLoadModule('/src/Wave3DemoStore.vue');
      const html = await renderToString(createSSRApp(store, { port: createWave3LocalDemo() }));
      assert.equal(html.includes('Equip for testing'), unlocked);
      assert.equal(html.includes('Demo redeem'), !unlocked);

      const { wave3DemoExperience } = await server.ssrLoadModule('/src/wave3-browser-experience.ts');
      const checkpoint = 'skyline-rush-wave3-demo:v1:guest';
      await wave3DemoExperience.resetDemo();
      assert.equal(reads.includes(checkpoint), !unlocked, 'the unlocked Store does not reuse the normal demo save');
      if (unlocked) {
        assert.equal(saved.has(checkpoint), false);
        for (const id of Object.keys(PAINTS)) {
          cars.saveCarPaint('roadster', id, storage);
          assert.equal(cars.loadCarPaint('roadster', devPaints(), storage), id);
        }
        const { GARAGE_SKINS } = await server.ssrLoadModule('/src/garage-skin-catalog.ts');
        const runtime = await server.ssrLoadModule('/src/garage-skin-runtime.ts');
        for (const { id, category } of GARAGE_SKINS) {
          assert.equal(runtime.equipGarageSkin(id), true, `equip ${id}`);
          assert.equal(runtime.currentGarageSkins()[category], id);
        }
        assert.equal(saved.size, 0, 'test picks never reach the device save');
      }
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete globalThis.localStorage;
      await server.close();
    }
  });
}

test('distribution entry never directly imports the development unlock module', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes("from '@progression-access'"));
  assert.ok(!main.includes('dev-unlocked'));
  const standardConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.ok(!standardConfig.includes('src/access/dev-unlocked.js'));
});

test('all unlocked Make entrypoints use the same dev-only Vite access policy', () => {
  const make = readFileSync(new URL('../Makefile', import.meta.url), 'utf8');
  const recipe = name => {
    const lines = make.split('\n'), index = lines.findIndex(line => line.startsWith(name + ':'));
    assert.ok(index >= 0, 'missing Make target ' + name);
    const body = [lines[index]];
    for (let i = index + 1; i < lines.length && lines[i].startsWith('\t'); i++) body.push(lines[i]);
    return body.join('\n');
  };
  assert.match(recipe('dev-unlocked'), /--config vite\.unlocked\.config\.js/);
  assert.match(recipe('test-unlocked'), /^test-unlocked:\s*dev-unlocked\b/);
  assert.match(recipe('phone-unlocked'), /--config vite\.unlocked\.config\.js/);
  assert.match(recipe('dev-feature'), /scripts\/dev-feature\.mjs/);
  const cfg = unlockedConfig({ command: 'serve', mode: 'development' });
  assert.match(cfg.resolve.alias['@progression-access'], /access\/dev-unlocked\.ts$/);
  assert.throws(() => unlockedConfig({ command: 'build', mode: 'production' }), /development-server only/);
});

test('Garage paint entitlement comes from the build-selected access module, never a hard-wired production import', () => {
  const garage = readFileSync(new URL('../src/garage-ui.ts', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(!garage.includes('access/production'));
  assert.match(main, /setupGarageUI\(\{[\s\S]*availablePaints/);
});
