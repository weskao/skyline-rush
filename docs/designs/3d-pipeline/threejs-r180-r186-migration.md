# Three.js r180 → r186.1 Migration — Skyline Rush

Date: 2026-11-04 · Planning only · Implementation requires Phase 0 PASS and explicit design acceptance.

## Targets, verification and version strategy

Current develop/package.json: three ^0.180.0 with both typecheck commands dynamically installing @types/three@0.180.0. Planned final target: three **0.186.1**, aligned @types/three **0.186.x** with a verified published compatible version, lockfile updated by npm install; do not blindly assume the exact corresponding types patch number exists. No Three.js production dependency is changed in the docs-only branch.

Use https://github.com/mrdoob/three.js/wiki/Migration-Guide as primary API reference and check exactly the 180→181, 181→182, 182→183, 183→184, 184→185 and 185→186 sections before coding. Three.js documentation recommends upgrading in ≤10-release increments; r180→r186 can be one tightly tested change with checkpoints, or individually pinned intermediate changes if breakage is found.

## Sequence and contract

~~~mermaid
flowchart TD
  A[Phase 0 tools and local connection verified] --> B[Capture r180 baseline]
  B --> C[RED tests and screenshots for critical renderer behavior]
  C --> D[Pin three 0.186.1, align types and lockfile]
  D --> E[Audit imports, shader chunks, addon semantics]
  E --> F[Focused unit / typecheck / build]
  F -->|Fail| E
  F -->|Pass| G[Real WebGL browser, Garage, all tracks]
  G --> H{Image parity, shader safety, frame-time budgets?}
  H -->|No| E
  H -->|Yes| I[Full make verify + exact HEAD CI + device evidence]
  I -->|Approved| J[Integrate after owner approval]
~~~

### Impact matrix (inspect before editing)

| Existing code | Risk to check at r186 | Evidence |
|---|---|---|
| src/world.js renderer, HalfFloat MSAA + EffectComposer/OutputPass | render target, output colorspace, tone mapping, antialiasing, NaN bloom guard and exposure preserved | black-frame and shader-warmup Playwright, screenshots across modes |
| RoomEnvironment and PMREMGenerator | r183 changed RoomEnvironment scene setup; resulting IBL appearance differs by design | compare Garage paint and glass at same scene/camera |
| src/roadster-fidelity.js, src/car-model.js, src/garage-stage.ts | PBR reflection, clearcoat, transmission, glass, paint overlays and wheel pivots | same-camera car photography baseline, semantic anchor tests |
| src/world-tour-batching.ts and imported BufferGeometryUtils | r186 toTrianglesDrawMode() modifies geometry in-place (if used); verify no shared mesh mutation | draw-call/triangle and instance parity checks |
| scene transform/update code | r185 changes Object3D.updateWorldMatrix() behavior when manual matrixAutoUpdate=false; ensure matrixWorldNeedsUpdate set | spatial point / culling / occlusion tests |
| custom extensions or subclasses | r186 Object3D.dispose(): custom dispose implementations should call super.dispose() where relevant | asset lifecycle tests, double-disposal test |
| legacy light/shadow code | r182 deprecates PCFSoftShadowMap with WebGLRenderer; check use and appearance | shadow screenshots and browser console warnings |
| any SVGLoader usage | r185 deprecates SVGLoader.createShapes() | use shapePaths.toShapes only where actually called |
| ShaderMaterial and raw GLSL | shader chunk/define compatibility, output colorspace, half-float NaNs, material cache keys | custom shader guard, program count, no mid-race compile |
| postprocessing and WebGPU experiments | r183 renames WebGPU PostProcessing to RenderPipeline; not a reason to replace existing WebGL EffectComposer | keep WebGL renderer in production; experimental WebGPU separate |
| animation timing | r183 deprecates Clock in favor of Timer (if Clock used) | deterministic fixed-step physics / input parity |
| future GLTFLoader/Meshopt/KTX2 | new addons must use same r186 package and tested decoders | fully built GitHub Pages subpath asset-load tests |

## Baseline and TDD gate before version bump

1. Read CLAUDE.md, AGENTS.md, docs/regression-first-workflow.md, docs/rendering-performance.md and scoped .claude/rules; freeze affected tests/screenshots and existing vehicle/road physics.
2. Save exact package-lock version and renderer import inventory, critical API usage, and current feature-branch HEAD. Capture scene images before upgrade (Garage front/side/rear, Coast, rain, Sky Spiral, Tokyo, new routes when present). Save viewport, camera, settings and renderer stats.
3. RED: add targeted compatibility/characterization checks that fail if r186 codepaths are unavailable; don't invent a fake historical RED if test doesn't fail. Preserve existing tests and compare results.
4. Upgrade three plus correct @types/three and package-lock. Replace dynamic typecheck installation of @types/three@0.180.0 in both package scripts with a normal pinned dev dependency, or aligned script behavior; no invisible stale r180 types. Run npm ci in a clean install.
5. Green: npm run typecheck, npm test, npm run build, browser shader warmup, black frame, World Tour scene/stream, Garage paint and race movement (straight, turn, drift, NITRO, flight, landing). Keep developer diagnostics and shaders active.
6. Run make verify and exact-HEAD full quality-gate (feature branch full-regression trigger per .claude/rules/ci-gates.md), then compare real WebGL captures and performance on desktop/mobile, including browser reload, context loss/recovery, reduced motion and quality switch.
7. Log successful/failed evidence in TODO.md with SHA/run IDs; do not claim visually identical lighting just because screenshots render. If fidelity regresses, tune material/IBL settings with proof or roll back migration in its own branch after authorization.

## Upstream sources
- https://github.com/mrdoob/three.js/wiki/Migration-Guide
- https://threejs.org/docs/
- https://github.com/CloudAI-X/threejs-skills (Skills currently target r186)
- https://github.com/donmccurdy/glTF-Transform
- https://github.com/KhronosGroup/glTF-Sample-Assets

## No automatic WebGPU migration

The deliverable is **Three.js library r186.1 while retaining WebGLRenderer**. Replacing EffectComposer, ShaderPass and custom shaders with TSL/RenderPipeline would be a separately designed, tested and approved renderer migration. TresJS/React Three Fiber remain out of scope.
