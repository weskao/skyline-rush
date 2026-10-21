# Skyline Rush — Claude Code Project Instructions

## Project context

Skyline Rush is a browser-based 3D arcade racing game built with Vue 3, Vite, Three.js, and native JavaScript modules. Gameplay simulation lives in `src/game.js`; rendering, effects, and camera work live in `src/world.js`, `src/effects.js`, and `src/aero-vfx.js`. UI is in `src/App.vue`, `src/main.js`, and `src/style.css`.

- Require Node.js >= 22.12.
- Preserve existing tracks, touch controls, NITRO/FLY/BOOST, saved race history, Garage paints, and browser support.
- Prefer incremental changes with deterministic unit tests and browser regression coverage.

## Local development vs. all-unlocked testing

Use these project-root commands:

| Command | Purpose |
| --- | --- |
| `make` or `make dev` | Normal localhost Vite development, respecting saved progression |
| `make dev-unlocked` | **Local-only all-unlocked Vite server** for testing tracks and Garage paints |
| `make test-unlocked` | Alias for `make dev-unlocked`; starts a server, **not** the test runner |
| `npm test` | Deterministic Node unit tests |
| `npm run build` | Production build with a release-bundle safety assertion |
| `npm run test:browser` | Playwright browser suite; its pretest builds production assets |
| `make run` | Unit + browser tests |
| `make deploy` | Trigger the existing CI-based GitHub Pages deployment for remote `main` |

All-unlocked preview exposes every entry currently defined in `RACE_TRACKS` and `PAINTS`. It does **not** award actual achievements, fill scoreboards, grant NITRO, or change saved progress. Do not set or overwrite `localStorage` to simulate paid entitlements or create persistent full unlocks.

### Mandatory build-time separation

The test-only unlock implementation **must not ship to production**:

- `src/main.js` imports a stable `@progression-access` module.
- `vite.config.js` resolves it to `src/access/production.js` for normal development and release builds.
- `make dev-unlocked` uses `vite.unlocked.config.js`, resolving it instead to `src/access/dev-unlocked.js` **only while serving localhost**.
- `vite.unlocked.config.js` must continue to reject `build` commands.
- `npm run build` must continue running `scripts/assert-production-locked.mjs` to check the emitted `dist/` assets.

Do **not** replace this separation with runtime `if (dev)`, URL/query parameters, `import.meta.env` flags, browser console commands, or a publicly shipped toggle. Keep CI, releases, GitHub Pages, and all distributable assets on the production configuration. Do not make the dev-unlocked alias available via a production or publicly accessible preview build.

When changing unlocks, content catalogs, aliases, build scripts, or Vite configuration, verify both the standard and local modes, and inspect the production bundle for leakage. The release check is a guardrail; it is not an authorization system.

**Important commercial security boundary:** Current race progress and cosmetic unlocks are client-side, with `localStorage` persistence. They can be modified by users; removing the developer bypass from the bundle **does not make paid content secure**. Before monetizing maps, cars, cosmetics, or other content, implement authenticated server-side entitlement checks and server-side purchase verification. Do not treat client-side storage, obfuscation, tree-shaking, or build flags as payment enforcement.

See `docs/local-unlocked-testing.md` for operational details.

## Verification and documentation

- Run `npm test` and `npm run build` for gameplay, progression, or build-configuration changes.
- Run `npm run test:browser` when changes affect rendering, navigation, controls, or unlock visibility. Inspect desktop and mobile behavior where relevant.
- Never delete or weaken tests to make CI green. Report any test that could not be run.
- If `README.md` changes, keep `README.zh-TW.md` in sync using `scripts/readme-zh.mjs` (the existing pre-commit and Claude Stop hooks also enforce this).
- Do not claim GitHub Pages has deployed merely because a commit landed on `main`. Follow `.github/workflows/ci.yml` for publication rules.

## World Tour scene fidelity and powerups

