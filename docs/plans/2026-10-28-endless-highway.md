# Coast Endless Highway v1

Approved scope: a separate Coast-only distance-survival mode, with five collisions
ending an eligible attempt. Classic/Daily routes, seed names, bests and Ghosts retain
existing identities. No laps, finite-route wrapping, new dependencies or Firebase
features. The nominal Coast track length remains metadata, never an Endless finish.

Simulation owns absolute distance. Existing `classicRoadCenter` and its 120 road
segments extend continuously; scenery and city use bounded nearby origins on GPU.
A versioned per-absolute-chunk seed produces traffic, pickups and ring groups.
Only five 500 m chunks remain live, with at most 40 traffic, 20 pickups, 15 rings
and five group counters. Traffic grows from four to eight cars per chunk, capped
at 20 km. Freed chunks have no permanent registry. Regeneration is deterministic;
consumed rewards in live chunks retain state. This is forward survival, not a
rewindable world or ten extendable authored routes.

Existing mode selectors, HUD, result/history services and music/SFX own their
normal responsibilities. Hide the finite minimap/finish arch/progress bar; show
absolute kilometres, remaining contacts and the next 1 km milestone. Reuse
cruise music and one-shot gate-clear cues for distance milestones, respecting
separate channel mutes. Endless records maximize distance and never write Career
progress or Ghost arrays. Existing cloud normalization preserves additive Endless
records and uses max-distance merges; no production data access is needed.

1. Observe functional RED for missing mode, long progress, seed regeneration,
   bounded resources, terminal collision and distance-best persistence.
2. Implement shared typed objective/streaming/results; keep engine JS boundaries.
3. Observe RED for billion-metre GPU positions and milestone cues, then rebase
   pooled Coast/city rendering and retain the renderer restore warmup.
4. Verify unit/type/build and real Chrome desktop/touch in both locales:
   start, distant driving, pause/background/context loss/resume, five contacts,
   results, history, language/camera/restart/exit, no console errors.
5. Parent schedules full `make verify` and exact-commit remote quality-gate.
   Physical-device Safari, GPU timing and thermal endurance remain manual gates.
