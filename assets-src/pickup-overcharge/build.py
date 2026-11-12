"""Builds assets-src/pickup-overcharge/pickup-overcharge.blend and textures/ from nothing (no downloads, no random
seed, no personal paths): the violet Overcharge Core, one mesh `pickup_overcharge` with one baked material
`pickup_overcharge_pbr`. A prism-cut reactor crystal held by two armoured caps, inside two gyro rings.

Run from the repo root:
  "$BLENDER_BIN" --background --factory-startup --python assets-src/pickup-overcharge/build.py

Shapes are three.js units (X right, Y up, +Z front) measured off ref/front.png at 86 px per unit (244 px tall =
2.85). The reference rings are as wide as the prop is tall; here they stop at the 2.4 footprint of the tier.
Materials, bevels, UVs, the bake and the save live in scripts/assets/pickup_kit.py, shared with the other tiers.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts", "assets"))

from pickup_kit import Kit, rect  # noqa: E402

kit = Kit("pickup-overcharge")


def polar(r, y, deg):
    """Point at `deg` about Y (0 = front +Z, 90 = +X), like the yaw of kit.plate."""
    a = math.radians(deg)
    return (r * math.sin(a), y, r * math.cos(a))


def cross(u, v):
    return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])


def facets(name, mat, polygons, centre=(0.0, 0.0, 0.0)):
    """polygons: [[(point, glow), ...], ...] around `centre`, each with its own vertices so every edge stays hard.
    glow 0..1 is how lit the kit's glass is at that corner: its glow is brightest at UV (0.5, 0.5) and dark at v = 1.
    Wound outwards here, because parts with UVs skip the kit's recalc."""
    verts, uvs, faces = [], [], []
    for polygon in polygons:
        a, b, c = (p for p, _ in polygon[:3])
        normal = cross([q - p for p, q in zip(a, b)], [q - p for p, q in zip(a, c)])
        if sum(n * (p - o) for n, p, o in zip(normal, a, centre)) < 0:
            polygon = polygon[::-1]
        faces.append(tuple(range(len(verts), len(verts) + len(polygon))))
        verts += [p for p, _ in polygon]
        uvs += [(0.5, 1.0 - 0.5 * glow) for _, glow in polygon]
    kit._part(name, verts, faces, mat, 0.0, True, uvs)


# ---- Crystal: a square antiprism cut, corner-on to the four cardinal views as in the reference. Each large face
# standing on the girdle is raised into four facets, and neighbouring facets get different glow levels: the
# prism reads from the light inside it, since the shipped material is opaque.
GIRDLE = [polar(0.84, 0.0, 90 * k) for k in range(4)]
glass = []
for tips in ([polar(0.56, 0.72, 45 + 90 * k) for k in range(4)], [polar(0.44, -0.80, 45 + 90 * k) for k in range(4)]):
    for k in range(4):
        here, nxt, tip = GIRDLE[k], GIRDLE[(k + 1) % 4], tips[k]
        # Facet hanging from the cap edge down to the girdle corner (the fang lies on it): hot at the corner.
        glass.append([(tips[k - 1], 0.25), (tip, 0.25), (here, 1.0)])
        normal = cross([q - p for p, q in zip(here, nxt)], [q - p for p, q in zip(here, tip)])
        out = 0.05 / math.sqrt(sum(n * n for n in normal)) * (1 if sum(n * p for n, p in zip(normal, here)) > 0 else -1)
        peak = tuple((a + b + c) / 3 + n * out for a, b, c, n in zip(here, nxt, tip, normal))
        middle = tuple((a + b) / 2 for a, b in zip(here, nxt))
        glass.append([(here, 0.95), (middle, 0.3), (peak, 0.45)])
        glass.append([(middle, 0.3), (nxt, 0.95), (peak, 0.45)])
        glass.append([(nxt, 0.7), (tip, 0.9), (peak, 0.6)])    # light facet
        glass.append([(tip, 0.2), (here, 0.4), (peak, 0.3)])   # dark facet: below 0.2 the glass only mirrors the sky
# Four hues dealt round the facets: every facet touches other colours, as in the rainbow reference.
for i, hue in enumerate(("glass", "prism_cyan", "prism_pink", "prism_gold")):
    facets("crystal", hue, glass[i::4])

# White spark on each girdle corner: the flare of the reference, and the pointed side of its silhouette.
for k in range(4):
    c, out, side = polar(0.86, 0.0, 90 * k), polar(0.06, 0.0, 90 * k), polar(0.065, 0.0, 90 * k + 90)
    ends = [tuple(p + s * q for p, q in zip(c, axis)) for axis in (out, side) for s in (1, -1)]
    belt = [ends[0], ends[2], ends[1], ends[3]]
    facets("spark", "emblem", [[(pole, 0.0), (belt[i], 0.0), (belt[(i + 1) % 4], 0.0)]
                               for pole in ((c[0], 0.17, c[2]), (c[0], -0.17, c[2])) for i in range(4)], c)

