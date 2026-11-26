# Stage B audit — integrated perf-thermal head

Scope: the p08 Stage B checklist, audited on the integration head (`1fcfa98a`) after every Wave 1 and Stage A
merge. Each row names a finding, the action and the evidence. Code changes follow TDD: RED observed, GREEN, then the
full gates.

Environments:

| Label | What it is | What it can show |
|---|---|---|
| **LOCAL-NODE** | Node 24 with Three r186, no WebGL (benches and unit tests) | Counts, upload bytes, digests and CPU timings. Timings were taken under heavy concurrent load (load average 40–60 from parallel agents), so they are noisy and not claimed |
| **LOCAL-CHROME** | Playwright Chromium on the same Mac, `dist/` build, `--workers=1` | Pass/fail browser specs, context attributes and pixel diffs. No device numbers |

No device, GPU-time or thermal number is claimed in this audit.

## Audit table

| # | Item | Finding | Action | Evidence |
|---|---|---|---|---|
| 1 | Unnecessary GPU render passes | The composer has 3 passes: RenderPass, UnrealBloomPass and the lens, which also tone-maps and encodes (`src/world.js:94-103`). OutputPass is gone. Garage and Coming Soon swap `renderPass.scene` instead of adding a pass. The wet-road mirror draws only on High and only when wet (`src/wet-reflection.ts:64`). | Clean | `tests/gpu-pipeline-browser.spec.js` asserts `passes: 3` (LOCAL-CHROME, passing) |
| 2 | Ineffective texture sampling | Road PBR maps use up to 8× anisotropy, Medium tier and up (`src/coast-assets.ts:309`). Repeating textures (cloud noise, nitro flame, skid marks) are mipmapped. Non-mipmapped `LinearFilter` is used only on textures that are never minified far (sea data, pickup halo, the acquisition shade). | Clean, no change. Removing anisotropy or mips would be a visual downgrade. | Code reading (file:line above) |
| 3 | Unnecessary MSAA buffers | Only the scene target `rt2` is multisampled (4×, or 2× on Low). The bloom chain is single-sample. `rt1` is never allocated. The canvas has `antialias: false`. | Clean | `gpu-pipeline-browser.spec.js`: `sceneSamples: 4, spareTarget: false` |
| 3b | Unneeded canvas depth buffer (found in this audit) | The main canvas kept the default `depth: true`. Every scene draw goes to a composer target or to the mirror target. The only draw to the canvas is the lens's full-screen quad, which draws first after the clear and doesn't need a depth test. A canvas-size depth attachment was allocated and cleared every frame for nothing. | **DONE.** `src/webgl-renderer.ts:8` now passes `depth: false` | RED: `node --test tests/webgl-renderer.test.js` failed (`The input did not match … depth: false`). GREEN: 3/3. Browser: `gpu-pipeline-browser.spec.js` asserts `canvasDepth: false` and the merged chain still matches the reference chain within 1 step. Pixel-identical by construction (see the note below). Saving, computed from the drawing buffer at 4 bytes per pixel: about 3.0 MB at 585×1266 and 11.7 MB at 2160×1350, plus one depth clear per frame. GPU-time effect: UNVERIFIED, because the host was too loaded to time it |
| 4 | Duplicate scene traversal or draw calls | `skipHiddenMatrixWork` exists only once (workstream 11). No second hidden-matrix skip was added by another workstream. Full-scene `traverse` runs only at setup or dispose (`src/world.js:911`), and the mirror runs `tag` at race start. `raceFramePending` is a field comparison (`src/world-frame-readiness.ts:35`). | Clean | `tests/parked-host-matrix.test.js`, `tests/scene-matrix-culling.test.js` in `pnpm test` |
| 5 | Ineffective particle buffer uploads | Two-range spans and `markRange` hold on the integrated head. Upload bytes and draw digests match the Stage A After column exactly (e.g. `launch-countdown` 4187 B/f with digest `811c9dc5`, `idle-after-burst` 5000 B/f with digest `e330ef77`). | Clean | `node scripts/vfx-buffer-bench.mjs --frames=600 --runs=3` (LOCAL-NODE) |
| 6 | Chunk streaming churn | Course streaming keeps its hysteresis on the integrated head: 41 chunk creations forward and 27 oscillating, 0 of about 1488 "no road 100 m behind" gaps. These are the same as the workstream 11 After numbers. | Clean | `node --experimental-strip-types scripts/course-streaming-probe.mjs [--oscillate]` (LOCAL-NODE) |
| 7 | Duplicate DOM or audio updates | HUD and route-map writes are guarded by `setIfChanged`, `setAttributeIfChanged` and `setTextIfChanged`. `sound.update` runs once per rAF callback (`src/main.js:565`), plus one-shot calls at race start and pause (`:328`, `:343`). The mixer writes each AudioParam at most once per 1/30 s. | Clean | `tests/hud-dom.test.js`, `tests/hud-compositing-browser.spec.js`, `tests/cpu-race-replay.test.js`; cpu-audio-bench coast: 2.36 param calls/tick |
| 8 | JS allocation, GC and memory leaks | `tests/scene-resource-cycles.test.js` passes. The HUD tick allocates about 8 small driver objects 13 times a second (`src/main.js:483`): a few hundred bytes a second, far below the per-frame VFX numbers, so it is not changed. The known remainders (`dashSamples` closures, `trackFrame` objects, `race-audio-events` cue array, rival closures) stay deferred with their measured reasons. | Clean, plus the documented deferrals | `pnpm test`; cpu-audio-bench `--min/max-semi-space-size=1`: 106.7 scavenges per 1k ticks on coast (LOCAL-NODE, a relative proxy) |
| 9 | Hidden or static screens still rendering | A paused race settles after 90 frames. Opaque dialogs and a lost context draw 0 frames. rAF stops in hidden tabs. Secondary preview stages render only while visible. Results and Garage keep drawing because they animate (workstream 20 item 10, REJECTED). | Clean | `tests/render-on-demand-browser.spec.js` (LOCAL-CHROME, passing); soak numbers in `frame-lifecycle.md` |
| 10 | Auto FPS causing sustained full load | Auto is a steady 60. 90 and 120 are manual only. Adaptive resolution is opt-in. Physics stays at fixed 1/60 s steps (at most 3 per callback). | Clean | `tests/fps-browser.spec.js` (LOCAL-CHROME), `tests/frame-pacing.test.js` |
| 11 | Cross-workstream duplication or regressions | Hidden-matrix skipping: one owner. Double invalidation: input and layout events only reset the settle budget, idempotently, and infinite CSS animations fire no `animationend`. Render-on-demand vs HUD, audio and VFX: the HUD is DOM, audio runs on every callback, and VFX updates only inside drawn frames with bounded pending ranges. | Clean | Items 4, 5, 7 and 9 above |

