# World Tour Tracks, Live Minimap and Name Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver five playable, visually distinct 5–8 km world-tour courses plus a main-route preview/live four-driver minimap for all ten courses and en/zh-TW track-name switching.

**Architecture:** Keep `RACE_TRACKS` IDs and race simulation distance as canonical progression. Share one deterministic main-road path sampler between Three.js placement and SVG course overviews; use one small SVG route component for both menu previews and HUD, and data-driven geometry/landmark configurations for five scenes. Name translations are a UI-only lookup, never persisted as identifiers.

**Tech Stack:** Vue 3, Vite 7, Three.js 0.180, vanilla JavaScript ESM, native SVG, Node 22+, node:test and Playwright. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-21-world-tour-tracks-minimap-i18n-design.md`

## Global Constraints

- Branch: `feature/world-tour-tracks-minimap-i18n`, based on `main` at `ec9f9ca2ffb0cd8a720e5f25775d4ee22c2e2a55`; do not merge or deploy without user authorization.
- Retain five legacy IDs in order: `coast` 5000, `neon` 4000, `canyon` 6000, `aurora` 5500, `spiral` 5600; preserve ghosts, localStorage, traffic/rivals, NITRO, BOOST, FLY and four competitors.
- Add exactly: `taipei` 6200, `tokyo` 6800, `alpine` 7600, `coastal` 5800, `cosmic` 8000.
- Each course has a legible, distinct *physical* main-path silhouette; neither the overview nor live map discloses shortcut geometry. This is an open sprint, not a mandatory closed loop.
- No separate copy of `world.js` per theme. Reuse existing procedural/instanced meshes and existing quality/reduced-motion settings.
- Only localized course names: `en` and `zh-TW`; all other copy remains English, with stable fallback to en.
- Respect `CLAUDE.md`: `make dev-unlocked` is local-only; never ship or modify it into a runtime/public unlock switch.
- Every task uses red/green TDD, passes its focused checks plus `npm test` and `npm run build` before commit; browser tasks additionally run their focused Playwright suite.
- Use real browser captures from the feature branch for delivery. Concept illustrations are not substitutes for captured game footage.

## File Ownership / Integration Contracts

| File | Ownership |
| --- | --- |
| `src/track-paths.js` (new) | Pure, deterministic path coordinates, tangent frames and public overview sampling |
| `src/route-map.js` (new) | SVG path formatting, DOM element creation, track-distance marker projection, cached 2D geometry |
| `src/i18n.js` (new) | Two-locale track-name dictionaries, fallback, validated preference storage |
| `src/track-themes.js` (new) | Five new track palettes and authored hero landmark distances/offsets; shared prop types |
| `src/world-tour-scene.js` (new) | Reusable, bounded Three.js road/props for new courses; one renderer rather than one per locale |
| `src/game.js` | New track catalog and reusable section rules only; keep numeric simulation untouched when feasible |
| `src/world.js` | Route sampler adapter for new tracks, reused landmark renderer; legacy road and Sky Spiral preserved |
| `src/App.vue` | Small fixed DOM shells for route previews, live HUD and locale control |
| `src/main.js` | Event wiring, cached map/driver marker updates, names on current UI surfaces |
| `src/style.css` | Accessible responsive map/HUD, theme accents and mobile collision avoidance |
| `tests/track-paths.test.js`, `tests/route-map.test.js`, `tests/i18n.test.js`, `tests/world-tour.test.js` | New focused node:test files |
| `tests/route-map-browser.spec.js`, `tests/world-tour-browser.spec.js` | New focused Playwright acceptance coverage |

## Review Focus

1. **Blocked or malformed locale storage:** UI loads in English, permits switching without crashing; tested in Task 4.
2. **Race HUD near start, finish, respawn or airborne shortcut:** all four markers remain in bounds and follow main route only; tested in Task 3.
3. **Pause, restart, daily challenge and back-navigation:** route/map switches and updates without orphaned markers or stale labels; tested in Tasks 3 and 4.
4. **Small portrait (320×568) and short landscape (844×390):** minimap cannot obscure or intercept critical touch controls; tested in Task 9.
5. **Tight hairpins, city turns, tunnel entrances and elevated space road:** sample points/frames stay finite/continuous and align with car and roadside geometry; tested in Tasks 1 and 6.

---

### Task 1: Canonical path sampling (existing courses first)

**Files:**
- Create: `src/track-paths.js`, `tests/track-paths.test.js`
- Reference: `src/sky-track.js`, `src/world.js:17-18`, `src/game.js:1-57`

**Interfaces:**
- Produces: `trackPoint(trackId, distance) -> {x:number,y:number,z:number}`; `trackFrame(trackId, distance) -> {point,forward:number[3],right:number[3],up:number[3]}`; `trackOverview(trackId, count=128) -> Array<{distance:number,x:number,y:number}>` with deterministic normalized [0,1] SVG-map coordinates.
- Consumers: Tasks 2, 3, 5, 6, 7, 8.

- [ ] **Step 1: Write failing tests** in `tests/track-paths.test.js`: old Coast point at 1000 equals sinusoidal centre/X, ground Y=0 and Z=-1000; spiral samples at 1100/1650/2200 show a full circle and rising altitude; all five old IDs have finite normalized overview samples with first distance 0 and last distance exactly track.length; `trackFrame` vectors are unit, perpendicular and deterministic.
- [ ] **Step 2: Run** `node --test tests/track-paths.test.js`. Expected: FAIL because `track-paths.js` is absent/exports missing.
- [ ] **Step 3: Implement** the three exports. Reuse original `roadCenter` math for four legacy tracks and call `skyPoint/skyFrame` for `spiral`. Fit X and Z to a centered, aspect-preserving 2D overview, reserving ~8% padding; any X exaggeration must be a single documented presentation-only scale; use progress samples to interpolate marker coordinates later. Clamp distances and reject unknown IDs with an explicit error.
- [ ] **Step 4: Run** `node --test tests/track-paths.test.js && npm test && npm run build`. Expected: zero failures; build exits 0 and production unlock guard passes.
- [ ] **Step 5: Commit** `git add src/track-paths.js tests/track-paths.test.js && git commit -m "feat(track): add shared canonical route sampling"`.

### Task 2: SVG whole-course preview component

**Files:**
- Create: `src/route-map.js`, `tests/route-map.test.js`
- Modify: `src/App.vue:102`, `src/main.js:179-225`, `src/style.css:629-681`

**Interfaces:**
- Consumes: `trackOverview(trackId,count)`.
- Produces: `createRouteMap(trackId, {live=false}={}) -> {element:SVGSVGElement, updateDrivers(drivers), destroy()}`; `drivers` is an array of `{id:string,distance:number,player:boolean}`; route samples cached per track ID.
- Task 3 wires live updates. Task 4 updates labels separately.

- [ ] **Step 1: Write failing tests** in `tests/route-map.test.js`: string/point path generation uses the actual 128 sampled route points, has exactly one ordinary route polyline with a visible start/end, uses deterministic SVG coordinates, and contains no shortcut section descriptors. Test each of five legacy IDs, including spiral, and verify malformed progress clamps.
- [ ] **Step 2: Run** `node --test tests/route-map.test.js`. Expected: FAIL on the missing module/export.
- [ ] **Step 3: Implement** a lean SVG helper (no external mapping library); expose the DOM factory plus a pure internal/exported path formatter if unit tests need it. Add a `.track-route-map` mount in each existing `data-track` card, including disabled cards. Initialize each once after Vue static mount; do not create paths in the animation loop.
- [ ] **Step 4: Run** `node --test tests/route-map.test.js && npm test && npm run build`. Expected: all pass; screenshots of the home strip can distinguish at least the existing spiral from flat road paths.
- [ ] **Step 5: Commit** `git add src/route-map.js tests/route-map.test.js src/App.vue src/main.js src/style.css && git commit -m "feat(ui): show shared SVG route overviews in track picker"`.

### Task 3: In-race minimap with four live competitors

**Files:**
- Modify: `src/App.vue:119-124`, `src/main.js:688-1020`, `src/style.css:97-113,344-428`
- Create: `tests/route-map-browser.spec.js`

**Interfaces:**
- Consumes: `createRouteMap(trackId,{live:true})` with `updateDrivers([{id:'YOU',distance:race.player.distance,player:true}, ...race.rivals])`.
- Produces: `#race-route-map` HUD region and its four rider marker nodes, distinct from the home SVG snapshots.

