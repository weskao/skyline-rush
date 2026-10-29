# Skyline Rush Phase 5 — evidence audit (2026-10-29)

Source of truth: `feature/all-tracks-render-cache`, descendant of `feature/phase5-world-tour-polish`. This document distinguishes automated evidence from physical-device/manual acceptance.

## Verified automated work

- Phase 5 final HEAD `29b23fbc`: [CI 40814107324](https://github.com/weskao/skyline-rush/actions/runs/40814107324) success (unit/typecheck, Browser 8/8, World Tour 6/6, Cloud Save, quality gate).
- World Tour screen captures: 5 destinations × 4 viewport dimensions × showcase/race, plus Low/Medium/High reduced-motion captures (55 images), actual software-WebGL frames, deviceScaleFactor **0.25**. Examples: artifacts `world-tour-screenshots-4` in runs 40814107324 and 40836574538.
- World Tour tunnel-shell rhythm at 24m across 120m chunk seams: `tests/world-tour-tunnels.test.js`, included in successful Phase 5 unit tests; no independently observed tunnel-specific RED run.
- World Tour road ribbon/frame/physics parity: `tests/phase5-road-parity.test.js`; supported by five-track long mid-race shader/tunnel sweep and showcase multi-camera occlusion/landmark probes.
- CI snapshot: 35 structured per-track/viewport Draw Calls, Triangles, p50/p95 and FPS records created by browser shard 4 of [run 40836574538](https://github.com/weskao/skyline-rush/actions/runs/40836574538) at `21a04546`. This artifact does not establish entire final-head quality-gate success.
- Selected desktop (1440×900, Medium, DPR .25) **software-WebGL draw submissions**:

| World Tour | Before pool CI 40803061305 | Global pool CI 40814107324 | Spatial pool CI 40836574538 | Before → spatial | Spatial p95 ms |
|---|---:|---:|---:|---:|---:|
| Tokyo | 657 | 446 | 559 | −14.9% | 200.0 |
| Alpine | 447 | 339 | 386 | −13.6% | 183.4 |
| Taipei | 839 | 532 | 659 | −21.5% | 200.0 |
| Coastal | 538 | 380 | 452 | −16.0% | 216.6 |
| Cosmic | 438 | 301 | 362 | −17.4% | 150.0 |

**Important caveat:** spatially bounded pooling intentionally avoids oversized frustum-culling bounds, but its observed Draw Calls are 14–25% higher than the earlier *global* pooling version. Hardware performance and power cannot be inferred from these separate CI runs. Software-runner FPS/p95 is noisy; do not call this a proven physical FPS or temperature improvement. Triangles and screenshots must be reviewed alongside Draw Calls.

## Still awaiting acceptance

1. Actual physical iPhone/Android gameplay, thermal/battery/GPU-memory and comparable sustained FPS measurements, and accessible touch/assistive technology checks.
2. Manual sustained high-speed track-by-track signoff: Tokyo light/viaduct occlusion; Alpine rock bores/railway; Taipei street density/traffic; Coastal bridge and sea depth; Cosmic orbital banking/FLY/landing.
3. A controlled comparison of alternative global/spatial batch sizes on one real GPU or reproducible fixed-frame GPU benchmark. Preserve original visuals; optimize Draw Calls **and** culling/Triangles/p95.
4. Verify every required test including the exact *latest* All Tracks HEAD CI / quality gate, then non-force merge to main under user's standing approval.

See `TODO.md` for the corresponding independently checkable items. No physical device or manual signoff is claimed here.
