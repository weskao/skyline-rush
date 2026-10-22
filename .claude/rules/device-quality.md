---
paths:
  - "src/device-quality.js"
  - "src/vfx-settings.js"
  - "src/main.js"
  - "tests/device-quality*"
---

# Device-adaptive startup quality

- Targets macOS, Windows, Android, iOS, iPadOS via standard APIs. No OS/UA-forced presets;
  touch ≠ slow GPU.
- `navigator.hardwareConcurrency` is approximate and may be privacy-reduced; `deviceMemory` is
  optional (absent on Safari/iOS). `innerWidth/innerHeight/devicePixelRatio` are sizing signals,
  not GPU speed. Tolerate undefined values with safe numeric checks; never throw, block the
  menu, or force Low only because a hint is missing.
- Fresh install (no saved VFX profile): pick the highest reasonable tier from available hints;
  default High when hints are unreliable. Downshift only on evidence of limited CPU/RAM/pixel
  throughput; keep racing visibility and FPS before post-processing.
- A saved manual graphics preference always wins. Never touch unlocks or progress.
- If High is not auto-selected, show a compact once-only notice; persist the seen flag in
  `localStorage` (in-memory fallback when blocked). English + Traditional Chinese, live-switching
  with the existing language selector. Never block Start, inputs or rendering behind it.
- Unit tests cover: full Windows/Android Chromium hints, Safari/iOS missing memory, desktop
  unknown data, unknown signals. Real-device GPU validation is a separate QA step.
