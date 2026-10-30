// Release gate step: `node scripts/check-release-notes.mjs <version>` exits 1 unless the in-game
// What's New notes (src/release-notes.js) have a complete, player-readable, reviewed entry for the
// version being published. `--approve <version>` records the review once the copy passes.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RELEASE_NOTES, UPCOMING, compareVersions, releaseText, releaseImage, releaseHeroVideo } from '../src/release-notes.ts';

const LOCALES = ['en', 'zh-TW'];
const REVIEWS_FILE = new URL('./release-notes-reviews.json', import.meta.url);
// Words players should never need: build tooling, back-office setup, code structure, test and team process.
const DEVELOPER_TERMS = {
  en: /\b(?:ci|cd|tdd|refactor\w*|workflows?|(?:feature|main|release|dev) branch(?:es)?|servers?|readme|emulators?|(?:unit|browser|layout|e2e|regression|smoke) tests?|test-first|red-green|immutable|contracts?|logic|legacy|malformed|versioned|deterministic|acceptance|shards?|integrat\w*|agents?|fixtures?|upstream|normaliz\w*|callers?|checklists?|shaders?|firestore|firebase|schemas?|apis?|sdks?|back-?end|front-?end|databases?|db|server-side|endpoints?|admin|commits?|pull requests?|deploy\w*|pipelines?|vite|vue|three\.js|webgl|playwright|node\.js|npm|git(?:hub)?|repo\w*|localstorage|sessionstorage|config\w*|regressions?|unit tests?|test suites?|codebase|components?|modules?|variables?|json|null|undefined|nan|hotfix)\b/i,
  'zh-TW': /重構|後端|後台|後臺|前端|資料庫|架構|程式|原始碼|測試|部署|著色器|設定檔|伺服器|框架|函式|變數|模組|元件|演算法|分支|合併|規格|文件|種子|舊版相容|向下相容|待辦|代理|驗收|連接埠/
};
// Process labels are uppercase on purpose; lowercase "red" or "green" is ordinary player copy.
const PROCESS_LABELS = /\b(?:RED|GREEN|TODO|WIP|FIXME|P[0-3])\b/;
const LOOKS_LIKE = [
  ['a link', /\bhttps?:\/\/\S+|\bwww\.\S+|\blocalhost\b/i],
  ['an email address', /[\w.+-]+@[\w-]+\.\w+/],
  ['a secret', /\b(?:sk-|ghp_|ghs_|AKIA)\w+|\bBearer\s/],
  ['a file name', /\b(?:src|scripts|tests|public|docs)\/\S*|\b[\w-]+\.(?:m?js|ts|vue|css|html|json|md|sh|py|ya?ml)\b/],
  ['a code name', /\b(?!(?:mac|ipad|watch|tv)OS\b)[a-z]{2,}[A-Z]\w*|\b[A-Za-z]+_\w+|\b\w+\(\)/],
  ['a branch name', /\b(?:feature|fix|release|hotfix|main)\/[\w.-]+/],
  ['a version number', /\bv\d+(?:\.\d+)*\b|\b\d+\.\d+\.\d+\b/],
  ['a commit id', /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/]
];
const MAX_LENGTH = { en: { title: 48, description: 160 }, 'zh-TW': { title: 20, description: 70 } };

export function copyProblems(release) {
  const problems = [];
  for (const item of release.highlights ?? []) {
    for (const locale of LOCALES) {
      for (const field of ['title', 'description']) {
        const text = releaseText(item[field], locale), where = `${release.version} ${item.id} ${locale} ${field}`;
        const term = DEVELOPER_TERMS[locale].exec(text) ?? (locale === 'en' ? null : DEVELOPER_TERMS.en.exec(text)) ?? PROCESS_LABELS.exec(text);
        if (term) problems.push(`${where}: developer term "${term[0]}" — say what players can now do instead`);
        for (const [kind, pattern] of LOOKS_LIKE) {
          const hit = pattern.exec(text);
          if (hit) problems.push(`${where}: "${hit[0]}" looks like ${kind}; players never need it`);
        }
        if ([...text].length > MAX_LENGTH[locale][field]) problems.push(`${where}: too long (${[...text].length} > ${MAX_LENGTH[locale][field]}); keep the one thing players notice`);
      }
    }
  }
  return problems;
}

