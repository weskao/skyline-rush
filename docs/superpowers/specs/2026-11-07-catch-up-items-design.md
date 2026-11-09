# Catch-up rings — design (2026-11-07)

## Intent

User: in Classic on Tokyo Afterdark, about 300 m behind the leader is when help is needed most. A few extra
catch-up rings should appear ahead of the trailing player, naturally, so they can catch up, never popping in abruptly.

## Scope (user decisions)

- Only **Classic** (not the Daily challenge, which has a leaderboard) and **Cup**. Every other mode is unchanged.
- Only the human player benefits; rivals already have the speed rubber band (`RUBBER_BAND_MAX`).

## Behaviour (the user accepted these defaults)

- **Automatic course-length tuning:** read `race.length` (the total playable race length, including laps).
  No lookup by track ID; future courses use the same formula. Reference length `L₀ = 6000 m` and
  scale `s = clamp(√(max(0, L) / L₀), 0.75, 1.5)`.
- **Gap trigger / recovery:** help starts at `round(150s)` m behind the leader, remains active until less than
  `round(50s)` m behind, and reaches full strength at `round(300s)` m.
- **Cadence:** between `12s` seconds (weakest gap) and `6s` seconds (full gap); these are *time* intervals,
  not the course length scale's unit. The original 6 km baseline remains 12 / 6 seconds.
- **Lookahead:** a bonus ring spawns `A = 900 + round(50s)` metres ahead, plus seeded random distance
  `[0, round(80s))`; always beyond the renderer's 900 m draw range. It appears like ordinary rings,
  without new effects, sounds or HUD callouts.
- **Per-race cap:** `max(0, floor((L − A − round(80s) − 100) / 400))` rings; the original 6 km reference yields
  12, shorter tracks receive fewer, longer tracks more. Impossible/invalid track lengths receive zero.
- **Safety:** preserve fixed minimum 40 m section clearance, 25 m separation from existing pickups/rings,
  100 m finish reserve, and 2.5 m road-reachable ring altitude. These are physical constraints, not scaled
  down on short courses.
- **Items:** all catch-up items are rings at road-reachable 2.5 m: nitro 60%, charge 20%, slipstream 20%. Rings are
  on the player's lane or a neighbouring one. Single items, never a wall; no catch-up cans.
- **Placement guards:** never inside or within 40 m of a road section (tunnel, gap, shortcut, spiral…), never within
  25 m of an existing ring or pickup, never past `length − 100` m. A blocked spot is skipped, not moved.

## Must not break

- Authored sequences and their guard (`.claude/rules/ring-layout.md`, `tests/ring-authored-sequences.test.js`).
- Layouts at race start (hashes, ring-variety) — items only appear while racing.
- Mystery ring effects: existing rings keep their effect index after an insert.
- Rivals never take or steer toward catch-up items; a catch-up ring never completes a PERFECT LINE.
- Determinism: a seeded stream (`RACE_STREAMS.catchUp`), so the same race inputs give the same items.
- `src/game.js` is at its module-size ceiling: logic lives in `src/catch-up-items.ts`.
