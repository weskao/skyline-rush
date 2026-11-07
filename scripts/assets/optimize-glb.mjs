// Contract §3 step 3: node scripts/assets/optimize-glb.mjs <id>
// Every `false` keeps named nodes, empty pivots and materials: the defaults would flatten/join nodes,
// merge materials into palettes and prune empty leaves.
// Entries listing the `ktx2` decoder then get KTX2 textures (needs KTX-Software `ktx` on PATH):
// UASTC for linear data maps (normal/AO/metal-rough keep detail), ETC1S for sRGB colour maps.
import { fileURLToPath } from 'node:url';

/** gltf-transform argv lists, in order; each step reads the previous step's output. */
export function optimizeSteps(entry, raw, out) {
  const ktx2 = entry.decoders.includes('ktx2');
  const mesh = ktx2 ? `${out}.mesh.glb` : out, data = `${out}.data.glb`;
  const steps = [['optimize', raw, mesh, '--compress', 'meshopt', '--texture-compress', 'false',
    '--flatten', 'false', '--join', 'false', '--palette', 'false', '--simplify', 'false', '--instance', 'false', '--prune', 'false']];
  if (ktx2) steps.push(
    ['uastc', mesh, data, '--slots', '{normalTexture,occlusionTexture,metallicRoughnessTexture}', '--level', '2', '--zstd', '18'],
    ['etc1s', data, out, '--slots', '{baseColorTexture,emissiveTexture}'],
  );
  return steps;
}

async function main() {
  const { manifestEntry, optGlbPath, rawGlbPath, requireFile, run } = await import('./common.mjs');
  const entry = await manifestEntry(process.argv[2]);
  const raw = rawGlbPath(entry.id);
  requireFile(raw, `Run: node scripts/assets/export-glb.mjs ${entry.id}`);
  const out = optGlbPath(entry.id);
  for (const step of optimizeSteps(entry, raw, out)) run('npx', ['--no-install', 'gltf-transform', ...step]);
  console.log(`optimized GLB -> ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
