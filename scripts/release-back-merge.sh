#!/usr/bin/env bash
# Git flow back-merge after a release: push a merge of origin/main into origin/develop so the
# `docs: release …` commit reaches develop. The merge is built with merge-tree, so no worktree's
# checkout changes; a conflict or rejected push leaves develop untouched and prints the manual steps.
set -euo pipefail
manual="git switch develop && git pull && git merge --no-ff origin/main && git push origin develop"
warn() { echo "⚠️  main → develop back-merge not done: $1. Merge it by hand: $manual" >&2; exit 1; }

git ls-remote --exit-code --heads origin develop >/dev/null || { echo "no develop branch; back-merge skipped"; exit 0; }
git fetch -q origin main develop
if git merge-base --is-ancestor origin/main origin/develop; then echo "develop already contains main"; exit 0; fi
tree=$(git merge-tree --write-tree origin/develop origin/main) || warn "main and develop conflict"
commit=$(git commit-tree "$tree" -p origin/develop -p origin/main -m "Merge branch 'main' into develop")
git push -q origin "$commit:refs/heads/develop" || warn "push to develop was rejected"
echo "✓ merged main into develop ($(git rev-parse --short "$commit")); run git pull in the develop checkout"
