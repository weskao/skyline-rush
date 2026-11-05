#!/usr/bin/env python3
"""Phase 1 per-device acceptance for the three.js r186.1 upgrade (TODO.md steps D1-D7).

    python3 scripts/three-pipeline/phase1_device_check.py --alias "<generic model>"
    python3 scripts/three-pipeline/phase1_device_check.py --steps D4,D5 [--npm-ci] [--recapture-r180] [--no-capture]
    python3 scripts/three-pipeline/phase1_device_check.py --self-test

Run from any directory; every path resolves from this file. The report goes only to the gitignored
docs/designs/3d-pipeline/audits/ (device results are never committed). D8 (visual review) and D9 (real phones)
stay manual and are printed at the end. Standard library only.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDITS = ROOT / "docs" / "designs" / "3d-pipeline" / "audits"
BASELINE = AUDITS / "baseline"
TARGET, TYPES_TARGET = "0.186.1", "0.186.0"
R180_REF = "68675409"  # baseline capture fixes and r180 lockfile, before the upgrade
VIEWPORTS = ("phone", "desktop")
TRAFFIC_TOL = 0.10  # draw calls and triangles vary run to run with live traffic: warn, never fail
PERF_TOL = 0.05  # frame time may not be worse than r180 by more than this
LAUNCH_JS = ("import { chromium } from 'playwright-core';"
             "const browser = await chromium.launch({ channel: 'chrome', timeout: 30000 });"
             "console.log('chrome launched'); await browser.close();")
D4_SPECS = ["tests/shader-warmup-browser.spec.js", "tests/black-frame-browser.spec.js"]
PERF_LINE = re.compile(r"(\S+@\w+)\s+p50 ([\d.]+) ms · p95 ([\d.]+) ms · ([\d.]+) fps")
FAILED_TEST = re.compile(r"✘\s+\d+\s+(tests/\S+?\.spec\.js:\d+)")  # Playwright line reporter: "✘  8 tests/x.spec.js:572:1 › ..."
GUARDED_PATHS = ("src", "tests", "package.json", "package-lock.json")  # a change here mid-run invalidates the run


@dataclass
class Result:
    id: str
    name: str
    status: str  # PASS | FAIL | FLAKY (red in the full run, green alone) | SKIP
    detail: str = ""


def run(cmd: list[str], cwd: Path = ROOT, env: dict | None = None, timeout: int = 1800,
        on_line: Callable[[str], None] | None = None) -> tuple[int, str]:
    """Stream the command's output live; return (exit code, last 40 lines). `on_line` sees every line."""
    tail: list[str] = []
    # `make perf` prints "·" and PERF_LINE matches it: decode as UTF-8 whatever the host locale is.
    proc = subprocess.Popen(cmd, cwd=cwd, env={**os.environ, "LC_ALL": "en_US.UTF-8", **(env or {})}, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, encoding="utf-8", errors="replace")
    timer = threading.Timer(timeout, proc.kill)
    timer.start()
    try:
        for line in proc.stdout:
            print(line, end="")
            tail = (tail + [line.rstrip()])[-40:]
            if on_line:
                on_line(line)
        code = proc.wait()
    finally:
        timer.cancel()
    return code, "\n".join(tail)


def free_port() -> int:
    """5178, playwright.config.js's default, is often held by another session on a shared machine."""
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, encoding="utf-8", errors="replace").stdout.strip()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def playwright(specs: list[str], cwd: Path = ROOT, env: dict | None = None) -> tuple[int, str]:
    return run(["npx", "playwright", "test", *specs, "--reporter=line"], cwd=cwd, env=env)


# ---- pure logic (covered by --self-test) -------------------------------------------------------------------------

def compare(old_rows: list[dict], new_rows: list[dict]) -> tuple[list[str], list[str]]:
    """r180 rows vs r186 rows by scenario -> (failures, within-noise warnings)."""
    old = {row["scenario"]: row for row in old_rows}
    fails, warns = [], []
    for row in new_rows:
        name, before = row["scenario"], old.get(row["scenario"])
        if before is None:
            fails.append(f"{name}: no r180 row")
            continue
        for key in ("geometries", "programs"):
            if row[key] != before[key]:
                fails.append(f"{name} {key} {before[key]} -> {row[key]}")
        if row["textures"] != before["textures"] + 1:  # r186 adds one shared DFG lookup texture
            fails.append(f"{name} textures {before['textures']} -> {row['textures']} (expected +1)")
        if row.get("p95") and before.get("p95") and row["p95"] > before["p95"] * (1 + PERF_TOL):
            fails.append(f"{name} p95 {before['p95']} -> {row['p95']} ms")
        for key in ("drawCalls", "triangles"):
            if before[key] and abs(row[key] / before[key] - 1) > TRAFFIC_TOL:
                warns.append(f"{name} {key} {before[key]} -> {row[key]} ({row[key] / before[key] - 1:+.1%})")
    fails += [f"{name}: missing at r186" for name in old if name not in {r["scenario"] for r in new_rows}]
    return fails, warns


