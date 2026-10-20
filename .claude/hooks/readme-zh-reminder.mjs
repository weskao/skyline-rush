// Stop: when a turn leaves README.md edited but README.zh-TW.md stale, send Claude back once to update it.
import { execFileSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;
if (JSON.parse(input || '{}').stop_hook_active) process.exit(0); // already sent back once this turn
const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (command, args) => { try { execFileSync(command, args, { cwd, stdio: 'ignore' }); return true; } catch { return false; } };
// Only README.md edits that are not committed yet; an older stale translation is the pre-commit hook's job.
if (run('git', ['diff', '--quiet', 'HEAD', '--', 'README.md'])) process.exit(0);
if (run('node', ['scripts/readme-zh.mjs', 'check'])) process.exit(0);
console.log(JSON.stringify({ decision: 'block', reason:
  'README.md changed, so README.zh-TW.md is stale. Update it before finishing: run `node scripts/readme-zh.mjs sync` '
  + '(translates with claude -p), or translate the changed parts by hand and run `node scripts/readme-zh.mjs stamp`.' }));
