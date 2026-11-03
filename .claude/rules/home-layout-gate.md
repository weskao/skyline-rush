---
paths:
  - "src/App.vue"
  - "src/main.js"
  - "src/style.css"
  - "src/locales/**"
  - "index.html"
  - ".githooks/pre-push"
  - "tests/*layout*"
---

# Home-screen layout gate

A home-screen change (`src/App.vue`, `src/main.js`, `src/style.css`, `src/locales/`, `index.html`)
→ `npm run test:layout` before pushing; the `.githooks/pre-push` hook runs it on such pushes and
blocks a red result (never bypass it with `SKIP_LAYOUT_GATE=1` to get a fix out — CI on `main`
gates every release).

- The intro must fit without scrolling at ≥ 900 px tall desktops in en and zh-TW, stay below the
  112 px top bar and keep 44 px touch targets.
- The height budget is fixed — a new block pays for itself by compacting another, never by
  letting the intro scroll, moving into the top bar or shrinking a button.
