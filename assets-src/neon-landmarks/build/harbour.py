"""The harbour pieces of the 10 km Neon lap: ship-to-shore gantry, quay container stack, moored container ship.
Same axes and conventions as pieces.py: metres, +X = the driver's right, +Y = the driving direction, +Z = up;
the gantry keeps everything closer than its clear half to the centre line above its clear height (build.py
PLACEMENT, asset-brief.md). Surfaces: sector_materials.py.

Sizes follow real port equipment (34 m rail gauge, 40 ft containers on a 2.5 x 12.3 x 2.6 m pitch, a 150 m
feeder ship with 2.8 m storeys and 1.2 x 1.0 m windows); none copies a real crane, ship, line, brand or logo.
"""
GAUGE = 17.0       # crane leg centre lines from the road centre: a 34 m rail gauge (real ship-to-shore cranes: 30 to 35)
LEG_Y = 9.0        # legs 18 m apart along the rail
LEG = 1.0          # half size of a box-girder leg
PORTAL = 22.0      # underside of the portal beams: the clear height over the road
BOOM = 44.0        # underside of the boom; it reaches 57 m out over the water (+X) and 38 m back over the land
WALK = PORTAL + 3.2   # top of the portal beams: the walkway the stairs climb to
CELL = (2.5, 12.3, 2.6)   # container pitch: the `containers` material gives each cell its own paint, frame and doors


def handrail(b, along, a0, a1, at, z, step=2.0, height=1.1, **kw):
    """Yellow post-and-rail guard along x or y from a0 to a1 on the line `at` (the other axis), standing on z. Near
    LOD only: from 60 m a 5 cm rail is under a pixel."""
    put = (lambda a, c, h, **k: b.box("handrail", a, c, h, **k)) if along == "x" else (lambda a, c, h, **k: b.box("handrail", c, a, h, **k))
    n = max(1, round((a1 - a0) / step))
    for i in range(n + 1):
        p = a0 + (a1 - a0) * i / n
        put((p - 0.03, p + 0.03), (at - 0.03, at + 0.03), (z, z + height), swatch=True, lod=(0, 0), skip="-z+z", **kw)
    put((a0, a1), (at - 0.03, at + 0.03), (z + height - 0.05, z + height), swatch=True, lod=(0, 0), **kw)
    put((a0, a1), (at - 0.02, at + 0.02), (z + height / 2, z + height / 2 + 0.04), swatch=True, lod=(0, 0), **kw)


def _lamp(b, lens, x, y, z, w=0.9, d=0.7, face="-z", **kw):
    """Floodlight housing with its lens on one face (lens: the lamp material)."""
    b.box("steel_dark", (x - w / 2, x + w / 2), (y - d / 2, y + d / 2), (z, z + 0.35), swatch=True, lod=(0, 0), **kw)
    b.box(lens, (x - w / 2 + 0.05, x + w / 2 - 0.05), (y - d / 2 + 0.05, y + d / 2 - 0.05), (z - 0.04, z), only=face, swatch=True, **kw)


def _ladder(b, x, y, z0, z1, face="+x"):
    """Caged-free fixed ladder on a leg face: two stiles and a rung panel (the `grating` treads draw the rungs)."""
    out = 1 if face[0] == "+" else -1
    xs = sorted((x, x + out * 0.12))
    for dy in (-0.25, 0.25):
        b.box("steel_dark", xs, (y + dy - 0.03, y + dy + 0.03), (z0, z1), swatch=True, lod=(0, 0), skip="-z+z")
    b.box("grating", sorted((x + out * 0.08, x + out * 0.1)), (y - 0.22, y + 0.22), (z0, z1), only=face, lod=(0, 0), pri=0.8)


