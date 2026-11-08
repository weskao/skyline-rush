# Tutorial driving: player control authority

Read before changing any tutorial step, lesson transition or tutorial input handling.

## Tutorial driving: player control authority

Tutorial steps must **observe and validate player actions, never take control of the car**.
The tutorial is a safe practice environment, not an autopilot.

- Never inject steering, lane-centering or lane-assist movement without the player's explicit intent. Neutral steering input must not cause lateral movement on its own.
- Initialize the car's position and steering only when a practice session begins (or when recovery from the end of the track requires it). Do **not** reset lateral position or steering when advancing to a new lesson.
- Preserve continuous movement and the normal steering ramp across lesson transitions and after releasing a direction. Do not teleport, snap to center or override opposite-direction input.
- Players may freely steer left or right, brake, accelerate, fly and use the available controls during any lesson. The current lesson determines **what counts as completion**, not which other controls are allowed.
- Keep tutorial-specific input overrides separate from normal-race assistance, and do not change ordinary race-control behavior to solve a tutorial-only bug.
- Follow RED → GREEN → REFACTOR for every tutorial/control change. Include regression tests for neutral input, opposite-direction steering, released steering, step-transition continuity and completing all lessons.
- **Standing start:** practice sets `race.standingStart`, so GO does not roll the car; it stays at 0 km/h until THROTTLE.
- **Lesson changes never move the car.** `prepare()` swaps rings, props and lesson state only: no `x`, altitude or vertical-speed reset.
- **Effects play out before the next lesson.** A lesson that grants a boost or NITRO (drift payout, air chain, barrel roll) enters the `finishing` phase and advances only once `miniBoost` and `nitroTime` are both 0.
- **Spent rings stay in `race.rings`** (within `SPENT_RING_METERS` behind the car). Clearing them in the hit step hides the hit from `race-audio-events.ts` (chime) and `effects.js` (burst).
- **Live cues come from engine state** (`src/tutorial-cues.ts`): name the control to press or release *now* (keyboard key on desktop, button on touch) and count down when timing matters. Every cleared lesson plays `gate-clear` and shows the pass toast; a skip is not a pass.
- **Boost lesson:** a timed stretch of blue charge-ring rows (`BOOST_LIMIT` s), normal finite BOOST, no slipstream auto-dash. A timeout re-arms a fresh stretch ahead.
- Test real keyboard and mobile touch input in the browser, including pause/resume and lesson transitions, before claiming the change verified. Run the project's required unit, build, browser and CI gates; report any test that could not be run.
