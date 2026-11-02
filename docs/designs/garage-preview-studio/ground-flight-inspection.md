# Garage Studio: ground and flight inspection (2026-11-02)

## Reference
[Gran Turismo 7 Car Viewer](https://eu.gran-turismo.com/us/gt7/news/00_1852636.html) offers detailed car inspection from multiple angles and backdrops. [Gran Turismo 7 Scapes manual](https://www.gran-turismo.com/us/gt7/manual/scapes/02) describes rotation and view control.

## Behavior and rendering
- One shared WebGL context and existing Three.js Garage Studio stage.
- The camera orbits the measured car bounding-box center. Every angle uses projected height/width/depth plus viewport aspect, instead of a conservative bounding sphere. Controls preserve bounded drag, mouse wheel, pinch, buttons, and auto orbit.
- Mutually exclusive **平地展示 / Ground** and **起飛展示 / Flight** controls: Flight raises the actual vehicle, activates lift jets, tilts wheels and lifts the rear wing. Existing Aero preview resources are reused; no gameplay physics or progression changes.
- Changing viewing angle preserves Ground/Flight. Closing and reopening the Garage returns to Ground. Reduced-motion uses a stable hover without bob or banking. DOM controls are consistent across graphics quality levels.
- No audio was added: inspection should remain quiet and respect device mute.

## Acceptance
- `tests/garage-inspection-mode.test.js`: deterministic frame-fit projections and mode state.
- `tests/garage-inspection-mode-browser.spec.js`: actual software-WebGL ground/flight screenshots in desktop, mobile portrait and landscape, and five presets checked for clipping.
- GitHub Actions uploads `garage-inspection-*.png` in the `garage-vfx-preview-*` artifacts after full regression.
- Native iOS/Android touch, GPU/performance and visual-device validation remain manual gates. CI screenshot evidence is not proof of physical-device acceptance.