def parse_perf(text: str) -> list[tuple[str, float, float]]:
    """`make perf` summary lines -> [(build, p50, p95)], in print order (current first, then BASE)."""
    return [(m[1], float(m[2]), float(m[3])) for m in PERF_LINE.finditer(text.split("Median of")[-1])]


def classify_verify(code: int, changed: bool, failed: list[str], still_failing: list[str]) -> tuple[str, str]:
    """`make verify` outcome -> (status, detail). `failed` = specs red in the full run, `still_failing` = red again alone."""
    if changed:  # a rebase/stash/edit mid-run reloads the dev server and fails whatever test was running (seen 2026-11-06)
        return "FAIL", ("tree changed during the run (src/tests/package files), result not trustworthy: rerun when nothing else "
                        "touches the repo" + (f"; red meanwhile: {', '.join(failed)}" if failed else ""))
    if code == 0:
        return "PASS", ""
    if not failed:
        return "FAIL", "make verify failed outside a browser spec (see its output)"
    if still_failing:
        return "FAIL", f"red alone too: {', '.join(still_failing)}"
    return "FLAKY", f"red in the full run, green alone (timing or contention; find the race): {', '.join(failed)}"


def tree_fingerprint() -> str:
    """Hash of the guarded files as git sees them (index + unstaged diff); moves when anything edits or stashes them."""
    blob = git("ls-files", "-s", "--", *GUARDED_PATHS) + git("diff", "--", *GUARDED_PATHS)
    return hashlib.sha256(blob.encode()).hexdigest()


def busy_runs() -> list[str]:
    """Test runs already active (any session): a rebase or install now would corrupt them."""
    out = subprocess.run(["pgrep", "-fl", "playwright test|make verify|npm test"], capture_output=True,
                         encoding="utf-8", errors="replace").stdout
    return [line.strip() for line in out.splitlines() if "pgrep" not in line]


# ---- steps -------------------------------------------------------------------------------------------------------

def d1_install(args) -> Result:
    if args.npm_ci:
        code, _ = run(["npm", "ci", "--no-audit", "--no-fund"])
        if code:
            return Result("D1", "clean install", "FAIL", "npm ci failed")
    pkg = read_json(ROOT / "package.json")
    want = {"three": pkg["dependencies"]["three"], "@types/three": pkg["devDependencies"].get("@types/three", "")}
    got = {}
    for name in want:
        manifest = ROOT / "node_modules" / name / "package.json"
        got[name] = read_json(manifest)["version"] if manifest.exists() else "not installed"
    code, _ = run(["npm", "ls", "three", "@types/three"])
    ok = code == 0 and got == want and want == {"three": TARGET, "@types/three": TYPES_TARGET}
    return Result("D1", "clean install", "PASS" if ok else "FAIL", f"installed {got}, package.json {want}")


def d2_browser_launch(_args) -> Result:
    code, _ = run(["node", "--input-type=module", "-e", LAUNCH_JS], timeout=60)
    return Result("D2", "browser launch", "PASS" if code == 0 else "FAIL",
                  "Chrome launched" if code == 0 else "Chrome did not launch within 30 s; no spec result is trustworthy")


def r180_worktree() -> Path:
    short = git("rev-parse", "--short", f"{R180_REF}^{{commit}}")
    if not short:
        raise RuntimeError(f"{R180_REF} is not in this clone (git fetch first)")
    wt = ROOT / ".claude" / "worktrees" / f"perf-{short}"  # same path scripts/perf.mjs --base uses
    if not wt.exists():
        subprocess.run(["git", "worktree", "add", "--detach", str(wt), short], cwd=ROOT, check=True)
    for marker, cmd in (("node_modules", ["npm", "ci", "--no-audit", "--no-fund"]), ("dist/index.html", ["npm", "run", "build"])):
        if not (wt / marker).exists() and run(cmd, cwd=wt)[0]:
            raise RuntimeError(f"{' '.join(cmd)} failed in the r180 worktree")
    return wt


def capture(label: str, cwd: Path) -> list[str]:
    failed = []
    for viewport in VIEWPORTS:
        env = {"THREE_BASELINE": "1", "LABEL": label, "VIEWPORT": viewport, "RACE_SECONDS": "4"}
        if playwright(["tests/three-baseline-browser.spec.js"], cwd, env)[0]:
            failed.append(viewport)
    return failed


