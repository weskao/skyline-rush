// Contract §3 step 2: node scripts/assets/export-glb.mjs <id>   (BLENDER_BIN overrides the Blender path)
// Exports assets-src/<id>/<id>.blend to a raw GLB in the OS temp dir.
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { blenderBin, manifestEntry, rawGlbPath, requireFile, root, run } from './common.mjs';

const entry = await manifestEntry(process.argv[2]);
const blender = blenderBin();
requireFile(blender, 'Set BLENDER_BIN.');
const master = join(root, entry.source.master);
requireFile(master, `Build it first: "$BLENDER_BIN" --background --factory-startup --python ${entry.source.script}`);
const out = rawGlbPath(entry.id);
run(blender, ['--background', '--factory-startup', '--python', 'scripts/assets/export_glb.py', '--', master, out]);
console.log(`raw GLB: ${statSync(out).size} bytes -> ${out}`);
