# 熔火天脊 / Volcanic Crown — animated Three.js home environment

**Stage:** 1 / Coming Soon showroom slice, not a playable race.
**Implementation owner:** `feature/epic-home-art-volcanic-crown`
**Scene:** `src/upcoming-scenes/volcanic-crown.ts`
**Unit tests:** `tests/upcoming-volcanic-crown-scene.test.js`
**Shared host integration:** owned by GPT 6 in `feature/epic-multiroute-longform-tracks`; **not included on this branch**.

## Source references / composition

- Ground: `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-01.jpg` (source SHA `b47212f76ce7cf24ec06fd550d971b262a106a35`).
- Air/branch: `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-02.jpg` (source SHA `51b9dff5a0e6dd83577d9f80502073c028cc919c`).
- Course inspiration: `docs/designs/new-tracks/route-schematics/volcanic-crown.svg`. This is a *non-metric* route sketch, not an exact race path.
- Acceptance contract from `feature/epic-multiroute-longform-tracks`: `docs/superpowers/specs/2026-11-03-stage1-animated-3d-home-showcase-design.md`.

The ground JPEG has a sweeping basalt road, bright magma at road edges, jagged lava cliffs and a distant cone with fiery veins. The aerial JPEG shows a high rock crossing/arch, hanging lava falls, a suspended route and cyan chevron guidance. The JPEG strips include another map preview at their lower edge; that unrelated art is **not** modeled as Volcanic Crown scenery. The implementation uses native meshes; neither reference JPEG is used as an in-scene background or texture.

## Live 3D objects and framing

- **Anchor A — close/medium ground:** a dark basalt roadway running from local Z +48 through -191, visible near shared-car origin (0, 0, 0), with orange shoulders, centre markings, a western full U-shaped hairpin and basalt safety blocks. Ground road is continuous rather than a fake loop.
- **Anchor B — canyon/alternate route:** a recessed lava-chasm plane below the roadway, two solid launch/landing slabs, a basalt causeway crossing for ground-route continuity, a visibly raised cyan flight path across the lava, plus a large 3D stone arch and twin vertical lava flows to the right of the main driving line. Landing slab centre: approx. (+26, 0, -145). The arc is a *visual preview*, not flight physics or collision logic.
- **Anchor C — far silhouette:** an irregular open-ring volcano with a visible magma throat, cliff rock instancing, ash plume, broad distant lava river and rim layers. The volcano stands well away from the near vehicle's road.
- **Palette:** neutral black/charcoal basalt, dim amber shoulders, orange-red emissive magma and small cyan branch guide marks, rather than a dense post-processing Bloom pass.
- **Coordinates:** +X right, +Y up, -Z ahead, origin beside road at approximately Y=0. A shared 50° showroom camera and vehicles must be added by GPT 6.

## Runtime contract / visual comfort

- `createUpcomingEnvironment(scene: THREE.Scene)` immediately attaches a named environment group and returns `{ group, update, dispose }`.
- `update(timeSeconds, quality, reducedMotion)` drives lava ShaderMaterial time, a bounded lava point-light pulse, GPU sparks, volcano ash drift, slight lava-fall movement and very low-opacity heat shimmers. No RAF, DOM, camera, renderer, car, shared VFX system or race state is created.
- **High:** full 48 spark vertices and seven ash blobs. **Medium:** 18 spark vertices and three visible ash blobs. **Low:** hide spark, ash and heat layers; preserve both ground and airborne path cues, road and landing.
- **Reduced Motion:** freezes magma motion (`uTime=0`), returns light to a steady intensity and hides drifting ash/sparks/heat. The essential landscape, turn and cyan landing guide remain visible.
- No per-frame geometry/material allocations or particle-buffer uploads; most scenery is static or instanced. All environment-owned mesh geometry and material resources are deduplicated and disposed exactly once with group detach. These are intended budgets, not measured draw-call/FPS claims.

## TDD / verification evidence boundaries

Tests assert scene/depth anchors, road geometry around the home car, hairpin extent, live lava + light response to time, deterministic repeated updates, Reduced Motion, quality visibility, absence of owned camera and idempotent GPU resource disposal.

**Do not mark visual acceptance complete from this document or the unit tests.** Required follow-up in GPT 6 shared-host integration:

1. Capture real WebGL ground and airborne screenshots at 1440×900 and 390×844, Medium, two animation times.
2. Compare both viewport shots with the JPEGs for three landmarks, road/split/landing visibility, camera/car scale, rock-arch silhouette and orange lighting. Confirm the vehicle doesn't penetrate the road or causeway.
3. Check Low/Medium/High, Reduced Motion, 30/60/120 FPS frame pacing, draw calls and memory, device-specific WebGL limits, layout and two locales.
4. Run focused TDD, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify` and inspect exact-HEAD CI. The scene has not been visually accepted in the actual home app until GPT 6 mounts it.

## Known visual deviations / future polish

- Source JPEGs use highly detailed weathered basalt, atmospheric volcanic eruption, brighter painted highlights and subtle smoky volumetric perspective. This procedural geometry approximates the silhouette and layers rather than pixel-matching photorealistic art.
- The magma shader moves luminance and veining on actual 3D river meshes; the heat haze is a translucent motion layer, **not** screen-space refraction or a fluid simulation. The rock-arch falls are glowing 3D columns, not a volumetric liquid waterfall.
- The cyan airborne route is an intentional guide cue, not a physical flyable path, checkpoint system, collision, replay, AI or a full 13–16 km level.
- The actual home player/rivals, three-quarter camera and shared NITRO/airflow are outside this art branch. Their absence on this branch's standalone scenery is expected, not a race feature claim.
- Real browser screenshots and measured shader/render performance remain **PENDING** until an integrated scene is running and checked.