- [ ] **Step 1: Write failing Playwright tests**: start race, `#race-route-map svg` exists with four named markers; after controlled race progress their mapped marker coordinates change; paused map stops advancing; restart resets progress; jumping over shortcut never adds a shortcut branch or non-public path. Clamp negative/over-finish actor distances in `tests/route-map.test.js`.
- [ ] **Step 2: Run** `npx playwright test tests/route-map-browser.spec.js`. Expected: FAIL due to absent race map region/markers.
- [ ] **Step 3: Implement** the HUD mount in the existing `.race-info`; use one cached SVG for current track and update markers only when racing states change / on a bounded frame cadence. A marker's track distance is independent of lateral position/flight. Reinitialize the SVG when `race.trackId` changes (including daily events, choose-track, restart) but not on every animation frame. Keep the route fixed at full-course scale.
- [ ] **Step 4: Run** `npx playwright test tests/route-map-browser.spec.js && npm test && npm run build`. Expected: Playwright passes and build remains release-safe.
- [ ] **Step 5: Commit** `git add src/App.vue src/main.js src/style.css src/route-map.js tests/route-map.test.js tests/route-map-browser.spec.js && git commit -m "feat(hud): add live four-racer course minimap"`.

### Task 4: English / Traditional Chinese track-name localization

