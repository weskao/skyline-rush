# Phase 5 — World Tour visual, road geometry and minimap polish

Date: 2026-10-29
Base: main `7b1785e6d98361d1be1b7da75e6cdf4479250a63`
Branch: `feature/phase5-world-tour-polish`

## Scope and invariants
Polish Taipei Heritage, Tokyo Afterdark, Alpine Rail Pass, Coastal Horizon and Cosmic Orbit, in that implementation order after Tokyo and Alpine. Retain existing race modes, skills and saved progress. Use Vue 3 + strict TypeScript for UI/new domain logic. Existing WebGL renderer and physics JS remain deliberate exceptions. Preserve `trackPoint`, `trackFrame`, `trackOverview`, track length, centreline, checkpoints and shortcuts unless route versioning/ghost/history compatibility is designed **before** modifying any of them. Do not add a second minimap engine or dependencies.

## TDD tasks (RED → GREEN → REFACTOR and individual commits)
1. **Audit/baseline:** inspect existing world-tour scene, tunnel, terrain, route-map, test and CI contracts; obtain real WebGL screenshot baselines and device/quality/perf measurements. Track anything not measured as pending.
2. **Tokyo:** test actual 120 m streamed tunnel shell placements against the 24 m world-space segment rhythm across chunk boundaries. Confirm RED, then fix *shared* tunnel placement using absolute `section.from` instead of per-chunk `from`. Re-test Tokyo tunnel/overpass, road clearance and minimap/camera. Tests: `tests/world-tour-tunnels.test.js`, existing World Tour/browser suite.
3. **Alpine:** apply same regression to both rock-bore sections, test terrain/cliff seam and rail clearance, assess any truly necessary bounded art tuning. Preserve vehicle pose and physics unless a failing test demonstrates a defect. Tests: `tests/world-tour-visual-polish.test.js`, `tests/world-tour-scene.test.js`, browser WebGL/drive.
4. **Taipei:** validate city prop occlusion and landmark readability, crossings, lane markers, real-WebGL comparisons, route map. No cosmetic changes without inspected evidence.
5. **Coastal:** check ocean/bridge scenery, road-edge readability and high-speed approach, render cost. Avoid new water shaders unless justified.
6. **Cosmic:** check orbital edge cues and car pose; test any altitude/heading minimap annotation using only `trackOverview`/cached route coordinates.
7. **Full regression & performance:** compare exact same viewports/quality/locale/reduced-motion at 1440x900, 390x844, 320x740, 844x390, all five showcase and race views. Record before/after FPS, frame-time p50/p95, draw calls/triangles and available memory. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour config, Cloud Save and exact-final-HEAD GitHub quality-gate. Verify latest main integrated. No PR/force push/merge without user approval.

## Acceptance / evidence ledger
Each subtask remains unchecked in TODO.md until tests are observed GREEN and *real* WebGL images are inspected. Historical RED evidence and current GREEN evidence must refer to specific SHA/run URLs. Browser/CI is not real-device battery or thermal evidence. A viewport screenshot is not proof of collision or camera clearance under steering. Final merge-ready is **false** until all required evidence is obtained.

## Simplification decisions
- Do not redesign road topology by default: this would otherwise invalidate record/Ghost versioning and exceed this art pass.
- Fix absolute-distance scenery defects once in the existing `createTunnelKit`; preserve five authored tunnel variants.
- Reuse existing cached route SVG, world-tour props, renderer quality tiers, frame pacing and fixture/probe tests. No new dependency.