- New course-themed props, landmark geometry and playable Hyperdrive gates belong in `src/world-tour-landmarks.js` and `src/world-tour-scene.js`; keep one rolling renderer for the five World Tour IDs. Avoid copying whole scenes per track.
- `src/game.js` owns `boost-tunnel` reward/collision state; do not make visual trigger volumes grant repeatable rewards each frame. Preserve the one-use-per-race rule.
- Road collectibles and particles must use `trackLocalPosition` so elevated/curved courses don't show hovering pickups or buried effects; the minimap must not reveal any shortcuts.
- Target recognizable skyline silhouettes for historical buildings, using original licensed geometry. Maintain low/high quality and reduced-motion variants. See `docs/world-tour-landmark-polish.md` for landmark references and QA checkpoints.


## Current World Tour scenery policy

- Favor visual distinction over forcing multiple destinations through the same street model or tunnel hoops. Every track has its own road line language, roadside object kit, tunnel structures, palette and minimap skin. Shared placement/streaming is fine, shared-looking scenery is not.
- See `docs/world-tour-scenic-redesign.md`. Its streaming rule is strict: roadside props are keyed by absolute `trackId + chunkIndex`, not re-cycled by modulo next to the player; mountain/coastal terrain must join exactly at chunk boundaries.
- Keep bloom, emissive and mirror-like asphalt subdued in the **centre driving sightline**. Distribute subdued edge lights on sides; Alpine's railroad bore must be visually dark and physically enclosed with rare amber service lamps.
- World Tour code locations: `src/world-tour-scene.js` (renderer/chunk pool), `src/world-tour-scenery.js` (30 authored roadside assets), `src/world-tour-tunnels.js` (five tunnel styles), `src/world-tour-landmarks.js` (landmarks), `src/world.js` (lighting), `src/style.css` and `src/route-map.js` (route map).
- **Do not create PRs** for this feature. Direct commits to `feature/world-tour-landmark-boost-polish` only. Do not merge or deploy without user approval.


## Mandatory performance and rendering-quality review for EVERY feature change

Every new feature, scene, animation, user-interface change, gameplay mechanic or refactor **must include a performance review before completion**. Do not treat performance optimization as a later optional pass.

- Preserve visual fidelity first: optimize WebGL draw calls through shared geometry/materials and GPU instancing; use camera culling, bounded deterministic scenery streaming, cached static matrices and geometry, and quality-aware GPU pixel budgets. Avoid indiscriminately removing mesh detail, landmarks, textures, effects or track identity.
- Never rebuild unchanged scene graphs, road geometry, buffer attributes, shaders or instanced matrices each animation frame. Do not allocate large transient arrays/objects in hot loops or force SVG/DOM layout unnecessarily. Batch instanced data uploads; only update what has visibly changed.
- Do not repeatedly allocate GPU resources while driving. Dispose unique geometry, buffers, textures, render targets, and instance attributes when no longer used. Do **not** dispose shared geometries or shared materials when only one chunk is evicted.
- Avoid shader overdraw, unnecessarily high pixel ratios, excessive bloom and center-screen glare. Scale display resolution to the current validated quality tier; High quality retains full supported fidelity.
- Assess both **CPU and GPU**: frame time median/p95, draw calls, triangles, GPU memory, rendering stalls, texture/geometry allocations, and 5–8 km continuous driving under high/medium/low tiers. Track actual before/after measurements when possible instead of claiming unmeasured FPS gains.
- Add relevant unit and browser regression tests for performance-sensitive code and for scene correctness after batching/culling. Test real WebGL screenshots across all affected courses, including pause/restart, switch tracks, WebGL recovery, low-power devices and narrow phone/landscape layouts. The final report must identify untested devices and any remaining performance uncertainty.

## Device-adaptive startup experience

### Cross-platform quality detection

