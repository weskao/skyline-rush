# Task 1 — Characterize r180 visuals and performance; add RED compatibility tests

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec Phase 1 (baseline) · Scope tags: [README.md](README.md).

**Files:** tests/three-version-contract.test.js (planned new); tests/shader-warmup-browser.spec.js; tests/black-frame-browser.spec.js; src/world.js read-only baseline; new evidence doc under docs/designs/3d-pipeline/.
**Produces:** reproducible r180 acceptance baseline and real RED evidence tied to a specific compatibility assertion.

## By project (committed once)
- [ ] Read scoped rules and current HEAD; gather exact import API inventory and known material/lighting behavior, Game/Garage/track metrics.
- [ ] Write a targeted failing test for requested r186 compatibility or type/version alignment; record actual observed failure before changing code.
- [ ] Confirm existing physics/animation contract assertions and shader warmup/black-frame tests stay meaningful.
- [ ] Commit tests and baseline documentation; no production engine change yet. The committed baseline doc carries only device-class labels (desktop / phone) and tier, never machine identifiers.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Capture true WebGL screenshots and renderer metrics at same settings on Garage, Coast, Sky Spiral and World Tour; include desktop/phone (`make phone-diag`) and NITRO/FLY/landing.
- [ ] Record raw numbers (resolution, FPS, p50/p95, GPU) in that device's `../audits/YYYY-MM-DD-<device-alias>.md`; a baseline captured on one device is not reused on another.
