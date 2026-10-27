# Event Lab Lite v1

Offline authoring owns an immutable, versioned document: label, unlocked track,
32-bit seed, modifier and up to 24 lane-snapped objects. The Vue editor owns its
draft and bounded Undo/Redo history. Validation rejects unknown fields, oversized
JSON, unsafe road sections, overlapping footprints and unreadable spacing before
compilation. Storage failure leaves an editable in-memory draft.

The runtime adapter compiles fresh barriers, nitro rings and fuel pickups into
the existing simulation/render arrays. Runtime collection and collision flags
never enter authored identity. Retries retain the exact document and seed.
Canonical authored content isolates Event Lab records from Custom and Career.

Acceptance: functional RED first; validator/history/runtime/records tests; strict
type checks and production build; desktop and touch Chrome editor/import/export,
launch, effects and retry in English and Traditional Chinese. Record evidence in
TODO.md. Parent schedules full make verify and exact-commit CI.

Deferred: placeable ramps (need shared launch physics), cones, custom checkpoint
timers, multiplayer/community upload, remote assets and scripting. Existing track
geometry, progression, Classic/Daily/Cup seeds and record formats stay intact.
