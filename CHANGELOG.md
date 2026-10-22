## [0.15.1] - 2026-10-22

### 🚀 Features

- **race:** Add versioned race rules and validation with unit tests
- **race:** Wire configurable opponents, traffic and solo modes into simulation
- **history:** Isolate custom race and time trial results from career
- **ui:** Add bilingual race mode selector and custom rules panel
- **race:** Connect mode selection, controls and unranked results
- **race:** Add relaxed collision rule to custom and free modes
- **race:** Add TDD-backed multi-heat sprint series rules
- **ui:** Play multi-stage Custom sprints with aggregated timing

### 🐛 Bug Fixes

- **race:** Prevent practice rewards and polish solo session UX
- **ui:** Remove race placement in Free Drive and align browser checks
- **ui:** Put the downgrade notice away on panel open
- **i18n:** Name the 特效 panel in the zh-tw notice
- **ui:** Fade the flight director for phone callouts
- **ui:** Hide the flight director at once for callouts

### 💼 Other

- Integrate main 0.15.0 race modes into feature/race-modes-p0

### 📚 Documentation

- **todo:** Check verified P0 game mode and multi-stage milestones

### 🧪 Testing

- **ui:** Validate numeric stage selection through Custom race start
- **browser:** Pin the ci device profile in playwright
- **browser:** Match the 2x2 thumb cluster in nitro check
- **browser:** Run world tour showcase on dev server
- **browser:** Answer the music prompt before panels

### ⚙️ Miscellaneous Tasks

- Run full tests for race modes feature branch
## [0.15.0] - 2026-10-22

### 🚀 Features

- Introduce custom race, free drive and time attack modes
- Track solo records and race-specific ghost replays
- Start free driving instantly and capture mode screenshots in CI
- Show live Ghost gap and finish free-drive HUD
- Add five one-tap custom racing rule presets
- Add playable obstacle gauntlet and configurable free-drive traffic
- Add obstacle score HUD and focused mobile browser screenshot gate

### 🐛 Bug Fixes

- **ui:** Keep portrait minimap clear and lift zh notice label
- **ui:** Give the short-screen minimap a bottom-row HUD slot
- **ui:** Keep the altitude ladder below the route map on tall desktops
- Handle solo race rendering and cover mode UI with browser tests
- Show honest solo HUD and suppress campaign hints in practice
- Bind mode switching only to buttons, not the body
- **style:** Restore stylesheet truncated in 9ade5ef
- **ui:** Fit the desktop intro so the flight tip is whole
- **ui:** Size the short-screen map slot from the cluster

### 📚 Documentation

- **todo:** Plan new race modes, custom rules, hazards and power-ups
- **readme:** Recapture README screenshots
- **i18n:** Clarify detection order and zh-TW unit rules

### 🧪 Testing

- **i18n:** Cover audio panel and count road signs from catalog
- **i18n:** Fly for real and cover detection, rebind and zh HUD
- Specify new race modes before implementation
- Define clean time trials and interactive obstacle gauntlet
- **i18n:** Allow the Backspace key name in zh-TW
## [0.14.0] - 2026-10-21

### 🚀 Features

