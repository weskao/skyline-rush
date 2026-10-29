import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// whitespace 'preserve' keeps the inter-element spaces the pre-Vue innerHTML markup rendered.
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { whitespace: 'preserve' } } })],
  // The normal server and every production build resolve to the locked access implementation.
  resolve: { alias: { '@progression-access': fileURLToPath(new URL('./src/access/production.ts', import.meta.url)) } },
});
