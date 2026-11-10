## [0.31.0] - 2026-11-10

### 🚀 Features

- Define five Stage 1 preview-only tracks without race registration
- Add five selectable Stage 1 teaser cards and still-scene preview to home
- Preview upcoming tracks without creating races; localize start CTA by selection state
- Connect upcoming scene host to shared world with explicit missing-scene fallback [full-regression]
- Selectively integrate five time-driven Three.js environments [full-regression]
- **courses:** Add validated graph and arc-length route-frame contract [full-regression]
- **courses:** Gate route edge transitions through ordered 3D checkpoints [full-regression]
- **frostbite:** Author 13.8 km point-to-point CourseGraph with road/contact geometry
- **frostbite:** Real Three.js Rift Spine scene built from the CourseGraph
- **frostbite:** Gated Stage 2 live preview with P01 ground and P02 flight shots
- **frostbite:** Add native 3x cover and route map
- **home:** Show Frostbite Canyon as a Coming Soon card; unlock enters only race-ready cards
- **frostbite:** Add gated race runtime and dedicated scene
- **frostbite:** Build real shortcut-corridor structures
- **frostbite:** Race the rift span on the ice bridge
- **frostbite:** Faster rival pace on the 13.8 km course
- **frostbite:** Fix showroom visual deviations
- **frostbite:** Save topology-keyed results and ghost
- **coursegraph:** Add opt-in physical graph traversal [full-regression]
- **coursegraph:** Validate signed gates and eight-car fleet recovery [full-regression]
- **coursegraph:** Deterministic branch AI and gate-aware standings [full-regression]
- **coursegraph:** Verify measured physical gate crossings [full-regression]
- **courses:** Selectively import five playable course sources and tests [full-regression]
- **courses:** Stage five canonical CourseGraph runtime adapters [full-regression]
- **course-fleet:** Add atomic eight-car measured-motion stepping [full-regression]
- **economy:** Add fail-closed Wave 3 read-only state contract [full-regression]
- **garage:** Show existing 3x Store artwork in Economy Garage [full-regression]
- **garage:** Show selected 3x Store concept art in live Garage detail [full-regression]
- **wave3:** GREEN archive and display 8 original 3x garage-rewards-and-missions UI icons at 1x CSS
- **wave3:** GREEN bilingual mission/store read-only catalog previews and 3x artwork
- **wave3:** Add fail-closed idempotent settlement gate [full-regression]
- **wave3:** Add bilingual display-only finish placement badges [full-regression]
- **wave3:** Show nontransactional podium badge in actual Classic results [full-regression]
- **wave3:** Use existing 3x trophy art on live Classic finish results [full-regression]
- **wave3:** Introduce truthful bilingual mission cards with inaccessible-progress guard
- **wave3:** Wire native 3x rewards PNGs into Garage and Results [full-regression]
- **wave3:** Show all 8 native PNGs in Garage mission and trophy panels [full-regression]
- **wave3:** Enforce nontransactional Store preview policy [full-regression]
- **wave3:** Expose truthful disabled Store state in Garage catalog [full-regression]
- **wave3:** Use authentic Store 3x artwork as Garage entry icon [full-regression]
- **store:** Model featured and unavailable display states without commerce
- **store:** Build nontransactional Garage catalog with featured and unavailable states
- **store:** Serve true-alpha PNG primary art from BASE_URL with safe entry fallback
- **store:** Reuse safe WebP/text fallback when 3x PNG cannot load
- **store:** Reuse safe WebP/text fallback when 3x PNG cannot load
- **store:** Allow Garage entry to open accessible catalog
- **store:** Add discoverable Garage Store entry beyond concept gallery
- **garage:** Native 3x Airflow PNGs and distinct preview glow [full-regression]
- **garage:** Display real selected VFX artwork in Studio loadout [full-regression]
- **previews:** Add six release-locked Coming Soon cover and route assets
- **home:** Display six non-interactive Coming Soon cover cards
- **home:** Restore original selectable Coming Soon cards, SVG minimaps and KM layout
- **previews:** Port original Coming Soon selection, CTA labels, map info and keyboard handling
- **i18n:** Reuse original Coming Soon and planned-KM translations for all six tracks
- **showcase:** Port original Stage 1 3D preview scenes and regression tests without playable race runtimes
- **world:** Reuse original five Three.js home showcases while preserving develop vehicle motion
- **home:** Restore original swipe and drag navigation across playable and preview cards
- **home:** Connect preview selection and swipe to original 3D showcase with image fallback
- **frostbite:** Port original P01/P02 3D showroom, geometry data, and scene tests without race registration
- **showcase:** Activate Frostbite original 3D shots and adaptive portrait camera in six-preview home
- **frostbite:** Restore original stage2-preview URL auto-selection without race access
- **scripts:** Add glTF Transform install and smoke script
- **3d-pipeline:** Add Phase 1 per-device check script
- **3d-pipeline:** Add Phase 1 by-project check script
- **3d-pipeline:** Guard Phase 1 verify against tree changes
- **dune:** Author standalone point-to-point course graph data
- **dune:** Author direction-aware checkpoint gate descriptors [full-regression]
- **dune:** Expose authored course as shared CourseGraph contract
- **dune:** Derive streamed road ribbons and hazards from shared route frames
- **dune:** Add seam-safe native dune terrain and bounded aerial landing pads
- **dune:** Native Three.js streamed scenery, visible hazards, stone arches and sandstorms
- **dune:** Supply obstacle avoidance, safe recovery and flight landing contracts
- **dune:** Add streamed flight-canyon mesh with TDD [full-regression]
- **monsoon:** Author 12.5km branching course, wet contact and obstacle interfaces
- **monsoon:** Add disposable 3D course chunks with valley, temple, falls, bridge and rain
- **monsoon:** Stream shallow ford water and real stone-bridge supports; cache rain spawn points
- **monsoon:** Sample each ground and fork edge by real physical arc length
- **monsoon:** Expose direct node-to-node CourseGraph edge sampler [full-regression]
- **monsoon:** Add real river watercourse and sculpted guardian facial stonework [full-regression]
- **skyfall:** Author 16 km branch-aware floating island course and 3D world [full-regression]
- **skyfall:** Stream disposable per-edge road and island chunks
- **skyfall:** Mark supported aerial landing pavement [full-regression]
- **skyfall:** Show four elevated non-collision checkpoint rings [full-regression]
- **skyfall:** Adapt authored course to validated shared CourseGraph [full-regression]
- **stormline:** Author 14km branched city course graph blockout
- **stormline:** Add streamed true-3D road, viaduct and city chunk builder
- **stormline:** Add animated neon signs and non-solid reflective puddles
- **stormline:** Calibrate 14.24km course layout [full-regression]
- Add streamable world-frame tunnel shell for Stormline [full-regression]
- **stormline:** Smooth branch landings, wet-road guides and obstacle validation [full-regression]
- **stormline:** Stable visible rooftop flight guides and canonical road parity [full-regression]
- **volcanic:** Author point-to-point graph, hazards and streamed 3D chunks [full-regression]
- **volcanic:** Warn for eruptions and tier ash, heat and lava lighting [full-regression]
- **volcanic:** Add deterministic swept hazard adapter and record verification gaps [full-regression]
- **stormline-megacity:** Gated dev-unlocked CourseGraph race runtime [full-regression]
- **tutorial:** Add shared air-chain landing rule
- **tutorial:** Add endless practice road option
- **tutorial:** Gate lessons, skip step and retry reasons
- **minimap:** Player heading arrow and pulse halo
- **hud:** Dock race progress and chips at edges
- **hud:** Compact phone leaderboard and placement
- **rings:** Vary ring lanes on every track
- **rings:** Add catch-up items for trailing player
- **tutorial:** One pause and exit control, visible pause screen
- **ai:** Make rivals skill-only and harder
- **tutorial:** Add shared air-chain landing rule
- **tutorial:** Add endless practice road option
- **tutorial:** Gate lessons, skip step and retry reasons
- **minimap:** Player heading arrow and pulse halo
- **ai:** Gentler Normal and opening-map rivals
- **audio:** Play a chime for every ring collected
- **cloud:** Show race cloud-sync status on results
- **catch-up:** Spawn weighted rings only [full-regression]
- **catch-up:** Adapt ring budget, cadence and placement to total race length [full-regression]
- **garage:** Add sun/moon lighting toggle
- **3d-pipeline:** GLB manifest validation and async model cache
- **3d-pipeline:** Pipeline-probe Blender→GLB→glTF Transform pipeline
- **3d-pipeline:** ?model=probe Garage adapter with lifecycle specs
- **3d-pipeline:** Rig GLB Roadster to the procedural car and add opt-in KTX2
- **3d-pipeline:** KTX2 texture passes and texture checks in the GLB pipeline
- **3d-pipeline:** Add roadster2 KTX2 GLB and sources
- **3d-pipeline:** Add low-LOD support to GLB tools
- **3d-pipeline:** Roadster2 it6 art pass and low LOD
- **minimap:** Add transparent WebP player marker and preserve SVG fallback
- **dune-tempest:** Add native canyon terrain, hairpins, flight route and animated sand [full-regression]
- **dune-tempest:** Animate distant sand haze and golden-hour lighting [full-regression]
- **skyfall:** Build animated 3D archipelago and dual-height showroom routes
- Build animated Stormline Megacity 3D home environment [full-regression]
- **volcanic-crown:** Procedural lava canyon, hairpin road and flying showroom branch [full-regression]
- **volcanic-crown:** Visible erupting summit and basalt road shoulders
- Build spatial Monsoon Ruins Three.js home environment
- **volcanic:** Implement arc-length ground route and authored 3D race chunks [full-regression]
- **volcanic:** Register gated CourseGraph sprint and reuse authored 3D scene [full-regression]
- **monsoon:** Implement measured ground-route race and authored jungle scene [full-regression]
- **monsoon:** Wire gated Classic race, world view, locale and access tests [full-regression]
- **lifecycle:** Parse JPEG, evidence, and release approvals [full-regression]
- **lifecycle:** Add ready stage with fail-closed dev access [full-regression]
- **lifecycle:** Enforce preview, race, evidence and catalog gates [full-regression]
- **lifecycle:** Collect runtime state and expose lifecycle CLI [full-regression]
- **3d-pipeline:** Author roadster2 lift fans with named pivots
- **garage-model:** Dress the Home showcase and race car with the GLB behind ?model=roadster
- **garage:** Make the Studio entry stand out with sheen and glow
- **race:** Show post-hit grace as a translucent pulse
- **tutorial:** Add live cues and guided lesson timing
- **tutorial:** Guide arrows and live cues follow lesson
- **home:** Game-style landscape phone home layout
- **tutorial:** Air chain phone ripple follows the live cue
- **course-runtime:** Pure per-car CourseGraph race runtime
- **dune-tempest:** Register gated CourseGraph race spec
- **course-runtime:** Dispatch graph courses through the shared race loop
- **dune-tempest:** Flight gap, hazards and recovery on the graph runtime
- **dune-tempest:** Topology-keyed results without Ghost
- **course-runtime:** Add arc-length graph route-map data with fork tests [full-regression]
- **course-runtime:** Draw per-edge Dune minimap and project live markers [full-regression]
- **course-runtime:** Stream and dispose physical Dune road chunks [full-regression]
- **course-runtime:** Use graph standings and branch-aware HUD gaps [full-regression]
- **course-runtime:** Expose shared physical car and camera render poses [full-regression]
- **course-runtime:** Attach streamed Dune geometry, physical car poses and fork camera to world [full-regression]
- **dune-tempest:** Add matching sunset race palette [full-regression]
- **dune-tempest:** Allow dev-unlocked START with CourseGraph while production stays Coming Soon [full-regression]
- **skyfall:** Share canonical physical road sampler and smooth junction pads [full-regression]
- **skyfall-archipelago:** Gated CourseGraph race with flight gaps [full-regression]
- **skyfall:** Stream existing world through shared CourseGraph scene host [full-regression]
- **skyfall:** Enable dev-unlocked CourseGraph START; production locked [full-regression]
- **diag:** Relay crash log, inputs, beat to dev server
- **diag:** Replace the covering panel with a live relay status badge
- **courses:** Add monsoon, stormline, volcanic race configs
- **courses:** Scale rings and items, add course traffic
- **road:** UV0 on road ribbons with seam-free classic road rows
- **settings:** Ultra quality tier above High
- **lighting:** Per-time-of-day Coast environment, exposure and colour grade (not wired yet)
- **lighting:** Drive the Coast look from the race visual preset and quality tier
- **assets:** Coast-scenery GLB (cliffs, rocks, sea arch, palms, guard rail) with manifest entry
- **coast:** Place coast-scenery.glb pieces in deterministic 120 m chunks
- **coast:** Load the scenery GLB on Coast Medium+ and attach it before GO
- **coast:** KTX2 photoscanned asphalt on Coast Medium+ with a uniform-driven wet variant
- **coast:** High uses the 2K asphalt, Ultra adds a detail normal (task 5 tier table)
- **vfx:** Board effects - magenta plume tail, rain wheel spray, Ultra-only stronger motion blur
- **world:** Tighter, darker contact shadow under the car (board panel 1)
- **coast:** Lights-only wet-road mirror on High/Ultra, chosen over a planar Reflector by benchmark
- **coast:** Bloom tuned for the light blades and sun matched to each Coast HDRI
- **vfx:** Thruster glow discs in flight and under boost (board panel 3)
- **diag:** Log frame-time stats and quality tier in beats
- **3d:** Gate the Phase 3 look behind ?look=3d
- Add native 3x eight-frame transparent looping Garage GIF
- Render looping GIF highlights over native Garage and Studio artwork
- Render looping GIF highlights over native Garage and Studio artwork
- Render looping GIF highlights over native Garage and Studio artwork
- Match Garage GIF overlay assets to native 3x dimensions [full-regression]
- Add source-preserving Garage GIF animation renderer with six behaviors
- Lazy-load per-artwork GIF with original image and reduced-motion fallbacks
- Render original-art motion directly in GarageArtworkTile.vue
- Render original-art motion directly in GarageSkinCatalog.vue
- Render original-art motion directly in GaragePaintPreview.vue
- Replace warp GIFs with 39 source-faithful per-object animations [full-regression]
- **garage:** Replace 14 sweep GIFs with css sweep
- **courses:** Restore Monsoon, Stormline and Volcanic races; all six Coming Soon courses playable in dev [full-regression]
- **3d-pipeline:** Garage-only ?model=probe adapter with lifecycle specs
- **audio:** Give each course its own race song
- **tracks:** Reward long-form shortcuts densely
- **dev:** Add 3d=1 make param for 3d redirect
- **dev:** Enable all non-circuit race modes for six upcoming courses

### 🐛 Bug Fixes

