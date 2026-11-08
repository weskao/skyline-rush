# Skyline Rush

**English** · [繁體中文](README.zh-TW.md)

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

A browser-based 3D arcade racer starring a flying electric sports car, modeled on the Tesla Roadster 2 and its rocket-thruster concept. Race AI opponents across varied courses, fly over traffic, manage thruster charge and use driving rewards to keep moving. The handling is fictional arcade physics; this is an unofficial fan project, not affiliated with Tesla or SpaceX.

## The game

In Classic Race, Skyline Rush is a replayable arcade sprint: one player races multiple AI rivals and road traffic, on desktop or phone, with nothing to install. Other modes offer solo driving, custom rules, lap racing and multi-stage challenges.

- **Drive, then fly.** Build speed and hold FLY to lift off over traffic, through rings and across broken bridges. Flight and BOOST share thruster charge; grounded driving, unpowered gliding and rewards help replenish it.
- **Earn NITRO by driving well.** Close passes, drifts, ring groups (PERFECT LINE), slipstreams, landed barrel rolls and pickups fill a separate NITRO reserve; activate a burst or chain presses to extend it.
- **Explore and unlock courses.** Race coastal highways, neon streets, canyons, icy mountain roads, elevated spirals and World Tour destinations. Courses have distinct scenery and hazards, with aerial shortcuts on the point-to-point routes. The selector distinguishes playable tracks from Coming Soon previews.
- **Something to chase.** Eligible Classic finishes earn style stars toward Garage paints. Best-run Ghosts, daily challenges, medals and mode-specific records give reasons to race again.

Race length depends on the course and mode. Sound is synthesized in the browser, and progress is saved locally. Optional Google sign-in enables cloud-save synchronization; an account is not required to play.

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=2" width="70%" alt="A selection of tracks in flight: Neon Downtown, Aurora Pass, Sky Spiral and Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.jpeg?v=2" width="49%" alt="Start screen with game modes, tracks and Start race"> <img src="artifacts/race-results.jpeg?v=2" width="49%" alt="Race results with a new personal best"></p>

### Play on your phone

