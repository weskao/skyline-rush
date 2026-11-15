"""The oldtown pieces of the 10 km Neon lap: street archway, lantern span, clock tower. Same axes and conventions as
pieces.py: metres, +X = the driver's right, +Y = the driving direction, +Z = up; the spanning pieces keep
everything closer than their clear half to the centre line above their clear height (build.py PLACEMENT).
Surfaces: sector_materials.py.

The gate is a civic street archway (brick piers, a riveted steel arch, a hung neon sign), the kind that marks a
market street or an old district in many port towns; it follows no one culture's sacred architecture, and the sign
carries invented glyphs, no script. None copies a real arch, tower, brand or logo.
"""
import math

# ---------------------------------------------------------------- lanterns


def lantern(b, x, y, z, scale, lamp, mirror=""):
    """Lantern hanging from (x, y, z): cord, iron caps, a glowing barrel body of `lamp` and a short drop. Returns its
    lowest point. Near LOD: 6-sided; far LOD: a 4-sided pair of cones in the same light."""
    r, h = 0.36 * scale, 0.42 * scale
    top, mid, low = z - 0.35 - 0.08, z - 0.43 - h, z - 0.43 - 2 * h
    kw = dict(swatch=True, mirror=mirror)
    b.cyl("iron", (x, y, z), (x, y, z - 0.35), 0.015, n=3, caps=False, lod=(0, 0), **kw)
    b.cyl("iron", (x, y, z - 0.35), (x, y, top), 0.12 * scale, r1=0.2 * scale, n=6, lod=(0, 0), **kw)
    b.cyl(lamp, (x, y, top), (x, y, mid), 0.22 * scale, r1=r, n=6, caps=False, lod=(0, 0), **kw)
    b.cyl(lamp, (x, y, mid), (x, y, low), r, r1=0.22 * scale, n=6, caps=False, lod=(0, 0), **kw)
    b.cyl("iron", (x, y, low), (x, y, low - 0.08), 0.2 * scale, r1=0.12 * scale, n=6, lod=(0, 0), **kw)
    b.cyl("iron", (x, y, low - 0.08), (x, y, low - 0.3), 0.03, n=3, caps=False, lod=(0, 0), **kw)
    b.cyl(lamp, (x, y, z - 0.35), (x, y, mid), 0.16 * scale, r1=r * 0.9, n=4, caps=False, lod=(1, 1), **kw)
    b.cyl(lamp, (x, y, mid), (x, y, low - 0.08), r * 0.9, r1=0.16 * scale, n=4, caps=False, lod=(1, 1), **kw)
    return low - 0.3


# ---------------------------------------------------------------- gate

PIER = (15.0, 18.2, 1.6)   # brick pier: inner face, outer face, half depth
SPAN = 15.0                # the arch springs from the pier tops at x = 15
RISE = 4.5                 # crown 4.5 m over the springing
SPRING = 15.4              # springing height
R = (SPAN ** 2 + RISE ** 2) / (2 * RISE)   # segmental arch radius, 27.25 m
CZ = SPRING + RISE - R     # its centre, below the road
RIB = 1.4                  # depth of the truss rib, lower to upper chord
RIB_Y = 0.9                # the two ribs stand at y = +/-0.9


def arch_z(x, r=R):
    return CZ + math.sqrt(r * r - x * x)


def _chord(b, r, t, y, n, **kw):
    """Arched chord of the truss: an r-radius flat bar t deep (radially), 0.3 wide, from the crown to the pier."""
    a1 = math.asin(SPAN / r)
    pts = [(r * math.sin(a1 * i / n), CZ + r * math.cos(a1 * i / n)) for i in range(n + 1)]
    out = [(x * (r + t) / r, CZ + (z - CZ) * (r + t) / r) for x, z in pts]
    b.prism("steel_arch", pts + out[::-1], y - 0.15, y + 0.15, axis="y", **kw)


