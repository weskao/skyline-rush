# Skyline Rush — AI-assisted 3D Visual Fidelity Pipeline (Design v2)

Status: active · v2 adopted 2026-11-08 · Supersedes [3d-visual-fidelity-pipeline-design-v1.md](3d-visual-fidelity-pipeline-design-v1.md) · Plan: [../plans/3d-visual-fidelity-pipeline-plan-v2.md](../plans/3d-visual-fidelity-pipeline-plan-v2.md)

## 0. What changed from v1 (owner decisions 2026-11-08)

1. **The concept board is now an acceptance target, not just a mood reference.** The board is
   `docs/designs/3d-pipeline/concept-art/skyline-rush-3d-target-concept-board.jpeg`. Every visual phase ends with a
   side-by-side review: a real WebGL capture next to the matching board panel (§8.1). v1 only asked for a look "closer
   to authored 3D art". Under v1 the finished game would not have looked like the board, and the car was the furthest
   off.
2. **The Roadster is finished as-is.** roadster2 (owner-approved it6) completes Phases 2b and 2c and becomes the
   default (new **Phase 2d**). It is not restyled to match the board.
3. **The board's car becomes a new player car** (new **Phase 6**, Task 7). It gets its own GLB, Garage car selection
   UI, entitlement and Cloud Save. This replaces the v1 non-goal "no invented race cars". Exactly one new car is
   allowed; any further car needs another owner decision.
4. **Effects are in scope wherever the board shows them.** That covers thruster glow, boost plumes, the light blade
   and rear light bar, wet-road reflections and spray. Phase 2c aligns the existing effects with the GLB car. Phases 3
   and 6 raise them toward the board, on the same ports.
5. **Maps follow their board panels** (Phase 4, plus Frostbite). Each panel's palette, weather, lighting and hero
   landmark are a per-map look target. The map owner still decides the layout and budgets.

The board is AI-generated concept art. Its generator and redistribution terms are not recorded. It is never shipped,
never presented as gameplay, and never used for dimensions. See §5.

## 1. Goal and boundaries

Goal: bring Skyline Rush's player cars, Garage Studio, road surfaces, world scenery and covers as close to the concept
board as a browser game on one WebGL renderer allows. The comparison is panel by panel. It is accepted on real
hardware within documented per-device performance budgets, and it is not a claim of desktop AAA or offline-render
parity.

Expected ceiling, stated honestly:
- The goal is to match the **composition, palette, material character, light signatures and atmosphere** of each
  panel.
- The goal is not pixel identity. Path-traced reflections, film motion blur and volumetric clouds are approximated
  (environment maps, screen-space or planar tricks, sprites, fog), or reserved for an opt-in Ultra tier after
  benchmarking.

Kept from v1:
- Vue 3, strict TypeScript, Vite and the existing Three.js gameplay.
- One `WebGLRenderer`, browser and GitHub Pages deployment.
- Procedural models stay as the load/decode fallback and the Low tier.

Non-goals:
- Replacing the game with Unity/Unreal.
- Migrating Vue to React or TresJS.
- Switching production to WebGPU in this project.
- Changing the track graph or physics.
- Adding cars beyond the Roadster and the one Phase 6 concept car.
- Adding invented skins or unlocks outside the owner-approved catalog.
- Copying car logos, badges or brand marks from the board or any photo.
- Shipping the board, or any generated image, as if it were 3D content.

## 2. Requirements and existing code

- Three.js is exact-pinned to 0.186.1 (Phase 1 done) with aligned `@types/three`, and `WebGLRenderer` is kept.
- `src/world.js` owns `WebGLRenderer`, the HDR half-float MSAA target, EffectComposer, RenderPass, UnrealBloomPass,
  the custom ShaderPass and OutputPass. It also owns RoomEnvironment/PMREM, shader warm-up, dynamic quality and the
  shared Garage/race context.
- `src/car-model.js`, `src/roadster-fidelity.js`, `src/roadster-rear-nozzles.js` and `src/roadster-reference-fascias.js`
  build the procedural Roadster, which is the fallback and the physics/VFX anchor owner.
