import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

// Each marker is a string its development-only module needs at runtime, so minification cannot strip it.
const RELEASE_LEAK_MARKERS = {
  SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: 'development unlock code',
  'skyline-rush-crash-log': 'diagnostic crash log / live panel (VITE_DIAG build)',
  '__diag/log': 'diagnostic log relay client (VITE_DIAG build)',
  'diag-relay-token': 'diagnostic log relay token (VITE_DIAG dev server)',
};
const files = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.(?:js|html|css|map)$/.test(entry.name)) files.push(path);
  }
}
scan('dist');
// CI's default build remains fail-closed. An approved Pages release explicitly pins trial.
const mode = process.env.GARAGE_VFX_RELEASE_MODE || 'coming-soon';
if (!['coming-soon', 'trial', 'released'].includes(mode)) {
  console.error('Invalid GARAGE_VFX_RELEASE_MODE during production bundle audit:', mode);
  process.exit(1);
}
const locked = mode === 'coming-soon';
if (locked) {
  for (const marker of ['thruster-ion', 'thruster-plasma', 'thruster-void', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism', 'nitro-trail-cyan', 'nitro-trail-gold', 'nitro-trail-red', 'launch-flare-blue', 'launch-flare-ring', 'launch-flare-pulse', 'nitro-trail-purple', 'launch-flare-gold', 'launch-flare-red', 'launch-flare-cyan', 'launch-flare-magenta', 'launch-flare-white', 'live-shared-aero', 'Free trial', 'Ion thruster']) {
    RELEASE_LEAK_MARKERS[marker] = 'unreleased garage trial catalog/runtime';
  }
  // Must equal SKIN_PICK_STORAGE_KEY in src/garage-skin-preference.ts (trial runtime only).
  RELEASE_LEAK_MARKERS['skyline-rush-garage-skin-picks'] = 'garage skin pick storage (trial runtime)';
}
const assetLeak = locked && existsSync('dist/feature-assets/garage-vfx-skins')
  ? ['unreleased garage asset directory in dist/feature-assets/garage-vfx-skins'] : [];
const leaked = assetLeak.concat(Object.entries(RELEASE_LEAK_MARKERS).flatMap(([marker, what]) =>
  files.filter(path => readFileSync(path, 'utf8').includes(marker)).map(path => `${what} in ${path}`)));

// Fail release if a public trial accidentally builds the locked UI or omits artwork.
// This is an artifact-integrity check; it is not a server-side entitlement system.
if (mode === 'trial') {
  const mustShip = [
    'dist/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp',
    'dist/feature-assets/garage-vfx-skins/raster/airflow-vortex@3x.svg',
    'dist/feature-assets/garage-vfx-skins/raster/badge-trial@3x.webp',
  ];
  for (const path of mustShip) if (!existsSync(path)) leaked.push(`trial artwork missing: ${path}`);
  if (!files.some(path => path.endsWith('.js') && readFileSync(path, 'utf8').includes('thruster-ion'))) {
    leaked.push('public trial UI/catalog is missing from compiled JavaScript');
  }
}
if (leaked.length) {
  console.error('Refusing production build: development-only code leaked:', leaked.join('; '));
  process.exitCode = 1;
} else {
  console.log(`Production ${mode} bundle checked: no development-only unlock or diagnostic module found.`);
}
