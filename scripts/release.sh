#!/usr/bin/env bash
# `/release` runs this instead of the shared script: the gate (What's New notes, then CI) first, then the shared release
# flow unchanged, then the main → develop back-merge. The tag is already published by then, so a failed back-merge only warns.
set -euo pipefail
"$(dirname "$0")/release-gate.sh" "$@"
"$HOME/.claude/scripts/release.sh" "$@"
"$(dirname "$0")/release-back-merge.sh" || true
