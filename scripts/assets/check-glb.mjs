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
  for (const error of s.colorSpaceErrors ?? []) violations.push(`textures: ${error}`);
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

/** BIN chunk of a GLB (follows the JSON chunk), or an empty buffer. */
function glbBin(buffer) {
  const start = 20 + buffer.readUInt32LE(12);
  return start + 8 <= buffer.length ? buffer.subarray(start + 8, start + 8 + buffer.readUInt32LE(start)) : Buffer.alloc(0);
}

const COLOR_SLOTS = ['baseColorTexture', 'emissiveTexture'];
const DATA_SLOTS = ['normalTexture', 'occlusionTexture', 'metallicRoughnessTexture'];
const KTX2_MAGIC = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb]);

/** Image header → { px, transfer }: KTX2 DFD transfer 1 = linear, 2 = sRGB; PNG/JPEG carry no colour space (transfer 0). */
function imageInfo(bytes) {
  if (bytes.subarray(0, 8).equals(KTX2_MAGIC)) {
    return { px: Math.max(bytes.readUInt32LE(20), bytes.readUInt32LE(24)), transfer: bytes[bytes.readUInt32LE(48) + 14] };
  }
  if (bytes.readUInt32BE(0) === 0x89504e47) return { px: Math.max(bytes.readUInt32BE(16), bytes.readUInt32BE(20)), transfer: 0 };
  // shortcut: JPEG sizes are not parsed; the Roadster pipeline ships KTX2 only. Parse SOF markers if a JPEG asset appears.
  return { px: Infinity, transfer: 0 };
}

/** Largest texture side and KTX2 colour-space misuse, from the glTF JSON and BIN chunk alone (no pixel decode). */
export function textureStats(json, bin) {
  const info = (json.images ?? []).map(image => {
    const view = json.bufferViews[image.bufferView];
    return imageInfo(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  });
  const sourceOf = i => { const t = json.textures[i]; return t.extensions?.KHR_texture_basisu?.source ?? t.source; };
  const colorSpaceErrors = [];
  for (const material of json.materials ?? []) {
    const slots = { ...material, ...material.pbrMetallicRoughness };
    for (const slot of [...COLOR_SLOTS, ...DATA_SLOTS]) {
      if (!slots[slot]) continue;
      const { index } = slots[slot], { transfer } = info[sourceOf(index)];
      const color = COLOR_SLOTS.includes(slot);
      if (color && transfer === 1) colorSpaceErrors.push(`texture ${index} (${slot}) must be sRGB`);
      if (!color && transfer === 2) colorSpaceErrors.push(`texture ${index} (${slot}) must be linear`);
    }
  }
  return { maxTexturePx: Math.max(0, ...info.map(i => i.px)), colorSpaceErrors };
}

async function parse(buffer) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const { Texture } = await import('three');
  await MeshoptDecoder.ready;
  // Node has no transcoder: KTX2 images resolve to empty textures; sizes/colour spaces come from textureStats.
  const ktx2Stub = { load: (_url, onLoad) => onLoad(new Texture()) };
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2Stub);
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
  const { maxTexturePx, colorSpaceErrors } = textureStats(json, glbBin(buffer));
  const rawAnimationNames = rawBuffer ? (glbJson(rawBuffer).animations ?? []).map(a => a.name ?? '') : animationNames;
  return { triangles, draws, bytes: buffer.length, nodeNames, usedMaterials: [...used], maxTexturePx, colorSpaceErrors, animationNames, rawAnimationNames, generator: json.asset?.generator };
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
