"""What flies round the Sky Spiral: a seabird in three pieces (a body and two wings that turn about their shoulders)
and a rigid airship. Both head toward -Z in the space the game reads (+Y up, metres), origin at the body's / the
hull's centre. Like every piece of the kit they sit on its one material; their markings come from the atlas."""
import math

from mathutils import Matrix

from mesh import Band, Cell, Mesh

TAU = 2 * math.pi
WINGSPAN = 2.4
SHOULDER = (0.08, 0.02, 0.0)   # the right wing's root, the point it turns about; the left wing's is its mirror in x
AIRSHIP = 60.0
# airship hull, (radius, z): a blunt nose at -Z, the widest ring a little ahead of the middle, a long tapered tail
HULL = [(0, -30), (1.3, -29.65), (2.6, -28.7), (3.8, -26.2), (4.75, -20.5), (5.4, -11), (5.6, -2), (5.5, 6), (5.05, 14), (4.0, 21.5), (2.4, 27), (1.0, 29.4), (0, 30)]
ALONG = Matrix.Rotation(math.pi / 2, 4, "X")   # lays a lathe's y axis along +Z


def bird_body():
    """1.08 m from beak tip to tail tip: beak, head, chest, belly, rump and a tail fan seen from both sides."""
    m, skin = Mesh("bird_body"), Cell("bird", (0, 0.53, 1, 1))
    u = lambda z: (z + 0.54) / 1.08
    # (z, centre y, half width, half height)
    cuts = [(-0.43, 0.030, 0.026, 0.030), (-0.36, 0.035, 0.050, 0.055), (-0.14, 0.0, 0.10, 0.10), (0.12, -0.005, 0.095, 0.09), (0.33, 0.0, 0.04, 0.03)]

    def ring(z, cy, a, b):
        turn = [TAU * j / 6 for j in range(7)]
        return [(a * math.cos(t), cy + b * math.sin(t), z) for t in turn], [skin.uv(u(z), 0.5 + 0.5 * math.sin(t)) for t in turn]
    rings = [ring(*cut) for cut in cuts]
    tip, (first, first_uv) = (0, 0.02, -0.54), rings[0]
    for j in range(6):
        m.face([tip, first[j], first[j + 1]], [skin.uv(0, 0.5), first_uv[j], first_uv[j + 1]], "beak", away=(0, 0.03, -0.4))
        for (p, s), (q, t) in zip(rings, rings[1:]):
            m.face([p[j], p[j + 1], q[j + 1], q[j]], [s[j], s[j + 1], t[j + 1], t[j]], "body", away=(0, 0, (p[0][2] + q[0][2]) / 2))
    m.face(rings[-1][0][:6], rings[-1][1][:6], away=(0, 0, 0))
    fan = [(-0.035, 0.30), (0.035, 0.30), (0.10, 0.50), (0.05, 0.54), (-0.05, 0.54), (-0.10, 0.50)]   # (x, z)
    for lift in (0.004, -0.004):
        m.face([(x, lift, z) for x, z in fan], [skin.uv(u(z), 0.5) for _, z in fan], away=(0, -lift * 1e4, 0.4))
    return m


