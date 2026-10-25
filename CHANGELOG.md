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
