"""Crimson GT body and canopy in three.js car space (Y up, nose toward -Z, metres).

Every curve below is a list of (z, value) keys read off ref/side.png after registering it by the two
hub centres (255.2 px/m at 3x, hub line y .46), or marked `inferred` / `contract` (asset-brief.md).
Mesh helpers and the three -> Blender conversion are the Roadster's (assets-src/roadster2/build/roadster_geom.py).
"""
import math

from roadster_geom import _resample, loft

HUB_Y, ARCH_R = 0.46, 0.468          # contract hub height; arch = tyre radius .44 + 28 mm
ARCH_Z = (-1.35, 1.42)               # contract wheel centres
Z_NOSE, Z_TAIL = -2.30, 2.44         # nose: side.png tip; tail: contract (rear ports z 2.39, wing bay to 2.47)
WELL_X = 0.90                        # wheel-well inner wall, just inside the tyre inner face (.915)


def pchip(keys):
    """Monotone cubic (Fritsch-Carlson) through (z, v) keys: smooth, never overshoots a key."""
    xs, ys = [k[0] for k in keys], [k[1] for k in keys]
    h = [b - a for a, b in zip(xs, xs[1:])]
    d = [(b - a) / w for a, b, w in zip(ys, ys[1:], h)]
    m = [d[0]] + [0.0 if a * b <= 0 else 3 * (ha + hb) / ((2 * hb + ha) / a + (hb + 2 * ha) / b)
                  for a, b, ha, hb in zip(d, d[1:], h, h[1:])] + [d[-1]]

    def f(x):
        x = min(max(x, xs[0]), xs[-1])
        i = max(j for j in range(len(h)) if xs[j] <= x)
        t = (x - xs[i]) / h[i]
        t2, t3 = t * t, t * t * t
        return ((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i]
                + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1])
    return f


def _check_pchip():
    f = pchip([(0, 0), (1, 2), (2, 2), (4, 5)])
    assert all(abs(f(x) - y) < 1e-9 for x, y in ((0, 0), (1, 2), (2, 2), (4, 5))), "misses a key"
    assert all(2 - 1e-9 <= f(1 + i / 20) <= 2 + 1e-9 for i in range(21)), "overshoots a flat span"


_check_pchip()

# Half-width at the shoulder line. No top view exists: inferred from the front and rear three-quarter panels,
# held >= 1.2 at the arches so the body covers the contract tyre outer face (x 1.185).
W = pchip([(-2.30, .74), (-2.19, .92), (-2.0, 1.08), (-1.7, 1.18), (-1.35, 1.205), (-1.0, 1.195), (-.4, 1.16),
           (.3, 1.165), (.9, 1.195), (1.42, 1.205), (1.9, 1.19), (2.25, 1.13), (2.44, 1.06)])
# Side bottom edge (sill): side.png y 408 px -> .26 between the wheels.
SILL = pchip([(-2.30, .35), (-2.12, .30), (-1.9, .27), (-.8, .25), (.9, .25), (1.9, .30), (2.2, .36), (2.44, .42)])
# Shoulder (widest) line: rises toward the tail (side.png character line).
SHOULDER = pchip([(-2.30, .52), (-1.9, .62), (-1.35, .70), (-.6, .70), (.4, .74), (1.42, .80), (2.0, .84), (2.44, .84)])
# Fender / haunch crown. Front arch +.065 and tail +.12 over side.png: contract tyre radius and wing bay.
CROWN = pchip([(-2.30, .575), (-2.1, .675), (-1.8, .835), (-1.35, .962), (-.95, .955), (-.4, .955), (.4, .985),
               (1.0, 1.01), (1.42, 1.03), (1.9, 1.022), (2.44, .99)])
CROWN_INSET = pchip([(-2.30, .05), (-1.35, .14), (0, .16), (1.42, .15), (2.44, .09)])
# Centreline: hood from side.png, deck under the canopy inferred (hidden), tail deck 1.0 under the stowed wing (contract).
CENTRE = pchip([(-2.30, .582), (-2.0, .665), (-1.6, .765), (-1.2, .84), (-1.0, .885), (0, .94), (1.0, .97),
                (1.6, .99), (2.05, 1.0), (2.44, .985)])
# Lower-side tuck between the wheels (the scalloped flank); zero across both arches so the lip covers the tyre.
TUCK = pchip([(-2.30, .02), (-1.9, 0), (-.82, 0), (-.6, .08), (-.2, .12), (.5, .12), (.75, .06), (.9, 0),
              (1.95, 0), (2.44, .03)])


