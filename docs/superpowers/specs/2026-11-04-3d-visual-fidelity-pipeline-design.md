# Skyline Rush — AI-assisted 3D Visual Fidelity Pipeline (Design)

Date: 2026-11-04 · Status: design only · Branch: feature/3d-visual-fidelity-pipeline

## 1. Goal and boundaries

Bring Skyline Rush's player car, Garage Studio, road surfaces, world scenery and future cover/showcase closer to high-quality authored 3D art. Retain Vue 3, strict TypeScript, Vite, existing Three.js-based gameplay, one WebGL renderer, browser/GitHub Pages deployment and the procedural models as a fallback. Aim for high perceived quality **with documented hardware-specific performance budgets**, not a claim of desktop AAA parity.

Non-goals: replacing the game with Unity/Unreal, migrating Vue to React or TresJS, switching production to WebGPU in this project, changing track graph/physics, adding invented race cars/skins/unlocks, copying copyrighted car logos or shipping screenshots disguised as 3D content.

## 2. Requirements and existing code

- Current develop has three@^0.180.0 and @types/three@0.180.0 (two typecheck script installs) in package.json; target a separate pinned **three@0.186.1** migration before relying on r186 Skills.
- src/world.js owns WebGLRenderer, HDR half-float MSAA target, EffectComposer, RenderPass, UnrealBloomPass, custom ShaderPass, OutputPass, RoomEnvironment/PMREM, shader warm-up, dynamic quality and shared Garage/race context.
- src/car-model.js, src/roadster-fidelity.js, src/roadster-rear-nozzles.js and src/roadster-reference-fascias.js create procedural vehicle geometry, trim, physical paint, windows and animated anchors.
- src/garage-stage.ts uses the existing renderer and scene handoff; never initialize a new Canvas/WebGL context.
- src/geometry.ts roadRibbon has position, normal and index, but lacks UV; src/world-tour-scene.js and src/world-tour-scenery.js have deterministic roadway/scenery geometry and ~120 m streaming chunks, InstancedMesh and per-track content.
- Follow docs/rendering-performance.md, .claude/rules/performance-review.md, docs/regression-first-workflow.md and the Garage visual contract. Verify all existing tracks, modes, race physics, touch, NITRO/FLY/BOOST, ghost and Cloud Save remain unchanged.

## 3. Mandatory Phase 0: local environment check FIRST

**Owner reports these installed; this is not verified evidence.** Before any dependency change, Blender scene editing or asset generation, run the full local audit described in docs/designs/3d-pipeline/toolchain-environment-preflight.md from ~/Documents/Workspace/skyline-rush. Record binaries and versions, Blender addon enabled-state and MCP connection, global Three.js Skills, project-scoped Blender Skill and Blender MCP for Claude and Codex, Node floor, existing dependency versions, KTX2/Meshopt tools, network/access and disk capacity. For each item explicitly mark PASS / FAIL / NOT VERIFIED with sanitized evidence. If missing, show the exact install/repair command and **stop the affected work until rerun succeeds**. Never claim GitHub access alone proves an app exists on the user's Mac.

"Install globally while working in ~/Documents/Workspace/skyline-rush" means run commands from that project directory but install Three.js Skills to ~/.claude/skills and blender-image-to-3d and Blender MCP in project scope for Claude and Codex; remove global Blender MCP registrations across AI agents; preserve third-party license terms and never commit user secrets. Repository-specific design rules remain in .claude/rules/.

## 4. Tool selection

| Tool | Decision | Evidence and safeguards |
|---|---|---|
| mcp-for-blender | Project-scoped Claude and Codex MCP, preflight first | https://github.com/ahujasid/mcp-for-blender ; Python execution is powerful, use trusted repo only and review permissions |
| blender-game-skills/blender-image-to-3d | Project Claude Skill | https://github.com/majidmanzarpour/blender-game-skills ; image-to-model quality gate, no guarantee of fully accurate result |
| glTF Transform | Project dev dependency / CLI | https://github.com/donmccurdy/glTF-Transform ; inspect, optimize and verify runtime decode paths |
| CloudAI-X/threejs-skills | Global Claude Skill | https://github.com/CloudAI-X/threejs-skills ; r186-targeted; until migration is approved/current, treat code examples as guidance, verify actual installed API |
| Three.js official addons | Reuse current installed Three.js | GLTFLoader, KTX2Loader, DRACOLoader and MeshoptDecoder selectively |
| Khronos glTF-Sample-Assets | PBR/loader test fixtures | https://github.com/KhronosGroup/glTF-Sample-Assets ; verify each fixture license before inclusion |
| TresJS | Do not install | https://github.com/Tresjs/tres ; Vue component renderer does not justify a second scene graph |
| React Three Fiber / drei | Do not install | Existing production framework is Vue and imperative Three.js |