def bird_wing(name, side):
    """One wing in glide, flat along X from its shoulder to the tip 1.2 m out: the arm runs forward to the wrist, the
    hand sweeps back to a point. A thin solid: a ridged top over a flat underside. `side` +1 is the right wing."""
    m, skin = Mesh(name), Cell("bird", (0, 0, 1, 0.47))
    root, y0, reach = SHOULDER[0], SHOULDER[1], WINGSPAN / 2
    # (distance out, leading edge z, trailing edge z, ridge height)
    cuts = [(root, -0.13, 0.12, 0.016), (0.40, -0.165, 0.10, 0.013), (0.72, -0.20, 0.04, 0.010), (0.90, -0.15, 0.07, 0.007), (1.06, -0.06, 0.10, 0.004)]

    def cut(out, lead, trail, rise):
        s = (out - root) / (reach - root)
        return [(side * out, y0, lead), (side * out, y0 + rise, lead + 0.35 * (trail - lead)), (side * out, y0, trail)], [skin.uv(s, 1), skin.uv(s, 0.65), skin.uv(s, 0)]
    rows = [cut(*c) for c in cuts] + [([(side * reach, y0, 0.10)] * 3, [skin.uv(1, 0.5)] * 3)]
    below, above = (0, -9, 0), (0, 9, 0)
    for (p, s), (q, t) in zip(rows, rows[1:]):
        for k in (0, 1):
            m.face([p[k], p[k + 1], q[k + 1], q[k]], [s[k], s[k + 1], t[k + 1], t[k]], "top", away=below)
        m.face([p[0], p[2], q[2], q[0]], [s[0], s[2], t[2], t[0]], away=above)
    m.face(rows[0][0], rows[0][1], away=(side, y0, 0))
    return m


