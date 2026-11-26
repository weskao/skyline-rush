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
- Do not weaken test standards, budget gates or visual checks to hide regressions.
- Diagnostics are opt-in; normal production must not continuously sample or allocate.
- Follow docs/performance/README.md for scenario matrix, soak SOP and reporting.
  Preserve existing privacy rules; no personal paths, identifiers or raw private logs.