- Prevent duplicate SELECTED labels when inspecting an upcoming map
- Keep canvas swipes from replacing a selected coming-soon preview
- Keep canvas swipes from replacing a selected coming-soon preview
- Keep canvas swipes from replacing a selected coming-soon preview
- Preserve playable Start CTA name and guarantee solo score gates [full-regression]
- Use ES2022-compatible score-gate lookup [full-regression]
- Clear upcoming showcase on Event Lab selection [full-regression]
- **release-notes:** Start refused hero on first touch
- **ui:** Import package.json with json attributes
- **home:** Reuse existing track swipe for Coming Soon 3D previews [full-regression]
- **release-notes:** Announce notes to first-time players
- Commit preview swipe before GPU transition and honor auto-open release dialog [full-regression]
- **roadster:** Replace flat white nose face with carbon band, black intake and splitter
- **tracks:** Keep preview-only Coming Soon inaccessible even in unlocked dev [full-regression]
- **dev-feature:** Enforce TypeScript unlocked access and fail closed for stale previews
- **release:** Filter Coming Soon courses from production unlocks
- **tracks:** Gate preview START independently of saved unlocks
- **garage:** Restore scenic showcase framing
- **frostbite:** Make glacier and aurora decks solid
- **frostbite:** Keep rival hops out of solid decks
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **coursegraph:** Stabilize steep road frames and trusted fleet steps [full-regression]
- **coursegraph:** Permit trusted flight above road without gate bypass [full-regression]
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync canonical no-car teasers and rollback rules from develop
- **ci:** Pin Playwright to locked version during typechecks [full-regression]
- **assets:** Replace five track teasers with clean 568x205 artwork
- **assets:** Preserve original teaser scenes, clean captions and borders
- **assets:** Remove remaining volcanic seam and refine monsoon text removal
- **assets:** Restore natural monsoon sky behind removed caption
- **assets:** Use newly illustrated textless Frostbite teaser at 568x205
- **ci:** Restore quality-gate order lost in an earlier garage merge
- **ci:** Accept looped release clip time in viewer handoff test [full-regression]
- **ci:** Restore quality-gate order lost in an earlier garage merge
- **store:** Preserve repaired full-color icon pixels in lossless PNG export [render-store-png]
- **store:** Align preview detail availability with selected item and capture visual evidence [full-regression]
- **garage:** Frame raised Flight pose; align ring and bonus-gate regressions with scaled layouts [full-regression]
- **results:** Accept eight-car mode placements and preserve Circuit finish after pause; sync develop [full-regression]
- **ci:** Localize 3x HUD gallery, restore gameplay fixtures and deterministic risk/callout checks; sync develop [full-regression]
- **ui:** Fit desktop 900px home and record reviewed CSS/DOM contract [full-regression]
- **ci:** Start real ring race and stabilize home/video regression timing [full-regression]
- **home:** Clear 44px footer hitbox at 900px desktop [full-regression]
- **garage-vfx:** Use independent native 3x PNG badges [full-regression]
- **garage:** Preserve native 1x VFX thumbnails in narrow Studio sidebar [full-regression]
- **ci:** Stabilize Garage VFX artwork and browser regression assertions [full-regression]
- **ci:** Restore valid Garage cosmetics browser spec after patch corruption [full-regression]
- **garage:** Prevent 3x VFX thumbnails shrinking in landscape [full-regression]
- **ci:** Stabilize real ring reward and release video handoff browser tests [full-regression]
- **wave3:** Reconcile Store entry icon and gallery-scoped Garage art tests [full-regression]
- **garage-vfx:** Remove stray sprite fragment from Limited badge PNG [full-regression]
- **assets:** Crop LaMa model padding before compositing preview
- **assets:** Expand vehicle masks to remove residual details
- **ci:** Install typecheck tools against the lockfile [full-regression]
- **assets:** Remove cars from four existing track teaser scenes
- **assets:** Replace Monsoon teaser with approved vehicle-free rainforest scene
- **unlocks:** Never unlock preview-only courses in development or release
- **unlocks:** Never unlock preview-only courses in development or release
- **race-select:** Hard-block preview track IDs from START regardless of saved unlocks
- **dev-feature:** Require worktree-local TypeScript access and Coming Soon guard
- **release:** Guard direct race entry for all six unreleased tracks
- **browser:** Repair corrupted preview spec and test Frostbite P02 against original 3D UI
- **release:** Block direct START/restart while a Coming Soon preview is selected
- **race-select:** Use defined track.locked label
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync canonical no-car teasers and rollback rules from develop
- **garage:** Calibrate studio bloom for r186
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **dune:** Align canyon merge tangent and preserve route length [full-regression]
- **dune:** Make both canyon branches enter safe landing geometry [full-regression]
- **ci:** Wrap Start labels and hit-test phone swipe canvas [full-regression]
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **monsoon:** Position animated waterfall and mist in world space
- **monsoon:** Require ordered one-time checkpoints before finish [full-regression]
- **monsoon:** Validate signed checkpoint crossings and swept lateral obstacle encounters [full-regression]
- **monsoon:** Use scoped guardian face material to unblock typecheck
- **monsoon:** Smooth fork offset normal so edge arc-length stays physical
- **monsoon:** Align ford water depth and swept obstacle contact [full-regression]
- **monsoon:** Align viaduct and scale streamed scenery; repair responsive Start [full-regression]
- **monsoon:** Match rainforest geometry and world-space terrain contact [full-regression]
- **monsoon:** Smooth valley terrain and wet-contact transitions [full-regression]
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **monsoon:** Scene test picks the trunk and left-terrain meshes, not the last same-named node
- **monsoon:** Remove road shoulder ledge and align puddles to contact [full-regression]
- **ci:** Wrap Start labels and hit-test phone swipe canvas [full-regression]
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **skyfall:** Reject phantom road contact outside a graph edge [full-regression]
- **skyfall:** Preload graph joins one full chunk [full-regression]
- **ui:** Allow Start button label to wrap into two lines [full-regression]
- **skyfall:** Align first aerial landing tangent with merged road [full-regression]
- **skyfall:** Suspend island terraces below drivable road [full-regression]
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **stormline:** Keep puddles non-solid while preserving construction collision metadata
- Anchor Stormline neon billboards to world distance [full-regression]
- Skip degenerate Stormline road streaming geometry [full-regression]
- **stormline:** Anchor streamed towers and viaduct supports to edge distance [full-regression]
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **stormline:** Stream full canonical CourseGraph arc-length tail
- **stormline:** Reduce low-tier hairpin road contact chord error [full-regression]
- **ci:** Wrap Start labels and hit-test phone swipe canvas [full-regression]
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **tests:** Upcoming-tracks contract expects the sixth Frostbite Canyon card
- **ci:** Wrap Start labels and hit-test phone swipe canvas [full-regression]
- **assets:** Sync five textless track teasers and artwork rules from develop
- **assets:** Sync vehicle-free teaser scenes and rules from develop
- **hud:** Keep mode chip unclipped, clear of HUD
- **race:** Launch the grid rolling at go
- **tutorial:** Open practice with the race countdown
- **hud:** Reserve telemetry space during countdown
- **hud:** Reserve hidden telemetry for mode chip only
- **tutorial:** Keep the player's speed across lessons
- **tutorial:** Keep the full coach visible on pause screen
- **frostbite:** Restore competitive Normal AI pack after BOOST rework [full-regression]
- **callouts:** Preempt low-priority refill for airborne trick feedback [full-regression]
- NITRO retry and deterministic position-loss regression [full-regression]
- Rebalance Frostbite under shared rival BOOST and isolate unboosted speed tests [full-regression]
- **frostbite:** Restore line breaks in course config [full-regression]
- Handle interrupted NITRO, test deterministic position loss and tune Frostbite [full-regression]
- Separate endurance rival skill slots without changing player speed caps [full-regression]
- Restore Frostbite grid pace spread after shared rival upgrade
- **ui:** Fit pause and results panels on phone landscape without scrolling
- **ui:** Keep NEXT label and arrow inside the landscape action column
- **tutorial:** Drop slide-pad highlight on phone turn-left
- **callouts:** Preempt low-priority refill for airborne trick feedback [full-regression]
- Stop interrupted tutorial NITRO and surface barrel rolls [full-regression]
- **callouts:** Preserve earned high-priority chips while preempting low-priority text [full-regression]
- **ai:** Restore Frostbite pack spread and isolate throttle-only cap regression [full-regression]
- **ai:** Preserve long-course rival speed fairness and throttle-only regression [full-regression]
- **ai:** Restore frostbite rival pace spread
- **ai:** Show airborne trick over stale refill callout [full-regression]
- Immediately retry interrupted NITRO tutorial on release [full-regression]
- **tutorial:** Show NITRO retry READY immediately after release [full-regression]
- **ai:** Rebalance Frostbite rival grid and verify truly unboosted caps [full-regression]
- **frostbite:** Widen long-course grid pacing for throttle-only parity [full-regression]
- Make tutorial NITRO retry immediate and rank-motion test deterministic [full-regression]
- Preserve Frostbite rival grid balance and isolate throttle cap tests [full-regression]
- **callouts:** Preempt low-priority refill for airborne trick feedback [full-regression]
- **render:** Soften roadster reflections and rear led
- Restore Frostbite rival grid balance without changing shared driver rules [full-regression]
- **callouts:** Preempt low-priority refill for airborne trick feedback [full-regression]
- Keep risk ring chime below pickup loudness [full-regression]
- **merge:** Restore develop shared UI and regression coverage [full-regression]
- **3d-pipeline:** CreateModelCache defaults manifest to MODEL_MANIFEST
- **3d-pipeline:** Warn once when the ?model=probe Garage model falls back
- **3d-pipeline:** Restore verified probe master and ignore Blender backups [full-regression]
- **3d-pipeline:** Run one KTX2 pass per slot before meshopt
- **3d-pipeline:** Parse KTX2 GLBs in check-glb on Node
- **3d-pipeline:** Bind only wheels with a spin pivot
- **dune-tempest:** Support lower roadbed and separate sandy shoulder depth [full-regression]
- **skyfall:** Align flowing particles with island waterfall curtains (GREEN)
- Extend Stormline ground roadway past elevated-branch reunion [full-regression]
- Face road normals upward and keep elevated route and landmark sightlines clear
- Align Monsoon stone viaduct beneath raised shortcut
- **deploy:** Block netlify deploy on unauthorized domain
- **release:** Archive 0.26.0 notes to fit module size
- **volcanic:** Accept Volcanic Crown sprint bests in rules
- **cloud:** Keep fullest save under rules limit
- **six-course:** Accept Monsoon bests in rules and align tests with merged develop [full-regression]
- **garage-model:** Carry flare glow and Studio sweep onto GLB car
- **garage-model:** GLB car pulses with the post-hit grace fade
- **tutorial:** Hints name the controls the player's settings give them
- **tutorial:** Keep hint overlays off controls for a right-hand cluster
- **tutorial:** Drop FLY outline and key chip from the landing lesson
- **tutorial:** Phone-landscape coach card shows its whole text without scrolling
- **home:** Keep landscape mode tabs and panel in bounds
- **home:** Clear landscape gate overlaps on phones
- **home:** Keep landscape pinned row off track cards
- **home:** Lift landscape start above chrome toolbar
- **test:** Load app's cloud-view-state in avatar test
- **home:** Scale landscape home on short pages
- **dune:** Tangent-continuous junctions (Q9)
- **dune:** Keep flight pads authored and bound junction curvature
- **course-graph:** Carry road-frame lateral across kinked junctions
- **course-graph:** Allow authorized flight across ground junctions
- **course-runtime:** No dead window before nodes; alias-safe last
- **dune-tempest:** Gap-charge need from pulsed FLY usage
- **ai:** Restore meaningful rival pace spread with BOOST on long courses
- **ai:** Scope Frostbite rival balance without altering classic tracks
- **skyfall:** Pin flight junctions to the shared sampler heading (Q9) [full-regression]
- **skyfall:** Graded junction guides so ground edges never fold (Q9 review) [full-regression]
- **skyfall:** Release world after shared scene host reparents it [full-regression]
- **coursegraph:** Keep Dune and Skyfall out of World Tour scenery and theme crashes [full-regression]
- **coursegraph:** Honor World Tour legacy module line ceiling [full-regression]
- **coursegraph:** Restore world-tour-scene 453-line size contract [full-regression]
- Repair CourseGraph rendering and browser CI regressions
- **ci:** Report superseded runs' quality-gate as cancelled, not failed
- **diag:** Report the real iOS version when Safari 26 freezes the UA at 18.x
- **art:** Replace 18 clipped HUD controls with complete 3x WebP
- **upcoming-preview:** Make Dune Tempest and Skyfall showcase cars readable
- **showcase:** Bring all cars into readable desktop and portrait framing [full-regression]
- **showcase:** Retain Dune sandstorm and Skyfall cloud identity with legible cars [full-regression]
- **ci:** Port verified shared CourseGraph, UI and deterministic browser regressions
- **hooks:** Run unit tests on pre-push when code or tests change
- **hooks:** Clear git's repo env before pre-push runs the unit tests
- **garage-model:** GLB tail light follows the procedural rear LED
- **roadster:** Dressed GLB reflects the softened car map, not the full scene HDRI
- Keep lightweight GIF highlights visible at Low visual quality
- Correct GarageArtworkTile computed animation source TypeScript syntax
- Occlude moving airflow highlights behind transparent SVG car body
- Eliminate artificial checkered alpha dithering from Garage source GIFs
- Resolve animated GIF asset BASE_URL in Vue script module, not template
- Repair animated badge source/assertion browser fixture
- Physical flame and shockwave alpha motion plus hinged Store crate articulation
- **garage:** Preserve 20 distinct collection foil animation frames [full-regression]
- **ci:** Use current Node 22 for Garage GIF tests and TypeScript loaders [full-regression]
- **garage-art:** Preserve bright flare cores and intact moving store parts
- **garage:** Stop scoped :global() sweep rule from hiding body on Low VFX [full-regression]
- **ci:** Port verified shared CourseGraph, UI and deterministic browser regressions
- **garage:** Composite glow GIF edges onto the real card tint
- **art:** Add source-locked repair for original HUD artwork
- **art:** Preserve original HUD style and repair clipped source sprites
- **art:** Retire rejected HUD redesign generator and rebuild workflow
- **art:** Reframe original HUD sprites, remove foreign cutouts and preserve 3x artwork
- **art:** Repair 18 original HUD sprites without redesign
- **art:** Restore clipped original bevel corners and circular rims by matching symmetry
- **art:** Complete original HUD bezels and circle borders
- **art:** Blend original border pixels continuously; preserve intentionally open rings
- **art:** Make original HUD edges seamless and readable
- **art:** Remove frame seams; inpaint only missing pixels behind unmodified original artwork
- **art:** Restore original full-size HUD button bevels without seams
- **art:** Replace mirrored bezel defects and fill missing original enamel faces [GREEN]
- **art:** Restore original HUD bezels and missing faces without redesign
- **art:** Restore dark interior cutouts, avoid doubled speed gauge and button strip
- **art:** Preserve source semi-transparent enamel when restoring holes
- **art:** Restore original HUD bezels and missing faces without redesign
- **art:** Seam-free original gradient inpainting and remove detached nitro edge
- **art:** Restore original HUD bezels and missing faces without redesign
- **art:** Use matching lower enamel to restore tooltip without false rim
- **art:** Restore original HUD bezels and missing faces without redesign
- **art:** Redraw cropped HUD icons at native size
- Guard CourseGraph scenery and mobile overlays [full-regression]
- **ci:** Preserve CSS baseline while keeping device notice nonmodal
- **ci:** Record slow-runner perf frames and the requested clip hand-over frame [full-regression]
- **monsoon:** Run the jungle on past FINISH instead of a bare plane
- **home:** Paint the landscape rail outside the scrolling panel on iOS
- **home:** Paint the landscape rail outside the scrolling panel on iOS
- **rings:** Keep authored hoops out of PERFECT LINE group 0
- **rings:** Shrink a ring line by the gates its hoops replace
- **home:** Remember last picked course in memory
- **home:** Reopen raced course after back to home
- **minimap:** Draw coming soon course maps
- **i18n:** Use card names on route maps
- **home:** Align dune and skyfall showroom road contact and dune drive view
- **home:** Keep Skyfall grass below the roadway depth plane
- **home:** Preserve Dune hero framing while showing road ahead
- **epic:** Balance mapped shortcut rewards and pool Volcanic race lights
- **home:** Keep Skyfall island grass below undulating preview road
- **elimination:** Share endless road streaming across all tracks
- **i18n:** Resolve upcoming course labels from shared catalog

### 💼 Other