**Files:**
- Create: `src/i18n.js`, `tests/i18n.test.js`
- Modify: `src/App.vue:97-103,142`, `src/main.js:172-282`, `src/style.css`
- Test: `tests/route-map-browser.spec.js`

**Interfaces:**
- Produces: `SUPPORTED_LOCALES = ['en','zh-TW']`; `trackName(trackId, locale) -> string`; `loadLocale(storage?) -> 'en'|'zh-TW'`; `saveLocale(locale,storage?) -> void`; static `TRACK_NAMES` (all ten IDs, new five reserved before Task 5).
- Consumers: current card text, selected heading, history selector, daily labels, ghost status, result route headings and future map captions.

- [ ] **Step 1: Write failing tests**: `trackName('coast','zh-TW')==='海岸公路'`, `trackName('taipei','zh-TW')==='台北古都'`, `trackName('cosmic','en')==='Cosmic Orbit'`; unknown locale falls back to en; unsupported/stale/blocked saved preference falls back to en; preference storage never writes track IDs. Browser test toggles `EN`/`繁體中文` and checks card, history selector, selected heading update without reload or changes to IDs.
- [ ] **Step 2: Run** `node --test tests/i18n.test.js` and focused Playwright language scenario. Expected: FAIL on missing module/control.
- [ ] **Step 3: Implement** dictionary and storage helpers, small home-screen toggle; retain `RACE_TRACKS[id].name` as fixed English data. Because `App.vue` is intentionally a one-time static shell, update text nodes on toggle through `src/main.js` without rebuilding the Vue app. Keep `trackNotes` and every non-course UI message in English; switch only course-name substitutions. Include accessible control state/labels and a CJK-safe font fallback.
- [ ] **Step 4: Run** `node --test tests/i18n.test.js && npx playwright test tests/route-map-browser.spec.js && npm test && npm run build`. Expected: pass with preserved canonical IDs/unlocks.
- [ ] **Step 5: Commit** `git add src/i18n.js tests/i18n.test.js src/App.vue src/main.js src/style.css tests/route-map-browser.spec.js && git commit -m "feat(i18n): localize all track names in en and zh-TW"`.