# Two loose shards, as around the reference: where the rings leave room (outer ring low at 315, high at 135).
for deg, y in ((315, 0.64), (135, -0.64)):
    c = polar(0.98, y, deg)
    belt = [tuple(p + q for p, q in zip(c, polar(0.05, 0.0, deg + 45 + 90 * i))) for i in range(4)]
    facets("shard", "glass", [[(pole, 0.9), (belt[i], 0.35 + 0.3 * (i % 2)), (belt[(i + 1) % 4], 0.65 - 0.3 * (i % 2))]
                              for pole in ((c[0], y + 0.13, c[2]), (c[0], y - 0.13, c[2])) for i in range(4)], c)

BROW = [(-0.33, 0.06), (-0.25, 0.12), (0.25, 0.12), (0.33, 0.06), (0.33, -0.03), (0.13, -0.13), (-0.13, -0.13), (-0.33, -0.03)]
NOTCH = [(-0.10, 0.03), (0.10, 0.03), (0.065, -0.03), (-0.065, -0.03)]
CHEVRON = [(-0.04, 0.015), (0.04, 0.015), (0.0, -0.017)]


def on_face(yaw, points):
    """[(u right, y, distance from the Y axis), ...] on the side looking along `yaw` -> three.js points."""
    a = math.radians(yaw)
    return [(u * math.cos(a) + d * math.sin(a), y, -u * math.sin(a) + d * math.cos(a)) for u, y, d in points]


def fang(yaw, y, w, base, ridge, tip):
    """Armour claw over a crystal facet: a ridge from (y, ridge) inside the collar down to the point `tip`
    (y, distance), 2w wide at `base`. Two flat triangles (a flat normal map) whose lower edges hover 0.01 above the
    facet: where two light-pass parts cross at a shallow angle, the bake leaves a stair-stepped seam on both."""
    left, right, top, end = on_face(yaw, [(-w, y, base), (w, y, base), (0.0, y, ridge), (0.0, *tip)])
    centre = tuple(sum(axis) / 4 for axis in zip(left, right, top, end))
    facets("fang", "armour", [[(p, 0.0) for p in face] for face in ((left, top, end), (top, right, end))], centre)


def brow(yaw, dist, y, s, scale):
    """Bolted brow plate with the amber chevron, as on the cell; s = 1 points it down, -1 up."""
    def shape(outline):
        return [(u * scale, s * v * scale) for u, v in outline]

    kit.plate("brow", shape(BROW), "armour", yaw, dist, 0.13, y=y, bevel=0.025, low=True)
    for x in (-0.26 * scale, 0.26 * scale):
        kit.bolt(yaw, dist, y + s * 0.02 * scale, x)
    kit.plate("notch", shape(NOTCH), "inset", yaw, dist + 0.004, 0.01, y=y + s * 0.06 * scale, bevel=0.0)
    kit.plate("amber", shape(CHEVRON), "amber", yaw, dist + 0.007, 0.008, y=y + s * 0.06 * scale, bevel=0.0)


# ---- Top cap: collar over the crown edge, lit neck, spire.
kit.loft("collar", [(0.64, rect(0.94, 0.94, 0.09)), (0.72, rect(1.12, 1.12, 0.17)),
                    (0.86, rect(1.14, 1.14, 0.18)), (0.98, rect(0.78, 0.78, 0.14))], "gold", bevel=0.03, caps=(True, False))
kit.loft("neck", [(0.96, rect(0.62, 0.62, 0.10)), (1.05, rect(0.62, 0.62, 0.10))], "inset", bevel=0.025, caps=(False, False))
kit.loft("spire", [(1.03, rect(0.72, 0.72, 0.13)), (1.09, rect(0.64, 0.64, 0.11)), (1.45, rect(0.05, 0.05, 0.01))],
         "gold", bevel=0.02, caps=(True, True))

# ---- Bottom cap: collar, lit base, foot and the glowing nozzle.
kit.loft("collar", [(-0.72, rect(0.78, 0.78, 0.08)), (-0.80, rect(0.94, 0.94, 0.15)),
                    (-0.94, rect(0.96, 0.96, 0.16)), (-1.10, rect(0.60, 0.60, 0.11))], "gold", bevel=0.03, caps=(True, False))
