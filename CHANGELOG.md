## [0.27.0] - 2026-10-30

### 🚀 Features

- **release-notes:** Show the coming release's notes as Upcoming before it has a version
- **release-notes:** Tap a What's New picture or clip to see it whole

### 🐛 Bug Fixes

- **free-drive:** Finish the run at the road end
- **loop:** Request the next frame before running this one

### 🚜 Refactor

- **ui:** Close every panel with one shared round × button

### 📚 Documentation

- **release:** Write the coming release's notes without a version number
- **release:** Note picture formats and the enlarged view
- **readme:** Free drive now ends at the road end
- **rules:** Keep the frame loop alive after a throwing frame
- **release:** Review 0.27.0 notes
- **release:** Add the no-freeze fix to 0.27.0 notes
- **release:** Review 0.27.0 notes again

### 🧪 Testing

- **finish:** Reproduce frozen results after a failing frame (RED)
- **release-notes:** Keep the no-entry check independent of the Upcoming entry
- **release-notes:** Follow Upcoming notes in browser specs

### ⚙️ Miscellaneous Tasks

- **gitignore:** Ignore browser-spec screenshot output
## [0.26.0] - 2026-10-30

### 🚀 Features

- **release-notes:** List new highlights first
- **release-notes:** Cache the what's new clip
- **phase5:** Cached Alpine/Cosmic grade cues; keep World Tour size ratchet
- **phase5:** GREEN distinct asphalt finish for five World Tour tracks
- **perf:** Typed comparable all-track WebGL evidence and software baseline
- **cup:** Recover interrupted championship sessions
- **custom:** Checkpoint Ghost replay and cosmetic race presets
- **items:** Add explicit practice rules and activation feedback
- **items:** Add bounded bonus gates and nearby EMP pulse
- **custom:** Add snowfall and aurora sky presets where they suit the track
- **audio:** Give item use and cooldown-ready their own cues
- **items:** Make a shield-blocked hit visible and audible
- **effects:** Beam a light column over rings that grant a held item
- **effects:** Show the magnet's pickup radius around the car
- **event-lab:** Add validated local course editor and playable drafts
- **event-lab:** Place timed checkpoints and keep two lanes reachable
- **event-lab:** Preview collisions and snap map taps to lanes
- **env:** Add typed object catalog and bounded hazard schema
- **event-lab:** Place cones with catalog-sized contact
- **env:** Add ramp launch type with ground-fixed placement bounds
- **event-lab:** Place jump ramps that share the Sky Spiral launch
- **event-lab:** Add a jumps template with ramps and cones
- **endless:** Stream bounded Coast survival and longest-distance records
- **circuit:** Add genuine laps with validated sectors and permanent lap records
- Track continuous stunt flight and aerial chains
- Award five isolated personal challenge medals
- Show personal medals and preserve local backup and account lifecycle
- **world-tour:** Add non-colliding roadside detail sets
- **world-tour:** Add one moving background piece per World Tour road
- **classic:** Add billboards, service vans and spectator stands
- **env:** Add deterministic hazard behaviours
- **themes:** Add opt-in themed track hazards, starting with Coast cargo and shoulder closures
- **env:** Drive authored hazards through ENV-04 frames and effects
- **env:** Enforce fair hazard courses and warn in time at full NITRO
- **themes:** Add Neon, Canyon, Aurora and Sky Spiral themed hazards
- **themes:** Bring classic themes to life with gusts, ice, rockfall and timed gates
- **render:** Give each hazard effect its own pooled colour and shape
- **themes:** Add Taipei festival barricades and boulevard closures
- **themes:** Add Tokyo traffic-control gates and neon roadworks
- **themes:** Add Alpine snow drifts and avalanche debris
- **themes:** Add Coastal bridge works and sea-wall repairs
- **themes:** Add Cosmic asteroid fragments and energy barriers
- **themes:** Time Tokyo's signal gates and sweep Cosmic's energy barriers
- **themes:** Add Coastal wave-spray gusts and Alpine avalanche falls
- **rules:** Scale risk-line rewards and let practice switch them off
- **ui:** Add a practice switch for high rings and close-pass bonus
- **gauntlet:** Build a seeded mixed obstacle course
- **gauntlet:** Race the mixed obstacle course with layout:'mixed'
- **ui:** Choose the Gauntlet course: Barriers or Mixed obstacles
- **render:** Give ice and rough ground a colour-independent stripe cue
- **themes:** Canyon launch ramps over broken bridges and Sky Spiral light hoops
- **themes:** Add Aurora's timed blizzard stretches
- **perf:** VIEWPORT=desktop runs make perf and make perf-modes at 1440x900
- **hazards:** Draw, place and score safe/risky branch markers
- **themes:** Slide Neon roadworks barriers between lanes on a slower beat than the gates
- **scenery:** Add coastline spray and blinking skyline beacons to World Tour details
- **hud:** Name the hazard ahead in its warning: barrier, crosswind, low grip or ramp
- **setup:** Add mode-first rules summary, eligibility and conflict rules
- **setup:** Put mode first, then track, then a rules row with Restore defaults before Start
- **setup:** Explain fixed-rule modes and prove eligibility claims
- **themes:** Add Cosmic low-gravity sectors and aerial gate sequences (11B)
- **fps:** Add measured-refresh 90/120 caps and conservative Auto promotion

### 🐛 Bug Fixes

- **phase5:** Align World Tour tunnel shells across scenery chunks
- **phase5:** Render grade cues without modifying protected CSS baseline
- **phase5:** Preserve approved UI stylesheet snapshot
- **phase5:** GREEN anchor Coastal Horizon water to world sea level
- **perf:** Preserve sorting, shadows and layers in static instancing
- **ci:** Keep responsive layout in Browser shard and protect workflow structure
- **ci:** Skip ten-track artifact gate for focused refactor jobs
- **photo:** Hide background chrome in studio
- **photo:** Keep controls clear of car and insets
- **ui:** Wrap result metrics within the results panel
- **showcase:** Aim every camera view from its own side
- **showcase:** Orbit on a steady circle centred on the car
- **ui:** Keep phone AIRFLOW telemetry above the showcase car
- **showcase:** Frame every home camera angle fully
- Relabel cached airflow values synchronously on language changes
- **cup:** Clear recovery checkpoints with game progress
- **results:** Settle each finished race once
- **env:** Size catalog hitboxes to drawn footprints and anchor rings at centre
- **audio:** Play gate cues for Event Lab checkpoints
- **endless:** Retain nearby moving traffic across chunk boundaries
- **integration:** Resolve the stylesheet pin left conflicted by the endless-bounds merge
- **circuit:** Expose saved Ghosts in History
- Frame the Harbor beacon in portrait showcase
- Preserve session personal medals before account switching
- Wait for reactive History rows before shortcut scrolling
- **themes:** Sweep Cosmic energy barriers between lanes so each opens
- **integration:** Drop the duplicate updateSkyline import that broke the build
- **world:** Drop the duplicate updateSkyline import the integration merge left
- **hud:** Skip the near-miss callout for close obstacle passes
- **ghost:** Sample at exact 10 Hz race time so ramp jumps replay their arc
- **hud:** Keep the phone route map and landscape mode indicator below a grown progress bar
- **scenery:** Raise the coastline spray plumes so they read from the road
- **world:** Lay the car's ground shadow on banked and sloped roads
- **visuals:** A photo taken in an Aurora blizzard no longer leaves the fog doubled
- **world:** Draw Sky Spiral rings and pickups on the helix (1625)
- **world:** Drop the duplicate skyline import that broke the production build
- **setup:** Keep the mode-first start screen above the fold on 900px desktops
- **setup:** Keep 10A start screen within width and type minimums
- **setup:** Keep the start screen clear of a landscape notch
- **setup:** Remember the raced mode when returning home
- **hazards:** Gusts push to the real road edge; hazard drawing reuses one pose
- **setup:** Rules-row dropdowns open above the Start row
- **ui:** Enter opens the leave prompt from the brand link; narrow phones keep a way out while paused
- **input:** Let Enter and Space open a focused panel summary
- **photo:** Restore the paused UI in the frame the studio closes
- **hud:** Keep race hud blocks apart on every device
- **hud:** Space race hud on landscape phones and tablets
- **setup:** Pin Start on phones so mode-first setup fits
- **setup:** Keep rules dropdowns and scrolled controls clear of pinned start
- **audio:** Rebuild iOS suspended audio contexts
- **daily:** Preserve disabled-flight accessibility through HUD ticks; correct hidden-select locale test
- **showcase:** Keep camera controls clear of first-visit quality notice
- **ci:** Run required quality gate on fix branches
- **hud:** Keep the held-item slot on one row at ≤400 px

### 💼 Other

