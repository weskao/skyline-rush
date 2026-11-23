---
paths:
  - "src/*tutorial*"
  - "src/TutorialCoach.vue"
  - "src/locales/**"
  - "tests/*tutorial*"
---

# Tutorial

Tutorial steps, lesson transitions or tutorial input → Read `docs/tutorial-driving.md` first
and follow it exactly.

First Start offers a choice before leaving the selected race. Reuse the saved race snapshot when practice ends. Only the explicit Skip Practice and Start Race actions start that snapshot. Closing the first choice leaves it eligible to reopen, and Back to Home from practice restores the selection in place. Guard the three paths in `tests/first-visit-start-parity-browser.spec.js`.

The Guide uses one explicit focus target after Vue applies the opening state. When opened from paused Controls, Esc closes the guide and returns focus to Controls while the race stays paused. Guard: `tests/guide-browser.spec.js`.

Pause-screen regression trap: `renderTutorial` must clear the three-chevron `tutorial-guide` unless `race.phase === 'racing'`; a saved `tutorial.guide` survives pause. Keep `tests/interactive-tutorial-browser.spec.js` ahead/left/right pause→resume checks and bilingual practice-vs-race resume labels.
