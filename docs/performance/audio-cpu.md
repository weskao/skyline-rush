# Audio, physics and CPU runtime optimisation (Wave 1, workstream 14)

Branch `feature/perf-thermal-14-audio-cpu`. Goal: lower JS CPU, allocation, GC and Web Audio load with bit-identical
gameplay. Nothing here changes balance, physics, AI difficulty, speeds, collision rules, sound content or music.

## Behaviour guard (Before = After)

`tests/cpu-race-replay.test.js` replays a seeded, input-scripted race (up to 150 s at 60 Hz) on every runtime family
(coast, tokyo, harbor-circuit, dune-tempest, skyfall-archipelago, ...). It folds the FULL race state (player, rivals,
traffic, rings, pickups, hazards, course runtime, standings, result) into a SHA-256 every 15 ticks and the
`createRaceAudioEvents` cue stream every tick, and compares against `tests/fixtures/cpu-race-replay.json`.
The fixture was first recorded on the unmodified code (commit `db3e70e2`) and passed unchanged after every optimisation commit
below on macOS and Node 24. Exact-HEAD CI (Linux, Node 22) then showed the full-precision state digest is platform-sensitive in the
low float bits (final result, score, elapsed and cue stream were identical; only the state digest differed). The digest now
serialises numbers to 9 significant digits, and the fixture was re-recorded on the pre-optimisation `src/` (an untouched extract of
`0f0aa70e`) with that serialiser: outcome fields are byte-identical to the earlier recording and only `digest` and `cueDigest` values
changed. The optimised code reproduces it. `tests/cpu-route-curvature.test.js` additionally pins every `sampleRoute` frame
field bit for bit over all edges of both graph courses.

Re-record only for an intended behaviour change: `RECORD_REPLAY=1 node --test tests/cpu-race-replay.test.js`.

## Measurement

`scripts/cpu-audio-bench.mjs`, environment label `local-node` (Node CPU only; no GPU, frame pacing or device claim).
Machine: Apple M4, 10 cores, Node v24.19.0, macOS. The host was heavily loaded by other jobs (load average 25 to 55 during
the runs), so wall and CPU timings carry roughly +-30% run-to-run noise. Timings use `process.cpuUsage`, medians of 3 to 5 reps
over 3000 ticks, with Before and After runs alternated from a clean extract of the pre-optimisation commit `0f0aa70e`
(replay guard only, `src/` identical to the merge base) against this branch. Allocation volume is measured as scavenges per
1k ticks with a fixed 1 MB new space (a relative proxy, not bytes: `heapUsed` deltas proved unreliable because collections
interleave); GC pause is the summed `PerformanceObserver('gc')` duration (flushed after each run, since entries arrive
asynchronously). Audio uses the recording Web Audio boundary `tests/helpers/audio-recorder.js` (real `createSound`, real cue
logic, counted AudioParam calls, no real audio thread). Reproduce:

```
node --experimental-strip-types --expose-gc --min-semi-space-size=1 --max-semi-space-size=1 scripts/cpu-audio-bench.mjs --reps=5
# options: --tracks=coast,tokyo --ticks=3000 --out=file.json
```

## Results (environment: local-node, Apple M4, loaded host)

Run 1: 4 tracks, 3 alternating pairs (before first). Run 2: coast and tokyo only, 4 pairs, 5 reps, order reversed
(after first) to expose order effects.

| Track | Metric | Before | After | Change |
| --- | --- | ---: | ---: | ---: |
| dune-tempest | Simulation CPU us/tick (run 1) | 376.4 | 288.4 | -23.4% |
| dune-tempest | Simulation scavenges/1k ticks | 604 | 276 | -54.3% |
| dune-tempest | Simulation GC pause ms/3000 ticks | 64.1 | 44.7 | -30.3% |
| dune-tempest | Sim+audio scavenges/1k ticks | 606 | 286 | -52.8% |
| skyfall-archipelago | Simulation CPU us/tick (run 1) | 330.4 | 246.9 | -25.3% |
| skyfall-archipelago | Simulation scavenges/1k ticks | 557 | 263 | -52.7% |
| skyfall-archipelago | Simulation GC pause ms/3000 ticks | 70.0 | 34.6 | -50.6% |
| skyfall-archipelago | Sim+audio scavenges/1k ticks | 569 | 277 | -51.3% |
| coast | Simulation CPU us/tick (run 1 / run 2) | 53.2 / 82.7 | 62.5 / 69.3 | +17.5% / -16.3% (noise, see below) |
| coast | Simulation scavenges/1k ticks | 101.7 | 96.0 | -5.6% |
| tokyo | Simulation CPU us/tick (run 1 / run 2) | 102.5 / 129.8 | 113.3 / 143.6 | +10.5% / +10.6% (not significant, see below) |
| tokyo | Simulation scavenges/1k ticks | 182.0 | 178.3 | -2.0% |
| all four | AudioParam calls/tick | 8.72 / 8.50 / 7.84 / 7.83 | 2.36 / 2.28 / 1.65 / 1.54 | -73% / -73% / -79% / -80% |
| all four | sound.update CPU us/tick | 7.3 to 12.6 | 8.5 to 14.7 | +5% to +27% (see below) |