### Task 5: Add the five deterministic course definitions and distinct path profiles

**Files:**
- Modify: `src/game.js:5-58`, `src/track-paths.js`, `src/main.js:172-178`, `tests/game.test.js:442-500`, `tests/track-paths.test.js`
- Create: `tests/world-tour.test.js`

**Interfaces:**
- Produce five `RACE_TRACKS` entries with IDs/lengths from Global Constraints; path sampler from Task 1 supports all ten with a distinct 2D silhouette per new course.
- Consumers: Tasks 6–9.

- [ ] **Step 1: Write failing tests**: assert the exact ten IDs, first-five lengths unchanged and new lengths `[6200,6800,7600,5800,8000]`; non-overlapping, valid sections within range and a shortcut corridor in each new course; seeded repeatability for `createRace(id)`; at least 120 finite/continuous sampled points with bounded position/heading deltas; five new routes are visually distinguishable using normalized point arrays; no shortcut-only geometry in public `trackOverview`; each course can start and finish through existing deterministic race simulation. Update only legacy assertions whose expected catalog count has changed, not behavioral checks.
- [ ] **Step 2: Run** `node --test tests/world-tour.test.js tests/track-paths.test.js tests/game.test.js`. Expected: FAIL for missing new IDs/profiles.
- [ ] **Step 3: Add** five definitions, course seeds and authored main-route waypoint/config data. Implement continuous (C1) spline evaluation from distance with distance-scaled parameterization, explicit tangent and optional elevation, preserving positive forward travel and road continuity; avoid direct line segments/kinks and unnatural turn radii. New section behavior should reuse old `tunnel`/`uphill`/`crosswind`/`shortcut` where possible; put any new ramp/gap sections behind tests of the existing recovery behavior. Make all new route lengths 5–8 km exactly as spec.
- [ ] **Step 4: Run** `node --test tests/world-tour.test.js tests/track-paths.test.js tests/game.test.js && npm test && npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `git add src/game.js src/track-paths.js src/main.js tests/game.test.js tests/track-paths.test.js tests/world-tour.test.js && git commit -m "feat(track): register five world-tour courses and main paths"`.

### Task 6: Real drivable road/camera placement on five new paths

**Files:**
- Create: `src/world-tour-scene.js`
- Modify: `src/world.js:17-18,232-802`, `src/track-paths.js`, `src/effects.js` where required
- Test: `tests/world-tour.test.js`, `tests/world-tour-browser.spec.js`

**Interfaces:**
- Consumes: `trackPoint(id,d)`, `trackFrame(id,d)` and `race.sections`.
- Produces: `createWorldTourScene(scene) -> {update(trackId, distance, quality, raceSections),hide(),dispose()}`; geometry shares the exact canonical route centerline used in the minimap. Existing four flat tracks and `skyScene` continue unchanged.

- [ ] **Step 1: Write failing tests**: sampled centreline/car mesh positions match projected public path at representative distances on every new course, incl. mountain hairpins and elevated space route; tangent and banking smoothly align car/road/camera; road gaps/tunnels stay at declared sections, and no NaN shader/geometry positions. Browser smoke tests switch into two unlocked new courses with `make dev-unlocked`-equivalent Vite config and verify renderer remains error-free while moving.
- [ ] **Step 2: Run** `node --test tests/world-tour.test.js` and `npx playwright test tests/world-tour-browser.spec.js`. Expected: FAIL for missing renderer integration/new scene.
- [ ] **Step 3: Implement** one rolling 3D road renderer for all five courses, shared instanced rail/stripe/road meshes and quality budgets. Adapt cars (player, all rivals and ghost), follow/look camera, finish line, roadside signs, traffic and pickups to road-coordinate transforms. Reuse existing `sky-scene.js` patterns where appropriate but extract only shared helpers that have at least two concrete call sites. Ensure effects are road-relative on elevated paths; eliminate flat y=0 placements that leave hovering/underground objects. Preserve special lane and altitude physics relative to roadway.
- [ ] **Step 4: Run** `node --test tests/world-tour.test.js && npx playwright test tests/world-tour-browser.spec.js && npm test && npm run build`. Expected: all pass, no WebGL initialization/runtime errors.
- [ ] **Step 5: Commit** `git add src/world-tour-scene.js src/world.js src/track-paths.js src/effects.js tests/world-tour.test.js tests/world-tour-browser.spec.js && git commit -m "feat(world): render drivable curved world-tour highways"`.

### Task 7: City hero scenes — Taipei and Tokyo

**Files:**
- Create: `src/track-themes.js`
- Modify: `src/world-tour-scene.js`, `src/world.js`, `src/style.css`
- Test: `tests/world-tour.test.js`, `tests/world-tour-browser.spec.js`

**Interfaces:**
- Produces: `themeFor(trackId) -> {palette,weather,landmarks,repeatProps}` for `taipei` and `tokyo`. Landmark entries use `{kind,distance,side,offset,scale}` resolved through the canonical frame, never hard-coded camera-space coordinates.
- Consumes: Task 6 reusable rendering module.

- [ ] **Step 1: Write failing tests**: Taipei has recognizable Presidential Office façade, North Gate and temple-street entries at distinct, visible main-route distances; Tokyo has Shibuya-crossing, Tokyo-Tower silhouette and elevated-rail entries; landmark placement is finite and left/right offsets are road-relative; theme palettes are different and respect low-quality prop reductions.
- [ ] **Step 2: Run** `node --test tests/world-tour.test.js`. Expected: FAIL for missing city-themed entries.
- [ ] **Step 3: Implement** shared block/arch/roof/lamp primitives and instanced city blocks; make two distinct city compositions with requested landmark silhouettes, road markings and atmospheres. No duplicated theme-specific renderer, proprietary imagery or runtime network fetches. Do not reconstruct actual GPS roads.
- [ ] **Step 4: Run** `node --test tests/world-tour.test.js && npx playwright test tests/world-tour-browser.spec.js && npm test && npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `git add src/track-themes.js src/world-tour-scene.js src/world.js src/style.css tests/world-tour.test.js tests/world-tour-browser.spec.js && git commit -m "feat(scene): add Taipei and Tokyo landmark drives"`.

