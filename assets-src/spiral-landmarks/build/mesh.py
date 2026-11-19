"""Mesh builder for the Sky Spiral kit, written in the space the game reads: +Y up, metres, +X right, +Z toward
the viewer (three.js). build() turns a point (x, y, z) into Blender's (x, -z, y), which the glTF exporter turns back.

A face takes one UV per corner from a surface of the atlas (build/atlas.py):
  Band  repeats along u: `along` is in metres and may run past one repeat; across the band a face is laid from the
        band's lower edge at true size, squeezed only when it is taller than the band.
  Cell  a swatch: the face's own extent is stretched over the cell (or over `part` of it).
Vertices are shared inside one `smooth` group (smooth shading across it); a face without a group is flat.
"""
import math

import bpy
from mathutils import Matrix, Vector, geometry

from atlas import band_uv, cell_uv


class Band:
    def __init__(self, name):
        self.v0, self.v1, width, height = band_uv(name)
        self.width, self.height = width or 1.0, height or 1.0

    def uv(self, along, across):
        return along / self.width, self.v0 + (self.v1 - self.v0) * min(1.0, max(0.0, across))

    def face(self, alongs, acrosses):
        lo, span = min(acrosses), max(acrosses) - min(acrosses)
        return [self.uv(a, (c - lo) / max(span, self.height)) for a, c in zip(alongs, acrosses)]

    def turn(self, along, share, across):
        return self.uv(along, across)


class Cell:
    def __init__(self, name, part=(0.0, 0.0, 1.0, 1.0)):
        u0, v0, u1, v1 = cell_uv(name)
        self.u0, self.v0 = u0 + (u1 - u0) * part[0], v0 + (v1 - v0) * part[1]
        self.u1, self.v1 = u0 + (u1 - u0) * part[2], v0 + (v1 - v0) * part[3]

    def uv(self, s, t):
        return self.u0 + (self.u1 - self.u0) * s, self.v0 + (self.v1 - self.v0) * t

    def face(self, alongs, acrosses):
        share = lambda value, values: (value - min(values)) / ((max(values) - min(values)) or 1.0)
        return [self.uv(share(a, alongs), share(c, acrosses)) for a, c in zip(alongs, acrosses)]

    def turn(self, along, share, across):
        return self.uv(across, share)


