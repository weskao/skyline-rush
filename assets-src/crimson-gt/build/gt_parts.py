"""Crimson GT parts in three.js car space. Pivots, ports and wing travel are the Roadster's contract numbers
(imported, never retyped), so the runtime rig (src/garage-model-rig.ts) binds this car unchanged."""
import math

from roadster_geom import cylinder, extrude, loft, merge, node, part, smooth_rings
from roadster_parts import (HINGE, LIFT_PORTS, RAM_BASE_Y, RAM_BASE_Z, REAR_PORT_X, WHEEL_Y, WHEELS, WING_POS,
                            ram_rest_pose)

from gt_body import Z_NOSE, Z_TAIL, body_verts, buttress_rings, canopy_rings, patch, side_x

SEG = 32


def lathe(profile, n=SEG, axis="x"):
    """Closed solid of revolution about the local X (wheels) or Z (nozzles) axis from (along, radius) pairs."""
    def point(a, r, t):
        c, s = r * math.cos(t), r * math.sin(t)
        return (a, c, s) if axis == "x" else (c, s, a)
    return loft([[point(a, r, 2 * math.pi * i / n) for i in range(n)] for a, r in profile], close=True)


def revolve(profile, n=SEG, axis="x"):
    """Ring-shaped solid (no caps): a closed (along, radius) profile swept all the way round."""
    def point(a, r, t):
        c, s = r * math.cos(t), r * math.sin(t)
        return (a, c, s) if axis == "x" else (c, s, a)
    m = len(profile)
    verts = [point(a, r, 2 * math.pi * i / n) for i in range(n) for a, r in profile]
    faces = [(i * m + j, i * m + (j + 1) % m, (i + 1) % n * m + (j + 1) % m, (i + 1) % n * m + j) for i in range(n) for j in range(m)]
    return verts, faces


def tube(points, radius, sides=6):
    return merge(*[cylinder(a, b, radius, radius, sides, cap=True) for a, b in zip(points, points[1:])])


def wheel_parts(side):
    """Tyre and dished rim (static), then the spin set: ten paired spokes, hub, brake disc. side.png: five split spokes."""
    tire = revolve([(-.135, .33), (-.135, .405), (-.115, .435), (-.07, .44), (.07, .44), (.115, .435), (.135, .405), (.135, .33)])
    rim = lathe([(side * a, r) for a, r in [(-.14, .335), (.142, .335), (.142, .30), (.06, .285), (.05, .06)]])
    spokes = []
    for i in range(5):  # five broad spokes, each with a raised centre rib (the split-spoke read of side.png)
        ang = 2 * math.pi * i / 5 + .3
        def at(radius, half, x):
            t = (-math.sin(ang), math.cos(ang))
            return [(side * x, radius * math.cos(ang) + s * half * t[0], radius * math.sin(ang) + s * half * t[1]) for s in (-1, 1)]
        for half0, half1, x, depth in ((.058, .04, .10, .026), (.02, .012, .124, .012)):
            (a, b), (d, c) = at(.05, half0, x), at(.303, half1, x)
            spokes.append(extrude([a, b, c, d], (side * depth, 0, 0)))
    hub = lathe([(side * a, r) for a, r in [(.09, .075), (.138, .07), (.146, .045)]], 20)
    disc = lathe([(side * a, r) for a, r in [(.062, .225), (.078, .225)]], 24)
    return tire, rim, merge(*spokes), hub, disc


def light_blade():
    """Full-width front light blade: up each flank from z -1.92, round the nose at y .60 (side.png, front panel)."""
    def y_at(z):
        return .562 + .07 * (z - Z_NOSE) / (-1.92 - Z_NOSE)
    flank = [-1.92 + (Z_NOSE + .012 + 1.92) * i / 8 for i in range(9)]
    right = [(side_x(z, y_at(z)), y_at(z), z) for z in flank] + [(side_x(Z_NOSE, .562) - .03, .562, Z_NOSE - .004)]
    return tube(right + [(-x, y, z) for x, y, z in reversed(right)], .013)


def drl_slashes():
    """Two diagonal lamps on the nose corners under the blade (front three-quarter panel)."""
    parts = []
    for side in (-1, 1):
        path = [(-2.06 - .2 * t, .51 - .13 * t) for t in (0, .5, 1)]
        parts.append(tube([(side * side_x(z, y), y, z) for z, y in path], .012))
    return merge(*parts)