### Task 8: Alpine, coastal and cosmic themed scenery

**Files:**
- Modify: `src/track-themes.js`, `src/world-tour-scene.js`, `src/world.js`, `src/style.css`
- Test: `tests/world-tour.test.js`, `tests/world-tour-browser.spec.js`

**Interfaces:**
- Extends `themeFor(id)` with `alpine`, `coastal`, `cosmic`; consumes Task 6 shared instanced renderer and Task 5 real path geometry.

- [ ] **Step 1: Write failing tests**: `alpine` yields mountain switchbacks, tunnel entrance and parallel railway with a train that never occupies the road mesh; `coastal` includes lighthouse, sea cliffs and bridge; `cosmic` includes orbiting-planet backdrop, nebula starfield and space highway; no scenery geometry has invalid transforms; low quality has bounded prop counts and reduced motion disables optional atmospheric movement.
- [ ] **Step 2: Run** `node --test tests/world-tour.test.js`. Expected: FAIL for missing three theme profiles/landmarks.
- [ ] **Step 3: Implement** data-only theme entries and minimum novel prop primitives; share rocks/barriers/pillars/lighting by configuration. Use instancing and existing VFX controls. Keep outer-space setting visually distinct without creating a separate physics or material/shader pipeline.
- [ ] **Step 4: Run** `node --test tests/world-tour.test.js && npx playwright test tests/world-tour-browser.spec.js && npm test && npm run build`. Expected: pass.
- [ ] **Step 5: Commit** `git add src/track-themes.js src/world-tour-scene.js src/world.js src/style.css tests/world-tour.test.js tests/world-tour-browser.spec.js && git commit -m "feat(scene): add mountain rail, coast and cosmic scenery"`.