def _stairs(b, x0, x1, y0, y1, top, flights):
    """Switchback stair tower: `flights` sloped flights in two lanes between x0 and x1, running between y0 and y1,
    landings at both ends, corner posts, a handrail on every flight. Treads come from the `grating` texture."""
    rise, lane = top / flights, (x1 - x0) / 2
    for k in range(flights):
        z0, z1 = k * rise, (k + 1) * rise
        xc = x0 + lane * (0.5 + k % 2)
        ya, yb = (y0 + 1.3, y1 - 1.3) if k % 2 == 0 else (y1 - 1.3, y0 + 1.3)
        b.sweep("grating", [(xc, ya, z0), (xc, yb, z1)], [(0, yb - ya, rise)] * 2, lane - 0.15, 0.18, pri=0.6, mirror="", lod=(0, 0))
        rail_x = x0 + 0.05 if k % 2 == 0 else x1 - 0.05
        b.sweep("handrail", [(rail_x, ya, z0 + 1.0), (rail_x, yb, z1 + 1.0)], [(0, yb - ya, rise)] * 2, 0.05, 0.05,
                swatch=True, lod=(0, 0), mirror="")
        end = (y1 - 1.3, y1) if k % 2 == 0 else (y0, y0 + 1.3)
        b.box("grating", (x0, x1), end, (z1 - 0.18, z1), pri=0.6, mirror="", lod=(0, 0))
    for x in (x0, x1):
        for y in (y0, y1):
            b.box("crane", (x - 0.1, x + 0.1), (y - 0.1, y + 0.1), (0, top + 1.1), swatch=True, skip="-z", mirror="")