def hull_radius(z):
    for (r0, z0), (r1, z1) in zip(HULL, HULL[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    raise ValueError(f"no hull at z = {z}")


def airship(sides=20):
    """Rigid airship, 60 m: a painted hull whose plate joints are the atlas's, a dark nose cap, a lamp strip in a
    dark channel down each flank (the tower's strip), a windowed gondola under the bow, four tail fins set as an X
    and four engine pods on struts, each with a three-blade propeller."""
    m, panel, metal = Mesh("airship"), Band("panel"), Band("metal")
    blue, dark, grey = Cell("blue"), Cell("dark"), Cell("grey")
    m.xf = ALONG
    m.lathe(HULL[:3], sides, metal, smooth="hull", groups=4)   # the nose cap
    m.lathe(HULL[2:], sides, panel, smooth="hull", groups=4, start=math.dist(*HULL[:2]) + math.dist(*HULL[1:3]))
    m.xf = Matrix.Identity(4)

    def flank(angle, half, proud, surf, z0, z1):
        """A strip along the hull at `angle` round it (from +X toward +Y), following the taper."""
        zs = sorted({z0, z1} | {z for _, z in HULL if z0 < z < z1})
        d, t = (math.cos(angle), math.sin(angle)), (-math.sin(angle), math.cos(angle))
        at = lambda z, s: (d[0] * (hull_radius(z) + proud) + t[0] * s * half, d[1] * (hull_radius(z) + proud) + t[1] * s * half, z)
        for a, b in zip(zs, zs[1:]):
            m.face([at(a, -1), at(a, 1), at(b, 1), at(b, -1)], surf.face([a, a, b, b], [-half, half, half, -half]), away=(0, 0, (a + b) / 2))
    for angle in (-0.2, math.pi + 0.2):
        flank(angle, 0.62, 0.10, dark, -18.5, 15.5)
        flank(angle, 0.30, 0.18, blue, -18.0, 15.0)

    # gondola under the bow, (z, half width, floor y); its roof is inside the hull
    cuts, roof = [(-19.5, 0.6, -6.3), (-17.5, 1.6, -7.6), (-9.0, 1.6, -7.6), (-7.0, 1.0, -6.5)], -4.0
    for k, ((z0, w0, f0), (z1, w1, f1)) in enumerate(zip(cuts, cuts[1:])):
        mid = (0, -6, (z0 + z1) / 2)
        m.face([(-w0, f0, z0), (w0, f0, z0), (w1, f1, z1), (-w1, f1, z1)], metal.face([z0, z0, z1, z1], [-w0, w0, w1, -w1]), away=mid)
        for s in (-1, 1):
            m.face([(s * w0, f0, z0), (s * w0, roof, z0), (s * w1, roof, z1), (s * w1, f1, z1)], panel.face([z0, z0, z1, z1], [f0, roof, roof, f1]), away=mid)
            if k < 2:   # the windscreen's sides and the cabin windows
                (a, b), low = ((z0, z1), -6.95) if k else ((z0 + 0.35, z1), -6.25)
                wide = lambda z: s * (w0 + (w1 - w0) * (z - z0) / (z1 - z0) + 0.06)
                glass = Cell("windows", (0, 0.25, 1, 0.75) if k else (0.5, 0.25, 0.75, 0.75))
                m.face([(wide(a), low, a), (wide(a), -5.75, a), (wide(b), -5.75, b), (wide(b), low, b)], glass.face([a, a, b, b], [low, -5.75, -5.75, low]), away=mid)
    for z, w, f in (cuts[0], cuts[-1]):
        m.face([(-w, f, z), (w, f, z), (w, roof, z), (-w, roof, z)], panel.face([-w, w, w, -w], [f, f, roof, roof]), away=(0, -6, -13))
    m.box((-0.25, -7.72, -16.5), (0.25, -7.6, -10), blue, skip="+y")   # landing light under the cabin floor

    # tail fins as an X: (z, radius) of the root's front, the tip's front and back, the root's back (roots inside the hull)
    outline = [(14.5, 3.6), (22.0, 8.6), (28.4, 8.6), (28.0, 1.0)]
    for k in range(4):
        angle = TAU * (k + 0.5) / 4
        d, t = (math.cos(angle), math.sin(angle)), (-math.sin(angle), math.cos(angle))
        at = lambda zr, s: (d[0] * zr[1] + t[0] * s * (0.42 - 0.035 * zr[1]), d[1] * zr[1] + t[1] * s * (0.42 - 0.035 * zr[1]), zr[0])
        mid = (d[0] * 5.5, d[1] * 5.5, 23.5)
        for s in (-1, 1):
            m.face([at(p, s) for p in outline], panel.face([z for z, _ in outline], [r for _, r in outline]), away=mid)
        for p, q, surf in ((outline[0], outline[1], metal), (outline[1], outline[2], dark), (outline[2], outline[3], metal)):
            m.face([at(p, -1), at(p, 1), at(q, 1), at(q, -1)], surf.face([p[0], p[0], q[0], q[0]], [0, 0.3, 0.3, 0]), away=mid)

    for side in (-1, 1):   # engine pods below each flank
        for z in (-1.0, 15.0):
            r, angle = hull_radius(z), -0.56
            c = (side * math.cos(angle) * (r + 1.9), math.sin(angle) * (r + 1.9), z)
            m.beam((side * math.cos(angle) * (r - 0.4), math.sin(angle) * (r - 0.4), z), c, (1.3, 0.32), panel)
            m.xf = Matrix.Translation(c) @ ALONG
            m.lathe([(0, -1.6), (0.7, -1.0), (0.85, 0.2), (0.3, 1.6), (0, 1.6)], 6, metal, smooth=f"pod{side}{z}")
            m.xf = Matrix.Translation(c)
            for j in range(3):
                b = TAU * (j + 0.2 * z) / 3
                along, across = (side * math.cos(b), math.sin(b)), (-side * math.sin(b), math.cos(b))   # mirrored: the hull stays centred
                m.plate([(0.13 * across[0], 0.13 * across[1], 1.75), (-0.13 * across[0], -0.13 * across[1], 1.75), (1.3 * along[0], 1.3 * along[1], 1.75)], dark, f"prop{side}{z}{j}")
            m.xf = Matrix.Identity(4)
    m.beam((0, 5.3, 4), (0, 7.4, 4), (0.3, 0.3), grey, size1=(0.08, 0.08), sides=3)      # a mast on the back, its beacon
    m.box((-0.2, 6.6, 3.8), (0.2, 6.9, 4.2), blue)
    return m


def build_fliers():
    return [bird_body(), bird_wing("bird_wing_l", -1), bird_wing("bird_wing_r", 1), airship()]