- Import first five tracks ten original views as JPEG references
- Add stage two five new course concepts as ten JPEG views
- Integrate latest develop into long-form track planning (preserve all assets and TODOs)
- Reuse committed Stage 1 JPEGs and schematic SVGs for coming-soon cards
- Add English and Traditional Chinese coming-soon track copy and CTA states
- Require real animated 3D homepage for five Stage 1 upcoming maps; JPEG only references
- Prioritize real animated 3D home scenes and TDD; JPEG-only preview is not done
- Bring latest develop into epic-multiroute-longform-tracks (preserve Stage 1 track planning and art)
- Bring develop vehicle-fleet and Roadster updates into animated Stage 1 showcase [full-regression]
- Latest develop UX; prevent localized Start CTA clipping [full-regression]
- **assets:** Run one-time original teaser crop repair
- **assets:** Run final teaser seam cleanup
- **assets:** Finalize monsoon caption retouch
- **develop:** Sync Wave 3 Economy foundation [full-regression]
- **develop:** Update Wave 3 Economy with Roadster 2 [full-regression]
- **wave3:** Integrate Economy Foundation into develop baseline
- **rewards:** Add generic transparent mission and medal icons [skip ci]
- **develop:** Integrate latest Wave 3 Rewards and shared UI [full-regression]
- **develop:** Sync Rewards with Roadster 2 Garage updates [full-regression]
- **wave3:** Export native transparent PNGs [full-regression]
- **wave3:** Integrate Rewards and Missions display into isolated branch
- **develop:** Integrate v0.29.0 updates into Store readiness [full-regression]
- **develop:** Sync Roadster 2 into Wave 3 Store [full-regression]
- **store:** Generate true-alpha 3x Store PNGs from independent SVG masters
- **store:** Publish verified transparent 3x Store PNG artwork
- **wave3:** Integrate Store Readiness preview with Economy and Rewards
- **develop:** Retain Garage VFX and latest 3x art, ring streaming and CI changes [full-regression]
- **develop:** Retain Garage Flight framing, HUD localization and latest Garage fixes [full-regression]
- **develop:** Preserve latest HUD and deterministic browser regression fixes [full-regression]
- **develop:** Integrate Wave 3 VFX without losing UI fixes [full-regression]
- **develop:** Preserve VFX flight framing with new Roadster wing [full-regression]
- **wave3:** Integrate VFX & Skins into isolated Garage Wave 3 integration [full-regression]
- **wave3:** Record Rewards develop back-merge 01637c6c (no tree change)
- **wave3:** Integrate latest develop 17c94d74 into Wave 3 integration [full-regression]
- Sync latest develop garage access contract into Coming Soon preview release [full-regression]
- **wave3:** Integrate latest develop c259675a (teaser artwork + rules) [full-regression]
- **wave3:** Integrate garage Wave 3 into develop [full-regression]
- **deps:** Add `@gltf`-transform/cli 4.5.1
- **deps:** Upgrade three to r186 and pin vue-tsc
- **deps:** Upgrade three to 0.186.1 + `@types`/three 0.186.0
- **3d-pipeline:** Integrate feature/3d-visual-fidelity-pipeline into develop [full-regression]
- **develop:** Integrate Garage Wave 3 and Three.js r186 safely [full-regression]
- **epic:** Integrate epic/develop e9e6dbca into playable-frostbite-canyon [full-regression]
- **frostbite:** Integrate playable-frostbite-canyon into epic [full-regression]
- **develop:** Sync develop e9e6dbca into playable-dune-tempest [full-regression]
- **dune-tempest:** Integrate feature/playable-dune-tempest handoff docs into epic
- **develop:** Sync develop e9e6dbca into playable-monsoon-ruins [full-regression]
- **monsoon-ruins:** Integrate feature/playable-monsoon-ruins handoff docs into epic
- **develop:** Sync develop e9e6dbca into playable-skyfall-archipelago [full-regression]
- **skyfall-archipelago:** Integrate feature/playable-skyfall-archipelago handoff docs into epic
- **develop:** Sync develop e9e6dbca into playable-stormline-megacity [full-regression]
- **stormline-megacity:** Integrate feature/playable-stormline-megacity handoff docs into epic
- **develop:** Sync develop e9e6dbca into playable-volcanic-crown [full-regression]
- **volcanic-crown:** Integrate feature/playable-volcanic-crown handoff docs into epic
- **epic:** Sync epic 9f6ba4be (Frostbite gate) into playable-stormline-megacity [full-regression]
- **epic:** Sync epic 7a631c53 (runbook, Frostbite record) into playable-stormline-megacity [full-regression]
- **stormline-megacity:** Integrate playable-stormline-megacity into epic [full-regression]
- **develop:** Integrate latest develop into six-course epic [full-regression]
- **playable:** Integrate feature/playable-frostbite-canyon into epic [full-regression]
- **make:** Add deploy-netlify target with live check
- Integrate develop into stormline
- Sync latest develop into stormline
- **playable:** Integrate feature/playable-stormline-megacity into epic [full-regression]
- **epic:** Sync epic 9f6ba4be (Frostbite gate) into playable-volcanic-crown [full-regression]
- **playable:** Integrate feature/playable-volcanic-crown into epic [full-regression]
- **epic:** Sync epic 9f6ba4be (Frostbite gate) into playable-monsoon-ruins [full-regression]
- **playable:** Integrate feature/playable-monsoon-ruins into epic [full-regression]
- **epic:** Sync epic 9f6ba4be (Frostbite gate) into playable-dune-tempest [full-regression]
- **playable:** Integrate feature/playable-dune-tempest into epic [full-regression]
- **epic:** Sync epic 9f6ba4be (Frostbite gate) into playable-skyfall-archipelago [full-regression]
- Integrate develop into skyfall
- Sync latest develop into skyfall
- **playable:** Integrate feature/playable-skyfall-archipelago into epic [full-regression]
- **develop:** Sync develop after six playable source history merges [full-regression]
- Bring latest develop into epic-home-art-dune-tempest (preserve Stage 1 track planning and art)
- Bring latest develop into epic-home-art-skyfall-archipelago (preserve Stage 1 track planning and art)
- Bring latest develop into epic-home-art-stormline-megacity (preserve Stage 1 track planning and art)
- Bring latest develop into epic-home-art-volcanic-crown (preserve Stage 1 track planning and art)
- Add Monsoon Ruins stage-one home teaser JPEG
- Bring latest develop into epic-home-art-monsoon-ruins (preserve Stage 1 track planning and art)
- **epic:** Sync six-course integration into Volcanic Crown work [full-regression]
- **volcanic:** Integrate Volcanic Crown runtime without CI waiting [full-regression]
- **epic:** Synchronize Monsoon with completed Volcanic source integration [full-regression]
- **monsoon:** Integrate Monsoon Ruins race without awaiting CI [full-regression]
- Synchronize develop into six-course epic [full-regression]
- Sync latest six-course epic into lifecycle branch [full-regression]
- Synchronize develop 27f2074f into six-course epic [full-regression]
- **volcanic:** Bring Volcanic Crown rules and playable-list fixes into epic [full-regression]
- Sync six-course epic (Volcanic+Monsoon+develop) into lifecycle branch [full-regression]
- **develop:** Sync into track-lifecycle-sop [full-regression]
- Integrate develop pre-push diagnostics into CourseGraph runtime [full-regression]
- **art:** Directly replace existing 18 WebPs on Wave3 HUD repair branch
- **lifecycle:** Integrate track lifecycle SOP into six-course epic [full-regression]
- **upcoming-preview:** Readable Dune Tempest and Skyfall showcase cars [full-regression]
- **develop:** Sync upstream into epic preserving TODO sections
- **assets:** Reproducible Poly Haven CC0 source fetch for Task 5
- **assets:** Baked KTX2 Coast asphalt PBR set (CC0 Asphalt 02) with manifest
- **assets:** Per-asset ETC1S override for data maps in optimize-glb (coast-scenery)
- **assets:** Coast close-scenery Blender master, build scripts and baked textures (CC0 Poly Haven scans)
- Commit 39 original-art Garage animations
- Commit 39 original-art Garage animations
- Commit 39 original-art Garage animations
- Commit 39 original-art Garage animations
- **gifs:** Integrate develop into feature/garage-preview-animated-gifs [full-regression]
- **gifs:** Integrate develop into feature/garage-preview-animated-gifs [full-regression]
- **garage:** Add repo-native approved sprite-sheet GIF packager [full-regression]
- **garage:** Stage source-faithful GIF animator batch 1/4
- **garage:** Stage source-faithful GIF animator batch 2/4
- **garage:** Stage source-faithful GIF animator batch 3/4
- **garage:** Render 25 source-locked 20fps icon animations with strict review gate [full-regression]
- Commit 25 original-art Garage animations
- Commit 25 original-art Garage animations
- **garage:** Push repaired flare and store GIF binaries directly
- **garage:** Sync direct GIF repair byte sizes in manifest
- **garage:** Directly push repaired thruster GIF frames
- **garage:** Directly push repaired Nitro trail GIF frames
- **garage:** Directly push repaired colored and pulse flare GIF frames
- **garage:** Directly push remaining launch flare and ribbon GIF frames

### 🚜 Refactor

- Avoid empty image fetch and keep coming-soon route heading compact
- Stay within source module size ratchets for Stage 1 integration [full-regression]
- **audio:** Share user-activation listener helper
- **dev-feature:** Testable fail-closed worktree access checks
- **showcase:** Enforce shared six-course controls and Garage parity [full-regression]
- **wave3:** Reuse the same safe 3x artwork and neon card widgets for gallery
- **store:** Extract Store entry styles from oversized Garage panel [full-regression]
- **wave3:** Mission center reads the shared Wave 3 rewards catalog [full-regression]
- **home:** Place Coming Soon cards in existing track row without increasing intro height
- **frostbite:** Reuse original Stage 2 home metadata without enabling runtime
- **module-size:** Split oversized modules
- **ui:** Default sign-in button to the google mark
- **release:** Move 0.26-0.28 notes to archive
- **world:** Move sign text helpers to sign-text.ts
- **post:** Move the lens pass out of world.js (move-only)
- **world:** Move the RoomEnvironment prefilter out of world.js (move-only)
- **world:** Move the weather particle set out of world.js (move-only)
- **world:** Move the section sign materials out of world.js (move-only)
- **world:** Move classic sky dome, sun and sea into classic-backdrop.ts
- **world:** Move classic sea lines and far mountains into classic-backdrop.ts
- **world:** Move the landmark-bounds search into landmark-bounds.ts
- **world:** Move the car contact shadow into contact-shadow.ts

### 📚 Documentation

