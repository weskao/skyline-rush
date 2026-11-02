# Home-screen showcase: landmark, camera and ready-screen controls

Read before changing the home 3D preview, showcase camera views, the camera dock / Start button layout, or adding a track. Scoped rule: `.claude/rules/track-showcase.md`.

## Home-screen landmark showcase

Selecting a map on the home screen must show that map's signature landmark in the live 3D
preview, and roadside props or terrain must not hide it there or while racing toward it —
without thinning the street: blocking props move or shrink, never disappear. Every new map
ships the same way; placement, occlusion and test rules are in
`.claude/rules/track-showcase.md` ("Signature landmark").

## Home showroom camera contract

All existing and future tracks share the same six ready-screen camera views: drive,
front, rear, left, right and orbit. The selected camera must work without enabling
AIRFLOW or visual effects. The curated home landmark shot is the *drive* default
only; it must never override another selected view. Keep the camera source of
truth in `vfxSettings().view`, the view ordering in `SHOWCASE_VIEWS`, and
the geometry-independent camera offsets in `showcaseCameraPose()`.
The ready-screen camera dock and VFX menu must stay synchronized and localized.
On World Tour roads, an in-frame projected car may still be blocked by foreground
facades or mountains. Sample actual car body visibility against opaque scenery;
when blocked, gently dolly/shift the camera in the local road frame, preserving
the curated landmark target and keeping the live WebGL car fully visible. Keep
occlusion tests outside the frame loop; never hide scenery or weaken QA.
Use the local tangent frame for 3D roads, honor reduced motion, and test all
`RACE_TRACKS` IDs plus an unknown future ID. AIRFLOW on puts the preview player
at road altitude 0 with hover jets off on every existing or future track, even
when `HERO_PREVIEWS` supplies a landmark camera. AIRFLOW off keeps the original
airborne hero; all six camera views must work in both states. Do not fork UI or
vehicle pose by map ID.

### Complete car framing on home previews

Never treat a visible car center, projected body width or five unobstructed
sample points as proof that the entire vehicle is visible. Check the projected
full 3D model bounds **including wheels, nose, tail and wings** against the
actual canvas aspect ratio with safety margins on all home showcase tracks.
A high landmark-directed look target (notably on Alpine Rail Pass) can crop
the car at the bottom while older occlusion checks still pass. Keep
the landmark shot and road frame, apply the smallest shared camera
reframing necessary and never shrink or hide the car or remove scenery.
Test AIRFLOW on/off at desktop 1440×900, ultrawide 1777×863 and
portrait 390×844, across all existing tracks, as well as all six angles.
Extend the same regression whenever a new track is added; do not add
track-specific clipping workarounds.

## Ready-screen floating controls: responsive spacing

The home showcase camera dock and the single Start button are one layout group
when AIRFLOW is active. Keep a visible vertical gap (at least 18 CSS px) in
desktop, phone portrait and short landscape viewports; do not use unrelated
fixed `bottom` offsets for these two controls. Share the Start baseline and
height budget through CSS variables, account for safe-area insets and alternate
mobile button heights, and allow short landscape to move the dock above the
bottom cluster. Do not block or move the showcased car to hide UI collisions.
Extend `tests/showcase-camera-browser.spec.js` with real bounding-box gap
assertions across viewport sizes and both locales, and use actual clicks on
camera controls and Start. Include the normal ready screen, AIRFLOW mode and
safe-area cases before considering future ready-screen overlays done.
