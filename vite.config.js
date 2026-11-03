import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectGarageReleaseBuild } from './scripts/garage-release-build.mjs';

// Build-time Strategy: default production strips preview, trial and cosmetic catalog modules.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GARAGE_VFX_');
  const release = selectGarageReleaseBuild(mode, env.GARAGE_VFX_RELEASE_MODE);
  // Stage 2 showroom scenes ship only to the dev server or an explicit VITE_STAGE2_PREVIEW=1 QA build.
  const stage2 = mode === 'development' || loadEnv(mode, process.cwd(), 'VITE_STAGE2_').VITE_STAGE2_PREVIEW ? 'stage2' : 'stage2-none';
  let outputDir = '';
  return {
    plugins: [
      vue({ template: { compilerOptions: { whitespace: 'preserve' } } }),
      {
        name: 'garage-release-asset-fence', apply: 'build',
        configResolved(config) { outputDir = resolve(config.root, config.build.outDir); },
        closeBundle() {
          if (release.mode === 'coming-soon') {
            rmSync(join(outputDir, 'feature-assets/garage-vfx-skins'), { recursive: true, force: true });
          }
        },
      },
    ],
    define: { __GARAGE_SKIN_TRIAL__: JSON.stringify(release.mode === 'trial') },
    server: { watch: { ignored: [fileURLToPath(new URL('./.claude/worktrees/**', import.meta.url))] } },
    resolve: { alias: {
      '@progression-access': fileURLToPath(new URL('./src/access/production.ts', import.meta.url)),
      '@stage2-environments': fileURLToPath(new URL(`./src/upcoming-scenes/${stage2}.ts`, import.meta.url)),
      ...release.aliases,
    } },
  };
});
