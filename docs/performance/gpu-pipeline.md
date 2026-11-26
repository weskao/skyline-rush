# GPU rendering pipeline (Wave 1, workstream 10)

Scope: the post-processing chain and GPU helpers (`src/lens-pass.ts`, the composer wiring in `src/world.js`,
`src/render-resolution.ts`, `src/webgl-renderer.ts`, `src/upcoming-lighting.ts`, `src/shader-warmup.ts`).
Fidelity is unchanged: same render DPR caps, 4x MSAA scene target on High/Medium (2x on Low), HalfFloat HDR,
same bloom (strength, radius, threshold, mips), same lens look. Fixed 60 Hz physics untouched.

## Pipeline before and after (three.js r186 EffectComposer)

Before (9d3c2e69), per frame on High:

1. RenderPass -> scene target `rt2` (HalfFloat, 4x MSAA) + resolve blit.
2. UnrealBloomPass: high pass, 5 mips H/V blur, composite (all single-sample HalfFloat, no depth), then an additive
   full-screen blend back into `rt2` -> a second 4x MSAA draw and a second resolve.
3. Lens ShaderPass -> `rt1`, a *second* full-size HalfFloat 4x MSAA target: an MSAA write and a resolve that
   nothing needs (a full-screen quad has no geometric edges to anti-alias).
4. OutputPass (ACES + sRGB) reads `rt1` -> screen.

After:

1. RenderPass -> `rt2` (unchanged).
2. UnrealBloomPass (unchanged).
3. Lens ShaderPass -> screen. The lens shader ends with three's `#include <tonemapping_fragment>` and
   `#include <colorspace_fragment>`, so the renderer applies the same ACES Filmic tone mapping (live
   `toneMappingExposure`, including weather/blizzard changes) and sRGB encoding that OutputPass applied.
   `needsSwap = false`, so `rt1` is never bound and never allocated.
4. Idle frames (impact, boost and pressure all exactly 0: Home, Garage, menus, cruising) draw a `LENS_FX 0`
   variant with one texture fetch instead of five plus the heat-shimmer `exp`/`sin`. Both variants are drawn on the
   first frame and after `webglcontextrestored`, so switching is a program bind, never a compile.

The only numeric difference from the old chain: the old one rounded the lens output to half float before tone
mapping. Measured: at most one 8-bit step on any channel, zero pixels more than one step apart.

## Measurement environment

All numbers below come from one machine and must not be read as phone numbers: Apple M4 Mac, local Chrome
(Playwright channel `chrome`), `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`, three.js 0.186.1, viewport 390x844 at
DPR 3, render DPR 1.5 (canvas 585x1266), quality High, 4x MSAA, `EXT_disjoint_timer_query_webgl2`. A = 9d3c2e69
(baseline), B = this branch. 240 frames x 3 ABBA rounds per scenario, first 10 frames of each run dropped (690
samples per side). Frame GPU time is the timer-query result (no forced readback). Raw output stays in the
git-ignored `docs/performance/local/gpu10/`.

## Before / After (GPU ms per frame, p50 / p95)

| Scenario | A p50 | A p95 | B p50 | B p95 | p50 change | Draw calls A -> B |
|---|---|---|---|---|---|---|
| drive-coast | 6.335 | 7.593 | 5.487 | 7.760 | -13.4% | 253 -> 252 |
| boost-lava | 6.341 | 7.803 | 5.058 | 6.751 | -20.2% | 303 -> 302 |
| home-coast | 6.866 | 13.010 | 5.367 | 7.208 | -21.8% | 195 -> 194 |
| showcase-frostbite | 5.823 | 7.258 | 4.753 | 7.162 | -18.4% | 143 -> 142 |
| garage | 5.065 | 6.945 | 4.168 | 9.245 | -17.7% | 78 -> 77 |
| photo | 6.644 | 13.858 | 5.357 | 6.818 | -19.4% | 140 -> 139 |

Garage p95 is worse in B (per-round B p95 7.26 / 9.26 / 10.12) while its mean improved 5.22 -> 4.80 ms; the tail
is noisy on this host and is reported, not hidden. Drive p95 is flat within noise.

Per-frame GL work, identical across all six scenarios: full-screen draws -1, MSAA resolve blits 3 -> 2,
`bindFramebuffer` 31 -> 25, clears 16 -> 15. Full-size MSAA HalfFloat render-buffer memory 62.2 -> 31.1 MB
(one target instead of two). Programs linked during the measured frames: 0 in both builds.

## Visual equivalence

- In-page reference (authoritative, same task, same frame): the browser spec renders the old Lens -> OutputPass
  chain and the new chain from the same scene target and compares. Local Chrome, 1440x900 at DPR 1, idle and with all
  lens effects on: max channel delta 1, 0 of 1,296,000 pixels over 1. `tests/gpu-pipeline-browser.spec.js:47`
  enforces max <= 1.
- Cross-load A/B (separate page loads, seeded): drive, home, Home showcase, Garage and Photo Mode max delta 1, zero
  pixels over 1 (drive PSNR 64.6 dB, home 64.7 dB). Boost-lava (max 35, 299 px), nitro-tokyo (32, 358 px),
  impact-taipei (10, 66 px) and snow-aurora (12, 58 px) differ only in a few small particle sprites. The lens is a
  spatially uniform post pass and cannot produce localized blobs; the diff images show ember/spark sprites at
  shifted positions. Neon-rain is nondeterministic even B vs B (max 4, 42 px).
- Why cross-load needs a reseed: three's `MathUtils.generateUUID` consumes `Math.random`, so any change in the number
  of objects created by `createWorld` (here one fewer pass and material) shifts the particle RNG stream. The bench
  reseeds after `createWorld`; without that, cross-load diffs are dominated by particle phase, not rendering.

