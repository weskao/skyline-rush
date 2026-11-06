#!/usr/bin/env python3
"""Phase 1 by-project checks for the three.js r186.1 upgrade (Task 2), P0-P5 in order.

    python3 scripts/three-pipeline/phase1_project_check.py            # P0-P5
    python3 scripts/three-pipeline/phase1_project_check.py --steps P2,P3
    python3 scripts/three-pipeline/phase1_project_check.py --self-test

Safe for an AI agent to run directly: it changes nothing but the checkout (a rebase pull) and
node_modules, never commits or pushes. Stops at the first FAIL. When every step passes it prints the
commit + push commands for the upgrade; run those only when the user asks to commit.
"""
from __future__ import annotations

import argparse
import sys

from phase1_device_check import ROOT, busy_runs, run  # sibling module; stdlib only

STEPS = {
    "P0": ("sync with remote (rebase pull, local edits autostashed)", ["git", "pull", "--rebase", "--autostash"]),
    "P1": ("clean install from the lockfile", ["npm", "ci"]),
    "P2": ("three-version contract GREEN", ["node", "--test", "tests/three-version-contract.test.js"]),
    "P3": ("typecheck", ["npm", "run", "typecheck"]),
    "P4": ("unit tests", ["npm", "test"]),
    "P5": ("production build", ["npm", "run", "build"]),
}
COMMIT = ("git add package.json package-lock.json && "
          "git commit -m 'build(deps): upgrade three to 0.186.1 + @types/three 0.186.0' && git push")


def parse_steps(text: str) -> list[str]:
    steps = [s.strip().upper() for s in text.split(",") if s.strip()]
    unknown = [s for s in steps if s not in STEPS]
    if unknown:
        raise SystemExit(f"unknown step(s): {', '.join(unknown)}; choose from {', '.join(STEPS)}")
    return sorted(steps, key=list(STEPS).index)


def self_test() -> None:
    assert parse_steps("p3, P1") == ["P1", "P3"]
    assert parse_steps(",".join(STEPS)) == list(STEPS)
    try:
        parse_steps("P9")
    except SystemExit:
        pass
    else:
        raise AssertionError("unknown step accepted")
    print("self-test ok")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--steps", default=",".join(STEPS), help="comma list, default all of P0-P5")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    steps = parse_steps(args.steps)
    # P0 rebases/autostashes and P1 reinstalls: either one rewrites package.json mid-run and fails whatever test is running.
    if busy := busy_runs():
        print(f"A test run is active, not touching the checkout: {busy[0]}", file=sys.stderr)
        return 1
    for step in steps:
        name, cmd = STEPS[step]
        print(f"\n=== {step} {name}: {' '.join(cmd)}", flush=True)
        code, tail = run(cmd, cwd=ROOT)
        if code:
            # A P0 rebase conflict leaves the rebase open: resolve it (keep both sides) and `git rebase --continue`.
            print(f"\n{step} FAIL (exit {code}); stopped. Fix it, then rerun from {step}.", file=sys.stderr)
            return 1
        print(f"{step} PASS")
    if steps == list(STEPS):
        print(f"\nAll steps passed. Next, only when asked to commit:\n  {COMMIT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
