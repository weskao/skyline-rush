// Keeps README.zh-TW.md in step with README.md through a source hash on its first line.
//   node scripts/readme-zh.mjs check [--staged]  exit 1 when README.zh-TW.md is stale
//   node scripts/readme-zh.mjs sync  [--staged]  translate with `claude -p` when stale
//   node scripts/readme-zh.mjs stamp             mark a hand-edited translation as current
// --staged reads README.md from the git index, as the pre-commit hook needs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'README.md';
const TARGET = 'README.zh-TW.md';
// Screenshots captured in zh-TW by scripts/capture-og-images.mjs; the translated README shows these instead of the English ones.
const ZH_IMAGES = /artifacts\/(readme-start|readme-hero|mobile-flight|race-results)\.jpeg/g;
const MARKER = /^<!-- source-sha256: ([0-9a-f]{64}) [^\n]*-->\n/;
const PROMPT = `Translate the Markdown README on stdin from English into Traditional Chinese as written in Taiwan (zh-TW).
Keep unchanged: the Markdown structure and heading levels, tables, code blocks, inline code, URLs, image paths, file names,
localStorage keys, keyboard keys, product and track names, and on-screen labels written in capitals (START RACE, NITRO, AIRFLOW, ...).
Replace the line "**English** · [繁體中文](README.zh-TW.md)" with "[English](README.md) · **繁體中文**".
Output only the translated Markdown: no preamble, no closing remarks, no surrounding code fence.`;

const [mode = 'check', ...flags] = process.argv.slice(2);
const source = flags.includes('--staged')
  ? execFileSync('git', ['show', `:${SOURCE}`], { encoding: 'utf8' })
  : readFileSync(SOURCE, 'utf8');
const hash = createHash('sha256').update(source).digest('hex');
const marker = `<!-- source-sha256: ${hash} generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->\n`;
const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
const stale = current.match(MARKER)?.[1] !== hash;
const fences = text => (text.match(/^```/gm) || []).length;

if (mode === 'check') {
  console.log(stale ? `${TARGET} is stale: README.md changed since it was generated.` : `${TARGET} is up to date.`);
  process.exit(stale ? 1 : 0);
} else if (mode === 'stamp') {
  if (!current) throw new Error(`${TARGET} does not exist; run sync first.`);
  writeFileSync(TARGET, marker + current.replace(MARKER, ''));
  console.log(`${TARGET} marked as matching the current README.md.`);
} else if (mode === 'sync') {
  if (!stale) { console.log(`${TARGET} is up to date.`); process.exit(0); }
  // Hooks are off so session-start context cannot leak into the translation.
  let translated;
  try {
    translated = execFileSync('claude', ['-p', PROMPT, '--model', 'sonnet', '--settings', '{"disableAllHooks":true}'],
      { input: source, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024 }).trim();
  } catch (error) {
    console.error(error.code === 'ENOENT' ? 'claude CLI not found on PATH.' : `claude -p failed: ${error.message.split('\n')[0]}`);
    process.exit(1);
  }
  // A translation that lost its title or a code fence is a failed run, not a README.
  if (!translated.startsWith('# ') || fences(translated) !== fences(source)) {
    throw new Error(`claude -p returned something that is not a full README translation; ${TARGET} left unchanged.`);
  }
  writeFileSync(TARGET, `${marker}${translated.replace(ZH_IMAGES, 'artifacts/$1.zh-TW.jpeg')}\n`);
  console.log(`${TARGET} regenerated from README.md.`);
} else {
  console.error(`Unknown mode "${mode}". Use check, sync or stamp.`);
  process.exit(2);
}
