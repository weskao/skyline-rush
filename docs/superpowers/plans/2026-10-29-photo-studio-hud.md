# Photo Studio HUD Isolation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. Continue directly; no delegation.

**Goal:** Complete PHOTO-01's clean paused Free Drive preview while preserving orbit, lighting, local PNG export and return to driving.

**Architecture:** The existing native modal is a direct child of the Vue app next to the WebGL canvas. While it is open, hide the other app roots and the optional body-level performance strip with CSS. Let closing the modal automatically restore the prior UI and existing camera/lighting lifecycle; add no per-frame state or production test seam.

**Tech Stack:** Existing Vue/TypeScript shell, CSS, Playwright and Node; no dependencies.

**Spec/design:** TODO.md 12C PHOTO-01. Builder choice: a clean canvas-only preview plus the existing Photo Studio controls. Retain the original/Sunset/Night/Fog presets, save/close confirmation cues, mute policy and paused simulation. New music is redundant for this utility screen. Existing PNG/export and view reset remain owned by their current tests; this regression owns background isolation and lifecycle.

## Global constraints

- Independent feature/photo-studio-hud-isolation from main ca1c777; preserve the seven completed feature branches.
- No physics, route, reward, storage or renderer changes; do not grow main.js or legacy ceilings.
- English and zh-TW, keyboard/pointer/touch, portrait 390x844 and 320x740, landscape 844x390 and desktop 1440x900.
- Keep actual native modal focus, Back/Escape, orbit/lighting/export and subsequent driving usable.
- Chrome emulation is not physical Safari/Android or thermal acceptance.

## Review focus

1. Descendants with their own visibility rules must not leak HUD into the preview.
2. Optional ?perf output lives outside the Vue root and must also disappear temporarily.
3. Closing by Back or native Escape must return to paused Free Drive, restore pre-photo visibility and allow resume/reopen.
4. Short/narrow layouts must expose the photo controls and have no horizontal overflow.
5. A second open must still frame the car and export; ordinary pause/racing UI must retain its prior visibility.

### Task 1: Regression RED

Files: tests/photo-studio-browser.spec.js; TODO.md.

- [x] Verify main baseline strict types and Node suite: 815 passed / 3 emulator skips; exit 0.
- [x] Add actual-game hidden-HUD and Back/Escape/resume tests using the existing test-only gameplay fixture, all ten tracks desktop/phone and narrow/landscape Coast.
- [x] Observe assertion RED against visible telemetry, preserve original-resolution before image and failing log; commit tests before source.

### Task 2: Shared GREEN

Files: src/style.css only, unless a real lifecycle regression requires its existing typed controller.

- [x] Replace incomplete four-selector HUD hiding with one photo-open rule for non-canvas/non-photo app roots and the optional performance strip.
- [x] Pass focused browser regression and existing orbit/lighting/PNG tests; preserve after images and inspect representative full-resolution views.
- [x] Verify repeat open, existing camera/lighting/export, real Back/Escape and continued driving without console errors; 23/23 focused browser cases pass. Preserve 22 original-resolution after images; six representatives inspected.

### Task 3: Responsive visual regression discovered in review

- [x] Actual 320x740 screenshot shows the controls obscuring the car. Extend the existing owner test to project each visible car mesh (wheels/body/wings) and detect panel overlap; observe the real overlap assertion RED. Add 59px top-notch / 47px landscape inset cases and observe unsafe y12 versus y59 RED.
- [x] Use compact two-column orbit/FOV fields on narrow viewports, a 300px short-landscape panel and the existing shared safe-area variables. Preserve camera, car, font sizes and every control. Correct the UA dialog max-width only so the intended responsive width is honored.
- [x] Pass all 24 layout/track cases plus existing PNG test (25/25, exit 0); inspect actual narrow/notch/landscape images. Preserve interrupted 007b858 full-gate log separately.

### Task 4: Final quality gate

- [ ] Complete make verify and preserve actual exit status and complete failure scan.
- [ ] Publish the feature branch and inspect exact-commit unit, Cloud, eight browser shards, six World Tour shards and quality-gate.
- [ ] Mark PHOTO-01 only after functional/visual evidence and automated gates, update original-roadmap table and Telegram report.
- [ ] Physical Safari/Android, long-drive/all-quality thermal measurements and independent review remain separate open gates. Do not merge into main, PR, tag or deploy.
