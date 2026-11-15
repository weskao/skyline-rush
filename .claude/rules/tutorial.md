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
