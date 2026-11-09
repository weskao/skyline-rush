"""Modelled Coast props (absent from Poly Haven): coconut palms and a W-beam guard rail segment.

Blender axes: z up, length along x, road side toward -y (three.js +z after the glTF Y-up export).
All variation is a deterministic hash of the element index: same file on every run.
"""
import math

import bpy
from mathutils import Vector

UP = Vector((0, 0, 1))


def hash01(i):
    return (math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1.0


class MeshBuilder:
    """Faces with per-corner UVs and colours, one material index per face."""

    def __init__(self):
        self.verts, self.faces = [], []

    def vert(self, co):
        self.verts.append(tuple(co))
        return len(self.verts) - 1

    def face(self, idx, uvs, mat=0, col=(1, 1, 1, 1)):
        self.faces.append((tuple(idx), tuple(uvs), mat, col))

    def build(self, name, materials, smooth=True, colors=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.verts, [], [f[0] for f in self.faces])
        uv = me.uv_layers.new(name="UVMap")
        col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER") if colors else None
        for poly, (_, uvs, mat, c) in zip(me.polygons, self.faces):
            poly.material_index = mat
            poly.use_smooth = smooth
            for li, u in zip(poly.loop_indices, uvs):
                uv.data[li].uv = u
                if col:
                    col.data[li].color = c
        for m in materials:
            me.materials.append(m)
        me.validate()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def _frame(t):
    side = t.cross(UP)
    side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
    return side, side.cross(t).normalized()


def _ring(mb, centre, t, radius, sides):
    a, b = _frame(t)
    return [mb.vert(centre + (a * math.cos(2 * math.pi * j / sides) + b * math.sin(2 * math.pi * j / sides)) * radius)
            for j in range(sides)]


def _trunk(mb, height, lean, base_r, top_r, rings=22, sides=10, tile=1.2):
    """Curved, tapering trunk with a flared foot; bark tiles once around and every `tile` m up."""
    path = [Vector((lean.x * s * s, lean.y * s * s, height * s)) for s in (i / rings for i in range(rings + 1))]
    loops, v_acc = [], [0.0]
    for i, p in enumerate(path):
        s = i / rings
        t = (path[min(i + 1, rings)] - path[max(i - 1, 0)]).normalized()
        r = top_r + (base_r - top_r) * (1 - s) ** 2 + 0.16 * math.exp(-s * 30)
        loops.append(_ring(mb, p, t, r, sides))
        if i:
            v_acc.append(v_acc[-1] + (p - path[i - 1]).length / tile)
    for i in range(rings):
        for j in range(sides):
            k = (j + 1) % sides
            mb.face((loops[i][j], loops[i][k], loops[i + 1][k], loops[i + 1][j]),
                    ((j / sides, v_acc[i]), ((j + 1) / sides, v_acc[i]), ((j + 1) / sides, v_acc[i + 1]), (j / sides, v_acc[i + 1])), 0)
    top = mb.vert(path[-1] + (path[-1] - path[-2]).normalized() * 0.35)
    for j in range(sides):
        k = (j + 1) % sides
        mb.face((loops[-1][j], loops[-1][k], top), ((j / sides, v_acc[-1]), ((j + 1) / sides, v_acc[-1]), (0.5, v_acc[-1] + 0.3)), 0)
    return path[-1], (path[-1] - path[-2]).normalized()


def _leaflet(mb, base, direction, across, length, width, droop, col):
    """Tapered three-segment leaflet strip (5 triangles) drooping under its own weight."""
    pts = [base + direction * length * k / 3 + Vector((0, 0, -droop * length * (k / 3) ** 2)) for k in range(4)]
    widths = (0.35, 1.0, 0.75)
    rows = [(mb.vert(p - across * width * w / 2), mb.vert(p + across * width * w / 2)) for p, w in zip(pts[:3], widths)]
    tip = mb.vert(pts[3])
    for k in range(2):
        (a, b), (c, d) = rows[k], rows[k + 1]
        mb.face((a, b, d, c), ((0, k / 3), (1, k / 3), (1, (k + 1) / 3), (0, (k + 1) / 3)), 1, col)
    a, b = rows[2]
    mb.face((a, b, tip), ((0, 2 / 3), (1, 2 / 3), (0.5, 1)), 1, col)


def _frond(mb, base, azimuth, elev, length, droop, pairs, colour, seed):
    d0 = Vector((math.cos(azimuth) * math.cos(elev), math.sin(azimuth) * math.cos(elev), math.sin(elev)))
    curve = lambda t: base + d0 * length * t + Vector((0, 0, -droop * length * t * t))
    tangent = lambda t: (d0 * length + Vector((0, 0, -2 * droop * length * t))).normalized()
    # Rachis: a thin triangular tube.
    segs, rings = 6, []
    for i in range(segs + 1):
        t = i / segs
        rings.append(_ring(mb, curve(t), tangent(t), 0.05 * (1 - 0.8 * t), 3))
    rachis_col = (colour[0] * 1.3, colour[1] * 1.15, colour[2] * 0.9, 1)
    for i in range(segs):
        for j in range(3):
            k = (j + 1) % 3
            mb.face((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]), ((0, 0), (1, 0), (1, 1), (0, 1)), 1, rachis_col)
    for p in range(pairs):
        t = 0.1 + 0.88 * p / (pairs - 1)
        tan = tangent(t)
        side, normal = _frame(tan)
        size = math.sin(math.pi * (0.12 + 0.82 * t)) ** 0.6
        for s in (-1, 1):
            h = hash01(seed * 131 + p * 2 + (s > 0))
            forward = math.radians(38 + 12 * h)
            direction = (side * s * math.cos(forward) + tan * math.sin(forward) + normal * (0.28 - 0.2 * t)).normalized()
            across = tan.cross(direction).cross(direction).normalized() * -1
            shade = 0.82 + 0.3 * h
            col = (colour[0] * shade, colour[1] * shade, colour[2] * shade, 1)
            _leaflet(mb, curve(t), direction, across, length * 0.26 * size * (0.9 + 0.2 * h), 0.09, 0.55 + 0.3 * t, col)


