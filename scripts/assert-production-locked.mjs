import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RELEASE_LEAK_MARKER = 'SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY';
const files = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.(?:js|html|css|map)$/.test(entry.name)) files.push(path);
  }
}
scan('dist');
const leaked = files.filter(path => readFileSync(path, 'utf8').includes(RELEASE_LEAK_MARKER));
if (leaked.length) {
  console.error('Refusing production build: development unlock code leaked into:', leaked.join(', '));
  process.exitCode = 1;
} else {
  console.log('Production bundle checked: no development-only unlock module found.');
}
