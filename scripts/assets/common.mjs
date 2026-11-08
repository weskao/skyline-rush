// Shared by the Phase 2 asset scripts: repo root, Blender path, temp GLB paths, manifest lookup.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const root = new URL('../../', import.meta.url).pathname;
export const blenderBin = () => process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
const tempDir = () => { const dir = join(tmpdir(), 'skyline-rush-glb'); mkdirSync(dir, { recursive: true }); return dir; };
/** Raw Blender export and optimized output live in the OS temp dir, never in the repo. */
export const rawGlbPath = id => join(tempDir(), `${id}.raw.glb`);
export const optGlbPath = id => join(tempDir(), `${id}.opt.glb`);
export const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] });

export async function manifestEntry(id) {
  if (!id) throw new Error('usage: <script> <model-id>');
  const { MODEL_MANIFEST } = await import('../../src/model-manifest.ts');
  const entry = MODEL_MANIFEST[id];
  if (!entry) throw new Error(`unknown model id "${id}"; known: ${Object.keys(MODEL_MANIFEST).join(', ')}`);
  return entry;
}

/** `--lod <quality>` from argv, or undefined for the main GLB. */
export function lodArg(args) {
  const i = args.indexOf('--lod');
  if (i < 0) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--lod needs a quality, e.g. --lod low');
  return args[i + 1];
}

export function requireFile(path, hint) {
  if (!existsSync(path)) throw new Error(`${path} not found. ${hint}`);
}