def harbour_gantry(b):
    """Ship-to-shore container crane straddling the road like a gate. Mirrored across y = 0 (front and back legs);
    the boom side is not mirrored: outreach over +X, the machinery house over the land. Box-girder legs braced in
    their plane, bogies on the rails, striped sills, a stair tower on the land side, ladders, walkways with
    handrails, the trolley with its cab, hoist ropes, headblock and spreader. Light: sodium work lights over the road,
    floodlights over the ship, red aviation beacons; one thin cyan line on the portal beam is the only accent."""
    for side in (-1, 1):
        x = side * GAUGE
        b.box("concrete", (x - 1.4, x + 1.4), (0, 16), (-8, 0), skip="-z", pri=0.25)            # crane rail beam on piles
        b.box("steel_bare", (x - 0.1, x + 0.1), (0, 16), (0, 0.18), swatch=True, skip="-z")
        for y in (LEG_Y - 2.3, LEG_Y + 2.3):                                                     # bogie trucks, two wheel sets each
            b.box("crane", (x - 0.7, x + 0.7), (y - 1.7, y + 1.7), (0.6, 1.5), pri=0.5)
            for w in (y - 1.0, y + 1.0):
                b.cyl("steel_dark", (x - 0.75, w, 0.6), (x + 0.75, w, 0.6), 0.42, n=6, swatch=True, lod=(0, 0))
        b.box("hazard", (x - 0.8, x + 0.8), (LEG_Y - 4.4, LEG_Y + 4.4), (1.5, 2.6), pri=0.6)      # equaliser beam
        b.box("hazard", (x - 0.8, x + 0.8), (0, LEG_Y - LEG), (2.6, 4.2), pri=0.6)                 # sill beam
        b.box("crane", (x - LEG, x + LEG), (LEG_Y - LEG, LEG_Y + LEG), (2.6, BOOM - 2.4), skip="-z+z", pri=0.4)
        for zm, ends in ((12.6, (4.2, 21.0)), (34.0, (26.0, 41.6))):                              # X braces in the leg plane
            for z1 in ends:
                b.sweep("crane", [(x, 0, zm), (x, LEG_Y - LEG, z1)], [(0, LEG_Y - LEG, z1 - zm)] * 2, 0.7, 0.7, pri=0.4)
        b.box("crane", (x - 0.5, x + 0.5), (0, LEG_Y - LEG), (PORTAL, PORTAL + 1.2), pri=0.4)        # longitudinal tie
        b.box("crane", (x - LEG, x + LEG), (0, LEG_Y + LEG), (BOOM - 2.4, BOOM), pri=0.4)          # boom support beam
        for lx in (side * 12, side * 4):                                                         # sodium work lights over the road
            _lamp(b, "sodium", lx, LEG_Y, PORTAL - 0.35)
    for lift in (0, 1):                                                                           # ladders on the water-side leg
        z0, z1 = ((4.2, PORTAL), (WALK, BOOM - 2.4))[lift]
        _ladder(b, GAUGE + LEG, LEG_Y, z0, z1)
    b.box("crane", (-GAUGE - LEG, GAUGE + LEG), (LEG_Y - 0.9, LEG_Y + 0.9), (PORTAL, WALK), pri=0.4)  # portal beam
    b.box("accent", (-GAUGE + 1.5, GAUGE - 1.5), (LEG_Y + 0.9, LEG_Y + 0.94), (PORTAL + 0.2, PORTAL + 0.3), only="+y", swatch=True)
    b.box("grating", (-GAUGE - LEG, GAUGE + LEG), (LEG_Y + 0.9, LEG_Y + 2.1), (WALK - 0.12, WALK), pri=0.5, lod=(0, 0))   # walkway
    handrail(b, "x", -GAUGE - LEG, GAUGE + LEG, LEG_Y + 2.05, WALK, step=2.6)
    _stairs(b, -GAUGE - 4.4, -GAUGE - 1.2, 0.8, LEG_Y - LEG - 0.2, WALK, 10)                       # land side, one tower
    b.box("grating", (-GAUGE - 4.4, -GAUGE - LEG), (LEG_Y - LEG - 1.5, LEG_Y + 2.1), (WALK - 0.12, WALK), pri=0.5, mirror="", lod=(0, 0))
    for sx in (-1, 1):                                                                           # portal frame diagonals
        a, c = (sx * GAUGE, LEG_Y, WALK), (-sx * GAUGE, LEG_Y, BOOM - 2.4)
        t = tuple(q - p for p, q in zip(a, c))
        b.sweep("crane", [a, c], [t, t], 0.6, 0.6, pri=0.4)
    for x0 in (10.0, 13.4, 16.8, 20.2, 23.6, 27.0):                                             # festoon cable loops to the trolley
        b.sweep("steel_dark", [(x0, -2.4, BOOM - 0.2), (x0 + 1.5, -2.4, BOOM - 1.9), (x0 + 3.0, -2.4, BOOM - 0.2)],
                [(0.5, 0, -1), (1, 0, 0), (0.5, 0, 1)], 0.12, 0.12, swatch=True, lod=(0, 0), mirror="")

    # boom: two box girders (mirror) with cross beams, trolley rails and a walkway on the +y side
    for x0, x1 in ((-38, -10), (-10, 18), (18, 46), (46, 74)):                                   # in atlas-sized runs
        b.box("crane", (x0, x1), (3.2, 4.8), (BOOM, BOOM + 3.6), skip="-x" * (x0 > -38) + "+x" * (x1 < 74), pri=0.3)
    b.box("steel_bare", (-38, 74), (3.9, 4.1), (BOOM + 3.6, BOOM + 3.8), swatch=True, skip="-z")
    for xc in range(-34, 74, 9):
        b.box("crane", (xc - 0.3, xc + 0.3), (0, 3.2), (BOOM + 0.3, BOOM + 1.1), swatch=True, skip="+y", lod=(0, 0))
    b.box("grating", (-24, 73), (4.8, 5.9), (BOOM + 0.6, BOOM + 0.72), pri=0.5, mirror="", lod=(0, 0))
    handrail(b, "x", -24, 73, 5.85, BOOM + 0.72, step=3.2, mirror="")
    b.box("cladding", (-38, -24), (0, 5.6), (BOOM + 3.6, BOOM + 9.6), pri=0.45)                  # machinery house
    b.box("cladding", (-38.2, -23.8), (0, 5.8), (BOOM + 9.6, BOOM + 9.9), pri=0.45)               # roof edge
    b.box("steel_dark", (-38.04, -38.0), (0.2, 1.2), (BOOM + 3.7, BOOM + 5.8), only="-x", swatch=True, mirror="")   # door
    for xc in (-35, -31, -27):                                                                   # louvres
        b.box("steel_dark", (xc - 0.8, xc + 0.8), (5.6, 5.64), (BOOM + 6.2, BOOM + 7.6), only="+y", swatch=True)
    b.box("beacon", (-37.9, -37.5), (5.0, 5.4), (BOOM + 9.9, BOOM + 10.2), swatch=True)

    top = (8.0, 2.2, 75.0)                                                                       # apex A-frame and stays
    for foot in ((GAUGE, 4.0, BOOM + 3.6), (-GAUGE, 4.0, BOOM + 3.6)):
        b.cyl("crane", foot, top, 0.6, n=6, caps=False, swatch=True)
    b.box("crane", (6.5, 9.5), (0, 2.8), (73.5, 76.5), swatch=True)
    b.box("beacon", (7.7, 8.3), (0, 0.3), (76.5, 77.0), swatch=True)
    for end in ((73, 4.0, BOOM + 3.6), (45, 4.0, BOOM + 3.6), (-36, 4.0, BOOM + 3.6)):
        b.cyl("steel_bare", (8.0, 2.0, 75.0), end, 0.12, n=4, caps=False, swatch=True, lod=(0, 0))
        b.cyl("steel_bare", (8.0, 2.0, 75.0), end, 0.16, n=3, caps=False, swatch=True, lod=(1, 1))
    b.box("beacon", (73.4, 74.0), (3.7, 4.3), (BOOM + 3.6, BOOM + 4.0), swatch=True)

    # trolley on the girders, the cab under it on the +y side, four hoist ropes, headblock, spreader (raised)
    b.box("crane", (30, 37), (0, 5.0), (BOOM + 3.8, BOOM + 5.6), pri=0.5)
    b.box("crane", (31.6, 34.0), (1.0, 1.6), (BOOM - 0.6, BOOM + 3.8), swatch=True, mirror="")
    b.box("cladding", (31.2, 34.4), (1.6, 4.4), (BOOM - 3.2, BOOM - 0.6), pri=0.5, mirror="")
    b.box("glass", (34.4, 34.44), (1.8, 4.2), (BOOM - 2.6, BOOM - 1.0), only="+x", swatch=True, mirror="")
    b.box("window", (31.16, 31.2), (2.2, 3.8), (BOOM - 2.4, BOOM - 1.2), only="-x", swatch=True, mirror="")
    head = 28.0
    for xr in (32.0, 35.0):
        b.cyl("steel_bare", (xr, 0.6, BOOM + 3.8), (xr, 0.6, head), 0.06, n=3, caps=False, swatch=True)
    b.box("handrail", (31.4, 35.6), (0, 1.4), (head - 0.9, head), swatch=True)
    b.box("hazard", (32.3, 34.7), (0, 6.1), (head - 1.7, head - 0.9), pri=0.5)
    b.box("steel_dark", (32.1, 34.9), (5.8, 6.2), (head - 2.1, head - 1.7), swatch=True, lod=(0, 0))   # twistlock flippers
    for xc in (24.0, 38.0, 52.0, 66.0):                                                          # floodlights over the ship
        _lamp(b, "flood", xc, 4.0, BOOM - 0.35, w=1.0, d=0.6)