### Task 9: UI polish, accessibility, screenshots and documentation

**Files:**
- Modify: `src/App.vue`, `src/main.js`, `src/style.css`, `tests/route-map-browser.spec.js`, `tests/world-tour-browser.spec.js`, `README.md`, `README.zh-TW.md`
- Create: `artifacts/world-tour/` committed screenshots, `docs/world-tour-verification.md`

**Interfaces:**
- Consumes: finished scene/map/locale flows.
- Produces: authentic images from running branch: main course-picker (EN + zh-TW), each of the five new scenes, a live four-marker minimap, mobile portrait and short landscape. Route design diagrams may be exported alongside, separately labeled.

- [ ] **Step 1: Write failing responsive tests**: at `320×568` and `844×390` the map is in-bounds and does not overlap/intercept critical fly, steer, brake, boost and NITRO hit targets; all ten cards expose route outlines; selected locale and history names persist and switch correctly; four markers are distinct by outline/label and work with reduced-motion preference.
- [ ] **Step 2: Run** `npx playwright test tests/route-map-browser.spec.js tests/world-tour-browser.spec.js`. Expected: FAIL on missing polish expectations.
- [ ] **Step 3: Finish** mobile layout/aria/font issues and add automated screenshot capture to the Playwright test(s), targeting real URLs produced by the feature-branch development server. Capture actual rendered Three.js scenes with controls visible; save screenshot files in `artifacts/world-tour/` and explain capture conditions in `docs/world-tour-verification.md`. If a screenshot cannot be obtained, do not substitute a generated mockup and do not claim it was captured.
- [ ] **Step 4: Document** the catalog, country/theme summaries, minimap behavior and `EN / 繁體中文` preference in `README.md`; synchronise `README.zh-TW.md` using `scripts/readme-zh.mjs` (or translate and stamp manually). Confirm `make dev-unlocked` includes ten tracks, while `npm run build` keeps normal progression.
- [ ] **Step 5: Run** `npm test && npm run build && npm run test:browser`. Expected: all jobs exit 0. Check browser console/WebGL errors, no leaking unlock debug marker and no screenshot mismatch.
- [ ] **Step 6: Commit** `git add src/App.vue src/main.js src/style.css tests/route-map-browser.spec.js tests/world-tour-browser.spec.js README.md README.zh-TW.md artifacts/world-tour docs/world-tour-verification.md && git commit -m "test(docs): validate world-tour UX and capture game scenes"`.
- [ ] **Step 7: Create a draft PR** comparing the feature branch to `main`, confirm the fresh GitHub Actions unit/browser jobs, and provide PR/commit links and actual screenshot image links. Do not merge or trigger GitHub Pages deploy without a separate request.

## Task dependency matrix

| Task | Depends on | Shared contract to keep stable |
| --- | --- | --- |
| 1 | none | `trackPoint`/`trackFrame`/`trackOverview` |
| 2 | 1 | route sample to SVG + `createRouteMap` API |
| 3 | 1, 2 | driver `distance` to fixed main-route markers |
| 4 | none (UI integrates after 3) | stable IDs and `trackName` |
| 5 | 1, 4 | ten `RACE_TRACKS` entries + paths |
| 6 | 1, 5 | same 3D road coordinates from renderer and map |
| 7 | 5, 6 | `themeFor` plus landmarks at race distances |
| 8 | 5, 6, 7 | three themes use the same renderer |
| 9 | 2–8 | real screenshots, mobile tests and documentation |

**Handoff:** Review this plan and select either Subagent-driven or Native execution. Do not begin product code before that selection and review.
