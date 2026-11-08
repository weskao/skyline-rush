"""Roadster 2 parts in three.js car space. Numbers are copied from the procedural car
(src/roadster-fidelity.js, src/roadster-rear-nozzles.js, src/effects.js) so the runtime
rig and the Garage framing see the same pivots, wing travel and bounds."""
import math

from roadster_geom import cylinder, extrude, loft, merge, node, part, smooth_rings

# Body stations: [z, half-width, bottom, deck, shoulder, crest]  (roadster-fidelity.js BODY_STATIONS)
# Forms gate (gate/refs.json, photo 14): bottoms beside and between the arches are lowered so the
# body covers more tyre sidewall (tyre radius .44 is contract, so the arch/sill moves, not the tyre).
BODY_STATIONS = [
    [-2.48, .92, .40, .60, .61], [-2.31, 1.03, .37, .62, .73], [-1.91, 1.13, .30, .66, .93],
    [-1.41, 1.19, .81, .74, 1.03], [-.72, 1.16, .22, .76, 1.04], [.44, 1.15, .22, .77, 1.04],
    [1.27, 1.19, .83, .78, 1.08], [1.79, 1.18, .30, .96, 1.02], [2.21, 1.1, .30, .99, .99],
    [2.37, 1.04, .32, .98, .97],
]
# Canopy stations: [z, base half-width, base y, roof half-width, roof y]
# Forms gate (photo 14): one short roof peak at 1.305 (procedural 1.335, inside the -3 % height bound)
# with a more raked windshield and rear glass; the rear shoulders above drop toward the tail line.
# Base y sits just under the body surface at that half-width, so no gap shows the sealed deck below.
CANOPY_STATIONS = [
    [-1.32, .68, .745, .62, .75], [-.55, 1.00, 1.00, .62, 1.20], [.15, 1.00, 1.00, .66, 1.305],
    [.75, .99, 1.01, .66, 1.22], [1.30, .98, 1.00, .68, 1.12], [1.84, .83, .97, .72, 1.045],
    [2.02, .70, .97, .62, 1.015],
]
# Lift ports (x, z) and rear ports (x) exactly as src/effects.js defines them.
LIFT_PORTS = [(-0.79, -1.3), (-0.79, 1.45), (0.79, -1.3), (0.79, 1.45)]
REAR_PORT_X = [-0.62, -0.22, 0.22, 0.62]  # REAR_PORTS in src/aero-vfx.js, y 0.64, z 2.39
WHEELS = {"wheel_fl": (-1.05, -1.35), "wheel_fr": (1.05, -1.35), "wheel_rl": (-1.05, 1.42), "wheel_rr": (1.05, 1.42)}
WHEEL_Y = 0.46
WING_POS = (0.0, 1.08, 2.25)
HINGE = 0.20
TILT = math.radians(35)
RAISE, RAISE_TILT = 0.16, math.radians(12)
RAM_BASE_Y, RAM_BASE_Z = -0.08, 0.05
RAM_TOP_Y, RAM_TOP_Z = -0.012, 0.26


def body_verts():
    rings = []
    for z, w, bottom, deck, shoulder, crest in [(s[0], s[1], s[2], s[3], s[4], s[5] if len(s) > 5 else .88) for s in BODY_STATIONS]:
        floor = min(bottom, .39)
        rise = min(.12, (shoulder - bottom) * .26)
        drop = min(.16, (shoulder - bottom) * .26)
        rings.append([
            (-.83 * w, floor, z), (-w, bottom + rise, z), (-w, shoulder - drop, z), (-crest * w, shoulder, z),
            (-.57 * w, deck, z), (.57 * w, deck, z), (crest * w, shoulder, z), (w, shoulder - drop, z),
            (w, bottom + rise, z), (.83 * w, floor, z),
        ])
    # Art pass: smooth (no-overshoot) resample through the same stations, so the faceted 10x10 loft reads as a
    # rounded body while every station, bound and anchor stays where the contract puts it.
    return loft(smooth_rings(rings, 4, 4, ring_closed=True), close=True)


def canopy_verts():
    rings = [[(-b, by, z), (-r, ry, z), (r, ry, z), (b, by, z)] for z, b, by, r, ry in CANOPY_STATIONS]
    return loft(smooth_rings(rings, 3, 4, ring_closed=False), close=False)


def surround_tubes():
    """Dark A-pillar / roof edge traced along the canopy roof line (radius .017)."""
    parts = []
    for side in (-1, 1):
        pts = [(side * r, ry + .004, z) for z, _b, _by, r, ry in CANOPY_STATIONS]
        for a, b in zip(pts, pts[1:]):
            parts.append(cylinder(a, b, .017, .017, 6, cap=False))
    return merge(*parts)