def _containers(b, x0, y0, z0, nx, nz, pri, skip="", lod=(0, 1), only=""):
    """A block nx containers wide (x) and nz high, one bay (12 m) long, its corner on the cell lattice."""
    b.box("containers", (x0 * CELL[0] + 0.02, (x0 + nx) * CELL[0] - 0.02), (y0 * CELL[1] + 0.15, (y0 + 1) * CELL[1] - 0.15),
          (z0 * CELL[2] + 0.005, (z0 + nz) * CELL[2] - 0.005), skip="-z" + skip, only=only, pri=pri, mirror="", lod=lod)


def _end_detail(b, x0, y, z0, face, reefer=False):
    """The outer end of one container (x0: its -x corner, y: the end face): four door lock rods, or on a reefer,
    turned the other way round, its machinery panel and the green status lamp."""
    out = 1 if face == "+y" else -1
    ys = sorted((y, y + out * 0.05))
    kw = dict(skip="-z+z" + ("-y" if out > 0 else "+y"), swatch=True, mirror="")
    if reefer:
        b.box("steel_dark", (x0 + 0.15, x0 + CELL[0] - 0.15), ys, (z0 + 0.25, z0 + CELL[2] - 0.25), lod=(0, 0), **kw)
        lamp = sorted((y + out * 0.05, y + out * 0.07))
        b.box("reefer", (x0 + 1.9, x0 + 2.15), lamp, (z0 + 1.9, z0 + 2.1), only=face, swatch=True, mirror="")
        return
    for at in (0.42, 0.88, 1.62, 2.08):
        b.box("steel_dark", (x0 + at - 0.025, x0 + at + 0.025), ys, (z0 + 0.15, z0 + CELL[2] - 0.15), lod=(0, 0), **kw)


