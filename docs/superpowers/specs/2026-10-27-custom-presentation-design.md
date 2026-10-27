# Custom race Ghost and visual presets

The owner authorized staged TDD completion of the remaining roadmap, with unrelated slices on independent branches. This branch owns the missing Custom Ghost and driving visual-preset options from 9C/11C.

- Reuse existing per-mode Ghost storage and its exact `trackId + JSON.stringify(config)` identity. Custom records one fastest valid trace per heat/ruleset, including multi-stage sessions; never reuse Classic or Time Attack records. Stage totals remain separate from per-heat replay times.
- Reuse the existing global Ghost visibility preference. New replays are captured even when hidden, as in Classic. Storage denial retains in-session bests.
- Offer Track / Day / Dusk / Night / Rain / Fog for Custom and Free Drive. These are cosmetic: fog, sky, exposure and existing bounded precipitation only. No wet grip, wind, camera changes, new shaders or lights.
- Keep these options in `race.session.presentation`, never `race.config` or record/Ghost signatures. Preserve on retry/next heat; reset to Track on changing track or returning to Classic.
- A typed Vue component owns the selector and active-setting summary. Existing confirmation sound handles selection; no new music is needed for a cosmetic option.
- Extract existing Ghost cache/record/save wiring from `main.js` into one typed service so the bootstrap shrinks.

Alternative considered: put visual fields in RaceConfig. Rejected because it would fork existing bests/replay identities for purely cosmetic changes. Full simulation snapshots or new weather engines are unnecessary.

Verification: observe missing-presentation and missing-selector RED; test immutable simulation identity, malformed presentation, replay compatibility, per-heat fastest saves and denied storage. Browser-check desktop/touch, locales, actual scene changes, Ghost visibility and photo restoration. Parent schedules full `make verify`, layout, exact-HEAD CI and physical-device review separately.