Reading the numbers honestly:

- **Graph courses (dune-tempest, skyfall-archipelago):** CPU fell 23 to 25% in all 3 pairs and scavenges fell by about
  half. The scavenge count is deterministic for a fixed workload, so this is the reliable figure. It comes from the edge-id index,
  the single car lookup and the curvature memo, which the legacy `edges.find` path paid for on every route sample.
- **Light tracks (coast, tokyo):** scavenges fell 2 to 6%. CPU flipped sign between the two runs after the pair order was
  reversed (coast +17.5% then -16.3%), so the difference is inside the noise; no gain or loss is claimed.
- **Audio:** AudioParam calls per tick fell 73 to 80% (deterministic count), with the replayed cue stream unchanged. But the
  node-side `sound.update` CPU did NOT fall: the mixer's bookkeeping (a Map lookup and compare per param) costs about as much as the
  recording mock's no-op param call it replaces, and the measured delta is inside noise to slightly worse. The real benefit
  (fewer cross-thread AudioParam automation events and timeline entries on a real audio thread) is NOT measured here; it is
  UNVERIFIED until a device or browser profile is taken. Do not quote an audio CPU saving from this table.
- GC pause totals are small (10 to 80 ms per 3000 ticks) and noisy; only the dune and skyfall reductions (-30%, -51%) are
  consistent with the scavenge counts.

## p06 items 1 to 14

| # | Verdict | Evidence |
| --- | --- | --- |
| 1 CPU-profile sim, AI, collision, route sampling, standings, items | DONE | `--cpu-prof` over `scripts/cpu-audio-bench.mjs` (4 tracks, 3000 ticks, local-node). Top self time after this branch: `avoidObstacles` `src/car-collisions.js:59` 14%, rival loop `src/course-race-step.ts:144` 9.5%, `stepRaceWorld` `src/race-rivals.js:40` 9%, `courseCarsGap` `src/course-race.ts:217` 6%, `sampleRoute` `src/course-route-frame.ts:104` 5%; GC 1.7%, `race-audio-events.ts:60` 1.3% |
| 2 Keep fixed 60 Hz | DONE | `stepRace` `src/game.js:241` untouched; the replay steps 1/60 s ticks |
| 3 Cache invariants, drop duplicate route/gap/state work per step | DONE | edge-id index `src/course-route-frame.ts:53`; curvature memo `:123`; single `carOf` lookup and `courseCarsGap` `src/course-race.ts:217` used by `carGap` `src/course-race-step.ts:250`; cheap height test before `carGap` `src/car-collisions.js:50`; off-edge item sweeps skipped `src/course-race-step.ts:184` |
| 4 Cut hot-path temporary allocations and GC | PARTIAL, remainder DEFERRED | Edge scans, repeated `cars.get` and curvature recomputation removed (scavenge columns above). Not done: the `race-audio-events.ts` cue array and the rival closures in `stepCourseCars`. Measured reason: `race-audio-events.ts:60` is 1.3% self time and the whole GC share 1.7% of the profile, so neither is a bottleneck; the rival closure body is the AI step itself, and rewriting it would risk the byte-identical guard for no measurable gain |
| 5 Redundant full scans; spatial index only if measured | REJECTED | The redundant scans found (edge lookup, item sweep, `carGap`) were fixed. `avoidObstacles` is the largest remaining cost but is a per-rival scan, not a full-crowd N x N pass; no profile justifies an index |
| 6 Keep all rival AI, collision, speed, catch-up, ranking; never stop off-screen cars | DONE | No AI or ranking logic changed; every car still steps each tick; replay fixture byte-identical for every `RACE_TRACKS` entry plus the extra cases in `tests/cpu-race-replay.test.js` |
| 7 Review `sound.update()` and the Web Audio graph | DONE | `src/audio.js:387` writes engine params only while SFX or music is on; graph and node creation unchanged (0.4 to 0.8 nodes per tick, all one-shots) |
| 8 Repeated `setTargetAtTime`/AudioParam updates | DONE | `src/audio-engine-mix.ts` `createParamMixer`: unchanged targets skipped within an epsilon, ramps limited to one write per 1/30 s per param; AudioParam calls per tick fall 73 to 80% (results table); node-side CPU saving not shown, device benefit UNVERIFIED |
| 9 Native smoothing, no pointless commands | DONE | Same mixer. A skipped write to an unchanged target is equivalent (the exponential approach is memoryless); relative jumps of 10% or more and moves to or from 0 are always written |
| 10 Decouple continuous audio from render FPS, keep tone and responsiveness | DONE | Per-param limiter keyed on audio time, independent of frame rate; steady, ramping and frozen-clock cases in `tests/cpu-audio-mix.test.js`; existing curve tests in `tests/audio.test.js` still pass |
| 11 Crash, pickup, Nitro, BOOST, GO immediate | DONE | One-shots use `cue()`/`impulse()`, never the mixer; test "one-shot cues are immediate and unthrottled" in `tests/cpu-audio-mix.test.js`; the replay records every cue per tick |
| 12 No audio processing with SFX and music off | DONE | `src/audio.js:387` guard; test shows 0 AudioParam calls with both off (RED was 840) |
| 13 iOS suspend/resume, call interruption, background, resume | DONE in node, UNVERIFIED on a device | `tests/cpu-audio-mix.test.js` "engine parameters resume after the page is hidden and shown again" (line 62); existing suspended-context rebuild tests in `tests/audio.test.js` (line 50) and `src/audio-context-health.ts` untouched; `mixer.forget` on music restart (`src/audio.js:94`, `:348`). Physical iPhone steps: "Manual iOS SOP" below |
| 14 No Workers, WASM, new engine, large dependency | DONE | None added (`package.json` unchanged); the profile shows plain JS hot loops, no measured need |

