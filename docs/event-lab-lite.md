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

Timed checkpoints compile into the shared Checkpoint Rush runtime (at most 16, the
pooled gate budget). Every barrier must leave two adjacent lanes open beside existing
road props (`reachable`). Footprints come from the ENV-01 catalog
(`src/object-catalog.ts`); every `block` kind (barrier, cone) compiles to a hazard
carrying its catalog half-width and height, which player, rival and traffic contact
and the pooled barrier renderer all read. Cones reuse the barrier pool at their own
size, so they add no material or draw call.

Deferred: placeable ramps (need a catalog `ramp` type and shared launch physics),
remote assets and scripting.

Out of scope for offline v1: community sharing and multiplayer uploads. They need a
separate backend, moderation, storage and security design. Courses travel only as
locally validated JSON text that the player copies themselves. Existing track
geometry, progression, Classic/Daily/Cup seeds and record formats stay intact.
