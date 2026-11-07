// Phase 2 manifest contract: docs/designs/3d-pipeline/phase2-model-contracts.md §1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODEL_MANIFEST, validateManifestEntry, modelUrl } from '../src/model-manifest.ts';
import { validEntry } from './model-fixtures.js';

const root = new URL('..', import.meta.url);
const sha256 = (path) => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const fieldErrors = (entry, key = entry.id) => validateManifestEntry(entry, key).map(e => e.split(':')[0]);

/** @param {(e: ReturnType<typeof validEntry>) => void} mutate */
function rejects(field, mutate) {
  const entry = structuredClone(validEntry());
  mutate(entry);
  assert.ok(fieldErrors(entry).some(f => f.startsWith(field)),
    `expected a "${field}" error, got ${JSON.stringify(validateManifestEntry(entry, entry.id))}`);
}

test('valid fixture entry has no errors', () => {
  assert.deepEqual(validateManifestEntry(validEntry(), 'probe-test'), []);
});

test('id: kebab-case and equal to its key', () => {
  rejects('id', e => { e.id = 'Probe_Test'; });
  assert.ok(fieldErrors(validEntry(), 'other-key').includes('id'));
});

test('url: relative models/<id>/<id>.glb only', () => {
  for (const url of ['/models/probe-test/probe-test.glb', 'models/../probe-test.glb', 'https://cdn.example.com/a.glb',
    'C:/models/a.glb', 'models\\probe-test\\probe-test.glb', 'models/other/other.glb']) {
    rejects('url', e => { e.url = url; });
  }
});

test('source: master/script paths and sha256 format', () => {
  rejects('source', e => { e.source.master = 'assets-src/other/other.blend'; });
  rejects('source', e => { e.source.script = 'scripts/build.py'; });
  rejects('source', e => { e.source.masterSha256 = 'abc'; });
  rejects('source', e => { e.source.scriptSha256 = 'G'.repeat(64); });
});

test('glb: sha256 format, positive integer bytes within budget', () => {
  rejects('glb', e => { e.glb.sha256 = 'z'.repeat(64); });
  rejects('glb', e => { e.glb.bytes = 0; });
  rejects('glb', e => { e.glb.bytes = 1.5; });
  rejects('glb', e => { e.glb.bytes = e.budgets.bytes + 1; });
});

test('license: id and creator required, sourceUrl https only', () => {
  rejects('license', e => { e.license.id = ''; });
  rejects('license', e => { e.license.creator = ' '; });
  rejects('license', e => { e.license.sourceUrl = 'http://example.com/model'; });
});

test('provenance: versions and commands without personal paths', () => {
  rejects('provenance', e => { e.provenance.blender = 'latest'; });
  rejects('provenance', e => { e.provenance.gltfTransform = ''; });
  rejects('provenance', e => { e.provenance.commands = []; });
  for (const personal of ['/Users/someone/blender', '/home/someone/blender', 'C:\\Users\\someone\\blender.exe']) {
    rejects('provenance', e => { e.provenance.commands = [`${personal} --background`]; });
  }
});

test('nodes: non-empty, unique, GLTFLoader-sanitize-stable names', () => {
  rejects('nodes', e => { e.nodes = []; });
  rejects('nodes', e => { e.nodes = ['wheel_fl', 'wheel_fl']; });
  for (const name of ['Wheel_FL', 'wheel fl', 'wheel.fl', 'wheel:fl', '1wheel']) {
    rejects('nodes', e => { e.nodes = [name]; });
  }
});

test('materials: non-empty and unique', () => {
  rejects('materials', e => { e.materials = []; });
  rejects('materials', e => { e.materials = ['paint', 'paint']; });
  rejects('materials', e => { e.materials = ['']; });
});

test('lods: quality high|low, unique, url rules apply', () => {
  rejects('lods', e => { e.lods = [{ quality: 'ultra', url: 'models/probe-test/probe-test-low.glb' }]; });
  rejects('lods', e => { e.lods = [{ quality: 'low', url: '/models/probe-test/low.glb' }]; });
  rejects('lods', e => { e.lods = [{ quality: 'low', url: 'models/probe-test/a.glb' }, { quality: 'low', url: 'models/probe-test/b.glb' }]; });
  const ok = structuredClone(validEntry());
  ok.lods = [{ quality: 'low', url: 'models/probe-test/probe-test-low.glb' }];
  assert.deepEqual(validateManifestEntry(ok, ok.id), []);
});

test('fallback and decoders: known keys only (meshopt only in Phase 2)', () => {
  rejects('fallback', e => { e.fallback = 'cube'; });
  rejects('decoders', e => { e.decoders = ['ktx2']; });
  rejects('decoders', e => { e.decoders = ['draco']; });
  const ok = structuredClone(validEntry());
  ok.decoders = ['meshopt'];
  assert.deepEqual(validateManifestEntry(ok, ok.id), []);
});

test('budgets: positive integer triangles/bytes, textureMaxPx >= 0', () => {
  rejects('budgets', e => { e.budgets.triangles = 0; });
  rejects('budgets', e => { e.budgets.bytes = -1; });
  rejects('budgets', e => { e.budgets.textureMaxPx = -1; });
});

test('modelUrl joins Vite BASE_URL for local and GitHub Pages subpath', () => {
  assert.equal(modelUrl('models/a/a.glb', '/'), '/models/a/a.glb');
  assert.equal(modelUrl('models/a/a.glb', '/skyline-rush/'), '/skyline-rush/models/a/a.glb');
});

test('MODEL_MANIFEST: pipeline-probe entry is valid', () => {
  const probe = MODEL_MANIFEST['pipeline-probe'];
  assert.ok(probe, 'pipeline-probe entry exists');
  assert.deepEqual(probe.nodes, ['probe_body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']);
  assert.equal(probe.fallback, 'procedural-car');
  for (const [key, entry] of Object.entries(MODEL_MANIFEST)) assert.deepEqual(validateManifestEntry(entry, key), [], key);
});

test('MODEL_MANIFEST: committed files exist and match recorded hashes', () => {
  for (const entry of Object.values(MODEL_MANIFEST)) {
    for (const path of [`public/${entry.url}`, ...entry.lods.map(l => `public/${l.url}`), entry.source.master, entry.source.script]) {
      assert.ok(existsSync(new URL(path, root)), `${entry.id}: ${path} is committed`);
    }
    assert.equal(sha256(`public/${entry.url}`), entry.glb.sha256, `${entry.id}: glb sha256`);
    assert.equal(readFileSync(new URL(`public/${entry.url}`, root)).length, entry.glb.bytes, `${entry.id}: glb bytes`);
    assert.equal(sha256(entry.source.master), entry.source.masterSha256, `${entry.id}: master sha256`);
    assert.equal(sha256(entry.source.script), entry.source.scriptSha256, `${entry.id}: script sha256`);
  }
});

test('MODEL_MANIFEST: Blender auto-backup files are not tracked', () => {
  const tracked = execFileSync('git', ['ls-files', '--', 'assets-src/'], {
    cwd: fileURLToPath(root), encoding: 'utf8',
  });
  const backups = tracked.split(/\r?\n/).filter(path => /\.blend[1-9]\d*$/.test(path));
  assert.deepEqual(backups, [], 'Do not commit Blender .blend1/.blend2 automatic backups');
});