# Linear-sRGB frond colours: fresh green crown, yellowing older fronds lower down.
FRESH, MATURE, OLD = (0.055, 0.13, 0.022), (0.075, 0.15, 0.025), (0.13, 0.11, 0.035)


def build_palm(name, mats, height, lean, fronds, frond_len, seed):
    mb = MeshBuilder()
    top, axis = _trunk(mb, height, lean, base_r=0.24, top_r=0.15)
    golden = math.radians(137.5)
    for f in range(fronds):
        age = f / (fronds - 1)                       # 0 = youngest (upright), 1 = oldest (hanging)
        azimuth = f * golden + seed
        elev = math.radians(62 - 85 * age + 8 * hash01(seed + f))
        colour = tuple(a + (b - a) * min(1, age * 1.4) for a, b in zip(FRESH, MATURE)) if age < 0.85 else OLD
        base = top + axis * (0.1 - 0.25 * age)
        _frond(mb, base, azimuth, elev, frond_len * (0.85 + 0.25 * hash01(seed * 7 + f)), 0.30 + 0.25 * age, 30, colour, seed * 31 + f)
    ob = mb.build(name, [mats["coast_palm_bark"], mats["coast_palm_frond"]])
    return ob


# W-beam (AASHTO M180 class): 312 mm tall, 83 mm deep, centre 550 mm above ground; posts every 2 m.
RAIL_LEN, BEAM_H, BEAM_D, BEAM_Z, GAUGE = 12.0, 0.312, 0.083, 0.55, 0.004
POSTS = [-5.0, -3.0, -1.0, 1.0, 3.0, 5.0]