- **dev:** Preview remote feature branches locally
- **dev-feature:** [**breaking**] Accept positional branch names
- **world-tour:** Add once-per-race speed tunnels with nitro rewards
- **scene:** Author detailed procedural landmark silhouettes for five destinations
- **scene:** Compose distinct Taipei Tokyo alpine coastal cosmic scenery and boost gateways
- **vfx:** Align pickups and particles with 3D tracks and surface hyperdrive state
- **scene:** Add orbit details to cosmic planets and acceleration gates
- **vfx:** Add translucent Hyperdrive tunnel walls and camera HUD feedback
- **spiral:** Give Sky Spiral its own sky and music
- **world-tour:** Define 30 authored roadside assets and stable per-distance scenery chunks
- **world-tour:** Add five distinct tunnel architectures with dark alpine railroad bore
- **world-tour:** Replace looping placeholder roadside assets with persistent destination-specific scenery and tunnels
- **world-tour:** Reduce central glare, add soft alpine tunnel illumination and five minimap skins
- **world-tour:** Give each destination its own asphalt, road markings and natural roadside shoulders
- **terrain:** Sculpt seamless Alpine hillsides and coastal cliffs from absolute route distance
- **world-tour:** Stream continuous natural cliffs and mountains while disposing evicted terrain geometry
- **audio:** Play course music after race start
- **audio:** Scale effects and music buses by volume
- **ui:** Add volume sliders and mute all to audio panel
- **lighting:** Add restrained side-positioned practical street lamps to Taipei Tokyo and coast
- **sky:** Remove purple central cloud glare from Cosmic and tone down clouds per destination
- **scenery:** Bring Taipei Tokyo street furniture and storefronts close to the driving corridor
- **performance:** Choose first-launch graphics tier and show one-time bilingual downgrade notice
- **preview:** Stage Alpine and Cosmic cars and roadside scenery in visible road-relative hero views
- **i18n:** Add English and zh-TW UI with switch
- **i18n:** Add bilingual og and README screenshots
- **ui:** Preview locked tracks but block starting them
- **ui:** Refine language and shortcut controls
- **garage:** Add cobalt and obsidian paints
- **flight:** Refill flight charge from nitro rewards
- **flight:** Add charge feedback, warning and stats
- **hud:** Show glide recharge and gap charge warning

### 🐛 Bug Fixes

- **world-tour:** Keep landscape type visible to cached and per-frame scenery updates
- **world-tour:** Prevent mid-race WebGL crash from missing boost-tunnel sign material
- **scenery:** Align Alpine forest and coastal props to their actual sculpted ground height
- **world-tour:** Place forest vegetation and seaside details on continuous sculpted terrain
- **minimap:** Restore readable legacy track silhouettes and prominent Sky Spiral loop
- **ui:** Display readable minimaps for legacy tracks, including compact screens
- **showcase:** Restore flying car effects and matching home camera framing in Alpine and Cosmic
- **showcase:** Match classic camera eye height when Alpine/Cosmic vehicles hover
- **controls:** Move restart and assist keys off nitro

### 📚 Documentation

- **scene:** Document reference landmarks, boost mechanics and QA constraints
- Describe audio volume sliders and mute all
- **world-tour:** Record five distinct scenery systems, comfort budgets and direct branch workflow
- **showcase:** Enforce matching airborne home previews and camera parity for Alpine and Cosmic
- **i18n:** Document language support and detection
- **claude:** Split CLAUDE.md into path-scoped rules
- **readme:** Document new paint unlock thresholds
- **readme:** Document flight refill from nitro and glide
- **readme:** Document backspace, f2 and e/x keys
- **readme:** Document flight charge feedback and gap warning
- **readme:** Recapture zh-tw race results screenshot

### ⚡ Performance

- **world-tour:** Cache static road and instancing updates by 12-metre sector
- **world-tour:** Batch repeated static roadside meshes into detail-preserving GPU instances
- **docs:** Adapt GPU pixel budget, dispose batched buffers and mandate performance reviews

### 🎨 Styling

- **ui:** Distinguish locked track previews
- **controls:** Align thumb action buttons
- **hud:** Move phone route map below progress bar
- **hud:** Raise callout backdrop to the 0.45 opacity cap

### 🧪 Testing

