"""Mesh builder for the Neon landmark kit: closed primitives, tagged per face.

Blender axes while building: +X = the driver's right, +Y = the driving direction, +Z = up (the glTF export
turns that into +X right, -Z forward, +Y up). Every part is its own closed shell, so normals are recalculated
per part and unwanted faces are dropped afterwards (`skip` / `only`, e.g. '-z+x').

Per-face tags, kept as mesh attributes until build.py finishes the piece:
  lod_lo, lod_hi  the LODs the face belongs to (0 = near, 1 = far)
  mir             bit 0 = mirrored across x = 0, bit 1 = across y = 0; done after the UV pack, so both halves
                  share texels
  swatch          1 = all faces of the part share one small patch of the atlas (thin bars and rods)
  pri             texel-density weight of a unique-UV part (1 = the kit's base density)
"""
import math

import bmesh
from mathutils import Vector

DIRS = {s + a: Vector([(1 if s == "+" else -1) * (a == b) for b in "xyz"]) for s in "+-" for a in "xyz"}


def _dirs(spec):
    return [DIRS[spec[i:i + 2]] for i in range(0, len(spec), 2)]


class Builder:
    def __init__(self, name, materials, mirror=""):
        self.name, self.materials, self.mirror = name, materials, mirror
        self.bm = bmesh.new()
        ints = self.bm.faces.layers.int
        self.layers = {k: ints.new(k) for k in ("lod_lo", "lod_hi", "mir", "swatch")}
        self.pri = self.bm.faces.layers.float.new("pri")

    def _tag(self, faces, mat, lod=(0, 1), pri=1.0, swatch=False, skip="", only="", mirror=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        mir = self.mirror if mirror is None else mirror
        bits = ("x" in mir) | 2 * ("y" in mir)
        assert lod[0] == 0 or swatch, "a part that only exists in a far LOD must not take atlas space"
        drop = []
        for f in faces:
            f.normal_update()
            n = f.normal
            on_mirror = any(bits >> a & 1 and all(abs(v.co[a]) < 1e-6 for v in f.verts) for a in (0, 1))
            if on_mirror or any(n.dot(d) > .999 for d in _dirs(skip)) or (only and not any(n.dot(d) > .999 for d in _dirs(only))):
                drop.append(f)
                continue
            f.material_index = self.materials.index(mat)
            f[self.layers["lod_lo"]], f[self.layers["lod_hi"]] = lod
            f[self.layers["mir"]], f[self.layers["swatch"]], f[self.pri] = bits, int(swatch), pri
        if drop:
            bmesh.ops.delete(self.bm, geom=drop, context="FACES")

    def _add(self, verts, faces, mat, **kw):
        bv = [self.bm.verts.new(v) for v in verts]
        self._tag([self.bm.faces.new([bv[i] for i in f]) for f in faces], mat, **kw)

    def box(self, mat, x, y, z, **kw):
        verts = [(x[i], y[j], z[k]) for k in (0, 1) for j in (0, 1) for i in (0, 1)]
        self._add(verts, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], mat, **kw)

    def prism(self, mat, profile, lo, hi, axis="y", **kw):
        """Extrude a 2D profile along an axis: 'y' takes (x, z) points, 'x' takes (y, z), 'z' takes (x, y)."""
        put = {"y": lambda u, v, a: (u, a, v), "x": lambda u, v, a: (a, u, v), "z": lambda u, v, a: (u, v, a)}[axis]
        n = len(profile)
        verts = [put(u, v, a) for a in (lo, hi) for u, v in profile]
        sides = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        self._add(verts, sides + [tuple(range(n)), tuple(range(n, 2 * n))], mat, **kw)

    def cyl(self, mat, p0, p1, r, n=8, caps=True, r1=None, **kw):
        """Round bar or column from p0 to p1 (r1 = the radius at p1 when it tapers)."""
        p0, p1 = Vector(p0), Vector(p1)
        t = (p1 - p0).normalized()
        s = t.orthogonal().normalized()
        u = t.cross(s)
        ring = lambda p, rad: [p + rad * (math.cos(a) * s + math.sin(a) * u) for a in (2 * math.pi * i / n for i in range(n))]
        verts = ring(p0, r) + ring(p1, r if r1 is None else r1)
        sides = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        self._add(verts, sides + ([tuple(range(n)), tuple(range(n, 2 * n))] if caps else []), mat, **kw)

    def sweep(self, mat, pts, tans, w, h, offset=(0.0, 0.0), **kw):
        """Box section w (sideways) x h (in the bending plane) along a path. offset = (sideways, downward) shift."""
        rings = []
        for p, t in zip(pts, tans):
            t = Vector(t).normalized()
            s = (Vector((1, 0, 0)) - t * t.x).normalized()
            n = t.cross(s)
            c = Vector(p) + s * offset[0] + n * offset[1]
            rings.append([c + s * a * w / 2 + n * b * h / 2 for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        verts = [v for ring in rings for v in ring]
        faces = [(4 * i + j, 4 * i + (j + 1) % 4, 4 * i + 4 + (j + 1) % 4, 4 * i + 4 + j) for i in range(len(rings) - 1) for j in range(4)]
        last = 4 * (len(rings) - 1)
        self._add(verts, faces + [(0, 1, 2, 3), (last, last + 1, last + 2, last + 3)], mat, **kw)

    def ring(self, mat, r0, r1, z0, z1, n=32, **kw):
        """Flat ring around the z axis (inner radius r0, outer r1)."""
        verts = []
        for i in range(n):
            c, s = math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)
            verts += [(r0 * c, r0 * s, z0), (r1 * c, r1 * s, z0), (r1 * c, r1 * s, z1), (r0 * c, r0 * s, z1)]
        faces = []
        for i in range(n):
            a, b = 4 * i, 4 * ((i + 1) % n)
            faces += [(a + j, a + (j + 1) % 4, b + (j + 1) % 4, b + j) for j in range(4)]
        self._add(verts, faces, mat, **kw)

    def hull(self, mat, points, **kw):
        """Faceted convex solid through the given points (crystal shards, column capitals)."""
        verts = [self.bm.verts.new(p) for p in points]
        out = bmesh.ops.convex_hull(self.bm, input=verts)
        junk = [g for g in out["geom_interior"] + out["geom_unused"] if isinstance(g, bmesh.types.BMVert)]
        if junk:
            bmesh.ops.delete(self.bm, geom=junk, context="VERTS")
        self._tag([g for g in out["geom"] if isinstance(g, bmesh.types.BMFace)], mat, **kw)

    def to_mesh(self, mesh):
        """Writes the mesh with world-scale planar UVs: every flat face is its own island (coplanar neighbours
        join), scaled by its `pri`. The atlas pack in build.py places the islands; nothing is stretched."""
        uv = self.bm.loops.layers.uv.new("UVMap")
        for f in self.bm.faces:
            n = Vector([round(c, 3) for c in f.normal]).normalized()   # rounded: coplanar faces share one basis
            t = (Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).cross(n).normalized()
            s = n.cross(t)
            for loop in f.loops:
                loop[uv].uv = (loop.vert.co.dot(t) * f[self.pri], loop.vert.co.dot(s) * f[self.pri])
        self.bm.to_mesh(mesh)
        self.bm.free()


def mirror_and_triangulate(mesh):
    """Unfold the mirrored halves (after the UV pack, so they overlap in the atlas) and triangulate.
    The `copy` tag marks the unfolded faces: the bake uses them as the occluder of the authored half."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    mir, copy = bm.faces.layers.int["mir"], bm.faces.layers.int.new("copy")
    for axis in (0, 1):
        faces = [f for f in bm.faces if f[mir] >> axis & 1]
        if not faces:
            continue
        copies = [g for g in bmesh.ops.duplicate(bm, geom=faces)["geom"] if isinstance(g, bmesh.types.BMFace)]
        for v in {v for f in copies for v in f.verts}:
            v.co[axis] *= -1
        for f in copies:
            f[copy] = 1
        bmesh.ops.reverse_faces(bm, faces=copies)
        seam = [v for v in bm.verts if abs(v.co[axis]) < 1e-6]         # weld the halves so smooth parts stay smooth
        bmesh.ops.remove_doubles(bm, verts=seam, dist=1e-5)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()


def keep_faces(mesh, name, keep):
    """Copy of a mesh holding only the faces `keep(face, int_layers)` accepts."""
    out = mesh.copy()
    out.name = name
    bm = bmesh.new()
    bm.from_mesh(out)
    ints = bm.faces.layers.int
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f, ints)], context="FACES")
    bm.to_mesh(out)
    bm.free()
    return out


def lod_mesh(mesh, lod, name):
    """Copy of a finished piece mesh holding only the faces of one LOD, without the build tags."""
    out = keep_faces(mesh, name, lambda f, ints: f[ints["lod_lo"]] <= lod <= f[ints["lod_hi"]])
    bm = bmesh.new()
    bm.from_mesh(out)
    ints = bm.faces.layers.int
    for key in ("lod_lo", "lod_hi", "mir", "swatch", "copy", "piece"):
        ints.remove(ints[key])
    bm.faces.layers.float.remove(bm.faces.layers.float["pri"])
    bm.to_mesh(out)
    bm.free()
    out.polygons.foreach_set("use_smooth", [True] * len(out.polygons))
    out.set_sharp_from_angle(angle=math.radians(35))
    return out
