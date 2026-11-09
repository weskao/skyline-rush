// Phase 0 / E13: install glTF Transform CLI as an exact-pinned project devDependency, then smoke-test it.
// Usage: node scripts/install-gltf-transform.mjs   (BLENDER_BIN overrides the Blender path)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VERSION = '4.5.1';
const root = new URL('..', import.meta.url).pathname;
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const cli = (...args) => run('npx', ['--no-install', 'gltf-transform', ...args]);

const installed = () => { try { return cli('--version').trim(); } catch { return ''; } };
if (installed() !== VERSION) {
  console.log(`Installing @gltf-transform/cli@${VERSION} (project devDependency, exact pin)`);
  run('npm', ['install', '-D', '--save-exact', `@gltf-transform/cli@${VERSION}`]);
}
const version = installed();
if (version !== VERSION) throw new Error(`gltf-transform --version = "${version}", expected ${VERSION}`);

const blender = process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
if (!existsSync(blender)) throw new Error(`Blender not found at ${blender}; set BLENDER_BIN`);
const dir = mkdtempSync(join(tmpdir(), 'gltf-smoke-'));
const [src, out] = [join(dir, 'smoke.glb'), join(dir, 'smoke-opt.glb')];
run(blender, ['--background', '--factory-startup', '--python-expr',
  `import bpy; bpy.ops.mesh.primitive_cube_add(); bpy.ops.export_scene.gltf(filepath=${JSON.stringify(src)})`]);
if (!cli('inspect', src).includes('OVERVIEW')) throw new Error('inspect printed no OVERVIEW');
cli('optimize', src, out, '--compress', 'meshopt', '--texture-compress', 'false');
console.log(`E13 PASS: gltf-transform ${version}, smoke ${statSync(src).size} B -> ${statSync(out).size} B`);