- **scene:** Verify detailed landmarks and real boost gates on all five courses
- **boost:** Account for standard ground fuel regeneration
- **scene:** Count low-quality hoops separately from shared glass panels
- **regression:** Reproduce World Tour mid-race stalling and static mesh rebuild cost
- **webgl:** Probe all five courses at 25–94% progress including speed tunnels
- **webgl:** Sweep 180 consecutive animation frames across every speed tunnel
- **webgl:** Inspect scene graph to identify undefined materials behind render freezes
- **world-tour:** Verify distinct environments and seamless distance-anchored roadside scenery
- **world-tour:** Validate five tunnel identities and railroad tunnel lining
- **world-tour:** Assert comfortable road lighting, persistent scenery and seamless mountain chunk boundaries
- **world-tour:** Find actual named chunk props rather than unnamed child meshes
- **minimap:** Cover five legacy outlines, four live racers and small-screen visibility
- **preview:** Assert Alpine and Cosmic camera frames player plus rivals in Chrome WebGL
- **minimap:** Fix apostrophe in Sky Spiral overview regression name
- **startup:** Cover bilingual one-time graphics downgrade and saved manual VFX preference
- **device:** Cover Safari iOS missing memory hints and document four-platform quality support
- **showcase:** Verify real flying jets, camera scale and Alpine/Cosmic homepage screenshots
- **showcase:** Unlock Alpine and Cosmic before homepage screenshot selection
- **i18n:** Cover locale detection, switch and layouts
- **i18n:** Wait for music prompt before locale pick
- **controls:** Cover backspace, f2 and e/x bindings
- **hud:** Isolate flight HUD states from ring rewards

### ⚙️ Miscellaneous Tasks

- **world-tour:** Run tests and browser screenshots on direct feature-branch pushes
- **readme:** Capture english screenshots with zh-tw
## [0.13.0] - 2026-10-21

### 🚀 Features

- **track:** Add shared canonical route sampling for existing five tracks
- **ui:** Introduce shared course overview, live minimap and bilingual names
- **ui:** Add next-track button on results
- **track:** Register Taipei, Tokyo, alpine, coast and cosmic circuits
- **world:** Add shared 3D world-tour roads and landmark scenes
- **ui:** Confirm before leaving a race via logo
- **ui:** Draw dropdowns and toggles without os ui

### 🐛 Bug Fixes

- **hud:** Position course minimap away from progress and touch controls
- **world-tour:** Give the tour road normals so the scene renders
- **ui:** Fit route maps and language toggle into every layout
- **ui:** Keep the AIRFLOW bar, flight-mode label and gauges clear of the race HUD

### 🚜 Refactor

- **world:** Build every road ribbon through one lit-safe helper

### 📚 Documentation

- **design:** Specify World Tour tracks, live minimap, and track-name i18n
- **plan:** Detail TDD rollout for ten-track World Tour, minimap and i18n
- Describe World Tour tracks, route maps and track-name toggle

### 🧪 Testing

- **red:** Describe shared public main-route geometry
- **map:** Correct coordinate format assertion
- **browser:** Cover five new 3D courses, route maps and locale selection
- **visual:** Capture actual desktop and mobile WebGL course screenshots
- **browser:** Write artifact screenshots only on demand
- **browser:** Check lit World Tour frames and keep captures out of artifacts/
- **browser:** Weave for the first close pass instead of betting on one nudge

### ⚙️ Miscellaneous Tasks

- **visual:** Upload actual browser-captured world-tour screenshots
## [0.12.4] - 2026-10-21

### 🧪 Testing

- **ui:** Crop bottom edge from a full viewport capture
## [0.12.3] - 2026-10-20

### 🐛 Bug Fixes

- **ui:** Match root background to the scene's bottom edge
## [0.12.2] - 2026-10-20

### 🐛 Bug Fixes

- **ui:** Keep leaderboard clear of position stat on short landscape phones

### 🧪 Testing

- **ui:** Force the place-change arrow on when measuring HUD overlap

### ⚙️ Miscellaneous Tasks

- Remove build step from test job
## [0.12.1] - 2026-10-20

### 🐛 Bug Fixes

- **ci:** Pass --base to vite build so Pages assets resolve under /skyline-rush/

### ⚙️ Miscellaneous Tasks

- **pages:** Verify asset paths before and after deploy
## [0.12.0] - 2026-10-20

### 🚀 Features

- **perf:** Add ?perf frame-time readout
- **dev:** Add compile-time local all-unlocked testing mode
- **track:** Introduce shared 3D Sky Spiral centreline geometry
- **track:** Render curved elevated Sky Spiral road and neon skyline
- **track:** Integrate playable Sky Spiral road into game and renderer
- **track:** Integrate playable Sky Spiral road into game and renderer
- **track:** Integrate playable Sky Spiral road into game and renderer
- **track:** Integrate playable Sky Spiral road into game and renderer