# Invented glyphs: axis-aligned strokes on a 4 x 5 grid (column, row from the bottom, width, height). None is a
# letter or numeral of any script the shapes were checked against; they read as signage, not as words.
GLYPHS = (
    ((0, 1, 1, 4), (0, 4, 4, 1), (2, 0, 1, 3), (3, 2, 1, 1)),
    ((1, 0, 1, 5), (0, 1, 1, 1), (2, 3, 2, 1), (3, 0, 1, 2)),
    ((0, 0, 4, 1), (0, 2, 1, 3), (2, 2, 1, 2), (1, 4, 3, 1)),
    ((0, 3, 2, 1), (1, 0, 1, 3), (3, 1, 1, 4), (2, 1, 1, 1)),
)
SIGN = (4.4, 15.7, 18.3)   # half width, bottom (over the 15 m clear height), top


def _sign(b):
    """Hung sign under the crown: a dark iron panel with a steel rim, four invented glyphs in red neon on each face
    (the back face drawn mirrored, so both read the same way), on two hanger rods."""
    hw, z0, z1 = SIGN
    b.box("iron", (-hw, hw), (-0.15, 0.15), (z0, z1), pri=0.6, mirror="")
    for z in (z0, z1 - 0.08):
        b.box("steel_bare", (-hw - 0.05, hw + 0.05), (-0.2, 0.2), (z, z + 0.08), swatch=True, mirror="")
    for x in (-3.2, 3.2):
        b.cyl("steel_dark", (x, 0, z1), (x, 0, arch_z(x) + 0.05), 0.05, n=4, caps=False, swatch=True, mirror="")
    cell, gap, stroke = 1.6 / 4, 0.4, 0.13
    for g, glyph in enumerate(GLYPHS):
        left = -hw + gap + g * (1.6 + gap)
        for col, row, w, h in glyph:
            u0, u1 = left + col * cell + (cell - stroke) / 2, left + (col + w - 1) * cell + (cell + stroke) / 2
            v0, v1 = z0 + 0.25 + row * cell + (cell - stroke) / 2, z0 + 0.25 + (row + h - 1) * cell + (cell + stroke) / 2
            for side in (1, -1):
                xs = (u0, u1) if side > 0 else (-u1, -u0)
                b.box("sign", xs, sorted((side * 0.15, side * 0.19)), (v0, v1), only="+y" if side > 0 else "-y", swatch=True, mirror="")


def oldtown_gate(b):
    """Sector entry: an old-town street archway. Brick piers on a stone plinth with a stone string course and
    capping; a segmental twin-rib steel truss arch, riveted, springing from the pier tops; a hung neon sign with
    invented glyphs; lanterns on brackets at the piers and a restrained warm uplight on each pier face.
    Mirrored across x = 0 (the sign is not)."""
    x0, x1, d = PIER
    b.box("stone", (x0 - 0.4, x1 + 0.4), (-d - 0.4, d + 0.4), (-0.2, 1.6), skip="-z", pri=0.7)
    b.box("brick", (x0, x1), (-d, d), (1.6, SPRING - 0.6), skip="-z+z", pri=0.75)
    b.box("stone", (x0 - 0.12, x1 + 0.12), (-d - 0.12, d + 0.12), (7.0, 7.45), pri=0.7)            # string course
    b.box("stone", (x0 - 0.2, x1 + 0.2), (-d - 0.2, d + 0.2), (SPRING - 0.6, SPRING), pri=0.7)     # capping
    for y in (-RIB_Y, RIB_Y):                                                                    # twin-rib truss arch
        for n, lod in ((10, (0, 0)), (4, (1, 1))):                                               # far LOD: 4 segments
            _chord(b, R, 0.3, y, n, pri=0.5, lod=lod, swatch=n == 4)
            _chord(b, R + RIB - 0.3, 0.3, y, n, pri=0.5, lod=lod, swatch=n == 4)
        a1 = math.asin(SPAN / R)
        for i in range(10):                                                                      # web: Warren diagonals
            a, c = a1 * i / 10, a1 * (i + 1) / 10
            lo = (R + 0.15) * math.sin(a if i % 2 else c), CZ + (R + 0.15) * math.cos(a if i % 2 else c)
            hi = (R + RIB - 0.15) * math.sin(c if i % 2 else a), CZ + (R + RIB - 0.15) * math.cos(c if i % 2 else a)
            t = (hi[0] - lo[0], 0, hi[1] - lo[1])
            b.sweep("steel_arch", [(lo[0], y, lo[1]), (hi[0], y, hi[1])], [t, t], 0.22, 0.16, swatch=True, lod=(0, 0))
    for i in range(0, 11, 2):                                                                    # cross ties between the ribs
        a = math.asin(SPAN / R) * i / 10
        x, z = (R + RIB / 2) * math.sin(a), CZ + (R + RIB / 2) * math.cos(a)
        b.box("steel_dark", (x - 0.12, x + 0.12), (-RIB_Y + 0.15, RIB_Y - 0.15), (z - 0.12, z + 0.12), swatch=True, lod=(0, 0))
    b.box("steel_arch", (SPAN - 0.4, x1), (-RIB_Y - 0.3, RIB_Y + 0.3), (SPRING, SPRING + 0.5), swatch=True)   # bearing shoe
    b.box("steel_arch", (SPAN - 0.6, SPAN), (-RIB_Y - 0.15, RIB_Y + 0.15), (SPRING + 0.5, arch_z(SPAN, R + RIB) + 0.1), pri=0.5)   # end post
    _sign(b)
    for y in (-1, 1):                                                                            # bracket lanterns on the pier faces
        face_y = y * d
        b.box("iron", (16.5, 16.7), sorted((face_y, face_y + y * 0.9)), (10.0, 10.12), swatch=True, lod=(0, 0))
        lantern(b, 16.6, face_y + y * 0.8, 10.0, 0.9, "lantern_amber", mirror="x")
        b.box("steel_dark", (16.2, 17.0), sorted((y * (d + 0.05), y * (d + 0.4))), (1.6, 1.85), swatch=True)   # uplight
        b.box("lantern_gold", (16.3, 16.9), sorted((y * (d + 0.1), y * (d + 0.35))), (1.85, 1.88), only="+z", swatch=True)