- Support **macOS, Windows, Android, iOS and iPadOS** with standards-based browser APIs. Avoid OS/UA-specific forced presets and do not assume that touch means a slow GPU.
- `navigator.hardwareConcurrency` is only an approximate and sometimes privacy-reduced logical-core count, **not** a benchmark. `navigator.deviceMemory` is optional and normally absent on Safari/iOS. Always tolerate undefined core counts or RAM with safe numeric checks.
- `window.innerWidth`, `window.innerHeight` and `devicePixelRatio` are universal sizing signals, not GPU speed measurements. Use them in conjunction with the available capability hints; do not promise exact FPS/performance scores.
- A missing Safari RAM hint must not throw, block the startup/graphics menu, or automatically force Low solely because memory data is missing. Powerful Macs/iPhones and high-DPR devices should retain High where evidence allows.
- On every platform, stored explicit VFX preferences override automatic device recommendations. Once-only downgrade messaging must work in both English and Traditional Chinese and persist across reloads when localStorage is available.
- Keep platform coverage in unit tests for full Windows/Android Chromium hints as well as **Safari/iOS missing-memory fallback**, desktop browsers reporting unknown data, and unknown capability signals. Document that real GPU benchmarking/device validation remains a separate QA step.


- On a fresh install with no saved VFX profile, choose the highest reasonable quality from available non-invasive device capabilities. **Never override a saved manual graphics preference** or overwrite game unlocks/progress.
- Default to High when reliable device hints are unavailable. Downshift only on supported evidence of limited CPU/RAM/pixel throughput; maintain racing visibility and FPS before ornamental post-processing. Medium/Low may reduce post effects, pixel ratio, and density while keeping critical scene geometry and gameplay.
- If High is not selected automatically, show a compact **once-only** notice describing the adjustment. Store the notice-seen flag in localStorage; once seen, do not show again across future visits unless browser site storage has been cleared. Respect blocked storage with an in-memory-only fallback.
- The notice must support both English and Traditional Chinese, including live changes via the existing track-name language selector. Other UI strings may remain English per the existing i18n scope. Never block Start, driving inputs or rendering behind the notice.

## Home-screen 3D preview consistency

- Every selectable track must show its actual **player car, three rival vehicles, drivable road and characteristic surrounding scene** in the main ready-screen 3D view. Static gradient track cards are only secondary accents, never substitutes for the live 3D showcase.
- **Showcase consistency is mandatory:** Alpine Rail Pass and Cosmic Orbit must stage the same signature hover/fly dynamic as the original five courses: the player car visibly hovers with active jet effects and gentle bobbing, at least one rival flies with visible thrusters, and two other rivals provide ground-depth cues. Honor reduced-motion by suppressing hover animation without hiding the actual vehicles.
- Keep the ready-screen three-quarter chase camera **comparable to the classic 50-degree-FOV preview**: approximately 8.3m to the side and 11.8m behind; the camera eye should be around 5.1m above the **road**, or 3.5m above the hovering player (1.6m lift), at desktop size. Rotate the camera and look-ahead target into each course's actual road frame; do not zoom out, alter player car scale, or let mountain/space curvature push cars out of view.
- When changing any homepage preview, review its actual Chrome/WebGL screenshot and verify four visible actors, at least three within the camera frustum, flight thrusters and a player-car screen width reasonably close to the original maps. Preserve the surroundings and landmarks without obscuring cars or the Start interaction.
- For Alpine Rail Pass and Cosmic Orbit, use authored preview positions and a camera defined in the **canonical road frame** (not fixed world coordinates), so mountain elevations, space-road turns, foreground scenery and driver vehicles remain visible together. Reuse the same car models, world, paint and track shaders as normal racing.
- Verify the preview in desktop/phone resolutions, portrait/landscape, with/without effects and reduced motion. Check that rivals are not hidden behind geometry, and the camera does not look away from the road.
- Existing road-map previews, in-race racer positions, hidden shortcut disclosure rules, and home-preview vehicle counts remain regression requirements.

**Branch workflow:** Commit and push directly to `feature/world-tour-landmark-boost-polish`; do not open a PR, merge into main or deploy unless explicitly authorized.
