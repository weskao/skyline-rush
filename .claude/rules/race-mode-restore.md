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
