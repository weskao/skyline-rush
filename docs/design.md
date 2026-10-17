# Design and implementation plan

Goal: race an original thruster-equipped sports car along a 5 km highway against three rivals, driving or briefly flying above traffic.

## Scope
1. `src/game.js`: deterministic fixed-step simulation, countdown, acceleration/braking/steering, fuel-limited lift and gravity, collision clearance, rivals, finish order and reset.
2. `src/world.js`, `src/geometry.js`: Three.js world, procedural sports cars with outward-facing body geometry, curved highway, city, coastline, chase camera and thruster effects.
3. `src/main.js`, `src/style.css`, `index.html`: input, responsive HUD, start/pause/results, camera and sound controls, WebGL failure handling.
4. `tests/game.test.js`, `tests/input.test.js`, `tests/browser.spec.js`: behavioral tests and real browser input/lifecycle checks.
5. Package lockfile, Makefile, README and verification record: reproducible local setup and evidence.

## Acceptance and test order
- Write failing simulation tests before implementing driving, flight, fuel, collision and race rules; run red then green.
- Write failing input lifecycle tests before implementing key/touch handling. Clear held inputs on blur, pause and pointer cancellation.
- Write failing browser tests before integrating the visible app. Verify start/countdown, acceleration, flight/landing, pause/resume, restart and a mobile viewport using actual input and rendered telemetry.
- Build production assets, inspect desktop/mobile screenshots and browser errors, then run final checks. Browser acceptance serves the production build so development hot reload cannot reset a running race.

## Limits
Arcade physics, one route, no multiplayer or backend. A WebGL2-capable browser is required. Storage failures must not prevent playing. Pausing must freeze the simulation; large frame gaps must not advance the race. Collision cooldown must prevent repeated damage while overlapping a car.

## Review resolutions
- Charge does not regenerate during grounded boost.
- Final positions use interpolated finish-line crossing times within a simulation tick.
- Preserve live resources for back/forward-cache page transitions.
- Show touch controls for coarse pointers in landscape, including screens wider than 760 pixels.
