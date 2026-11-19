import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { createViteConfig } from './vite.config.js';
import { selectGarageReleaseBuild } from './scripts/garage-release-build.mjs';

// Intentionally a separate Vite configuration: unlocks are selected at module
// resolution time, never behind a runtime VITE_* flag or browser storage setting.
export default defineConfig(({ command, mode, isPreview }) => {
  if (command !== 'serve' || isPreview) {
    throw new Error('The all-unlocked configuration is development-server only; production builds are forbidden.');
  }
  const garageRelease = selectGarageReleaseBuild(mode, 'trial', '0');
  return mergeConfig(createViteConfig(mode, garageRelease), {
    resolve: {
      alias: {
        '@progression-access': fileURLToPath(new URL('./src/access/dev-unlocked.ts', import.meta.url)),
        '#garage-playtest-storage': fileURLToPath(new URL('./src/access/garage-playtest-storage.ts', import.meta.url)),
        '#garage-playtest-equip': fileURLToPath(new URL('./src/access/GaragePlaytestEquip.vue', import.meta.url)),
      },
    },
    server: { host: '127.0.0.1' },
  });
});
