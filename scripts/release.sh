#!/usr/bin/env bash
# `/release` runs this instead of the shared script: the gate (What's New notes, then CI) first, then the shared release flow unchanged.
set -euo pipefail
"$(dirname "$0")/release-gate.sh" "$@"
exec "$HOME/.claude/scripts/release.sh" "$@"
