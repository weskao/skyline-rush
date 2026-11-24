# Baseline work log

- Source audit: base d9c144ba39546378cdae32f76ae305fee1f9305f; reviewed existing perf strip,
  evidence gates, frame pacer, composer, sizing, race factory and bench scripts.
- GPU timer focused local test: four isolated Node tests passed (availability, unsupported/disjoint,
  pending cap/nesting/context loss, draw exception cleanup); missing-module failure before implementation.
  Strict standalone timer TypeScript check passed. This is mock WebGL evidence, not hardware timing.
- Full project checkout and pnpm unavailable in the connector execution environment; complete
  unit/typecheck/build/module-size/browser and real scene probe are not locally verified.
- Exact-HEAD full-regression CI is required; no release or deploy. Do not infer CI success from this log.
- Historical software-WebGL counters remain in performance-evidence.ts; no new FPS, thermal,
  power, or physical GPU numbers recorded.
- Open: run fixed-step matrix and full-app replay; physical 5/15/30 min soak; visual evidence;
  validate timer-query availability and overhead on physical GPUs. Existing CPU-only bench
  and Frostbite scene-cost tool remain separate sources.

- CI run 45448006733 caught TS2345 in deep-perf.ts: Three's context type is WebGL1 | WebGL2.
  Added WebGL1 fallback regression, observed RED (createQuery is not a function), then GREEN:
  all five isolated timer tests and standalone strict TypeScript check passed. Full CI must rerun
  on the new HEAD; earlier failure is not evidence of final success.