Portrait or landscape with touch controls; AUTO keeps the accelerator held. [Watch the MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg?v=2" height="300" alt="Mobile portrait start screen with track selection"> <img src="artifacts/mobile-landscape-flight.jpeg?v=2" height="300" alt="Mobile landscape flight with FLY held and the touch controls visible"></p>

Captured in Chrome mobile emulation (390×844 and 844×390) on a fresh profile; not a physical-phone performance measure.

## Game modes and replayability

> This README describes the current checkout. The deployed GitHub Pages build follows the release workflow and may differ from development. Coming Soon previews do not imply playable courses.

Select a **track you have unlocked**, choose **GAME MODE** below the track cards, expand its rules when needed, then press **Start race** (or Enter). Racing still uses the same Three.js road, flying, FLY / BOOST / NITRO and responsive touch controls. Available modes include:

| Mode | What changes | Win condition / progression |
| --- | --- | --- |
| **Classic Race** | Point-to-point racing against AI rivals, with traffic, shortcuts, rings and NITRO. | Podium finishes unlock the next Career track; eligible Classic finishes award Career stars, medals and official bests. |
| **Custom Race** | Configure rival count (including solo), AI difficulty, traffic, pickups and collision penalties, or start from a preset. | Unranked results have their own history. Optional sprint stages replay point-to-point routes and compare aggregate time; they are not circuit laps. |
| **Free Drive** | Explore any unlocked course alone, with adjustable road traffic and pickups, no race placing and no forced victory. | Drive, drift and fly freely until the road ends; reaching the end finishes the run with a result screen, saving no records. This is **not** an infinite-world mode. |
| **Time Attack** | Solo timed sprint, compatible best-run Ghost and ahead/behind split. Optional **Clean Time Trial** toggle. | Track and rules-specific best times; a Clean run with any collision is invalidated and does not replace a personal best. |
| **Obstacle Run** | Seeded roadside barriers; **Standard** or **Extreme** density. Some obstacles sweep sideways; warning HUD previews approaching danger. | Dodge hazards, earn style points for clean passes and use the ordinary route's finish. Obstacle placement and collision share deterministic logic; Classic is unchanged. |
| **Checkpoint Rush** | Race through glowing gate arches, replenishing the countdown and earning style points for clean crossings. | Reach every gate and the finish before time runs out. Missed gates and timeouts do not save a valid best; the HUD shows progress, time remaining and the next target. |
| **Championship Cup** | Build a multi-track Cup from unlocked routes and race the AI field across its stages. | Placements earn cumulative points; total time breaks standings ties. Cup results are separate from Career unlocks. |
| **Stunt Attack** | A timed style session across back-to-back heats: drifts, air tricks, near misses and rings build a combo score. | The timer ends the session; local medals and best scores are tracked separately by duration. |
| **Elimination** | The last-placed active driver is eliminated at timed intervals. | Survive to be the last driver standing; an early knockout ends your run without rewards. |

### Cup recovery

An unfinished Championship Cup offers **Resume** or **Discard** on the home screen. Resume keeps settled stage points and restarts only the unfinished stage; retry rolls back only the stage being replayed. Completing or discarding the Cup clears its recovery entry. Deleting game progress also removes the checkpoint while preserving device preferences. Recovery uses this browser’s storage and cannot restore data the browser refused to save.

### Custom presentation and Ghosts

Custom Race can replay the fastest compatible Ghost for each sprint heat. Custom and Free Drive offer Track / Day / Dusk / Night / Rain / Fog presentation presets and a live rule summary. These cosmetic choices do not change record eligibility or ruleset identity. Retry retains the selected appearance; changing track or returning to Classic restores the track appearance. Photo Studio restores the active race appearance when closed.

### Optional items and bonus gates

Custom and Free Drive offer **Off / Classic Mystery Rings / Active Items / All Items**. Held items use one slot: press **Q** or tap **USE** to activate, then wait for cooldown. NITRO and FLY/BOOST keep their own controls. All Items adds bounded speed, air-charge and one-hit recovery gates; EMP briefly slows nearby rivals and converts to Magnet in solo play. Recovery preserves official collision counts. Stunt Attack and Checkpoint Rush can separately opt into temporary, nonstacking ×2 score gates. Classic defaults stay unchanged.

### Event Lab Lite v1

**Event Lab Lite** edits local course templates with barriers, NITRO rings and supplies on unlocked routes. Change their lane and distance, Undo/Redo/Reset edits, and import or export a validated course as text. Starting compiles the course into real race encounters; retry preserves the course and seed. Course results stay separate from Career and Custom records. Cones, authored ramps, checkpoint editing and community sharing remain outside this first version.

### Endless Highway

**Endless Highway** turns a selected playable track into a distance-survival event beyond its authored finish. Traffic difficulty rises to a cap; reaching the collision limit ends the attempt. Longest-distance records stay separate from Career and Ghosts. Pause and WebGL recovery preserve the run, while nearby scenery and encounters use bounded pools.

### Circuit Race

**Circuit Race** uses Harbor Circuit, a separate closed loop with a selectable lap count. Cross every sector in order to earn a lap; backward crossings, teleports and recovery cannot grant laps. HUD and results show splits, last lap, personal best lap and total time. Lap bests survive rolling History eviction; total times and Ghosts stay specific to the lap configuration. Point-to-point courses keep their geography and Career progression.

### Track themes, obstacles and risk lines

- **Track themes** (opt-in in Custom, Free Drive and Obstacle Run) give every route its own hazards: Coast cargo and gusts, Neon roadworks, Canyon rockfall, Aurora snowbanks, ice and blizzards, Sky Spiral energy gates, Taipei festival barricades, Tokyo signal gates, Alpine avalanches, Coastal wave spray and Cosmic energy walls. Hazards are warned ahead, always leave two lanes open and never change Classic.
- **Obstacle Run** offers a **Mixed obstacles** course: sweeping gates, falling debris and hoops over barricades that reward flying through or driving around.
- **Risk lines**: high risk rings and close passes pay more on Custom Hard and can be switched off for relaxed practice.
- The roads gained non-solid roadside life: spectators, billboards, service vans, rail platforms, passing trains, ships and drones. Lower graphics settings draw less of it.

### Race setup, results and accessibility

- Mode and track selection remain accessible by keyboard and touch; contextual panels only show options relevant to the selected mode. Unavailable Cups explain the number of tracks still required.
- HUDs adapt to the mode: solo events hide misleading rival ranks; multi-stage and Cup runs show stage progress; Checkpoint Rush shows its live gate countdown; Obstacle Run warns of approaching barriers; Clean Time Trial visibly indicates an invalidated run.
- Practice, Custom, Time Attack, Obstacle, Checkpoint and Cup results use the separate `skyline-rush-mode-history-v1` record key. Eligible practice Ghosts have their own saved ruleset; Classic unlocks, stars, medals, Daily records and official times are protected from practice runs.
- In **History → Challenge records**, filter by mode to see personal bests per exact track/ruleset and eligible Time Attack Ghosts. The lifetime best stays saved even when older runs rotate out, under `skyline-rush-mode-bests-v1`. Challenge records are explicitly not Career medals or stars.
- Mode labels, result explanations, setup options and danger warnings support English and Traditional Chinese. Low-quality graphics, touch controls and reduced motion remain part of the verification plan.

### Real game screenshots and verification

The screenshots used to inspect these modes were taken **from the running browser game**, not concept art. [Download the actual Playwright capture set](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411) (Custom solo, Free Drive, Time Attack, Obstacle Run, Extreme obstacles, Checkpoint Rush and mobile mode menu). GitHub Actions artifacts may require sign-in and expire; to recreate them locally, run `npx playwright test tests/race-modes-browser.spec.js` and open `test-results/race-mode-*.png`. CI screenshots are software-rendered at reduced resolution, not representative of final device image quality.

**Verification:** each feature lists its tests and full-gate receipts in `TODO.md`. Physical iPhone and Android checks are still pending.

## Run locally

Requires Node.js 22.12 or newer and a browser with WebGL 2 and hardware acceleration.

```sh
cd skyline-rush   # From the directory containing your clone
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

Open the local URL Vite prints (normally http://127.0.0.1:5173). Assets and the font are bundled locally. Core gameplay needs no account; optional cloud-save sign-in and synchronization use Firebase services.

`make` and `make dev-unlocked` also start local Firebase Auth/Firestore emulators (needs Java 21+), so the cloud-save Google sign-in works with fake test accounts and never touches real saves. Cloud-save operations and Spark quota checks for the project owner are in `docs/cloud-save.md`.

`make dev-diag` and `make phone-diag` serve the same builds with an on-screen diagnostic banner compiled in (frame counter, page lifecycle and touch events with their hit targets, plus the last uncaught errors kept across reloads), for chasing a freeze or dead buttons on a real phone. Production builds never contain it: `npm run build` refuses a bundle that carries the diagnostic module.

`make phone` opens a terminal menu that starts, checks or stops a dev server your phone can open (over Tailscale or the same Wi-Fi) and prints the phone URL once it answers. The menu lists this checkout, other worktrees and recent branches, or takes a typed branch name; `make phone <name>` goes straight to that branch (or `feature/<name>`), creating its worktree under `.claude/worktrees/` when needed, `make phone off` stops every server it started (like `/phone-dev off`), and `y=1` (e.g. `make phone y=1 <name>`) skips the menu: every question takes its Recommended option and each choice is printed. When a port is already held by this project's own earlier server (any worktree), reusing that port is the Recommended answer: the old server is stopped and the URL stays the same; `make dev`, `make dev-diag`, `make dev-unlocked` (5173) and `make dev-feature` (5443) do the same without asking, and leave another project's server alone. It serves the normal locked build; `make phone-unlocked [name]` is the same menu with every track and paint unlocked, the only all-unlocked server a phone can reach (`make dev-unlocked` and `make dev-feature` stay desktop-only). Coming Soon cards stay preview-only in every build except an id added to `PLAYABLE_PREVIEW_IDS` in `src/upcoming-tracks.ts` (only once its real race runtime is in `RACE_TRACKS`); `make dev-unlocked` and `make phone-unlocked` then let that card start, production never does. It needs the personal `phone-dev` Claude Code skill (`/phone-dev` asks the same menu) and runs without the emulators, so cloud-save sign-in on the phone uses the real project.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate | W / ↑ |
| Brake | S / ↓ |
| Steer | A / D or ← / → |
| Fly | Hold Space once moving fast enough |
| Land | Release Space |
| Boost | Hold Shift; consumes thruster charge |
| NITRO | E / X (one full charge; press again during NITRO to extend it). WASD hands use E; arrow-key players keep the left hand on Shift / X / Space |
| Drift | Hold S + A / D at speed (ground only) |
| Start | Enter |
| Pause / resume | Esc / P |
| Restart | Backspace |
| Change camera | C |
| Mute / unmute all audio | M |
| Auto accelerator on / off | F2 / AUTO button |
| AIRFLOW showcase on / off | V / AIRFLOW button |
| Change track on the home screen | Swipe or drag the 3D preview left / right, or two-finger swipe on a trackpad |

Mobile layouts provide steering, accelerator, brake, boost, flight and NITRO buttons. Touch controls support simultaneous holds. AUTO holds the accelerator so you can concentrate on steering and flying; braking always overrides it. It starts on for every device; once you toggle it, your choice is remembered in this browser (`skyline-rush-auto`). Leaving the tab pauses the race and clears held input. Clicking the SKYLINE RUSH logo mid-race pauses and asks first: **Keep racing**, **End race** (back to track select, run not saved) or **Back to home** (reloads); either way the start screen reopens on the track just raced, scrolled to the centre of the track row (the first and last tracks sit at its ends). Esc leaves the race paused. Camera and sound shortcuts preserve held driving controls. On touch, sliding a thumb down on the steering pad brakes and sliding down and sideways drifts; in Buttons mode a slimmer brake sits above the steering buttons, off the row the thumb rests on, so it is only pressed on purpose; sliding the thumb from ← or → up into the brake keeps steering and brakes, so one thumb drifts, and sliding back down releases the brake. Touch buttons stay clear of the screen corners for an easier thumb reach, and tablets lift and enlarge them.

Open **Controls** before a race or while paused to adjust keyboard steering sensitivity or remap a driving action. Select an action, then press a key; conflicting bindings swap, fixed shortcuts stay reserved, and Escape cancels capture. Reset keyboard restores the defaults. Bindings take effect immediately and are saved under `localStorage['skyline-rush-keymap']`. Phones and tablets hide the keyboard section until a physical (e.g. Bluetooth) key is pressed; that keyboard is then remembered under `localStorage['skyline-rush-keyboard-seen']`.

The same panel controls touch steering mode, handedness, slide sensitivity, size, opacity and hold/toggle FLY. **Edit touch layout** lets you drag the action and classic steering buttons over the race preview; **Done editing** keeps the arrangement and **Reset touch layout** restores it. Positions persist across reloads, mirror with handedness and stay within the viewport after rotation. On short landscape screens (under 380 px tall, such as iPhone Safari with its toolbar showing), the start screen drops its tagline so START RACE needs no scrolling, and the race HUD hides the speed dial and secondary charge lines so no panel overlaps another.

All audio is synthesized with Web Audio; no audio downloads are needed. Music follows the current screen, course and game mode, with cues for events such as checkpoints, hazards, tricks and the final sprint. Sound effects cover menus, countdowns, driving, flight, boost, contact, landing and rewards. Pausing fades driving sounds; muting effects stops pending cues.

The speaker icon opens audio settings with a Music row and a Sound effects row, each a mute switch plus a volume slider (shown open in the start-screen screenshot above). **Mute all** (or M) silences both at once. Muting keeps each channel's level, so unmuting returns to it; dragging a slider to zero mutes that channel the same way. Both default to on at 100%, and each on/off choice and volume is remembered in `localStorage` (`skyline-rush-music`, `skyline-rush-sound` holding `on`/`off`, plus `-volume` variants holding the percentage); with nothing stored both channels are on and get stored as `on`. On short screens the panel scrolls. The intro music starts as soon as the page loads where the browser allows autoplay. Where it doesn't (Chrome and most other browsers on a first visit), the first tap, click or key press starts it. On iPhone and iPad the game asks for media playback, so the silent switch doesn't mute it; this also pauses other apps' audio while the game plays.

The flight panel shows ascent, cruise, descent and touchdown, remaining thrust seconds and the next control to use. Cyan rings mark the aerial corridor and are gameplay: see Rings below. Mobile also has a hold-to-boost button. Orange contact reports show the impact type and speed lost; guardrails now rebound and slow a grounded car. Flying above them clears the rails.

The scene includes bloom lighting, sunset water, suspension bridges, thruster vapor, collision sparks and touchdown ripples. Camera motion and nonessential speed streaks respect your system's reduced-motion preference. Sound effects give separate thrust, contact and landing feedback.

**VFX** (top right) picks a Realistic, Cinematic or Extreme look, Low / Medium / High quality (Low turns bloom off and draws less scenery), Comfort mode (no flashes, shake, afterimages or blur) and optional haptics. Its **Race HUD** section picks Immersive or Competitive (with leaderboard, minimap and secondary-stats switches), turns the NITRO READY sound and animation on or off, and **Reset HUD to default** restores them. **Fine tuning** exposes each effect as a slider and **Reset visual settings** restores the defaults. **AIRFLOW** (or V) switches the scene to an aerodynamics showcase: streamlines over the body, a telemetry panel, Low drag or High downforce, and a driving, front, rear, side or orbiting camera. The start panel steps aside for the showcase, leaving only the orange **START RACE** button, docked at the bottom centre below the car; swipe the scene left or right to change track. The first time AIRFLOW is switched on, an animated fingertip shows that gesture. The streamlines appear only while AIRFLOW is on: with it off, BOOST and NITRO show the thruster jets, trail and speed streaks without them.

Start lights signal the countdown and GO. The player drives a roadster with rear thrusters, an active wing and animated wheels. AI rivals have distinct silhouettes and light signatures, while traffic uses commuter vehicles. Steering eases in and releasing boost slows the car progressively. Driving and toolbar controls provide touch-sized targets.

Overtaking traffic closely on the ground at speed builds a reward chain and refills charge. Collisions break the chain; airborne, distant and recovering passes earn no reward. HUD callouts report passes and the final sprint, and results summarize close passes and contacts.

Powered flight consumes thruster charge; at zero, the car descends automatically. Release FLY and BOOST to glide and recover charge, or land for faster recharging. BOOST draws from the same reserve. Rivals and traffic obey shared collision rules: they avoid slower cars and solid obstacles, and impacts slow and push the cars involved. Race ahead of the AI field to win; eligible personal bests are stored when browser storage is available.

### Handling

Steering builds smoothly, with lateral movement limited at speed. FLY briefly buffers an early press until takeoff speed is reached. Releasing FLY softens descent; with BOOST also released, gliding recovers charge. An emptied thruster becomes available again after release and sufficient recovery. Gap warnings help judge the charge needed to cross, while dedicated ramps can launch the car. Shallow guardrail scrapes preserve the combo; harder impacts count as collisions. AUTO also provides lane-centering assistance when steering is released. Holding FLY + BOOST engages AIR DASH, sharing charge more efficiently than independent thrust.

### NITRO and drift

NITRO has a separate reserve shown as charge segments in the HUD. Pickups, rings and driving rewards refill it; NITRO rewards can also restore thruster charge, with overflow converted to charge. Pickup layouts scale with the starting grid and are re-rolled each race. A full charge activates a timed speed and acceleration boost; pressing again extends the burst without stacking its speed bonus. NITRO also reduces speed loss from traffic contact.

At speed on the ground, brake + steer starts a drift. Hold the drift to build reward tiers, then release for NITRO and a mini boost. Smoke, colored sparks, sound and HUD feedback show the build-up. Taking off, falling into a gap or colliding loses the accumulated reward.

NITRO does not consume thruster charge and can run alongside FLY or BOOST; powered flight and BOOST still drain their shared reserve.

**Air tricks**: while flying, quickly steer in opposite directions to start a barrel roll. Finish the roll and land softly to earn NITRO; landing early, hitting an obstacle or landing too hard cancels the reward. HUD, sound and optional haptics report the trick. Reduced motion and Comfortable VFX retain the feedback without the spin.

**Shortcuts**: point-to-point courses have marked aerial corridors above an edge lane. Holding the flight line grants a higher speed cap and free flight while inside, with pickups along the route; BOOST still consumes charge. Pylons remain solid hazards. The translucent deck and SHORTCUT / FLY HIGH signs identify the route, and the HUD reports entry.

### Rings

Ring layouts scale with the starting grid and course, with grouped rings, straight-line trains, full-width rows and risk rings; Endless streams new encounters as distance increases. Positions are re-rolled each race while respecting course hazards. Pass through the visible opening to collect a ring. Ring types replenish charge or NITRO, grant a mini boost, reward risk or apply a temporary mystery effect. Collected rings disappear; clearing a complete group awards PERFECT LINE and bonus NITRO. Missing a ring breaks the group but keeps rewards already collected.

### Rivals, slipstream and the final sprint

Draft behind a rival or traffic car to earn a temporary speed-cap increase and NITRO; leave the slipstream before earning it again. Rivals manage BOOST and NITRO according to difficulty and driving conditions, and bounded pace adjustments keep the field competitive. Eligible Classic and Cup races can place extra recovery supplies ahead when the player falls well behind. During the final sprint, music and HUD feedback emphasize nearby rivals and the distance gaps.

### Saved data

Progress and preferences use browser storage with validation and failure handling, so blocked or malformed storage does not prevent play. History retains recent races, while compatible best times, track unlocks, medals, stars, paint choices and eligible Ghosts are stored separately. Records are scoped to the track layout and ruleset so incompatible runs do not replace current bests; compatible legacy data is migrated when available. Open **History** to filter races, compare times and inspect details. Daily and challenge-mode records remain separate from Career results. Optional Google sign-in synchronizes supported progress through Firebase; device settings stay local. The results screen says whether the finished race reached the cloud, or offers sign-in when you are signed out. See `docs/cloud-save.md` for synchronization and storage details.

### Ghost, daily challenge, medals and Garage

- **Ghost**: each run samples the car's distance, lane position and altitude 10 times per second. A new personal best on a track saves that run, and later races on the track show it as a translucent blue car. It is off by default; turn it on with **Show best-run ghost** in Controls.
- **Daily challenge**: History shows today's track and modifier, picked from the local date: no flight, double traffic, or gold rings only. Canyon never gets no flight, because its broken bridges need it. Daily runs go only on their own board (the fastest five today); they never touch history, best times, unlocks, stars or ghosts. Restart keeps the challenge, and **Choose track** leaves it.
- **Medals**: First victory (win), Clean run (no collisions), Perfect flight (5 PERFECT LINEs in one race) and Triple burst (3 NITRO charges in one burst: one press plus two extensions). Only eligible Classic Race finishes can award them; each keeps the date it was first earned.
- **Garage**: the best style stars earned on each Career track add toward paint unlocks. The Garage shows each paint’s requirement and lets you preview locked options. Paint changes appearance without changing car stats.

### Sky Spiral

Sky Spiral adds a true 3D ascending helical road above a cyberpunk skyline. Drive one complete horizontal revolution around a glowing central tower, then launch from dedicated ramps across elevated gaps. Existing FLY, BOOST and NITRO work on the new course, with optional flight corrections. This track uses a separate curved road renderer and its own 3D path mapper; it is still being validated on physical mobile hardware.

### Tracks and style

Start on Coast and earn podium finishes in eligible Classic races to unlock subsequent Career tracks. The selector shows availability and unlock requirements. Choose a track before starting, or swipe the 3D preview left or right (drag it with a mouse, or swipe two fingers sideways on a trackpad) to page to the neighbouring track like a carousel: it follows the finger, a short flick is enough, the first and last tracks rubber-band, and a chip names the track with page dots; keyboard users can move between track buttons with Left/Right and choose with Enter. Restart keeps the selected track; **Choose track** on the results screen returns to the menu. When available, **Next** starts the following unlocked Career track. It is hidden once Career progression is complete and on daily challenges. If the browser drops the WebGL connection (common on iPhone after locking or switching apps), the game clears the warning when graphics return; otherwise **Start** or **Race again** reloads the page. Each track has its own sky, palette and procedural scenery: rainy neon streets and low tunnels, red desert cliffs and bridge gaps/crosswinds, or snowy mountains with aurora and ice. Warning signs mark special sections. Aurora's uphill sections recharge ground fuel more slowly.

### World Tour tracks, route maps and track names

The World Tour courses share one curved road renderer (`src/world-tour-scene.js`) with per-course palettes, buildings and landmarks (Presidential Office and North Gate silhouettes, neon crossings and a tower, rail viaducts and peaks, a lighthouse and sea bridge, ringed planets). Selecting a World Tour course on the home screen frames its signature landmark behind the hovering cars: the Presidential Office, Tokyo Tower, an alpine peak, a lighthouse or the cosmic gate. Racing toward it, the roadside keeps that landmark in clear view. Every track card shows the full main route, and during a race a live map plots the player and AI rivals on it; aerial shortcuts are never drawn. On screens under 500px tall and narrow phones under 700px tall the live map steps aside and the leaderboard still ranks racers. Track names follow the language chosen with the **EN / 繁體中文** switch (see Language below).

Style points reward close passes, rings, complete ring groups, moving airtime and clean driving distance. Drifts and risk opportunities increase rewards, while contacts and gap falls break clean-distance progress. Eligible Classic results award style stars based on score relative to course length, independently of finishing position.

Fuel and nitro bars ease toward new values, warn when charge is low, shimmer on refills and pulse when a nitro charge completes. Comfort mode and system reduced motion disable those animations. The slide pad shows a floating ring/knob while held and a short hint at the start of a race; release returns steering to neutral.

The HUD uses shared motion timings. A speedometer needle eases with speed; place changes flip the position number with a green up or red down arrow, and leaderboard rows slide into their new places. Compact translucent event callouts sit above the centre of the view, clear of the HUD panels, and queue near misses, PERFECT LINEs, NITRO bursts, charge gains and drift spark tiers without overlapping; a NITRO reward that also refills flight names it (NITRO · +20% CHARGE). Pause, finish and restart clear the queue. Buttons darken while pressed without changing size, so a press anywhere up to the border registers; held touch controls stay illuminated. Optional **Haptic feedback** in VFX settings signals contacts, NITRO and drift rewards on supported touch devices. Comfort mode and system reduced motion keep the text and pressed-state colors while removing the new motion and vibration.

### Language

The whole interface is available in English and Traditional Chinese (繁體中文): start screen, Garage, History, HUD, race callouts, results, route maps, settings and the 3D road signs. One **EN / 繁體中文** switch under the track cards on the start screen changes all of it at once, with no reload. The language is picked in this order:

1. the choice you saved by clicking the switch (`skyline-rush-locale`; it is written only on a click, never from auto-detection);
2. your system language order (`navigator.languages`): the first `en*` or `zh*` entry decides and other languages are skipped (`['ja-JP', 'zh-TW']` selects 繁體中文), any `zh*` tag (zh-TW, zh-HK, zh-Hant, zh-CN, zh-Hans, plain zh) selects 繁體中文, and an empty or missing list falls back to `navigator.language`;
3. otherwise English.

Brand and game terms stay in English in both languages: Skyline Rush, NITRO, FLY, BOOST and rival names. Strings live in `src/locales/`; `src/i18n.ts` owns detection, `t()` and the active locale.

Localized images: `node scripts/capture-og-images.mjs` drives the real app in Chrome and saves `public/og-image.en.jpeg` and `public/og-image.zh-TW.jpeg` (1440×900 start screens) plus `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg` for the Traditional Chinese README (`node scripts/capture-og-images.mjs og` or `readme` runs one half). The English `artifacts/` screenshots are never touched by it. `public/manifest.webmanifest` and the app icons stay as they are: the icons contain no text, and a web app manifest has a single name and description with no per-locale variant, so a second manifest would break installability.

## Verify

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
npm run test:layout     # Home-screen fit, top bar and touch targets (runs on pre-push)
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
make help               # List every make command with its options
```

Browser tests use an installed Google Chrome and allow SwiftShader for headless rendering. CPU-only CI uses a device scale factor of 0.25 to keep the 3D scene responsive while retaining the same CSS viewport sizes and gameplay assertions; local tests render at full resolution. Normal gameplay uses the browser's available GPU. The English README screenshots are written to `artifacts/` as JPEG (quality 70) only when the file is missing or with `UPDATE_ARTIFACTS=1 npm run test:browser`, since the live 3D scene differs every run; test traces/results are ignored. The full sprint test takes roughly a minute on a fast machine, longer when software rendering slows the simulation.

```sh
npm run preview         # Serve the production build after npm run build
```

For a phone check, serve the build on your network (`npx vite preview --host 0.0.0.0`) and open it with `?perf` (for example `http://<computer-ip>:4173/?perf`). A strip at the top then shows racing frame times over the last 20 s: median (p50), 95th percentile (p95), average fps and the sample length. Without `?perf` nothing is measured or shown.

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` builds this checkout, and with `BASE=<git ref>` that ref too (in `.claude/worktrees/perf-<sha>`, reused next time), races Coast for 24 s per run and prints each run's strip plus the per-build median. `make perf-phone` asks the same way `make phone` does for whatever is not passed (`BASE=`, `VIA=tailscale|wifi|auto`, `TG=0`), prints and sends to Telegram one `?perf` URL per build, opens the first in Chrome on any Android phone on USB (`adb reverse`, so any network works), sends a URLs-expired notice on Ctrl+C, and logs every 10 s the phone's sensor temperatures and throttling level (`dumpsys thermalservice`) beside the Mac's thermal warning level, until Ctrl+C. Compare runs only at the same throttling level: a warm phone throttles and drops frames regardless of the build. iPhones report no temperature.

## Deploy

Play at [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/). The website is public: visitors need neither a GitHub account nor Tailscale, and the developer's computer can be offline.

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI (`.github/workflows/ci.yml`) builds and runs unit and Chrome browser tests on pushes to `main`, `develop`, pull requests, version-tag pushes (`v*`) and manual runs. Browser and World Tour long-run tests run in parallel shards, balanced by the measured per-test durations in `tests/ci-durations.json` (`scripts/ci-shards.mjs`), only on `main` and `develop` (other branches run unit and cloud-save checks unless the commit message has `[full-regression]` or a manual run asks for it), and a newer push to the same branch cancels the run it supersedes. CI retries a failed browser test once; a test that passes only on the retry is still annotated on the run, and is treated as a bug to fix (`.claude/rules/browser-test-stability.md`). On any branch, a push or pull request that only changes Markdown, text, images, video or the `Makefile` outside `src/`, `public/`, `tests/`, `scripts/` and `.github/` skips every suite when the parent commit already passed CI on that branch (`scripts/ci-changes.mjs`). Manual runs publish after all checks pass; a version-tag push re-runs the unit tests, confirms (`release-verified`) that the tagged code already passed the full suite on `main` instead of re-running the browser suites, then publishes and verifies the public website. A tag on a commit that CI never passed on `main` is not deployed. Ordinary branch pushes and pull requests only run checks. A push to `main` also fails the `main-merge-source` job (`scripts/check-main-merges.sh`) when one of its merge commits merges anything but `develop` or `hotfix/*`, and that red run blocks the release. Pages builds use `--base=/skyline-rush/` so scripts, styles and fonts load from the project URL. GitHub Pages must use **GitHub Actions** as its publishing source. Manual deployment requires an authenticated GitHub CLI (`gh auth login`); push your commits first because `make deploy` uses remote `main`. Deployment no longer depends on a local pre-push hook or Netlify login. When any check or the deployment fails on a push, tag or manual run, a `notify-telegram` job sends the failed run's link to Telegram; it needs the repo secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (set each with `gh secret set <NAME>`, which prompts for the value) and skips quietly when they are missing.

The link-preview image is `public/og-image.jpeg`, a copy of `public/og-image.en.jpeg`; `node scripts/capture-og-images.mjs og` captures both language covers and refreshes that copy. Crawlers cannot switch language, so `index.html` references only the English cover (with `og:locale` `en_US` and `og:locale:alternate` `zh_TW`), and `public/og-image.zh-TW.jpeg` is its Chinese twin for direct links. After changing the cover, bump the `?v=` on `og:image` in `index.html` so social sites fetch the new one.

## Project

- `src/game.js`: deterministic arcade simulation, opponents, traffic and finish order.
- `src/input.ts`: keyboard and multi-pointer controls with cancellation and blur cleanup; reads the saved key map.
- `src/key-map.ts`: pure key map with E / X NITRO, conflict-swapping rebind, validation and storage.
- `src/history.ts`: saved gameplay data: recent race history, per-track bests and legacy migration, career stats, medals, stars, equipped paint, ghosts and the daily board.
- `src/ghost.ts`: sampled ghost recording, per-track validation and interpolated playback.
- `src/appearance.ts`: paint catalog and star unlock thresholds.
- `src/rng.ts`: seeded random streams; pickups and rings come from a per-race layout seed (the track seed in tests and tools).
- `src/world.js`, `src/geometry.ts`: Three.js renderer, procedural cars, highway, skyline, flight effects and cameras.
- `src/effects.js`: a bounded GPU particle pool for vapor, sparks and landing dust.
- `src/track-paths.ts`, `src/world-tour-scene.js`: one distance-to-road mapping per track and the shared World Tour road, scenery and landmarks.
- `src/route-map.ts`, `src/i18n.ts`: SVG full-route and live racer maps; locale detection, the saved choice, `t()` and the English/繁體中文 track names; `src/locales/` holds the catalogs.
- `scripts/capture-og-images.mjs`: captures the English and zh-TW cover images and the zh-TW README screenshots from the real app.
- `scripts/pickup-economy.mjs`: a scripted bot drives every track and prints NITRO per minute, BOOST share, fuel run-outs and the first NITRO time; `tests/pickup-economy.test.js` locks the ring/pickup layouts.
- `scripts/ring-variety.mjs`: over re-rolled race seeds, prints each track's ring lane spread, ground share, trains and rows per race, and the bot's ring take and NITRO rate; `tests/ring-variety.test.js` keeps every lane in use without making rings harder to collect.
- `scripts/rival-balance.mjs`: an expert bot (BOOSTs, flies for rings) and a beginner bot (neither) race an AI field across tracks and difficulties; prints the fastest rival's margin and the bot's place.
- `scripts/ci-shards.mjs`: `plan` gives each CI shard its Playwright `--test-list`, packing tests by duration so every shard finishes at about the same time; `refresh <run-id>` rewrites `tests/ci-durations.json` from a CI run's logs after the suites change a lot.
- `src/App.vue`, `src/icons.ts`: the Vue 3 UI shell (start screen, HUD, panels, touch controls) and its shared SVG icons; shared panels use Vue components while the game loop updates the in-race HUD directly.
- `src/main.js`, `src/style.css`: mounts `App.vue`, wires the screen controllers and runs the race lifecycle (start, pause, restart, results) and the frame loop.
- `src/*-ui.ts`: one TypeScript controller per screen area (race selection, cloud save, touch controls, key map, VFX, audio, history dialog, photo mode).
- `src/race-hud.ts`, `src/race-hud-modes.ts`: the in-race HUD, written imperatively each HUD tick.
- `src/race-results.ts`, `src/result-screen.ts`, `src/session-progress.ts`: recording a finished race (bests, unlocks, medals, ghosts) and showing its result screen.
- `vite.config.js`: Vite with `@vitejs/plugin-vue`.
- `src/perf.ts`: frame-time percentiles for the `?perf` device-check readout.
- `src/audio.js`: synthesized sound effects and the looping music sequencer; songs live in `src/music-tracks.ts`, race-to-sound events in `src/race-audio-events.ts`.
- `src/audio-settings.ts`: reads saved music/sound on/off and volume from `localStorage`, and the mute-keeps-level rule for sliders.
- `tests/`: unit and browser behavior tests. `tests/module-size.test.js` keeps every source module at or below 400 lines (older large files have ceilings that only go down).
- `docs/design.md`, `docs/verification.md`: scope and verification evidence.
- `README.zh-TW.md`: Traditional Chinese translation of this file, kept current by `scripts/readme-zh.mjs` (`check`, `sync` to translate with `claude -p`, `stamp` after a hand edit). The `.githooks/pre-commit` hook regenerates it when a commit changes README.md (skip once with `SKIP_README_ZH=1`), and `.githooks/pre-push` runs `npm test` when pushed commits change `src/`, `tests/`, `scripts/` or `package.json`, then `npm run test:layout` when they touch the home screen (`index.html`, `src/App.vue`, `src/main.js`, `src/style.css`, `src/locales/`; skip once with `SKIP_LAYOUT_GATE=1`), and `.githooks/main-merge-guard` (run by `pre-merge-commit` and `pre-commit`) rejects merging any branch other than `develop` or `hotfix/*` into `main` (fast-forwards run no hook, so use `--no-ff`; skip once with `ALLOW_MAIN_MERGE=1`); `make` turns the hooks on with `git config core.hooksPath .githooks`. A Claude Code Stop hook in `.claude/settings.json` sends Claude back to update it if a turn edits README.md without doing so.

All vehicle/scenery geometry and effects are generated in code. Barlow Condensed is bundled under its SIL Open Font License in `public/fonts/OFL.txt`. Three.js, Vue, Vite and Playwright retain their respective package licenses.

Source: [weskao/skyline-rush](https://github.com/weskao/skyline-rush). Single-player racing across multiple courses with arcade physics. Browser verification covers desktop Chrome and emulated mobile viewports; iOS Safari has been checked in the iOS Simulator (portrait and landscape, Coast and Neon), but frame rate on physical phones has not been measured yet (use `?perf`, see Verify).
