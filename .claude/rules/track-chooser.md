---
paths:
  - "src/race-select-ui.ts"
  - "src/race-lobby-ui.ts"
  - "src/track-chooser.css"
  - "src/locales/ui-overhaul.ts"
  - "tests/track-chooser-states-browser.spec.js"
---

# Track chooser: selection, availability and Home previews

Every card in the chooser stays keyboard/touch selectable, including locked and Coming Soon maps.
The staged choice changes only the dialog until confirmation; cancel restores the current Home map.
After confirmation, show that map's matching Home artwork / live preview and remember the choice,
but never promote a locked or Coming Soon race to playable as a side effect.
Availability badge colors derive from explicit track state (selected / available / locked / preview),
not from aria-pressed, aria-current, or focus styling. Keep these status colors distinct and accessible.
Preview-only confirmation says Preview on Home; raceable confirmation says Confirm track.
Keep en / zh-TW labels and the selected card, footer state and action in sync.
Regress all 16 currently listed courses and mobile/desktop chooser interaction.
