# Practice item rules and activation feedback

This independent feature branch implements ITEM-11 and the existing ITEM-01–05 activation/feedback acceptance slice. The owner authorized staged TDD implementation; Classic/Daily and older saved configurations retain their existing behavior and signatures.

## Rules

- Off: no rings or NITRO supplies.
- Classic: original authored supplies and rings; mystery effects apply immediately.
- Active: only authored mystery rings; powers are held in the existing single slot.
- All: original supplies and ring types; mystery powers are held for activation.

Only Custom and Free Drive accept the new optional `itemRules` setting. Absence preserves the original `items`/`activeItems` normalization byte for byte, including old supply-only `items: false`. Explicit new rules have separate stable ruleset identities. The original ring index remains attached when filtering mysteries, preserving deterministic rewards across rule selections.

## UI and audio

Replace two ambiguous checkboxes with one four-way selection. Presets reset it, recent setups restore it, and English/Traditional Chinese labels update live. Keep existing reserved Q and touch activation. The slot shows one of the guide's existing power silhouettes, ready/cooldown/active state and whole-second duration. Use the current pickup cue for collecting/activating and current UI cue when a held power becomes ready after cooldown. Mute and hidden-page behavior remain owned by the existing audio mixer. No new music, shaders or particles are needed for this feedback slice.

The existing frame-loop HUD adapter remains nonreactive, with cached nodes and change-only writes. Vue owns static SFC markup and scoped styling. No frame-loop storage writes or GPU resource changes.

## Acceptance

Observed RED before implementation: new Off still has supplies; recent setups drop the unknown rule; browser has no item-rule selector. GREEN must prove four rules across all ten tracks, legacy compatibility, strict validation, recent setup persistence, actual ring collection and Q/touch activation, paused rejection, bounded cooldown, localized states and no console errors. Full gate/CI and physical-device acceptance are separate parent-owned gates.
