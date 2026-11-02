# Vehicles, obstacles and collision

Read before changing road geometry, car pose, collision, steering, AI/traffic behaviour or any prop drawn on the road. Scoped rules: `.claude/rules/vehicle-road-stability.md`, `.claude/rules/world-tour.md`.

## Solid obstacles and AI avoidance

Anything drawn on or over the road is solid for every car: the player gets a barrier hit,
rivals and traffic change lane around it ahead of time and return to their lane after it, and
no car is drawn passing through it on any map. An obstacle never takes so much road that a
stretch is impassable — at least two lanes stay open.

Every vehicle obeys the same collision physics as the player car: rivals and traffic use the
player's hitbox, hit props, barriers, Tokyo trains, hazards and each other, and get the same
`knock()` response (speed loss, sideways shove, 1.5 s grace). A ram hurts both cars. AI steers
around slower cars and the player before impact; traffic then recovers to cruise speed. Never
give one class of car a special-case pass-through. Rules are in `.claude/rules/world-tour.md`
("Solid props", "Shared collision physics").

## Vehicle stability and road contact — every track

Always use the same road centreline and tangent/right/up frame for road geometry,
vehicle placement and orientation. On curved, banked or elevated tracks, compose steering
lean, drift, flight pitch and stunt rolls **relative to** the road-aligned quaternion
(`orientCarOnRoad` in `src/vehicle-pose.js`); never overwrite its Euler X/Z angles.
A vehicle must remain correctly aligned with the visible surface: verify the wheels and
body, not only the mesh origin, even when turning close to either road edge.

Continuous rail contact must not re-trigger a hard collision when the 1.5 s cooldown
expires; the next collision is armed only after separation. Do not mask broken geometry
or physics with arbitrary car-height offsets, smoothing, camera tricks or per-track patches.
Fix shared root causes, then regression-check **Sky Spiral, all four legacy tracks and all
five World Tour tracks**, including AI cars, ghost, ramps and airborne maneuvers.
Full scoped rules and exact TDD / WebGL verification requirements:
`.claude/rules/vehicle-road-stability.md`.
