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