kit.loft("base", [(-1.08, rect(0.50, 0.50, 0.08)), (-1.22, rect(0.50, 0.50, 0.08))], "inset", bevel=0.025, caps=(False, False))
kit.loft("foot", [(-1.20, rect(0.40, 0.40, 0.07)), (-1.31, rect(0.30, 0.30, 0.06))], "gold", bevel=0.02, caps=(False, True))
kit.loft("nozzle", [(-1.29, rect(0.20, 0.20, 0.04)), (-1.40, rect(0.14, 0.14, 0.03))], "strip", bevel=0.0, caps=(False, True))

for yaw in (0, 90, 180, 270):
    fang(yaw, 0.70, 0.19, 0.42, 0.53, (0.30, 0.667))
    fang(yaw, -0.78, 0.16, 0.336, 0.436, (-0.44, 0.561))
    # Light slit up each face of the spire (the faces lean back 39 degrees, so a plate cannot follow them).
    facets("slit", "strip", [[(p, 1.0) for p in on_face(yaw, [(-0.04, 1.15, 0.288), (0.04, 1.15, 0.288),
                                                              (0.012, 1.37, 0.108), (-0.012, 1.37, 0.108)])]])
    brow(yaw, 0.60, 0.80, 1, 0.94)
    brow(yaw, 0.51, -0.87, -1, 0.78)
    kit.plate("neck_strip", rect(0.34, 0.04), "strip", yaw, 0.322, 0.03, y=1.005, bevel=0.0, low=True)
    kit.plate("base_strip", rect(0.26, 0.05), "strip", yaw, 0.262, 0.03, y=-1.15, bevel=0.0, low=True)


# ---- Gyro rings. The kit has no helper for a tilted band, so the vertices are made here and go through kit._part.
def ring(name, r0, r1, h, mat, lean, a0=0.0, a1=360.0, segs=48, sides=(0, 1, 2, 3), bevel=0.0):
    """Band of radius r0..r1 and height h about an axis leaning `tilt` degrees from Y towards `yaw` (so that side
    dips), from angle a0 to a1. sides: 0 outer face, 1 top, 2 inner, 3 bottom. An arc with all four gets end caps."""
    tilt, yaw = (math.radians(v) for v in lean)
    dx, dz = math.sin(yaw), math.cos(yaw)
    verts, uvs = [], []
    for j in range(segs + 1):
        a = math.radians(a0 + (a1 - a0) * j / segs)
        for r, y, v in ((r1, -h / 2, 0.0), (r1, h / 2, 1.0), (r0, h / 2, 1.0), (r0, -h / 2, 0.0)):
            x, z = r * math.sin(a), r * math.cos(a)
            along, across = x * dx + z * dz, x * dz - z * dx
            lift = along * math.cos(tilt) + y * math.sin(tilt)
            verts.append((lift * dx + across * dz, y * math.cos(tilt) - along * math.sin(tilt), lift * dz - across * dx))
            uvs.append((j / segs, v))
    faces = [(j * 4 + k, j * 4 + 4 + k, j * 4 + 4 + (k + 1) % 4, j * 4 + (k + 1) % 4) for j in range(segs) for k in sides]
    if a1 - a0 < 360 and len(sides) == 4:
        faces += [(0, 1, 2, 3), tuple(segs * 4 + k for k in (3, 2, 1, 0))]
        # Self-check of the winding above (parts with UVs skip the kit's recalc): a closed arc has positive volume.
        volume = 0.0
        for face in faces:
            p = [verts[i] for i in face]
            volume += sum(sum(n * q for n, q in zip(cross(b, c), p[0])) for b, c in ((p[1], p[2]), (p[2], p[3])))
        assert volume > 0, f"{name}: faces wound inwards"
    kit._part(name, verts, faces, mat, bevel, True, uvs)


def gyro(r0, r1, h, lean, segs):
    """Armour band with a light strip on its outer and inner face, white tick marks and two pivot clamps on its axis."""
    # A token bevel: the bake source is then smooth like the shipped band, so its normal map stays flat (and small).
    ring("gyro", r0, r1, h, "armour", lean, segs=segs, bevel=0.0005)
    ring("gyro_light", r0 - 0.012, r1 + 0.012, h * 0.5, "strip", lean, segs=segs, sides=(0, 2))
    for pivot in (lean[1] + 90, lean[1] + 270):
        ring("clamp", r0 - 0.03, r1 + 0.03, h + 0.07, "armour", lean, pivot - 7, pivot + 7, segs=1)
        for group in (pivot + 62, pivot + 118):
            for i in range(4):
                tick = group + (i - 1.5) * 4.4
                ring("tick", r0, r1 + 0.024, h * 0.5, "emblem", lean, tick - 1.1, tick + 1.1, segs=1, sides=(0,))


gyro(1.095, 1.165, 0.13, (8, -45), 48)   # outer ring: front and left dip, as in ref/front.png
gyro(0.97, 1.03, 0.11, (27, 45), 40)      # inner ring on the crossing axis

kit.finish(HERE)
