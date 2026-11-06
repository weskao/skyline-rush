# Catch-up rings and NITRO pickups — design (2026-11-07)

## Intent

User: in Classic on Tokyo Afterdark, about 300 m behind the leader is when help is needed most. A few extra rings and
NITRO pickups should appear ahead of the trailing player, naturally, so they can catch up, never popping in abruptly.

## Scope (user decisions)

- Only **Classic** (not the Daily challenge, which has a leaderboard) and **Cup**. Every other mode is unchanged.
- Only the human player benefits; rivals already have the speed rubber band (`RUBBER_BAND_MAX`).

## Behaviour (the user accepted these defaults)

- **Trigger:** gap to the leading rival ≥ 150 m switches help on; it stays on until the gap is back under 50 m.
- **Strength:** scales from 150 m (weak) to 300 m (full). Spawn interval runs from 12 s down to 6 s; at most 12 extra
  items per race.
- **Natural appearance:** items are added 950–1030 m ahead of the player, beyond the 900 m draw range
  (`effects.js`), so they come into view exactly like every other ring. No new effect, sound or HUD callout.
- **Items:** half rings (charge 40% / nitro 40% / slipstream 20%) at road-reachable 2.5 m, half NITRO cans on the road,
  on the player's lane or a neighbouring one. Single items, never a wall.
- **Placement guards:** never inside or within 40 m of a road section (tunnel, gap, shortcut, spiral…), never within
  25 m of an existing ring or pickup, never past `length − 100` m. A blocked spot is skipped, not moved.

## Must not break

- Authored sequences and their guard (`.claude/rules/ring-layout.md`, `tests/ring-authored-sequences.test.js`).
- Layouts at race start (hashes, ring-variety) — items only appear while racing.
- Mystery ring effects: existing rings keep their effect index after an insert.
- Rivals never take or steer toward catch-up items; a catch-up ring never completes a PERFECT LINE.
- Determinism: a seeded stream (`RACE_STREAMS.catchUp`), so the same race inputs give the same items.
- `src/game.js` is at its module-size ceiling: logic lives in `src/catch-up-items.ts`.
