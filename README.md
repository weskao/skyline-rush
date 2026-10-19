# Skyline Rush

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

A playable 3D coastal highway sprint starring a flying electric sports car, modeled on the Tesla Roadster 2 and its rocket-thruster concept. Lift off on four blue thrusters, race three opponents, fly over traffic, manage charge and land to recharge. The handling is fictional arcade physics; this is an unofficial fan project, not affiliated with Tesla or SpaceX.

![Start screen with the audio settings open](artifacts/readme-start.jpeg?v=20261019b)

![Skyline Rush in flight](artifacts/readme-hero.jpeg?v=20261019b)

![Mobile portrait layout while ascending](artifacts/mobile-flight.jpeg?v=20261019b)

![Race results with a new personal best](artifacts/race-results.jpeg?v=20261019b)

## Run locally

Requires Node.js 22.12 or newer and a browser with WebGL 2 and hardware acceleration.

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
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
| NITRO | E (one full charge; press again during NITRO to extend it) |
| Right-hand alternates | J = Fly, K = Boost, L = NITRO (the original keys still work) |
| Drift | Hold S + A / D above 162 km/h (ground only) |
| Start | Enter |
| Pause / resume | Esc / P |
| Restart | R |
| Change camera | C |
| Mute / unmute all audio | M |
| Auto accelerator on / off | T / AUTO button |

Mobile layouts provide steering, accelerator, brake, boost, flight and NITRO buttons. Touch controls support simultaneous holds. AUTO holds the accelerator so you can concentrate on steering and flying; braking always overrides it. The setting lasts until toggled off or the page reloads. Leaving the tab pauses the race and clears held input. Camera and sound shortcuts preserve held driving controls. On touch, sliding a thumb down on the steering pad brakes and sliding down and sideways drifts; in Buttons mode the brake sits under the steering buttons so brake + steer drifts there too.

Open **Controls** before a race or while paused to adjust keyboard steering sensitivity or remap a driving action. Select an action, then press a key; conflicting bindings swap, fixed shortcuts stay reserved, and Escape cancels capture. Reset keyboard restores the defaults. Bindings take effect immediately and are saved under `localStorage['skyline-rush-keymap']`.

The same panel controls touch steering mode, handedness, slide sensitivity, size, opacity and hold/toggle FLY. **Edit touch layout** lets you drag the action and classic steering buttons over the race preview; **Done editing** keeps the arrangement and **Reset touch layout** restores it. Positions persist across reloads, mirror with handedness and stay within the viewport after rotation.

All audio is synthesized with Web Audio; no audio downloads are needed. Background music has two looping synthwave tracks: an intro theme (~64 s) on the start and results screens, and a faster race theme (~55 s) from the countdown on. Each builds up over its loop and ducks while paused. Sound effects cover menu confirmation, three countdown ticks and GO, motor/wind, lift and boost, braking, vehicle/guardrail contact, landing, low-charge warning, close-pass reward and a finish melody. Muting effects stops pending cues, and pausing fades driving sounds. Low-charge warnings rearm only after recharging above 30%.

The speaker icon opens audio settings with separate Music and Sound effects switches (shown open in the start-screen screenshot above). Both default to on, and each choice is remembered in a cookie (`skyline-rush-music`, `skyline-rush-sound`) for a year. The intro music starts as soon as the page loads where the browser allows autoplay. Where it doesn't (most browsers on a first visit), the start screen asks "Play background music?". **Play music** starts it, and so does any other click or key press. **Not now** turns Music off and remembers that.

The flight panel shows ascent, cruise, descent and touchdown, remaining thrust seconds and the next control to use. Cyan rings mark the aerial corridor and are gameplay: see Rings below. Mobile also has a hold-to-boost button. Orange contact reports show the impact type and speed lost; guardrails now rebound and slow a grounded car. Flying above them clears the rails.

The scene includes bloom lighting, sunset water, suspension bridges, thruster vapor, collision sparks and touchdown ripples. Camera motion and nonessential speed streaks respect your system's reduced-motion preference. Sound effects give separate thrust, contact and landing feedback.

Three amber start lights turn cyan at GO. The player car is a low wedge roadster with a smoked fastback canopy, a full-width red tail bar, four rear thruster ports, a bronze pop-up wing that rises for boost, braking and flight, spinning five-spoke wheels and steering front wheels. Each rival has its own silhouette and light signature: NOVA is a long-tail with twin fins and split magenta lights, ORBIT a rounded GT with a bubble canopy and round cyan lamps, APEX a track car with a splitter, roof scoop, tall endplate wing and amber C-lights. Traffic uses an upright commuter shape. Steering eases in quickly and releasing boost slows the car progressively instead of instantly cutting speed. All driving and toolbar buttons have at least 44px touch targets, including at 320px width.