class Mesh:
    def __init__(self, name):
        self.name, self.verts, self.faces, self.uvs, self.smooth, self._index = name, [], [], [], [], {}
        self.xf = Matrix.Identity(4)   # applied to every point added: lets a lathe stand tilted or off the origin

    def _vert(self, p, group):
        key = (group, round(p.x, 3), round(p.y, 3), round(p.z, 3))
        if key not in self._index:
            self._index[key] = len(self.verts)
            self.verts.append(p)
        return self._index[key]

    def face(self, pts, uvs, smooth=None, away=None):
        """One polygon, anticlockwise seen from outside; with `away`, turned so it faces away from that point.
        Repeated corners are dropped, so a lathe may close on its axis; a face left without area is skipped."""
        pts = [self.xf @ Vector(p) for p in pts]
        keep = [i for i in range(len(pts)) if (pts[i] - pts[i - 1]).length > 1e-4]
        if len(keep) < 3:
            return
        pts, uvs = [pts[i] for i in keep], [uvs[i] for i in keep]
        normal = geometry.normal(pts)
        if normal.length < 0.5:
            return
        if away is not None and normal.dot(sum(pts, Vector()) / len(pts) - self.xf @ Vector(away)) < 0:
            pts, uvs = pts[::-1], uvs[::-1]
        self.faces.append([self._vert(p, smooth) for p in pts])
        self.uvs.append(uvs)
        self.smooth.append(smooth is not None)

    def box(self, lo, hi, surf, skip="", over=None):
        """Axis-aligned box; `skip` names faces to leave out ("-y +x"), `over` gives a face its own surface."""
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        sides = {"+x": [(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], "-x": [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)],
                 "+z": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], "-z": [(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)],
                 "+y": [(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], "-y": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)]}
        for key, pts in sides.items():
            if key in skip:
                continue
            a, c = {"x": (2, 1), "z": (0, 1), "y": (0, 2) if x1 - x0 >= z1 - z0 else (2, 0)}[key[1]]
            self.face(pts, (over or {}).get(key, surf).face([p[a] for p in pts], [p[c] for p in pts]))

    def beam(self, a, b, size, surf, size1=None, sides=4, caps="", smooth=None, start=0.0):
        """A straight member from a to b: `size` = (width, height) across flats at a, `size1` at b (tapered)."""
        a, b = Vector(a), Vector(b)
        axis = (b - a).normalized()
        side = axis.cross(Vector((0, 1, 0)))
        side = (side if side.length > 1e-4 else Vector((1, 0, 0))).normalized()
        up, reach = side.cross(axis), 1 / math.cos(math.pi / sides)

        def ring(centre, wh):
            angles = [2 * math.pi * (j + 0.5) / sides for j in range(sides)]
            return [centre + side * (math.cos(t) * wh[0] / 2 * reach) + up * (math.sin(t) * wh[1] / 2 * reach) for t in angles]

        r0, r1, mid, length = ring(a, size), ring(b, size1 or size), (a + b) / 2, (b - a).length
        for j in range(sides):
            k, width = (j + 1) % sides, (r0[j] - r0[(j + 1) % sides]).length
            self.face([r0[j], r0[k], r1[k], r1[j]], surf.face([start, start, start + length, start + length], [0, width, width, 0]), smooth, away=mid)
        for end, pts in (("a", r0), ("b", r1)):
            if end in caps:
                self.face(pts, surf.face([p.dot(side) for p in pts], [p.dot(up) for p in pts]), away=mid)

    def lathe(self, profile, sides, surf, smooth=None, groups=None, scale=(1.0, 1.0), start=0.0, around=False):
        """Turns `profile` = [(radius, y), ...] about the y axis. List it anticlockwise in the (radius, y) plane (up
        the outside, inward over the top) and the faces look outward. Round the turn the surface is laid mirrored
        in `groups` equal parts (default: one per side), so no seam shows and none needs split vertices. With
        `around` a band runs round the turn instead (a whole number of repeats) and the profile crosses it."""
        per = sides / (groups or sides)
        across = lambda j: 1 - abs((j / per) % 2 - 1)
        at = lambda r, y, j: (r * math.cos(2 * math.pi * j / sides) * scale[0], y, r * math.sin(2 * math.pi * j / sides) * scale[1])
        total = sum(math.dist(p, q) for p, q in zip(profile, profile[1:])) or 1.0
        if around:
            lap = max(1, round(2 * math.pi * max(r for r, _ in profile) * max(scale) / surf.width)) * surf.width
            wrap = lambda d, k: surf.uv(lap * k / sides, d / max(total, surf.height))
        else:
            wrap = lambda d, k: surf.turn(start + d, d / total, across(k))
        run = 0.0
        for (r0, y0), (r1, y1) in zip(profile, profile[1:]):
            step = math.dist((r0, y0), (r1, y1))
            for j in range(sides):
                pts = [at(r0, y0, j + 1), at(r0, y0, j), at(r1, y1, j), at(r1, y1, j + 1)]
                self.face(pts, [wrap(run + d, k) for d, k in ((0, j + 1), (0, j), (step, j), (step, j + 1))], smooth)
            run += step

    def plate(self, pts, surf, tag):
        """A thin sheet seen from both sides: the polygon and its reverse, each 3 cm off the middle so the two
        never share a depth (coincident faces flicker in a depth buffer and render black in a path tracer)."""
        uvs = surf.face([math.hypot(p[0], p[2]) for p in pts], [p[1] for p in pts])
        off = geometry.normal([Vector(p) for p in pts]) * 0.03
        self.face([Vector(p) + off for p in pts], uvs, smooth=tag + "+")
        self.face([Vector(p) - off for p in pts[::-1]], uvs[::-1], smooth=tag + "-")

    def grid(self, point, uv, rings, segs, smooth, away):
        """A polar sheet: point(i, j) and uv(i, j) for ring i (0 = the centre) and segment j, facing away from `away`."""
        for j in range(segs):
            for i in range(rings):
                corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                uvs = [uv(a, j + 0.5 if a == 0 else b) for a, b in corners]   # the centre takes the middle of its wedge
                self.face([point(a, b) for a, b in corners], uvs, smooth, away=away)

    def fit(self, across_x, across_z):
        """Centres the footprint on the origin and scales it to exactly across_x by across_z metres."""
        (x0, _, z0), (x1, _, z1) = self.bounds()
        for p in self.verts:
            p.x, p.z = (p.x - (x0 + x1) / 2) * across_x / (x1 - x0), (p.z - (z0 + z1) / 2) * across_z / (z1 - z0)
        return self

    def triangles(self):
        return sum(len(f) - 2 for f in self.faces)

    def bounds(self):
        return [[round(min(p[i] for p in self.verts), 3) for i in range(3)], [round(max(p[i] for p in self.verts), 3) for i in range(3)]]

    def build(self, material):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata([(p.x, -p.z, p.y) for p in self.verts], [], self.faces)
        mesh.uv_layers.new(name="UVMap").data.foreach_set("uv", [c for uvs in self.uvs for uv in uvs for c in uv])
        mesh.polygons.foreach_set("use_smooth", self.smooth)
        mesh.materials.append(material)
        assert not mesh.validate() and len(mesh.polygons) == len(self.faces), f"{self.name}: Blender rejected faces"
        mesh.update()
        return bpy.data.objects.new(self.name, mesh)