- **phase5:** Integrate latest main and preserve World Tour quality budget
- Integrate latest main into Cup recovery
- Integrate main and port Custom presentation to typed services
- Integrate latest main and adapt practice item controllers
- Origin/main race HUD spacing (266210c, f83b67e) into roadmap integration
- Photo-studio class/dialog guard f96ae4e (6a)
- Short-landscape pinned Start and safe areas ddb9a3f (17)
- Roadmap integration (sections 9-13: modes, hazards, items, photo, setup) into main
- IOS suspended audio context rebuild (feature/firebase-cloud-save 612f3f3)
- What's New announcement UX proposal (feature/release-announcement-spec)
- Cup session recovery bc5299b integration note (feature/cup-session-recovery)
- Custom race presentation bc5299b integration note (feature/custom-race-presentation)
- Record feature/genuine-circuit-laps as merged (its 10B acceptance check is already in main with the same 0f81af7 gate evidence)
- Record ci/showcase-camera-verification as merged (superseded)
- Run the required CI quality gate on fix/** branches (fix/ci-topbar-stacking)
- 90/120 Hz render pacing (feature/phase3-120fps-support)

### 🚜 Refactor

- **phase5:** Keep renderer below existing 453-line ratchet
- **phase5:** Respect legacy World Tour module-size ratchet
- **perf:** Respect legacy renderer line ceiling without weakening tests
- **perf:** Reuse GPU instance matrices and remove unused allocations
- **world:** Fold trackId and carBank declarations to keep merged ceiling
- **world:** Fold trackId and carBank declarations to keep merged ceiling
- **world:** Fold trackId and carBank declarations to keep merged ceiling
- **items:** Extract typed authored ring layout without behavior changes
- **world:** Fold trackId and carBank declarations to keep merged ceiling
- **world:** Hold ratcheted renderer ceiling after main integration
- **world:** Use the shared trackId/carBank fold for the renderer ceiling
- **world:** Hold ratcheted renderer ceiling after main integration
- **world:** Use the shared trackId/carBank fold for the renderer ceiling
- **engine:** Extract route data and vehicle modules
- **world:** Compact renderer state to stay under its size ceiling
- **sim:** Move player hazard crossings into hazard-race.ts
- **render:** Move pooled hazard drawing into hazard-render.ts
- **release:** Move pre-0.23 What's New entries into their own data module

### 📚 Documentation

- Add 90/120 fps option to todo
- **phase5:** Record World Tour TDD plan and compatibility gates
- **phase5:** Record scoped World Tour checklist and unverified gates
- Add rules for caching and repeated work
- **phase5:** Mark verified road-material and sea-level TDD stages complete
- **phase5:** Record full CI, WebGL evidence and Medium LOD RED/GREEN
- Enforce fidelity-preserving all-track rendering performance contract
- **phase5:** Reconcile 12 pending acceptance gates with executable evidence
- **todo:** Record branch progress and handoff
- **todo:** Record photo studio handoff state
- Record continuation review and verification state
- Record fixed main baseline and focused integration checks
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record final continuation verification
- **todo:** Record verified main integration
- **cup:** Record merged-main regression evidence and remaining gates
- **cup:** Mark verified standings recovery complete
- Record verified continuation gates and usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Preserve complete verified 0197547 baseline receipts
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record verified 0.25 local gate
- Record final continuation verification
- **todo:** Record verified main integration
- **custom:** Record full merged-browser evidence and pending gates
- Record merged local gate and verified feature usage
- Record verified continuation gates and usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Preserve complete verified 0197547 baseline receipts
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record verified 0.25 local gate
- Record final continuation verification
- **todo:** Record verified main integration
- Mark individually verified roadmap features complete
- Record verified continuation gates and usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Preserve complete verified 0197547 baseline receipts
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record verified 0.25 local gate
- Record final continuation verification
- **todo:** Record verified main integration
- Record verified continuation gates and usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Record main-integrated full local and visual verification
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record final continuation verification
- **todo:** Record verified main integration
- **todo:** Record Event Lab designer evidence and open gates
- Mark individually verified roadmap features complete
- Record merged local gate and verified feature usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Record main-integrated full local and visual verification
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record final continuation verification
- **todo:** Record verified main integration
- Record merged local gate and verified feature usage
- Record verified code gates and remaining acceptance
- Record fixed main baseline and focused integration checks
- Preserve complete verified 0197547 baseline receipts
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record final continuation verification
- **todo:** Record verified main integration
- Record continuation review and verification state
- Record fixed main baseline and focused integration checks
- Record requested 0.25 main integration and retained source
- Record main camera probe integration gates
- Record final continuation verification
- Record verified personal medals and roadmap progress
- **todo:** Record verified main integration
- **themes:** Document the new modes and guard Coast and landmark sightlines
- **todo:** Check MODE-02 and the 10B acceptance on their green branch gates
- **readme:** Restore heading spacing in the zh-TW guide
- **perf:** Record C5 new-content and 1792 desktop before/after evidence
- **perf:** Record the style-invalidation fix and desktop parity with main
- **todo:** Record mobile hud overlap evidence
- **todo:** Record round-2 mobile hud evidence
- **todo:** Check 41 roadmap items whose cited unit and browser evidence is green
- **todo:** Check the last 21 roadmap items on the green 8c3f7ee final gate
- Propose What's New announcement UX and release behavior
- **todo:** Track release announcement UX and TDD acceptance
- **todo:** Record the bc5299b integration gate for cup session recovery
- **todo:** Record the bc5299b integration gate for custom race presentation
- **todo:** Check 10B laps acceptance after the full local gate
- **release:** Review 0.26.0 notes

### ⚡ Performance

- **phase5:** GREEN distinct medium World Tour scenery budget
- **world-tour:** Reuse centreline samples in rebuild
- **world:** Create the touch media query once
- **history:** Parse saved ghosts once per ruleset
- **i18n:** Reuse date and number formatters
- **phase5:** Pass graphics tier through to World Tour detail plan
- **phase5:** GREEN medium decorative density with obstacle parity
- **phase5:** Pool identical static World Tour drawables across streamed chunks
- **classic:** Cache four classic road mesh and lane uploads across unchanged sectors
- Bound World Tour GPU pools to two 120m chunks to retain frustum culling
- **world-tour:** Draw fewer background stars on Medium and Low
- **hud:** Skip the per-frame callout getAnimations() style flush
- **css:** Scope Photo Studio hiding to a body class, not body:has()

### 🧪 Testing

- **phase5:** RED for absolute-distance World Tour tunnel continuity
- **phase5:** Inspect world-space tunnel coordinates without test-only metadata
- **phase5:** RED medium World Tour streaming-budget regression
- **phase5:** Capture WebGL World Tour across 4 viewport sizes and quality tiers
- **phase5:** RED cached uphill/downhill route cues on 3D World Tour maps
- **phase5:** Capture actual WebGL art evidence and lock road/physics parity
- **phase5:** Pass route DOM count to Playwright browser evaluate
- **phase5:** RED destination-specific World Tour road PBR with safe budgets
- **phase5:** RED sea-level stability across Coastal Horizon hills
- **phase5:** RED tier-specific Medium prop density preserving solid scenery
- **perf:** RED cross-chunk draw pooling and no per-frame reconstruction
- **perf:** Fix test module syntax to observe expected RED assertion
- **perf:** RED classic road upload gate with pixel-equivalent world transforms
- **perf:** Assert all classic mesh origins share visual parity using real centreline
- **perf:** RED spatially bounded cross-chunk GPU pools
- **perf:** RED machine-readable ten-track WebGL evidence and comparable budgets
- **perf:** RED preserve transparent sorting and shadow semantics across GPU batches
- **ci:** Validate all-35 evidence collection, missing snapshots and draw-call regression gate
- **ci:** RED avoid requiring absent WebGL artifacts in focused refactor verification
- **ci:** Inspect step-level condition immediately after download and verify steps
- **ci:** Scope full-regression assertions to each required job and evidence gate
- **photo:** Reproduce background hud leak
- **photo:** Catch car overlap and unsafe insets
- **ui:** Re-record stylesheet baseline for the Photo Studio panel
- Repair inherited regression gate assumptions
- **minimap:** Distinguish main route from approved Spiral annotations
- Isolate World Tour servers with the existing worktree port
- **showcase:** Probe real WebGL bearing for camera views
- **showcase:** Keep camera probe out of preview suite
- **showcase:** Orbit keeps a steady radius, rate and car spot
- **showcase:** Cover every map's six views, framing and occlusion
- Pin reviewed d71 main styles and lower renderer ceiling
- Record d71 main integration and preserve feature validation
- **ui:** Re-record stylesheet baseline after airflow and whats-new css
- Reproduce mixed-language airflow values before the next HUD tick
- Record d71 main integration and preserve feature validation
- Record d71 main integration and preserve feature validation
- Record d71 main integration and preserve feature validation
- **items:** Pin capped re-activation and bounded item effects
- **results:** Prove non-Classic finishes never touch Classic progress
- **session:** Replay every mode bit-for-bit and finish it on all ten courses
- Record d71 main integration and preserve feature validation
- **launch:** Guard the shared launch rule on every track and frame rate
- **launch:** Assert wheel clearance at the first grounded frame after a ramp
- **endless:** Approve finite-HUD hiding in the CSS contract
- **ui:** Cover settled bounded results on phones
- Record d71 main integration and preserve feature validation
- **circuit:** Pin reviewed Harbor map palette contract
- **ui:** Cover settled bounded results on phones
- Record d71 main integration and preserve feature validation
- **circuit:** Prove lap seams stay continuous and rivals need every lap
- **modes:** Teach the all-modes checks Endless Highway's own contract
- Record d71 main integration and preserve feature validation
- Define continuous flight and aerial chain medals telemetry
- Require isolated personal medals in race settlement
- Protect personal medals across local account and backup changes
- Cover personal medal backup transport and localized announcements
- Exercise personal medal settlement and controls on desktop and phones
- Target completed stunt timer and visible History controls
- Reproduce session-only medal loss during account switch
- **stunt:** Prove Stunt Attack sessions score the same at any frame rate or input device
- **modes:** Teach the all-modes checks Harbor Circuit's own contract
- **env:** Add 11A acceptance across every themed track
- **themes:** Add WebGL check that every themed track draws its hazards
- **results:** Keep Event Lab finishes off Classic progress and the cloud
- **env:** Pin hazard intensity to the modes that support it
- **env:** Scan the merged simulation modules for device reads too
- **env:** Capture every hazard effect in the real WebGL scene
- **themes:** Every themed placement lands in exactly one race list
- **perf:** Add make perf-modes for new-content frame time vs Classic
- **perf:** Select the mode button, not <body>'s mirrored attribute
- **perf:** Set rule selects the way the gauntlet spec does
- **hazard-captures:** Sample the gate after a frame renders and stop faking a finish
- **themes:** Capture every themed hazard type, ramp and hoop per track
- **event-lab:** Relaxed modifier softens barrier hits and is its own ruleset (1460)
- **themes:** Leave the race by pause and reload, not a forced finish with no result
- **modes:** Browser acceptance for 9A-9D, 9J endless bounds, 12A/12B items and 13C audit gaps
- **visuals:** Weak hardware draws a third of the weather overlay; hazard silhouettes never thin
- **items:** Reduced motion holds the item beam and magnet pulses steady
- **results:** A finish writes and awards once through pause, restart, exit, mode switch and dialogs (10C)
- **presets:** Rule presets and saved Custom setups leave unlocks, eligibility, controls and history untouched (10A)
- **setup:** Cover conflicts, focus, contrast, safe area and motion
- **ui:** Restore the 10A mode-first element order in the UI contract
- **hud:** Import createAnimationGate statically
- **themes:** Themed road sections never outgrow the roadside sign pool
- **themes,ui:** Pin Neon closures, Spiral antiphase hazards and the App.vue mode picker
- Guard unique item outlines and Career paint/achievement isolation
- A non-Classic finish with a Daily modifier leaves the Daily board alone (1538)
- **responsive:** Focus trap, focus return and the pause-menu End action at four sizes (1788)
- **setup:** Reach and toggle Comfort mode by every input
- **specs:** Locate mode tabs by their button; guard against bare [data-race-mode] locators
- **setup:** Locate the rules-row mode tabs by their button
- **photo:** Guard body.photo-studio against dialog [open] at every flip
- **ci:** Reproduce missing fix-branch quality gate trigger
- **fps:** Specify 90/120 Hz pacing and adaptive fallback (RED)
- **fps:** Cover high-refresh settings, persistence, and locale; document browser caps
- **fps:** Measure high-rate cadence after warm-up; track acceptance gates
- **ci:** Stop slow CPU WebGL frames failing photo and hazard specs
- **responsive:** Keep the Event Lab focus-trap walk within CI's frame budget
- **responsive:** Give the desktop Event Lab focus-trap walk room on CPU-only CI

### ⚙️ Miscellaneous Tasks

- **phase5:** Enforce layout verification and document CI/TDD evidence
- **perf:** Capture and validate structured ten-track WebGL budgets on exact HEAD
- **perf:** Preserve visual artifacts before layout and report before/after draw calls
- Run focused showcase and daily accessibility regressions
## [0.25.0] - 2026-10-28

### 🚀 Features

- **hud:** Add ios 18 switch-tick haptics

### 🐛 Bug Fixes

- **coast:** Restore warmer in-race lighting
- **whats-new:** Keep gradient bar above scrolled media
- **showcase:** Aim every camera view from its own side
- **showcase:** Orbit on a steady circle centred on the car
- **ui:** Keep phone AIRFLOW telemetry above the showcase car

### 🚜 Refactor

- **release-notes:** Move entries into release-notes-data

### 📚 Documentation

- **release:** Review 0.25.0 notes

### 🧪 Testing

- **showcase:** Probe real WebGL bearing for camera views
- **showcase:** Keep camera probe out of preview suite
- **showcase:** Orbit keeps a steady radius, rate and car spot
- **showcase:** Cover every map's six views, framing and occlusion
- **ui:** Re-record stylesheet baseline after airflow and whats-new css
- **showcase:** Run each map's camera checks as its own test

### ⚙️ Miscellaneous Tasks

- Shard world-tour-mid-race across six runners
## [0.24.0] - 2026-10-28

### 🚀 Features

- **types:** Enable checked JS contracts and compiler-backed TDD
- **vue:** Migrate garage presentation and paint selection to reactive Vue panel
- **vue:** Migrate guide device tabs and practice CTA to reactive Vue component
- **vue:** Render What's New tabs and highlights with Vue state
- **vue:** Move tutorial coach step presentation to Vue, keep frame progress direct
- **vue:** Migrate audio and control menu visibility to Vue-owned panels
- **types:** Make Vue 3 + strict TypeScript primary and replace JSDoc-first guidance
- **types:** Add strongly typed Vue application state implementations
- **vue:** Render race history and trend chart using strictly typed Vue state
- **vue:** Complete typed History mode, daily challenge and medal rendering
- **guide:** Add collectibles guide
- **tooling:** Add make perf, make perf-phone and make help
- **coast:** Stream grounded shoreline detail and tune art palette
- **coast:** Adapt visuals to main refactor, preserve render load and repair screenshot gate
- Extend controlled flight and reward clean NITRO air-to-road chains
- Announce clean landing flow through existing localized callouts
- Localize air-to-road chain feedback in English and Traditional Chinese
- **phase3:** Add typed render-only frame pacing and sustained Auto load control
- **phase3:** Pace Three.js drawing without skipping simulation
- **phase3:** Add accessible FPS selector to VFX panel
- **phase3:** Localize FPS controls in English and Traditional Chinese
- **phase3:** Scale existing Three.js render targets without changing quality presets
- **phase4:** Bounded themed skyline scenery and cached Sky Spiral elevation minimap
- **phase4:** Theme-specific matte road surfaces for first five tracks
- **phase4:** Tier-correct streamed scenery with neon signs, canyon strata and aurora snowcaps
- **phase4:** Cache all minimap outlines and mark Sky Spiral elevated heading
- **release-notes:** Play a short clip in what's new
- **flight:** Let boost earn the air-to-road chain
- **fx:** Spark burst and cue on chain landings

### 🐛 Bug Fixes

- **types:** Document HUD DOM node contracts for strict checkJs
- **garage:** Resolve locked progression module in browser and Node tests
- **types:** Inject browser-only dropdown helper to keep Node unit tests isolated
- **types:** Remove duplicate JS state and enforce pinned vue-tsc semantic check
- **types:** Pin TypeScript 5.9 for vue-tsc, avoid incompatible transient TS package
- **swipe:** Render live selected race instead of unbound race snapshot
- **types:** Install vue-tsc next to locked TS 5.9 to prevent TS 7 peer resolution
- **types:** Satisfy Vue SFC semantic checks with typed SVG and Booleanish bindings
- **types:** Keep history newest-first ordering within ES2022 lib
- **types:** Type daily challenge board rows to resolve strict callbacks
- **types:** Narrow swipe gesture state and guard against stale timers
- **bootstrap:** Restore History modal references after TypeScript extraction
- **test:** Scale History bootstrap regression timeouts for CI runners
- **ui:** Initialize History controller before first home render
- **types:** Narrow last swipe sample after minimum length guard
- **build:** Point WebGL photo capture to typed export utility
- **tests:** Keep production unlock regression on typed paint catalog
- **ui:** Align Vue Garage and History fallback state with main
- **test:** Locate next top-level CI job instead of nested steps
- **ui:** Use typed icon module from audio controls
- **types:** Preserve numeric route marker distances with readonly tuple inference
- **types:** Treat dynamically built locale catalogs as validated locale-keyed data
- **refactor:** Update all typed UI controllers to canonical i18n.ts
- **types:** Bind native Vue aria-expanded as Booleanish state
- **vue:** Correct eight stale relative imports to typed source paths
- **types:** Explicitly type checkpoint gate collection to prevent recursive inference
- **types:** Narrow readonly localization tuples and optional trick payouts
- **types:** Validate untrusted race request mode before indexing allowed options
- **test:** Verify removed JS duplicate, not the canonical TS source
- **types:** Define engine-facing free-drive config adapter for typed tutorial
- **tutorial:** Use canonical TS controller in Vue UI and verify JS removal
- **types:** Accept blocked local storage as nullable release preference store
- **garage:** Update typed production progression import
- **types:** Narrow input target and pointer types without changing controls
- **test:** Preserve read-only Event.target in synthetic keyboard regression
- **typecheck:** Pin official Three.js declarations for typed geometry in CI
- **refactor:** Resolve final release/history imports after TS migration
- **refactor:** Repair nested production access import and recursively test source paths
- **types:** Narrow Three.js light sentinel without changing warmup behavior
- **types:** Safely append instance meshes to typed batching groups
- **cloud:** GREEN keep failed avatar fallback stable across same URL refresh
- **ui:** Reserve space for home camera controls
- **ui:** Fade the phone intro's scroll edge above the footer
- **ui:** Hide mid-race VFX rows whose dropdown is unavailable
- **audio:** Show slider level live while dragging
- **ci:** Preserve Coast after captures before layout suite; log RED and merge evidence
- **phase3:** Accumulate elapsed VFX time across skipped draws; sample actual presents
- **phase3:** Show actual presented frame pacing in ?perf rather than rAF callback rate
- **phase3:** Recover i18n and module-size CI with typed FPS display modules
- **phase3:** Exercise visible FPS controls and preserve accessible technical terms
- **ui:** Keep tutorial coach clear of the tool row
- **ui:** Give compact touch controls a 44px tap
- **phase4:** Type cached route samples with canonical distance for elevated overlay
- **phase4:** Distinguish sampled distance-bearing routes from projected SVG markers
- **ui:** 44px taps in top-bar panels on touch

### 💼 Other

- Integrate main docs and media into Vue refactor branch
- Integrate current main into Coast visual benchmark branch
- Sync latest Phase 1 changes from main into Coast branch
- Integrate Phase 3 adaptive FPS with Phase 2 Coast visuals and profiling
- Sync latest main touch targets with Phase 4 map and scenery

### 🚜 Refactor

- **release:** Extract event-driven release notes controller from main
- **garage:** Extract dialog controller and testable presentation state
- **history:** Isolate history and daily-card rendering from game bootstrap
- **guide:** Extract onboarding modal controller from bootstrap
- **swipe:** Isolate preview pointer and trackpad lifecycle
- **audio:** Move audio controls and persistent settings into event controller
- **settings:** Extract audio and controls dropdown state management
- **tutorial:** Extract coach hint rendering into testable UI module
- **types:** Wire garage, guide, and release controllers to typed state
- **types:** Use typed tutorial and controls state across UI
- **vue:** Extract typed History panel preserving all cloud-save controls
- **types:** Move Guide and Controls event controllers to strict TypeScript
- **types:** Migrate Garage and Audio event controllers to strict TypeScript
- **types:** Move tutorial step renderer into strict TypeScript
- **types:** Migrate release notes dialog lifecycle and keyboard navigation to TypeScript
- **types:** Enforce History and daily UI data boundaries with TypeScript
- **types:** Migrate track swipe lifecycle to strict TypeScript and preserve gestures
- **types:** Move audio settings and new-build check to typed services
- **ui:** Move shared dropdown dismissal to typed, Node-safe TypeScript
- **ui:** Migrate accessible custom select controller to strict TypeScript
- **ui:** Migrate bilingual mobile guide catalog to native TypeScript
- **ui:** Migrate photo export and track swipe math to strict TypeScript
- **controls:** Validate persisted preferences with strict TypeScript
- **garage:** Type paint catalog while keeping styles and unlocks unchanged
- **services:** Type cloud profile and recent-race persistence without duplicate normalization
- **controls:** Type key binding and presentation state, share key-map copy logic
- Migrate VFX and device-quality settings to strict TypeScript
- Type race objective contracts without changing completion behavior
- Type versioned race session contract and preserve seeded streams
- **ui:** Type shared SVG icons and section sign contract without visual changes
- **ui:** Type minimap path and SVG updates with unchanged DOM rendering
- **input:** Type slide pad gesture state without changing steering math
- **i18n:** Type locale and translation state without changing catalogs or DOM behavior
- **vue:** Let Vue own panel aria-expanded from reactive state
- **stats:** Type practice telemetry and multi-stage sprint contracts
- **cup:** Type championship standings and preserve validated scoring
- **green:** Type active-item service and remove duplicate JS
- **modes:** Migrate elimination, checkpoint and stunt state machines to strict TypeScript
- **feedback:** Migrate race audio cues and UI callouts to typed event state
- **rules:** Type validated race config contracts and preserve legacy defaults
- **tutorial:** Type eight-step input controller while preserving real steering
- **ghost:** Type replay recording, storage validation and interpolation
- **i18n:** Type complete en/zh-TW catalogs without rewriting player-facing text
- **cloud:** Type Firebase account and transaction boundaries without changing Firestore behavior
- **release:** Type versioned announcements and retain existing localized content
- **access:** Type production and dev progression aliases without changing unlock behavior
- **input:** Type keyboard, pointer, slide and device tilt controller
- **types:** Remove duplicate legacy JSDoc game contract shadow
- **vue:** Add typed reactive start-screen status
- **vue:** Render daily card and medal badge through shared reactive state
- **vue:** Remove imperative start-screen status DOM ownership
- **types:** Isolate cloud sync status in strict TypeScript
- **cloud:** Delegate sync metadata to typed service without changing public API
- **vue:** Add single typed audio presentation state
- **audio:** Publish typed reactive presentation instead of rewriting Vue DOM
- **vue:** Bind audio controls and accessible values to Vue state
- **vue:** Centralize release opener unread and visibility state
- **vue:** Centralize release opener unread and visibility state
- **vue:** Centralize release opener unread and visibility state
- **vue:** Centralize release opener unread and visibility state
- **types:** Migrate seeded streams and frame stats to TypeScript
- **history:** Type career, daily-board and star projections without changing storage
- **cloud:** Migrate permanent rule-scoped best score merge to strict TypeScript
- **types:** Migrate deterministic Gauntlet hazards to strict TypeScript
- **types:** Migrate shared car and road geometry builders to TypeScript
- **types:** Migrate stable road-relative vehicle orientation to strict TypeScript
- **types:** Migrate AIRFLOW showcase and camera presets to strict TypeScript
- **cloud:** Type versioned cross-device progress merge and race deduplication
- **types:** Migrate account-isolated cloud local persistence to strict TypeScript
- **history:** Move Classic bests, medals, stars and paint to typed storage
- **history:** Migrate Ghost and Daily local persistence to strict TypeScript
- **types:** Complete typed History service and remove legacy JavaScript
- **types:** Migrate WebKit shader warmup to strict TypeScript
- **types:** Move Sky Spiral deterministic geometry and gap handling to strict TypeScript
- **types:** Preserve World Tour GPU scenery instancing with typed Mesh contracts
- **types:** Move ten-track centerlines and HUD minimap projection to strict TypeScript
- **hud:** GREEN migrate idempotent DOM setters to strict TypeScript
- **render:** GREEN type rear LED frame state without changing animation
- **cloud:** GREEN transfer profile avatar and identity DOM ownership to Vue
- **cloud:** GREEN move Cloud Save buttons and status into Vue view
- **guide:** Integrate typed collectibles guide
- **audio:** Split music data and cue detection
- **ui:** Move cloud save controller out of main.js
- **audio:** Wire audio controls inside audio-ui
- **ui:** Move key rebinding into keymap-ui
- **ui:** Move touch controls into touch-controls-ui
- **ui:** Move vfx, motion and quality notice out
- **ui:** Own session progress and ghosts in modules
- **results:** Move race settlement out of phaseUI
- **results:** Move result screens into result-screen
- **hud:** Move the in-race HUD into race-hud
- **ui:** Move race selection into race-select-ui
- **ui:** Move dialogs and page utilities out of main.js
- **game:** Extract typed race standings to restore module-size gate
- **phase4:** Unify classic road renderer with canonical path mapping

### 📚 Documentation

- **todo:** Mark typed locale service verified under focused TDD gate
- **todo:** Group verified Vue and TypeScript slices under correct steps
- **todo:** Record verified typed release notes migration
- **todo:** Mark verified input, release, access and single-source type migrations
- **todo:** Check off verified Vue-owned home status migration
- **todo:** Check off verified Cloud Sync types and Vue-owned audio panel
- **todo:** Check verified Vue release opener and run final parity [full-regression]
- **architecture:** Set strict typescript as ui default
- **readme:** Add clickable video posters
- **readme:** Add mobile screenshots and demo
- **readme:** Add direct links to demo videos
- **readme:** Embed demo videos as inline players
- Remove stale gameplay poster
- Remove embedded home-screen poster
- **todo:** Add tutorial trigger flow bug
- **todo:** Mark strict TypeScript RNG and performance migration verified
- **todo:** Check off typed career and daily statistics module
- **todo:** Record verified typed cloud best merge and test merged branch [full-regression]
- **todo:** Mark verified typed hazards service complete
- **todo:** Mark typed shared geometry verified and run full regression [full-regression]
- **todo:** Mark typed road-relative vehicle pose migration green
- **todo:** Check Vue refactor showcase TS module; full parity run [full-regression]
- **todo:** Mark verified typed cloud storage and classic achievements
- **todo:** Check off typed Ghost and Daily persistence
- **todo:** Complete typed shader warmup and run exact HEAD parity [full-regression]
- **todo:** Mark typed Sky Spiral path migration and focused TDD gate verified
- **todo:** Mark verified World Tour TypeScript GPU batching
- **todo:** Record typed ten-track road model and verify latest branch [full-regression]
- **refactor:** Account for verified Vue ownership and audit gates [full-regression]
- **refactor:** Close verified Vue UI ownership and record remaining physical gates [full-regression]
- **refactor:** Record verified local acceptance
- **refactor:** Record iOS simulator, WebKit and Android device evidence
- **refactor:** Record physical Android A/B and close Steps 1 and 5
- **refactor:** Record physical iPhone and audio check
- Record adaptive FPS request and player feedback for future discussion
- Outline gameplay, Coast art and adaptive FPS phases
- Record the main/audio module split
- Record full CI pass for the module split
- Plan Phase 1 flight and combo TDD checkpoints
- **phase3:** Track implementation, unverified CI and physical-device acceptance separately
- **phase4:** Prevent route, minimap and FPS regressions across future track edits
- **phase4:** Check completed visual/streaming improvements; keep pending evidence honest
- **todo:** Verify Phase 1-3 delivery, mark completed milestones and retain evidence gates
- **release:** Review 0.24.0 notes

### ⚡ Performance

- **hud:** Cache DOM updates and avoid unchanged visibility/text setters
- **hud:** Skip steady flight/score/leaderboard text updates
- **phase4:** Stream Sky Spiral road buffers by sector, translate geometry per frame

### 🧪 Testing

- **refactor:** Define HUD idempotence regressions before implementation
- **types:** Add compiler-backed RED checks for shared game contracts
- **refactor:** RED release-notes keyboard behavior before extraction
- **refactor:** RED garage presentation contracts before extraction
- **refactor:** RED history trend data projection before UI extraction
- **refactor:** RED guide choice and completed-practice labels
- **refactor:** RED track swipe pointer-capture safety contract
- **refactor:** RED audio slider and mute presentation contracts
- **refactor:** RED settings panel phase gate
- **vue:** RED reactive garage presentation ownership
- **vue:** RED guide device tabs and practice CTA state
- **vue:** RED release notes reactive tabs and highlight projection
- **refactor:** RED tutorial input hints across touch control modes
- **vue:** RED tutorial coach step and visibility state
- **vue:** RED dropdown reactive open and close state
- **types:** RED Vue 3 TypeScript-first migration contracts
- **types:** RED native TypeScript UI state and Vue template semantic checking
- **types:** Exercise native typed Vue state in Node regressions
- **swipe:** RED regression for undeclared preview race snapshot
- **vue:** RED History panel extraction preserves cloud-save and accessibility selectors
- **types:** RED Guide and Controls typed controller migration
- **history:** RED typed Vue history projections for untrusted saved progress
- **history:** RED Vue ownership for mode records, daily board and medals
- **types:** RED Garage and Audio native TypeScript migration
- **types:** RED typed Tutorial coach step renderer
- **types:** RED release-note event controller migration
- **types:** RED typed History and challenge controller boundary
- **types:** RED typed swipe controller and single source of truth
- **types:** Keep History ownership regression pointed at migrated TS renderer
- **types:** RED typed audio preferences and update service ownership
- **bootstrap:** Protect History extraction from unbound modal refs (RED)
- **bootstrap:** Prevent release announcement modal from masking Start regression
- **ui:** RED typed dropdown outside-click behavior without browser globals
- **ui:** RED typed custom select import with no browser globals
- **ui:** RED bilingual mobile guide TypeScript catalog migration
- **ui:** RED migration contract for typed photo and swipe utilities
- **controls:** RED persisted control state parity before TypeScript migration
- **garage:** RED typed paint catalog must preserve unlocks and appearance
- **start:** Protect first-visit game start on desktop and mobile
- **ui:** Lock main DOM/CSS parity and record verified TypeScript groundwork
- **ui:** RED main-branch Garage and History initial presentation parity
- **refactor:** RED TypeScript contracts for cloud profile and recent races
- **refactor:** RED existing presentation and keymap behavior against typed modules
- **ci:** RED focused refactor verification with explicit full final gate
- **refactor:** RED VFX presets and device-quality TypeScript migration parity
- Require typed race objectives and unchanged completion contracts (RED)
- Require strict typed session contract with stable seed identity (RED)
- **refactor:** RED visual icon and track sign contracts before strict TypeScript migration
- **ui:** RED typed minimap contract; record verified icon and sign migration
- **controls:** RED typed slide-pad contract; record verified minimap migration
- **locale:** RED typed locale parity; mark verified slide-pad migration
- **ui:** RED Vue-owned aria-expanded follows shared panel state
- **refactor:** RED typed practice/sprint contracts; record Vue panel ownership verification
- **refactor:** RED source import path audit; record typed practice and sprint acceptance
- **cup:** RED typed championship progression and immutable standings
- **red:** Require typed active-item service without legacy duplicate
- **modes:** RED strict TS migration contracts for elimination, checkpoint and stunt
- **feedback:** RED typed callouts/audio contracts and record verified mode migration
- **rules:** RED strict typed race-config boundary and record verified feedback services
- **tutorial:** RED typed tutorial controller and record verified race-config migration
- **ghost:** RED typed ghost playback contract and record verified tutorial migration
- **locale:** RED canonical typed catalogs and record verified Ghost migration
- **cloud:** RED typed Firebase boundary and record verified localized catalogs
- **release:** RED typed versioned announcements preserve localization and release order
- **access:** RED typed progression-alias contract for production and local dev
- **input:** RED typed event-driven keyboard lifecycle contract
- **types:** RED reject duplicate JSDoc shadow of canonical TypeScript game contracts
- **red:** Require Vue ownership for start-screen daily and medal status
- **red:** Require typed cloud-sync metadata service without legacy duplication
- **red:** Audio settings panel must own switch and volume presentation in Vue
- **red:** Allow explicit exact-commit full regression on refactor push
- **red:** Release opener has one Vue-owned unread and visibility state
- **red:** Require one strict TypeScript source for seeded streams and performance stats
- **red:** Require single strict TS career/daily/stars projection service
- **red:** Require typed permanent rule-scoped score merge without JS duplication
- **red:** Require strict typed hazards service with stable deterministic output
- **red:** Require typed shared road and vehicle geometry factory
- **red:** Require strictly typed road-relative vehicle pose without shadow JS
- **red:** Require single typed showroom cameras and AIRFLOW previews
- **red:** Require typed cloud progress schema and run-merging ownership
- **red:** Require typed account-isolated local cloud persistence
- **refactor:** Point cloud migration contracts at TypeScript source and repair syntax
- **red:** Require typed history achievements and paint persistence
- **red:** Require typed Ghost and Daily history with existing storage contracts
- **red:** Require strict TypeScript entry for Classic and Mode history
- **red:** Require typed shader warmup preserving hidden-light state
- **red:** Require typed Sky Spiral world path and unchanged frame geometry
- **red:** Require typed GPU instancing while preserving exact scenery transforms
- **red:** Require typed ten-track road and map projections without legacy duplication
- **refactor:** RED require typed HUD DOM utility
- **refactor:** RED type-safe rear-light animation parity
- **refactor:** Capture desktop/mobile frame percentiles and audit TS/Vue ownership [full-regression]
- **refactor:** RED cloud profile presentation must be Vue-owned
- **cloud:** Exercise Vue-driven avatar fallback on image error
- **refactor:** RED require Vue-owned Cloud Save status and button presentation
- **cloud:** RED preserve avatar fallback across profile refresh
- **ui:** Record corrected camera layout baseline
- **ui:** Record the phone intro scroll-edge stylesheet baseline
- **coast:** Define visual benchmark and real-WebGL RED evidence
- **ci:** Retain real Coast WebGL captures and track unverified gates
- **arch:** Ratchet source modules to 400 lines
- **arch:** Fail legacy js guard on syntax errors
- **coast:** RED coverage for typed palette extraction and perf load samples
- **red:** Define Phase 1 flight endurance and clean landing chain behavior
- Align existing FLY and AIR DASH regression values with Phase 1
- Isolate exhaustion from pickups and update shortcut flight fuel contract
- **coast:** Capture same-sha main BEFORE and Phase 2 AFTER, require visual gate
- **red:** Preserve rank and live-gap readers during game module split
- **phase3:** Add RED coverage for frame pacing, Auto adaptation and simulation isolation
- **phase3:** Exercise saved FPS choices, locale parity and invalid migration in browser
- **phase3:** Prove full game simulation state identical at 30 and 60 rendered FPS
- **phase4:** RED contracts for first-five scenery and elevated spiral minimap
- **phase4:** RED assert road/minimap share one classic centreline
- **phase4:** RED contracts for readable asphalt and Sky Spiral surface
- **phase4:** Cover first-five showcases, live minimaps and 30 FPS across viewports
- **phase4:** RED contiguous scenery LOD coverage and low-cost streaming regressions
- **phase4:** RED spiral overpass direction chevron follows canonical route
- **phase4:** Assert cached overpass direction on home and in-race maps
- **phase4:** RED Sky Spiral road mesh upload reuse and camera-relative parity
- **phase4:** Reference the actual Sky Spiral scene graph in RED coverage
- **perf:** Expect present-to-present timing in the ?perf overlay
- **phase4:** Scale the first-five browser timeout by the CI factor
- **ui:** Pin main UI contract to the current stylesheet
- **minimap:** Count the main route line and still forbid extra routes

### ⚙️ Miscellaneous Tasks

- **types:** Gate unit workflow on strict TS and Vue SFC semantic checks
- **refactor:** Focus intermediate typecheck/unit/cloud, reserve full final regression
- **refactor:** Run exact-HEAD Browser World Tour and layout [full-regression]
- **artifacts:** Add compressed demo videos
- **whats-new:** Add 0.24.0 air road chain clips
- **whats-new:** Re-record 0.24.0 chain clips with BOOST and spark burst
## [0.23.0] - 2026-10-25

### 🚀 Features

- **dev:** Add phone server menu command

### 🐛 Bug Fixes

- **cup:** Validate completed stage snapshots before adding or scoring heats (GREEN)
- **cup:** Validate state for completion and total-time views (GREEN)
- Coordinate showroom camera and Start safe-area spacing
- Auto-frame complete showroom vehicle at every track and viewport
- **home:** Tie Start height to the camera dock budget so they never overlap
- **showcase:** Keep whole car and landmark in frame on portrait and tall landmarks

### 📚 Documentation

- **todo:** Track non-Firebase feature work and pending verification gates
- **todo:** Record upstream merge and further HUD test-first changes with verification pending
- **todo:** Define Cup safety stop point before planned Vue TypeScript refactor
- Require responsive spacing regressions for ready controls
- **release:** Require rich telegram announcements
- Require whole-vehicle viewport framing for every future track
- Require whole-vehicle viewport framing for every future track
- **readme:** Add home screen and gameplay videos
- **release:** Review 0.23.0 notes
- **release:** Review 0.23.0 notes

### ⚡ Performance

- **hud:** Cache per-frame element references and avoid repeated static writes
- **hud:** Avoid redundant updates of stable race labels

### 🧪 Testing

- **hud:** Reproduce per-frame DOM lookup and redundant text writes (RED)
- **hud:** Require zero redundant stable race status writes (RED candidate)
- **cup:** RED for corrupted intermediate Cup standings and heat recovery
- **cup:** RED for corrupt completion and aggregate time projections
- Expose showroom camera and Start overlap across viewports
- Assert full home-showcase car silhouette stays in frame across tracks and viewports
## [0.22.1] - 2026-10-25

### 🚀 Features

- **cloud:** Minimize persisted Google identity to name and email
- **cloud:** Restrict account name/email documents to owning UID
- **cloud:** Sync private Google name and email on account sign-in
- **cloud:** Persist private Google account details and delete with save
- **cloud:** Preserve permanent mode and Stunt bests independently of rolling history
- **cloud:** Apply UID-only rules for permanent mode/stunt results
- **cloud:** Transactionally merge permanent modes and atomically delete all private cloud docs
- **ui:** Show Google player profile and manual cloud sync action
- **i18n:** Localize cloud profile, manual sync and safe account switch copy
- **cloud-ui:** Safe per-UID switch, durable sync state, Google identity and guarded atomic delete
- **i18n:** Describe protected deletion retry in English and Traditional Chinese
- **cloud:** Validate versioned backup imports and keep additional mode metadata
- **ui:** Expose validated progress import alongside export
- **cloud:** Restore validated JSON progress and permanent bests with user confirmation
- **i18n:** Localize safe JSON import flow and failure guidance
- **cloud:** Validate nested Star, best-time and medal values in Spark Rules
- **ui:** Explain that signing out keeps Google identity and saved results
- **ui:** Reveal cloud sign-out explanation only for signed-in players
- **i18n:** Clarify sign-out and progress deletion do not remove Google accounts
- **ui:** Announce explicit cloud sync state with ARIA busy and offline recovery
- **release:** Gate notes on player copy and review
- **release:** Filter developer-only notes harder

### 🐛 Bug Fixes

- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **showcase:** Unify preview angles and surface camera dock
- **ui:** Resolve phone browser regressions
- **showcase:** Keep camera controls clear of quality notice and readable in zh-TW
- **cloud:** Restore valid Firestore rules with private account schema
- **cloud:** Retain mode telemetry and 4096-character rule signatures
- **cloud:** Preserve per-account permanent records and clear them on deletion
- **i18n:** Separate Traditional Chinese cloud deletion message key
- **cloud:** Roll back partial browser progress writes when localStorage fails
- **i18n:** Repair comma in Traditional Chinese cloud switch translation
- **i18n:** Remove disallowed English technical terms from Chinese import error
- **cloud:** Use the initialized Firestore instance for private account lookup
- **cloud:** Repair duplicated Firestore Rules structure and validate private progress fields
- **whats-new:** Pin unread tag to the tab corner
- **home:** Hold incoming frame through swipe completion and show Airflow hint once per reload
- **showcase:** Ground all track preview cars while AIRFLOW is enabled
- **showcase:** Adapt curated camera eye to clear roadside occlusion without losing landmarks
- **showcase:** Count opaque multi-material structures in camera obstruction probe
- **showcase:** Preserve full Tokyo Alpine vehicle with dolly-back before raising camera
- **qa:** Measure projected showroom body width
- **home:** Preserve swipe snapshots across interruption
- **home:** Center version in the footer grid

### 💼 Other

- **release:** Run the gate tests at the tagged version
- Sync main into Whats New announcement feature branch
- Main into feature/home-seamless-track-carousel
- Main into feature/home-seamless-track-carousel
- Home seamless track carousel flicker fix and per-load Airflow hint

### 📚 Documentation

- **showcase:** Track validation gates in TODO
- Plan Spark-compatible Firebase integrity tasks with 36 P0/P1 checks
- Record partial TDD implementation and unverifed Spark launch gates
- **cloud:** Document Spark-only private account, permanent best and backup flows
- **todo:** Mark verified pure-data tasks and record CI evidence without claiming cloud acceptance
- **todo:** Check evidenced P0/P1 tasks after green unit, emulator and rules CI
- **release:** Describe the unread corner tag
- **release:** Add notes review and release commands
- **release:** Draft and review from player changes
- **showcase:** Specify AIRFLOW-grounded hero across all tracks
- **showcase:** Require ground pose with AIRFLOW for new tracks
- **todo:** Track AIRFLOW grounded parity and verification gates
- **showcase:** Require occlusion-free landmark and AIRFLOW camera views
- **claude:** Enforce real car visibility in every World Tour preview
- **todo:** Track showroom obstruction fix and QA gates
- **todo:** Classify Firebase tasks into Spark-now, production acceptance and future triggers
- **release:** Review 0.22.1 notes
- **todo:** Track home footer alignment gates

### 🎨 Styling

- **ui:** Add responsive Google cloud identity row and sync button

### 🧪 Testing

- **showcase:** Add failing shared camera regression tests
- **showcase:** Cover all tracks and responsive camera dock
- **release:** Pin the localized image check to 0.21.0
- **release:** Handle optional announcement images
- **showcase:** Reproduce performance-notice blocking camera dock
- **cloud:** Specify minimal private Google account fields before implementation
- **cloud:** Specify private Firestore Google account document rules
- **cloud:** Preserve mode telemetry and full-length rules on device sync
- **cloud:** Specify permanent mode/stunt bests restore and merge before implementation
- **cloud:** Require owner-only bounded permanent-best Firestore documents
- **cloud:** Guard permanent modes across account switch and deletion
- **cloud:** Specify profile UI, manual sync and private account persistence
- **cloud:** Verify permanent Time Attack best survives fresh-browser login
- **cloud:** A failed local multi-key save must roll back partial changes
- **cloud:** Validate versioned JSON backup import and cap file size
- **cloud:** Avoid duplicate Firebase SDK instances in profile emulator assertion
- **cloud:** Verify Stunt records and JSON import across Firebase emulator browsers
- **cloud:** Preserve offline per-account bests while switching Google identities
- **cloud:** Reject malformed nested stars, times and medal dates in Firestore Rules
- **ui:** Distinguish signing out, deleting game data and deleting Google identity
- **ui:** Dismiss native confirmation before awaiting click completion
- **ui:** Require accessible cloud sync states and avatar fallback
- **cloud:** Reopen save dialog after account-switch navigation
- **home:** Reproduce stale track flash at animation handoff and restore swipe hint on reload
- **home:** Run per-load Airflow hint regression in real touch viewport
- **home:** Update existing phone reload acceptance for per-load swipe hint
- **home:** Verify no outgoing-frame flash on trackpad scroll handoff
- **home:** Watch actual incoming track during carousel handoff
- **showcase:** Require grounded AIRFLOW on curated and future tracks
- **showcase:** Let WebGL QA probe airflow and camera views
- **showcase:** Verify grounded airflow and six camera angles in real WebGL
- **showcase:** Enforce unoccluded car body in Tokyo Alpine and all World Tour views
- **showcase:** Exercise unobstructed AIRFLOW camera UI on every World Tour map
- **showcase:** Honor WebGL probe frame count for six-angle checks

### ⚙️ Miscellaneous Tasks

- Temporarily validate showcase branch before merging
- Run full automated checks on Firebase integrity feature branch
- **git:** Ignore node_modules symlinks in worktrees
## [0.22.0] - 2026-10-24

### 🚀 Features

- **mode00:** GREEN — stable per-system seeds and bounded route inputs
- **stunt:** GREEN — preserve rule-scoped best score, combo and air time across history trimming
- **checkpoint:** GREEN — keep rendered gates clear of real roadside obstacles
- **history:** GREEN — persist versioned mode identity and bounded item/hazard telemetry
- **gauntlet:** GREEN — reward bounded one-time clean near-miss passes
- **history:** GREEN — preserve per-mode personal bests beyond fifty-run history rotation
- **history-ui:** GREEN — filter mode records with personal bests and eligible Ghosts
- **cloud:** GREEN isolate local race progress by Google account
- **cloud:** Reload account-specific progress before authenticating new player
- **cloud:** GREEN persist per-account pending state and last Firestore success
- **cloud:** Show last successful sync and offline pending state in History
- **cloud:** GREEN deduplicate synced Classic/mode/daily attempts by stable identity
- **touch:** Keep thumb controls off the screen corners
- **home:** Swipe the 3d preview to change track
- **audio:** Persist audio prefs in local storage
- **release:** Add curated bilingual release data and seen-version contract
- **release:** Display dismissible local release notes without interrupting races
- **release:** Add responsive native What's New dialog and home entry
- **i18n:** Translate release notes UI to English and Traditional Chinese
- **whats-new:** Browse the latest five releases
- **whats-new:** Mark every release missed since last visit
- **input:** Slide a steering thumb into brake to drift

### 🐛 Bug Fixes

- Compose steering and pitch in the local road frame
- Preserve road pitch and bank when rendering cars on curved tracks
- Prevent repeat impacts while continuously steering into a road edge
- **mode00:** Clarify bounded gauntlet input validation errors
- **elimination:** GREEN — derive player knockout rank from contenders left
- **gauntlet:** GREEN — skip raised shortcut hazards and guard nonfinite motion time
- **history:** GREEN — bound untrusted mode history and reject impossible records
- **ci:** Scale WebGL black-frame timeout and require all browser shards before main merge
- **i18n:** Localize cloud Ghost copy; whitelist Google as untranslated brand
- **i18n:** Localize pending, account switch and last successful cloud sync
- **i18n:** Add missing commas in cloud sync locale keys (CI RED parse error)
- **cloud:** Retain unranked mode histories restored from Firestore
- **i18n:** GREEN localize mode history filters, notice and PB/Ghost badges
- **cup:** GREEN reject unknown tracks and malformed rival scorecards
- Keep language and VFX controls clickable above finished-race overlay
- Preserve real braking instead of restarting drifts against a contacted rail
- **ui:** Keep topbar dropdowns above the VFX tool row
- **ui:** Lower ios footer into home-indicator inset
- Keep one trackpad gesture alive through slow WebGL wheel-event pauses
- **home:** Time trackpad gestures on the wheel events' own timestamps
- **ci:** Make trackpad swipe regression deterministic
- **ui:** Stop sticky touch hover on icon buttons
- **ui:** Stop sticky touch hover on controls button
- **tutorial:** Preserve steering across lessons and disable automatic lane centering
- **tutorial:** Use free steering input in frame loop
- **home:** Slide adjacent full-viewport track scenes without dimmed gaps
- **home:** Capture fresh opaque WebGL frames and preserve pointer capture during swipe
- **input:** Suppress and clear FLY when daily rule disables flight
- **daily:** Synchronize locked FLY and HUD with challenge rule
- **daily:** Synchronize locked FLY and HUD with challenge rule
- **daily:** Synchronize locked FLY and HUD with challenge rule
- **daily:** Synchronize locked FLY and HUD with challenge rule
- **ui:** Add accessible locked-flight icon
- **release:** Use Node-compatible JSON import for unit tests
- **release:** Localize the version entry accessible label
- **release:** Guard blocked storage without stopping the game
- **release:** Keep home announcement entry above phone safe area
- Harden release-note image paths
- **ui:** Block system selection menus on long press
- **daily:** Keep the no-flight FLY label through the frame loop

### 💼 Other

- Main into feature/mode00-objective-contract
- Bring Firebase cloud save main into MODE-00 branch
- Sync release v0.20.1 from main into MODE-00
- Bring latest main audio lifecycle fix into MODE-00
- Integrate latest main v0.21.0 into MODE-00
- Ship MODE-00 objective contract to main
- Add make verify for full local regression gate including World Tour
- Bring main into feature/sky-spiral-cornering-stability
- Bring origin/main tutorial steering fixes into local main
- Seamless 3D home track previews and latest main fixes
- Daily no-flight controls and HUD accessibility (preserve track swipe changes)
- **release:** Refuse a release without its notes

### 🚜 Refactor

- **release:** Drop dialog language toggle

### 📚 Documentation

- Track cross-course stability fixes and unverified acceptance gates
- Add scoped road-frame, wheel-clearance and rail-contact regression rules
- Make all-track physics and renderer stability non-regression rules explicit
- **mode00:** Mark deterministic streams and safety bounds complete after GREEN CI
- **stunt:** Check off ruleset-scoped lifetime bests after GREEN unit/build
- **mode00:** Clarify completed seeds versus outstanding stage acceptance
- **checkpoint:** Mark real-route gate safety complete after unit and WebGL GREEN CI
- **modes:** Check off verified Checkpoint and Elimination criteria after WebGL GREEN
- **history:** Mark stable rule-versioned mode result contract complete after GREEN CI
- **gauntlet:** Check off clean/near-miss scoring and isolated mode records after GREEN CI
- **gauntlet:** Verify seeded passable paths and collision acceptance after GREEN CI
- **history:** Validate safe migrated mode records and check off 10C persistence
- **history:** Describe filtered challenge PBs and Ghosts in EN/zh-TW
- **todo:** Record merged main and cloud TDD progress pending full verification
- **todo:** Mark verified 10C mode History and PB/Ghost acceptance
- Require real clickability regression checks after collisions and race finish
- Make post-finish UI clickability an explicit project invariant
- Record Tokyo post-finish fix, merged main and verified unit CI status
- Define regression-first TDD, all-track validation and merge readiness gates
- Require six-step regression-first workflow and exact-commit merge gate
- Apply regression-first verification gates to Codex and other agents
- Track enforceable regression-first workflow and outstanding acceptance gates
- **readme:** Describe shared AI collision rules
- Track trackpad-wheel RED evidence, fix and exact-commit CI acceptance
- **todo:** Record trackpad root cause, regression gates and main ruleset
- **todo:** Record the CI wheel-delta scaling failure
- **todo:** Mark the final-head quality gate green
- **todo:** Defer daily rewards and note flight UX verification
- **todo:** Outline TDD release announcement checklist
- Require player-friendly bilingual release announcements
- Bring announcement UI specification to implementation branch
- **release:** Require plain player-first copy and explain safe rollout
- **todo:** Check verified release content and player-friendly writing rule
- **todo:** Split verification items and tick verified TDD, screenshot and automated-test checks
- **todo:** Tick bilingual and maintainability check
- **todo:** Note notes follow the site language
- **release:** Document what's new workflow
- **release:** Document unread release marks
- **input:** Describe sliding an arrow into brake to drift
- **claude:** Add ui architecture conventions
- **release:** Add what's new notes for 0.22.0
- Enforce player-controlled steering throughout tutorial

### 🎨 Styling

- **home:** Render adjacent swipe pages at full viewport width
- **release:** Fit player announcement on desktop and touch viewports

### 🧪 Testing

- Cover continuous road-aligned vehicle pose on curved tracks (RED)
- Reproduce repeated rail collisions on every track (RED)
- **mode00:** RED — require independent subsystem seeds and bounded layouts
- **stunt:** RED — rule-scoped peak score, combo, air time survive history trimming
- **checkpoint:** RED — require route-safe gates avoiding real obstacle footprints
- **checkpoint:** Regress real-world scenery clearance on all ten routes
- **elimination:** RED — rank eliminated player by active contenders, not fixed fourth
- **modes:** Verify live checkpoint HUD metrics and Elimination WebGL in CI
- **elimination:** Verify early knockout and challenge wins never mutate Career
- **history:** RED — require versioned mode identity and bounded mode result metrics
- **gauntlet:** RED — distinct near-miss reward and challenge-only hazard records
- **gauntlet:** RED — keep all ten routes passable and reject nonfinite hazard positions
- **history:** RED — reject malformed mode history and invalid new-mode records
- **history:** RED — require durable rule-scoped personal bests for every challenge mode
- **history-ui:** RED — mode filter, persistent PB, Ghost and personal-only History
- **history-ui:** Verify mobile-portrait History filter layout and capture real screenshot
- **i18n:** Ensure Ghost uses a real regex word boundary
- **browser:** Make 5km sprint near-miss end-to-end deterministic via dev-only gameplay fixture
- **cloud:** RED verify account-specific local progress isolation
- **cloud:** RED pending and last successful sync remain account-scoped
- **cloud:** RED stable race and challenge IDs prevent duplicate career totals
- **cloud:** Use authoritative Daily Challenge modifier catalog
- **i18n:** RED require App.vue and mode History translations in both locales
- **cup:** RED reject malformed tracks and duplicated or nonfinite Cup standings
- Reproduce Tokyo finish click interception after repeated collisions (RED)
- Reproduce drift restarting against the same rail (RED)
- Reproduce trackpad momentum double-switch on slow CI event cadence (RED)
- **swipe:** Drive trackpad tests with CDP wheel events on a fixed clock
- **tutorial:** Reproduce sideways teleport on lesson transition
- **tutorial:** Require neutral steering and unrestricted practice input
- **tutorial:** Account for natural steering ramp on release
- **swipe:** Pin trackpad wheel deltas and stamps in-page
- **home:** Specify edge-to-edge 3D preview carousel without dark gaps
- **home:** Make full-page drag assertion deterministic and check opaque adjacent views
- **home:** Assert snapshots cover transparent live canvas and restore opacity after swipe
- **home:** Distinguish held short drag from intentional quick flick
- **home:** Observe transient swipe chip without CPU-runner timing flake
- **daily:** Specify no-flight input disabling and restoration
- **browser:** Cover daily modifier FLY HUD touch and locale states
- **release:** Define announcement state and bilingual browser expectations (RED)
- **release:** Switch language within modal and verify ready state
- **release:** Capture real desktop and mobile release dialog screenshots
- **browser:** Cover one-thumb drift into brake on touch

### ⚙️ Miscellaneous Tasks

- **mode00:** Run focused TDD, unit and build on feature pushes
- **mode00:** Verify Checkpoint Rush WebGL flow and capture real gameplay
- **mode00:** Include Gauntlet browser smoke and save real mode screenshots
- Run full test matrix on the road-stability feature branch
- Enforce one quality-gate across suites and protect feature-branch deployments
- **make:** Stop an earlier dev run before starting
- **test:** Temporarily run full GitHub checks on carousel feature branch
- **release:** Run unit/build/layout and bilingual browser checks on feature branch
- **release:** Upload actual bilingual announcement UI screenshots
- **release:** Cancel outdated runs on feature branch pushes
- **release:** Verify new announcement browser tests before longer layout suite
## [0.21.0] - 2026-10-24

### 🚀 Features

- **dev:** Run dev servers on firebase emulators
- **game:** Give ai cars the player's collision physics

### 🐛 Bug Fixes

- **hooks:** Run the layout gate on a free port
- **ui:** Align cloud save buttons

### 📚 Documentation

- Clarify feature branch workflow
- Document shared collision physics for all cars
- **readme:** Link cloud-save operations guide
## [0.20.2] - 2026-10-24

### 🐛 Bug Fixes

- **audio:** Suspend audio while the page is hidden
## [0.20.1] - 2026-10-24

### 🚀 Features

- **cloud:** Add reusable sign-in and home entry
- **cloud:** Complete account save recovery flows

### 🐛 Bug Fixes

- **input:** Free touch controls stuck by ios edge swipe
- **cloud:** Preserve and validate synced progress
- **input:** Free touch controls stuck by ios edge swipe
- **cloud:** Report local save failures accurately

### 💼 Other

- Integrate Firebase cloud save into main

### 🧪 Testing

- **browser:** Scale bloom guard timeout in CI
- **cloud:** Cover sign-in restore with firebase emulators
- **browser:** Isolate preview server ports
## [0.20.0] - 2026-10-23

### 🚀 Features

- **controls:** Start auto on for every device
- **save:** Sync race progress to a Google account
- **ui:** Preview touch buttons in controls panel
- **ghost:** Default best-run ghost to off
- **ui:** Show touch preview under the opacity slider

### 🐛 Bug Fixes

- **ui:** Keep scene aspect after device rotation
- **ui:** Move airflow start clear of the car
- **render:** Keep NaN texels out of the bloom blur
- **scripts:** Seed guide-seen in readme capture
- **i18n:** Keep cloud-save copy free of stray English
- **i18n:** Name zh-TW controls by their on-screen labels

### 📚 Documentation

- **readme:** Recapture screenshots and add demo gif

### ⚡ Performance

- **render:** Compile every shader before racing

### 🧪 Testing

- **browser:** Scale black-frame countdown wait by CI factor
- **browser:** Drive the 5 km sprint with AUTO off

### ⚙️ Miscellaneous Tasks

- **git:** Ignore firebase emulator logs
- **codex:** Add firebase mcp server config
## [0.19.1] - 2026-10-23

### 🐛 Bug Fixes

- **audio:** Reset music-off saved by the old prompt
- **audio:** Play through the iOS silent switch

### 💼 Other

- Gate home-screen pushes on layout tests

### 📚 Documentation

- Point the home-screen rule at test:layout
- Describe first-gesture music and iOS playback
## [0.19.0] - 2026-10-23

### 🚀 Features

- **audio:** Start music on first interaction, no prompt
- **ui:** Surface practice, daily and medals on home
- **mode-00:** Add explicit immutable per-mode race objectives
- **mode-00:** Apply objective contract to race completion logic
- **mode-00:** Reject malformed mode requests without changing legacy defaults
- **mode-00:** Add versioned pure race session identity separate from presentation
- **mode-00:** Attach immutable session contracts without changing Classic/Daily seeds
- **mode-00:** GREEN Cup objective uses explicit stage-points semantics
- **mode-00:** Validate raw session settings while preserving normalized legacy callers
- **tutorial:** Start practice on a player's first race
- **ui:** Keep one start button in airflow mode
- **ui:** Focus and centre the clicked home track
- **ui:** Lead the guide with the practice button

### 🐛 Bug Fixes

- **ui:** Keep long game-mode labels inside their tabs
- **vfx:** Prebuild airflow shaders on the first frame
- **ui:** Fit the home intro on 900-1160px desktops
- **ui:** Keep the intro under the top bar on desktops

### 🚜 Refactor

- **mode-00:** Name independent deterministic race random streams
- **mode-00:** Share stable hazard seed stream name
- **ui:** Label touch controls as touch buttons

### 📚 Documentation

- **mode-00:** Record tested session contracts and outstanding acceptance gates
- **tutorial:** Record first-start practice flow
- Guard intro height budget and toggle shader warmup
- Add top bar and touch checks to intro rule

### 🧪 Testing

- **mode-00:** Define RED acceptance for explicit race objectives
- **mode-00:** RED contracts for strict validation, immutable sessions and seeded replay
- **mode-00:** RED Cup uses stage-points objective instead of placement

### ⚙️ Miscellaneous Tasks

- Run 8 browser shards and verify tags from main
- **release:** Gate tags on a green ci run
## [0.18.0] - 2026-10-23

### 🚀 Features

- Add interactive driving tutorial

### 🐛 Bug Fixes

- **tutorial:** Preserve hints and touch preferences

### 💼 Other

- **main:** Integrate v0.17.0 before completing interactive tutorial

### 📚 Documentation

- Add interactive tutorial plan and TODO checklist
- **tutorial:** Record verified interactive practice

### 🧪 Testing

- Add interactive tutorial unit and browser tests

### ⚙️ Miscellaneous Tasks

- Add agent guidance for skyline-rush
- **main:** Integrate v0.17.1 for release
## [0.17.1] - 2026-10-23

### 🐛 Bug Fixes

- **game:** Keep advancing the race on slow frames

### 🧪 Testing

- **browser:** Scale per-test timeouts by the ci factor
## [0.17.0] - 2026-10-23

### 🚀 Features

- **ui:** Add a first-run controls guide
- **audio:** Add test-first one-shot event rules for arcade modes
- **audio:** Synthesize distinct arcade soundtracks and contextual game cues
- **stunt:** Award duration-scaled style medals and save combo/air stats
- **custom:** Replay the last three Custom setups with bilingual UI
- **checkpoint:** Guide gates by road-relative direction and reward perfect lines
- **items:** Add optional one-slot active mystery power-ups to practice modes
- **elimination:** Add ten-second knockout arcade mode with dynamic rivals
- **practice:** Opt-in Off/Standard/Extreme hazards in Custom and Free Drive
- **photo:** Paused Free Drive studio with orbit, lens, lighting and local PNG
- **ui:** Reopen the start screen on the last raced track
- **ui:** Reopen the start screen on the last raced track
- **world-tour:** Frame signature landmarks on home
- **world-tour:** Showcase landmarks on all five maps
- **world-tour:** Move landmark blockers, not delete
- **world-tour:** Make road-reaching scenery solid
- **game:** Steer rivals and traffic around obstacles

### 🐛 Bug Fixes

- **audio:** Consume paused mode events to prevent delayed cue playback
- **ui:** Fit arcade mode menu and translate stunt timers on mobile/desktop
- **ui:** Ensure compact intro styles override later mode picker defaults
- **ui:** Keep desktop intro visible and music prompt from blocking VFX
- **checkpoint:** Resolve gate crossings against remaining timer
- **audio:** Raise music and effects output gain
- **ui:** Close every dropdown on an outside press
- **ui:** Make every button clickable up to its border
- **render:** Stop screen flicker and edge crawl
- **ui:** Keep long game-mode labels inside their tabs
- **ui:** Keep mode tab columns as wide as their words
- **world:** Stop finished cars parking at the arch
- **ui:** Fit the championship cup label in its tab

### 💼 Other

- **main:** Integrate v0.15.1 release and phone UX updates
- **main:** Integrate v0.16.0 release, PWA updates and three course songs

### 📚 Documentation

- **todo:** Track the controls guide v1 checklist
- **ui:** Record controls guide verification
- **todo:** Check independently verified sprint, stunt, hazard and audio work
- **claude:** Assess and implement appropriate audio with UI and UX changes
- Describe darken-only button press feedback
- **readme:** Note home-screen landmark showcase
- **claude:** Require landmark showcase for new maps
- **readme:** Note landmarks on all world tour maps
- **claude:** Move landmark rules to track-showcase
- **claude:** Keep streets rich around landmarks
- Document solid props and ai obstacle avoidance

### 🎨 Styling

- **ui:** Make the version label easier to read
- **ui:** Punch up the controls guide title

### 🧪 Testing

- **ui:** Handle delayed music prompts in locale picks
- **audio:** Specify per-mode music loops and checkpoint chimes (RED)
- **stunt:** Specify duration-scaled medals and history stats before implementation
- **stunt:** Correct long-duration threshold expectation before implementation
- **practice:** Specify optional Off/Standard/Extreme hazards (RED)
- **photo:** Drive native range sliders through input events in Playwright
- **ui:** Cover outside-press and button-swap dropdown close
- **ui:** Cover language button presses at its top border
- **world-tour:** Measure landmarks as the home renders

### ⚙️ Miscellaneous Tasks

- Page telegram when checks or deploy fail
## [0.16.0] - 2026-10-22

### 🚀 Features

- **audio:** Add music for neon canyon and aurora
- **checkpoint:** Add deterministic timed gate challenge rules and red-green tests
- **checkpoint:** Integrate timed gates into driving, results and records
- **ui:** Render glowing checkpoint arches with bilingual timer HUD and safe retry
- **gauntlet:** Add deterministic sweeping obstacles with RED-GREEN unit tests
- **ui:** Introduce Extreme gauntlet with moving barriers, warnings and bilingual rules
- **time-attack:** Add optional clean-run challenge with isolated bests and bilingual UX
- **cup:** Add three-track championship scoring with RED-GREEN tests
- **ui:** Add three-course Championship Cup, rival points and stage standings
- **cup:** Support 3/5-track championships and prevent locked-track keyboard bypass
- **practice:** Show live Free Drive telemetry with test-first stats
- **practice:** Surface near-miss combo and complete practice HUD task
- **stunt:** Add score-combo engine with test-first regression coverage
- **stunt:** Integrate timed style attack with official-result isolation
- **ui:** Launch bilingual timed Stunt Attack with score HUD and stage flow
- **app:** Reload a home-screen app onto a new build

### 🐛 Bug Fixes

- **ui:** Fit eight game modes in the desktop intro

### 💼 Other

- **main:** Reconcile upstream browser fixtures and device UX

### 📚 Documentation

- **todo:** Mark new checkpoint, clean trial and gauntlet tier implementations
- **todo:** Mark implemented 3/5-track Championship Cup; keep acceptance gates open
- **readme:** Document seven race modes, gameplay rules and real CI screenshot gallery

### 🧪 Testing

- **ui:** Expand clean-trial details before toggling checkbox
- **stunt:** Verify highest-score records and career save isolation
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
