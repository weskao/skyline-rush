// Keeps README.zh-TW.md in step with README.md through a source hash on its first line.
//   node scripts/readme-zh.mjs check [--staged]  exit 1 when README.zh-TW.md is stale or misnames a game mode/button
//   node scripts/readme-zh.mjs sync  [--staged]  translate with `claude -p` when stale
//   node scripts/readme-zh.mjs stamp             mark a hand-edited translation as current
//   node scripts/readme-zh.mjs glossary          print the game's zh-TW names the translation must use
// --staged reads README.md from the git index, as the pre-commit hook needs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'README.md';
const TARGET = 'README.zh-TW.md';
// Screenshots captured in zh-TW by scripts/capture-og-images.mjs; the translated README shows these instead of the English ones.
const ZH_IMAGES = /artifacts\/(readme-startup|readme-start|readme-hero|mobile-flight|race-results)\.jpeg/g;
const MARKER = /^<!-- source-sha256: ([0-9a-f]{64}) [^\n]*-->\n/;
const PROMPT = `Translate the Markdown README on stdin from English into Traditional Chinese as written in Taiwan (zh-TW).
Keep unchanged: the Markdown structure and heading levels, tables, code blocks, inline code, URLs, image paths, file names,
localStorage keys, keyboard keys, product and track names, and on-screen labels written in capitals (START RACE, NITRO, AIRFLOW, ...).
Replace the line "**English** · [繁體中文](README.zh-TW.md)" with "[English](README.md) · **繁體中文**".
Output only the translated Markdown: no preamble, no closing remarks, no surrounding code fence.`;
// Modes and buttons the README names; the translation uses the game's own zh-TW labels, read from src/locales/.
const UI_KEYS = ['mode.classic', 'mode.custom', 'mode.free', 'mode.time', 'mode.gauntlet', 'mode.checkpoint', 'mode.cup',
  'mode.stunt', 'mode.elimination', 'mode.cleanRules', 'mode.cupResume', 'mode.cupDiscard', 'start.race', 'result.next',
  'result.again', 'track.choose', 'layout.edit', 'layout.done', 'layout.reset'];
const labelPairs = () => {
  const locales = readdirSync('src/locales').map(file => readFileSync(`src/locales/${file}`, 'utf8')).join('\n');
  return UI_KEYS.map(key => {
    // Each locale file lists its en block before its zh-TW block.
    const labels = [...locales.matchAll(new RegExp(`'${key.replaceAll('.', '\\.')}': '([^']*)'`, 'g'))]
      .map(match => match[1].replace(/ ·$/, ''));
    if (labels.length !== 2) throw new Error(`${key}: expected one en and one zh-TW label in src/locales/, found ${labels.length}.`);
    return labels;
  });
};
const glossary = () => labelPairs().map(([en, zh]) => `${en} → ${zh}`).join('; ');
const prompt = () => `${PROMPT}
Exception: name these game modes and buttons exactly as the game's zh-TW interface does (English → zh-TW): ${glossary()}.
Write Career and style stars as 生涯星數 and 風格星數.`;
// Each mode or button README.md names in bold must appear under the game's zh-TW name; a miss is a translation to fix.
const wrongNames = (english, chinese) => labelPairs()
  .filter(([en, zh]) => english.includes(`**${en}**`) && !chinese.includes(zh))
  .map(([en, zh]) => `${en} → ${zh}`);
const reportWrongNames = text => {
  const missing = wrongNames(source, text);
  if (missing.length) console.error(`${TARGET} does not use the game's zh-TW name for: ${missing.join('; ')}. Fix it, then: node scripts/readme-zh.mjs stamp`);
  return missing.length > 0;
};

const [mode = 'check', ...flags] = process.argv.slice(2);
const source = flags.includes('--staged')
  ? execFileSync('git', ['show', `:${SOURCE}`], { encoding: 'utf8' })
  : readFileSync(SOURCE, 'utf8');
const hash = createHash('sha256').update(source).digest('hex');
const marker = `<!-- source-sha256: ${hash} generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->\n`;
const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
const stale = current.match(MARKER)?.[1] !== hash;
const fences = text => (text.match(/^```/gm) || []).length;

if (mode === 'glossary') {
  console.log(glossary());
} else if (mode === 'check') {
  console.log(stale ? `${TARGET} is stale: README.md changed since it was generated.` : `${TARGET} is up to date.`);
  process.exit(stale || reportWrongNames(current) ? 1 : 0);
} else if (mode === 'stamp') {
  if (!current) throw new Error(`${TARGET} does not exist; run sync first.`);
  writeFileSync(TARGET, marker + current.replace(MARKER, ''));
  console.log(`${TARGET} marked as matching the current README.md.`);
} else if (mode === 'sync') {
  if (!stale) { console.log(`${TARGET} is up to date.`); process.exit(reportWrongNames(current) ? 1 : 0); }
  // Hooks are off so session-start context cannot leak into the translation.
  let translated;
  try {
    translated = execFileSync('claude', ['-p', prompt(), '--model', 'sonnet', '--settings', '{"disableAllHooks":true}'],
      { input: source, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024 }).trim();
  } catch (error) {
    console.error(error.code === 'ENOENT' ? 'claude CLI not found on PATH.' : `claude -p failed: ${error.message.split('\n')[0]}`);
    process.exit(1);
  }
  // A translation that lost its title or a code fence is a failed run, not a README.
  if (!translated.startsWith('# ') || fences(translated) !== fences(source)) {
    throw new Error(`claude -p returned something that is not a full README translation; ${TARGET} left unchanged.`);
  }
  const output = `${marker}${translated.replace(ZH_IMAGES, 'artifacts/$1.zh-TW.jpeg')}\n`;
  writeFileSync(TARGET, output);
  console.log(`${TARGET} regenerated from README.md.`);
  // Kept on disk so a hand fix plus stamp is cheaper than another translation run.
  if (reportWrongNames(output)) process.exit(1);
} else {
  console.error(`Unknown mode "${mode}". Use check, sync, stamp or glossary.`);
  process.exit(2);
}