def d3_r180_baseline(args) -> Result:
    have = all((BASELINE / f"r180-{v}" / "metrics.json").exists() for v in VIEWPORTS)
    if have and not args.recapture_r180:
        return Result("D3", "own r180 baseline", "PASS", "already captured on this device")
    wt = r180_worktree()
    failed = capture("r180", wt)
    if failed:
        return Result("D3", "own r180 baseline", "FAIL", f"capture failed: {', '.join(failed)}")
    shutil.copytree(wt / "docs" / "designs" / "3d-pipeline" / "audits" / "baseline", BASELINE, dirs_exist_ok=True)
    return Result("D3", "own r180 baseline", "PASS", f"captured from {R180_REF}")


def d4_specs(args) -> Result:
    specs = [s for s in args.specs.split(",") if s] or D4_SPECS  # --specs reruns any spec or file:line alone
    code, _ = playwright(specs)
    return Result("D4", "shader warmup + black frame" if specs == D4_SPECS else "specs", "PASS" if code == 0 else "FAIL",
                  f"{len(specs)} spec(s)" if code == 0 else "spec failed")


def d5_capture_compare(args) -> Result:
    if not args.no_capture:
        failed = capture("r186", ROOT)
        if failed:
            return Result("D5", "r186 capture vs r180", "FAIL", f"capture failed: {', '.join(failed)}")
    fails, warns = [], []
    for viewport in VIEWPORTS:
        old, new = (BASELINE / f"{label}-{viewport}" / "metrics.json" for label in ("r180", "r186"))
        if not (old.exists() and new.exists()):
            return Result("D5", "r186 capture vs r180", "FAIL", f"missing metrics for {viewport} (run D3 and capture)")
        f, w = compare(read_json(old)["rows"], read_json(new)["rows"])
        fails += [f"{viewport} {x}" for x in f]
        warns += [f"{viewport} {x}" for x in w]
    detail = "; ".join(fails[:6]) if fails else "geometries/programs equal, textures +1, p95 not worse"
    if warns:
        detail += f" | {len(warns)} draw-call/triangle deltas beyond ±{TRAFFIC_TOL:.0%} (live-traffic noise, review): " + "; ".join(warns[:4])
    return Result("D5", "r186 capture vs r180", "FAIL" if fails else "PASS", detail)


def d6_perf(_args) -> Result:
    code, tail = run(["make", "perf", "VIEWPORT=desktop", "RATE=6", "ROUNDS=3", f"BASE={R180_REF}"])
    builds = parse_perf(tail)
    if code or len(builds) != 2:
        return Result("D6", "make perf vs r180", "FAIL", "make perf failed or printed no A/B summary")
    (_, p50, p95), (_, base50, base95) = builds
    ok = p50 <= base50 * (1 + PERF_TOL) and p95 <= base95 * (1 + PERF_TOL)
    return Result("D6", "make perf vs r180", "PASS" if ok else "FAIL", f"r186 p50 {p50} / p95 {p95} ms; r180 p50 {base50} / p95 {base95} ms")


def d7_verify(_args) -> Result:
    if busy := busy_runs():
        return Result("D7", "make verify", "FAIL", f"another test run is active, not starting a second: {busy[0]}")
    start, changed, stop = tree_fingerprint(), threading.Event(), threading.Event()

    def watch() -> None:
        while not stop.wait(5):
            if tree_fingerprint() != start:
                changed.set()
                return

    threading.Thread(target=watch, daemon=True).start()
    failed: list[str] = []
    code, _ = run(["make", "verify"], timeout=5400, on_line=lambda line: failed.extend(FAILED_TEST.findall(line)))
    stop.set()
    failed = list(dict.fromkeys(failed))
    # shortcut: reruns use the default Playwright config only; a World Tour spec failure needs its own config rerun by hand
    still_failing = [spec for spec in failed if playwright([spec])[0]] if not changed.is_set() else []
    status, detail = classify_verify(code, changed.is_set(), failed, still_failing)
    return Result("D7", "make verify", status, detail)


STEPS = {"D1": d1_install, "D2": d2_browser_launch, "D3": d3_r180_baseline, "D4": d4_specs,
         "D5": d5_capture_compare, "D6": d6_perf, "D7": d7_verify}