# ---------------------------------------------------------------- lantern span

POLE_X = 15.0
SAG = (16.3, 17.0)   # cable height over the centre line and at the brackets: the lowest lantern clears 14 m


def _pole(b):
    """Cast-iron lamp column: stepped foot on a concrete base, fluted-looking shaft (6 sides near), collar, a bracket
    arm with its strut, and a finial."""
    x = POLE_X
    b.cyl("concrete", (x, 0, -0.3), (x, 0, 0.15), 0.42, n=8, swatch=True)
    b.cyl("iron", (x, 0, 0.15), (x, 0, 0.7), 0.3, r1=0.24, n=8, swatch=True)
    b.cyl("iron", (x, 0, 0.7), (x, 0, 1.6), 0.2, r1=0.15, n=8, caps=False, swatch=True)
    b.cyl("iron", (x, 0, 1.6), (x, 0, SAG[1] + 0.8), 0.13, r1=0.09, n=6, caps=False, swatch=True, lod=(0, 0))
    b.cyl("iron", (x, 0, 1.6), (x, 0, SAG[1] + 0.8), 0.13, r1=0.09, n=4, caps=False, swatch=True, lod=(1, 1))
    for z in (1.6, 6.0, SAG[1] + 0.2):
        b.cyl("iron", (x, 0, z - 0.1), (x, 0, z + 0.1), 0.17, n=6, swatch=True, lod=(0, 0))
    b.cyl("iron", (x, 0, SAG[1] + 0.8), (x, 0, SAG[1] + 1.5), 0.12, r1=0.01, n=6, swatch=True)     # finial
    b.cyl("iron", (x, 0, SAG[1] + 0.3), (x - 1.0, 0, SAG[1] + 0.3), 0.05, n=4, swatch=True)          # bracket arm
    b.cyl("iron", (x, 0, SAG[1] - 0.6), (x - 0.8, 0, SAG[1] + 0.28), 0.035, n=4, caps=False, swatch=True, lod=(0, 0))


LANTERNS = ((-12.0, 0.8, "lantern_gold"), (-8.1, 1.0, "lantern_red"), (-4.0, 0.8, "lantern_amber"), (0.0, 1.3, "lantern_red"),
            (4.1, 0.8, "lantern_gold"), (8.0, 1.0, "lantern_amber"), (12.0, 0.8, "lantern_red"))   # x, size, light


