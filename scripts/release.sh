#!/usr/bin/env bash
# `/release` runs this instead of the shared script: the CI gate first, then the shared release flow unchanged.
set -euo pipefail
"$(dirname "$0")/release-gate.sh"
exec "$HOME/.claude/scripts/release.sh" "$@"