- The GLB path lives in four modules:
  - `src/asset-model-loader.ts`, `src/model-manifest.ts`, `src/garage-model.ts`: the loader, manifest and adapter.
  - `src/garage-model-rig.ts`: wheels, wing, thrusters and lift fans follow the procedural car.
- `src/garage-stage.ts` uses the existing renderer and scene handoff. Never initialize a new canvas or WebGL context.
- `src/garage-skin-catalog.ts` and `src/appearance.ts` hold the Garage equipment catalogs (paints, the four skin
  categories). `src/aero-vfx.js` and `src/effects.js` hold the base effects.
- `src/geometry.ts` `roadRibbon` has no UV yet. `src/world-tour-scene.js` and `src/world-tour-scenery.js` stream
  deterministic ~120 m chunks.
- Follow `docs/rendering-performance.md`, `.claude/rules/performance-review.md`, `docs/regression-first-workflow.md`
  and the Garage visual contract. All existing tracks, modes, race physics, touch, NITRO/FLY/BOOST, ghost and Cloud
  Save stay unchanged.

## 3. Mandatory Phase 0: local environment check FIRST

Unchanged from v1 §3: [3d-visual-fidelity-pipeline-design-v1.md](3d-visual-fidelity-pipeline-design-v1.md#3-mandatory-phase-0-local-environment-check-first).
Run the full audit in `docs/designs/3d-pipeline/toolchain-environment-preflight.md` per device before any Blender
or asset work on that device. Evidence stays in the git-ignored `docs/designs/3d-pipeline/audits/`.

## 4. Tool selection

Unchanged from v1 §4: Blender + project-scoped Blender MCP, `blender-image-to-3d`, glTF Transform, Three.js addons
(GLTFLoader, KTX2Loader, MeshoptDecoder). There is no TresJS, R3F or drei. New for Phase 6: the concept car may be
blocked out with image-to-3D from the board's studio panels. The shipped mesh is still authored and retopologized
in Blender with named pivots, never a raw generator output.

## 5. Source / runtime contract

- Editable masters go under `assets-src/<model>/`. Deployable assets go under `public/models/` and
  `public/materials/`. Paths go through `import.meta.env.BASE_URL`.
- Each model has a manifest: stable ID, Y-up with negative Z as the nose, scale, named nodes, and pivots (`wheel_*`,
  `wing_*`, `thruster_01..04`, `lift_fan_01..04`). It also records source/reference files, creator, license, content
  hash, generator versions, GLB size, triangle/mesh/draw counts, textures, LOD thresholds and fallback.
- The visual adapter loads the GLB asynchronously and keeps the procedural car's physics, collision box and
  animation contract. It applies paint and skins, never duplicates scene ownership, and falls back to procedural
  geometry on any load or decode failure.
- **Every player car shares one simulation contract.** That means the same collision envelope and road contact,
  the same camera target, and the same NITRO/FLY/BOOST/VFX port coordinates (`REAR_PORTS`, `LIFT_PORTS`).
  - Port coordinates never move to match an image. A car that looks different on the board is fitted around the
    ports.
  - This also holds for the Phase 6 car. It is a visual car on the shared arcade physics, not a new handling model.
- PBR follows these rules:
  - Base color and emissive are sRGB. Normal, roughness and metallic are linear.
  - Use UV0. Add UV2 only for baked lightmaps.
  - `roadRibbon` gets a seamless road-space UV across chunks, including Sky Spiral and elevated World Tour.
- glTF Transform must preserve node names, pivots and animation. KTX2 and meshopt need tested decoders in the built
  runtime.
- Concept-board rules:
  - Board panels are look targets. Geometry proportions come from the simulation contract, and for the Roadster from
    `docs/designs/roadster2-reference/`.
  - Brand marks and invented technical specs on the board are never reproduced.
  - Covers and store art are real WebGL captures, labelled separately from the board wherever both appear.
- Licensing:
  - Audit attribution and license before importing any Sketchfab, Poly Haven or other asset.
  - Before Phase 6 ships, the owner records the board's generator and its terms of use in the concept-art README.
  - The Phase 6 car's design derives from the board, so that record is a release gate, not a formality.

## 6. Architecture

~~~mermaid
flowchart TD
  CB[Concept board panels] --> A[Per-phase look brief + parity checklist]
  R[Reference photos and licensed source assets] --> A
  A --> B[Blender MCP + image-to-3D blockout]
  B --> C[Editable blend and author scripts]
  C --> D[UV / PBR / pivots / animation / LOD]
  D --> E[GLB export + glTF Transform inspect]
  E --> F[Optimize meshopt and/or KTX2]
  F --> G[Runtime GLTFLoader, asset cache, shared rig]
  G --> Q{Device quality + failure state}
  Q -->|Low / load failure| P[Procedural or lower LOD fallback]
  Q -->|Medium| M[Mid LOD / bounded lighting]
  Q -->|High, Ultra after measured approval| H[High LOD / enhanced PBR + effects]
  P --> W[Existing single WebGLRenderer]
  M --> W
  H --> W
  W --> V[Garage → Home → race → maps]
  V --> T[RED/GREEN, WebGL captures, profiling, exact-HEAD CI]
  T --> X[Concept-board parity review §8.1]
  X -->|Gap the owner rejects| A
  X -->|All gates plus owner approval| I[Merge to develop]
~~~

## 7. Delivery phases and acceptance

The board panel each phase answers to is named in bold. Panel names follow
[concept-art/README.md](../../designs/3d-pipeline/concept-art/README.md#panels).

**Phase 0 — toolchain check:** inspect the environment and the project-scoped Blender MCP. Fix only missing items
with user or local permissions, and keep a redacted report. Not a repo-code deployment. *(Done.)*

**Phase 1 — Three.js r186.1 migration:** exact-pinned three and aligned types, lockfile and API migration. Keep
`WebGLRenderer`, the composer/NaN guard and shader warm-up. See
`docs/designs/3d-pipeline/threejs-r180-r186-migration.md`. *(Done.)*

**Phase 2 — asset pipeline MVP + Roadster Garage:** loader, manifest, decoders and procedural fallback. roadster2 is
built from `docs/designs/roadster2-reference/`, with five-blade aero wheels, hood sweep, lights, quad nozzles, the
full wing lifecycle and Garage paints. *(Done; owner approved it6 on 2026-11-07.)*

**Phase 2b — one hero Roadster GLB on Home showcase and in races:**
- roadster2 dresses the player's car on the Home showcase (AIRFLOW ON grounded, OFF hovering) and in every race,
  through the same adapter as the Garage.
- Physics, collision box, road contact, camera and NITRO/FLY/BOOST/VFX ports stay owned by the procedural car. The
  procedural car stays the fallback.
- Lift fans are authored in Blender.
- Preload and compile before GO. The Low tier uses the low LOD.
- Rival cars stay procedural unless the owner opts in.
- Checklist: [task-4b](../../designs/3d-pipeline/phases/task-4b-roadster-race.md).

**Phase 2c — Garage equipment and VFX alignment with the GLB car:**
- Covers every Garage equipment item, enumerated from the catalogs:
  - the six `PAINTS`
  - the 22 `GARAGE_SKINS` (thruster ×4, airflow ×4, NITRO trail ×5, launch flare ×9)
  - the base NITRO/FLY/BOOST/airflow/jet effects and the Garage controls that show them
- Step 1 is a before/after audit of every item on the procedural car and the GLB car. Step 2 tunes only the items the
  owner marks as mismatched.
- Effects stay Three.js shaders and sprites on the existing ports. Blender may bake textures only.
- Unchanged: entitlements, uniforms-only skin swaps, warm-up before GO and Cloud Save.
- **Board reference:** the thruster glow and plume colour in the rear studio and Coast boost panels guide the tuning,
  within the existing ports and budgets.
- Checklist: [task-4c](../../designs/3d-pipeline/phases/task-4c-garage-equipment-vfx.md).

**Phase 2d — Roadster close-out (new in v2):** the Roadster is finished, not restyled. It is accepted when all of
these hold:
- Phases 2b and 2c pass every gate, including the owner's visual sign-off on real-GPU desktop captures.
- Real-phone screenshots and p50/p95 are recorded. The owner waived them for 2b on 2026-11-08 but must revisit them
  here.
- `?model=roadster` is removed in its own commit (default-on), with the procedural fallback kept and the all-track
  regression matrix rerun.
- Exact-HEAD full CI passes.

After 2d the Roadster's shape is frozen. Later phases change only how it is lit (Phase 3) and presented (Phase 5).
Phase 6 starts after 2d.

**Phase 3 — Coast look development: PBR road, effects, lighting** (**Coast top-right ×3, Coast day, Coast rain at
sunset**):
- Road:
  - road-space UV with wet/dry roughness, puddles and reflection of lights and sky on wet asphalt
  - lane paint and a guard-rail material, without changing course frames or collisions
  - realism first (owner, 2026-11-08): CC0 photoscanned sources (Poly Haven) baked in Blender to KTX2, and a new
    Ultra quality tier above High; procedural looks remain only as Low/fallback
- Close scenery: authored sea arch, cliffs, palms and guard rails, with bounded static streaming. Distant objects and
  the Low tier keep simple geometry.
- Shared lighting and post-processing:
  - per-time-of-day environment maps, tone mapping and colour grade
  - bloom tuned for light blades, contact shadow under the car, sun and haze
  - this pass benefits every map and both cars
- Effects raised toward the board, on the same ports with Low-tier fallbacks:
  - thruster glow and boost plume
  - wheel spray in rain
  - speed lines or a motion-blur approximation (Ultra only, if benchmarked)
- **Accept:** each listed panel is reproduced as a WebGL capture with matching camera, time of day and weather, and
  passes the §8.1 review.
- Checklist: [task-5](../../designs/3d-pipeline/phases/task-5-coast-pbr-road.md).

**Phase 4 — maps follow their board panels** (**Dune, Monsoon, Skyfall, Volcanic, Stormline, Frostbite**):
- Each map adopts the shared Phase 3 pipeline and targets its panel:
  - Dune: sandstorm haze and the rock arch
  - Monsoon: jungle ruins, a waterfall and wet stone
  - Skyfall: floating islands, a cloud sea and waterfalls
  - Volcanic: lava glow, ember light and dark rock
  - Stormline: a neon megacity with rain and lightning
  - Frostbite: ice cliffs, a frozen waterfall and snow spray
- Coordinate with the integration branch `feature/epic-multiroute-longform-tracks`. Track owners opt in once the
  common API is stable.
- Course frames, checkpoints, collisions, flying shortcuts and deterministic chunks are unchanged. There are no
  writes to sibling branches from this branch.
- **Accept:** a per-map WebGL capture next to its panel passes the §8.1 review.
- Checklist: [task-6](../../designs/3d-pipeline/phases/task-6-new-tracks-showcase.md).

**Phase 5 — cover/showcase polish and Ultra (only if benchmarked):**
- Starts after Phases 2d and 4. Phase 6 is optional: if the owner wants the new car on covers, Phase 5 also waits
  for it.
- Covers authored Three.js showcase polish (camera, lighting, scenery) and genuine capture-based promotion that
  recreates the board's compositions.
- Ultra stays opt-in. WebGPU/TSL is a separate research proposal.

**Phase 6 — concept hero car (new in v2; Task 7)** (**studio 2×2: front 3/4, side, rear 3/4 with deployed wing, rear
quad thrusters**):
- **Car:**
  - A second player car modelled after the board's deep-red wedge GT: low cab-forward canopy, front light blade, rear
    full-width light bar, quad round thrusters and a swan-neck active wing.
  - Built in Blender on the **shared simulation contract** (§5): same collision envelope, ports, wheel and wing
    pivots and rig, so physics, VFX and the Phase 2c equipment work unchanged.
  - LODs, KTX2 textures, a manifest, and the procedural Roadster as its load fallback.
  - No badges or logos.
- **Garage car selection UI:**
  - Car picker on Garage Home and Preview Studio, with an equipped-car state shown on the Home showcase and in races.
  - Paints and skins apply per car through the same catalogs.
  - The locked/trial/owned/equipped rules follow the paint model; a preview never grants a car.
  - The equipped car is saved locally and in Cloud Save, with a migration that defaults existing saves to the
    Roadster.
  - Covers i18n (all supported languages), accessibility (keyboard and focus order), What's New and release notes.
- **Owner gates:** display name, unlock rule (stars, trial or free), the default paint, and the board licence record
  (§5).
- **Accept:**
  - The four studio panels are reproduced in Preview Studio and pass the §8.1 review.
  - The car passes the Phase 2b race matrix and the Phase 2c equipment audit.
  - Recorded real-phone p50/p95, exact-HEAD full CI and owner sign-off.
- Checklist: [task-7](../../designs/3d-pipeline/phases/task-7-concept-hero-car.md).

Order: 2b → 2c → 2d → (3 ∥ 6) → 4 → 5. Phases 3 and 6 may run in parallel on separate branches. They meet in the
§8.1 review, where the new car is judged under Phase 3 lighting.

## 8. Quality evidence and failure modes

### 8.1 Concept-board parity review (new in v2)

For each panel a phase answers to:
1. Reproduce it in the running game with the same camera framing, time of day, weather, pose and paint. Capture on
   a **real GPU** (desktop) and a phone. CI or SwiftShader captures never count as look evidence.
2. Build a side-by-side composite: the board panel on the left labelled "concept art", the WebGL capture on the right
   labelled with the commit and device class. Keep composites in the git-ignored `audits/`; commit only the checklist
   result.
3. Score seven items **match / close / gap** with a one-line reason each: silhouette and proportions; paint depth and
   reflections; light signatures (front blade, rear bar, thruster glow); road and ground material (wet, dry, sand,
   snow); atmosphere (fog, haze, rain, sky); colour grade; effects (plume, spray, sparks).
4. Every "gap" names its cause (budget, tier or engine limit) and either a follow-up item or an owner-accepted
   deviation. The phase is accepted only after the owner signs off on the scored sheet.

### 8.2 Engineering evidence (from v1)

- Baseline and diff screenshots:
  - Garage front/rear/side/orbit for each car
  - Coast, Neon, Canyon, Aurora, Sky Spiral, the five World Tour tracks and the new maps
  - viewports 1440×900, 390×844, 320×740 and 844×390
  - night, rain, FLY, NITRO, landing and drift
- Per scene and tier, record draw calls, triangles, texture memory, upload/compile stalls, frame-time p50/p95,
  resolution and FPS. CI software WebGL is not performance evidence.
- Tests:
  - loader cancellation, decode failure and offline fallback
  - double disposal
  - pivot preservation
  - texture colour space
  - UV seams
  - no shader compile during racing
  - no half-float NaN or bloom black screen
  - camera fit and occlusion
  - for Phase 6: car-selection persistence and Cloud Save migration
- TDD RED → GREEN → refactor, `npm run typecheck`, `npm test`, `npm run build`, browser/World Tour, `make verify`,
  exact-HEAD full `quality-gate` and real-device visual QA. Missing evidence stays unchecked.
- Stop and roll back on any of these:
  - broken assets or legacy shader paths
  - gameplay parity regressions
  - an API missing from the installed Three.js
  - licence uncertainty
  - unbounded memory or LOD jitter

  Never weaken tests.
- No reset, force push, merge, PR, deploy, tag or write to develop, main or other branches without approval.

## 9. Shared-conversation source limitation

Unchanged from v1 §9: the three ChatGPT share links in
[v1](3d-visual-fidelity-pipeline-design-v1.md#9-shared-conversation-source-limitation) remain unverified. Reconcile
them if they become accessible.

## 10. Related documents
- [../plans/3d-visual-fidelity-pipeline-plan-v2.md](../plans/3d-visual-fidelity-pipeline-plan-v2.md)
- [3d-visual-fidelity-pipeline-design-v1.md](3d-visual-fidelity-pipeline-design-v1.md) (frozen predecessor)
- ../../designs/3d-pipeline/concept-art/README.md (board panels → phases)
- ../../designs/3d-pipeline/phases/README.md (per-task files, by-project vs by-device scope)
- ../../designs/3d-pipeline/toolchain-environment-preflight.md
- ../../designs/3d-pipeline/threejs-r180-r186-migration.md
