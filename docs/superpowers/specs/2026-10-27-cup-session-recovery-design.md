# Championship Cup session recovery

The owner authorized staged TDD implementation of the remaining non-Firebase/non-Gamepad roadmap, with unrelated features on separate branches. This stage owns only Cup recovery, not the ongoing audio/keymap refactor in the shared checkout.

## Behavior

- Keep one local, versioned Cup checkpoint: selected unlocked tracks and completed heats. Save when starting, finishing a heat or retrying; never write every frame.
- Reopening the game offers Resume and Discard inside Championship format. Resume restarts the unfinished heat from its beginning and retains completed standings. It never resumes an arbitrary physics frame.
- Validate saved tracks, drivers, times, ordering and version with the existing Cup rules. Invalid, oversized, completed or newly locked saves are not offered. Storage failure leaves racing usable.
- Next heat preserves standings. Retrying the current heat does not count it twice. Race Again intentionally starts the entire Cup again. Finishing the Cup clears its resumable checkpoint.
- Resume works with keyboard and touch in English and Traditional Chinese. Reuse the existing UI confirmation cue; no new music or per-frame effect is appropriate.
- No changes to Classic/Daily rewards, history formats, Firebase, Gamepad, physics or scenery.

## Approach

Use a small strict-TypeScript persistence service, the existing Cup validator, and a Vue recovery component. Full simulation snapshots would add format/physics compatibility risk; storing only finished heats fits the existing immutable Cup model. Event-driven saves avoid frame-loop overhead. The implementation decisions above are the agent's defaults under the owner's instruction to proceed.

## Verification

Observe browser RED for a seeded valid checkpoint before adding recovery UI. Unit-test version, corruption, size, locked tracks, retry, complete clearing and denied storage. Browser-test real Resume/Discard clicks and reload on desktop and touch phone, including live locale changes and unchanged progression. Run typecheck, units, make verify, layout and exact-feature-HEAD CI. Physical-device signoff stays separate.