def rear_light_bar():
    """Full-width rear light bar wrapping both corners at y .905, under the deck edge (rear panels)."""
    y = .905
    flank = [2.22 + (Z_TAIL - .006 - 2.22) * i / 4 for i in range(5)]
    right = [(side_x(z, y), y, z) for z in flank] + [(side_x(Z_TAIL, y) - .03, y, Z_TAIL + .004)]
    return tube(right + [(-x, yy, z) for x, yy, z in reversed(right)], .016)


def build_car(c, mats):
    """c: the collection that holds every shipping object."""
    P, G = mats["gt_paint"], mats
    part("body", c, *body_verts(), P)
    part("glass_canopy", c, *loft(smooth_rings(canopy_rings(), 3, 4, ring_closed=False), close=False), G["gt_glass"])
    part("rear_buttresses", c, *merge(*[loft(smooth_rings(buttress_rings(s), 2, 3, ring_closed=True), close=True) for s in (-1, 1)]), P)

    for name, (x, z) in WHEELS.items():
        side = -1 if x < 0 else 1
        pivot = node(name, c, pos=(x, WHEEL_Y, z))
        tire, rim, spokes, hub, disc = wheel_parts(side)
        part(name + "_tire", c, *tire, G["gt_tire"], pivot)
        part(name + "_barrel", c, *rim, G["gt_rim"], pivot)
        # Bronze caliper on the pivot (static), side.png shows it behind the spokes at the rear of each disc.
        part(name + "_caliper", c, *extrude([(side * .05, -.05, .13), (side * .05, .12, .19), (side * .05, .17, .13), (side * .05, .02, .07)],
                                           (side * .045, 0, 0)), G["gt_nozzle"], pivot)
        spin = node(name + "_spin", c, parent=pivot)
        part(name + "_spokes", c, *spokes, G["gt_rim"], spin)
        part(name + "_hub", c, *hub, G["gt_trim"], spin)
        part(name + "_disc", c, *disc, G["gt_carbon"], spin)

    # Active wing. The aerofoil hangs 10-45 mm below the hinge line so the stowed wing lies on the tail deck (1.0).
    wing = node("wing", c, pos=WING_POS)
    blade = node("wing_blade", c, pos=(0, 0, -HINGE), parent=wing)
    section = [(0, -.03), (.05, -.012), (.2, -.008), (.42, -.022), (.42, -.03), (.2, -.045), (.05, -.045)]  # (z, y)
    part("wing_aerofoil", c, *extrude([(-.80, y, z) for z, y in section], (1.6, 0, 0)), P, blade)
    tip_geo = extrude([(0, -.045, .22), (.30, -.045, .20), (.30, -.045, -.06), (0, -.045, -.20)], (0, .035, 0))
    part("wing_tip_r_mesh", c, *tip_geo, P, node("wing_tip_r", c, pos=(.80, 0, HINGE), parent=blade))
    part("wing_tip_l_mesh", c, *tip_geo, P, node("wing_tip_l", c, pos=(-.80, 0, HINGE), parent=blade, scale=(-1, 1, 1)))
    # Swan-neck pylons: from inside the tail up to the leading-edge hinge, so the tilting blade never crosses them.
    neck = [(-.30, .08), (-.30, -.06), (-.02, -.23), (.0, -.205), (-.05, -.10)]  # (y, z) in the wing frame
    part("wing_swan_necks", c, *merge(*[extrude([(s * .45 - .012, y, z) for y, z in neck], (.024, 0, 0)) for s in (-1, 1)]), G["gt_carbon"], wing)
    rot, sy = ram_rest_pose()
    rams = node("wing_rams", c, pos=(0, RAM_BASE_Y, RAM_BASE_Z), parent=wing, scale=(1, sy, 1), rot_x=rot)
    part("wing_rams_mesh", c, *merge(cylinder((-.30, 0, 0), (-.30, 1, 0), .013, .013, 6), cylinder((.30, 0, 0), (.30, 1, 0), .013, .013, 6)), G["gt_carbon"], rams)
    part("wing_bay", c, *extrude([(-.62, 1.0, 2.07), (.62, 1.0, 2.07), (.62, 1.0, 2.42), (-.62, 1.0, 2.42)], (0, .005, 0)), G["gt_trim"])

    # Lamps.
    part("headlamp", c, *merge(light_blade(), drl_slashes()), G["gt_lamp"])
    part("tail_light", c, *rear_light_bar(), G["gt_light"])

    # Dark trim: nose intake and chin, rear fascia, side intakes ahead of the rear wheels, sill blades.
    nose, tail = Z_NOSE - .002, Z_TAIL + .002
    part("front_intake", c, *merge(
        extrude([(-.48, .385, nose), (.48, .385, nose), (.54, .515, nose), (-.54, .515, nose)], (0, 0, -.012)),
        extrude([(-.60, .30, -2.29), (.60, .30, -2.29), (.74, .30, -2.04), (-.74, .30, -2.04)], (0, .06, 0)),
    ), G["gt_trim"])
    part("rear_fascia", c, *extrude([(-.74, .50, tail), (.74, .50, tail), (.86, .79, tail), (-.86, .79, tail)], (0, 0, .012)), G["gt_trim"])
    zs = [.15 + .75 * i / 10 for i in range(11)]
    for side, tag in ((-1, "l"), (1, "r")):
        intake = patch(zs, lambda z: .69 - .21 * (z - .15) / .75, lambda z: .695 + .165 * (z - .15) / .75, side=side)
        sill = patch([-.80 + 1.66 * i / 12 for i in range(13)], lambda z: .255, lambda z: .36, ny=2, side=side)
        part("side_intake_" + tag, c, *intake, G["gt_trim"])
        part("rocker_" + tag, c, *sill, G["gt_carbon"])
        # Mirror pod on a short stalk at the A-pillar base (front three-quarter panel).
        pod = lathe([(a, r) for a, r in [(-.06, .012), (-.03, .034), (.05, .04), (.065, .028)]], 10, axis="z")
        mirror = merge(([(side * 1.06 + 1.5 * x, .99 + y, -.72 + z) for x, y, z in pod[0]], pod[1]),
                       cylinder((side * .90, .94, -.72), (side * 1.03, .985, -.72), .012, .012, 6))
        part("mirror_" + tag, c, *mirror, P)
    part("splitter", c, *extrude([(-.74, .265, -2.38), (.74, .265, -2.38), (.99, .265, -2.14), (1.02, .265, -1.93),
                                  (-1.02, .265, -1.93), (-.99, .265, -2.14)], (0, .035, 0)), G["gt_carbon"])
    part("diffuser", c, *merge(
        extrude([(-.94, .31, 2.02), (.94, .31, 2.02), (.94, .31, 2.47), (-.94, .31, 2.47)], (0, .16, 0)),
        *[extrude([(x - .012, .21, 2.14), (x + .012, .21, 2.14), (x + .012, .21, 2.47), (x - .012, .21, 2.47)], (0, .10, 0))
          for x in (-.84, -.42, 0, .42, .84)],
    ), G["gt_carbon"])

    # Lift thrusters at the contract ports. The cone is slimmer than the Roadster's (.12/.15) to stay inside the well wall.
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("thruster_%02d" % i, c, pos=(x, .3, z))
        part("thruster_%02d_nozzle" % i, c, *cylinder((0, -.1, 0), (0, .1, 0), .15, .12, 12), G["gt_nozzle"], pivot)
    fans = node("lift_fans", c)
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("lift_fan_%02d" % i, c, pos=(x, .19, z), parent=fans)
        part("lift_fan_%02d_disc" % i, c, *cylinder((0, -.0125, 0), (0, .0125, 0), .11, .11, 12), G["gt_fan"], pivot)
    # Rear thrusters at the contract REAR_PORTS: a round chrome bezel with a dark throat (rear panels: radius ~.11).
    for i, x in enumerate(REAR_PORT_X, 1):
        pivot = node("nozzle_rear_%02d" % i, c, pos=(x, .64, 2.39))
        part("nozzle_rear_%02d_tube" % i, c, *lathe([(-.05, .112), (.085, .112), (.095, .10), (.085, .088), (.0, .08)], 24, axis="z"), G["gt_nozzle"], pivot)
        part("nozzle_rear_%02d_throat" % i, c, *lathe([(-.01, .082), (.005, .082)], 24, axis="z"), G["gt_trim"], pivot)
