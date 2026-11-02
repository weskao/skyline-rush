#!/usr/bin/env bash
# CI half of .githooks/main-merge-guard: fail when a merge commit pushed to main merges anything but
# develop or hotfix/*. Usage: scripts/check-main-merges.sh <before-sha> <after-sha>
# Needs full history and origin/* refs (actions/checkout with fetch-depth: 0).
set -euo pipefail
before=$1 after=$2
if [[ ! $before =~ [1-9a-f] ]]; then echo "main was created by this push; nothing to compare"; exit 0; fi
# A merged parent qualifies only if it was once the tip of develop or a hotfix/* branch, i.e. it is on
# that branch's first-parent chain: a feature tip merged into develop is not, so it can't sneak in.
allowed=$(git for-each-ref --format='%(refname)' refs/remotes/origin/develop refs/remotes/origin/hotfix/ |
  xargs -r -n1 git rev-list --first-parent)
bad=0
for merge in $(git rev-list --first-parent --merges "$before..$after"); do
  read -r _ parents <<<"$(git log -1 --format=%P "$merge")"
  for parent in $parents; do
    grep -qx "$parent" <<<"$allowed" && continue
    git merge-base --is-ancestor "$parent" "$before" && continue # `git pull` merging main's own history
    echo "::error::merge $(git log -1 --format='%h %s' "$merge") brings in ${parent:0:8}, which is not develop or hotfix/*"
    bad=1
  done
done
if (( bad )); then echo "Only develop and hotfix/* may be merged into main; revert the merge and go through develop."; fi
exit "$bad"