## 5. Proposed source / runtime contract

- Keep editable masters under assets-src/ (Blender .blend, procedural Python scripts, original licensed texture sources, authoring manifests). Store deployable assets under public/models/ and public/materials/ only as required. Use import.meta.env.BASE_URL for GitHub Pages subpaths.
- Maintain an asset manifest per model: stable ID, coordinate system (Y-up, negative Z = nose), scale, named nodes, pivot points (wheel_*, wing_*, thruster_01..04), source/reference files, creator, legal license, content hash, generator versions, GLB size, triangle/mesh/draw counts, texture sizes and mip/codec, LOD thresholds and fallback.
- Visual adapter loads GLB asynchronously, retains existing car's physics/collision object and child animation contract, applies paint/skinning/material selection, never duplicates scene ownership, and falls back to procedural geometry on load/decode failure.
- GLB authoring: separate movable wheels, wing and exhaust anchors; maintain precisely the existing simulation and VFX anchor coordinates; never shift ports or collision boxes to match an image. Use authoring LOD0-2, bounded polycounts chosen after baseline profiling rather than guessed universal thresholds.
- PBR textures use proper sRGB base-color/emissive versus linear normal/roughness/metallic; create UV0 (and UV2 only when using baked lightmaps). For roadRibbon add UV in a testable, seamless road-space coordinate system with stable transitions across chunks, incl. Sky Spiral and elevated World Tour.
- glTF Transform optimization must preserve node names/pivots and animation; never merge animated nodes or alter ownership/disposal semantics. KTX2/meshopt require tested decoder assets/configuration in built runtime; Draco optional, not stacked blindly.
- Showcase art and covers are concept/composition references; exported gameplay shots must be authentic WebGL captures. Brand logos and invented technical specs from concept images are not required game functionality.
- Target look: the owner-supplied concept board `docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg` (Garage car studio views, Coast flight/drive, other map moods) is the visual goal for Phases 2–5. It is a mood/composition reference only, never an in-game capture or a geometry source; see its README.
- Model source licensing and external asset redistribution are mandatory checks: attribution/license audit before importing Sketchfab/Poly Haven/other assets; do not assume browsing or viewing an image grants redistribution permission.

## 6. Architecture

~~~mermaid
flowchart TD
  R[Multi-view reference art and licensed source assets] --> A[AI brief + visual fidelity contract]
  A --> B[Blender MCP + image-to-3D skill]
  B --> C[Editable blend and author scripts]
  C --> D[UV / PBR / pivots / animation / LOD]
  D --> E[GLB export + glTF Transform inspect]
  E --> F[Optimize meshopt and/or KTX2]
  F --> G[Runtime GLTFLoader and asset cache]
  G --> Q{Device quality + failure state}
  Q -->|Low / load failure| P[Procedural or lower LOD fallback]
  Q -->|Medium| M[Mid LOD / bounded lighting]
  Q -->|High, Ultra after measured approval| H[High LOD / enhanced PBR]
  P --> W[Existing single WebGLRenderer]
  M --> W
  H --> W
  W --> V[Garage → Coast → Future tracks]
  V --> T[RED/GREEN, WebGL screenshots, profiling, exact HEAD CI]
  T -->|Failure| A
  T -->|All gates plus owner approval| I[Merge to develop]
~~~

## 7. Delivery phases and acceptance

**Phase 0 — toolchain check:** inspect current environment and project-scoped Blender MCP configuration; only fix missing items with user/local permissions, keep a redacted report; not a repo-code deployment.

**Phase 1 — Three.js r186.1 migration:** independent change to exact-pinned three and aligned types, lockfile and API migration. Preserve WebGLRenderer, existing composer/NaN guard and shader warm-up. Characterization screenshots, CI, performance parity and renderer recovery gate first; do not mix with GLB replacement. See docs/designs/3d-pipeline/threejs-r180-r186-migration.md.

