"""Bake-only work light for the sector kit (build.py): the quay floods on the harbour pieces and the warm street
floods on the oldtown ones, baked into the emissive atlas beside the lamp spill.

At game night the runtime lights a piece with one key light from the sky's brightest direction and a dim
hemisphere, so the side of a dark hull, container wall or brick pier turned from that key reads as a black
silhouette. These lights exist only while the `work` pass bakes: never exported, no draw call, node or material at
runtime. The atlas stores albedo x their light, so each texel keeps its own material (corrugation, paint, plating,
brick); the sum with the lamp spill is capped under the bloom threshold, so nothing they add blooms or clips.

Positions are piece space (build.py lays piece i out at x = i * STATION). A mirrored piece is lit on its authored
half only: the mirror shares those texels.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

LED = (0.82, 0.9, 1.0)     # harbour yard LED floods: cool white, apart from the sodium of the deck and crane lamps
STREET = (1.0, 0.8, 0.58)  # oldtown street floods: warm, under the lantern gold so the brick keeps its own red
LIT_MAX = 0.55             # stored luminance cap of lamp spill + work light: x 1.5 at runtime stays under 0.9 (bloom)
WORK_SAMPLES = 64


def spot(at, aim, power, cone, color):
    return dict(kind="SPOT", at=at, aim=aim, power=power, cone=cone, color=color)


def area(at, aim, power, size, color):
    return dict(kind="AREA", at=at, aim=aim, power=power, size=size, color=color)


WORK = {
    # four high masts on the yard diagonals: both long walls (the stack stands either way round) and both ends
    # powers calibrated on the measured `lit` (contract.json surfaces): linear in power, under LIT_MAX
    "container_stack": [spot((x, y, 24.0), (0, 0, 4.0), 50000, 75, LED) for x in (-18.0, 18.0) for y in (-22.0, 22.0)],
    # floods along both berths: the hull is mirrored (its +x half carries both), the cargo is not, and its -x side
    # faces the road
    "cargo_ship": [spot((s * 34.0, y, 20.0), (s * 12.0, y, 7.0), 40000, 95, LED) for s in (-1, 1) for y in (-52.0, -17.0, 17.0, 52.0)],
    # inner face toward the road, the outer face, and each pier face from its own uplight fixture plus a street flood
    "oldtown_gate": [area((6.0, 0, 9.0), (15.0, 0, 9.0), 2000, (3.5, 14.0), STREET), area((28.0, 0, 9.0), (18.2, 0, 9.0), 1000, (3.5, 14.0), STREET)]
                    + [spot((16.6, s * 1.9, 1.9), (16.6, s * 1.6, 15.0), 1000, 50, STREET) for s in (-1, 1)]
                    + [area((16.6, s * 12.0, 8.0), (16.6, 0, 8.0), 1650, (4.0, 14.0), STREET) for s in (-1, 1)],
    # a street flood on each face of the authored quadrant and the corner uplight grazing the quoins
    "clock_tower": [area((16.0, 1.6, 15.0), (0, 1.6, 15.0), 3500, (4.0, 24.0), STREET), area((1.6, 16.0, 15.0), (1.6, 0, 15.0), 3500, (4.0, 24.0), STREET),
                    spot((5.0, 5.0, 0.5), (3.2, 3.2, 27.0), 7500, 40, STREET)],
}


def lit(pieces):
    return any(name in WORK for name in pieces)


def place(scene, pieces, station):
    """The work lights of every piece of a kit, at their stations; returns the objects to remove after the pass."""
    objects = []
    for index, name in enumerate(pieces):
        for number, spec in enumerate(WORK.get(name, ())):
            data = bpy.data.lights.new(f"work_{name}_{number}", spec["kind"])
            data.energy, data.color = spec["power"], spec["color"]
            if spec["kind"] == "SPOT":
                data.spot_size, data.spot_blend, data.shadow_soft_size = math.radians(spec["cone"]), 0.6, 0.3
            else:
                data.shape, (data.size, data.size_y) = "RECTANGLE", spec["size"]
            obj = bpy.data.objects.new(data.name, data)
            obj.location = Vector(spec["at"]) + Vector((index * station, 0, 0))
            obj.rotation_mode = "QUATERNION"
            obj.rotation_quaternion = (Vector(spec["aim"]) - Vector(spec["at"])).to_track_quat("-Z", "Y")
            scene.collection.objects.link(obj)
            objects.append(obj)
    return objects


def remove(objects):
    for obj in objects:
        data = obj.data
        bpy.data.objects.remove(obj)
        bpy.data.lights.remove(data)


LUMA = np.array([0.299, 0.587, 0.114])   # as build.emissive_stats and the bloom pass weigh it


def combine(spill, work, albedo, emit):
    """Lamp spill plus albedo x work light, the sum's luminance capped at LIT_MAX with its hue kept. Lamp texels (emit
    above 0) take no work light: their own level is set in code and must keep its margin under the bloom."""
    total = spill + albedo * work * (emit @ LUMA <= 0)[..., None]
    return total * np.minimum(1.0, LIT_MAX / np.maximum(total @ LUMA, 1e-9))[..., None]


# barycentric sample points inside a triangle (a 4 x 4 lattice folded into it)
_BARY = np.array([(a, b) for a in np.linspace(0.08, 0.92, 4) for b in np.linspace(0.08, 0.92, 4)])
_BARY = np.where(_BARY.sum(axis=1, keepdims=True) > 1, 1 - _BARY[:, ::-1], _BARY)


def _weighted_median(values, weights):
    order = np.argsort(values)
    cumulative = np.cumsum(weights[order])
    return float(values[order][np.searchsorted(cumulative, cumulative[-1] / 2)])


def measure(mesh, emissive, size, names, game_strength):
    """Per material of one finished piece (unique-UV near-LOD faces only): `texel_density`, base-colour texels per
    metre, and `lit`, the area-weighted median runtime emissive luminance (stored x game strength): how much a surface
    shows in the dark. Both on the faces turned to the road and the far side (normal within 60 degrees of +-x; -x
    faces the road; all faces if a material has none): hidden faces such as the ship's bay-gap ends are packed small
    and stay dark on purpose."""
    tris = len(mesh.polygons)
    get = lambda key, kind=np.int32: (lambda a: (mesh.attributes[key].data.foreach_get("value", a), a)[1])(np.zeros(tris, kind))
    keep = (get("swatch") == 0) & (get("lod_lo") == 0)
    material = np.zeros(tris, np.int32)
    mesh.polygons.foreach_get("material_index", material)
    co = np.zeros(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    corners = np.zeros(tris * 3, np.int32)
    mesh.polygons.foreach_get("vertices", corners)
    uv = np.zeros(len(mesh.loops) * 2, np.float32)
    mesh.uv_layers["UVMap"].data.foreach_get("uv", uv)
    p, t = co.reshape(-1, 3)[corners].reshape(tris, 3, 3), uv.reshape(tris, 3, 2)
    normal = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    area = np.linalg.norm(normal, axis=1) / 2
    wall = np.abs(normal[:, 0]) > 0.5 * np.maximum(2 * area, 1e-12)
    uv_area = np.abs(np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])) / 2
    n = emissive.shape[0]
    at = t[:, :1] + _BARY[None, :, :1] * (t[:, 1:2] - t[:, :1]) + _BARY[None, :, 1:] * (t[:, 2:3] - t[:, :1])
    texel = np.clip((at * n).astype(int), 0, n - 1)
    lum = emissive[texel[..., 1], texel[..., 0]] @ LUMA * game_strength
    out = {}
    for index in sorted(set(material[keep].tolist())):
        on = keep & (material == index)
        walls = on & wall if (on & wall).any() else on
        out[names[index]] = dict(texel_density=round(float(np.sqrt(uv_area[walls].sum() / area[walls].sum())) * size, 2),
                                 lit=round(_weighted_median(lum[walls].ravel(), np.repeat(area[walls] / len(_BARY), len(_BARY))), 4))
    return out
