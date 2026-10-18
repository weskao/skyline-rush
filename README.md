# Skyline Rush

A playable 3D coastal highway sprint starring a flying electric sports car, modeled on the Tesla Roadster 2 and its rocket-thruster concept. Lift off on four blue thrusters, race three opponents, fly over traffic, manage charge and land to recharge. The handling is fictional arcade physics; this is an unofficial fan project, not affiliated with Tesla or SpaceX.

![Skyline Rush in flight](artifacts/readme-hero.jpeg)

![Start screen with the audio settings open](artifacts/readme-start.jpeg)

![Mobile portrait layout while ascending](artifacts/mobile-flight.jpeg)

![Race results with a new personal best](artifacts/race-results.jpeg)

## Run locally

Requires Node.js 22.12 or newer and a browser with WebGL 2 and hardware acceleration.

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite dev server
```

Open the local URL Vite prints (normally http://127.0.0.1:5173). Assets and the font are bundled locally; gameplay makes no external requests. No backend or account is needed.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate | W / ↑ |
| Brake | S / ↓ |
| Steer | A / D or ← / → |
| Fly | Hold Space once above 65 km/h |
| Land | Release Space |
| Boost | Hold Shift; consumes thruster charge |
| Start | Enter |
| Pause / resume | Esc / P |
| Restart | R |
| Change camera | C |
| Mute / unmute all audio | M |
| Auto accelerator on / off | T / AUTO button |

Mobile layouts provide steering, accelerator, brake, boost and flight buttons. Touch controls support simultaneous holds. AUTO holds the accelerator so you can concentrate on steering and flying; braking always overrides it. The setting lasts until toggled off or the page reloads. Leaving the tab pauses the race and clears held input. Camera and sound shortcuts preserve held driving controls.

All audio is synthesized with Web Audio; no audio downloads are needed. Background music has two looping synthwave tracks: an intro theme (~64 s) on the start and results screens, and a faster race theme (~55 s) from the countdown on. Each builds up over its loop and ducks while paused. Sound effects cover menu confirmation, three countdown ticks and GO, motor/wind, lift and boost, braking, vehicle/guardrail contact, landing, low-charge warning, close-pass reward and a finish melody. Muting effects stops pending cues, and pausing fades driving sounds. Low-charge warnings rearm only after recharging above 30%.

The speaker icon opens audio settings with separate Music and Sound effects switches (shown open in the start-screen screenshot above). Both default to on, and each choice is remembered in a cookie (`skyline-rush-music`, `skyline-rush-sound`) for a year. The intro music starts as soon as the page loads where the browser allows autoplay. Where it doesn't (most browsers on a first visit), the start screen asks "Play background music?". **Play music** starts it, and so does any other click or key press. **Not now** turns Music off and remembers that.

The flight panel shows ascent, cruise, descent and touchdown, remaining thrust seconds and the next control to use. Cyan rings mark the aerial corridor; they are visual guides. Mobile also has a hold-to-boost button. Orange contact reports show the impact type and speed lost; guardrails now rebound and slow a grounded car. Flying above them clears the rails.

The scene includes bloom lighting, sunset water, suspension bridges, thruster vapor, collision sparks and touchdown ripples. Camera motion and nonessential speed streaks respect your system's reduced-motion preference. Sound effects give separate thrust, contact and landing feedback.

Three amber start lights turn cyan at GO. The player car is a low wedge roadster with a smoked fastback canopy, a full-width red tail bar, four rear thruster ports, a bronze pop-up wing that rises for boost, braking and flight, spinning five-spoke wheels and steering front wheels. Each rival has its own silhouette and light signature: NOVA is a long-tail with twin fins and split magenta lights, ORBIT a rounded GT with a bubble canopy and round cyan lamps, APEX a track car with a splitter, roof scoop, tall endplate wing and amber C-lights. Traffic uses an upright commuter shape. Steering eases in quickly and releasing boost slows the car progressively instead of instantly cutting speed. All driving and toolbar buttons have at least 44px touch targets, including at 320px width.

For an extra charge reward, overtake traffic closely on the ground above 126 km/h. Clean passes within five seconds chain up to ×5 and refill 8–16% charge (capped at 100%). Collisions break the chain; airborne, distant and recovering passes earn no reward. The HUD announces each pass and the final 500 metres; results show total close passes and contacts.

Flight charge lasts about five seconds at full thrust. At zero charge the car descends automatically; release the flight control and drive on the ground to recharge. The same charge powers boost. A contact slows the car; flying high enough avoids traffic. Finish the 5 km sprint ahead of NOVA, ORBIT and APEX. Personal best time is stored in this browser when storage is available.

## Verify

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
make run                # All three (test:browser builds first)
make deploy             # make run, then Netlify production deploy + smoke check (see Deploy)
```

Browser tests use an installed Google Chrome. Tests allow SwiftShader for headless rendering; normal gameplay uses the browser's available GPU. Screenshots are written to `artifacts/` as JPEG (quality 70); test traces/results are ignored. The full sprint test takes roughly a minute on a fast machine, longer when software rendering slows the simulation.

```sh
npm run preview         # Serve the production build after npm run build
```

## Deploy

Live at https://skyline-rush.netlify.app. Netlify never builds on its own (`ignore = "exit 0"` in `netlify.toml`); production is published only when a version tag is released.

```sh
git tag v0.2.0 && git push origin v0.2.0   # release: the pre-push hook runs make deploy
make deploy                                # same deploy by hand: make run → netlify deploy --prod → smoke check
```

The pre-push hook (`.githooks/pre-push`) runs `make deploy` when a pushed tag points at HEAD; a failed deploy blocks the push. Enable it once per clone with `git config core.hooksPath .githooks`. `make deploy` needs `npx netlify-cli login` once per machine and the site link in `.netlify/state.json` (`npx netlify-cli link`). CI (`.github/workflows/ci.yml`) only builds and tests; it never deploys.

## Project

- `src/game.js`: deterministic arcade simulation, opponents, traffic and finish order.
- `src/input.js`: keyboard and multi-pointer controls with cancellation and blur cleanup.
- `src/world.js`, `src/geometry.js`: Three.js renderer, procedural cars, highway, skyline, flight effects and cameras.
- `src/effects.js`: a fixed 480-particle GPU pool for vapor, sparks and landing dust.
- `src/main.js`, `src/style.css`: start screen, telemetry, pause/results, responsive controls and lifecycle.
- `src/audio.js`: synthesized sound effects and the looping intro/race music sequencer.
- `tests/`: unit and browser behavior tests.
- `docs/design.md`, `docs/verification.md`: scope and verification evidence.

All vehicle/scenery geometry and effects are generated in code. Barlow Condensed is bundled under its SIL Open Font License in `public/fonts/OFL.txt`. Three.js, Vite and Playwright retain their respective package licenses.

This is a local Git repository on `main`, with no remote configured. Single-player, one route, arcade physics. Browser verification covers desktop Chrome and emulated mobile viewports; physical phones and Safari have not been verified.
