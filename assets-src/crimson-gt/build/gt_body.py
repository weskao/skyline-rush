"""Crimson GT body and upper (glasshouse, roof, buttresses) in three.js car space (Y up, nose toward -Z, metres).

Built from the concept panels, not from the Roadster: every curve is a list of (z, value) keys read off the
hand-traced silhouettes in gate/refs.json (side.png registered by its two hub centres at 85.1 px/m, rear.png by
its tyre contact points), or marked `inferred`. Ground is y .02 (the game's tyre contact plane), so the panel
tyre radius .337 puts the hubs at y .357. Mesh helpers: assets-src/roadster2/build/roadster_geom.py.
"""
import math

from roadster_geom import _resample, loft, smooth_rings

GROUND, TYRE_R = 0.02, 0.337
HUB_Y = GROUND + TYRE_R
ARCH_R = TYRE_R + .022
ARCH_Z = (-1.35, 1.42)               # contract wheel centres (wheelbase 2.77 m registers side.png)
Z_NOSE, Z_TAIL = -2.27, 2.04         # side.png: nose tip (perspective fit, lens 135), tail end
WELL_X = 0.90                        # wheel-well inner wall, inside the tyre inner face (.925)


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

# Plan view: half-width of the widest line. No top view: inferred from the two three-quarter panels; the rear panel
# gives 1.15-1.16 at the haunches, and the arches must cover the tyre outer face (x 1.175).
W = pchip([(-2.27, .40), (-2.14, .72), (-1.95, .96), (-1.7, 1.12), (-1.35, 1.165), (-1.0, 1.15), (-.3, 1.105),
           (.4, 1.125), (1.0, 1.16), (1.42, 1.175), (1.7, 1.15), (1.9, 1.07), (2.04, .95)])
# Underside edge (side.png): .165 between the wheels, rising under the nose and up the raked tail face.
SILL = pchip([(-2.27, .27), (-2.2, .19), (-1.9, .178), (-.9, .165), (1.0, .165), (1.8, .24), (1.95, .25),
              (2.0, .42), (2.04, .56)])
SILL_IN = pchip([(-2.27, .06), (-1.9, .03), (-.9, .02), (.9, .02), (1.9, .03), (2.04, .06)])
# Flank scallop: the door skin tucks in above the sill and deepens into the intake ahead of the rear wheel
# (side.png, both three-quarter panels). Depth inferred.
SC_IN = pchip([(-2.27, .02), (-1.9, .01), (-.95, .01), (-.5, .07), (0, .13), (.6, .20), (.9, .22), (1.04, .10),
               (1.2, .01), (2.04, .02)])
SC_Y = pchip([(-2.27, .34), (-1.35, .36), (0, .38), (.9, .42), (2.04, .40)])
# Character line (the widest point) and the shoulder above it. Heights from side.png, insets from rear.png
# (outline 1.157 at y .49, 1.129 at .63, 1.045 at .71, .905 at .757).
CHAR_Y = pchip([(-2.27, .40), (-2.0, .46), (-1.35, .55), (-.8, .60), (0, .62), (.8, .60), (1.42, .52), (2.04, .52)])
SH_Y = pchip([(-2.27, .44), (-2.0, .52), (-1.35, .70), (-.6, .705), (.4, .705), (1.42, .655), (2.04, .64)])
SH_IN = pchip([(-2.27, .03), (-1.35, .045), (0, .04), (1.42, .06), (2.04, .06)])
# Fender / haunch crown: the side.png top edge ahead of the windscreen; rear.png for the haunch.
CROWN = pchip([(-2.27, .455), (-2.08, .535), (-1.886, .64), (-1.67, .745), (-1.48, .80), (-1.25, .818), (-1.0, .80),
               (-.5, .76), (.3, .755), (1.0, .785), (1.42, .80), (1.8, .783), (2.04, .75)])
CR_IN = pchip([(-2.27, .10), (-1.9, .16), (-1.35, .19), (-.5, .19), (.4, .20), (1.42, .27), (2.04, .22)])
# Hood plateau, then the deck the upper stands on: half-width and height. Hood centre and every width inferred.
RIDGE_X = pchip([(-2.27, .10), (-1.3, .42), (-1.0, .52), (-.4, .59), (0, .60), (.5, .57), (1.0, .50), (1.4, .45),
                 (1.8, .44), (2.04, .42)])
