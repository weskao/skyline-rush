// Decides whether a change set needs the CI suites: docs/media-only diffs outside shipped and tested paths do not.
//   git diff --name-only A B | node scripts/ci-changes.mjs   prints true (run the suites) or false (docs/media only)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DOC_EXT = /\.(md|txt|log|png|jpe?g|gif|webp|svg|mp4|mov|webm)$/i;
// Shipped in the build, run as tests/CI, or read by a unit test; tests/ci-changes.test.js fails when a test reads a doc
// this list does not cover.
const NEEDS_CI = /^(src|public|tests|scripts|\.github)\/|^docs\/garage-release-policy\.md$|^wallet-sparkle-strip\.png$/;

// Makefile: dev-server shortcuts only; no CI job or test runs `make`.
export const docOnly = (path) => (DOC_EXT.test(path) || path === 'Makefile') && !NEEDS_CI.test(path);
// An empty diff is a `git commit --allow-empty` retrigger, so it still runs the suites.
export const needsCi = (paths) => paths.length === 0 || !paths.every(docOnly);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(String(needsCi(readFileSync(0, 'utf8').split('\n').filter(Boolean))));
}