## p02 items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Composer pass analysis | DONE | "Pipeline before and after" above; `src/world.js:94-103` |
| 2 | MSAA ping-pong | DONE | Lens no longer writes `rt1`: `src/lens-pass.ts:38`; blits 3 -> 2 |
| 3 | Single-sample post targets, 4x MSAA kept on the scene | DONE | Only `rt2` is multisampled and allocated; `rt1` is never bound (browser spec `spareTarget:false`); scene MSAA unchanged (`src/render-resolution.ts:22-25`, spec `sceneSamples:4`) |
| 4 | Skip zero-effect lens work | DONE | `LENS_FX 0` variant, `src/lens-pass.ts:8`, `:40`, `:44` |
| 5 | Uniform branch vs variants | DONE (variants); uniform branch REJECTED | Lens-only microbench, 585x1266, per draw median of 15: base 0.0479 ms idle / 0.0472 ms on; uniform branch 0.0353 idle / 0.0540 on (+14% with effects on); define variants 0.0218 idle (-55%) / 0.0474 on (same as base). All four outputs bit-identical to base |
| 6 | Merge Lens and Output | DONE | Tone-map and colorspace includes, `src/lens-pass.ts:22`; OutputPass removed from `src/world.js:103` |
| 7 | Bloom framebuffer waste | REJECTED | The bloom's 5-mip chain is single-sample and sized by mip, with no waste found. Moving its additive composite into the lens would save one MSAA draw but needs 5 extra blurred taps at the chromatic offsets, so it is not exact at the offset taps. Not equivalent, so not adopted |
| 8 | Recompile / resize / sync / churn | DONE | 0 programs linked in measured frames; both lens variants prebuilt (`src/lens-pass.ts:44-50`); program count stable while toggling boost (browser spec); warmup targets `composer.readBuffer` (`src/world.js:472`, `:829`) |
| 9 | Duplicate lights / materials | REJECTED (no duplicate) | Room and car environments are each created once per scene; nothing to share |
| 10 | Home showcase raycast, bounds and projection duplication | REJECTED | Tokyo Home, 8 orbit decisions: p50 35.6 ms before vs 33.3 ms with a hoisted matrix/bounds pass (max 44.2 vs 45.3). `updateMatrixWorld` 73,574 -> 5,422 and `traverseVisible` 46,848 -> 976, but the 240 raycasts dominate and the time change is within noise. Reverted; RED was observed and not committed |
| 11 | powerPreference A/B | REJECTED change; UNVERIFIED on devices | p50 ms drive/home, 2 interleaved passes: low-power 5.30, 4.87 / 4.87, 5.07; default 4.96, 4.74 / 5.10, 4.94; high-performance 4.78, 4.74 / 5.29, 5.53. No difference on a single-GPU M4, so `high-performance` is kept (`src/webgl-renderer.ts:8`) |
| 12 | Context loss, resize, orientation, Photo Mode, Garage Studio | DONE (automation); devices UNVERIFIED | Variants rebuilt on `webglcontextrestored` (`src/lens-pass.ts:50`, listener removed on dispose at `:57`, unit test `tests/lens-pass.test.js:28`); focused browser specs 57 passed / 1 skipped |

## Observed RED before GREEN

- `tests/lens-pass.test.js:15` failed: needsSwap was true and OutputPass was still added.
- `tests/garage-skin-warmup.test.js` failed: the warmup regex did not match `composer.readBuffer`.
- `tests/gpu-pipeline-browser.spec.js:47` failed: `passes:4`, `spareTarget:true`.
- `tests/lens-pass.test.js:28` failed: "first frame: the effects variant is built..." (no defines yet).
- All four passed after the implementation, committed together with it.

## Interfaces for integration

- **DONE (Stage A 90a)**: `src/deep-perf.ts:10` `PASS_NAMES` is now `['scene', 'bloom', 'lens']`, matching
  the composer order. The `'output'` entry (index 3) could not be reached with three passes, so no deep-perf
  label or report changes. No consumer reads it (`scripts/`, `tests/`), and no test was needed.
- The lens must remain the last composer pass: it renders to the screen with `needsSwap = false`. A pass added
  after it needs `needsSwap` restored and an OutputPass-equivalent at the end.
- `lens.material` swaps between two programs per frame; drive the effect through `lens.uniforms` (shared by both).
- Shader warmup renders into `composer.readBuffer` (the scene target), not `renderTarget1`.
- Benches that compare page loads must reseed `Math.random` after `createWorld` (see Visual equivalence).

## Manual SOP for physical devices (UNVERIFIED)

No iPhone, Mac thermal, power or phone GPU numbers are claimed. To verify:

1. Build both A (9d3c2e69) and B with `pnpm run build`; serve each with `pnpm preview`, reachable over the LAN.
2. iPhone (Safari) and a dual-GPU Mac: run each build in the same scene (coast drive with boost, Home, Garage) for
   5, 15 and 30 minutes, alternating A/B, at the same ambient temperature and battery level, starting cool.
3. Record the in-game perf strip GPU time (median and p95), Safari Web Inspector Timelines frame times, the device
   thermal state (Xcode Energy Log or the Mac's `powermetrics`, GPU power), and battery drain per 15 minutes.
4. powerPreference: on the dual-GPU Mac, repeat with `low-power` / default / `high-performance` and record which
   GPU the browser reports (`WEBGL_debug_renderer_info`). Change the setting only if a measured win appears with no
   visual change.
5. Context loss and orientation: rotate during a race, background and foreground the tab, and force a loss with
   `WEBGL_lose_context`; confirm the lens effects (boost, impact) still render after restore.
