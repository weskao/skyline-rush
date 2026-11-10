import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectGarageReleaseBuild } from './scripts/garage-release-build.mjs';
import { diagRelayPlugin } from './scripts/diag-relay-plugin.mjs';
import { dev3dPlugin } from './scripts/dev-3d-redirect-plugin.mjs';

// Build-time Strategy: default production strips preview, trial and cosmetic catalog modules.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GARAGE_VFX_');
  const release = selectGarageReleaseBuild(mode, env.GARAGE_VFX_RELEASE_MODE);
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
      // `make dev-diag` / `make phone-diag`: the phone's diag stream lands in diag-logs/*.jsonl (serve only, never a build).
      ...(process.env.VITE_DIAG ? [diagRelayPlugin()] : []),
      // `make <dev target> 3d=1`: the bare URL redirects to ?model=roadster&look=3d (serve only, never a build).
      ...(process.env.DEV_3D ? [dev3dPlugin()] : []),
    ],
    define: { __GARAGE_SKIN_TRIAL__: JSON.stringify(release.mode === 'trial') },
    // ?model=probe imports the GLB loader lazily; pre-bundle its deps so the dev server does not reload the page mid-Garage.
    optimizeDeps: { include: ['three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/utils/SkeletonUtils.js', 'three/examples/jsm/libs/meshopt_decoder.module.js'] },
    server: { watch: { ignored: [fileURLToPath(new URL('./.claude/worktrees/**', import.meta.url))] } },
    resolve: { alias: {
      '@progression-access': fileURLToPath(new URL('./src/access/production.ts', import.meta.url)),
      ...release.aliases,
    } },
  };
});
