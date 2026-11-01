import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

// Each marker is a string its development-only module needs at runtime, so minification cannot strip it.
const RELEASE_LEAK_MARKERS = {
  SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: 'development unlock code',
  'skyline-rush-crash-log': 'diagnostic crash log / live panel (VITE_DIAG build)',
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
// Deployment default: fail closed if any unpublished Garage VFX code or public artwork leaked.
const locked = !process.env.GARAGE_VFX_RELEASE_MODE || process.env.GARAGE_VFX_RELEASE_MODE === 'coming-soon';
if (locked) {
  for (const marker of ['thruster-ion', 'thruster-plasma', 'thruster-void', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism', 'nitro-trail-cyan', 'nitro-trail-gold', 'nitro-trail-red', 'launch-flare-blue', 'launch-flare-ring', 'launch-flare-pulse', 'live-shared-aero', 'Free trial', 'Ion thruster']) {
    RELEASE_LEAK_MARKERS[marker] = 'unreleased garage trial catalog/runtime';
  }
}
const assetLeak = locked && existsSync('dist/feature-assets/garage-vfx-skins')
  ? ['unreleased garage asset directory in dist/feature-assets/garage-vfx-skins'] : [];
const leaked = assetLeak.concat(Object.entries(RELEASE_LEAK_MARKERS).flatMap(([marker, what]) =>
  files.filter(path => readFileSync(path, 'utf8').includes(marker)).map(path => `${what} in ${path}`)));
if (leaked.length) {
  console.error('Refusing production build: development-only code leaked:', leaked.join('; '));
  process.exitCode = 1;
} else {
  console.log('Production bundle checked: no development-only unlock or diagnostic module found.');
}
