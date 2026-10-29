# Genuine circuit laps

## Identity and compatibility (before implementation)

Harbor Circuit is a new, always-accessible route `harbor-circuit`, topology version 1,
exclusive to Circuit Race with rules version 1 and 1, 3 or 5 laps. Its identity,
mode-history rules signature and Ghost keys are new. No existing route length,
centreline, sector topology, saved best, Ghost or key changes, and no migration is
needed. The original ten-track ordered catalog, Daily schedule and Career/Cup
unlock path stay unchanged. Circuit results do not award Career progress.

A genuine flat circle is 2000 m long, radius 2000/(2*pi), half-width 12 m.
Its position, tangent, right/up frame and width are periodic, including the join.
One analytic frame drives road mesh, cars, Ghost, effects, camera and route map.
Unwrapped driver distance drives ranking and replay; only geometry and physical
car separation are periodic. Circuit has three rivals and no recycled traffic.

## Acceptance and plan

1. Observe failing geometry/config tests; extract legacy data/model code unchanged
   to respect the existing module ceilings; add the new typed circuit route.
2. Observe failing lap tests; use swept, ordered quarter-sector crossings per driver,
   bounded by road width, altitude, movement speed and continuity. Reject backward
   motion, skipped/teleported/respawned crossings and finish-line farming.
3. Configure 1/3/5 valid laps, interpolate lap/finish times, show lap/last/best/splits
   and total race time, and preserve AI ranking. Give every lap's items a distinct
   identity; never reward an already-collected item twice.
4. Keep history and Ghost records configuration-aware. Replay stays monotonic across
   the physical join. Reuse an existing one-shot lap cue and existing finish music/SFX;
   honor mute and pause. Add localized controls, HUD and results.
5. Run focused Node, type/build, complete Node suite and Chrome desktop/touch browser
   tests on port 5221, capturing real WebGL seam, lap and result evidence. Parent runs
   integrated make verify and exact-commit GitHub CI; those remain pending locally.

Physical GPU/thermal and touch hardware acceptance cannot be inferred from Chrome
emulation. No new dependencies, production testing hooks or physics timestep changes.

## Permanent lap best

The existing permanent numeric-mode-bests map retains both the ordinary total-race
key `[track, config]` and the new Circuit-only lap metric `[track, config, "lap"]`.
No existing key or envelope changes. The shared bounded writer preserves the
minimum valid lap independently of the rolling 50-race history; existing backup,
account clearing and merge paths keep the metric. HUD reads it once per new race
state; both HUD and results compare the stored lap with this run's lap times.

Observed follow-up RED/GREEN covers missing record/Ghost support, default History
selection, public nonfinite progress, per-lap audio, ring orientation, permanent
lap bests, a missing minimap theme, landmark framing and shared-geometry disposal.
Six Chrome device/orientation/locale flows and 30/60/120 Hz lap cases pass. Full
merged make/CI and physical GPU/touch evidence remain separate pending gates.