DECK_Y = pchip([(-2.27, .455), (-2.0, .555), (-1.7, .66), (-1.35, .735), (-1.0, .80), (1.42, .80), (1.8, .785),
                (2.04, .765)])
# Roof line: the side.png top edge from the windscreen base to the tail.
TOP = pchip([(-1.02, .835), (-.667, .963), (-.392, 1.057), (-.077, 1.084), (.235, 1.079), (.548, 1.043),
             (.783, .973), (1.017, .93), (1.407, .866), (1.721, .823), (2.014, .775)])
ROOF_X = pchip([(-1.02, .46), (-.4, .41), (0, .38), (.5, .37), (1.0, .37), (1.4, .39), (2.014, .40)])  # rear.png, else inferred
Z_UPPER = (-1.02, 2.014)


def side_profile(z):
    """Un-arched side of the section, bottom to top: sill edge, scallop, character line, shoulder, crown."""
    w = W(z)
    return [(w - SILL_IN(z), SILL(z)), (w - SC_IN(z), max(SC_Y(z), SILL(z) + .03)), (w, max(CHAR_Y(z), SILL(z) + .06)),
            (w - SH_IN(z), max(SH_Y(z), SILL(z) + .09)), (w - CR_IN(z), max(CROWN(z), SILL(z) + .12))]


def arch_y(z):
    """Height of the wheel-arch opening at z, or None outside both arches."""
    for zc in ARCH_Z:
        d = abs(z - zc)
        if d <= ARCH_R + 1e-9:
            return HUB_Y + math.sqrt(max(ARCH_R * ARCH_R - d * d, 0.0))
    return None


def clip_profile(pts, y):
    """The profile cut off below height y: same point count, the cut points spread evenly up from the arch lip."""
    if y is None or y <= pts[0][1]:
        return pts
    keep = next(i for i, p in enumerate(pts) if p[1] > y + .012)   # first point clear of the lip
    (x0, y0), (x1, y1) = pts[keep - 1], pts[keep]
    lip = (x0 + (x1 - x0) * (y - y0) / (y1 - y0), y)
    return [(lip[0] + (pts[keep][0] - lip[0]) * i / keep, lip[1] + (pts[keep][1] - lip[1]) * i / keep)
            for i in range(keep)] + pts[keep:]


def half_ring(z):
    """Right half of the cross-section at z, bottom centre to top centre: 12 (x, y) points."""
    sill, lip = SILL(z), arch_y(z)
    side = clip_profile(side_profile(z), lip)
    floor = sill - .02   # a 20 mm step keeps the well corner distinct outside the arches (no zero-area faces)
    wi = min(WELL_X, W(z) - .14)
    ridge, deck, crown = min(RIDGE_X(z), side[-1][0] - .12), DECK_Y(z), side[-1]
    valley = (ridge + .45 * (crown[0] - ridge), min(deck, crown[1]) - .03)
    rise = .022 * min(max((-.9 - z) / .4, 0.0), 1.0)   # raised hood centre, creases meeting at the nose (front three-quarter panel)
    return [(0, floor), (wi, floor), (wi, side[0][1])] + side + [valley, (ridge, deck), (.5 * ridge, deck + rise), (0, deck + rise + .004)]


def ring(z):
    h = half_ring(z)
    return [(x, y, z) for x, y in h] + [(-x, y, z) for x, y in h[-2:0:-1]]


RING_SUB = 3


def stations():
    """z samples: an even grid plus the arch circles (dense at their ends, where the lip is steepest)."""
    zs = [Z_NOSE + i * (Z_TAIL - Z_NOSE) / 64 for i in range(65)]
    arch = []
    for zc in ARCH_Z:
        arch += [zc - ARCH_R + ARCH_R * (1 - math.cos(math.pi * i / 12)) for i in range(13)]
    zs = [z for z in zs if all(abs(z - a) > .025 for a in arch)] + arch
    return sorted(zs)


def body_verts():
    return loft([_resample(ring(z), RING_SUB, True) for z in stations()], close=True)


