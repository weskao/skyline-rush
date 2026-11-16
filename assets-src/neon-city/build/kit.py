"""Mesh builder of the Neon city kit: every face maps to one atlas cell and is cut where that cell tiles.

Blender axes: z up, x along the street, street side toward -y (three.js +Z after the glTF Y-up export).
Faces are given counter-clockwise seen from outside; the kit's material is single-sided.
"""
import math

import bmesh
import bpy
from mathutils import Vector


def _cuts(length, tile, off=0.0):
    """Split [0, length] at tile boundaries: (start, end) as fractions of length, then as cell UV."""
    if not off and length > tile:  # whole tiles, stretched a little so the count is an integer
        n = round(length / tile)
        return [(i / n, (i + 1) / n, 0.0, 1.0) for i in range(n)]
    out, s, end = [], off, off + length
    while s < end - 1e-6:
        e = min(end, (math.floor(s / tile + 1e-6) + 1) * tile)
        a = s / tile - math.floor(s / tile + 1e-6)
        out.append(((s - off) / length, (e - off) / length, a, a + (e - s) / tile))
        s = e
    return out


class Kit:
    def __init__(self, atlas):
        self.atlas, self.verts, self.faces, self.uvs, self.smooth = atlas, [], [], [], []

    @property
    def triangles(self):
        return sum(len(f) - 2 for f in self.faces)

    def face(self, pts, cell, uvs, smooth=False):
        n = len(self.verts)
        self.verts.extend(tuple(p) for p in pts)
        self.faces.append(tuple(range(n, n + len(pts))))
        self.uvs.append([self.atlas.uv(cell, u, v) for u, v in uvs])
        self.smooth.append(smooth)

    def quad(self, bl, br, tr, tl, cell, uv=(0, 0, 1, 1), smooth=False):
        u0, v0, u1, v1 = uv
        self.face((bl, br, tr, tl), cell, ((u0, v0), (u1, v0), (u1, v1), (u0, v1)), smooth)

    def patch(self, o, u, v, cell, uoff=0.0, voff=0.0):
        """Parallelogram o, o+u, o+u+v, o+v, tiled by the cell's size in metres."""
        c, o, u, v = self.atlas.cells[cell], Vector(o), Vector(u), Vector(v)
        for s0, s1, a0, a1 in _cuts(u.length, c.mw, uoff):
            for t0, t1, b0, b1 in _cuts(v.length, c.mh, voff):
                self.quad(o + u * s0 + v * t0, o + u * s1 + v * t0, o + u * s1 + v * t1, o + u * s0 + v * t1, cell, (a0, b0, a1, b1))

    def wall(self, a, b, z0, z1, cell, **kw):
        """Vertical wall from a (left, seen from outside) to b, both (x, y)."""
        self.patch((a[0], a[1], z0), (b[0] - a[0], b[1] - a[1], 0), (0, 0, z1 - z0), cell, **kw)

    def walls(self, w, d, z0, z1, cells, y=0.0):
        """Four walls of a w x d box centred on x = 0, y: cells = (front, right, back, left) or one name."""
        f, r, b, l = (cells,) * 4 if isinstance(cells, str) else cells
        x0, x1, y0, y1 = -w / 2, w / 2, y - d / 2, y + d / 2
        for a, c, cell in (((x0, y0), (x1, y0), f), ((x1, y0), (x1, y1), r), ((x1, y1), (x0, y1), b), ((x0, y1), (x0, y0), l)):
            if cell:
                self.wall(a, c, z0, z1, cell)

    def floor(self, x0, y0, x1, y1, z, cell, down=False, fit=False):
        """fit: one quad showing the whole cell (far LODs) instead of tiling it."""
        if fit:
            self.quad((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z), cell)
        elif down:
            self.patch((x0, y1, z), (x1 - x0, 0, 0), (0, y0 - y1, 0), cell)
        else:
            self.patch((x0, y0, z), (x1 - x0, 0, 0), (0, y1 - y0, 0), cell)

    def box(self, lo, hi, cell, skip="u", fit=False):
        """Axis-aligned box. skip: faces to leave out among f(ront -y) b(ack) l(eft) r(ight) t(op) u(nder).
        fit: each face shows the whole cell (sign faces) instead of tiling it by size."""
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        cells = cell if isinstance(cell, dict) else {}
        pick = lambda key: cells.get(key, cells.get("*")) if cells else cell  # noqa: E731
        sides = {"f": ((x0, y0), (x1, y0)), "r": ((x1, y0), (x1, y1)), "b": ((x1, y1), (x0, y1)), "l": ((x0, y1), (x0, y0))}
        for key, (a, b) in sides.items():
            if key in skip:
                continue
            if fit:
                self.quad((*a, z0), (*b, z0), (*b, z1), (*a, z1), pick(key))
            else:
                self.wall(a, b, z0, z1, pick(key))
        if "t" not in skip:
            self.floor(x0, y0, x1, y1, z1, pick("t"))
        if "u" not in skip:
            self.floor(x0, y0, x1, y1, z0, pick("u"), down=True)

    def tube(self, path, radii, sides, cell, caps=(False, True), smooth=True):
        """Round section swept along path; radii per point. The cell wraps once around."""
        path, c = [Vector(p) for p in path], self.atlas.cells[cell]
        n, rings, dist = len(path), [], [0.0]
        for i, p in enumerate(path):
            t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
            ref = Vector((1, 0, 0)) if abs(t.x) < 0.9 else Vector((0, 1, 0))
            a = ref.cross(t).normalized()
            b = t.cross(a)
            rings.append([p + (a * math.cos(2 * math.pi * j / sides) + b * math.sin(2 * math.pi * j / sides)) * radii[i] for j in range(sides)])
            if i:
                dist.append(dist[-1] + (p - path[i - 1]).length)
        scale = min(1.0, dist[-1] / c.mh) / dist[-1]
        for i in range(n - 1):
            for j in range(sides):
                k = (j + 1) % sides
                self.face((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]), cell,
                          ((j / sides, dist[i] * scale), ((j + 1) / sides, dist[i] * scale),
                           ((j + 1) / sides, dist[i + 1] * scale), (j / sides, dist[i + 1] * scale)), smooth)
        fan = [(0.5 + 0.4 * math.cos(2 * math.pi * j / sides), 0.5 + 0.4 * math.sin(2 * math.pi * j / sides)) for j in range(sides)]
        if caps[0]:
            self.face(rings[0][::-1], cell, fan[::-1])
        if caps[1]:
            self.face(rings[-1], cell, fan)

    def prism(self, sides, r0, r1, z0, z1, cell, phase=0.0, cap=None, centre=(0.0, 0.0)):
        """Upright n-sided frustum with flat faces; each face shows the cell once across (tiled up)."""
        ring = lambda r: [(centre[0] + r * math.cos(phase + 2 * math.pi * j / sides), centre[1] + r * math.sin(phase + 2 * math.pi * j / sides)) for j in range(sides)]  # noqa: E731
        lo, hi, c = ring(r0), ring(r1), self.atlas.cells[cell]
        rows = max(1, round((z1 - z0) / c.mh)) if not c.solid else 1
        for j in range(sides):
            k = (j + 1) % sides
            for row in range(rows):
                f0, f1 = row / rows, (row + 1) / rows
                at = lambda p, q, f: (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, z0 + (z1 - z0) * f)  # noqa: E731
                v1 = min(1.0, (z1 - z0) / rows / c.mh)
                self.quad(at(lo[j], hi[j], f0), at(lo[k], hi[k], f0), at(lo[k], hi[k], f1), at(lo[j], hi[j], f1), cell, (0, 0, 1, v1))
        if cap:
            self.face([(x, y, z1) for x, y in hi], cap, [(0.5 + 0.4 * math.cos(6.283 * j / sides), 0.5 + 0.4 * math.sin(6.283 * j / sides)) for j in range(sides)])

    def puff(self, centre, radii, subdiv, cell, seed):
        """Lumpy blossom mass: a displaced icosphere, v up its height, so the cell paints a shaded underside and a lit top."""
        bm, centre = bmesh.new(), Vector(centre)
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
        for f in bm.faces:
            pts, dirs = [], [v.co.normalized() for v in f.verts]
            for d in dirs:
                k = 1 + 0.12 * math.sin(d.x * 5.1 + seed) * math.sin(d.y * 4.3 + seed * 1.7) + 0.08 * math.sin(d.z * 7.9 + seed * 0.6)
                pts.append(centre + Vector((d.x * radii[0], d.y * radii[1], d.z * radii[2])) * k)
            a = 0 if abs(f.normal.x) >= abs(f.normal.y) else 1  # u runs round the side, v up it: the cell's light gradient
            self.face(pts, cell, [(0.5 + 0.45 * d[1 - a], 0.5 + 0.45 * d.z) for d in dirs], smooth=True)
        bm.free()

    def build(self, name, mat):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.verts, [], self.faces)
        me.uv_layers.new(name="UVMap").data.foreach_set("uv", [x for f in self.uvs for p in f for x in p])
        me.polygons.foreach_set("use_smooth", self.smooth)
        me.materials.append(mat)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        bm.to_mesh(me)
        bm.free()
        me.validate()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob
