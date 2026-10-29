import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import productionConfig from './vite.config.js';

// Intentionally a separate Vite configuration: unlocks are selected at module
// resolution time, never behind a runtime VITE_* flag or browser storage setting.
export default defineConfig(({ command }) => {
  if (command !== 'serve') {
    throw new Error('The all-unlocked configuration is development-server only; production builds are forbidden.');
  }
  return mergeConfig(productionConfig, {
    resolve: {
      alias: {
        '@progression-access': fileURLToPath(new URL('./src/access/dev-unlocked.ts', import.meta.url)),
      },
    },
    server: { host: '127.0.0.1' },
  });
});
