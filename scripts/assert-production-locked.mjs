import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
const leaked = Object.entries(RELEASE_LEAK_MARKERS).flatMap(([marker, what]) =>
  files.filter(path => readFileSync(path, 'utf8').includes(marker)).map(path => `${what} in ${path}`));
if (leaked.length) {
  console.error('Refusing production build: development-only code leaked:', leaked.join('; '));
  process.exitCode = 1;
} else {
  console.log('Production bundle checked: no development-only unlock or diagnostic module found.');
}
