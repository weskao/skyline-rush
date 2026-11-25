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
- **Standing start:** practice sets `race.standingStart`, so GO alone does not roll the car. With AUTO on, the car rolls at GO because AUTO is the player's visible setting; with AUTO off, it stays at 0 km/h until the player holds the accelerator.
- **AUTO follows the race rule.** `prepareTutorialInput(input, autoOn)` applies "AUTO on and not braking means throttle" in every lesson and keeps `laneAssist` false. AUTO stays toggleable throughout: F2 on desktop, Pause → Game settings → Driving controls → AUTO on touch. Touch copy never names F2. On touch, AUTO on hides GAS and widens NITRO exactly as in a race (`src/touch-sprint-buttons.css`), so with AUTO on no touch line names the accelerator (`tests/tutorial-auto-lesson.test.js` sweeps every lesson).
- **Lesson 1 (`throttle`) follows AUTO.** AUTO on clears at speed > 5 once its copy has been up for 3 racing seconds; AUTO off clears on a held accelerator at speed > 5. A toggle switches copy and clear rule at once and restarts the read. With AUTO off every lesson must stay completable on keyboard, touch buttons and slide within two thumbs (`tests/tutorial-auto-off-completion.test.js`); report a lesson that is not rather than loosening its clear rule.
- **Lesson changes never move the car.** `prepare()` swaps rings, props and lesson state only: no `x`, altitude or vertical-speed reset.
- **Effects play out before the next lesson.** A lesson that grants a boost or NITRO (drift payout, air chain, barrel roll) enters the `finishing` phase and advances only once `miniBoost` and `nitroTime` are both 0.
- **Spent rings stay in `race.rings`** (within `SPENT_RING_METERS` behind the car). Clearing them in the hit step hides the hit from `race-audio-events.ts` (chime) and `effects.js` (burst).
- **Live cues come from engine state** (`src/tutorial-cues.ts`): name the control to press or release *now* (keyboard key on desktop, button on touch) and count down when timing matters. Every cleared lesson plays `gate-clear` and shows the pass toast; a skip is not a pass.
- **Drift release:** If the drift ends while BRAKE is still held, cue the player to release it to collect an earned mini boost or to retry a short attempt. Holding the same input after a drift progressively restores normal braking over 0.55 seconds. On slide and tilt, cue lifting the thumb from the pad to boost or holding the pull to slow down. Only the drift-start cue pulses the BRAKE button. The lesson judges the engine's actual boost payout and waits for it to finish.
- **Final NITRO cue:** keep the shared live cue and current desktop key visible during the lesson, from the first press through the sprint, finishing effect and any interrupted attempt. Update the message to match the current action. Outline the touch control only when the practice charge is ready for a new press.
- **Boost lesson:** a timed stretch of blue charge-ring rows (`BOOST_LIMIT` s), normal finite BOOST, no slipstream auto-dash. A timeout re-arms a fresh stretch ahead.
- Test real keyboard and mobile touch input in the browser, including pause/resume and lesson transitions, before claiming the change verified. Run the project's required unit, build, browser and CI gates; report any test that could not be run.

- **Coach prompt animations must preserve the layout slot throughout every frame.** The live cue and pass toast are top-anchored below the coach; never reuse the old vertically centred `cue-in` transform for them. Keep fade and pulse without translating into the coach buttons. Guard: `tests/tutorial-hand-layout-browser.spec.js` records overlaps each frame.
