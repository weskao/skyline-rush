# Home-screen showcase: ready-screen floating controls

Read before changing the camera dock / Start button layout on the ready screen.
Landmark framing, the six camera views, the AIRFLOW ground contract, occlusion and full-car
framing: → Read `.claude/rules/track-showcase.md`.

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
