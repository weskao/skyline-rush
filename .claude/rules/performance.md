# Performance and thermal evidence (all features)

Read with performance-review.md, device-quality.md and module-size.md. Detailed existing
rendering practices remain authoritative; this rule establishes the no-fidelity-loss gate.

- No unapproved reduction of High or any selected graphics tier: render resolution/DPR, render scale,
  MSAA, mesh triangles, textures/materials, particles, VFX, animation, lighting, shadows and view
  distance. Never use an FPS cap or adaptive resolution as an undisclosed optimization. Report
  the existing Auto pacer's actual target and scale; use a fixed FPS for matched comparisons.
- Keep fixed 60 Hz physics; never suspend off-screen rival AI, physics or collisions to save rendering.
- First remove duplicate calculations, submissions, buffer uploads, memory allocations and
  unnecessary rendering. Reuse existing systems before adding abstractions or dependencies.
- New tracks, models, VFX and Garage changes require performance and visual regression evidence.
- CPU simulation and CPU render submission are not GPU time. Use asynchronous WebGL2 timer
  queries only; never force readback or call finish for timing. Unsupported/disjoint/lost context
  is unavailable, not zero. Never invent power, temperature or thermal status.
- Collect reproducible Before/After evidence with identical commit-independent inputs, seed,
  route, camera, graphics settings, device, browser, resolution and test conditions.
- Separate software WebGL CI, physical GPU, CPU-only, estimates and unverified items.
  Do not claim thermal or power improvement from FPS or draw calls alone.
- Label every number with its environment (`LOCAL-CHROME`, `LOCAL-NODE`, or a class from
  docs/performance/README.md "Evidence classes") and its before/after SHAs.
- Measure A/B interleaved (ABAB, at least 3 runs per side, fresh page per run, idle host) and compare
  per-run medians; a p95 shift from a few runs on a shared host is noise until re-measured
  (docs/performance/gpu-pipeline.md "Garage p95 re-measure"). Build tables with
  `scripts/thermal-compare.mjs`, which refuses mismatched runs.
- A bench comparing page loads reseeds `Math.random` after `createWorld`: three's UUIDs consume it, so
  one object more or less shifts every particle.
- Adopt a change only for a measured time or allocation gain with proven equivalence; fewer calls or
  counters with unchanged time are no win. Record each rejected item and its reason in its
  `docs/performance/<topic>.md`; feature-change lessons are in performance-review.md.
- Instrument through `createDeepPerf` / `world.deepPerf?.` and `createGpuTimer`, not ad-hoc timers.
- Do not weaken test standards, budget gates or visual checks to hide regressions.
- Diagnostics are opt-in; normal production must not continuously sample or allocate.
- Follow docs/performance/README.md for scenario matrix, soak SOP and reporting.
  Preserve existing privacy rules; no personal paths, identifiers or raw private logs.
