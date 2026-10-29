# Phase 2 — Coast Visual Quality Benchmark (2026-10-27)

## Intent
Make the first Coast course the reference for a grounded racing environment with vivid arcade feedback. This phase is a scenic/art pass, **not** new gameplay, camera modes, a new renderer, or Phase 3 FPS configuration.

## Architecture and alternatives
- **Chosen:** reuse `src/world.js`'s road/lighting/sea shaders, pooled materials and existing Three.js instancing; add one isolated typed Coast scenery kit with bounded draw calls. Keep the engine .js where currently permitted by `CLAUDE.md`. This minimizes shader variants and preserves the Vue 3/TypeScript-first UI architecture.
- Rejected: model/texture downloads and heavyweight post-processing (new network/GPU costs); a new track/world renderer (risk to nine existing tracks); per-frame DOM/Vue-reactive scenic updates (unnecessary main-thread work).

## Visual contract
- Coast: cooler natural coastal-blue distance atmosphere, warm restrained afternoon highlights, matte slate asphalt, clear readable lane/edge markings, mineral coastal rocks and wind-shaped coastal trees **outside** the car/road clearance corridor. Keep the existing vehicle silhouette and legible rear lamps; reuse NITRO/BOOST/FLY/DRIFT feedback, slightly reducing Coast's resting bloom without dulling active boost.
- Instanced coast decoration: three shared-mesh draw submissions at most, bounded instance tiers Low/Medium/High; only refresh transforms when a streamed tile or tier changes, not every frame; no new lights, textures, network assets or render passes.
- Don't alter course physics, road collision shapes, track preview camera poses, locales, sound/haptics, cloud save, controls, accessible interactions or track progression.
- Reduced Motion/comfortable mode stays governed by the existing VFX pipeline. All three quality tiers retain the car's visibility; scene objects never enter the drivable 24-m corridor.

## Acceptance gates (independent)
1. RED before GREEN: deterministic tests for Coast palette/material intent, scenery pooling/quality bounds, stable streaming and road clearance.
2. Real running WebGL Coast screenshots: ready showcase and running chase camera for 1440×900, 390×844, 320×740 and 844×390. Different preview cameras, first-person, locales and reduced-motion require runtime signoff; never substitute generated artwork.
3. Comparison with the exact base commit using `?perf` p50/p95/FPS and renderer.info calls/triangles. CI SwiftShader is a **software** renderer and must not be represented as physical hardware performance; report missing measurements explicitly.
4. Strict TypeScript typecheck, unit, build, browser, layout, World Tour, cloud-save, and exact-HEAD `quality-gate`. Merge directly without PR **only** if all gates and latest-main synchronization pass. Otherwise keep feature branch unmerged.

## Audio assessment
Purely visual changes use the existing engine cues. No new sound or music is warranted because the action semantics and existing VFX/SFX triggers do not change.
