import { fileURLToPath } from 'node:url';

export const GARAGE_RELEASE_MODES = Object.freeze(['coming-soon', 'trial', 'released']);

const source = name => fileURLToPath(new URL(`../src/${name}`, import.meta.url));

/**
 * Build-time Strategy selection; Vite resolves exactly one implementation per entry point.
 * No cookies, query params or localStorage can unlock an omitted module.
 */
export function selectGarageReleaseBuild(viteMode, explicit = undefined, wave3Flag = undefined) {
  const mode = explicit === undefined ? (viteMode === 'production' ? 'coming-soon' : 'trial') : explicit;
  if (!GARAGE_RELEASE_MODES.includes(mode)) {
    throw new Error(`Invalid GARAGE_VFX_RELEASE_MODE: ${String(mode)}`);
  }
  const locked = mode === 'coming-soon';
  if (wave3Flag !== undefined && wave3Flag !== '0' && wave3Flag !== '1') {
    throw new Error(`Invalid VITE_WAVE3_FIRESTORE_PREVIEW: ${String(wave3Flag)} (expected 0 or 1)`);
  }
  if (locked && wave3Flag === '1') {
    throw new Error('VITE_WAVE3_FIRESTORE_PREVIEW=1 is incompatible with coming-soon');
  }
  const wave3FirestoreEnabled = !locked && (wave3Flag === undefined ? viteMode === 'production' : wave3Flag === '1');
  const demoEnabled = mode === 'trial' || wave3FirestoreEnabled;
  return {
    mode,
    wave3FirestoreEnabled,
    aliases: {
      '#garage-skin-ui': source(locked ? 'GarageSkinComingSoon.vue' : 'GarageSkinCatalog.vue'),
      '#garage-skin-runtime': source(locked ? 'garage-skin-runtime-locked.ts' : 'garage-skin-runtime.ts'),
      '#garage-skin-palette': source(locked ? 'garage-skin-palette-locked.ts' : 'garage-skin-palette.ts'),
      '#garage-void-beams': source(locked ? 'garage-void-beams-locked.js' : 'garage-void-beams.js'),
      '#garage-launch-flare': source(locked ? 'garage-launch-flare-locked.js' : 'garage-launch-flare.js'),
      '#garage-drift-trail': source(locked ? 'garage-drift-trail-locked.js' : 'garage-drift-trail.js'),
      '#garage-nitro-trail': source(locked ? 'garage-nitro-trail-locked.js' : 'garage-nitro-trail.js'),
      '#garage-release-config': source(`garage-release-${mode}.ts`),
      '#wave3-preview-store': source(wave3FirestoreEnabled ? 'wave3-preview-firestore.ts' : 'wave3-preview-disabled.ts'),
      '#wave3-demo-race': source(demoEnabled ? 'wave3-race-events.ts' : 'wave3-demo-race-locked.ts'),
      '#wave3-demo-ui': source(demoEnabled ? 'Wave3DemoEntry.vue' : 'Wave3DemoLocked.vue'),
      '#wave3-demo-mission-ui': source(demoEnabled ? 'GarageMissionBoard.vue' : 'GarageMissionBoardLocked.vue'),
    },
  };
}
