# Monsoon Ruins — Stage 1 home teaser art

## Status and provenance

- **Scope:** Stage 1, *雨林失落神殿 / Monsoon Ruins*, single START → distinct FINISH point-to-point race (not a lap circuit).
- **Delivered image:** `public/track-teasers/monsoon-ruins.jpg`
- **Image commit:** [`6641eaae32c5ca597b326909d1925411094c9b52`](https://github.com/weskao/skyline-rush/commit/6641eaae32c5ca597b326909d1925411094c9b52)
- **Verified image Git blob SHA:** `cdb8c3dd7fa55ded9b37c564fe6f2c211923cada`.
- **Actual native rendered raster:** **3072 × 1152 pixels** (not a resize of either low-resolution source JPEG).
- **Actual uploaded JPEG bytes:** **461,751** (approximately 451 KiB). Progressive JPEG, three-channel RGB authored in sRGB-style colors; the committed JPEG is untagged (no embedded ICC profile), so explicit ICC-tagged sRGB export remains a technical follow-up if required.
- **Creation technique:** custom procedural raster illustration (gradient/noise/texturing, geometry layers and particles). This is **not** an AI-photoreal image, not a game screenshot and not a playable Three.js scene.
- **No text, watermarks, logos, map diagrams or simulated game UI** are baked into the result.

## Exact references read

1. **Ground:** `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-01.jpg` — colossal ancient stone face, heavily planted jungle canyon, waterfalls, low chase-style road and rain.
2. **Aerial/branch:** `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-02.jpg` — stone aqueduct/viaduct across falls, elevated flight shortcut and distant depth layers.
3. **Course schematic:** `docs/designs/new-tracks/route-schematics/monsoon-ruins.svg` — simplified course graph only, main path and a fork/rejoin; **not** a pixel-accurate circular minimap.
4. `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, `AGENTS.md`, `CLAUDE.md`.

## Palette and environmental identity

- Deep canopy/night-rain green: `#102F2F`, `#1A5349`; middle-ground moss: `#2F7759`.
- Ancient weathered grey-green stone: `#5C8668`; wet mud / silty gravel: `#6F6350`.
- Filtered daylight, rainwater and waterfall cyan: `#9BCBD0`; restrained vehicle nitro glow: `#23A6F7`.
- Bright enough to retain the **visible muddy S-bend and road shoulders**, instead of hiding them behind deep-black storm fog.

## Framing, route depiction and landmarks

- **Foreground/main ground race:** the naturally curved wet dirt S-road is visible, without a closed-race loop or misleading lap counter. Keep line-of-sight to the next corner.
- **Main silhouette:** enormous carved guardian face above stepped, moss-stained sanctuary, placed around the middle of the panorama.
- **Mid/right aerial read:** layered rock viaduct and long waterfalls, a distinct elevated incline representing the alternate flight path, and a continuation/landing region beyond the bridge. Perspective is illustrative; functional shortcut legality remains unverified.
- **Background separation:** distant hills and high dense green canopy; waterfalls drop behind the stone bridge instead of hiding the road.
- **Left-third text safety:** reduced landmark/vehicle contrast at x ≈ 0–1024; no baked title or controls. Principal road/temple/bridge anchors sit middle/right.
- **Mobile crop safety:** review a centered-to-right focal crop around x ≈ 58–65% in the consuming home UI; the temple guardian and road should remain identifiable, but not every right-edge bridge span will fit a narrow portrait crop. **Not visually tested within the running app.**

## Weather, detail and readability

Diagonal rainfall is moderately translucent; ground remains readable. Waterfalls use brighter streams and low-opacity mist. Puddles and vehicle glow provide wet-weather cues. Leaves and rocks are staged near margins, not placed in the foreground over the S-bend. Avoid over-bloom, dark road occlusion and foreground foliage blocking the player's route.

## Intentional departures and acceptance boundary

- **Style deviation:** this original raster is a deliberately **stylized procedural concept**, not the requested fully cinematic / photorealistic high-fidelity AI image. The source JPEGs are small storyboard crops and were treated as composition references, not enlarged into alleged native detail.
- The stone face and bridge have simplified stylized geometry, and the aerial split/merge are readable only as visual suggestions. No image can certify 3D CourseGraph topology, ground contact or landing safety.
- The artwork is the **Stage 1 home teaser only**; it is not added as a live Three.js backdrop and does **not** satisfy the real-WebGL visual acceptance gate.
- No shared UI, TypeScript, locales, CSS, tests, Stage 2, `develop`, `main`, PR or deployment was changed.
- Follow-up still required: real mobile-crop/desktop-home validation, full cinematic-art review, explicit ICC-tagged sRGB export if demanded, and separate real WebGL flight/ground acceptance when game implementation begins.

## Image evidence

The JPEG path and blob SHA above were read back from GitHub after the image-only commit. This design record is a descriptive handoff; it does **not** claim real-game visual QA, performance testing or CI success.