### 🐛 Bug Fixes

- **pwa:** Full-bleed scene, tappable chrome
- **track:** Preserve shortcut rules and airborne launch across sky gaps
- **track:** Preserve shortcut rules and airborne launch across sky gaps

### 📚 Documentation

- Document ?perf device check
- **claude:** Document local unlocked testing and release security boundaries
- **artifacts:** Refresh gameplay screenshots
- **track:** Document Sky Spiral and add track preview palette
- **track:** Document Sky Spiral and add track preview palette
- **track:** Document Sky Spiral and add track preview palette
- **track:** Describe Sky Spiral in Traditional Chinese

### 🧪 Testing

- **browser:** Wait for calm boost before rear light check
- **track:** Cover Sky Spiral helix frames, gaps and ramp physics
## [0.11.1] - 2026-10-20

### 🐛 Bug Fixes

- **motion:** Detect calm mode transitions

### 📚 Documentation

- **media:** Refresh gameplay screenshots

### 🧪 Testing

- **browser:** Stabilize ci animation timing
- **browser:** Isolate drift and clock setup
## [0.11.0] - 2026-10-20

### 🚀 Features

- **ui:** Animate race flow and touch controls
- **ui:** Add garage and progression surfaces
- **progression:** Add medal, paint unlock, ghost trace and daily challenge rules
- **ui:** Connect ghost replay, daily challenge, medals and paint equip
- **gameplay:** Add air tricks and shortcut corridors
- **ui:** Show barrel rolls and trick landings
- **ui:** Render shortcut corridors and their hud
- **vfx:** Add continuous animated rear led bar
- **pwa:** Add rounded app icons

### 🐛 Bug Fixes

- **ui:** Prevent responsive start screen overlaps
- **ui:** Keep compact hud and actions clear
- **ui:** Show nitro during air dash
- **ui:** Fit short landscape phone layouts

### 📚 Documentation

- Define ui handoff and defer gamepad work
- Record ui acceptance and handoff
- Record gameplay follow-up and retire HANDOFF.md
- Mark gamepad work as lowest priority
- Split remaining todo into logic and ui halves
- Close air tricks and shortcuts
- **readme:** Add synced traditional chinese guide
- **media:** Refresh gameplay screenshots

### 🧪 Testing

- **ui:** Keep ring pilot on page frames
- **browser:** Cover the air dash nitro label
## [0.10.0] - 2026-10-20

### 🚀 Features

- **ui:** Reload page from start screen wordmark

### 🐛 Bug Fixes

- **ui:** Shrink race callout so it clears the view
- **ui:** Keep race callout clear of progress bar
- **vfx:** Clamp shader power bases

### 🎨 Styling

- **history:** Polish history panel

### 🧪 Testing

- **browser:** Add track render probe

### ⚙️ Miscellaneous Tasks

- **artifacts:** Refresh gameplay captures
## [0.9.0] - 2026-10-19

### 🚀 Features

- **ui:** Lead start screen with game wordmark

### ⚙️ Miscellaneous Tasks

- **artifacts:** Refresh screenshots after start screen
## [0.8.1] - 2026-10-19

### 🧪 Testing

- Stabilize motion browser checks
## [0.8.0] - 2026-10-19

### 🚀 Features

- **hud:** Add motion timings and event callouts

### 📚 Documentation

- Record HUD motion and callout work

### 🧪 Testing

- **browser:** Stabilize fuel and nitro checks on slow ci

### ⚙️ Miscellaneous Tasks

- Shard browser tests and cancel superseded runs
- **seo:** Use start screen as og image
- Keep pushes from cancelling manual deploys
- **artifacts:** Refresh screenshots after HUD work
## [0.7.1] - 2026-10-19

### 💼 Other

- **make:** Adopt dev/run/deploy makefile layout

### 🚜 Refactor

- **ui:** Render the static ui shell with vue

### 📚 Documentation