For an extra charge reward, overtake traffic closely on the ground above 126 km/h. Clean passes within five seconds chain up to ×5 and refill 8–16% charge (capped at 100%). Collisions break the chain; airborne, distant and recovering passes earn no reward. The HUD announces each pass and the final 500 metres; results show total close passes and contacts.

Flight charge lasts about five seconds at full thrust. At zero charge the car descends automatically; release the flight control and drive on the ground to recharge. The same charge powers boost. A contact slows the car; flying high enough avoids traffic. Finish the 5 km sprint ahead of NOVA, ORBIT and APEX. Personal best time is stored in this browser when storage is available.

### Handling

Steering ramps to full over 0.15 s and the lateral speed is capped at 9 m/s at high speed. Holding Fly below 65 km/h is remembered for 1.5 s and lifts off automatically once fast enough. Releasing Fly in the air lowers the fall acceleration (11 → 7 m/s²) for softer landings. Vehicles are 1.7 m wide for collisions, so more passes count as near misses. A shallow guardrail touch is a scrape (0.92 speed kept, pushed back onto the road, no collision, combo kept); head-on hits still count as contact. With AUTO on, releasing steering also eases the car to the nearest lane centre (lane assist). Holding Fly + Boost drains 22 charge per second instead of 29, keeps the boost speed cap and displays AIR DASH.

### NITRO and drift

NITRO has its own reserve (`player.nitro`, up to 3 charges, each fills as a float). The three-segment HUD shows partial charge, full segments glow, and NITRO MAX pulses when full (motion is suppressed in comfort/reduced-motion modes). Pickups along the track (blue cell +0.25, orange can +0.5, airborne gold tank +1, one rainbow overcharge that fills to the cap) are placed from the track seed; anything above the cap becomes charge (each 0.25 = +8). One charge gives 2.5 s with the speed cap raised by 30 m/s, stronger acceleration, exhaust and lens feedback; pressing again extends it by 2 s without stacking speed, so three presses chain into a 6.5 s burst. Traffic contact during NITRO keeps 70% speed instead of 45%.

Above 162 km/h on the ground, brake + steer drifts instead of hard braking: only 3 m/s² is lost, near-miss combo points double, and releasing pays NITRO plus a mini boost by drift time (1 s: +0.15 and 0.5 s, 2 s: +0.3 and 0.8 s, 3 s: +0.5 and 1.2 s). The body yaws 25°, smoke and blue/orange/purple sparks show the tier, tire screech builds, and the HUD names drift/mini-boost states. Taking off, falling into a gap, or hitting a car or barrier loses the build-up.

### Rings

The 5 km coast has 22 rings every 220 m, in groups of 3 to 5 (placed from the track seed). A ring counts only when the car passes through its visible radius; grazing the edge does not. Types: cyan charge (+20 charge), gold nitro (+0.5), purple slipstream (3 s mini boost), red risk (a small ring, +1 NITRO and 500 score) and rainbow mystery (one random-by-seed effect: shield 10 s or until the first hit, magnet 5 s, ghost through traffic 3 s, or freeze rivals at half speed 2 s). Collected rings burst once and disappear. Clearing a whole group announces PERFECT LINE and awards +1 NITRO; missing one ring breaks it but keeps the rewards already earned.

### Rivals, slipstream and the final sprint

Staying right behind a rival or traffic car for 1.5 s gives +6 m/s of speed cap and +0.25 NITRO (leave the draft to re-arm). Rivals use NITRO too, two charges each, by personality: NOVA fires steadily from 8 s then every 18 s, ORBIT fires while flying, APEX surges from 75% of the race. Light rubber-banding (at most ±4% speed beyond 50 m) keeps the race tense. In the last 500 m the race music speeds up to 115% and the status line shows the gaps to the nearest rival ahead and behind (`FINAL 500 M · +N m · −N m`).

### Saved data

All saves use try/catch, so the game still runs when storage is blocked. `skyline-rush-history`: one record per finished race, latest 50. Open **History** from the start or results screen to filter by track, see the best run and a chart of the latest ten times, and tap a run for details. `skyline-rush-best-tracks`: best time per track; the old single `skyline-rush-best` is migrated into `coast` once and is still written for coast. `skyline-rush-unlocked`: track unlocks, preserved even after older runs leave History. `skyline-rush-keymap`: key bindings. `skyline-rush-controls` and `skyline-rush-vfx`: driving and visual settings.

### Tracks and style

