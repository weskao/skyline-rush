import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REVISION } from 'three';

// 3D pipeline Phase 1: the renderer library, its types and the lockfile must move together. Typecheck used to
// install @types/three@0.180.0 on the fly (--no-save), so a stale r180 type surface could hide r186 breakage.
const TARGET = '0.186.1';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const pkg = read('package.json');

test('three is pinned exactly to the target release and the installed copy matches', () => {
  assert.equal(pkg.dependencies.three, TARGET);
  assert.equal(read('node_modules/three/package.json').version, TARGET);
  assert.equal(REVISION, TARGET.split('.')[1]);
});

test('the lockfile resolves the same three release', () => {
  assert.equal(read('package-lock.json').packages['node_modules/three'].version, TARGET);
});

test('@types/three is a declared devDependency on the same minor as three', () => {
  const declared = pkg.devDependencies?.['@types/three'];
  assert.ok(declared, '@types/three must be a devDependency, not a --no-save install');
  assert.match(declared, /^0\.186\.\d+$/);
  assert.equal(read('package-lock.json').packages['node_modules/@types/three'].version, declared);
});

test('typecheck scripts do not install a hardcoded @types/three', () => {
  const stale = Object.entries(pkg.scripts).filter(([, command]) => /@types\/three@/.test(command)).map(([name]) => name);
  assert.deepEqual(stale, []);
});