def _box(mb, lo, hi, tile=0.8):
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    c = [mb.vert((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    quads = [((0, 1, 3, 2), "xy"), ((4, 6, 7, 5), "xy"), ((0, 4, 5, 1), "xz"), ((2, 3, 7, 6), "xz"), ((0, 2, 6, 4), "yz"), ((1, 5, 7, 3), "yz")]
    for idx, plane in quads:
        cos = [mb.verts[c[i]] for i in idx]
        a, b = {"xy": (0, 1), "xz": (0, 2), "yz": (1, 2)}[plane]
        mb.face([c[i] for i in idx], [(p[a] / tile, p[b] / tile) for p in cos])


def _ibeam(mb, cx, y0, height, flange=0.152, depth=0.152, web=0.006, tf=0.009):
    """I-section post (W6x9 class) standing on z = 0, flanges parallel to the rail."""
    hx, prof = flange / 2, []
    for x, y in ((-hx, 0), (hx, 0), (hx, tf), (web / 2, tf), (web / 2, depth - tf), (hx, depth - tf), (hx, depth),
                 (-hx, depth), (-hx, depth - tf), (-web / 2, depth - tf), (-web / 2, tf), (-hx, tf)):
        prof.append((cx + x, y0 + y))
    bot = [mb.vert((x, y, 0)) for x, y in prof]
    top = [mb.vert((x, y, height)) for x, y in prof]
    n, u = len(prof), 0.0
    for j in range(n):
        k = (j + 1) % n
        du = math.dist(prof[j], prof[k]) / 0.8
        mb.face((bot[j], bot[k], top[k], top[j]), ((u, 0), (u + du, 0), (u + du, height / 0.8), (u, height / 0.8)))
        u += du
    for tri in ((0, 1, 2), (0, 2, 11), (11, 2, 3), (11, 3, 10), (10, 3, 4), (10, 4, 9), (9, 4, 5), (9, 5, 8), (8, 5, 6), (8, 6, 7)):
        mb.face([top[i] for i in tri], [((prof[i][0] - cx) / 0.8, (prof[i][1] - y0) / 0.8) for i in tri])


def _bolt(mb, x, y, z, r=0.014, sides=8):
    """Button-head splice bolt on the road face (toward -y)."""
    ring = [mb.vert((x + r * math.cos(a), y, z + r * math.sin(a))) for a in (2 * math.pi * j / sides for j in range(sides))]
    tip = mb.vert((x, y - 0.008, z))
    for j in range(sides):
        mb.face((ring[(j + 1) % sides], ring[j], tip), ((0, 0), (0.02, 0), (0.01, 0.02)))


def build_guard_rail(name, mat):
    mb = MeshBuilder()
    n = 20
    zs = [BEAM_Z - BEAM_H / 2 + BEAM_H * i / n for i in range(n + 1)]
    front = [(-BEAM_D / 2 * (1 - math.cos(4 * math.pi * i / n)), z) for i, z in enumerate(zs)]  # y <= 0: crests toward road
    back = [(y + GAUGE, z) for y, z in front]
    loop = front + back[::-1]                          # closed thin section: road face, then back face
    arc = [0.0]
    for a, b in zip(loop, loop[1:] + loop[:1]):
        arc.append(arc[-1] + math.dist(a, b))
    x0, x1 = -RAIL_LEN / 2, RAIL_LEN / 2
    left = [mb.vert((x0, y, z)) for y, z in loop]
    right = [mb.vert((x1, y, z)) for y, z in loop]
    m = len(loop)
    for j in range(m):
        k = (j + 1) % m
        v0, v1 = arc[j] / 0.4, arc[j + 1] / 0.4
        mb.face((left[j], right[j], right[k], left[k]), ((x0 / 0.8, v0), (x1 / 0.8, v0), (x1 / 0.8, v1), (x0 / 0.8, v1)))
    for x in POSTS:
        _box(mb, (x - 0.075, GAUGE, BEAM_Z - 0.18), (x + 0.075, GAUGE + 0.15, BEAM_Z + 0.18))   # spacer block
        _ibeam(mb, x, GAUGE + 0.15, BEAM_Z + 0.18)
        _bolt(mb, x, -0.0005, BEAM_Z)  # in the centre valley (y = 0)
    return mb.build(name, [mat], smooth=False, colors=False)


def make_normals_consistent(ob):
    """Outward winding for the closed parts (trunk, rail section, posts, blocks); leaflets are double-sided."""
    for o in bpy.context.scene.objects:
        o.select_set(o is ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
