---
paths:
  - ".mcp.json"
  - ".codex/config.toml"
  - "scripts/crucible-mcp.mjs"
  - "src/acquisition-car-camera.ts"
  - "src/acquisition-car-stage.ts"
  - "src/garage-camera.ts"
  - "src/showcase-framing.ts"
  - "docs/designs/crucible/**"
---

# Crucible MCP: look at a shot before coding it

Crucible (`crucible` in `package.json`) is a second 3D engine that an agent drives through MCP. It
loads a GLB, returns a PNG after every camera or light change, compares up to four views in one
grid and renders stills or MP4. Use it to choose numbers by looking. The game still draws with
Three.js, and the car premiere's three study angles in `src/acquisition-car-camera.ts` are the
model result: a study ends as data in the module that owns the shot.

## What it is good at here

| Task | Crucible tools | The result goes to |
| --- | --- | --- |
| Reveal, showroom or title shot of a car or prop: angle, lens, framing | `scene_create_asset`, candidates as branches, one `scene_review` grid | The owning module's shot table (premiere: yaw, pitch, fill, focus, FOV in `src/acquisition-car-camera.ts`) |
| Cut order and move timing | Motion tracks, a draft MP4 | The durations in that table |
| Key, rim and fill direction for a showcase | `scene_apply` on the lights, `scene_look` | Directions and ratios as a start; strengths are tuned in the game |
| A new GLB before it is wired in: silhouette, scale, pivots, material slots | `scene_inspect` bounds, `scene_look` with `labels: true` | Fixes in the Blender master |
| A question of taste for the owner | `scene_ask_user` pins or lasso | The next edit |
| Turntable or draft still of a model for a design doc | Render jobs, `quality: "draft"` first | `artifacts/` (ignored) or the doc's media, labelled as a Crucible render |

## What it is not for

- **The game runtime.** Never import `crucible` under `src/`; a second engine must not reach the
  release bundle.
- **Asset masters.** `assets-src/<asset>/<asset>.blend` stays the source
  (`.claude/rules/3d-asset-pipeline.md`). `scene_export_glb` is for blockouts only.
- **Acceptance.** Materials, exposure, tone mapping and bloom differ between the two engines.
  Angles, field of view, framing and timing carry over; light strengths and material values do
  not. A Crucible image is never an in-game screenshot, and the real WebGL capture, desktop and
  phone, both orientations, is still required.
- **Courses, physics, HUD.** Road frames, vehicle dynamics and layout have their own rules and tests.

## Running a study

1. Read `node_modules/crucible/skills/build-crucible-scene/SKILL.md` (and
   `render-crucible-media/SKILL.md` before a render job). Call `scene_capabilities` with the
   topic before a field you have not used; never guess a field.
2. The `crucible` server in `.mcp.json` runs `scripts/crucible-mcp.mjs`. It copies every
   `public/models/**/*.glb` flat into `artifacts/crucible/assets` (the catalog lists top-level
   files only) and gives each launch its own job store under `artifacts/crucible/jobs/` (a store
   has one live owner). No `scene_*` tools in the session means the server is not enabled: say so
   and ask the owner to enable it; do not fall back to guessing the numbers.
3. Place a model by name (`assetName: "crimson-gt.glb"`). A changed GLB gets a new ID only after
   the server restarts.
4. Study every selectable car (`CARS` in `src/car-catalog.ts`), since one shot table serves all
   of them. The game shows every car at the Roadster's size (`fitToRoadsterSize`), so record
   framing relative to the car's bounds, never as a distance in Crucible metres.
5. Compare candidates side by side in one `scene_review`; judge the image, not the numbers.
6. Write the chosen values into the owning module in its own units, with its unit test and
   browser spec (premiere: `tests/acquisition-reveal.test.js`,
   `tests/acquisition-car-browser.spec.js`), then capture the real game.
7. Keep a study that shipped numbers reproducible: `scene_export_recipe` into
   `docs/designs/crucible/<study>.json`, checked for local paths first (public repo).

## Limits

- Needs a local Chrome; MP4 needs `ffmpeg`. Previews are 64 to 1024 px a side, four scenes open
  at most, 64 catalog files of 64 MiB each. No remote URLs and no file outside the catalog.
- KTX2 textures in a catalog GLB are transcoded with the installed `three`.
- The version is pinned in `package.json`, and before 1.0 a minor release can change the API. An
  upgrade is its own change: read `https://crucible.codepawl.com/changelog.json` first.