**Phase 2 — asset pipeline MVP + Roadster Garage:** loader, manifest, decoder support, fail-safe procedural fallback; source reference photos from docs/designs/roadster2-reference/; build at least front/side/rear/orbit source captures and 3D painted vehicle. Validate five-blade aero wheels, hood sweep, lights, quad nozzles, full wing lifecycle and existing Garage color equipment. Real 3D mesh, not background art; owner visual sign-off against existing source photos.

**Phase 2b — one hero Roadster GLB on Home showcase and in races (added 2026-11-07):** the accepted roadster2 GLB dresses the player's car on the Home showcase (the shared live `#world` preview, AIRFLOW ON grounded / OFF hovering) and in every race, through the same visual adapter as the Garage. The showcase and the race share one renderer, scene and Roadster poses, so they adopt the GLB together, in one adapter and one regression matrix; this is the "consistent hero car" formerly listed under Phase 5. Physics, collision box, road contact, camera and NITRO/FLY/BOOST/VFX ports stay owned by the procedural car, which remains the load/decode fallback. Remaining procedural parts (lift fans) are authored in Blender. Preload and compile before GO; Low tier uses the low LOD. Accept only after the all-track desktop/phone regression matrix, real-phone frame-time p50/p95, in-race screenshots, exact-HEAD full CI and owner sign-off. Default-on (removing `?model=roadster`) is a separate owner-approved step; rival cars stay procedural unless the owner opts in.

**Phase 3 — Coast PBR road and authored close scenery:** road-space UV, wet/dry roughness behavior, bounded static mesh streaming, lighting test across day/night/rain without changing course frames or collisions. Use current simple geometry for distant objects/Low tier.

**Phase 4 — five new maps and World Tour:** coordinate with integration branch feature/epic-multiroute-longform-tracks; individual track owners opt in after common API is stable; maintain Dune/Monsoon/Skyfall/Volcanic/Stormline visual identities, original playable course requirements and deterministic chunk load. No simultaneous source-branch writes from this branch.

**Phase 5 — cover/showcase polish and Ultra (only if benchmarked):** starts after Phase 2b, so every promotion capture shows the same GLB car players actually drive. Authored Three.js showcase polish (camera, lighting, scenery) and genuine capture-based promotion. Ultra remains opt-in; WebGPU/TSL is a separate research proposal, not a silent renderer migration.

## 8. Quality evidence and failure modes

- Capture baseline/diff screenshots: Garage front/rear/side/orbit, Coast, Neon, Canyon, Aurora, Sky Spiral, 5 World Tour tracks, and new maps when available, desktop 1440×900, 390×844, 320×740 and landscape 844×390, night/rain/FLY/NITRO/landing/drift.
- Per scene and tier record real draw calls, triangles, texture memory estimate, upload/compile stalls, frame-time p50/p95, resolution and FPS; CI software WebGL is not real-device thermal/performance evidence.
- Tests: loader cancellation/decode failure/offline fallback, double disposal, animation pivot preservation, texture colorspace, UV seams, no shader compile during racing, no half-float NaN/bloom black screen, camera fit and no occlusion.
- TDD RED → GREEN → refactor, npm run typecheck, npm test, npm run build, browser/World Tour, make verify, exact-HEAD full GitHub quality-gate and real device visual QA. Missing evidence stays unchecked.
- Stop/rollback on broken 3D assets, broken legacy material shader paths, gameplay parity regressions, new native API not available in installed Three.js, license uncertainty or unbounded memory/LOD jitter. Do not weaken tests.
- No reset, force push, merge, PR, deploy, tag or write to develop/main/other branches without approval.

## 9. Shared-conversation source limitation

Related owner references:
- https://chatgpt.com/s/t_6aeac2adbcb881918e18fbf49d7a4201
- https://chatgpt.com/s/t_6aeaca244390819184b37d2d7aa92e83
- https://chatgpt.com/s/t_6aeaca87b3dc8191a79fa4cf87d9bdf9

The external share endpoints could not be opened in this environment (cache miss). This design reflects the owner's instructions and accessible repository code; a local agent with authorized access should explicitly compare all three shared transcripts, append any newly discovered acceptance requirements, and keep a traceability note before implementation.

## 10. Related documents
- ../plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md
- ../../designs/3d-pipeline/toolchain-environment-preflight.md
- ../../designs/3d-pipeline/threejs-r180-r186-migration.md
- ../../designs/3d-pipeline/phases/README.md (per-task files, by-project vs by-device scope)
- ../../designs/3d-pipeline/concept-art/README.md (target-look concept board)
- https://github.com/mrdoob/three.js/wiki/Migration-Guide