## TDD record (RED observed locally before each GREEN)

| Change | RED command | RED result |
| --- | --- | --- |
| Edge-id index | `node --test tests/cpu-edge-lookup.test.js` | `edge ids re-scanned 5600 times after the index was built` (14 expected) |
| Mixer gating | `node --test tests/cpu-audio-mix.test.js` | 3 of 5 failing: `2100 setTargetAtTime calls in 300 steady ticks`, `840 writes in 2 s ramping`, `840 !== 0` with SFX and music off; the 2 one-shot / iOS-resume guards pass before and after |
| carGap / item sweep | `node --test tests/cpu-edge-lookup.test.js` | `carGap looks each car up once`: `4 !== 2`; `rival item sweeps never read ...`: `3990 !== 0` |
| Curvature memo | `node --test tests/cpu-route-curvature.test.js` | equivalence guard, recorded on the old implementation (passes before and after by design; the speed-up is shown by the bench) |

## Game-loop wiring (not done here: `main.js` and `world.js` are out of scope)

Nothing is required for correctness: `sound.update()` keeps its signature and every behaviour is internal to `audio.js`.
Optional integration notes:

- `sound.update(race, halfwayStarted, waitingForScenery)` may be called at any rate. Continuous params are now written at
  most once per `MIX_INTERVAL` (1/30 s of audio time) per parameter for ramps; one-shot cues stay synchronous.
  If the integration branch throttles `sound.update` itself (for example on a thermal tier), keep calling it on the frame a
  race event can occur: cues are detected inside `update()`.
- Both toggles off: `update()` still consumes race transitions (so enabling later never replays stale cues) but writes no AudioParam.
- `edgeOf(graph, id)` (`src/course-route-frame.ts`) is the shared edge-id lookup; scene modules that still do
  `graph.edges.find(e => e.id === id)` per frame (`course-items.ts`, `course-render-pose.ts`, `course-race-scene.ts`,
  `stormline-megacity-race-scene.ts`, `volcanic-crown-race-scene.ts`) can switch to it. They belong to other workstreams and were not touched.

## Manual iOS SOP (physical device only; UNVERIFIED here)

1. iPhone, Safari and installed PWA: start a race with SFX and music on, silent switch on and off. Engine, music and cues audible.
2. Lock the screen for 10 s, unlock: audio resumes without a tap, engine pitch follows speed, no stuck loud or silent engine.
3. Incoming call or Siri during a race, decline or finish it: audio resumes (`audio-context-health.ts` retry), no double music.
4. Switch to another app and back: context suspended while hidden, resumed on return; cues (BOOST, pickup, crash) fire immediately after.
5. Toggle SFX off then on mid-race: engine returns within about 100 ms.
6. Watch for a lost one-shot (crash, pickup, Nitro, BOOST, GO) in each step above; none is expected.
