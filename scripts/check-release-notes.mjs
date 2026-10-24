// Release gate step: `node scripts/check-release-notes.mjs <version>` exits 1 unless the in-game
// What's New notes (src/release-notes.js) have a complete entry for the version being published.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RELEASE_NOTES, releaseText, releaseImage } from '../src/release-notes.js';

const LOCALES = ['en', 'zh-TW'];

export function checkReleaseNotes(raw) {
  const target = String(raw ?? '').trim().replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(target)) return ['pass the release version, e.g. 0.22.0'];
  const problems = [];
  if (!RELEASE_NOTES.some(release => release.version === target)) {
    problems.push(`no What's New entry for ${target}: add player-facing notes to src/release-notes.js before publishing`);
  }
  // Archived entries stay checked too: their text and images remain in the repo.
  for (const release of RELEASE_NOTES) {
    if (!release.highlights?.length) problems.push(`${release.version}: no highlights`);
    for (const locale of LOCALES) {
      for (const item of release.highlights ?? []) {
        if (!releaseText(item.title, locale) || !releaseText(item.description, locale)) {
          problems.push(`${release.version} ${item.id}: missing ${locale} title or description`);
        }
      }
      for (const image of [release.image, ...(release.highlights ?? []).map(item => item.image)].filter(Boolean)) {
        const file = releaseImage(image, locale);
        if (!file || !fs.existsSync(new URL(`../public/${file}`, import.meta.url))) {
          problems.push(`${release.version}: ${locale} image ${JSON.stringify(image[locale] ?? image)} is not a file in public/`);
        }
      }
    }
  }
  return problems;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const problems = checkReleaseNotes(process.argv[2]);
  for (const problem of problems) console.error(`check-release-notes: ${problem}`);
  process.exit(problems.length ? 1 : 0);
}
