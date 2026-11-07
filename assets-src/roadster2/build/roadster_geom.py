"""Mesh helpers for the Roadster 2 master. Every helper takes three.js car-space coordinates
(Y up, nose toward -Z, metres) and converts once: Blender (x, y, z) = three (x, -z, y).

Geometry is authored in the owning node's local frame, so a node's TRS matches the procedural
car's node of the same name (src/garage-model-rig.ts copies that TRS at runtime)."""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def to_blender(p):
    return (p[0], -p[2], p[1])


def cylinder(p0, p1, r0, r1, n, cap=True):
    """Frustum from p0 (radius r0) to p1 (radius r1). Returns (verts, faces)."""
    a, b = Vector(p0), Vector(p1)
    axis = (b - a).normalized()
    ref = Vector((1, 0, 0)) if abs(axis.x) < 0.9 else Vector((0, 1, 0))
    u = axis.cross(ref).normalized()
    v = axis.cross(u)
    verts = []
    for centre, r in ((a, r0), (b, r1)):
        for i in range(n):
            t = 2 * math.pi * i / n
            p = centre + (u * math.cos(t) + v * math.sin(t)) * r
            verts.append((p.x, p.y, p.z))
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if cap:
        faces += [tuple(range(n)), tuple(range(n, 2 * n))[::-1]]
    return verts, faces


def extrude(poly, d):
    """Closed prism from a planar polygon (list of 3D points) swept by vector d."""
    n = len(poly)
    verts = [tuple(p) for p in poly] + [tuple(Vector(p) + Vector(d)) for p in poly]
    faces = [tuple(range(n)), tuple(range(n, 2 * n))[::-1]]
    faces += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return verts, faces


def loft(rings, close):
    """Strips between consecutive stations; close=True also caps the first and last ring."""
    m = len(rings[0])
    verts = [tuple(p) for ring in rings for p in ring]
    faces = []
    for s in range(len(rings) - 1):
        for j in range(m if close else m - 1):
            a, b = s * m + j, s * m + (j + 1) % m
            faces.append((a, b, (s + 1) * m + (j + 1) % m, (s + 1) * m + j))
    if close:
        last = (len(rings) - 1) * m
        faces.append(tuple(range(m)))
        faces.append(tuple(range(last, last + m))[::-1])
    return verts, faces


def _resample(points, sub, closed):
    """Catmull-Rom through `points` with `sub` samples per span. Each sample is clamped per axis to the
    box of its span's two endpoints, so the curve never overshoots: bounds and contract stations hold."""
    n = len(points)
    spans = n if closed else n - 1
    out = []
    for i in range(spans):
        p1, p2 = points[i], points[(i + 1) % n]
        p0 = points[(i - 1) % n] if closed or i > 0 else p1
        p3 = points[(i + 2) % n] if closed or i + 2 < n else p2
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            q = []
            for a, b, c, d in zip(p0, p1, p2, p3):
                v = .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
                q.append(min(max(v, min(b, c)), max(b, c)))
            out.append(tuple(q))
    if not closed:
        out.append(tuple(points[-1]))
    return out


def _check_resample():
    """Build-time self-check: samples pass through every control point and stay inside the control box."""
    pts = [(0, 0, 0), (1, 2, 0), (2, -1, 1), (3, 0, 0)]
    for closed in (False, True):
        out = _resample(pts, 4, closed)
        assert all(out[i * 4] == pts[i] for i in range(len(pts) if closed else len(pts) - 1)), "misses a station"
        for axis in range(3):
            lo, hi = min(p[axis] for p in pts), max(p[axis] for p in pts)
            assert all(lo <= q[axis] <= hi for q in out), "overshoots the control box"


def smooth_rings(rings, ring_sub, station_sub, ring_closed):
    """Densify a loft: smooth each cross-section ring, then smooth along the stations (same point count per ring)."""
    dense = [_resample(r, ring_sub, ring_closed) for r in rings]
    columns = [_resample([r[j] for r in dense], station_sub, False) for j in range(len(dense[0]))]
    return [[col[s] for col in columns] for s in range(len(columns[0]))]


def merge(*parts):
    verts, faces, off = [], [], 0
    for v, f in parts:
        verts += v
        faces += [tuple(i + off for i in face) for face in f]
        off += len(v)
    return verts, faces


def _mesh_object(name, verts, faces, material, collection):
    me = bpy.data.meshes.new(name)
    me.from_pydata([to_blender(v) for v in verts], [], faces)
    me.validate()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def node(name, collection, pos=(0, 0, 0), parent=None, scale=(1, 1, 1), rot_x=0.0):
    """Empty pivot. pos/scale are three.js local values; rot_x is the rotation about X (radians)."""
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = 'PLAIN_AXES'
    ob.empty_display_size = 0.1
    ob.location = to_blender(pos)
    ob.scale = (scale[0], scale[2], scale[1])
    ob.rotation_euler = (rot_x, 0.0, 0.0)
    collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
        ob.matrix_parent_inverse = Matrix.Identity(4)
    return ob


def part(name, collection, verts, faces, material, parent=None):
    """Mesh in the frame of `parent` (or the scene root when None)."""
    ob = _mesh_object(name, verts, faces, material, collection)
    if parent is not None:
        ob.parent = parent
        ob.matrix_parent_inverse = Matrix.Identity(4)
    return ob

_check_resample()
