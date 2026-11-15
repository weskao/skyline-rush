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
LIT_MAX = 0.35             # stored luminance ceiling of lamp spill + work light: x 1.5 at runtime = 0.525, leaving the
                           # key light headroom under 0.9 (bloom); at 0.55 the white box tops bloomed at hero distance
KNEE = 0.75                # the share of LIT_MAX passed unchanged; above it a shoulder approaches LIT_MAX. A hard clamp
                           # there flattened 18 % of the white containers' walls into a flat pale grey (2026-11-16).
                           # Trap: no curve under the ceiling keeps relief on texels lit far past it; keep a lit wall's
                           # range under the knee with the light's placement and power, not the curve
WORK_SAMPLES = 64


def spot(at, aim, power, cone, color):
    return dict(kind="SPOT", at=at, aim=aim, power=power, cone=cone, color=color)


def area(at, aim, power, size, color):
    return dict(kind="AREA", at=at, aim=aim, power=power, size=size, color=color)


WORK = {
    # four high masts on the yard diagonals: both long walls (the stack stands either way round) and both ends.
    # Powers calibrated on the measured `lit` (contract.json surfaces): linear in power, under LIT_MAX. Far masts: from
    # 18-22 m off, the near corner took 3.4x the far one's light and the white boxes ran past the roll-off
    "container_stack": [spot((x, y, 28.0), (0, 0, 4.0), 65000, 75, LED) for x in (-26.0, 26.0) for y in (-30.0, 30.0)],
    # the cargo from high masts behind both berths, set back so a bay near a mast is not lit 2x its neighbour; the hull
    # from low floods on the quay edge, under the cargo (mirrored: its +x half carries both sides); the -x cargo faces
    # the road. The stern transom and the bow from low floods off each end, the funnel from a mast on the aft quarter: no
    # berth flood reached them, and they read black (2026-11-16). The stern flood stays under the deckhouse's aft face,
    # which its own windows light; at 70000 and 35000 W the cargo masts ran the white boxes into the roll-off
    # (relief 0.61, 0.86)
    "cargo_ship": [spot((s * 40.0, y, 34.0), (s * 6.0, y, 18.0), 15000, 70, LED) for s in (-1, 1) for y in (-52.0, -17.0, 17.0, 52.0)]
                  + [spot((34.0, y, 3.0), (12.0, y, 6.0), 35000, 90, LED) for y in (-60.0, -30.0, 0.0, 30.0, 55.0)]
                  # hull lift: the masts at 15000 W (kept low for the white boxes' relief) left the hull side at 0.0549,
                  # under its 0.055 floor. A narrow cone aimed at z 3.5 ends under the cargo (z 10.4) so the boxes do not move
                  + [spot((30.0, y, 1.5), (12.0, y, 3.5), 4000, 40, LED) for y in (-60.0, -30.0, 0.0, 30.0, 55.0)]
                  + [spot((6.0, -100.0, 8.0), (3.0, -72.0, 5.0), 45000, 50, LED), spot((14.0, 104.0, 10.0), (3.0, 74.0, 5.0), 45000, 60, LED),
                     spot((16.0, -84.0, 44.0), (1.4, -63.0, 31.0), 30000, 50, LED)],
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
    """Lamp spill plus albedo x work light, the sum's luminance rolled off toward LIT_MAX with its hue kept: unchanged
    up to KNEE x LIT_MAX, then an exponential shoulder that never reaches the ceiling, so a hot spot keeps the relief
    of its texels instead of clipping to one flat level. Lamp texels (emit above 0) take no work light: their own
    level is set in code and must keep its margin under the bloom."""
    total = spill + albedo * work * (emit @ LUMA <= 0)[..., None]
    lum, knee = total @ LUMA, KNEE * LIT_MAX
    rolled = np.where(lum > knee, knee + (LIT_MAX - knee) * (1 - np.exp(-(lum - knee) / (LIT_MAX - knee))), lum)
    return total * (rolled / np.maximum(lum, 1e-9))[..., None]


# barycentric sample points inside a triangle (a 4 x 4 lattice folded into it)
_BARY = np.array([(a, b) for a in np.linspace(0.08, 0.92, 4) for b in np.linspace(0.08, 0.92, 4)])
_BARY = np.where(_BARY.sum(axis=1, keepdims=True) > 1, 1 - _BARY[:, ::-1], _BARY)


def _weighted_median(values, weights):
    order = np.argsort(values)
    cumulative = np.cumsum(weights[order])
    return float(values[order][np.searchsorted(cumulative, cumulative[-1] / 2)])


def _contrast(lum):
    """Local contrast per texel: |L - its 3 x 3 mean| over that mean."""
    box = sum(np.roll(np.roll(lum, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1)) / 9
    return np.abs(lum - box) / np.maximum(box, 1e-4)


def measure(mesh, emissive, size, names, game_strength, albedo):
    """Per material of one finished piece (unique-UV near-LOD faces only): `texel_density`, base-colour texels per
    metre, and `lit`, the area-weighted median runtime emissive luminance (stored x game strength): how much a surface
    shows in the dark. Both on the faces turned to the road and the far side (normal within 60 degrees of +-x; -x
    faces the road; all faces if a material has none): hidden faces such as the ship's bay-gap ends are packed small
    and stay dark on purpose. `relief_light` and `relief_dark`: the emissive's local contrast over the base colour's
    (`albedo`, linear, at the emissive's size) on the top quarter and the bottom half of the albedo: how much of the
    texture's corrugation and plating the night light keeps on the light and the dark paints. `lit_end`: `lit` on the
    faces turned fore or aft (normal within 60 degrees of +-y; a ship's transom and funnel ends), when a material has any."""
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
    end = np.abs(normal[:, 1]) > 0.5 * np.maximum(2 * area, 1e-12)
    uv_area = np.abs(np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])) / 2
    n = emissive.shape[0]
    at = t[:, :1] + _BARY[None, :, :1] * (t[:, 1:2] - t[:, :1]) + _BARY[None, :, 1:] * (t[:, 2:3] - t[:, :1])
    texel = np.clip((at * n).astype(int), 0, n - 1)
    lum = emissive[texel[..., 1], texel[..., 0]] @ LUMA * game_strength
    base = albedo.reshape(n, albedo.shape[0] // n, n, albedo.shape[0] // n, 3).mean(axis=(1, 3)) @ LUMA
    relief_e, relief_b = (_contrast(m)[texel[..., 1], texel[..., 0]] for m in (emissive @ LUMA, base))
    tone = base[texel[..., 1], texel[..., 0]]
    median = lambda faces: round(_weighted_median(lum[faces].ravel(), np.repeat(area[faces] / len(_BARY), len(_BARY))), 4)
    out = {}
    for index in sorted(set(material[keep].tolist())):
        on = keep & (material == index)
        walls = on & wall if (on & wall).any() else on
        t = tone[walls].ravel()
        relief = lambda pick: round(float(relief_e[walls].ravel()[pick].mean() / max(relief_b[walls].ravel()[pick].mean(), 1e-6)), 3)
        out[names[index]] = dict(texel_density=round(float(np.sqrt(uv_area[walls].sum() / area[walls].sum())) * size, 2),
                                 lit=median(walls), relief_light=relief(t >= np.percentile(t, 75)), relief_dark=relief(t <= np.percentile(t, 50)))
        if (on & end).any():
            out[names[index]]["lit_end"] = median(on & end)
    return out