def side_x(z, y):
    """Half-width of the smoothed body side at height y (between the sill edge and the crown)."""
    pts = _resample(ring(z), RING_SUB, True)[3 * RING_SUB:7 * RING_SUB + 1]
    for (x0, y0, _), (x1, y1, _) in zip(pts, pts[1:]):
        if y0 <= y <= y1 and y1 > y0:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return pts[0][0] if y < pts[0][1] else pts[-1][0]


def hood_y(z, x):
    """Height of the smoothed body top at half-width x (between the crown and the centreline)."""
    pts = _resample(ring(z), RING_SUB, True)[7 * RING_SUB:11 * RING_SUB + 1]   # crown, valley, ridge, centre: x falling
    for (x0, y0, _), (x1, y1, _) in zip(pts, pts[1:]):
        if x1 <= x <= x0 and x0 > x1:
            return y0 + (y1 - y0) * (x0 - x) / (x0 - x1)
    return pts[-1][1]


def patch(zs, y_lo, y_hi, ny=4, proud=.008, depth=.03, side=1):
    """Closed thin panel lying on the body side: at each z it spans y_lo(z)..y_hi(z), `proud` outside the surface."""
    rings = []
    for z in zs:
        ys = [y_lo(z) + (y_hi(z) - y_lo(z)) * j / ny for j in range(ny + 1)]
        outer = [(side * (side_x(z, y) + proud), y, z) for y in ys]
        inner = [(side * (side_x(z, y) - depth), y, z) for y in reversed(ys)]
        rings.append(outer + inner)
    return loft(rings, close=True)


# ---- Upper: one lofted shell from the windscreen base to the tail, split into glass and paint faces. ----
UP_SUB, UP_STATION_SUB, RAIL = 3, 3, .07


def _belt(z):
    """How far up the cabin side the glass starts (0 base .. 1 roof rail): the beltline climbs to the rail at the
    rear, which gives the side glass its teardrop point (side.png)."""
    return .10 if z <= -.2 else min(.93, .10 + .83 * (z + .2) / .95)


def upper_rings():
    zs = [Z_UPPER[0] + (Z_UPPER[1] - Z_UPPER[0]) * i / 22 for i in range(23)]
    rings = []
    for z in zs:
        b, by, r, top = RIDGE_X(z) + .04, DECK_Y(z) - .06, ROOF_X(z), TOP(z)   # base sunk 60 mm into the deck
        ry = max(top - .05, by + .05)

        def side(u):   # bowed cabin side from the base (u 0) to the roof rail (u 1)
            return (b + (r - b) * u + .14 * u * (1 - u), by + (ry - by) * u * (1.2 - .2 * u))
        u = _belt(z)
        half = [side(0), side(u), side((u + 1) / 2), side(1), (r - RAIL, min(ry + .03, top))]
        rings.append([(-x, y, z) for x, y in half] + [(0, top, z)] + [(x, y, z) for x, y in reversed(half)])
    return rings


def _is_glass(span, z):
    """span across one half: 0 door top / buttress, 1-2 side glass, 3 roof rail, 4 centre; z: quad centre."""
    if span in (1, 2):
        return -.80 < z < .72
    if span == 4:   # windscreen, then the body-colour roof, then the dark engine cover between the buttresses
        return z < -.30 or .85 < z < 1.55
    return False


def upper_parts():
    """(glass, paint): two (verts, faces) meshes cut from the same smoothed shell."""
    rings = smooth_rings(upper_rings(), UP_SUB, UP_STATION_SUB, ring_closed=False)
    m = len(rings[0])                     # 10 spans x UP_SUB + 1
    verts = [p for r in rings for p in r]
    glass, paint = [], []
    for s in range(len(rings) - 1):
        z = (rings[s][0][2] + rings[s + 1][0][2]) / 2
        for j in range(m - 1):
            k = j if j < (m - 1) / 2 else m - 2 - j      # mirror the right half onto the left
            (glass if _is_glass(k // UP_SUB, z) else paint).append((s * m + j, s * m + j + 1, (s + 1) * m + j + 1, (s + 1) * m + j))
    return _compact(verts, glass), _compact(verts, paint)


def _compact(verts, faces):
    used = sorted({i for f in faces for i in f})
    index = {old: new for new, old in enumerate(used)}
    return [verts[i] for i in used], [tuple(index[i] for i in f) for f in faces]
