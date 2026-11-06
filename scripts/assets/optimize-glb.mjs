// Contract §3 step 3: node scripts/assets/optimize-glb.mjs <id>
// Every `false` keeps named nodes, empty pivots and materials: the defaults would flatten/join nodes,
// merge materials into palettes and prune empty leaves.
import { manifestEntry, optGlbPath, rawGlbPath, requireFile, run } from './common.mjs';

const entry = await manifestEntry(process.argv[2]);
const raw = rawGlbPath(entry.id);
requireFile(raw, `Run: node scripts/assets/export-glb.mjs ${entry.id}`);
const out = optGlbPath(entry.id);
run('npx', ['--no-install', 'gltf-transform', 'optimize', raw, out, '--compress', 'meshopt', '--texture-compress', 'false',
  '--flatten', 'false', '--join', 'false', '--palette', 'false', '--simplify', 'false', '--instance', 'false', '--prune', 'false']);
console.log(`optimized GLB -> ${out}`);