def lantern_span(b):
    """A string of lanterns of three sizes and three warm lights between two cast-iron columns, the cable sagging to
    16.3 m over the centre line: instanced through the S-bends. Mirrored across x = 0 (the lanterns are not)."""
    _pole(b)
    end = POLE_X - 1.0
    sag = lambda x: SAG[0] + (SAG[1] + 0.3 - SAG[0]) * (x / end) ** 2
    xs = [0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0, end]
    for x0, x1 in zip(xs, xs[1:]):
        b.cyl("steel_bare", (x0, 0, sag(x0)), (x1, 0, sag(x1)), 0.04, n=4, caps=False, swatch=True, lod=(0, 0))
    for x0, x1 in zip(xs[::3], xs[3::3] + [end]):
        b.cyl("steel_bare", (x0, 0, sag(x0)), (x1, 0, sag(x1)), 0.05, n=3, caps=False, swatch=True, lod=(1, 1))
    for x, size, lamp in LANTERNS:
        lantern(b, x, 0, sag(abs(x)), size, lamp)


# ---------------------------------------------------------------- clock tower

DIAL_Z, DIAL_R = 30.6, 2.25
SHAFT = 3.2   # half width of the brick shaft


def _dial(b, face):
    """Clock face on the +x (face = 'x') or +y side, authored on its x >= 0, y >= 0 quarter: a stone bezel, the lit
    dial, twelve ticks and the hands at 10:10, so the mirrors close it into a whole face. No numerals."""
    out, front = 3.7, "+" + face
    half = lambda r: [(r * math.sin(a), DIAL_Z + r * math.cos(a)) for a in (math.pi * i / 8 for i in range(9))]
    b.prism("stone", half(DIAL_R + 0.3), out, out + 0.15, axis=face, skip="-" + face, pri=0.6)
    b.prism("dial", half(DIAL_R), out + 0.15, out + 0.2, axis=face, only=front, swatch=True)

    def bar(a, r0, r1, w, depth, **kw):
        """Flat dark bar on the dial from radius r0 to r1 at clock angle a (0 = twelve), front face only."""
        c, s, wx, wz = math.sin(a), math.cos(a), w * math.cos(a), -w * math.sin(a)
        quad = [(r0 * c - wx, DIAL_Z + r0 * s - wz), (r1 * c - wx, DIAL_Z + r1 * s - wz), (r1 * c + wx, DIAL_Z + r1 * s + wz), (r0 * c + wx, DIAL_Z + r0 * s + wz)]
        b.prism("iron", [(max(u, 0), z) for u, z in quad], out + 0.2, out + depth, axis=face, only=front, swatch=True, **kw)
    for k in range(7):
        bar(math.pi * k / 6, 1.75, 2.1, 0.07 if k % 3 else 0.12, 0.22, lod=(0, 0))
    bar(math.pi / 3, -0.25, 1.6, 0.08, 0.24)   # hands at 10:10: the mirror draws the other one
    b.box("iron", (out + 0.2, out + 0.26) if face == "x" else (0, 0.2), (0, 0.2) if face == "x" else (out + 0.2, out + 0.26),
          (DIAL_Z - 0.2, DIAL_Z + 0.2), only=front, swatch=True)   # boss


def _quoins(b, z0, z1, course=0.6):
    """Stone quoins up the +x+y corner of the shaft: blocks one course high, alternately long on the x face and on
    the y face, standing 6 cm proud of the brick. Near LOD; the far LOD keeps a flat stone strip."""
    for k in range(int((z1 - z0) / course)):
        lx, ly = (0.9, 0.45) if k % 2 else (0.45, 0.9)
        z = z0 + k * course
        b.box("stone", (SHAFT - lx, SHAFT + 0.06), (SHAFT - ly, SHAFT + 0.06), (z + 0.01, z + course - 0.01), skip="-x-y", pri=0.75, lod=(0, 0))
    b.box("stone", (SHAFT - 0.6, SHAFT + 0.04), (SHAFT - 0.6, SHAFT + 0.04), (z0, z1), skip="-x-y-z+z", swatch=True, lod=(1, 1))