### Why the depthless canvas is pixel-identical

The canvas is cleared, then receives one full-screen triangle pair from the lens `ShaderPass`. With a depth buffer, that
quad is depth-tested against a buffer just cleared to 1.0, and it passes everywhere. Without one, depth testing is
skipped, so it also passes everywhere. Blending and color writes are unchanged. Scene depth lives in the multisampled
`rt2` target and the mirror target, and both keep their own depth attachments. `RenderPass` never draws to the screen:
the lens is always the last pass and is never disabled, and the test checks both conditions.

## Wiring needs status

| Doc | Line | Status |
|---|---|---|
| `vfx-buffers.md` | `worldPoint` out-param, two-range span | DONE (Stage A 90a, 90c) |
| `vfx-buffers.md` | `dashSamples` closures, `trackFrame`/`trackPoint` objects | DEFERRED: no measurable cost (item 8) |
| `audio-cpu.md` | Game-loop wiring notes | DONE: `sound.update` stays on every callback, so nothing is throttled; `edgeOf` switch done in Stage A 90b |
| `audio-cpu.md` | Item 4 remainder (cue array, rival closures) | DEFERRED with its measured reason |
| `scene-streaming.md` | Parked hosts | DONE (Stage A 90a) |
| `hud-compositing.md`, `gpu-pipeline.md` | None | n/a |
| `frame-lifecycle.md` | 30-minute soak | NOT RUN (unchanged; outside this audit's scope) |

## Gates (this branch, LOCAL-NODE / LOCAL-CHROME, host load average 40–140 from parallel agents)

- `node --test tests/module-size.test.js`: 3/3 pass. `pnpm run typecheck`: exit 0. `pnpm run build`: exit 0.
- `pnpm test`: 4044 tests, 4038 pass, 2 fail, 4 skipped. Both failures are in `tests/audio.test.js` (premiere and reveal cues) and
  are load flakes, not caused by this change. A different subset fails on each run, each test passes alone, and the audio
  path uses a wall-clock stall check (`src/audio-context-health.ts`) that drops cues when a loaded host delays the fake
  context. The integration-head baseline run passed 4040/4040 at a lower load.
- Browser specs, `--workers=1`: on the first pass (load average about 90), 8 passed and 13 timed out. The timeouts were in
  photo-studio and render-on-demand setup, waiting on clicks and fixtures. Rerun at lower load: `gpu-pipeline`,
  `render-on-demand` and photo-studio (Coast desktop, phone, landscape, Coastal) passed 6/6. `fps`,
  `graphics-first-frame` and `hud-compositing` passed on the first pass.
- The photo-studio tracks that timed out (Neon, Canyon, Aurora, Tokyo) were rerun Before/After, interleaved (dist without
  and with `depth: false`), ABAB at load average 130–260: Before 4/4 and 4/4, After 4/4 and 4/4. The timeouts were host starvation, not
  this change.
