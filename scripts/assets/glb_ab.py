"""A/B a model's GLB across a builder change: same GLB at the base ref and in the working tree, or exit 1.

  python3 scripts/assets/glb_ab.py <id> [--base origin/develop]

Builds assets-src/<id>/<id>.blend with build.py twice (the base ref in a temporary worktree, then this tree), exports
both with export_glb.py and compares sha256. Blender writes different .blend bytes on every build, so the GLB is the
evidence; this tree's master is restored afterwards (its sha256 is pinned in the model manifest). Use it for every
refactor, move or new knob whose defaults must leave the model unchanged (.claude/rules/prop-reuse.md item 8).
BLENDER_BIN overrides the Blender path. Builds needing a separate bake first (cars) are out of scope.
"""
import argparse
import hashlib
import os
import subprocess
import sys
import tempfile

BLENDER = os.environ.get("BLENDER_BIN") or "/Applications/Blender.app/Contents/MacOS/Blender"
HERE = os.path.dirname(os.path.abspath(__file__))


def git(cwd, *args):
    return subprocess.run(["git", "-C", cwd, *args], check=True, capture_output=True, text=True).stdout.strip()


def blender(cwd, log, *args):
    with open(log, "w", encoding="utf-8") as f:
        done = subprocess.run([BLENDER, "--background", "--factory-startup", "--python", *args], cwd=cwd, stdout=f, stderr=subprocess.STDOUT)
    if done.returncode:
        with open(log, encoding="utf-8", errors="replace") as f:
            tail = f.read()[-2000:]
        raise SystemExit(f"Blender failed in {cwd} (log {log}):\n{tail}")


def build_and_export(tree, asset, out, tmp, tag):
    blender(tree, os.path.join(tmp, f"{tag}.build.log"), f"assets-src/{asset}/build.py")
    blender(tree, os.path.join(tmp, f"{tag}.export.log"), os.path.join(HERE, "export_glb.py"), "--",
            os.path.join(tree, "assets-src", asset, f"{asset}.blend"), out)
    with open(out, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest(), os.path.getsize(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("id")
    ap.add_argument("--base", default="origin/develop")
    a = ap.parse_args()
    tree = git(HERE, "rev-parse", "--show-toplevel")
    master = f"assets-src/{a.id}/{a.id}.blend"
    for path in (f"assets-src/{a.id}/build.py", master):
        if not os.path.isfile(os.path.join(tree, path)):
            raise SystemExit(f"{path} not found: glb_ab needs a Blender-built master")
    if not os.path.isfile(BLENDER):
        raise SystemExit(f"Blender not found at {BLENDER}: set BLENDER_BIN")
    if git(tree, "status", "--porcelain", "--", master):
        raise SystemExit(f"{master} has uncommitted changes; commit or restore it first (this run rebuilds it)")
    main_root = os.path.dirname(git(tree, "rev-parse", "--path-format=absolute", "--git-common-dir"))
    base_tree = os.path.join(main_root, ".claude", "worktrees", f"glb-ab-{a.id}")
    if os.path.exists(base_tree):
        raise SystemExit(f"{base_tree} exists (an earlier run?): remove it with git worktree remove --force")
    tmp = tempfile.mkdtemp(prefix=f"skyline-rush-glb-ab-{a.id}-")
    git(tree, "worktree", "add", "--detach", base_tree, a.base)
    try:
        print(f"building {a.id} at {a.base} ...", flush=True)
        base = build_and_export(base_tree, a.id, os.path.join(tmp, "base.glb"), tmp, "base")
    finally:
        git(tree, "worktree", "remove", "--force", base_tree)
    try:
        print(f"building {a.id} in {tree} ...", flush=True)
        work = build_and_export(tree, a.id, os.path.join(tmp, "work.glb"), tmp, "work")
    finally:
        git(tree, "checkout", "--", master)
    print(f"base {a.base}: {base[0]} ({base[1]} bytes)\nwork tree: {work[0]} ({work[1]} bytes)\nGLBs in {tmp}")
    left = git(tree, "status", "--short", "--", f"assets-src/{a.id}")
    if left:
        print(f"rebuilt files left in the tree:\n{left}")
    if base != work:
        print("DIFFERENT: the change alters the GLB")
        sys.exit(1)
    print("IDENTICAL")


main()
