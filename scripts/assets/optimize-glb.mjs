// Contract §3 step 3: node scripts/assets/optimize-glb.mjs <id>
// Every `false` keeps named nodes, empty pivots and materials: the defaults would flatten/join nodes,
// merge materials into palettes and prune empty leaves.
// Entries listing the `ktx2` decoder then get KTX2 textures (needs KTX-Software `ktx` on PATH):
// UASTC for linear data maps (normal/AO/metal-rough keep detail), ETC1S for sRGB colour maps.
import { fileURLToPath } from 'node:url';

const KTX2_PASSES = [
  ['uastc', 'normalTexture', '--level=2', '--zstd=18'],
  ['uastc', 'occlusionTexture', '--level=2', '--zstd=18', '--rdo'], // smooth map: RDO saves ~30 KB at no visible cost
  ['uastc', 'metallicRoughnessTexture', '--level=2', '--zstd=18'],
  ['etc1s', 'baseColorTexture'],
  ['etc1s', 'emissiveTexture'],
];

/** gltf-transform argv lists, in order; each step reads the previous step's output. */
export function optimizeSteps(entry, raw, out, { lod } = {}) {
  // KTX2 runs before meshopt: encoding textures after meshopt decodes and re-quantizes the meshes.
  // One pass per slot with `--opt=value`: a `{a,b}` slot glob only matched one slot, and
  // `--opt value` after --slots fails with "Too many arguments".
  const passes = entry.decoders.includes('ktx2') ? KTX2_PASSES : [];
  const steps = [];
  let input = raw;
  if (lod === 'low') {
    // Low LOD: fewer triangles per mesh (nodes/pivots untouched; borders locked so atlas seams hold), half-size textures.
    steps.push(['simplify', input, `${out}.simplify.glb`, '--ratio=0.5', '--error=0.01', '--lock-border']);
    steps.push(['resize', `${out}.simplify.glb`, `${out}.resize.glb`, '--width=512', '--height=512']);
    input = `${out}.resize.glb`;
  }
  for (const [i, [mode, slot, ...opts]] of passes.entries()) {
    const output = `${out}.ktx${i}.glb`;
    steps.push([mode, input, output, `--slots=${slot}`, ...opts]);
    input = output;
  }
  steps.push(['optimize', input, out, '--compress', 'meshopt', '--texture-compress', 'false',
    '--flatten', 'false', '--join', 'false', '--palette', 'false', '--simplify', 'false', '--instance', 'false', '--prune', 'false']);
  return steps;
}

async function main() {
  const { lodArg, manifestEntry, optGlbPath, rawGlbPath, requireFile, run } = await import('./common.mjs');
  const entry = await manifestEntry(process.argv[2]);
  const lod = lodArg(process.argv.slice(3));
  const raw = rawGlbPath(entry.id);
  requireFile(raw, `Run: node scripts/assets/export-glb.mjs ${entry.id}`);
  const out = optGlbPath(lod ? `${entry.id}-${lod}` : entry.id);
  for (const step of optimizeSteps(entry, raw, out, { lod })) run('npx', ['--no-install', 'gltf-transform', ...step]);
  console.log(`optimized GLB -> ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