- Record six planned multi-route long-form tracks and acceptance gates
- Design and implementation roadmap for multi-route long courses
- Design and implementation roadmap for multi-route long courses
- Scope epic world expansion to five distinct tracks
- Scope epic world expansion to five distinct tracks
- Scope epic world expansion to five distinct tracks
- Add open-route concept schematic for dune-tempest
- Add open-route concept schematic for monsoon-ruins
- Add open-route concept schematic for skyfall-archipelago
- Add open-route concept schematic for volcanic-crown
- Add open-route concept schematic for stormline-megacity
- Index committed open-course maps and artwork provenance
- Clarify point-to-point default, discuss lap variants and reference SVG art
- Clarify point-to-point default, discuss lap variants and reference SVG art
- Clarify point-to-point default, discuss lap variants and reference SVG art
- Recommend five consistent point-to-point races, circuit as separate mode
- Recommend five consistent point-to-point races, circuit as separate mode
- Recommend five consistent point-to-point races, circuit as separate mode
- Recommend five consistent point-to-point races, circuit as separate mode
- Add two-view point-to-point visual concept storyboard for dune-tempest
- Add two-view point-to-point visual concept storyboard for monsoon-ruins
- Add two-view point-to-point visual concept storyboard for skyfall-archipelago
- Add two-view point-to-point visual concept storyboard for volcanic-crown
- Add two-view point-to-point visual concept storyboard for stormline-megacity
- Lock five one-way course visuals to track-by-track reference and acceptance matrix
- Add machine-readable manifest for five point-to-point concept references
- Lock five point-to-point maps and link committed visual storyboards
- Lock five point-to-point maps and link committed visual storyboards
- Lock five point-to-point maps and link committed visual storyboards
- Lock five point-to-point maps and link committed visual storyboards
- Preserve checksums and future paths for twelve original AI PNG references
- Link verified original-PNG checksum manifest from planning references
- Link verified original-PNG checksum manifest from planning references
- Link verified original-PNG checksum manifest from planning references
- Add standalone dune-tempest ground-view concept preview
- Add standalone dune-tempest aerial-view concept preview
- Add standalone monsoon-ruins ground-view concept preview
- Add standalone monsoon-ruins aerial-view concept preview
- Add standalone skyfall-archipelago ground-view concept preview
- Add standalone skyfall-archipelago aerial-view concept preview
- Add standalone volcanic-crown ground-view concept preview
- Add standalone volcanic-crown aerial-view concept preview
- Add standalone stormline-megacity ground-view concept preview
- Add standalone stormline-megacity aerial-view concept preview
- Index and embed all ten independent ground/aerial concept SVGs
- Bind per-track visual fidelity to all ten committed camera images
- Map ten standalone concept images to five course camera references
- Align new branch naming and ten ground/air visual references
- Align new branch naming and ten ground/air visual references
- Align new branch naming and ten ground/air visual references
- Align new branch naming and ten ground/air visual references
- Add stage two frostbite-canyon single-finish route schematic
- Add stage two abyssal-ruins single-finish route schematic
- Add stage two windspire-highlands single-finish route schematic
- Add stage two crystal-stardust-valley single-finish route schematic
- Add stage two chrono-rift single-finish route schematic
- Add stage two five-track JPEG gallery and visual fidelity references
- Add stage two five-track JPEG gallery and visual fidelity references
- Add stage two five-track JPEG gallery and visual fidelity references
- Specify five new stage two point-to-point courses and TDD implementation plan
- Specify five new stage two point-to-point courses and TDD implementation plan
- Record next five planned tracks, JPEG references and pending TDD milestones
- Link committed stage one JPEG art and stage two five-track gallery
- Add real stage one JPEG references to visual fidelity requirements
- Mark stage one JPEG art committed and link Stage 2 manifest
- Reconcile original PNG provenance and committed Stage 1/2 JPEG galleries
- Reconcile original PNG provenance and committed Stage 1/2 JPEG galleries
- Reconcile original PNG provenance and committed Stage 1/2 JPEG galleries
- Add reproducible concept-to-WebGL visual acceptance gate for all 10 planned tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Enforce reproducible ground/aerial concept-to-WebGL acceptance for new tracks
- Link strict visual-acceptance gate from both stage design specs
- Link strict visual-acceptance gate from both stage design specs
- Five independent Stage 1 home artwork chat prompts with isolated ownership
- Specify Stage 1 coming-soon cards, safe state, i18n CTA and parallel art ownership
- Track five coming-soon home previews and independent art branches with open CI gates
- Add six isolated GPT chat prompts and ownership for Stage 1 home teaser implementation
- Split six-chat homepage work into art, UI TDD, preview QA and exact-HEAD CI gates
- Link six-GPT parallel execution, shared UI owner and art branch boundaries
- Link six-GPT parallel execution, shared UI owner and art branch boundaries
- Link six-GPT parallel execution, shared UI owner and art branch boundaries
- Correct home preview spec from JPEG overlay to animated 3D showroom
- Rewrite all six GPT prompts for real animated per-map Three.js home scenes
- Make real animated 3D Stage 1 homepage binding in CLAUDE.md
- Prioritize animated Three.js homepage for five coming-soon tracks in TODO
- Replace obsolete five JPEG-only art prompts with five Three.js scene tasks
- Align track art and long-form spec with animated 3D homepage-first acceptance
- Align track art and long-form spec with animated 3D homepage-first acceptance
- Align track art and long-form spec with animated 3D homepage-first acceptance
- Align track art and long-form spec with animated 3D homepage-first acceptance
- Align track art and long-form spec with animated 3D homepage-first acceptance
- Audit old art branch changes, preserve all user assets and resume safe 3D six-chat prompts
- Make all six GPT prompts preserve previous JPEG/notes and read 3D spec from shared branch
- Remove stale JPEG-only TODOs; keep user's prior art and prioritize live 3D scene work
- **security:** Add release security checklist
- **frostbite:** Capture two-reference visual and gameplay design
- **frostbite:** Add detailed TDD implementation milestones
- **frostbite:** Add full and short implementer prompts
- **frostbite:** Record WebGL evidence and TODO gates [full-regression]
- **unlocks:** Explain all Make variants and independent Coming Soon release policy
- **merge:** Require independent preview locks before develop or release [full-regression]
- **assets:** Align Frostbite no-car teaser, rules and rollback ledger with develop
- **assets:** Enforce textless 568x205 track teaser artwork contract
- **claude:** Forbid personal paths in committed files
- **spec:** Define SDD and BDD for garage-economy-foundation
- **plan:** Create Superpowers SDD-BDD-TDD plan for garage-economy-foundation
- **prompt:** Add standalone GPT Wave 3 assignment for garage-economy-foundation
- **wave:** Specify GPT-made assets and transparent-background policy for garage-economy-foundation
- **plan:** Add conditional GPT asset generation and alpha QA task for garage-economy-foundation
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for garage-economy-foundation
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Require actual approved-art visual gate [skip ci]
- **dispatch:** Require user-approved reference fidelity [skip ci]
- **wave3:** Point Garage Economy Foundation at verified 59-image source library
- **wave3:** Make 3x source archive discoverable from economy agent and dispatch entrypoints
- **wave3:** Record v0.29.0 completion roadmap, TDD gates, and honest blockers
- **economy:** Keep art acceptance open until visual and CI evidence [full-regression]
- **spec:** Define SDD and BDD for garage-rewards-and-missions
- **plan:** Create Superpowers SDD-BDD-TDD plan for garage-rewards-and-missions
- **visual:** Add screen and asset design prompt for garage-rewards-and-missions
- **plan:** Add visual art direction and responsive asset gate for garage-rewards-and-missions
- **prompt:** Add standalone GPT Wave 3 assignment for garage-rewards-and-missions
- **wave:** Specify GPT-made assets and transparent-background policy for garage-rewards-and-missions
- **visual:** Add optional GPT image creation and alpha asset QA for garage-rewards-and-missions
- **plan:** Add conditional GPT asset generation and alpha QA task for garage-rewards-and-missions
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for garage-rewards-and-missions
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Reference prebuilt SVG assets and avoid regeneration [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Require actual approved-art visual gate [skip ci]
- **dispatch:** Require user-approved reference fidelity [skip ci]
- **visual:** Require true reference assets before image generation [skip ci]
- **assets:** Specify verified 3x art pack, 1x CSS sizing and pending import [skip ci]
- **dispatch:** Require 3x raster to display at 1x CSS dimensions [skip ci]
- **assets:** Commit exact 3x filenames, checksums and 1x import contract for garage-rewards-and-missions [skip ci]
- **plan:** Link exact raster handoff and CSS sizes [skip ci]
- **dispatch:** Point to exact 3x image manifest [skip ci]
- **assets:** Use valid candidate key in integration example [skip ci]
- **wave3:** Guide rewards and missions to 8 verified original 3x WebPs and 1x CSS
- **wave3:** Update garage-rewards-and-missions raster handoff with verified 3x Git source
- **wave3:** Make 3x source archive discoverable from rewards agent and dispatch entrypoints
- **wave3:** Record all 8 verified 3x source images and non-entitlement UI integration
- **store:** Map independent 3x PNG sources and honest no-commerce UI acceptance
- **store:** Track pending PNG, real UI and exact-HEAD regression gates
- **wave3:** Plan Go authoritative backend with no-regression and anti-cheat gates
- **wave3:** Track deferred Go backend prerequisites, compatibility and anti-cheat in TODO
- **assets:** Clarify vehicle-free teaser requirements and Monsoon replacement
- Log wave 3 integration notes
- **assets:** Record canonical no-car teaser SHAs and safe rollback steps
- **assets:** Record five teaser image commits, blob SHAs and rollback sources
- Record 3d pipeline audit
- **3d:** Add reusable multi-device Phase 0 environment acceptance contract
- **3d:** Link standalone cross-device Phase 0 acceptance
- **3d:** Link standalone cross-device Phase 0 acceptance
- **3d:** Link standalone cross-device Phase 0 acceptance
- **3d:** Link standalone cross-device Phase 0 acceptance
- **security:** Keep Phase 0 device audit local and name model after PASS
- **security:** Keep device names and Phase 0 evidence off public GitHub
- **security:** Keep device names and Phase 0 evidence off public GitHub
- **security:** Keep device names and Phase 0 evidence off public GitHub
- **security:** Keep device names and Phase 0 evidence off public GitHub
- Redact local path in handoff
- Align pinned blender mcp setup
- Clarify phase zero acceptance scope
- **todo:** Mark 3d pipeline phase 0 done
- **3d-pipeline:** Make glTF Transform required
- **claude:** Scope 3D tooling installs
- Defer asset checks to pipeline phase
- **3d-pipeline:** Split plan into per-task files
- **3d-pipeline:** Split phase 0-1 by project/device
- **dune:** Record course graph handoff and pending runtime gates [full-regression]
- **dune:** Record blocked source full-CI merge and runtime acceptance gates
- **assets:** Sync no-car teaser rollback ledger and scoped rules
- **monsoon:** Document integrator interfaces and outstanding playable/visual gates
- **monsoon:** Render backtick code references correctly
- **monsoon:** Track implemented modules and unverified regression/visual gates [full-regression]
- **monsoon:** Hand off edge IDs, gate crossing, collision and river visuals [full-regression]
- **monsoon:** Record exact-HEAD CI failures, scoped repair and acceptance blockers
- **assets:** Sync no-car teaser rollback ledger and scoped rules
- **skyfall:** Hand off streamed scene and outstanding validation gates
- **skyfall:** Record TDD and request exact-HEAD full regression [full-regression]
- **skyfall:** Record map fixes and pending exact-HEAD acceptance [full-regression]
- **assets:** Sync no-car teaser rollback ledger and scoped rules
- **stormline:** Document integration contract and unverified QA gates
- **stormline:** Update calibrated route length and outstanding time trial gate
- Record Stormline chunk fixes and outstanding exact-HEAD acceptance [full-regression]
- Record Stormline tunnel milestone and unverified acceptance [full-regression]
- **assets:** Sync no-car teaser rollback ledger and scoped rules
- **assets:** Sync no-car teaser rollback ledger and scoped rules
- **todo:** Record Frostbite → epic integration SHAs, CI runs and acceptance
- **six-course:** Add playable runbook with Option B decision for Dune/Skyfall
- **six-course:** Point TODO at playable runbook
- **3d-pipeline:** Tick verified Phase 1 items
- **3d-pipeline:** Record Phase 1 CI SHA and run IDs
- **3d-pipeline:** Tick verified Phase 1 D1/D2/D5/D6
- **3d-pipeline:** Tick Phase 1 D8 owner screenshot review
- **3d-pipeline:** Tick Phase 1 D9 owner phone run
- **3d-pipeline:** Tick Phase 1 after full CI on 4b5843a9
- **3d-pipeline:** Tick Phase 0 cross-device documentation box
- **3d-pipeline:** Record Phase 1 CI run and device scope
- **todo:** Record related browser spec results for minimap player marker
- **todo:** Record edge-docked race HUD evidence
- **readme:** Document ring-variety script and evidence
- **rules:** Add ring-layout rule and TODO evidence
- Document catch-up items in README and rule
- **todo:** Record related browser spec results for minimap player marker
- **readme:** Document rival balance harness
- **todo:** Add ground and air charge pickup items
- **readme:** Refresh screenshots for v0.30.0
- **readme:** Align descriptions with current mechanics
- **release:** Ask deploy target, Pages recommended
- **todo:** Record ring collect sound evidence
- **cloud:** Describe results cloud line and evidence
- **todo:** Record catch-up branch review evidence before merge
- **todo:** Record ci repair verification
- **todo:** Record results cloud-sync verification evidence
- **todo:** Record vehicle lighting balance evidence
- **lifecycle:** Approve track lifecycle design (Coming Soon to release gates)
- **lifecycle:** Add track lifecycle implementation plan
- **3d-pipeline:** Tick Task 3 by-project items with Phase 2 evidence
- **todo:** Record Phase 2 GLB pipeline evidence ledger
- **3d-pipeline:** Add target-look concept board and reference it
- **3d-pipeline:** Record KTX2 contract and roadster2 task evidence
- **3d-pipeline:** Record roadster2 it6 acceptance
- **3d-pipeline:** Record KTX2 texture compression and make verify on 2eb4c629
- **3d-pipeline:** Record make verify on merge c2b1cd87
- **3d-pipeline:** Record owner visual sign-off on roadster2 it6
- **3d-pipeline:** Plan Phase 2b hero Roadster GLB on Home and in races
- **3d-pipeline:** Split Phase 3 evidence item; record make verify and pending develop CI
- **todo:** Record ring-variety WebGL screenshot review
- Record Dune Tempest homepage art direction and generation blocker
- **dune-tempest:** Preserve art provenance and describe live 3D scene handoff [full-regression]
- **dune-tempest:** Align canyon roadbed and stone ring positions [full-regression]
- **dune-tempest:** Document live sunset and haze motion [full-regression]
- **skyfall:** Document live 3D scene handoff and visual acceptance gaps
- Record Stormline Megacity stage-1 home art handoff and binary import blocker
- Preserve Stormline art provenance and document live 3D handoff [full-regression]
- Align Stormline road handoff with extended landing continuity [full-regression]
- **volcanic-crown:** Record source visual anchors and pending WebGL gates
- Record Monsoon Ruins home art composition and provenance
- Preserve Monsoon JPEG provenance and document live 3D scene handoff
- **six-course:** Record actual Stormline CI and remaining playable gates [full-regression]
- **lifecycle:** Add SOP, scoped rule and six evidence records [full-regression]
- **3d-pipeline:** Record Phase 2b evidence, tier metrics and Mac frame times
- **3d-pipeline:** Phase 2b done; owner waived manual acceptance and CI wait
- **release:** Draft upcoming what's new notes
- **tutorial:** Document live cues and lesson timing
- **todo:** Record tutorial guided timing evidence
- **3d-pipeline:** Plan Phase 2c Garage equipment and VFX
- **3d-pipeline:** Phase 2c evidence, owner review pending
- **3d-pipeline:** Record Phase 2c re-run on 1efa389c
- **3d-pipeline:** Close Phase 2c with owner waiver
- **course-graph:** Design and plan for CourseGraph race runtime (Dune, then Skyfall)
- **course-graph:** Record user decisions on Q1-Q9
- **todo:** Record gap-margin and constant-mirror follow-ups
- **todo:** Course-graph-runtime handoff state after Task 7
- **course-runtime:** Ledger Task 14 changes and unresolved validation gates
- **six-course:** Record develop sync, Volcanic/Monsoon fixes and lifecycle merge [full-regression]
- **todo:** Record Dune/Skyfall preview clarity evidence [full-regression]
- **epic:** Record upstream merge and showcase readability work with honest verification gates
- **todo:** Record green exact-HEAD CI for ring-sfx fix
- **3d-pipeline:** Adopt the concept board as target in spec/plan v2
- **3d-pipeline:** Record Phase 2c owner marks, tail-light tuning and 2d gates
- **3d-pipeline:** Owner accepts Phase 2 manual checks, defers default-on
- **3d:** Task 5 owner decisions and Coast look brief
- **3d:** Tick Task 5 Coast items that have evidence; split the partly-done ones
- **3d:** Tick Task 5 lighting, wet road, Ultra and effects boxes with evidence
- **3d:** Task 5 Roadster rain fix, one-Mac by-device tables and thermal summary; phone items stay open
- **3d:** Record phase 7 owner decisions
- **3d:** Expand coast scope to full-scene upgrade
- **3d:** Coast full-scene gap list and owner decisions
- Record Garage GIF acceptance gates [full-regression]
- Record 39 verified source GIF exports and remaining CI/manual acceptance gates
- Record real 39-icon art-direction RED/GREEN evidence [full-regression]
- Record GIF Vite template fix and rerun full verification [full-regression]
- Record GIF RED to GREEN evidence and trigger exact-HEAD [full-regression]
- **garage:** Add gpt gif production brief [full-regression]
- **art:** Establish source-locked animated image production rules [full-regression]
- **art:** Link reusable animation production rule from CLAUDE.md [full-regression]
- **art:** Reference actual Garage GPT GIF production brief
- **art:** Document in-repository sprite-sheet packaging workflow [full-regression]
- **garage:** Keep GIF generator until all 25 GPT GIFs land [full-regression]
- **garage:** Record source-locked GIF visual QA blockers and CI evidence
- **art:** Record original-style HUD repair evidence and pending device validation
- **art:** Record RED/GREEN source preservation and image clarity limitations
- Generalize changeable gameplay values
- **todo:** Record real-iPhone landscape retest for the rail fix
- **rules:** Add orientation-layout rule; move file-scoped guidance out of CLAUDE.md
- **todo:** Record ring line groupSize follow-up evidence
- **release:** Review 0.31.0 notes
- **todo:** Drop uncommitted minimap notes

### ⚡ Performance

- **catch-up:** Cache length-scaled settings per race instead of every step
- **course-runtime:** Add repeatable 60-Hz Coast vs Dune race-step benchmark [full-regression]
- **home:** Reuse nearby 3D preview stages and commit swipes once

### 🎨 Styling

- Differentiate coming-soon teasers and keep localized start button width fixed
- **home:** Keep release Coming Soon gallery compact and accessible on phones
- **previews:** Retain existing home height and display whole cover images
- **home:** Restore original Coming Soon card/minimap typography and responsive START CTA
- **home:** Restore original landscape phone Coming Soon preview and CTA width
- **frostbite:** Retain original Coming Soon CTA typography while preserving fixed button widths
- **world:** Keep Endless frame predicate within existing module-size ceiling

### 🧪 Testing

- **red:** Define Stage 1 preview-only tracks and localized start CTA contract
- Cover five teaser cards, keyboard guard, locales and fixed CTA widths
- Keep last playable track centered when coming-soon cards follow
- Validate Stage 1 coming-soon home UI [full-regression]
- Stage 1 coming-soon homepage full regression [full-regression]
- Cover preview exit via Event Lab and keyboard carousel [full-regression]
- Define upcoming Three.js showcase lifecycle contract (RED)
- Verify actual showroom road surface and instanced city; scope browser selector [full-regression]
- Count playable and Stage 1 preview cards [full-regression]
- **release-video:** Hero starts on first touch if refused
- Cover home scroll transitions into Coming Soon scenes [red]
- Assert canvas hit target for Stage 1 phone swipe [full-regression]
- **upcoming:** Switch locale through the custom picker after develop hid #locale-select
- **tracks:** Cover release fail-closed with stale unlocks and preview runtime
- **unlocks:** Verify all Make entrypoints use one development-only policy
- **dev-feature:** Verify alias and stale Coming Soon runtime rejection
- **track-swipe:** Follow click-before-slide commit
- **courses:** Use physical arc-length and ULP-tolerant bank checks [full-regression]
- **garage:** RED guard Wave3 previews and approved public-trial VFX integration
- **economy:** Align locked Garage read contract [full-regression]
- **garage:** Select Store filter without matching preview cards [full-regression]
- **wave3:** RED 8 original 3x garage-rewards-and-missions images need safe Garage UI
- **art:** RED shared 3x cards need safe frames and caption separation at all viewports
- **wave3:** RED read-only interactive mission/store catalog with bilingual 3x artwork
- **wave3:** Exercise locale switch outside modal before reopening preview
- **garage:** RED guard Wave3 previews and approved public-trial VFX integration
- **wave3:** Specify verified settlement and safe retry boundary [full-regression]
- **wave3:** Specify eight-car finish placement display badge [full-regression]
- **wave3:** Require real Classic result to show localised podium display badge [full-regression]
- **wave3:** Verify real 288px trophy renders at 48 CSS px across result devices [full-regression]
- **rewards:** Match literal WebP extension in podium asset assertions
- **wave3:** RED reproduce missing native transparent PNG art and real UI wiring
- **wave3:** Cover mission PNG alpha, locale and missing-art fallback [full-regression]
- **wave3:** RED assert 8 native PNGs appear on Garage, not only Gallery [full-regression]
- **results:** Align full browser podium assertion with 3x RGBA PNG display [full-regression]
- **wave3:** Fail-closed shop with bilingual preview-only labels [full-regression]
- **wave3:** Require visible disabled Shop state on mobile and desktop [full-regression]
- **wave3:** Await 3x icon decode and correct Store asset matcher [full-regression]
- **store:** Distinguish six source cards from 3x entrance icon [full-regression]
- **store:** Observe actual stale-build navigation without missed load event [full-regression]
- **store:** Specify nontransactional catalog status contract [full-regression]
- **store:** Make missing presentation behavior an assertion RED [full-regression]
- **store:** Require six independent native-size transparent PNG icons
- **store:** Decode all legal PNG filters before alpha audit
- **store:** Validate isolated PNG primary art and fallback at three viewports
- **store:** Cover browser catalog statuses, locale, nonpurchase, fallback and reduced motion
- **store:** Expose direct accessible entry and safe catalog open behavior
- **store:** Expose direct accessible entry and safe catalog open behavior
- **store:** Correct PNG and WebP fallback browser assertions
- **store:** Correct PNG and WebP fallback browser assertions
- **store:** Preserve every decoded WebP pixel in isolated RGBA PNG export
- **store:** Compare PNG versus WebP with proper URL extension regex
- **store:** Require matching detail availability in English and zh-TW (RED)
- **ci:** Restore Garage zoom, NITRO, endless and 3x artwork regression coverage [full-regression]
- **nitro:** Accept earned partial charge from seeded rings before full HUD boundary [full-regression]
- **nitro:** Collect a deterministic live first ring group before HUD assertions [full-regression]
- **ci:** Align reviewed CSS contract with desktop header clearance [full-regression]
- **garage-vfx:** Correct native PNG badge assertions [full-regression]
- **garage:** Reproduce missing Airflow PNGs and preview state [full-regression]
- **garage:** Require live skin artwork in Garage Studio [full-regression]
- **results:** Poll trophy size after the podium reveal animation [full-regression]
- **garage:** Measure pose row after the Garage dialog slide-in finishes [full-regression]
- **previews:** Assert six Coming Soon cards stay unenterable across release and unlocked modes
- **dev-feature:** Verify worktree-ready unlock guard for Coming Soon
- **release:** Fail closed direct START and restart even in Daily mode
- **home:** Keep last playable track centred with Coming Soon cards after it
- **previews:** Require original selectable cards, route thumbnails and dynamic CTA before port
- **showcase:** Preserve five original 3D scenes and use safe Frostbite JPEG fallback
- **browser:** Verify all six original selectable Coming Soon cards, minimaps, CTA and i18n
- **swipe:** Retain original preview card navigation contract for all-unreleased tracks
- **home:** Update track focus regression for selectable Coming Soon cards
- **red:** Require Frostbite Canyon to mount native 3D home scenery
- **browser:** Restore intact original preview interactions and cover six 3D scenes incl Frostbite P02
- **red:** Port Frostbite original P01/P02 live WebGL, aurora, mobile and airflow browser gates
- **red:** Guard selected Coming Soon against direct race entry and share Frostbite source metadata
- **previews:** Expect frostbite-canyon hero preview
- **3d-pipeline:** Add r180 baseline capture and RED three-version contract
- **garage:** Wait for lazy badge art to decode before asserting
- **3d-pipeline:** Strengthen r180 baseline capture
- **dune:** Check branches hairpins hazards and route geometry
- **dune:** Validate directional checkpoint crossings [full-regression]
- **dune:** Export verified map-owned runtime contracts [full-regression]
- **monsoon:** Define route graph, contact and collision contracts (RED)
- **monsoon:** Require distinct hairpins instead of repeated samples of one bend
- **monsoon:** Verify 3D landmarks, animated falls, branch meshes, reduced motion and disposal (RED)
- **monsoon:** Require visible ford water and support piers (RED)
- **monsoon:** Require constant-speed arc-length sampling for each real fork (RED)
- **monsoon:** Guard collisions between disconnected route edges
- **monsoon:** Reject reordered or replayed finish gates (RED)
- **monsoon:** Require signed world-space gates and diagonal swept obstacle hits (RED)
- **monsoon:** Enforce compatibility for every authored CourseGraph edge ID (RED)
- **monsoon:** Require sculpted guardian facial anchors and running river (RED)
- **monsoon:** Reproduce swept obstacle and ford contact mismatch
- **skyfall:** Reject out-of-range and invalid road contact [full-regression]
- **skyfall:** Specify chunk streaming and deterministic waterfalls
- **skyfall:** Require one-chunk split and merge streaming prefetch
- **skyfall:** Require supported landing guides and chunk GPU cleanup
- **skyfall:** Import authored road-contact predicate for landing checks
- **skyfall:** Reject sharp air-landing junction headings
- **skyfall:** Island terraces must stay below the drivable roadway
- **skyfall:** Require visible non-contact checkpoint world markers
- **skyfall:** Fix browser swipe hit target and locale picker regression [full-regression]
- **skyfall:** Specify canonical CourseGraph adapter RED
- **stormline:** Cover graph, forks, hairpins, obstacles and weather tiers
- **stormline:** Assert genuine 3D chunks and GPU resource cleanup
- **stormline:** Distinguish traversable puddles from solid obstacles
- **stormline:** Tighten approximately 14km course length acceptance
- Reproduce Stormline streamed neon pop at chunk boundaries [full-regression]
- Reject empty Stormline stream chunk mesh allocation
- Require real 3D tunnel envelope in Stormline streamed chunks
- **stormline:** RED streaming tower and elevated support stability
- **stormline:** RED missing curved road arc-length tail
- **volcanic:** Reproduce endpoint tunneling in hazard sweeps [red]
- **volcanic:** Reproduce lateral swept collision tunnelling
- **volcanic:** Reject noncanonical mode for drivable vent shortcut
- **volcanic:** Require visible flight landing pad edge lights
- **volcanic:** Reproduce slope-space hazard contact and warning tilt
- **volcanic:** Reproduce Low-detail hairpin mesh vs physics clearance
- **volcanic:** Reproduce abrupt flight-to-road landing direction
- **volcanic:** Require direct canonical graph handoff
- **volcanic:** Define shared-AI obstacle warning and safe corridors
- **volcanic:** Reproduce missing lava UV coordinates and chunk seam
- **volcanic:** Require physically oriented checkpoint and finish metadata
- **volcanic:** Reproduce inactive vent rendered as collision hazard
- **volcanic:** Expose quality lighting overwritten by update
- **volcanic:** Reproduce zero-width AI passing corridor
- **volcanic:** Require identical shared and local CourseGraph frames
- **showcase:** Unit-test the camera pose bearings, orbit rate and radius
- **ci:** Drop duplicate showcase camera browser variants, keep one framing keeper
- **ci:** Check tour frame brightness in phase5, limit world-tour course loop to classic tracks
- **ci:** One 320x740 Event Lab Tab trap walk; drop tablet and duplicate focus-ring zoom rows
- **ci:** Move 3x HUD WebP dimensions to a Node header test; drop vacuous decor test
- **ci:** Release highlight order lives in the Node test
- **ci:** Drop Airflow PNG browser test duplicated by garage-airflow-png.test.js
- **ci:** Fold two art-source gallery tests into the wave3 keepers
- **ci:** Move Rewards alpha-margin check to rewards-visual-contract.test.js
- **ci:** Drop duplicate zh/phone hazard variants, shrink themes to one case per pool, settle-once to classic+endless
- **minimap:** Fold route outline and race minimap shape into phase4-first-five
- **rear-light:** Move LED behaviour to unit tests, keep a slim wiring check
- **ci:** Merge FPS browser tests, drop device-quality decisions covered by unit tests
- **ci:** Move NEXT and personal-medal settlement into Node, keep one viewport per result-actions/medal browser test
- **ci:** Drop duplicate launch-ramp fly-and-land, circuit desktop, magnet and cup-heat variants
- **ring-rows:** Assert drawn rings headless and retire the ring-rows browser spec
- **risk-lines:** Pin the Hard riskRules values in Node, drop desktop-en browser variant
- **ci:** Seed the 5 km sprint finish and drop duplicate touch/mount tests
- **i18n:** Keep one zh-TW system-language smoke, detection lives in i18n.test.js
- **ci:** Move the main CSS contract hash into a Node test
- **handoff:** Point the layout-seed comment at the Node ring-rows test
- **rings:** Guard authored ring and reward sequences
- **rings:** Let browser specs follow rings into any lane
- **tutorial:** Make keyboard drift and barrel roll robust to runner lag
- **callouts:** Reproduce lost airborne roll announcement [full-regression]
- Exercise rank changes against live-race fixture [full-regression]
- Wait for tutorial celebration before asserting re-armed ready state [full-regression]
- Use a guaranteed loaded avatar to verify cloud image and fallback states [full-regression]
- Reproduce Frostbite AI ranking across difficulty and frame rates [red]
- Keep Frostbite diagnostics in its classic-only race mode [red]
- Use live-race fixture for deterministic HUD position animation [full-regression]
- Wait for tutorial celebration before asserting re-armed ready state [full-regression]
- Collect Frostbite race telemetry for failing pace regression
- Restore Frostbite grid-spacing regression (RED)
- Isolate throttle cap from fuel regeneration
- **ui:** Poll the fold hinge check while results slide in
- **callouts:** Reproduce lost airborne roll announcement [full-regression]
- **ci:** Stabilize motion and tutorial checks
- **ui:** Cover results sign-in in landscape fit spec
- **catch-up:** RED rings-only and NITRO-majority regressions
- **catch-up:** Document weighted rings; run full regression [full-regression]
- Reproduce NITRO brake interruption and trick callout starvation
- Assert touch NITRO behavior through public HUD [full-regression]
- **catch-up:** RED course-length-aware limits and future track regression
- **tutorial:** Stop the touch NITRO spec racing the self-passing LAND lesson
- **ai:** Capture first-seed Frostbite pace telemetry during red regression
- Wait for tutorial celebration before asserting re-armed ready state [full-regression]
- **ai:** Reproduce Frostbite long-course rival grid imbalance
- Exercise rank changes against live-race fixture [full-regression]
- Wait for tutorial celebration before asserting re-armed ready state [full-regression]
- **callouts:** Reproduce lost airborne roll announcement [full-regression]
- **ci:** Stabilize motion and tutorial checks
- **motion:** Poll position animations after the reduced-motion switch
- Capture Frostbite rival balance regression diagnostics
- Calibrate Frostbite inherited AI strategies before repair
- Distinguish throttle cap from regenerated BOOST in rival pace checks
- Measure Frostbite rival grid spread across 24 deterministic layouts
- **callouts:** Reproduce lost airborne roll announcement [full-regression]
- Run interactive tutorials at low render load to keep real input/physics responsive [full-regression]
- **3d-pipeline:** ?model=probe racing, /skyline-rush/ base and 404 lifecycle checks
- **tutorial:** Send time-critical practice key edges on their engine cue
- **tutorial:** Restore driftCharged for the touch practice drift
- **3d-pipeline:** Reproduce tracked Blender autosave regression [full-regression]
- **dune-tempest:** Define live 3D environment contract [full-regression]
- **dune-tempest:** Require continuous grounded roadbed through ravine edge [full-regression]
- **dune-tempest:** Require slow haze and sunset updates with reduced-motion freeze [full-regression]
- **skyfall:** Define real-time archipelago scene contracts (RED)
- **skyfall:** Assert waterfall droplets stay beneath their source islands (RED)
- Specify Stormline dynamic Three.js environment contracts [full-regression]
- Assert Stormline repeated timestamps are deterministic [full-regression]
- **upcoming:** Detect Stormline instanced meshes by duck type, not cross-module instanceof
- **volcanic-crown:** Specify live 3D terrain lava and lifecycle [full-regression]
- **volcanic-crown:** Require elevated shortcut, basalt shoulders and erupting summit
- **upcoming:** Check Volcanic Crown road under the origin by raycast, not edge vertices
- Specify live Monsoon Ruins environment contract (RED)
- Cover overcast horizon and instanced resource release
- **cloud:** Wait for post-sign-in sync before injecting avatar [full-regression]
- **volcanic:** Specify arc-length, fork, unlock and WebGL behavior (RED) [full-regression]
- **monsoon:** Specify measured route, three forks, dev unlock and WebGL (RED) [full-regression]
- **lifecycle:** Wire lifecycle gates into npm tests and align race spec filenames [full-regression]
- **lifecycle:** Validate Coming Soon WebGL views across six courses [full-regression]
- **3d-pipeline:** GLB Roadster matrix on every track and the six-course carousel
- **ring-sfx:** Harden analyser measurement
- **ring-sfx:** Measure ring chimes on a cue-only tap
- **tutorial:** Give keyboard full practice its budget
- **tutorial:** Bound roll takeoff wait with hud evidence
- **volcanic:** Include Volcanic Crown in playable list
- **lifecycle:** Scale the Coming Soon views budget for CI runners [full-regression]
- **garage-model:** Catalog-driven equipment spec for GLB car
- **audit:** Opt-in Garage equipment audit captures
- **garage-model:** Poll the equipped showcase paint instead of a reverting preview
- **home:** Landscape footer test follows top-bar version
- **course-runtime:** Characterize legacy race replays before graph wiring
- **ai:** Hold fuel empty when asserting unboosted rival caps
- **ai:** Expose Frostbite boosted-rival pace compression (RED)
- **replay:** Re-record legacy replay fixture after the develop merge
- **course-runtime:** Cover physical branch minimap markers [full-regression]
- **course-runtime:** Require streaming CourseGraph scene lifecycle [full-regression]
- **course-runtime:** Pin CourseGraph leaderboard order and physical gaps [full-regression]
- **course-runtime:** Assert physical graph world pose, camera and finish [full-regression]
- **dune-tempest:** Require real race palette on CourseGraph [full-regression]
- **dune-tempest:** Desktop-phone WebGL real checkpoint and flight coverage [full-regression]
- **dune-tempest:** Align dev-only readiness guards and browser shard estimates [full-regression]
- **course-runtime:** Pin p95 benchmark arithmetic and unknown gates [full-regression]
- **skyfall:** Assert Q9 junction continuity and canonical wheel contact [full-regression]
- **skyfall:** Demand streamed physical CourseGraph scenery [full-regression]
- **skyfall:** Require dev-only access while production stays Coming Soon [full-regression]
- **skyfall:** Require dev-only ground/flight WebGL START-to-FINISH and release lock [full-regression]
- **skyfall:** Budget new browser paths in CI shards [full-regression]
- Fix Skyfall worker-scoped Playwright fixture placement
- **coursegraph:** Expose missing Skyfall palette and invalid World Tour scene dispatch
- **ci:** Make lost-position transition deterministic and align Studio sheen contract
- **ci:** Diagnose module-size violations before push with file-specific failures [full-regression]
- **cloud:** Inject the avatar only after the post-sign-in sync settles
- **browser:** Wait out rival ring takes and CPU-only perf stalls [full-regression]
- **art:** Add reproducible native-3x HUD source renderer and alpha safety checks
- **art:** Verify complete alpha bounds of all 18 HUD icons on 3 viewports [full-regression]
- **monsoon:** Inspect lazy race chunks after entering racing phase [full-regression]
- **showcase:** Require visible, readable four-car Dune and Skyfall frames [full-regression]
- **showcase:** Pin Dune and Skyfall foreground visibility without losing landmarks [full-regression]
- **ci:** Enforce complete Skyfall palette and align runtime catalog
- **browser:** Keep ring-sfx clear of the pack and wall clock
- **coast:** Gated capture of the five section 8.1 Coast board panels
- **perf:** Gated per-tier Coast frame-cost benchmark, GPU-synced below vsync
- **ultra:** Gated High vs Ultra race capture on every selectable map
- **ultra:** Per-map p50/p95 frame cost in the gated High vs Ultra capture
- **perf:** Gated sustained Coast rain FPS run with thermal state, guard that audit specs stay gated
- **coast:** Optional MODEL param in the gated Coast look capture (GLB Roadster panels)
- **perf:** Sustained FPS run keeps the car on the Coast course for the whole window
- Specify looping animated Garage art and reduced-motion fallback (RED)
- Cover Garage and Studio GIF overlays in browser (RED)
- Permit GIF highlights while retaining original paint artwork checks
- Verify original WebP source without regex escaping [full-regression]
- Require 39 original-source transparent GIFs and six per-asset motion templates
- Verify Garage and Studio source-art GIF display, motion and failure fallback
- Preserve original 3x fallback assertions after direct GIF integration
- Keep real car shader sweep while rejecting removed sparkle GIF overlays
- Render original Garage WebP/SVG artwork into verified animated GIF previews
- Assert per-art motion, stationary body, and source-alpha fidelity [red]
- Run true-source motion tests before generation (RED baseline)
- Require 39 individually art-directed motion recipes, no global image warp
- Sample the actual stationary car, not the animated Vortex trail below it
- Prevent import.meta parsing errors in Vue animated GIF bindings
- Audit original Store WebP fidelity while verifying displayed animated GIF
- Simulate both animated GIF and original badge artwork failures
- Preserve native badge alpha audit while expecting animated GIF artwork
- Assert animated airflow while preserving original SVG source identity
- RED physical GIF motion checks for energy silhouettes and hinged gift lids
- Verify all 39 real Garage animated art mappings on Home and Studio [full-regression]
- **garage:** Cover frame-sheet GIF contract and rejection paths [full-regression]
- **ci:** Enforce complete Skyfall palette and align runtime catalog
- **ci:** Give ?look=3d countdown an explicit budget
- **monsoon:** Skip race spec until course is playable
- **art:** Guard 18 HUD canvases against rejected redesign
- **art:** Keep HUD art regression gate dependency-free
- **art:** RED compares preserved-source pixels, not just transparent margins
- **art:** Enforce original-style alpha margins by artwork aspect ratio
- **art:** Run phone and desktop HUD gallery visual regression on original artwork
- **art:** Retain HUD gallery browser screenshots as downloadable CI artifacts
- **art:** Reproduce broken right bezel and transparent badge face [RED]
- **art:** Reveal dark cutout pixels in original HUD badge faces [RED]
- **art:** Diagnose actual badge enamel alpha and color profiles
- **art:** Compare badge opacity against original translucent enamel
- **art:** Prove original gradients continue across restored HUD gaps [RED]
- **art:** Forbid bright upper-bezel reflection in repaired tooltip face [RED]
- **release-video:** Wait for recorded hand-over frames before asserting [full-regression]
- **browser:** Wait out rival ring takes and CPU-only perf stalls [full-regression]
- **ci:** Stabilize route catalog and Frostbite fall checks [full-regression]
- **ci:** Validate six dev-only courses across all ordinary modes
- **elimination:** Characterize shared Endless item layout and intentional replay change
- **ci:** Cover classic and upcoming track maps separately [full-regression]
- **i18n:** Cover localization of all upcoming courses
- Deterministically verify Frostbite Rift fall on slow CI runners

### ⚙️ Miscellaneous Tasks

- Re-run complete regression after cancelled workflow [full-regression]
- **store:** Render and verify native-size standalone PNGs [render-store-png]
- **assets:** Stage one-time vehicle-removal preview for review
- **assets:** Retain exact source images alongside inpainting previews
- **assets:** Test scene-preserving LaMa removal for track cars
- **assets:** Commit inspected source-faithful vehicle removals
- **ci:** Request full Coming Soon and Frostbite showroom regression [full-regression]
- **security:** Ignore per-device 3D environment audits
- Ignore local logs and event streams
- Redact local path in diagnostic log
- Configure project blender toolchain
- **mcp:** Pin mcp-for-blender to 2.2.7
- Delete redundant images
- **gitignore:** Ignore Python __pycache__
- **3d-pipeline:** Use 68675409 as r180 baseline ref
- Refresh shard durations from run 42182362109
- **scripts:** Add rival balance harness
- Run Stormline exact-HEAD full regression [full-regression]
- **catch-up:** Validate synchronized HEAD [full-regression]
- Add car assets
- **make:** Pass via=wifi through phone-diag
- Verify browser, World Tour and quality gates at exact HEAD [full-regression]
- Generate and commit real Garage art GIFs only on authorized feature branch
- Rerun real-source motion rendering whenever its acceptance tests change
- **garage:** Remove unused staged animation payload 1
- **garage:** Remove unused staged animation payload 2
- **garage:** Remove unused staged animation payload 3
- Verify browser, World Tour and quality gates at exact HEAD [full-regression]
- **art:** Run one-time source-locked HUD crop repair
- **art:** Run source-locked one-time HUD completeness repair
- **art:** Rerun source-locked repair after strengthening RED test
- **art:** Execute final original-border completion and remove one-shot workflow
- **art:** Verify seamlessly reconstructed original HUD artwork
- **art:** Inpaint original bevel borders without ghost fragments
- **art:** Verify source-style repairs and overwrite originals on branch
- **art:** Validate repaired pixels after regenerating from pinned originals
- **art:** Check exact repaired WebPs before cross-viewport screenshot capture
- Verify browser, World Tour and quality gates at exact HEAD [full-regression]
- **mcp:** Add project-scoped firebase MCP server
- **diag:** Log home Start geometry in viewport events

### ◀️ Revert

- **assets:** Restore original four track teaser artworks
## [0.30.0] - 2026-11-04

### 🚀 Features

- Build faceted Roadster 2 shell, glazing, aero trim and detailed wheels
- Integrate Roadster 2 visuals into shared player vehicle factory
- Preserve folded panel normals, close front shell and add swept corner headlamps
- **controls:** Hide keyboard remapping on touch devices until a physical key is pressed
- Author four unique fictional racers and two non-racing traffic silhouettes
- Register individual seven AI racing models and three distinct traffic forms
- Render seven individually recognizable AI racers and mixed ordinary traffic
- Sculpt Roadster wedge-front, curved rear fascia, recessed corner ducts and contoured light blade [full-regression]
- Tuck Roadster corner light slits into dark recessed faceted pockets [full-regression]
- Give compact Pulse and city hatch correct underbody lengths [full-regression]
- Give compact Pulse and city hatch correct underbody lengths [full-regression]
- **release-notes:** Sort highlights by media within each kind
- **garage:** Add camera dock to the Garage page
- Sculpt photographic Roadster wedge nose, black grille and layered rear bumper
- Integrate photo-matched Roadster front and rear forms with original VFX anchors
- Narrow Roadster rear LED into photographed black full-width recess
- Tuck adjustable Roadster rear aerofoil against trailing deck edge
- Taper the black rear quarter into Roadster carbon diffuser behind rear wheels
- Build recessed machined four-port rear socket assemblies
- Integrate reference-scale recessed nozzles without shifting NITRO emitters
- Carve photo-like four-port bank and curved carbon upper/lower lips [full-regression]
- Sculpt five swept carbon diffuser vanes beneath machined Roadster ports [full-regression]
- **roadster:** Match photo front/rear fascia and fold-out wing [full-regression]
- **roadster:** Sharper body, low canopy, star wheels, arched diffuser and 52-degree airbrake wing [full-regression]
- **roadster:** Flush 45-degree airbrake wing, short struts, eased boost animation and fuller nose [full-regression]
- **roadster:** Open airbrake wing to 35 degrees
- **garage:** Add open wing toggle to studio pose row
- **garage:** Pose buttons and bigger car on home
- **upcoming:** Add 3D showroom scenes for previews
- **upcoming:** Add track teaser images and route art
- **upcoming:** Add Coming Soon cards and guards
- **upcoming:** Add playable preview flag for dev

### 🐛 Bug Fixes

- Normalize procedural Roadster mesh UVs before static batching [full-regression]
- Give each Roadster merged mesh its own material instance
- **home:** Keep Start, Garage, History and Practice on one desktop row
- **i18n:** Localize the 3x artwork gallery heading in Settings
- **release-notes:** Start refused hero on first touch
- **release-notes:** Announce on visit with no record
- **release-notes:** Announce releases without highlights
- **swipe:** Follow mouse 1:1 on home preview drag
- **home:** Pin Garage NEW tag to corner on all devices
- **swipe:** Switch track mid-drag past 20% width
- **home:** Wrap start label to 2 lines
- **showcase:** Keep showcase angle out of the race
- **tutorial:** Keep the world live after practice completes
- Keep low front intake visible above the white wedge from every frontal angle
- Cut four actual diffuser openings around shared Roadster NITRO nozzle anchors
- **roadster:** Spin star spokes and hub with the aero disc at car speed [full-regression]
- **showcase:** Preserve Alpine panel gap and Coastal AIRFLOW portrait clearance [full-regression]
- **roadster:** Raise the hood into one smooth sweep from nose to windscreen base [full-regression]
- **roadster:** Extend lower intake to corner intakes
- **roadster:** Restore low wedge nose with carbon band
- **showcase:** Return +0 for portrait camera angles
- **hud:** Write nitro aria-valuenow only on change
- Interpolate vehicle poses across render frames and ease drift yaw [full-regression]
- **history:** Accept 5th-8th place in mode records so the finish screen renders
- **garage:** Restore scenic showcase framing
- **garage:** Inject paint access from build module
- **world:** Frame circuit beacon in drive shot
- **swipe:** Select track after the slide finishes

### 💼 Other

- Integrate latest develop into Roadster 2 fidelity branch
- Integrate latest develop into Roadster 2 fidelity [full-regression]
- Incorporate develop Roadster reference assets and design notes, preserve fleet work [full-regression]
- Incorporate latest develop home swipe changes into Roadster photo fidelity [full-regression]
- Incorporate latest develop release-note fixes into Roadster quad-port fidelity [full-regression]
- Preserve develop start-button wrap and Roadster wheel updates [full-regression]
- Sync develop main UI parity fixture into Roadster 2 [full-regression]

### 🚜 Refactor

- Keep roadster wheel arches exposed through sculpted shell and split rockers
- Preserve Roadster detail identities through static geometry batching
- **audio:** Share user-activation listener helper
- Keep legacy world module within enforced line ceiling
- Respect legacy module-size ceilings and reuse pose buffers [full-regression]
- **release:** Move older notes to archive module

### 📚 Documentation

- Record Roadster 2 reference-based visual design and validation gates
- Add high fidelity Roadster feature implementation and verification plan
- Track Roadster reference implementation and unverified regression gates [full-regression]
- Track Roadster develop merge and full exact-HEAD verification [full-regression]
- **claude:** Move guides into scoped rules
- Track 8-car visual fidelity implementation and remaining full regression/visual gates [full-regression]
- Add Roadster 2 reference photo set
- **todo:** Plan drift trail marks and shop styles
- Record Roadster front and rear photo-fidelity verification gates [full-regression]
- Record real rear-nozzle cutouts and photo-matched quarter panels [full-regression]
- Track reference quad-port geometry, real visual QA and exact-HEAD regression [full-regression]
- **3d:** Design visual fidelity pipeline and mandatory toolchain preflight
- **3d:** Design visual fidelity pipeline and mandatory toolchain preflight
- **3d:** Plan r186 migration and staged GLB pipeline with Phase 0 audit
- **3d:** Plan r186 migration and staged GLB pipeline with Phase 0 audit
- **3d:** Plan r186 migration and staged GLB pipeline with Phase 0 audit
- **3d:** Route Claude Code through preflight and visual fidelity plans
- **3d:** Track Phase 0 environment check and visual pipeline milestones
- **release:** Stamp 0.29.0, add 0.30.0 notes
- **todo:** Track six Coming Soon preview evidence
- **readme:** Document playable preview flag
- **release:** Review 0.30.0 notes
- **rules:** Browser specs survive a slow CI runner

### ⚡ Performance

- Reuse wheel and thruster detail geometries across vehicle instances

### 🎨 Styling

- **garage:** Add 5px gap before studio title

### 🧪 Testing

- Specify Roadster 2 silhouette, materials and moving-part fidelity [full-regression]
- Preserve Roadster detail coverage and explicit mesh performance budget
- Preserve Roadster detail coverage and explicit mesh performance budget
- Require folded station shading, closed body and paired corner lamps [full-regression]
- **handoff:** Pin the ring layout for the PERFECT LINE HUD test
- **release-video:** Hero starts on first touch if refused
- RED specification for eight unique racers, traffic silhouettes and Roadster fascia [full-regression]
- Count each batched lamp instance through semantic mesh metadata
- Budget each new race/traffic silhouette while retaining exact baseline snapshots [full-regression]
- Require shadowed lamp pockets around both Roadster corner light slits
- Compact city hatch must not inherit the prototype racing chassis overhang
- **ui:** Refresh reviewed main CSS parity after all-device Garage NEW overlay [full-regression]
- Specify photo-matched Roadster front slit lamps and layered rear fascia
- Inspect unbatched Roadster mesh dimensions to avoid merged mesh false positives
- Verify lower front grille remains visible across entire wedge
- Roadster wing parks flush toward photographed rear deck
- Rear valance must have four real nozzle cutouts not flat overlay circles
- Preserve carbon rear-quarter taper seen in photographic rear side view
- Require photo-scale inset metal nozzle barrels and four open cutouts [full-regression]
- Require shared swept diffuser vanes instead of plain rear bumper boxes
- Preserve showroom full-body panel clearance and portrait AIRFLOW headroom
- **release-notes:** Stabilize browser specs
- **browser:** Fix looping hand-over and safe-area timeout flakes
- **bonus-gates:** Judge a visible label on slow runners
- **browser:** Poll page state after a UI action

### ⚙️ Miscellaneous Tasks

- **release:** Add what's new car recorder
- **release:** Add Coming Soon and Garage home What's New captures
- **browser:** Retry a failed browser test once, keep flakes annotated
## [0.29.0] - 2026-11-03

### 🚀 Features

- **release:** Merge main back into develop after /release
- **tutorial:** Observe real NITRO sprint before completing practice
- **tutorial:** Add engine-confirmed air-chain and barrel-roll lessons
- **tutorial:** Explain failed air-chain and barrel-roll landings with retry coaching
- **hud:** Add typed Hybrid/Competitive preference storage with regression tests
- **hud:** Expose localized Hybrid and Competitive Settings selector
- **nitro:** Track engine-ready states and one-shot audio without reactive HUD updates
- **touch:** Persist portrait/landscape layouts and move thumb clusters together
- **hud:** Add persistent Competitive widget visibility controls
- **hud:** Make READY feedback optional and reset every HUD preference
- **garage:** Add responsive Home and full-screen Studio shell with localized controls
- **garage:** Reuse existing WebGL renderer for bounded studio camera orbit
- **garage:** Wire Studio gestures, paint safety and same-document history
- **garage:** Render independent studio scene with shared WebGL pipeline and framing QA
- **garage:** Align responsive studio UI with visual concept and truthful cosmetic states
- **foldable:** React to viewport segments and keep touch controls outside hinge
- **tutorial:** Add real drift-and-release reward lesson after braking
- **tutorial:** Explain drift thresholds and release rewards in both locales
- **tutorial:** Focus brake and steering controls during drift practice
- **wave2:** GREEN bounded typed four-stage NITRO and BOOST presentation controller
- **wave2:** Render distinct sprint palettes via pooled Three.js shader uniforms
- **wave2:** Drive bounded sprint visuals from race snapshots without physics changes
- **garage-skins:** Add typed Phase A catalog and safe entitlement contracts
- **garage-skins:** Render honest read-only Vue catalog with SVG and text fallback
- **garage-skins:** Expose read-only catalog in existing Garage Studio
- **garage:** GREEN session-only skin trials, safe equip and account isolation
- **garage:** GREEN bounded shader palettes for four independent cosmetic slots
- **garage:** GREEN cosmetic tint on shared Aero VFX shader materials without extra GPU geometry
- **garage:** GREEN real shared Aero VFX in full-screen Studio with bounded mesh reuse
- **garage:** GREEN reactive account-scoped VFX skin preview and trial equip boundary
- **garage:** GREEN accessible bilingual skin preview and trial equip controls
- **garage:** Bind trial/preview selection to real WebGL Aero race and studio scenes
- **garage:** Isolate trial skins on Firebase auth changes and update UI regressions
- **garage:** GREEN blue-only launch flare on race start without gameplay mutation
- **garage:** GREEN generate real shared NITRO trail from bounded showroom vehicle motion
- **garage:** GREEN timed trial expiry revokes active shaders without user interaction
- **garage:** GREEN warm up VFX shader programs before first Studio frame and after context loss
- **garage:** GREEN expose actual shader program count for WebGL skin preview regression
- **garage:** Add release strategy scripts/garage-release-build.mjs
- **garage:** Add release strategy src/garage-release-coming-soon.ts
- **garage:** Add release strategy src/garage-release-trial.ts
- **garage:** Add release strategy src/garage-release-released.ts
- **garage:** Add release strategy src/GarageSkinComingSoon.vue
- **garage:** Add release strategy src/garage-skin-runtime-locked.ts
- **garage:** Add release strategy src/garage-skin-palette-locked.ts
- **garage:** Wire production-safe Vite Strategy aliases and browser build entry
- **garage:** Route Vue and race cosmetics through build-selected strategies; fail-closed trial entitlements
- **garage:** Preserve separate Coming Soon, Trial and Released localized presentations
- **wave2:** Typed eight-car grid contracts, Cup scoring and Sprint orders
- **wave2:** Integrate physical 8-car grid and WebGL rivals
- **wave2:** Dynamic eight-racer HUD, map markers and Custom choices
- **wave2:** Wire reverse-grid into Cup resume and sprint next heat
- **wave2:** Default all competitive and staged Custom fields to eight racers
- Bound reward chip queue and race-time cadence
- Add event-driven, hinge-safe peripheral feedback placement
- Place reward chips and actionable warnings near available HUD edges
- **classic:** Denser, more rewarding rings on Coast, Neon and Canyon
- **tracks:** Bring the first NITRO forward on Sky Spiral and Circuit
- **records:** Keep re-laid track records under a layout version key
- **cloud:** Accept layout 2 Classic best ids in Firestore rules
- **hud:** GREEN archive and display all 18 original 3x UI assets in 1x settings artwork preview
- **hud:** Decorate original functional controls with 3x source images without changing inputs
- **wave3:** GREEN archive and display 6 original 3x garage-store-readiness UI icons at 1x CSS
- **wave3:** GREEN bilingual mission/store read-only catalog previews and 3x artwork
- **layout:** Twice the rings and pickups, full-width rows and dense trains on all ten tracks
- **items:** A taken ring or pickup is gone for 2.5 s, then back for everyone
- **rivals:** Rivals collect NITRO rings and pickups by difficulty
- **records:** New layout version keys for every track; old ids stay readable
- **rivals:** See and hear a nearby rival take an item or fire NITRO
- **whats-new:** Show rivals grabbing nitro in a clip
- **garage:** Expand catalog to 16 stable IDs and independent shape patterns [full-regression]
- **garage:** Bind four distinct skin pattern modes to shared Aero VFX shaders [full-regression]
- **garage:** Wire ten true 3x WebP skins to 1x CSS cards with two-stage fallback [full-regression]
- **garage:** GREEN physical void pulse beams and repeated premium flare visual demos
- **garage:** Enable real Skin Preview on Home/Studio with 3D GPU feedback and highlighted cards
- **garage:** GREEN import all 27 original 3x VFX materials and add six selectable effects
- **garage:** Expose 11 original status/rarity artworks and unique 3x flare/trail previews
- **garage:** GREEN animate 3x purple nebula trail via existing ribbon time uniform
- **garage:** Shared 3x artwork image/fallback widget and themed badge card
- **garage:** Launch flares redrawn from their badges with body glow
- **garage:** Full-card Preview click and keyboard support, one Equip/Try button and neon hover UI
- **garage:** 3d launch flares and volumetric void beams [full-regression]
- **garage:** Connect four unique 3x vector Airflow thumbnails with SVG fallback
- **garage:** Cohesive game-style paint collection panels, swatch cards, controls, hover and readable labels
- **garage:** Enlarge paint car previews and quality-aware gloss [paint-collection]
- **garage:** Launch flares rise from under the car and NITRO trails get distinct streak styles [full-regression]
- **garage:** Fit NITRO plumes to round nozzles
- **garage:** Loop launch flare through countdown
- **garage:** Enable approved public free trial in gated deploy, keep locked default, audit bundle [full-regression]
- **make:** Add YES=1 to take phone menu defaults
- **make:** Shorten phone defaults flag to y=1
- **items:** [**breaking**] Scale rings to 4 per car, re-roll per race
- **hud:** Move race hud options into the vfx panel
- **garage:** Ship six 3x paint cards and real 3D clearcoat sweep [full-regression]
- **garage:** Frame each orbit by projected car dimensions
- **garage:** Align stage orbit and animate real flight hardware
- **garage:** Make ground/flight mode part of studio view state
- **garage:** Wire flight/ground mode with orbit and zoom
- **garage:** Accessible bilingual Ground/Flight controls in preview studio
- **garage:** Reclaim full viewport and compact both Garage and Studio layout [full-regression]
- **make:** Reuse dev port held by this repo's server
- **rings:** Add ring trains, rows and pickup runs
- **garage:** Zoom studio out to the full exhaust
- **home:** Promote Garage with NEW highlight and swap Practice position
- **rings:** More rings and pickups, middle-lane ground trains
- **whats-new:** Lead the upcoming notes with the Garage clip
- **release-notes:** Highlights may carry a video, checked by the release gate
- **release-notes:** Clips wait behind a poster and play button and play enlarged on a tap
- **whats-new:** Play the rivals clip from its card
- **whats-new:** Autoplay the hero clip inline
- **garage:** Remember last VFX skin pick [full-regression]

### 🐛 Bug Fixes

- **input:** Stop ios magnifier on held touch controls
- **tutorial:** Reject stale landing on barrel-roll reward events
- **tutorial:** Derive progress maximum from actual lesson count
- **tutorial:** Synchronize real flight/flick cues and repair touch regression [full-regression]
- **tutorial:** Isolate flight credit and coach completed barrel-roll landings
- **tutorial:** Make interrupted NITRO practice retryable without fake charges
- **tutorial:** Align barrel-roll browser assertions and safe-glide coaching
- **tutorial:** Keep held steering continuous at combo lesson boundaries
- **hud:** Handle blocked localStorage getters during initial render
- **touch:** Keep active steering during mobile browser chrome resize
- **garage:** Restore orbit on pointer release and assert bounded zoom events
- **garage:** Dispose studio-only geometry without invalidating shared car meshes (TDD)
- **garage:** Handle Three.js multi-material types during stage resource cleanup
- **garage:** Localize showroom accessibility and stabilize WebGL browser regression waits
- **garage:** Enforce camera silhouette bounds, persistent default equip and accessible paint states
- **garage:** Keep unlock copy truthful and invalidate stale camera QA evidence
- **foldable:** CI-scaled timeout and state-independent mobile HUD assertions
- **foldable:** Restore audio accessibility, align nitro readiness and localize HUD; stabilize real-touch practice [full-regression]
- **foldable:** Verify orientation-scoped touch layouts and stabilize real multi-touch tutorial [full-regression]
- **foldable:** Cap audio panel height on short screens
- **tutorial:** Narrow legacy JS drift state with typed adapter for TS strict
- **ios:** Prevent game long-press loupe without swallowing UI taps
- **tutorial:** Measure NITRO sprint from activation speed
- **develop:** Restore wave 1 work lost in drift merge [full-regression]
- **hud:** Localize HUD settings copy and cap the panel on short screens
- **hud:** Keep the reviewed CSS baseline byte-identical
- **wave2:** Immediately hide disabled sprint VFX and limit reduced-motion flow
- **wave2:** Repair video CI, photo export module ratchet and Wave1 test contracts [full-regression]
- **wave2-vfx:** Repair typed pixel export, actual NITRO recovery and touch CI assertions [full-regression]
- **garage:** GREEN clear expired/revoked trial equips and preview state
- **garage:** GREEN dispose stage-owned Aero geometries exactly once without freeing shared car model
- **garage:** GREEN shared NITRO wake demo without camera silhouette or car offset regression
- **garage:** Exclude cosmetics from camera fit and actual vehicle silhouette bounds
- **garage:** GREEN no unpublished skin IDs in shared renderer or locked production assets
- **garage:** Keep skin runtime type assertions in return expressions [full-regression]
- **garage:** Keep trial equipment map non-nullable for strict TS
- **garage:** Restore Vite config factory contracts and single cloud auth observer [full-regression]
- **vfx:** Restore the full NITRO/BOOST camera FOV on every quality tier
- **garage:** Show the cyan NITRO trail from the first frames of NITRO
- **wave2:** Dynamically initialize Circuit laps and eight-racer VFX pools
- **wave2:** Preserve legacy Custom signatures and display dynamic field totals
- **wave2:** Compact 8-car HUD, keep 4-car home showcase and exercise visible Custom selector
- **wave2:** Keep solo rank empty and test dynamic NITRO accessibility without AI physics noise
- **wave2:** Localize eight racer labels and keep Chinese NITRO status readable
- **ci:** [full-regression] align eight-car UI regression contracts and HUD spacing
- **ci:** [full-regression] align persisted layout and reviewed eight-car CSS contract
- **ci:** Bound short-landscape settings panel and retry real tutorial maneuvers [full-regression]
- **hud:** Keep the tablet live map clear of flight telemetry [full-regression]
- **hud:** Move overlapping race HUD blocks apart on folds, phones and tablet [full-regression]
- Prioritize queued NITRO before rendering next badge [full-regression]
- Preserve immediate reward order while prioritizing backlog [full-regression]
- Keep peripheral race chip translucent and road-safe before first placement [full-regression]
- **hud:** Restore phone flight-director hide while a callout shows [full-regression]
- **hud:** Size reward chips to their text and use free side gaps [full-regression]
- **classic:** Canyon keeps its ring volume; only the first NITRO comes earlier
- **hud:** Re-place the reward chip when the GO countdown clears [full-regression]
- **hud:** Keep the short-window race callout clear of the centre view without touch [full-regression]
- Remeasure moved flight telemetry and include late NITRO HUD [full-regression]
- **release:** Refuse to tag changed Firestore rules until their deploy is attested
- **hud:** Make 3x artwork overlay visible behind semantic SVG and button labels
- **hud:** Keep decorative 3x art within real control boxes, preserving pointer events
- **hud:** Keep the short-landscape callout out of the centre view [full-regression]
- **hud:** Re-place a callout raised during GO! once the telemetry appears [full-regression]
- **ci:** Validate upstream suites before WebGL artifacts
- **history:** Keep the OLD LAYOUT tag clear of the expand chevron [full-regression]
- **history:** Append the OLD LAYOUT tag rule after the pinned main CSS block [full-regression]
- **garage:** GREEN rearm trial expiry across JS timer limits [full-regression]
- **garage:** Keep locked production shader ABI neutral and forbid expanded skin leaks [full-regression]
- **garage:** Clear expired trial selection before renewal (TDD GREEN) [full-regression]
- **garage:** Force visible Home showroom VFX demo without allocating per-frame settings
- **garage:** Keep immutable preview world origin while billboard flares face camera
- **garage:** Prevent unreleased Void pulse GPU code from leaking into locked build
- **garage:** GREEN stationary Home showroom previews real NITRO ribbon without mutating race
- **garage:** GREEN badge image fallback keeps source gallery accessible
- **garage:** Guard shader power, localize badge art and show void beams [full-regression]
- **garage:** Enforce exact 1x CSS image size and correct neon theme test regex
- **garage:** Equipped vfx skins replace standard fx [full-regression]
- **garage:** Resolve neon card hue per item instead of freezing parent CSS variable
- **test:** Restore clean preview test file and check 3x SVG airflow paths
- **garage:** Respect legacy world module size limit while applying paint finish
- **garage:** Keep world.js within legacy line budget
- **garage:** Dim whole skin card on press, glow selected
- **vfx:** Hide airflow streamlines while sprinting off
- **ci:** Restore quality-gate order lost in an earlier garage merge
- **i18n:** Drop design codes from HUD mode labels
- **garage:** Scope Ground/Flight Playwright selectors and reduce Firestore rules expression cost; sync develop [full-regression]
- **ui:** Remove 3x artwork under buttons
- **garage:** Regenerate eight clipped 3x WebP badges and protect gallery geometry
- **garage:** Redraw six full 3x store icons, prevent clipping and document visual gate [full-regression]
- **garage:** Restore vivid 3D Store artwork with unclipped 3x WebP icons [full-regression]
- **garage:** Stop rendering covered home under dialogs
- **i18n:** Move HUD artwork gallery copy into the locale tables
- **garage:** Frame flight mode by its folded-wheel width
- **home:** One-line tagline pays for the wrapped Practice row
- **home:** Keep the desktop Start row on one line with the Garage NEW tag [full-regression]
- **hud:** Draw the 3x artwork disclosure in the page

### 💼 Other

- **wave1:** Integrate tutorial UX combos into develop
- **wave1:** Integrate mobile controls and HUD into develop
- **wave1:** Integrate Garage Preview Studio into develop
- **develop:** Sync Wave 1 mobile HUD, tutorial and garage into foldable feature
- **wave2:** Sync develop into high-speed-vfx without losing Wave 2 design
- **skins:** Add four transparent vector category icons [skip ci]
- Non-destructively integrate develop Wave 1 into garage VFX skins
- **develop:** Preserve Wave 1 Garage/HUD with drift tutorial and iOS touch guard
- **garage:** Deny unpublished trial JS/assets in production and use separate test-only bundle
- Origin/develop into feature/garage-vfx-skins [full-regression]
- Origin/develop 54de8259 into feature/garage-vfx-skins [full-regression]
- Origin/develop bcf9b3f5 (high-speed VFX) into feature/garage-vfx-skins [full-regression]
- **develop:** Preserve Wave 1 and Wave 2 planning baseline
- **develop:** Integrate Foldable and Garage (dece5745) into eight-car grid [full-regression]
- Integrate develop into feature/in-race-feedback-visibility [full-regression]
- Feature/in-race-feedback-visibility into develop
- Integrate develop into feature/in-race-feedback-visibility [full-regression]
- Combine remote telemetry/NITRO placement fix with GO countdown refresh [full-regression]
- Feature/in-race-feedback-visibility into develop
- **store:** Add transparent non-transactional collection icons [skip ci]
- **develop:** Preserve Garage RED regression while syncing HUD fixes [full-regression]
- **garage:** Restore three cropped 216px 3x badge masters and their runtime WebPs
- **garage:** Four original 288-unit transparent airflow vectors for 3x thumbnail display
- **develop:** Preserve Wave3 source gallery and CI guard with Garage compact UI [full-regression]
- **develop:** Sync garage VFX Studio with latest pickups and CI optimizations [full-regression]
- **wave3:** Archive six original 3x garage store WebP images
- **wave3:** Archive eight original 3x rewards and missions WebP images
- **wave2:** Archive first 13 original 3x garage skins WebP materials
- **wave2:** Archive remaining 14 original 3x garage skins WebP materials
- **wave1:** Archive first nine 3x mobile HUD WebP images
- **wave1:** Archive remaining nine 3x mobile HUD WebP images
- **develop:** Sync 3x HUD artwork integration with latest develop

### 🚜 Refactor

- **tutorial:** Extract bilingual lesson copy to satisfy module size gate
- **hud:** Gate READY feedback at the HUD boundary without main.js growth
- **hud:** Move nitro status copy to its catalog
- **garage:** Keep world scene adapter at legacy line ceiling
- **garage:** Honor main/world legacy module-size ratchets and use typed auth dependency
- **garage:** Node-compatible #imports for TDD and Vite build aliases
- Restrict placement measurements to structural changes and preserve warnings
- **hud:** Reuse 3x responsive artwork widgets for all 18 source images
- **wave3:** Reuse the same safe 3x artwork and neon card widgets for gallery
- **rivals:** Move rival NITRO timing into rival-items.ts
- **items:** NITRO_MAX, pickup and ring NITRO amounts live in ring-layout.ts
- **garage:** Keep 1126-line world.js legacy ceiling with no per-frame allocations
- **garage:** Reuse 3x image widget and CSS-toned card for all 11 badges and 22 skins
- **art:** Shared artwork widget supports rectangular 3x HUD buttons without duplicate rendering code
- **art:** One responsive neon card for 3x badges, mission, store and HUD images
- **garage:** Use semantic full-card Preview button with separate Equip action
- **race:** Move the app createRace wrapper out of main.js
- **garage:** Remove redundant disabled tabs and reserved scrollbar gutter [full-regression]

### 📚 Documentation

- **spec:** Define SDD and BDD for foldable-layout-adaptation
- **plan:** Create Superpowers SDD-BDD-TDD plan for foldable-layout-adaptation
- **visual:** Add screen and asset design prompt for foldable-layout-adaptation
- **plan:** Add visual art direction and responsive asset gate for foldable-layout-adaptation
- **prompt:** Add standalone GPT Wave 2 assignment for foldable-layout-adaptation
- **wave:** Specify GPT-made assets and transparent-background policy for foldable-layout-adaptation
- **visual:** Add optional GPT image creation and alpha asset QA for foldable-layout-adaptation
- **plan:** Add conditional GPT asset generation and alpha QA task for foldable-layout-adaptation
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for foldable-layout-adaptation
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Require actual approved-art visual gate [skip ci]
- **dispatch:** Require user-approved reference fidelity [skip ci]
- **visual:** Require true reference assets before image generation [skip ci]
- **wave2:** Target develop and enforce full regression dependency gate [skip ci]
- **wave2:** Align foldable-layout-adaptation spec and plan to develop [skip ci]
- **spec:** Define SDD and BDD for tutorial-ux-combos
- **plan:** Create Superpowers SDD-BDD-TDD plan for tutorial-ux-combos
- **visual:** Add screen and asset design prompt for tutorial-ux-combos
- **plan:** Add visual art direction and responsive asset gate for tutorial-ux-combos
- **prompt:** Add standalone GPT Wave 1 assignment for tutorial-ux-combos
- **tutorial:** Record implementation and cancelled CI verification gate
- **tutorial:** Reconcile implementation checklist before final CI gate
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **tutorial:** Add explicit approved-art visual fidelity gate [skip ci]
- **tutorial:** Update GPT handoff with original screenshot comparison [skip ci]
- **visual:** Bind image generation to original high-fidelity art [skip ci]
- **spec:** Define SDD and BDD for mobile-controls-hud
- **plan:** Create Superpowers SDD-BDD-TDD plan for mobile-controls-hud
- **visual:** Add screen and asset design prompt for mobile-controls-hud
- **plan:** Add visual art direction and responsive asset gate for mobile-controls-hud
- **prompt:** Add standalone GPT Wave 1 assignment for mobile-controls-hud
- **visual:** Add editable layout proposal blueprints [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Add reviewer-locked visual fidelity gate [skip ci]
- **dispatch:** Lock source-image visual acceptance prompt [skip ci]
- **visual:** Bind image generation to original high-fidelity art [skip ci]
- **assets:** Specify verified 3x art pack, 1x CSS sizing and pending import [skip ci]
- **dispatch:** Require 3x raster to display at 1x CSS dimensions [skip ci]
- **assets:** Commit exact 3x filenames, checksums and 1x import contract for mobile-controls-hud [skip ci]
- **plan:** Link exact raster handoff and CSS sizes [skip ci]
- **dispatch:** Point to exact 3x image manifest [skip ci]
- **assets:** Use valid candidate key in integration example [skip ci]
- **spec:** Define SDD and BDD for garage-preview-studio
- **plan:** Create Superpowers SDD-BDD-TDD plan for garage-preview-studio
- **visual:** Add screen and asset design prompt for garage-preview-studio
- **plan:** Add visual art direction and responsive asset gate for garage-preview-studio
- **prompt:** Add standalone GPT Wave 1 assignment for garage-preview-studio
- **garage:** Reconcile typed studio adapter and record unverified acceptance gates
- **visual:** Add editable layout proposal blueprints [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Add reviewer-locked visual fidelity gate [skip ci]
- **dispatch:** Lock source-image visual acceptance prompt [skip ci]
- **visual:** Bind image generation to original high-fidelity art [skip ci]
- **spec:** Define SDD and BDD for high-speed-vfx
- **plan:** Create Superpowers SDD-BDD-TDD plan for high-speed-vfx
- **visual:** Add screen and asset design prompt for high-speed-vfx
- **plan:** Add visual art direction and responsive asset gate for high-speed-vfx
- **prompt:** Add standalone GPT Wave 2 assignment for high-speed-vfx
- **wave:** Specify GPT-made assets and transparent-background policy for high-speed-vfx
- **visual:** Add optional GPT image creation and alpha asset QA for high-speed-vfx
- **plan:** Add conditional GPT asset generation and alpha QA task for high-speed-vfx
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for high-speed-vfx
- **vfx:** Add independent NITRO/BOOST storyboard reference [skip ci]
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Reference prebuilt SVG assets and avoid regeneration [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Add reviewer-locked visual fidelity gate [skip ci]
- **dispatch:** Lock source-image visual acceptance prompt [skip ci]
- **visual:** Bind image generation to original high-fidelity art [skip ci]
- **wave2:** Target develop and enforce full regression dependency gate [skip ci]
- **wave2:** Align high-speed-vfx spec and plan to develop integration [skip ci]
- **wave2:** Record actual RED evidence, implementation and remaining visual/CI gates
- **wave2:** Track completed implementation subitems and pending acceptance in TODO #10 [full-regression]
- **spec:** Define SDD and BDD for garage-vfx-skins
- **plan:** Create Superpowers SDD-BDD-TDD plan for garage-vfx-skins
- **visual:** Add screen and asset design prompt for garage-vfx-skins
- **plan:** Add visual art direction and responsive asset gate for garage-vfx-skins
- **prompt:** Add standalone GPT Wave 2 assignment for garage-vfx-skins
- **wave:** Specify GPT-made assets and transparent-background policy for garage-vfx-skins
- **visual:** Add optional GPT image creation and alpha asset QA for garage-vfx-skins
- **plan:** Add conditional GPT asset generation and alpha QA task for garage-vfx-skins
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for garage-vfx-skins
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Reference prebuilt SVG assets and avoid regeneration [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Require actual approved-art visual gate [skip ci]
- **dispatch:** Require user-approved reference fidelity [skip ci]
- **visual:** Require true reference assets before image generation [skip ci]
- **assets:** Specify verified 3x art pack, 1x CSS sizing and pending import [skip ci]
- **dispatch:** Require 3x raster to display at 1x CSS dimensions [skip ci]
- **assets:** Commit exact 3x filenames, checksums and 1x import contract for garage-vfx-skins [skip ci]
- **plan:** Link exact raster handoff and CSS sizes [skip ci]
- **dispatch:** Point to exact 3x image manifest [skip ci]
- **assets:** Use valid candidate key in integration example [skip ci]
- **wave2:** Target develop and enforce full regression dependency gate [skip ci]
- **wave2:** Align garage-vfx-skins spec and plan to develop [skip ci]
- **garage-skins:** Record Phase A implementation, pending QA and Phase B gate
- **garage:** Phase B runtime contract, testing evidence gaps and upstream gates [full-regression]
- **garage:** Document SOLID Strategy rollout, Vite bundle isolation and backend entitlement security
- **spec:** Define SDD and BDD for race-difficulty-eight-car-grid
- **plan:** Create Superpowers SDD-BDD-TDD plan for race-difficulty-eight-car-grid
- **visual:** Add screen and asset design prompt for race-difficulty-eight-car-grid
- **plan:** Add visual art direction and responsive asset gate for race-difficulty-eight-car-grid
- **prompt:** Add standalone GPT Wave 2 assignment for race-difficulty-eight-car-grid
- **wave:** Specify GPT-made assets and transparent-background policy for race-difficulty-eight-car-grid
- **visual:** Add optional GPT image creation and alpha asset QA for race-difficulty-eight-car-grid
- **plan:** Add conditional GPT asset generation and alpha QA task for race-difficulty-eight-car-grid
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for race-difficulty-eight-car-grid
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Add reviewer-locked visual fidelity gate [skip ci]
- **dispatch:** Lock source-image visual acceptance prompt [skip ci]
- **visual:** Bind image generation to original high-fidelity art [skip ci]
- **wave2:** Target develop and enforce full regression dependency gate [skip ci]
- **wave2:** Align race-difficulty-eight-car-grid spec and plan to develop integration [skip ci]
- **wave2:** Record implementation, actual RED/GREEN gates and remaining verification [full-regression]
- **wave2:** Request exact-head cross-platform full CI after 8-car repairs [full-regression]
- **ux:** Specify in-race road-safe feedback and toast behavior [skip ci]
- **ux:** Plan TDD peripheral race toast and forward-road visibility [skip ci]
- Record road-safe HUD implementation constraints [full-regression]
- **plan:** Classic first-three-map pickup density plan
- **plan:** Version-key design and TODO tracking for classic pickup density
- **todo:** Pause classic pickup density until Wave 2 lands in develop
- **todo:** Queue stage 2 rival item pickups behind classic pickup density
- **plan:** Other tracks and modes addendum for classic pickup density
- **plan:** User decisions on Aurora, Sky Spiral, Circuit and bot extension
- **plan:** Align AC2/AC3 with the expanded scope
- **plan:** Difficulty-curve decision and complete stage plan (S0-S9, stage 2)
- **plan:** Record S3 develop merge and unchanged economy numbers
- **release:** Stamp shipped 0.28.0 notes and add reviewed 0.29.0 ring highlights
- **plan:** Record S6-S8 results, Firestore deploy order and render table [full-regression]
- **todo:** Tick S7 and S9 for classic pickup density (CI 41319983990 green)
- **release:** Deploy changed Firestore rules before tagging
- **hud:** Map 18 original 3x assets to live buttons, preview gallery, and QA gates
- **spec:** Define SDD and BDD for garage-store-readiness
- **plan:** Create Superpowers SDD-BDD-TDD plan for garage-store-readiness
- **visual:** Add screen and asset design prompt for garage-store-readiness
- **plan:** Add visual art direction and responsive asset gate for garage-store-readiness
- **prompt:** Add standalone GPT Wave 3 assignment for garage-store-readiness
- **wave:** Specify GPT-made assets and transparent-background policy for garage-store-readiness
- **visual:** Add optional GPT image creation and alpha asset QA for garage-store-readiness
- **plan:** Add conditional GPT asset generation and alpha QA task for garage-store-readiness
- **spec:** Clarify Wave 2-3 optional images, alpha channel and BDD asset fallback for garage-store-readiness
- **plan:** Record independent artwork status and deferred Wave prerequisites [skip ci]
- **dispatch:** Hand off prebuilt artwork and defer runtime until dependency gates [skip ci]
- **visual:** Reference prebuilt SVG assets and avoid regeneration [skip ci]
- **visual:** Map original reference art and require render fidelity signoff [skip ci]
- **plan:** Require actual approved-art visual gate [skip ci]
- **dispatch:** Require user-approved reference fidelity [skip ci]
- **visual:** Require true reference assets before image generation [skip ci]
- **assets:** Specify verified 3x art pack, 1x CSS sizing and pending import [skip ci]
- **dispatch:** Require 3x raster to display at 1x CSS dimensions [skip ci]
- **assets:** Commit exact 3x filenames, checksums and 1x import contract for garage-store-readiness [skip ci]
- **plan:** Link exact raster handoff and CSS sizes [skip ci]
- **dispatch:** Point to exact 3x image manifest [skip ci]
- **assets:** Use valid candidate key in integration example [skip ci]
- **wave3:** Guide Coming Soon store to six verified 3x WebPs and 1x CSS
- **wave3:** Update garage-store-readiness raster handoff with verified 3x Git source
- **wave3:** Make store 3x source assets mandatory in agent and dispatch entrypoints
- **wave3:** Record all 6 verified 3x source images and non-entitlement UI integration
- **plan:** Stage 2 rival item pickups (planned, not scheduled)
- **plan:** Stage 2 decisions, inventory and slice plan
- **release-notes:** 0.29.0 What's New for rivals grabbing NITRO and twice the rings
- **plan:** Stage 2 measurements, AC5 WebGL table and Tokyo draw attribution
- **plan:** Attribute Tokyo's draw-call rise to car position, not item rendering [full-regression]
- **todo:** Tick stage 2 rival item pickups and R11 after green quality-gate
- **plans:** Mark stage 2 rival item pickups done after green develop CI
- **release:** Require real-game media for visible highlights
- **release:** Review 0.29.0 notes
- **release:** Record What's New media once, at release
- **claude:** Move situational guidance into docs/
- **claude:** Dedupe docs/ into path-scoped rules
- **todo:** Plan air-road combo, tutorial and mobile controls UX
- **todo:** Plan separate Garage Skins and visual effects feature
- **todo:** Define Garage Studio, trial cosmetics, economy roadmap and mobile HUD UX
- **todo:** Clarify cosmetic earning paths and scope-specific verification gates
- **todo:** Plan barrel-roll lesson in tutorial
- **todo:** Plan sustained tutorial NITRO sprint and speed-aware racing VFX
- **todo:** Link verified official Asphalt nitro reference
- **todo:** Plan harder AI, eight-car racing and reverse-grid multi-heat rules
- **todo:** Correct race-standings path formatting
- **todo:** Confirm Hybrid A+B default with optional Competitive C HUD mode
- **todo:** Require cross-platform responsive and quality-tier acceptance for all UX features
- **plan:** Add multi-wave GPT dispatch index and dependency verification gatebook
- **waves:** Document optional GPT asset production, transparent backgrounds and acceptance across Wave 2-3
- **waves:** Index early SVG assets and deferrals for Wave 2-3 [skip ci]
- **visual:** Define signoff and real-render fidelity gate [skip ci]
- **waves:** Index image-to-implementation visual fidelity process [skip ci]
- **todo:** Require reference-approved visual parity before UI completion [skip ci]
- **waves:** Index 3x candidate art, CSS 1x sizes and import gates [skip ci]
- **waves:** Link reusable 3x asset manifests and honest binary import status [skip ci]
- **waves:** Record W1-to-develop merges and W2 dispatch gates [skip ci]
- **todo:** Expand Wave 2 Garage VFX Phase B visual assets and unique skin acceptance
- **garage:** Map 16 runtime effects to original art and unapproved candidates
- **todo:** Record partial Phase B effect implementation and remaining visual/CI gates
- **garage:** Record recovered ZIP, 27 archived WebPs and ten trial 3x-to-1x integrations
- **garage:** Update 27-art/22-skin matrix and 59-art cross-wave checkpoint [full-regression]
- **garage:** 59-image clipping audit and reusable 3x art components [full-regression]
- **todo:** Record garage skin replacement and 3d fx [full-regression]
- **garage:** Full-card preview UX and four 3x airflow designs [full-regression]
- **claude:** Require AI-generated images at 3x display size
- **readme:** Compact feature-first media layout with track montage
- **hud:** Describe Race HUD in the VFX panel; use ciTimeout in its spec
- **garage:** Ground/flight acceptance and screenshot evidence [full-regression]
- **assets:** Document 59 verified 3x WebP materials and 1x CSS Wave 3 handoff
- Note artwork restore path
- **rings:** Document ring trains, rows, pickup runs
- **todo:** Track studio exhaust zoom evidence
- **rings:** Document middle-lane trains and 5 slots per car
- **claude:** Move file-scoped sections into rules
- **release-notes:** Document poster + play clips; encode clips at the best CRF under 1 MB
- **release:** Review 0.29.0 notes

### ⚡ Performance

- **cars:** Draw each car's static parts once per material [full-regression]
- **effects:** Draw rings and pickups through one instanced mesh per material
- **markers:** Cull instanced ring/pickup pools by this frame's bound

### 🎨 Styling

- **wave2:** Color-code seven opponents and offset minimap by actual lane
- Compact race feedback into peripheral single-line chips
- Reserve gap between peripheral feedback and protected roadway

### 🧪 Testing

- **ci:** Require develop in the CI push triggers
- **tutorial:** Cover real ten-step keyboard and multi-touch practice
- **tutorial:** Keep airborne stunt landings gentle under real physics
- **tutorial:** Require all 49 bilingual coaching keys including reverse steer
- **tutorial:** Synchronize real flick gestures and WebGL effect decay
- **tutorial:** Synchronize touch maneuvers with real WebGL frames
- **tutorial:** Verify genuine glide barrel roll before clean landing
- **tutorial:** Cover retryable NITRO sprint in real keyboard WebGL flow
- **tutorial:** Scale the sprint interrupt wait for ci
- **tutorial:** Keep touch steering edges within barrel-roll timing window
- **garage:** Add bounded studio orbit camera contract (red-green)
- **garage:** Add BDD cross-viewport studio and navigation regression scenarios
- **garage:** Capture real WebGL screenshots and assert car bounds and draw metrics
- **vfx:** Await actual barrel-roll ribbon fade under software WebGL
- **garage:** Real-WebGL quality-tier evidence and all-angle silhouette regressions
- **garage:** Archive before/after real-WebGL and complete UI screenshots at target viewports
- **foldable:** Add viewport-segment geometry and real DOM hinge regressions
- **foldable:** Preserve toolbar-resize input contract with hinge-aware regression
- **foldable:** Cover short-landscape desktop locales and horizontal hinge screenshots
- **foldable:** Upload real layout screenshots and run all acceptance shards [full-regression]
- **foldable:** Preserve real tutorial flight through button flick and retry soft chain landing [full-regression]
- **tutorial:** Declare fly touch point for barrel roll [full-regression]
- **tutorial:** Specify real drift payout and negative behavior before implementation
- **tutorial:** Verify bilingual drift coaching and eleven lessons
- **tutorial:** Steer within road while proving real drift payout
- **ios:** Target non-scrollable HUD for long-press regression
- **tutorial:** Restore drift loop lost to escaped newlines
- **tutorial:** Drive the DRIFT lesson in keyboard and touch practice
- **tutorial:** Release fly in one touch dispatch
- **tutorial:** Send the barrel roll flick in one turn
- **hud:** Follow the Wave 1 HUD spec labels [full-regression]
- **touch:** Find the NITRO button by its control [full-regression]
- **touch:** Find the handoff NITRO button by its control
- **tutorial:** Retry missed air lessons with real input [full-regression]
- **touch:** Read custom layouts from the per-orientation store [full-regression]
- **wave2:** RED contracts for bounded four-phase sprint visual state
- **wave2:** RED regression for renderer NITRO/BOOST color and pooled resources
- **wave2:** Browser WebGL color, shader lifecycle and twelve-second visual evidence
- **wave2:** Measure actual 10-second browser frame-time p50 and p95
- **vfx:** Scale nitro recovery poll by ci factor
- **touch:** Read edited layout from orientation key
- **ui:** Pin the reviewed CSS before the Wave 1 NITRO block [full-regression]
- **touch:** Release toggled FLY without post-cue layout wait [full-regression]
- **garage-skins:** Cover Phase A BDD trial, ownership, account isolation and asset fallbacks
- **garage-skins:** Add Phase A catalog browser BDD and missing-art fallback
- **garage-skins:** Pin actual legacy PAINTS unlock thresholds
- **tutorial:** Restore drift loop lost to escaped newlines
- **garage:** RED trial equip, expiry, account isolation and permanent entitlement contract
- **garage:** RED shader-safe visual palette per cosmetic category
- **garage:** RED shared Aero shader palette preserves GPU resource identity
- **garage:** RED full-screen Stage uses shared Aero shader and bounded preview GPU resources
- **garage:** RED reactive trial preview/equip and account-bound renderer notifications
- **garage:** RED live Vue trial controls and shared WebGL palette in 3 viewports
- **garage:** RED new blue launch flare triggers on race start without boost
- **garage:** RED require real NITRO trail geometry visible in Studio preview
- **garage:** RED trial flag revocation clears both preview and transient equipped skins
- **garage:** RED require disposal of new unique studio VFX geometries
- **garage:** RED automatically revoke timed free trial and refresh live renderer
- **garage:** RED moving shared VFX preview must not shift the car silhouette
- **garage:** RED studio cosmetic shader prewarming and event-driven GPU resource reuse
- **garage:** RED changing skins never compiles new GPU shader programs after warmup
- **garage:** Fix Playwright program-count numeric attribute regex
- **garage:** RED VFX geometry must not affect actual vehicle silhouette camera bounds
- **garage:** RED build-time release strategies, fail-closed prod aliases and bundle leak audit
- **garage:** RED mandatory default production bundle audit in CI and inert coming-soon UI
- **garage:** RED Pages deployment must pin reviewed release strategy
- **garage:** RED exclude all unreleased cosmetic IDs from shared shader and deployment artifact
- **wave2:** RED scenarios for eight-car fields, difficulty and legacy cup
- **wave2:** Update obsolete four-car assumptions while preserving legacy paths
- **wave2:** Cover real reverse-grid Cup/Sprint, storage and WebGL HUD
- **wave2:** Isolate steering physics and preserve three-car home showcase
- **wave2:** Validate seven knockout rounds, isolate air-dash physics
- **wave2:** Differentiate eight-car new Custom defaults from legacy v1 signatures
- **wave2:** Exercise real two-car Custom race and responsive HUD WebGL
- **wave2:** Align classic World Tour marker counts and bilingual eight-car setup copy
- Locate combined Audio/HUD settings by stable button id [full-regression]
- Assert current Nitro READY state in charged FLY tests [full-regression]
- **ci:** Align touch layout assertions with orientation v2 schema
- **ci:** Allow bounded engine-verified touch retries to complete [full-regression]
- Sample real touch steering across a frame [full-regression]
- **ui:** Pin the reviewed CSS before the Wave 1 NITRO block [full-regression]
- **tutorial:** Avoid layout round trip during powered landing [full-regression]
- **hud:** Assert in-race HUD blocks never overlap on phones, tablet and folds
- **red:** Specify bounded road-safe reward feedback cadence
- **red:** Assert WebGL racing road stays clear of event chips
- Ensure peripheral placement avoids road, HUD and hinge
- **i18n:** Wait out the 2 s near-miss cooldown before the charge callout [full-regression]
- **economy:** Measure Classic BOOST/NITRO economy on all ten tracks
- **economy:** Measure modes, Circuit, Endless and daily layouts with a capped bot
- **records:** Export, import and cloud merge keep old and layout 2 records
- **browser:** Seed current-layout records under their layout 2 ids
- **cloud:** Firestore accepts layout 2 Circuit and mode record keys and run layout fields [full-regression]
- **browser:** Read Coast layout 2 records and fly each first-group ring at its own height [full-regression]
- **hud:** RED all eighteen 3x UI originals must render at 1x in settings preview
- **hud:** RED 3x action glyphs must decorate real controls without intercepting clicks
- **hud:** RED all 18 native 3x artworks must fit safe shared cards on mobile and desktop
- **hud:** RED translucent 3x button images must fit existing hit regions
- **wave3:** RED 6 original 3x garage-store-readiness images need safe Garage UI
- **art:** RED shared 3x cards need safe frames and caption separation at all viewports
- **wave3:** RED read-only interactive mission/store catalog with bilingual 3x artwork
- **wave3:** Exercise locale switch outside modal before reopening preview
- **economy:** Measure every mode, track and difficulty with seven rivals
- **economy:** The bot steers around rivals like a player
- **economy:** Lock AC1 player take and AC2 rival NITRO across every mode, track and difficulty
- **history:** Seed saved runs on each track's current layout version [full-regression]
- **hud:** Measure transient HUD overlays in one atomic snapshot [full-regression]
- **hud:** Keep the portrait callout-during-GO! guard [full-regression]
- **hud:** Keep ring-reward and low-charge specs independent of rival pickups and denser refills [full-regression]
- **garage:** RED guard Wave3 previews and approved public-trial VFX integration
- **garage:** Reproduce long-duration trial expiry timer gap (RED)
- **garage:** RED 16 distinct VFX skins and shared shader patterns [full-regression]
- **garage:** Expect preview and try controls for all 16 skins [full-regression]
- **garage:** RED expired session trial must not revive temporary equip
- **garage:** Expect original 3x WebP at 1x CSS and staged SVG fallback (RED)
- **garage:** Correct 3x WebP URL and regex assertions (RED)
- **garage:** RED real beam and repeatable flare previews on Garage Home and Studio
- **garage:** Cover all sixteen GPU previews and archive actual 3D screenshots
- **release:** RED reject bundling premium Void beams in locked production
- **garage:** RED Home ready-phase must display actual NITRO ribbon and Void beams
- **garage:** RED cover 16 original VFX equipment images, 22 skins, and 11 badge illustrations
- **garage:** RED animated purple NITRO shader must have a moving time uniform
- **garage:** RED 3x rarity/badge image failures must show accessible text fallback
- **garage:** Verify localized badge image fallback [full-regression]
- **garage:** RED 3 cropped badges need balanced 3x alpha and safe icon/label layout
- **garage:** RED all 11 badges require one themed neon CSS card and safe 3x layout
- **garage:** RED full-card preview UX, action isolation and four native-3x airflow icons [full-regression]
- **garage:** RED paint collection should match game-like card UX without breaking paint preview
- **garage:** Validate all four distinct 288-unit Airflow sources [full-regression]
- **garage:** Capture actual mobile paint cards in existing foldable artifact upload [full-regression]
- **garage:** RED public free-trial rollout, trial bundle audit and reload-safe entitlement
- **vfx:** Keep wave 2 browser samples numeric
- **browser:** Wait on frames, not wall-clock, in black-frame phases [full-regression]
- **hud:** Judge one-charge NITRO press from recorded meter values [full-regression]
- **garage:** RED photo-quality 3x paint cards and real showroom paint shader
- **garage:** Update default camera snapshot for flight pose
- **garage:** Regression tests for frame fit and real WebGL Ground/Flight
- **garage:** Regression tests for frame fit and real WebGL Ground/Flight
- **garage:** RED viewport-density and real WebGL layout acceptance
- **garage:** RED viewport-density and real WebGL layout acceptance
- **ui:** Record the Race HUD CSS change in the main UI contract
- **garage:** Request full visual regression for regenerated 3x WebP badges [full-regression]
- **garage:** Capture clipped store icons at native 3x size [full-regression]
- **endless:** Bound streamed items by the per-chunk layout
- **ui:** Record the Garage home promotion in the main UI contract
- **garage:** Zoom out enough to reach the 2.4 limit
- **items:** Remove two timing and random-layout flakes
- **endless:** Bound streamed rings and pickups by the exact window maximum
- **hud:** Fly the live first ring group of a pinned Coast layout [full-regression]
- **items:** Judge the emp icon on the next frame
- **whats-new:** Read clip frames in-page
- **hud:** Measure artwork cards in one pass
- **hud:** Pin the layout seed before the mode tab

### ⚙️ Miscellaneous Tasks

- Adopt develop branch flow
- Run browser suites only on main and develop
- Pack browser and World Tour shards by measured duration [full-regression]
- **wave2:** Upload real rendered high-speed sprint screenshots and timed animation
- **garage:** GREEN require secure default production bundle audit in unit quality gate
- **garage:** Pin reviewed Pages release to coming-soon, prevent environment bypass
- **scripts:** Add what's new clip recorder
- **garage:** Request exact HEAD browser, screenshot and performance verification [full-regression]
- **hooks:** Allow only develop/hotfix into main
- Fail main pushes that merge non-develop branches
- Skip suites for docs/media-only changes
- Skip suites for makefile-only changes
- **garage:** Upload actual ground/flight WebGL inspection screenshots
- **garage:** Archive actual compact Garage Home and Studio screenshots [full-regression]
- **release:** Record What's New clips at balanced quality
## [0.28.0] - 2026-10-31

### 🚀 Features

- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Enable every themed track while preserving finite course API
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Stream unbounded three-dimensional scenery without changing finite races
- **endless:** Repeat smooth Sky Spiral 3D helices after original finish
- **endless:** Repeat smooth Sky Spiral 3D helices after original finish
- **endless:** Repeat smooth Sky Spiral 3D helices after original finish
- **endless:** Repeat smooth Sky Spiral 3D helices after original finish
- **vfx:** Add quality-aware barrel-roll wake
- **diag:** Keep the crash log and live input panel in VITE_DIAG builds only
- **aero-vfx:** Trace the barrel-roll wake in still air
- **dev:** Add make phone off to stop phone servers
- **dev:** Add make phone-unlocked for all-unlocked phone server

### 🐛 Bug Fixes

- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Preserve finite scenery and modularize bounded infinite collisions
- **endless:** Align spiral frame with 3D helix and stream Alpine/Coastal terrain past finish
- **endless:** Keep streaming traffic visible beyond authored finish, test real rendering
- **endless:** Keep Sky Spiral landmarks stable across repeat seams
- **endless:** Fade streamed Sky Spiral landmarks without visual popping
- **touch:** Hide touch controls by visibility so iOS releases held fingers
- **release-notes:** Fade the media viewer and centre the zoom icon
- **aero-vfx:** Keep wake history in world space when the render origin's height moves
- **release-notes:** Drop the focus ring that flashed on tapped pictures and clips
- **ui:** Show focus rings for the keyboard only so closing any dialog never flashes one
- **dev:** Ignore sibling worktree reloads
- **endless:** Save and show results on every Endless track

### 🚜 Refactor

- **endless:** Isolate bounded World Tour collision window

### 📚 Documentation

- **release:** Review 0.28.0 notes
- **claude:** Tier UI changes by visual quality
- **make:** List off in phone-diag and phone-unlocked help
- **todo:** Record ci shard timings, gate status

### 🧪 Testing

- **endless:** RED ten-track survival and beyond-finish rendering contracts
- **endless:** Live WebGL continuation, bounded assets and ten route selections
- **endless:** RED repeat elevated Sky Spiral curves without changing sprint path
- **endless:** RED require spiral frame centre to follow generated helix
- **endless:** Verify Sky and World Tour unbounded GPU windows plus bounded solid scenery
- **endless:** Reproduce Sky Spiral hero teleport across scenery seams
- **endless:** Reproduce distant Sky Spiral landmark popping
- **endless:** Archive ten-track 85km WebGL evidence and document acceptance
- **endless:** Bound variable streamed scene nodes without masking GPU growth
- **ui:** Measure media geometry in one frame
- **ui:** Re-pin stylesheet hash for keyboard-only focus rings
- **vfx:** Scale the roll wake fade wait for slow CI

### ⚙️ Miscellaneous Tasks

- **endless:** Include responsive layout verification in feature branch quality gate
- Ignore airflow and barrel-roll wake evidence folders
- Ignore barrel-roll physics and worktree cleanup evidence folders
- Ignore main test repair evidence folder
- Ignore new artifact evidence folders by default, keep README media tracked
- Drop duplicate layout run and retired jobs
- Run 16 browser and 8 world tour shards
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
