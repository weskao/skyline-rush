#!/usr/bin/env bash
# Release gate: the version needs What's New notes, and only a commit that sits on origin/main with a green CI
# run there may be tagged.
# A running CI run is waited for; any other shortfall exits 1 and says what to do. Run by scripts/release.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "release-gate: $*" >&2; exit 1; }

# Players read every release in the in-game What's New dialog, so notes come before the tag.
node scripts/check-release-notes.mjs "${1:-}" || fail "write the What's New notes for ${1:-this version} first (see CLAUDE.md)"

branch=$(git branch --show-current)
[[ $branch == main ]] || fail "on '${branch:-detached HEAD}'; release from main"
[[ -z $(git status --porcelain) ]] || fail "working tree is not clean"
git fetch -q origin main
sha=$(git rev-parse HEAD)
[[ $sha == $(git rev-parse origin/main) ]] || fail "local main is not origin/main; push or pull first"

while :; do
  info=$(gh run list --workflow ci.yml --branch main --commit "$sha" --limit 1 \
    --json databaseId,status,conclusion,url --jq '.[0] // empty | "\(.databaseId) \(.status) \(.conclusion) \(.url)"')
  [[ -n $info ]] || fail "no CI run for $sha on main; push it and let CI start"
  read -r id status conclusion url <<<"$info"
  [[ $status == completed ]] && break
  echo "release-gate: CI $status for $sha, waiting: $url"
  sleep 60
done
[[ $conclusion == success ]] || fail "CI $conclusion for $sha: $url — fix the cause, commit, push, wait for green, then release"
echo "release-gate: CI green for $sha ($url)"
npm test
npm run build