Start on Coast. Finish top three to unlock Neon Downtown, then Canyon Skyway, then Aurora Pass. Choose a track before starting; keyboard users can move between track buttons with Left/Right and choose with Enter. Restart keeps the selected track; **Choose track** on the results screen returns to the menu. Each track has its own sky, palette and procedural scenery: rainy neon streets and low tunnels, red desert cliffs and bridge gaps/crosswinds, or snowy mountains with aurora and ice. Warning signs mark special sections. Aurora's uphill sections recharge ground fuel at half the normal rate.

Style points reward close passes (100 × combo, with drift's doubled combo), rings (150, plus 500 for a risk ring), PERFECT LINEs (500), moving airtime (10 per second), and every 500 clean metres (100). Contacts and gap falls reset clean-distance progress. Results award one star for finishing, two at 250 points/km, and three at 500 points/km, independently of finishing position.

Fuel and nitro bars ease toward new values, warn below 20% capacity, shimmer on refills and pulse when a nitro charge completes. Comfort mode and system reduced motion disable those animations. The slide pad shows a floating ring/knob while held and a short hint at the start of a race; release returns steering to neutral.

## Verify

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
```

Browser tests use an installed Google Chrome and allow SwiftShader for headless rendering. CPU-only CI uses a device scale factor of 0.25 to keep the 3D scene responsive while retaining the same CSS viewport sizes and gameplay assertions; local tests render at full resolution. Normal gameplay uses the browser's available GPU. Screenshots are written to `artifacts/` as JPEG (quality 70); test traces/results are ignored. The full sprint test takes roughly a minute on a fast machine, longer when software rendering slows the simulation.

```sh
npm run preview         # Serve the production build after npm run build
```

## Deploy

Play at [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/). The website is public: visitors need neither a GitHub account nor Tailscale, and the developer's computer can be offline.

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: CI checks → GitHub Pages deployment
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it.
```

CI (`.github/workflows/ci.yml`) builds and runs unit and Chrome browser tests on pushes to `main`, pull requests, version-tag pushes (`v*`) and manual runs. Browser tests run in four parallel shards (`--shard=N/4`), and a newer push to the same branch cancels the run it supersedes. Version-tag pushes and manual runs publish only after all checks pass, then verify the public website. Ordinary branch pushes and pull requests only run checks. Pages builds use `--base=/skyline-rush/` so scripts, styles and fonts load from the project URL. GitHub Pages must use **GitHub Actions** as its publishing source. Manual deployment requires an authenticated GitHub CLI (`gh auth login`); push your commits first because `make deploy` uses remote `main`. Deployment no longer depends on a local pre-push hook or Netlify login.

The link-preview image is `public/og-image.jpeg`, a copy of `artifacts/readme-hero.jpeg`. After changing the cover, copy it again and bump the `?v=` on `og:image` in `index.html` so social sites fetch the new one.

## Project

- `src/game.js`: deterministic arcade simulation, opponents, traffic and finish order.
- `src/input.js`: keyboard and multi-pointer controls with cancellation and blur cleanup; reads the saved key map.
- `src/key-map.js`: pure key map with J/K/L and E alternates, conflict-swapping rebind, validation and storage.
- `src/history.js`: per-race history (latest 50), per-track best times, legacy best migration and career stats (no UI yet).
- `src/rng.js`: seeded random streams; track pickups and rings come from the track seed.
- `src/world.js`, `src/geometry.js`: Three.js renderer, procedural cars, highway, skyline, flight effects and cameras.
- `src/effects.js`: a fixed 480-particle GPU pool for vapor, sparks and landing dust.
- `src/App.vue`, `src/icons.js`: the Vue 3 UI shell (start screen, HUD, panels, touch controls) and its shared SVG icons; rendered once with no reactive state.
- `src/main.js`, `src/style.css`: mounts `App.vue`, then drives telemetry, pause/results, responsive controls and lifecycle on that DOM.
- `vite.config.js`: Vite with `@vitejs/plugin-vue`.
- `src/audio.js`: synthesized sound effects and the looping intro/race music sequencer.
- `tests/`: unit and browser behavior tests.
- `docs/design.md`, `docs/verification.md`: scope and verification evidence.

All vehicle/scenery geometry and effects are generated in code. Barlow Condensed is bundled under its SIL Open Font License in `public/fonts/OFL.txt`. Three.js, Vue, Vite and Playwright retain their respective package licenses.

Source: [weskao/skyline-rush](https://github.com/weskao/skyline-rush). Single-player, one route, arcade physics. Browser verification covers desktop Chrome and emulated mobile viewports; physical phones and Safari have not been verified.
