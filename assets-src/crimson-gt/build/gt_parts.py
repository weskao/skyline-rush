"""Crimson GT parts in three.js car space. Rig pivots (wheels, wing, lift ports) are the Roadster's contract numbers
(imported, never retyped). Two owner-approved departures let the car keep the concept's proportions: each wheel
hangs on a static `<wheel>_axle` node that lowers the smaller tyre onto the ground, and the rear nozzles sit ahead
of and below the contract rear ports by one rigid offset (src/garage-model.ts moves the rear-port VFX with them)."""
import math

from roadster_geom import cylinder, extrude, loft, merge, node, part
from roadster_parts import (HINGE, LIFT_PORTS, RAM_BASE_Y, RAM_BASE_Z, REAR_PORT_X, WHEEL_Y, WHEELS, WING_POS,
                            ram_rest_pose)

from gt_body import DECK_Y, HUB_Y, RIDGE_X, SILL, TYRE_R, Z_NOSE, Z_TAIL, body_verts, hood_y, patch, side_x, upper_parts

SEG = 32
NOZZLE_Y, NOZZLE_Z = .31, 1.975      # rear.png: four nozzles in a row at y .29-.31; contract ports are y .64, z 2.39
CHORD = .36                          # wing chord, back from the hinge line on its leading edge
WING_STOW = (0, -.22, -.42)          # hinge line minus the contract hinge: the blade rests over the tail deck (z 1.63-1.99)


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


def _bar(side, x, depth, a0, r0, h0, a1, r1, h1):
    """Flat spoke segment in the wheel plane from polar (a0, r0) to (a1, r1), half-widths h0 -> h1."""
    p0, p1 = (r0 * math.cos(a0), r0 * math.sin(a0)), (r1 * math.cos(a1), r1 * math.sin(a1))
    length = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    n = (-(p1[1] - p0[1]) / length, (p1[0] - p0[0]) / length)
    quad = [(p0[0] + n[0] * h0, p0[1] + n[1] * h0), (p0[0] - n[0] * h0, p0[1] - n[1] * h0),
            (p1[0] - n[0] * h1, p1[1] - n[1] * h1), (p1[0] + n[0] * h1, p1[1] + n[1] * h1)]
    return extrude([(side * x, y, z) for y, z in quad], (side * depth, 0, 0))


def wheel_parts(side):
    """Low-profile tyre on a large dark rim (static), then the spin set: five thin spokes that fork toward the rim
    (side.png, rear three-quarter panel), hub, brake disc. Rim depth, disc and caliper are inferred."""
    tire = revolve([(-.125, .25), (-.125, .30), (-.105, .325), (-.06, TYRE_R), (.06, TYRE_R), (.105, .325), (.125, .30), (.125, .25)])
    rim = lathe([(side * a, r) for a, r in [(-.13, .255), (.132, .255), (.132, .234), (.06, .222), (.05, .05)]])
    spokes = []
    for i in range(5):
        a = 2 * math.pi * i / 5 + .3
        spokes.append(_bar(side, .092, .024, a, .04, .030, a, .125, .020))             # stem
        for fork in (-.2, .2):
            spokes.append(_bar(side, .092, .024, a, .115, .016, a + fork, .238, .011))   # twin arms
    hub = lathe([(side * a, r) for a, r in [(.085, .058), (.122, .054), (.13, .034)]], 20)
    disc = lathe([(side * a, r) for a, r in [(.048, .185), (.064, .185)]], 24)
    return tire, rim, merge(*spokes), hub, disc


def light_blade():
    """Full-width front light blade: along each flank from z -1.80, round the nose under its top edge (front panel)."""
    def y_at(z):
        return .445 + .115 * (z - Z_NOSE) / (-1.80 - Z_NOSE)
    flank = [-1.80 + (Z_NOSE + .012 + 1.80) * i / 8 for i in range(9)]
    right = [(side_x(z, y_at(z)) + .004, y_at(z), z) for z in flank] + [(side_x(Z_NOSE, .445) - .03, .445, Z_NOSE - .004)]
    return tube(right + [(-x, y, z) for x, y, z in reversed(right)], .011)