def self_test() -> None:
    ok = {"scenario": "coast-road", "geometries": 534, "programs": 51, "textures": 17, "drawCalls": 500, "triangles": 100000, "p95": 16.7}
    same = {**ok, "textures": 18}
    assert compare([ok], [same]) == ([], [])
    assert compare([ok], [{**same, "geometries": 535}])[0] == ["coast-road geometries 534 -> 535"]
    assert compare([ok], [{**ok}])[0], "textures must be exactly +1"
    assert compare([ok], [{**same, "p95": 17.8}])[0], "p95 regression must fail"
    assert compare([ok], [{**same, "triangles": 120000}]) == ([], ["coast-road triangles 100000 -> 120000 (+20.0%)"])
    assert compare([ok], [])[0] == ["coast-road: missing at r186"]
    sample = ("round 1 x\nMedian of 3 rounds, CPU throttled 6x:\n"
              "  current@67fc5218  p50 16.7 ms · p95 16.8 ms · 59.3 fps\n  main@abcd1234  p50 16.7 ms · p95 16.7 ms · 59.2 fps")
    assert parse_perf(sample) == [("current@67fc5218", 16.7, 16.8), ("main@abcd1234", 16.7, 16.7)]
    assert 1024 <= free_port() <= 65535
    line = "  ✘    8 tests/browser.spec.js:572:1 › a complete 5 km sprint reaches results (1.7m)"
    assert FAILED_TEST.findall(line) == ["tests/browser.spec.js:572"]
    assert FAILED_TEST.findall("  ✓    9 tests/browser.spec.js:620:1 › ok") == []
    assert classify_verify(0, False, [], []) == ("PASS", "")
    assert classify_verify(0, True, [], [])[0] == "FAIL", "a changed tree voids even a green run"
    assert classify_verify(2, True, ["a:1"], [])[0] == "FAIL"
    assert classify_verify(2, False, [], [])[0] == "FAIL"
    assert classify_verify(2, False, ["a:1"], ["a:1"]) == ("FAIL", "red alone too: a:1")
    assert classify_verify(2, False, ["a:1"], [])[0] == "FLAKY"
    assert isinstance(busy_runs(), list) and len(tree_fingerprint()) == 64
    print("self-test OK")


def write_report(alias: str, results: list[Result]) -> Path:
    slug = re.sub(r"[^a-z0-9._-]+", "-", alias.lower()).strip("-") or "local-device"
    AUDITS.mkdir(parents=True, exist_ok=True)
    path = AUDITS / f"{datetime.date.today()}-phase1-{slug}.md"
    dirty = "dirty (not exact-HEAD evidence)" if git("status", "--porcelain") else "clean"
    lines = [f"# Phase 1 device check — {datetime.date.today()}", "",
             f"- Device: {alias}; HEAD {git('rev-parse', '--short', 'HEAD')} ({dirty}); local only, Git-ignored", "",
             "| ID | Step | Result | Evidence |", "|---|---|---|---|"]
    lines += [f"| {r.id} | {r.name} | {r.status} | {r.detail} |" for r in results]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--alias", default="local-device", help="generic model name only, e.g. 'Mac mini'")
    parser.add_argument("--steps", default=",".join(STEPS), help="comma list, default all of D1-D7")
    parser.add_argument("--npm-ci", action="store_true", help="D1: really reinstall node_modules first")
    parser.add_argument("--recapture-r180", action="store_true", help="D3: capture again even if a baseline exists")
    parser.add_argument("--no-capture", action="store_true", help="D5: only compare the metrics already on disk")
    parser.add_argument("--specs", default="", help="D4: comma list of specs or tests/x.spec.js:LINE to run alone instead of the default pair")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # step details and child output contain "·" and "±"
    if args.self_test:
        self_test()
        return 0
    os.environ.setdefault("PLAYWRIGHT_PORT", str(free_port()))  # one port for every step; an explicit value wins
    wanted = [s.strip().upper() for s in args.steps.split(",") if s.strip()]
    if bad := [s for s in wanted if s not in STEPS]:
        parser.error(f"unknown step(s): {', '.join(bad)}")
    if missing := [t for t in ("git", "node", "npm", "npx", "make") if not shutil.which(t)]:
        parser.error(f"missing tools: {', '.join(missing)}")

    results, blocked = [], ""
    for step in wanted:
        if blocked and step not in ("D1", "D2"):
            results.append(Result(step, STEPS[step].__name__, "SKIP", f"blocked by {blocked}"))
            continue
        print(f"\n=== {step} ===")
        try:
            result = STEPS[step](args)
        except Exception as error:  # a crashed step is a FAIL with its reason, never a silent skip
            result = Result(step, STEPS[step].__name__, "FAIL", f"{type(error).__name__}: {error}")
        results.append(result)
        if step in ("D1", "D2") and result.status == "FAIL":
            blocked = step
    print("\n" + "\n".join(f"{r.id}  {r.status:<4}  {r.name}: {r.detail}" for r in results))
    print(f"\nreport: {write_report(args.alias, results).relative_to(ROOT)} (local only)")
    print("manual: D8 compare docs/designs/3d-pipeline/audits/baseline/r180-* with r186-* screenshots (Garage paint and glass "
          "first); D9 `make perf-phone` on each physical phone used for QA")
    return 0 if all(r.status == "PASS" for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