- Describe vue + vite structure

### ⚙️ Miscellaneous Tasks

- Refresh screenshots from vue browser run
## [0.7.0] - 2026-10-19

### 🚀 Features

- Show release version on the ready screen
- Add track visuals, style score and history

### 📚 Documentation

- Document gameplay depth and verification

### ⚙️ Miscellaneous Tasks

- Refresh screenshots and depth artifacts
## [0.6.0] - 2026-10-19

### 🚀 Features

- Add expanded driving controls and feedback
## [0.5.0] - 2026-10-19

### 🚀 Features

- **game:** Cap FLY+BOOST air dash fuel drain at 22/s
- **game:** Analog steering ramp, 9 m/s lateral cap and lane assist
- **game:** Barrier scrape for shallow-angle guardrail touches
- **game:** Narrow vehicle collision width 1.9 -> 1.7
- **game:** Takeoff buffer and glide
- **controls:** Remappable key map with J/K/L and E alternates
- **game:** Data-driven tracks, special sections and seeded rng
- **game:** Nitro charges, seeded pickups and 3-charge cap
- **game:** Drift builds nitro and a mini boost on release
- **game:** Seeded rings with rewards, perfect lines and mystery effects
- **history:** Per-race history, per-track best, career stats
- **game:** Save history and per-track best when a race finishes
- **controls:** Move touch brake under the steering buttons (left thumb)
- **game:** Slipstream nitro bonus and rival nitro personalities with rubber-banding
- **game:** Final sprint tempo ramp and rival gaps in the last 500 m

### 🐛 Bug Fixes

- **game:** Address review of control-feel changes
- **controls:** Guard blocked localStorage and invalid keys in key map
- **game:** No free risk rings in tunnels; note ring hit-test shortcut

### 📚 Documentation

- **todo:** Tick completed items
- Add HANDOFF and refresh README
- Correct uphill and pickup notes, add verifier findings to HANDOFF
## [0.4.0] - 2026-10-19

### 🚀 Features

- **controls:** Add configurable touch controls

### 📚 Documentation

- Add gameplay depth design todo
## [0.3.1] - 2026-10-18

### 📚 Documentation

- Refresh gameplay screenshots
- Refresh screenshots as compressed jpeg
- Refresh screenshots at full resolution
- Refresh README assets

### 🧪 Testing

- Dismiss music prompt before settings clicks

### ⚙️ Miscellaneous Tasks

- **pages:** Publish releases to github pages
- Use mesa for linux browser rendering
- Reduce pixel load on software rendering
- Scale browser test timeouts for software rendering
## [0.3.0] - 2026-10-18

### 🚀 Features

- **mobile:** Improve touch controls
## [0.2.0] - 2026-10-18

### 🚀 Features

- **cars:** Give each racer a distinct design
- **audio:** Autoplay intro music or ask on load
- **seo:** Add open graph preview with cover image
- Add lift wake and downwash effects
- Add airflow telemetry and nitro vfx

### 🐛 Bug Fixes

- Restore keyboard driving after vfx focus
- **vfx:** Refine downward cold-gas airflow

### 📚 Documentation

- Refresh readme hero and car screenshots
- **readme:** Describe music autoplay and prompt
- **readme:** Add mobile and results screenshots
- Update hero placement and track vfx status

### ⚙️ Miscellaneous Tasks

- **artifacts:** Convert screenshots to jpeg
- [**breaking**] Deploy to netlify only on version tag push
- **artifacts:** Refresh jpeg screenshots
- Refresh gameplay artwork assets
- Refresh gameplay artwork assets
- Refresh gameplay artwork assets
## [0.1.0] - 2026-10-18

### 🚀 Features

- Implement 3d cyberpunk skyline flight runner
- Polish immersive race experience

### 💼 Other

- Initialize project config and build scripts

### 📚 Documentation

- Add product specs design docs and artifacts

### 🧪 Testing

- Add unit and browser test coverage

### ⚙️ Miscellaneous Tasks

- Add gitignore rules
- Add Netlify deploy pipeline via GitHub Actions