def wheel_rest_spin_parts(side):
    """Aero inset, five swept blades and hub for one side (roadster-fidelity addRoadsterWheelDetail)."""
    inset = cylinder((side * .151 - .0085, 0, 0), (side * .151 + .0085, 0, 0), .327, .327, 40)
    hub = cylinder((side * .18 - .0135, 0, 0), (side * .18 + .0135, 0, 0), .075, .075, 24)
    blades = []
    for i in range(5):
        a = math.pi * 2 * i / 5 + .15

        def point(radius, offset):
            ang = a + offset
            return (side * .172 - .006, radius * math.cos(ang), radius * math.sin(ang))
        corners = [point(.07, -.42), point(.19, -.20), point(.318, .06), point(.07, .30)]
        blades.append(extrude(corners, (side * .012, 0, 0)))
    return inset, hub, merge(*blades)


def ram_rest_pose():
    """Rest rotation.x and scale.y of the rams node (roadster-fidelity poseRoadsterWing at tilt=0, raise=0)."""
    dy = RAM_TOP_Y - RAM_BASE_Y
    dz = RAM_TOP_Z - HINGE - RAM_BASE_Z
    return math.atan2(dz, dy), math.hypot(dy, dz)


def build_car(c, mats):
    """c: the collection that holds every shipping object. Returns the list of created objects."""
    P, G = mats["roadster_paint"], mats
    made = []

    made.append(part("body", c, *body_verts(), P))
    made.append(part("glass_canopy", c, *canopy_verts(), G["roadster_glass"]))
    made.append(part("glass_surround", c, *surround_tubes(), G["roadster_trim"]))

    # Wheels: static tyre and rim barrel on the pivot, the aero spin node carries inset, blades and hub.
    for name, (x, z) in WHEELS.items():
        side = -1 if x < 0 else 1
        pivot = node(name, c, pos=(x, WHEEL_Y, z))
        part(name + "_tire", c, *cylinder((-.135, 0, 0), (.135, 0, 0), .44, .44, 40), G["roadster_tire"], pivot)
        part(name + "_barrel", c, *cylinder((-.1425, 0, 0), (.1425, 0, 0), .32, .32, 32), G["roadster_rim"], pivot)
        spin = node(name + "_spin", c, parent=pivot)
        inset, hub, blades = wheel_rest_spin_parts(side)
        part(name + "_inset", c, *inset, G["roadster_rim"], spin)
        part(name + "_blades", c, *blades, G["roadster_carbon"], spin)
        part(name + "_hub", c, *hub, G["roadster_nozzle"], spin)
        made.append(pivot)

    # Active wing: wing > wing_blade > (aerofoil, wing_tip_r, wing_tip_l); wing > wing_rams, swan necks.
    wing = node("wing", c, pos=WING_POS)
    blade = node("wing_blade", c, pos=(0, 0, -HINGE), parent=wing)
    main = [(-.80, 0, 0.0), (.80, 0, 0.0), (.80, 0, .42), (-.80, 0, .42)]
    part("wing_aerofoil", c, *extrude(main, (0, .04, 0)), P, blade)
    tip = [(0, 0, .22), (.30, 0, .20), (.30, 0, -.06), (0, 0, -.20)]
    tip_geo = extrude(tip, (0, .04, 0))
    part("wing_tip_r_mesh", c, *tip_geo, P, node("wing_tip_r", c, pos=(.80, 0, HINGE), parent=blade))
    # Mirrored tip: node scale x = -1, exactly like the procedural tip (the rig copies this scale).
    part("wing_tip_l_mesh", c, *tip_geo, P, node("wing_tip_l", c, pos=(-.80, 0, HINGE), parent=blade, scale=(-1, 1, 1)))
    swan = []
    for side in (-1, 1):
        pts = [(side * x, y, z) for x, y, z in [(.42, 0, -.18), (.42, -.06, -.12), (.42, -.16, -.14), (.42, -.30, -.18)]]
        for a, b in zip(pts, pts[1:]):
            swan.append(cylinder(a, b, .022, .022, 6, cap=False))
    part("wing_swan_necks", c, *merge(*swan), G["roadster_carbon"], wing)
    rot, sy = ram_rest_pose()
    rams = node("wing_rams", c, pos=(0, RAM_BASE_Y, RAM_BASE_Z), parent=wing, scale=(1, sy, 1), rot_x=rot)
    rods = merge(cylinder((-.30, 0, 0), (-.30, 1, 0), .013, .013, 6), cylinder((.30, 0, 0), (.30, 1, 0), .013, .013, 6))
    part("wing_rams_mesh", c, *rods, G["roadster_carbon"], rams)
    made.append(wing)

    # Static trim (procedural positions; see roadster-fidelity addRoadsterTrim / rocker).
    # Art pass: the smoothed body side curves in below the shoulder, so the old .20-.58 block poked through as a
    # patch; it is now a low sill strip just proud of the body side (1.17, inside the 1.19 arch half-width).
    for side in (-1, 1):
        d = (-.10 * side, 0, 0)
        rocker = [(side * 1.17, .20, -.86), (side * 1.17, .20, .91), (side * 1.17, .34, .89), (side * 1.17, .34, -.84)]
        made.append(part("rocker_" + ("l" if side < 0 else "r"), c, *extrude(rocker, d), G["roadster_carbon"]))
    # Splitter keeps its z (front bound), sits higher (nose line of photo 14) and closes up to the nose bottom (.40).
    made.append(part("splitter", c, *extrude([(-.95, .28, -2.58), (.95, .28, -2.58), (.95, .28, -2.40), (-.95, .28, -2.40)], (0, .12, 0)), G["roadster_trim"]))
    # Diffuser closes the rear face down to .12 (photos 13/06 show no gap under the rear bumper). Art pass: a
    # deck plate over five vertical fins (photo 06 shows a finned diffuser), same outer box as before.
    made.append(part("diffuser", c, *merge(
        extrude([(-.9, .26, 2.05), (.9, .26, 2.05), (.9, .26, 2.46), (-.9, .26, 2.46)], (0, .12, 0)),
        *[extrude([(x - .012, .12, 2.12), (x + .012, .12, 2.12), (x + .012, .12, 2.46), (x - .012, .12, 2.46)], (0, .14, 0))
          for x in (-.88, -.6, -.3, 0, .3, .6, .88)],
    ), G["roadster_trim"]))
    made.append(part("headlamp", c, *extrude([(-.8, .46, -2.47), (.8, .46, -2.47), (.8, .50, -2.47), (-.8, .50, -2.47)], (0, 0, -.02)), G["roadster_lamp"]))
    made.append(part("tail_light", c, *extrude([(-.95, .70, 2.37), (.95, .70, 2.37), (.95, .76, 2.37), (-.95, .76, 2.37)], (0, 0, .02)), G["roadster_light"]))
    # Art pass: dark lamp pockets, a trim frame just behind each light's face so the light sits in a recess.
    made.append(part("lamp_pockets", c, *merge(
        extrude([(-.85, .43, -2.465), (.85, .43, -2.465), (.85, .53, -2.465), (-.85, .53, -2.465)], (0, 0, -.018)),
        extrude([(-1.0, .67, 2.37), (1.0, .67, 2.37), (1.0, .79, 2.37), (-1.0, .79, 2.37)], (0, 0, .016)),
    ), G["roadster_trim"]))
    made.append(part("wing_bay", c, *extrude([(-.6, 1.012, 2.06), (.6, 1.012, 2.06), (.6, 1.012, 2.42), (-.6, 1.012, 2.42)], (0, .002, 0)), G["roadster_trim"]))

    # Lift thrusters: frustum, top radius .18 / bottom .22, height .2, centred at y .3 (effects.js LIFT_PORTS).
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("thruster_%02d" % i, c, pos=(x, .3, z))
        made.append(part("thruster_%02d_nozzle" % i, c, *cylinder((0, -.1, 0), (0, .1, 0), .22, .18, 10), G["roadster_nozzle"], pivot))
        made.append(pivot)
    # Lift fans (Task 4b): the procedural car's flight fans (car-model.js makeCar `jets`): a disc of radius .13 and
    # height .025, 12 sides, centred at y .19 under each lift port. lift_fans is the pivot partner of the procedural
    # `jets` group, so the rig shows the fans only while the car thrusts.
    fans = node("lift_fans", c)
    for i, (x, z) in enumerate(LIFT_PORTS, 1):
        pivot = node("lift_fan_%02d" % i, c, pos=(x, .19, z), parent=fans)
        made.append(part("lift_fan_%02d_disc" % i, c, *cylinder((0, -.0125, 0), (0, .0125, 0), .13, .13, 12), G["roadster_fan"], pivot))
    made.append(fans)
    # Rear nozzles at the REAR_PORTS: satin bronze lip tube (roadster-rear-nozzles.js, radii simplified).
    for i, x in enumerate(REAR_PORT_X, 1):
        pivot = node("nozzle_rear_%02d" % i, c, pos=(x, .64, 2.39))
        made.append(part("nozzle_rear_%02d_tube" % i, c, *cylinder((0, 0, -.03), (0, 0, .07), .06, .057, 16), G["roadster_nozzle"], pivot))
        made.append(pivot)
    return made
