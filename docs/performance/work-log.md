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

- 2026-11-26 owner accepts the manual acceptance gate by waiver (not a measured result).
  Physical-device soak, visual sign-off and hardware overhead measurements are not blockers to proceeding.
  No hardware numbers are asserted. Automated checks remain mandatory.
- HEAD e4fea693fc1dade5a14b3927dafee8c6bc563ff7: full CI 45595454328 passed install, typecheck, unit, build, cloud and both World Tour jobs;
  browser shards 4 and 11 failed. Shard 11 reproduced 0.03125 px overlap at 568x320 twice;
  reuse develop's short-landscape layout correction and stricter 4 px clearance regression.
  Shard 4 twice reported fallback:timeout loading the Crimson GT on software WebGL;
  reuse the test-only widened deadline for fetch and decode. The timeout stage is not identified by the logs.
  Production model deadlines remain unchanged; exact-HEAD CI must verify both changes.

- Added shared registry scenario matrix and strict evidence validation; local isolated validator RED was missing function, GREEN 2/2 tests (valid unsupported-GPU report and six invalid records). Full project execution still needs CI.
  CI now schedules a 32-tick real WebGL smoke for each playable Home/Racing and Coming Soon showcase; existing 180-tick CLI rejects empty/invalid results. Added live Garage/Countdown/Results and Photo/Paused state coverage. No hardware evidence claimed. Exact full-app input replay remains open.
