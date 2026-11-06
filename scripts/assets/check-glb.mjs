// Contract §3 step 4: node scripts/assets/check-glb.mjs <id> [glb-path] [--promote]
// Loads the optimized GLB (default: temp output of optimize-glb.mjs) with three's GLTFLoader + MeshoptDecoder,
// exits nonzero on violations and prints sha256 + bytes for the manifest. --promote copies a passing GLB
// to public/<entry.url>.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @param {{triangles:number,bytes:number,nodeNames:string[],usedMaterials:string[],maxTexturePx:number,animationNames:string[],rawAnimationNames:string[]}} s */
export function checkGlb(s, entry) {
  const { budgets } = entry;
  const violations = [];
  if (s.triangles > budgets.triangles) violations.push(`triangles: ${s.triangles} > budget ${budgets.triangles}`);
  if (s.bytes > budgets.bytes) violations.push(`bytes: ${s.bytes} > budget ${budgets.bytes}`);
  for (const name of entry.nodes) if (!s.nodeNames.includes(name)) violations.push(`nodes: missing exact node name "${name}"`);
  for (const name of entry.materials) if (!s.usedMaterials.includes(name)) violations.push(`materials: "${name}" is not used by any mesh`);
  if (s.maxTexturePx > budgets.textureMaxPx) violations.push(`textures: ${s.maxTexturePx}px > textureMaxPx ${budgets.textureMaxPx}`);
  if (s.animationNames.join('\0') !== s.rawAnimationNames.join('\0')) {
    violations.push(`animations: [${s.animationNames}] differ from raw export [${s.rawAnimationNames}]`);
  }
  return violations;
}

/** JSON chunk of a GLB (header 12 bytes, then chunk length + type, then JSON). */
export function glbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
}

async function parse(buffer) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

/** Summary of an optimized GLB; `rawBuffer` (the pre-optimize export) supplies the animation names to compare against. */
export async function summarize(buffer, rawBuffer) {
  const gltf = await parse(buffer);
  let triangles = 0, draws = 0;
  const nodeNames = [], used = new Set();
  gltf.scene.traverse(o => {
    nodeNames.push(o.name);
    if (!o.isMesh) return;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    for (const m of [o.material].flat()) { used.add(m.name); draws++; }
  });
  const json = glbJson(buffer);
  const animationNames = (json.animations ?? []).map(a => a.name ?? '');
  // shortcut: texture pixel sizes are not decoded in Node, so any texture fails the budget; upgrade with the first textured asset.
  const maxTexturePx = (json.images ?? []).length ? Infinity : 0;
  const rawAnimationNames = rawBuffer ? (glbJson(rawBuffer).animations ?? []).map(a => a.name ?? '') : animationNames;
  return { triangles, draws, bytes: buffer.length, nodeNames, usedMaterials: [...used], maxTexturePx, animationNames, rawAnimationNames, generator: json.asset?.generator };
}

async function main() {
  const { manifestEntry, optGlbPath, rawGlbPath, requireFile, root } = await import('./common.mjs');
  const [id, ...rest] = process.argv.slice(2);
  const entry = await manifestEntry(id);
  const promote = rest.includes('--promote');
  const file = rest.find(a => !a.startsWith('--')) ?? optGlbPath(id);
  requireFile(file, `Run: node scripts/assets/optimize-glb.mjs ${id}`);
  const buffer = readFileSync(file);
  const raw = rawGlbPath(id);
  const summary = await summarize(buffer, existsSync(raw) ? readFileSync(raw) : undefined);
  const violations = checkGlb(summary, entry);
  console.log(`sha256: ${createHash('sha256').update(buffer).digest('hex')}\nbytes: ${buffer.length}`);
  console.log(`triangles: ${summary.triangles}\ndraws: ${summary.draws}\ngenerator: ${summary.generator}`);
  if (violations.length) { console.error(violations.map(v => `VIOLATION ${v}`).join('\n')); process.exit(1); }
  if (promote) {
    const dest = join(root, 'public', entry.url);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    console.log(`promoted -> public/${entry.url}`);
  }
  console.log('check-glb: PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