// Notes are drafted only from changes players can notice: feat, fix and perf commits outside tooling scopes.
const TOOLING_SCOPES = new Set(['dev', 'hooks', 'release', 'ci', 'build', 'test', 'tests', 'docs', 'readme', 'claude', 'todo', 'agent', 'agents', 'deps', 'tooling', 'lint', 'e2e', 'scripts']);
export const playerFacingChanges = subjects => subjects.filter(subject => {
  const match = /^(feat|fix|perf)(?:\(([^)]+)\))?!?: /.exec(subject);
  return match && !TOOLING_SCOPES.has(match[2]);
});

// Fingerprint of everything players read or watch, so an edit after review needs a new review.
// `video` is left out when absent so entries reviewed before videos existed keep their fingerprint.
export const reviewHash = release => crypto.createHash('sha256')
  .update(JSON.stringify({ version: release.version, image: release.image, video: release.video ?? undefined, highlights: release.highlights })).digest('hex').slice(0, 16);

const loadReviews = () => { try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); } catch { return {}; } };

// The entry for `target`: its own, or the upcoming one when `target` is newer than every versioned entry.
export const releaseEntryFor = (target, notes = RELEASE_NOTES) => notes.find(release => release.version === target)
  ?? (notes.every(release => release.version === UPCOMING || compareVersions(target, release.version) > 0)
    ? notes.find(release => release.version === UPCOMING) ?? null : null);

export function checkReleaseNotes(raw, { notes = RELEASE_NOTES, reviews = loadReviews() } = {}) {
  const target = String(raw ?? '').trim().replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(target)) return ['pass the release version, e.g. 0.22.0'];
  const problems = [];
  const entry = releaseEntryFor(target, notes);
  if (!entry) {
    problems.push(`no What's New entry for ${target}: add the player-facing notes to src/release-notes-data.ts as the version '${UPCOMING}' entry before publishing`);
  } else if (!reviews[target]) {
    problems.push(`${target}: notes not reviewed — run /review-release-notes ${target}`);
  } else if (reviews[target] !== reviewHash({ ...entry, version: target })) {
    problems.push(`${target}: notes changed since their review — run /review-release-notes ${target} again`);
  }
  // Archived entries stay checked too: their text and images remain in the repo.
  for (const release of notes) {
    if (!release.highlights?.length) problems.push(`${release.version}: no highlights`);
    problems.push(...copyProblems(release));
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
      for (const variant of release.video ? ['desktop', 'mobile'] : []) {
        const clip = releaseHeroVideo(release.video, locale, variant === 'mobile');
        if (!clip || ![clip.src, clip.poster].every(file => fs.existsSync(new URL(`../public/${file}`, import.meta.url)))) {
          problems.push(`${release.version}: ${locale} ${variant} video ${JSON.stringify(release.video[variant])} is not a file in public/ with a poster`);
        }
      }
    }
  }
  return problems;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url && process.argv[2] === '--changes') {
  // `--changes [since]`: what shipped since the last tag (or `since`), filtered to what players notice.
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const since = process.argv[3] || git('describe', '--tags', '--abbrev=0');
  console.log(playerFacingChanges(git('log', `${since}..HEAD`, '--no-merges', '--format=%s').split('\n')).join('\n'));
} else if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const approve = process.argv[2] === '--approve';
  const version = String(process.argv[approve ? 3 : 2] ?? '').replace(/^v/, '');
  const reviews = loadReviews(), entry = releaseEntryFor(version);
  if (approve && entry) reviews[version] = reviewHash({ ...entry, version });
  const problems = checkReleaseNotes(version, { reviews });
  for (const problem of problems) console.error(`check-release-notes: ${problem}`);
  if (approve && !problems.length) {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, Object.keys(reviews).sort(), 2) + '\n');
    console.log(`check-release-notes: recorded the review of ${version}; commit scripts/release-notes-reviews.json with the notes`);
  }
  process.exit(problems.length ? 1 : 0);
}