def _window(b, z0, lit):
    """Tall slit window on the +x and +y faces with a stone sill, lintel and jambs."""
    for face in ("x", "y"):
        at = lambda u, v: (u, v) if face == "x" else (v, u)
        b.box(*(("window" if lit else "glass",) + at((SHAFT - 0.1, SHAFT - 0.06), (0, 0.4))), (z0, z0 + 2.4), only="+" + face, swatch=True, lod=(0, 0))
        for zs in ((z0 - 0.25, z0), (z0 + 2.4, z0 + 2.75)):                                         # sill, lintel
            b.box(*(("stone",) + at((SHAFT, SHAFT + 0.1), (0, 0.75))), zs, skip="-" + face, swatch=True)
        b.box(*(("stone",) + at((SHAFT, SHAFT + 0.05), (0.4, 0.75))), (z0, z0 + 2.4), skip="-" + face + "-z+z", swatch=True, lod=(0, 0))


def clock_tower(b):
    """Old-town clock tower, 50.5 m to the spire tip: brick shaft with proud stone quoins and string courses, slit
    windows in stone surrounds (one lit), a lit clock face on every side, a louvred belfry with a dim warm lamp
    inside, a standing-seam patina roof. A restrained warm uplight at each corner of the plinth. Mirrored across
    x = 0 and y = 0."""
    b.box("stone", (0, 4.6), (0, 4.6), (0, 2.4), skip="-z", pri=0.6)
    b.box("stone", (0, 4.7), (0, 4.7), (2.2, 2.4), only="+x+y+z", swatch=True)
    b.box("brick", (0, SHAFT), (0, SHAFT), (2.4, 27.0), skip="-z+z", pri=0.75)
    _quoins(b, 2.4, 27.0)
    for z in (9.8, 18.6):
        b.box("stone", (0, SHAFT + 0.2), (0, SHAFT + 0.2), (z, z + 0.4), pri=0.75)
    for z0, lit in ((5.0, False), (12.2, True), (21.0, False)):
        _window(b, z0, lit)
    b.box("stone", (0, 3.7), (0, 3.7), (27.0, 34.2), pri=0.7)
    b.box("stone", (0, 4.0), (0, 4.0), (34.2, 34.7), pri=0.7)
    _dial(b, "x")
    _dial(b, "y")
    b.box("stone", (2.2, 3.7), (2.2, 3.7), (34.7, 39.4), skip="-z+z", pri=0.7)                   # belfry piers
    b.box("window", (0, 1.4), (0, 1.4), (34.7, 39.4), skip="-z+z", swatch=True)                  # lamp-lit bell chamber
    for face in ("x", "y"):                                                                      # louvre boards
        for k in range(7):                                                                       # boards slope down and out
            z = 35.3 + 0.6 * k
            board = [(2.75, z + 0.2), (3.25, z - 0.2), (3.25, z - 0.27), (2.75, z + 0.13)]
            b.prism("iron", board, 0, 2.2, axis="y" if face == "x" else "x", swatch=True, lod=(0, 0))
        b.box("iron", (2.9, 3.1) if face == "x" else (0, 2.2), (0, 2.2) if face == "y" else (2.9, 3.1), (34.7, 39.4),
              only="+" + face, swatch=True, lod=(1, 1))
    b.box("stone", (0, 3.9), (0, 3.9), (39.4, 40.2), pri=0.7)
    b.hull("patina", [(0, 0, 40.2), (4.1, 0, 40.2), (4.1, 4.1, 40.2), (0, 4.1, 40.2), (0, 0, 47.5)], skip="-z", pri=0.7)
    b.cyl("patina", (0, 0, 47.5), (0, 0, 50.5), 0.25, r1=0.03, n=6, swatch=True, mirror="")
    b.box("steel_dark", (4.75, 5.3), (4.75, 5.3), (0, 0.3), skip="-z", swatch=True)               # uplights
    b.box("lantern_gold", (4.8, 5.25), (4.8, 5.25), (0.3, 0.32), only="+z", swatch=True)
    b.box("iron", (0, 1.0), (4.6, 4.66), (0, 2.1), only="+y", swatch=True, lod=(0, 0))           # door and its lamp
    b.box("window", (0, 0.3), (4.6, 4.75), (2.15, 2.4), skip="-y", swatch=True)