def drl_slashes():
    """Two diagonal lamps dropping from the blade ends across the nose corners (front three-quarter panel)."""
    parts = []
    for side in (-1, 1):
        path = [(-2.05 - .15 * t, .44 - .14 * t) for t in (0, .5, 1)]
        parts.append(tube([(side * (side_x(z, y) + .004), y, z) for z, y in path], .011))
    return merge(*parts)


def rear_light_bar():
    """Full-width rear light bar wrapping both corners at y .685 (rear.png)."""
    y = .685
    flank = [1.84 + (Z_TAIL - .006 - 1.84) * i / 5 for i in range(6)]
    right = [(side_x(z, y) + .004, y, z) for z in flank] + [(side_x(Z_TAIL, y) - .03, y, Z_TAIL + .004)]
    return tube(right + [(-x, yy, z) for x, yy, z in reversed(right)], .014)


def _prism(profile, x0, x1):
    """(y, z) profile swept along X from x0 to x1."""
    return extrude([(x0, y, z) for y, z in profile], (x1 - x0, 0, 0))


def hood_vents(side):
    """(recess, slats): a dark recess with three body-colour louvres on the hood plateau at the windscreen base
    (front three-quarter panel). Size and louvre count inferred: the panel resolves only a dark patch."""
    xs, zs = (.18, .29, .40), [-1.30 + .045 * i for i in range(5)]
    recess = loft([[(side * x, hood_y(z, x) + .004, z) for x in xs] + [(side * x, hood_y(z, x) - .02, z) for x in reversed(xs)]
                   for z in zs], close=True)
    slats = []
    for z in (-1.265, -1.21, -1.155):
        y = max(hood_y(z, x) for x in xs) + .004
        slats.append(extrude([(side * .19, y, z - .012), (side * .39, y, z - .012), (side * .39, y, z + .012), (side * .19, y, z + .012)], (0, .01, 0)))
    return recess, merge(*slats)


def cabin_parts():
    """(dark, tan): what shows behind the glass. The hull is closed under the canopy, so the cabin is the part above
    the deck: floor liner, bulkhead, steering wheel (dark); dash top and two seat backs (tan). All inferred: the
    panels show a tan interior, not its layout."""
    def edge(z):
        return .90 * (RIDGE_X(z) + .04)
    zs = [-.96 + 2.46 * i / 12 for i in range(13)]
    floor = loft([[(-edge(z), DECK_Y(z) - .02, z), (-edge(z), DECK_Y(z) + .012, z), (edge(z), DECK_Y(z) + .012, z), (edge(z), DECK_Y(z) - .02, z)]
                  for z in zs], close=True)
    bulkhead = extrude([(-.50, .80, .70), (.50, .80, .70), (.32, .93, .70), (-.32, .93, .70)], (0, 0, .04))
    rim = revolve([(-.012, .105), (.012, .105), (.012, .13), (-.012, .13)], 16, axis="z")
    wheel = merge(([(x - .27, y + .89, z - .50) for x, y, z in rim[0]], rim[1]), cylinder((-.27, .85, -.62), (-.27, .89, -.50), .02, .02, 6))
    dash = _prism([(.805, -.96), (.885, -.66), (.875, -.56), (.805, -.56)], -.50, .50)   # (y, z)
    seat = [(.805, -.10), (.805, .14), (.97, .40), (.97, .31), (.88, .12), (.86, -.10)]    # squab and raked back, (y, z)
    return merge(floor, bulkhead, wheel), merge(dash, *[_prism(seat, s * .27 - .15, s * .27 + .15) for s in (-1, 1)])