def arch_bottom(z):
    """Lower edge of the body side: the sill, or the wheel-arch circle above the hub line."""
    bot = SILL(z)
    for zc in ARCH_Z:
        d = abs(z - zc)
        if d <= ARCH_R + 1e-9:
            bot = max(bot, HUB_Y + math.sqrt(max(ARCH_R * ARCH_R - d * d, 0.0)))
    return bot


def half_ring(z):
    """Right half of the cross-section at z, bottom centre to top centre: 9 (x, y) points."""
    w, sill, bot = W(z), SILL(z), arch_bottom(z)
    floor = sill - .02  # a 20 mm step keeps the well corner points distinct outside the arches (no zero-area faces)
    wi = min(WELL_X, w - .12)
    y_low = max(sill + .45 * (SHOULDER(z) - sill), bot + .005)
    y_sh = max(SHOULDER(z), bot + .012)
    y_cr = max(CROWN(z), bot + .03)
    tuck = TUCK(z)
    return [(0, floor), (wi, floor), (wi, bot), (w - tuck - (.03 if bot == sill else 0), bot), (w - tuck, y_low),
            (w, y_sh), (w - CROWN_INSET(z), y_cr), (.55 * w, CENTRE(z) - .012), (0, CENTRE(z))]


def ring(z):
    h = half_ring(z)
    return [(x, y, z) for x, y in h] + [(-x, y, z) for x, y in h[-2:0:-1]]


RING_SUB = 3


def stations():
    """z samples: an even grid plus the arch circles (dense at their ends, where the lip is steepest)."""
    zs = [Z_NOSE + i * (Z_TAIL - Z_NOSE) / 64 for i in range(65)]
    arch = []
    for zc in ARCH_Z:
        arch += [zc + ARCH_R * math.cos(math.pi * i / 18) for i in range(19)]
        arch += [zc - ARCH_R - .012, zc + ARCH_R + .012]
    zs = [z for z in zs if all(abs(z - a) > .025 for a in arch)] + arch
    return sorted(zs)


def body_verts():
    return loft([_resample(ring(z), RING_SUB, True) for z in stations()], close=True)


def side_x(z, y):
    """Half-width of the smoothed body side at height y (between the sill edge and the crown)."""
    pts = _resample(ring(z), RING_SUB, True)[3 * RING_SUB:6 * RING_SUB + 1]
    for (x0, y0, _), (x1, y1, _) in zip(pts, pts[1:]):
        if y0 <= y <= y1 and y1 > y0:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return pts[0][0] if y < pts[0][1] else pts[-1][0]


def patch(zs, y_lo, y_hi, ny=4, proud=.008, depth=.03, side=1):
    """Closed thin panel lying on the body side: at each z it spans y_lo(z)..y_hi(z), `proud` outside the surface."""
    rings = []
    for z in zs:
        ys = [y_lo(z) + (y_hi(z) - y_lo(z)) * j / ny for j in range(ny + 1)]
        outer = [(side * (side_x(z, y) + proud), y, z) for y in ys]
        inner = [(side * (side_x(z, y) - depth), y, z) for y in reversed(ys)]
        rings.append(outer + inner)
    return loft(rings, close=True)


# Canopy stations: [z, base half-width, base y, roof half-width, roof y]. Roof line from side.png (peak 1.185 at
# z -.09); base sunk 20 mm under the body deck; widths inferred (front three-quarter panel).
CANOPY_STATIONS = [
    [-1.06, .52, .86, .44, .87], [-.62, .74, .93, .52, 1.09], [-.09, .78, .96, .54, 1.185],
    [.40, .78, .975, .52, 1.165], [.90, .70, .985, .44, 1.10], [1.45, .52, .985, .32, 1.03], [1.98, .34, .985, .24, 1.005],
]


def canopy_rings():
    return [[(-b, by, z), (-(b + r) / 2 - .03, (by + ry) / 2 + .02, z), (-r, ry, z), (r, ry, z),
             ((b + r) / 2 + .03, (by + ry) / 2 + .02, z), (b, by, z)] for z, b, by, r, ry in CANOPY_STATIONS]


# Rear buttresses (rear three-quarter panel): body-colour fins from the B-pillar down to the tail deck, either side of
# the rear glass. [z, inner x, outer x, top y]; widths inferred.
BUTTRESS_STATIONS = [[.50, .50, .60, 1.12], [.75, .47, .60, 1.125], [1.1, .42, .58, 1.085], [1.5, .36, .54, 1.04],
                     [1.9, .31, .50, 1.012], [2.06, .30, .48, 1.0]]


def buttress_rings(side):
    return [[(side * (xi - .02), top - .10, z), (side * xi, top, z), (side * xo, top - .012, z), (side * (xo + .16), .97, z)]
            for z, xi, xo, top in BUTTRESS_STATIONS]
