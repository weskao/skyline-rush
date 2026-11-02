# Rendering performance, shaders and repeated work

Read before writing or changing renderer, scene, effect or shader code, or before adding a cache, memo, instancing or any per-frame / per-row computation. Scoped rule: `.claude/rules/performance-review.md`.

## Rendering performance is a design requirement from day one — all ten tracks

**Preserve perceived quality first.** Optimizations must keep road geometry, textures, materials,
lighting, fog, landmarks, car silhouettes, shadows, motion effects, view distance, rendering
resolution and accessibility equivalent at the **same** Low/Medium/High tier. Never claim a
performance win obtained by silently removing scenery, reducing pixel ratio, shortening the
draw distance or disabling VFX. A deliberate visual tradeoff requires separate user approval
and real WebGL before/after evidence; prefer zero-fidelity-loss optimizations.

**Before writing or changing any renderer/scene/effect code:**
1. Inspect all affected routes: Coast, Neon, Canyon, Aurora, Sky Spiral and Taipei, Tokyo,
   Alpine, Coastal, Cosmic. Profile the *existing* pipeline first (Draw Calls, Triangles,
   FPS, frame-time p50/p95, CPU work, GPU uploads, memory where measurable) under identical
   viewport, quality, camera, race distance and browser conditions. Identify a dominant
   cost before adding a cache, shader, batch or third-party package.
2. Write a focused failing test (RED) for the waste or correctness bug, e.g. duplicate
   GPU draw submissions, rebuilt geometry/instance matrices on unchanged frames, missed
   cache invalidation, repeated JS allocations or resource leaks. Measure reduction with
   deterministic call/upload/instance counters; wall-clock times are supporting evidence,
   not brittle pass/fail assertions. Observe GREEN, then refactor minimally.
3. Reuse the shared Three.js geometry and material instances. Where visually identical,
   static geometry/material combinations may use `InstancedMesh` and cross-chunk pooling,
   but preserve every object's world transform, object count, solid obstacle, lighting
   and existing material pipeline. Do **not** merge distinct materials, animated objects,
   unique terrain or transparent-order-dependent objects merely to reduce Draw Calls.
4. Cache immutable path samples, static transforms and shader resources; skip recomputation
   and `BufferAttribute.needsUpdate` / `instanceMatrix.needsUpdate` when nothing changed.
   A cache **must** define ownership, disposal and invalidation (track switch, streamed
   chunk entering/leaving, quality change, camera/LOD dependency, relevant data updates,
   WebGL context restoration). Do not allocate/dispose GPU resources or rebuild scene
   hierarchies in the ordinary frame loop. Release resources only when nobody else uses
   them; pooling must restore visibility and avoid duplicate draws when rebuilt.
5. Control batching's downside: combined mesh bounds can defeat frustum culling and
   increase overdraw/Triangles. Benchmark Draw Calls **and** Triangles, p95 frame time,
   GPU memory/upload costs and visual occlusion; prefer spatially bounded pools over
   enormous global batches. Faster CPU submissions are not proof of lower GPU energy.
6. Keep render pacing (Auto/30/60/90/120 where implemented) separate from deterministic
   fixed-step physics, AI, Ghost and Cloud Save. Never alter race rules or road topology
   to make the renderer faster. Vue 3 + TypeScript strict remain the default for new
   controllers/services; Three.js hot-path JS is an existing deliberate exception.
7. Validate **all ten routes** at 1440×900, 390×844, 320×740 and 844×390 where
   applicable, ready-screen Showcase plus races, English/zh-TW, Reduced Motion,
   Low/Medium/High, pause/restart/track switch and mid-race streaming. Check camera/
   vehicle/landmark visibility, collision parity, Ghost, Cloud Save and no shader-compilation
   stalls or black frames. Use actual running WebGL captures, not generated illustrations.
8. Report a per-track **before → after** table for Draw Calls, Triangles, FPS and
   frame-time p50/p95. Note which figures come from software WebGL CI (not a controlled
   physical-device benchmark); never claim mobile heat/battery or substantial performance
   gains without matching real measurements. Run `npm run typecheck`, `npm test`,
   `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour and
   Cloud Save checks, and the full GitHub CI `quality-gate` for the *final HEAD*.
   Record RED/GREEN evidence and any unverified gate in `TODO.md`; merge only when
   project approval requirements are met.

For implementation details, follow `.claude/rules/performance-review.md` and
`docs/regression-first-workflow.md`. Optimize the shared root cause, not a
track-specific cosmetic workaround.

## No shader compiles or NaN pixels mid-race

→ Read `.claude/rules/performance-review.md` ("Shaders compile at first draw", "One NaN pixel
is a black frame"): the rules, diagnosis steps and guard tests live there.

## Repeated work: dedupe first, cache second, prove it with a count

- **Do less before caching.** Most waste here is the same value computed twice in one pass, not
  across passes: the World Tour road rebuild sampled the centreline ~69 times per row because
  `local()` re-derived a point `trackFrame()` already held (`frame.point`) and the same origin
  every call. Pass the value you hold; reach for a cache only when that is not enough.
- **Every cache states its invalidation in a one-line comment**, and its key carries everything
  the result depends on: track id + origin, locale + options (`formatDate`/`formatNumber` in
  `src/i18n.ts`), stored string for storage parses. Per-render caches (`modeRecordLookup` in
  `src/history-ui.ts`) are the default for UI reading `localStorage`; never return a cached
  object to callers that may mutate it.
- **Nothing is built per frame or per row**: `matchMedia`, `querySelector`, `Intl.*` formatters,
  `JSON.parse` of a storage blob (mode ghosts run to 512 KB). Create once at setup, read
  `.matches`/reuse the formatter; `tests/world-frame-queries.test.js` guards `src/world.js`.
- **Test with deterministic counters, report with timings.** RED → GREEN on a call count (trig
  calls per rebuild, `getItem` per render, formatter constructions), never on wall-clock time,
  which flakes on CI. Report the before/after timing from a bench alongside it. A module-level
  cache outlives a test, so give the test inputs no other test uses, or count only what it owns.
- **Cached media must still play when the cache is unavailable.** Cache Storage is missing on
  plain-http LAN dev servers and can throw; fall back to the network URL and never let a failed
  download be cached (`src/release-media-cache.ts`). A blob `src` decodes its first frame, so
  judge "never autoplayed" by `play` events, not `currentTime === 0`.
- **A legacy file over its `LEGACY_CEILINGS` entry is compacted, never given more room**; when it
  shrinks, lower its ceiling in the same commit.