def build_car(c, mats):
    """c: the collection that holds every shipping object."""
    P, G = mats["gt_paint"], mats
    body = part("body", c, *body_verts(), P)
    body.data.set_sharp_from_angle(angle=math.radians(50))   # arch lips, sill and tail edges stay crisp
    glass, roof = upper_parts()
    part("glass_canopy", c, *glass, G["gt_glass"])
    part("roof", c, *roof, P)
    dark, tan = cabin_parts()
    part("cabin", c, *dark, G["gt_trim"])
    part("cabin_seats", c, *tan, G["gt_cabin"])

    for name, (x, z) in WHEELS.items():
        side = -1 if x < 0 else 1
        pivot = node(name, c, pos=(x, WHEEL_Y, z))
        axle = node(name + "_axle", c, pos=(0, HUB_Y - WHEEL_Y, 0), parent=pivot)   # static: the smaller tyre still touches the ground
        tire, rim, spokes, hub, disc = wheel_parts(side)
        part(name + "_tire", c, *tire, G["gt_tire"], axle)
        part(name + "_barrel", c, *rim, G["gt_rim"], axle)
        part(name + "_caliper", c, *extrude([(side * .04, -.04, .10), (side * .04, .09, .145), (side * .04, .13, .10), (side * .04, .015, .055)],
                                           (side * .035, 0, 0)), G["gt_nozzle"], axle)
        spin = node(name + "_spin", c, parent=axle)
        part(name + "_spokes", c, *spokes, G["gt_rim"], spin)
        part(name + "_hub", c, *hub, G["gt_trim"], spin)
        part(name + "_disc", c, *disc, G["gt_carbon"], spin)

    # Twin swan-neck wing (rear three-quarter panel; the other three panels show the car without it). `wing` is the
    # contract pivot the rig raises; `wing_stow` under it is a static offset that puts the hinge line (`wing_blade`,
    # rig-driven) on the blade's leading edge just above the tail deck. Stowed, the blade lies close over the deck;
    # the rig's tilt swings its trailing edge up about the leading edge, and its raise lifts it on the pylons.
    wing = node("wing", c, pos=WING_POS)
    stow = node("wing_stow", c, pos=WING_STOW, parent=wing)
    blade = node("wing_blade", c, pos=(0, 0, -HINGE), parent=stow)
    section = [(0, -.030), (.12 * CHORD, -.012), (.5 * CHORD, -.006), (CHORD, -.022), (CHORD, -.030),
               (.5 * CHORD, -.046), (.12 * CHORD, -.046)]                                                  # (z, y)
    part("wing_aerofoil", c, *extrude([(-.98, y, z) for z, y in section], (1.96, 0, 0)), P, blade)
    # Swept endplates, taller at the back and canted outward at the top (rear three-quarter panel): (y, z). They are
    # fixed to the blade. The rig folds `wing_tip_*` 60 degrees with the Roadster's tips, so those nodes stay empty.
    quad = [(-.11, .01), (.02, -.01), (.07, .39), (-.11, .41)]
    part("wing_endplates", c, *merge(*[loft([[(s * (.98 + .15 * (y + .11) + t), y, z) for y, z in quad] for t in (0, .016)], close=True)
                                       for s in (-1, 1)]), P, blade)
    node("wing_tip_r", c, pos=(.80, 0, HINGE), parent=blade)
    node("wing_tip_l", c, pos=(-.80, 0, HINGE), parent=blade, scale=(-1, 1, 1))
    # Swan-neck pylons: a stalk from inside the tail up ahead of the leading edge, then a short neck onto the hinge
    # line, in the stow frame so they rise with the blade: (y, z).
    stalk, neck = [(-.50, -.38), (-.50, -.22), (-.02, -.18), (.03, -.24)], [(.03, -.24), (-.012, -.20), (-.012, -.14), (.012, -.14)]
    part("wing_pylons", c, *merge(*[_prism(p, s * .42 - .015, s * .42 + .015) for s in (-1, 1) for p in (stalk, neck)]), G["gt_carbon"], stow)
    rot, sy = ram_rest_pose()
    # The rig drives `wing_rams` between the Roadster's bay and blade, which this wing does not share: the node ships empty.
    node("wing_rams", c, pos=(0, RAM_BASE_Y, RAM_BASE_Z), parent=wing, scale=(1, sy, 1), rot_x=rot)

    # Lamps.
    part("headlamp", c, *merge(light_blade(), drl_slashes()), G["gt_lamp"])
    part("tail_light", c, *rear_light_bar(), G["gt_light"])

    # Dark trim: nose intake, corner intakes, splitter, rear fascia on the raked tail face, flank intakes, sill blades.
    nose = Z_NOSE - .002
    part("front_intake", c, *extrude([(-.28, .285, nose), (.28, .285, nose), (.35, .415, nose), (-.35, .415, nose)], (0, 0, -.012)), G["gt_trim"])
    part("splitter", c, *extrude([(-.42, .165, -2.29), (.42, .165, -2.29), (.76, .165, -2.16), (1.0, .165, -1.97), (1.03, .165, -1.84),
                                  (-1.03, .165, -1.84), (-1.0, .165, -1.97), (-.76, .165, -2.16)], (0, .024, 0)), G["gt_carbon"])
    # Dark rear cavity under the body-colour bumper band: a closed block down to the diffuser lip. rear.png and the
    # rear three-quarter panel both show this deep tail; side.png alone rakes it away (recorded as a panel conflict).
    fascia = [(.19, 1.86), (.19, 1.985), (.30, 2.02), (.50, 2.047), (.565, 2.047), (.565, 1.86)]   # (y, z)
    corner = [(.24, 1.86), (.24, 1.985), (.50, 2.046), (.565, 2.046), (.565, 1.86)]   # body-colour bumper corners either side
    part("rear_fascia", c, *_prism(fascia, -.80, .80), G["gt_trim"])
    part("rear_corners", c, *merge(_prism(corner, -.90, -.80), _prism(corner, .80, .90)), P)
    part("diffuser", c, *merge(
        extrude([(-.90, .17, 1.84), (.90, .17, 1.84), (.90, .17, 2.0), (-.90, .17, 2.0)], (0, .02, 0)),
        *[extrude([(x - .011, .19, 1.84), (x + .011, .19, 1.84), (x + .011, .19, 2.0), (x - .011, .19, 2.0)], (0, .06, 0))
          for x in (-.84, -.42, 0, .42, .84)],
    ), G["gt_carbon"])
    for side, tag in ((-1, "l"), (1, "r")):
        recess, slats = hood_vents(side)
        part("hood_vent_" + tag, c, *recess, G["gt_trim"])
        part("hood_vent_slats_" + tag, c, *slats, P)
    intake_z = [.15 + .88 * i / 10 for i in range(11)]
    corner_z = [-2.16 + .30 * i / 6 for i in range(7)]
    rocker_z = [-.92 + 1.94 * i / 12 for i in range(13)]
    for side, tag in ((-1, "l"), (1, "r")):
        part("side_intake_" + tag, c, *patch(intake_z, lambda z: .50 - .22 * (z - .15) / .88, lambda z: .51 + .12 * (z - .15) / .88, side=side), G["gt_trim"])
        part("corner_intake_" + tag, c, *patch(corner_z, lambda z: SILL(z) + .015, lambda z: SILL(z) + .025 + .17 * (-1.86 - z) / .30, ny=2, side=side), G["gt_trim"])
        part("rocker_" + tag, c, *patch(rocker_z, lambda z: .168, lambda z: .255, ny=2, proud=.012, side=side), G["gt_carbon"])
        # Mirror pod on a short stalk at the A-pillar base (front three-quarter panel).
        pod = lathe([(a, r) for a, r in [(-.08, .012), (-.04, .040), (.05, .046), (.075, .030)]], 10, axis="z")
        mirror = merge(([(side * .88 + 1.6 * x, .875 + .8 * y, -.62 + z) for x, y, z in pod[0]], pod[1]),
                       cylinder((side * .70, .82, -.62), (side * .86, .865, -.62), .014, .014, 6))
        part("mirror_" + tag, c, *mirror, P)

    # Lift thrusters at the contract ports (inside the floor on this car).
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("thruster_%02d" % i, c, pos=(x, .3, z))
        part("thruster_%02d_nozzle" % i, c, *cylinder((0, -.1, 0), (0, .1, 0), .15, .12, 12), G["gt_nozzle"], pivot)
    fans = node("lift_fans", c)
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("lift_fan_%02d" % i, c, pos=(x, .19, z), parent=fans)
        part("lift_fan_%02d_disc" % i, c, *cylinder((0, -.0125, 0), (0, .0125, 0), .11, .11, 12), G["gt_fan"], pivot)
    # Rear nozzles: a chrome bezel with a dark throat (rear panels: radius ~.08), one rigid offset from REAR_PORTS.
    for i, x in enumerate(REAR_PORT_X, 1):
        pivot = node("nozzle_rear_%02d" % i, c, pos=(x, NOZZLE_Y, NOZZLE_Z))
        part("nozzle_rear_%02d_tube" % i, c, *lathe([(-.05, .085), (.065, .085), (.073, .076), (.065, .067), (.0, .06)], 24, axis="z"), G["gt_nozzle"], pivot)
        part("nozzle_rear_%02d_throat" % i, c, *lathe([(-.01, .062), (.005, .062)], 24, axis="z"), G["gt_trim"], pivot)