STACK = ((3, 4), (4, 2), (2, 3), (1, 4))   # tiers per row (from the road, -X) and bay (-Y, +Y): a stepped skyline
REEFERS = ((0, 0, 1), (2, 0, 0), (1, 1, 1), (3, 1, 3))   # (row, bay, tier) of the refrigerated containers


def container_stack(b):
    """Quay block: 4 rows x 2 bays of 40 ft containers, 1 to 4 high, each in its own paint with corrugated walls,
    frame, corner castings and doors (texture), lock rods on the outer door ends (geometry) and four reefers turned
    machinery end out. Not mirrored; pivot at the centre of the 10 x 24.3 m footprint on the quay, -X toward the road."""
    rows = len(STACK)
    tiers = lambda r, k: STACK[r][k] if 0 <= r < rows and 0 <= k < 2 else 0
    for r in range(rows):
        for k in range(2):
            for t in range(tiers(r, k)):
                skip = "+z" * (t < tiers(r, k) - 1) + "-x" * (tiers(r - 1, k) > t) + "+x" * (tiers(r + 1, k) > t)
                _containers(b, r - rows // 2, k - 1, t, 1, 1, 0.45, skip)
                _end_detail(b, (r - rows // 2) * CELL[0], (2 * k - 1) * (CELL[1] - 0.15), t * CELL[2], "+y" if k else "-y",
                            reefer=(r, k, t) in REEFERS)


SHIP = (   # y, half beam, stem/stern rake (y per m of height), deck height, bulwark height: hull stations stern to bow
    (-74.0, 10.4, -0.12, 11.0, 1.2), (-72.0, 11.3, -0.08, 10.9, 1.2), (-68.0, 11.8, -0.03, 10.7, 1.0), (-60.0, 12.0, 0, 10.5, 1.0),
    (-20.0, 12.0, 0, 10.5, 1.0), (40.0, 12.0, 0, 10.5, 1.0), (50.0, 11.6, 0.03, 10.8, 1.0), (56.0, 10.6, 0.08, 11.2, 2.4),
    (62.0, 8.6, 0.14, 11.7, 2.4), (67.0, 6.0, 0.2, 12.2, 2.4), (71.0, 3.2, 0.28, 12.6, 2.4), (73.0, 1.4, 0.34, 12.8, 2.4), (74.0, 0.25, 0.38, 12.9, 2.4))
BAYS = ((3, 2), (4, 4), (2, 3), (4, 3), (3, 4), (1, 2), (3, 3), (2, 1))   # container tiers per bay above the hatch, port and starboard
HATCH = 5   # first container tier: hatch covers carry the cargo at 5 x 2.6 = 13.0 m


def station(y, i):
    """Column i of the hull stations (1 = half beam, 3 = deck height) at y, interpolated."""
    for s0, s1 in zip(SHIP, SHIP[1:]):
        if s0[0] <= y <= s1[0]:
            return s0[i] + (s1[i] - s0[i]) * (y - s0[0]) / (s1[0] - s0[0])
    return SHIP[-1][i]


def _cargo(b, c, x0, tiers, beside, behind, ahead):
    """One bay of deck cargo on one side: a block 4 containers wide, cut at the heights of its neighbours (the other
    side, the bays behind and ahead) so a face hidden by one is dropped or, in the 0.3 m bay gap, kept at a low texel
    density. The walls take the quay stack's density (0.4 vs 0.45; 0.18 smeared the ribs at hero distance), the
    tops a third of it: from the quay and the road they are seen edge on."""
    inner = "+x" if x0 < 0 else "-x"
    cuts = sorted({0, tiers} | {h for h in (beside, behind, ahead) if 0 < h < tiers})
    for lo, hi in zip(cuts, cuts[1:]):
        gap = "-y" * (behind >= hi) + "+y" * (ahead >= hi)
        _containers(b, x0, c, HATCH + lo, 4, hi - lo, 0.4, "+z" + inner * (beside >= hi) + gap)
        if gap:
            _containers(b, x0, c, HATCH + lo, 4, hi - lo, 0.06, only=gap, lod=(0, 0))
    _containers(b, x0, c, HATCH + tiers - 1, 4, 1, 0.12, only="+z")


def deck(y):
    return station(y, 3)


def cargo_ship(b):
    """Moored container feeder, 150 m, 24 m beam; pivot at the waterline mid-length, bow to +Y. Mirrored across
    x = 0 except the cargo, loaded unevenly, and the red / green side lights. Plated hull with a red boot topping
    above the waterline, draft marks, a raised bulwark at the forecastle, hatch covers and lashing bridges between
    the bays, a six-storey accommodation block with 1.2 x 1.0 m windows (a lit few), bridge wings, funnel, masts,
    lifeboats, deck lamps every bay."""
    rings = []
    for y0, w, rake, top, wall in SHIP:                                # half section, keel round to the deck centre line
        section = ((0, -3), (0.85 * w, -3), (w, -1.4), (w, 1.4), (w, top), (w, top + wall), (max(w - 0.25, 0.1), top + wall),
                   (max(w - 0.25, 0.1), top), (0, top))
        rings.append([(x, y0 + rake * (z + 3), z) for x, z in section])
    b.loft([None, None, "boot", "hull", "hull", "hull", "hull", "deck"], rings, cap="hull", pri=0.18)   # no bottom: under water
    for z in [0.2 * k for k in range(1, 16)]:                                                   # draft marks every 20 cm
        for y in (-60.0, -2.0, 40.0):
            b.box("marking", (12.0, 12.02), (y, y + (0.5 if z % 1 < 0.05 else 0.25)), (z, z + 0.1), only="+x", swatch=True, lod=(0, 0))
    for i, (c, (port, starboard)) in enumerate(zip(range(-4, 4), BAYS)):
        b.box("deck", (0, 10.4), (c * CELL[1] + 0.3, (c + 1) * CELL[1] - 0.3), (10.4, HATCH * CELL[2]), skip="-z", pri=0.18)   # hatch
        near = lambda side: (BAYS[i - 1][side] if i else 0, BAYS[i + 1][side] if i + 1 < len(BAYS) else 0)
        _cargo(b, c, -4, port, starboard, *near(0))
        _cargo(b, c, 0, starboard, port, *near(1))
    for c in range(-3, 4):                                                                       # lashing bridges at the bay gaps
        y = c * CELL[1]
        b.box("steel_dark", (0, 10.4), (y - 0.25, y + 0.25), (HATCH * CELL[2] + 2.3, HATCH * CELL[2] + 2.6), swatch=True, lod=(0, 0))
        for x in (0.3, 5.0, 10.1):
            b.box("steel_dark", (x - 0.12, x + 0.12), (y - 0.12, y + 0.12), (HATCH * CELL[2], HATCH * CELL[2] + 2.3), swatch=True, lod=(0, 0), skip="-z+z")
    # accommodation aft: 6 storeys of 2.8 m from the deck at 10.5 m, 22 x 13.2 m (window pitch 2.2 m in both)
    b.box("deckhouse", (0, 11.0), (-66.0, -52.8), (10.5, 27.3), skip="-z", pri=0.4)
    b.box("deckhouse", (0, 8.0), (-60.0, -52.8), (27.3, 30.1), pri=0.4)                          # wheelhouse
    b.box("deckhouse", (8.0, 12.6), (-55.0, -52.8), (27.3, 30.1), pri=0.4)                       # bridge wings
    b.box("glass", (0, 12.6), (-52.8, -52.76), (28.2, 29.6), only="+y", swatch=True)
    b.box("steel_dark", (0, 12.8), (-55.2, -52.6), (30.1, 30.3), swatch=True)                    # wheelhouse roof
    for k in range(6):                                                                           # storey deck lines
        z = 10.5 + 2.8 * (k + 1) - 0.1
        b.box("steel_dark", (11.0, 11.12), (-66.0, -52.8), (z, z + 0.12), skip="-x", swatch=True, lod=(0, 0))
    b.box("hull", (0, 2.8), (-66.0, -60.5), (27.3, 37.0), skip="-z", pri=0.4)                    # funnel
    b.box("boot", (2.8, 2.84), (-65.6, -60.9), (34.6, 35.6), only="+x", swatch=True)            # funnel band
    b.hull("hazard", [(x, y, z) for x in (11.1, 12.9) for y in (-64.0, -57.0) for z in (17.4, 18.6)]   # lifeboats
           + [(12.0, y, 19.2) for y in (-63.6, -57.4)] + [(12.0, y, 16.9) for y in (-63.4, -57.6)], swatch=True)
    for x, y, z0, z1 in ((0, -56.0, 30.3, 39.0), (0, 69.0, deck(69.0), 22.0)):                    # radar and fore masts
        b.cyl("steel_dark", (x, y, z0), (x, y, z1), 0.25, n=6, swatch=True, mirror="")
        b.box("flood", (-0.25, 0.25), (y - 0.25, y + 0.25), (z1, z1 + 0.4), swatch=True, mirror="")
    b.box("steel_dark", (-3.0, 3.0), (-56.15, -55.85), (37.0, 37.2), swatch=True, mirror="")     # radar yard
    b.box("beacon", (-0.15, 0.15), (-56.15, -55.85), (39.4, 39.7), swatch=True, mirror="")
    b.box("beacon", (-12.62, -12.58), (-54.4, -53.4), (28.4, 29.0), only="-x", swatch=True, mirror="")  # port side light
    b.box("reefer", (12.58, 12.62), (-54.4, -53.4), (28.4, 29.0), only="+x", swatch=True, mirror="")     # starboard
    b.box("flood", (5.5, 6.5), (-52.76, -52.7), (26.4, 26.9), only="+y", swatch=True)            # floodlight on the cargo
    for y in (60.0, 64.0):                                                                       # mooring winches on the forecastle
        b.box("steel_dark", (2.0, 4.6), (y - 0.9, y + 0.9), (deck(y), deck(y) + 1.4), skip="-z", swatch=True, lod=(0, 0))
    for y in (-70.0, -45.0, 46.0, 58.0, 66.0):                                                   # bollards (bitts) along the deck edge
        for dy in (-0.45, 0.45):
            x = station(y, 1) - 1.2
            b.cyl("steel_dark", (x, y + dy, deck(y)), (x, y + dy, deck(y) + 0.8), 0.22, n=6, swatch=True, lod=(0, 0))
    for y in (-63.0, -58.0):                                                                     # lifeboat davits
        b.cyl("steel_dark", (11.0, y, 16.2), (12.6, y, 19.8), 0.12, n=4, caps=False, swatch=True, lod=(0, 0))
    for c, (port, starboard) in zip(range(-4, 4), BAYS):                                         # lashing rods on the bay ends
        for x0, tiers in ((-10.0, port), (0.0, starboard)):
            for end in (c * CELL[1] + 0.15, (c + 1) * CELL[1] - 0.15):
                for k in range(4):
                    xa, xb = x0 + k * CELL[0] + 0.3, x0 + (k + 1) * CELL[0] - 0.3
                    b.cyl("steel_bare", (xa, end, HATCH * CELL[2] + 0.1), (xb, end, (HATCH + min(tiers, 2)) * CELL[2] - 0.2),
                          0.025, n=3, caps=False, swatch=True, lod=(0, 0), mirror="")
    w = station(67.0, 1)
    b.box("steel_dark", (w - 0.1, w + 0.02), (66.4, 67.6), (deck(67.0) - 2.4, deck(67.0) - 1.2), only="+x", swatch=True)   # hawse pipe
    for c in range(-4, 5):                                                                       # deck lamp posts at the bay gaps
        y = c * CELL[1]
        b.cyl("steel_dark", (11.3, y, deck(y)), (11.3, y, deck(y) + 4.0), 0.08, n=4, caps=False, swatch=True, lod=(0, 0))
        b.box("sodium", (10.95, 11.65), (y - 0.25, y + 0.25), (deck(y) + 4.0, deck(y) + 4.4), swatch=True)

