---
paths:
  - "src/race-select-ui.ts"
  - "src/race-lobby.css"
  - "tests/mode-first-setup-browser.spec.js"
---

# Mode-specific Restore defaults

The Home rules-row "Restore defaults" is visible only when the selected mode has user-editable
settings that this action actually resets. Classic, Endless and Elimination have no such
settings and must not expose an inert button. Event Lab owns its own setup dialog.

Custom/Free reset their shared rule fields. Time, Gauntlet, Checkpoint, Cup, Stunt and Circuit
reset their respective controls; Circuit laps reset to 3. Every visible option must be
covered by the reset handler, or the button must be hidden. Use the actual hidden attribute
and a matching CSS hidden rule, so the action is neither visible nor keyboard-focusable
on desktop, mobile portrait or landscape. When changing modes, update this state immediately.

Guard new modes and future option changes with desktop/mobile browser tests for visibility,
and verify that clicking Restore defaults actually resets each mode-specific control.

All gameplay modes (including an accepted Event Lab course) keep the existing live Three.js Home
showcase and a localized, mode-specific HUD preview. Update the shared race-presentation view
only when Home setup changes, not every animation frame. Preserve the selected Coming Soon
map across normal mode changes; only Circuit forces its fixed Harbor course. Preview must not
unlock a race, modify mode progression or add a separate WebGL renderer.
