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
| `make dev-feature <name>` | Worktree of `origin/feature/<name>`, all-unlocked, HTTPS on localhost. Does not check out that branch here |
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

## Home-screen 3D preview consistency — mandatory for every future track

**This is a design and regression requirement for ALL existing and newly added courses, not an Alpine/Cosmic exception.** A new course is not ready to ship if its homepage showcase does not match the quality, legibility, motion, and approximate camera scale of the existing racing previews.

- Each selected track must render the actual **player Roadster, three rival cars, driveable road, distinctive landmarks and surrounding scenery** in the live Three.js ready-screen world. Do not replace this with a flat illustration, static thumbnail, fake showcase or an empty sky.
- Retain the signature dynamic showroom composition: the **player car hovers/flys gently with visible jet/thruster effects**, at least **one rival flies with thrusters**, and the remaining rivals stay near the roadway to communicate depth and racing context. Keep model, lighting, paint, wing and physics visualization consistent with the normal game; do not make the player invisible or shrink it to show more scenery.
- Keep the same approximate **three-quarter rear-chase angle, 50-degree field of view, player car size and apparent near/far distance** across tracks. Baseline desktop framing is about **8.3 m to the side, 11.8 m behind, camera eye 5.1 m above the road** (roughly 3.5 m above a player hovering at 1.6 m). Use responsive tuning on portrait screens, but do not arbitrarily zoom out or cut off the car.
- For mountain passes, banked roads, elevated bridges and cosmic tracks, **orient the camera and its look-at target using the sampled canonical road tangent, up, and right vectors**. Choose a curated preview point where the car and rivals are clearly visible and where the course's scenery remains recognizable. Never use fixed world-axis camera coordinates that look away on a curved or elevated road.
- The showcase must feel alive on every track, but **honor reduced-motion preferences** by disabling oscillation and unnecessary jets/flash effects without removing any vehicle or road context. Keep road/vehicle visibility and comfortable lighting even on Low and Medium quality.
- **Design uniqueness is required:** reuse scenery-streaming and rendering systems when useful, but do not force different destinations to look like the same highway with recolored props. Road shape, side scenery, landmarks, tunnel treatment and local lighting should reflect each destination while preserving the common homepage driving-shot composition.
- **Validate before merging or deploying:** use real Chrome/WebGL screenshots and browser assertions for desktop and mobile, landscape and portrait. Verify the player and all three rivals are present, at least three cars project inside the camera frustum, flight/jets are visible when allowed, car screen width is comparable to a reference classic track (target ratio 0.65–1.5), and no UI overlays obscure Start. Preserve the full-route minimap, four live racer markers and hidden-shortcut policy.
- Every new visual feature must also review CPU/GPU costs, chunk lifetime and draw calls, post-processing intensity, and its effect on long 5–8 km sessions. Prefer data-driven quality budgets and asset instancing that preserve visual detail, not default fidelity reductions.

**Branch workflow:** Commit and push directly to the currently designated development branch; do not create a pull request unless explicitly requested. Do not merge into `main` or deploy unless the user explicitly authorizes it.
