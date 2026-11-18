import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectGarageReleaseBuild, WAVE3_PREVIEW_STORE_MARKER } from './scripts/garage-release-build.mjs';
import { diagRelayPlugin } from './scripts/diag-relay-plugin.mjs';

// Build-time Strategy: default production strips preview, trial and cosmetic catalog modules.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['GARAGE_VFX_', 'VITE_WAVE3_FIRESTORE_PREVIEW']);
  const release = selectGarageReleaseBuild(mode, env.GARAGE_VFX_RELEASE_MODE, env.VITE_WAVE3_FIRESTORE_PREVIEW);
  let outputDir = '';
  return {
    plugins: [
      vue({ template: { compilerOptions: { whitespace: 'preserve' } } }),
      {
        name: 'garage-release-asset-fence', apply: 'build',
        configResolved(config) { outputDir = resolve(config.root, config.build.outDir); },
        generateBundle(_, bundle) {
          const hasPreviewStore = Object.values(bundle).some(chunk =>
            chunk.type === 'chunk' && chunk.code.includes(WAVE3_PREVIEW_STORE_MARKER));
          if (hasPreviewStore !== release.wave3FirestoreEnabled) {
            this.error('Wave 3 Firestore bundle does not match VITE_WAVE3_FIRESTORE_PREVIEW');
          }
        },
        closeBundle() {
          if (release.mode === 'coming-soon') {
            rmSync(join(outputDir, 'feature-assets/garage-vfx-skins'), { recursive: true, force: true });
          }
        },
      },
      // `make dev-diag` / `make phone-diag`: the phone's diag stream lands in diag-logs/*.jsonl (serve only, never a build).
      ...(process.env.VITE_DIAG ? [diagRelayPlugin()] : []),
    ],
    define: {
      __GARAGE_SKIN_TRIAL__: JSON.stringify(release.mode === 'trial'),
      __WAVE3_FIRESTORE_PREVIEW__: JSON.stringify(release.wave3FirestoreEnabled),
    },
    // GLBs load lazily; pre-bundle the loader dependencies to avoid a dev-server reload mid-game.
    optimizeDeps: { include: ['three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/utils/SkeletonUtils.js', 'three/examples/jsm/libs/meshopt_decoder.module.js'] },
    server: { watch: { ignored: [fileURLToPath(new URL('./.claude/worktrees/**', import.meta.url))] } },
    resolve: { alias: {
      '@progression-access': fileURLToPath(new URL('./src/access/production.ts', import.meta.url)),
      ...release.aliases,
    } },
  };
});
