# Tesla Roadster 2 — Airflow & Nitro VFX status

This is the implementation checklist. A feature changes from `- [ ]` to `- [x]` only after its implementation and relevant verification are complete.

## P0 — Integrated gameplay VFX

- [x] Preserve the existing Shift boost input, charge use, movement and collision rules.
- [x] Add four vehicle-local rear cold-gas nozzle anchors.
- [x] Render white / pale-blue cold-gas cores with directional expansion and restrained Mach-diamond rhythm.
- [x] Trigger a short ignition shockwave and local pressure distortion with Boost.
- [x] Leave vapor and a continuous ribbon in world space behind the observed movement path.
- [x] Interpolate high-distance movement without unbounded particle work or trails through collision discontinuities.
- [x] Add bounded boost afterimages and make their count configurable.
- [x] Fade jets, vapor, ribbons and afterimages on Boost release; clear them on race reset.
- [x] Add `V` to toggle Airflow Visualization without changing car physics.
- [x] Provide an AIRFLOW ACTIVE HUD with aero mode, flow, floor and jet states.

## P1 — Airflow, feedback and controls

- [x] Render preconfigured body, roof, side, wheel, underbody and rear-wake streamlines that follow the player transform.
- [x] Adjust streamline flow and length from actual vehicle speed.
- [x] Render grounded underbody suction / low-pressure visualization and preserve existing flight downwash.
- [x] Provide Low Drag and High Downforce visual modes; only visual wing pose and VFX vary.
- [x] Add Boost FOV, restrained camera response, peripheral speed lines and local blur/distortion.
- [x] Add a cold-gas release / wind sound layer to the existing Boost audio event.
- [x] Add Boost HUD states: ready, active, recharging and empty.
- [x] Provide Realistic, Cinematic and Extreme visual presets.
- [x] Provide persistent VFX settings, quality levels and bounded tuning controls.
- [x] Provide Comfort mode and honor system reduced-motion preference.
- [x] Provide optional haptic feedback where the browser supports `navigator.vibrate`.
- [x] Provide six showcase camera views while Airflow is active.
- [x] Verify desktop and narrow mobile VFX controls in a real browser.

## P2 — Deliberately deferred enhancements

- [ ] Add side / attitude-control thrusters after the car model has real, approved anchor locations.
- [ ] Add surface-specific ground response once the world has distinct road, dust and wet-material metadata.
- [ ] Add a dedicated in-game audio-volume mix for VFX beyond the existing global sound-effects setting.
- [ ] Test on physical touch hardware and Safari / Firefox graphics drivers.

## Verification

- [x] Unit coverage for settings bounds, local anchor rotation, world-space rebasing, bounded repeated use, release/reset and collision discontinuities.
- [x] Unit coverage for the V keyboard action without disturbing held driving inputs.
- [x] Targeted browser coverage for Airflow, presets, quality, all showcase views, Boost coexistence, pause/restart, persistence, mobile layout and reduced motion.
- [x] Full browser regression after the latest continuous-ribbon change.
