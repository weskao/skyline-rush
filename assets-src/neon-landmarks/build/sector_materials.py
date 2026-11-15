"""Materials of the harbour and oldtown pieces of the 10 km lap: the `neon_landmarks_sectors` atlas set.

Unlike the nine pieces of the 4000 m lap (materials.py), most of these surfaces start from scanned CC0 texture
sets: Poly Haven, recorded in sources.json beside build.py and fetched by fetch_sources.py into a cache outside
the repo. Every file is checked against its recorded sha256 before use. A scan is sampled on the "world" UV layer
(geo.Builder world_uv) at its real size, tinted where a paint colour is wanted (`paint` = how much of the scan's
light and dark it keeps) or used as photographed (`raw`), and baked with the procedural layers below into four
atlases: base colour, emissive, occlusion-roughness-metal and a tangent-space normal map.

Procedural layers: container cells (one paint per container, frame, corner castings, door lock rods), hull plating
seams, deckhouse windows (a lit few), hazard stripes, rivets, grating treads, rust patches and rain streaks.

Lamps keep their colour at full value in `color` (contract.json `lamps`); `level` is the share of it the atlas
stores, so that at the game's landmark emissive strength (build.py GAME_EMISSIVE) no lamp clips to white and no
panel crosses the bloom threshold. `emit` = watts per square metre the surface throws into the baked spill.
"""
import hashlib
import json
import os
from pathlib import Path

import bpy
import numpy as np

from harbour import CELL
from materials import _cell, _joints, _math, _noise, srgb

CACHE = Path(os.environ.get("POLYHAVEN_CACHE") or Path.home() / ".cache" / "skyline-rush" / "polyhaven")
RECORD = Path(__file__).resolve().parent.parent / "sources.json"
RUST = "rusty_painted_metal"   # its diffuse is the rust colour of every `rust` patch

MATS = {
    # scanned surfaces, unique UVs
    "crane":      dict(color=srgb(0.62, 0.64, 0.62), rough=0.5, scan="metal_plate_02", paint=0.7, rust=0.25, streak=0.45, normal=0.6),
    "hazard":     dict(color=srgb(0.82, 0.60, 0.07), rough=0.55, scan="metal_plate_02", paint=0.7, rust=0.3, streak=0.3, normal=0.5, stripes=0.7),
    "concrete":   dict(color=(1, 1, 1), rough=0.8, scan="concrete_wall_008", raw=1.0, streak=0.3, normal=1.0),
    "containers": dict(color=(1, 1, 1), rough=0.55, scan="container_side", paint=0.6, rust=0.35, streak=0.4, normal=1.0, cells=CELL, ribs=0.35),
    # dark navy, not 0.10 / 0.12 / 0.16: at 1 % linear albedo no flood shows the plating at night (build/lighting.py)
    "hull":       dict(color=srgb(0.17, 0.21, 0.28), rough=0.45, scan="metal_plate_02", paint=0.9, rust=0.2, streak=0.6, normal=0.6, plates=(6.0, 6.0, 2.5)),
    "boot":       dict(color=srgb(0.40, 0.09, 0.07), rough=0.6, scan="metal_plate_02", paint=0.9, rust=0.15, streak=0.2, normal=0.6, plates=(6.0, 6.0, 2.5)),
    "deckhouse":  dict(color=srgb(0.76, 0.76, 0.73), rough=0.45, scan="metal_plate_02", paint=0.5, rust=0.08, streak=0.45, normal=0.4,
                       windows=(2.2, 2.8, 10.5), lamp="window", emit=20),
    "cladding":   dict(color=srgb(0.70, 0.71, 0.70), rough=0.45, scan="box_profile_metal_sheet", paint=0.7, rust=0.12, streak=0.4, normal=1.0),
    "deck":       dict(color=srgb(0.24, 0.28, 0.25), rough=0.6, scan="metal_plate_02", paint=0.9, rust=0.3, normal=0.6),
    "brick":      dict(color=(1, 1, 1), rough=0.8, scan="red_bricks_04", raw=0.85, streak=0.25, normal=1.0),
    "stone":      dict(color=(1, 1, 1), rough=0.7, scan="large_sandstone_blocks", raw=1.0, crop=(0.19, 0.805), streak=0.2, normal=1.0),
    "steel_arch": dict(color=srgb(0.15, 0.19, 0.18), rough=0.42, scan="metal_plate_02", paint=0.7, rust=0.2, streak=0.35, normal=0.6, rivets=0.15),
    "patina":     dict(color=srgb(0.30, 0.50, 0.44), rough=0.5, scan="box_profile_metal_sheet", paint=0.7, streak=0.5, normal=1.0),
    "iron":       dict(color=srgb(0.11, 0.13, 0.12), rough=0.45, scan="metal_plate_02", paint=0.6, rust=0.15, normal=0.6),
    "grating":    dict(color=srgb(0.30, 0.31, 0.30), rough=0.6, scan="metal_plate_02", paint=0.5, rust=0.2, normal=0.5, treads=0.28),
    # flat swatch cells: thin bars, rods, cables, glass, paint marks
    "marking":    dict(color=srgb(0.86, 0.86, 0.82), rough=0.5),
    "steel_dark": dict(color=srgb(0.16, 0.18, 0.22), rough=0.42),
    "steel_bare": dict(color=srgb(0.62, 0.64, 0.66), rough=0.30, metal=1),
    "handrail":   dict(color=srgb(0.84, 0.64, 0.10), rough=0.5),
    "glass":      dict(color=srgb(0.05, 0.07, 0.09), rough=0.08),
    # lamps
    "sodium":        dict(color=srgb(1.0, 0.58, 0.18), level=0.85, emit=280),
    "flood":         dict(color=srgb(0.86, 0.93, 1.0), level=0.6, emit=200),
    "beacon":        dict(color=srgb(1.0, 0.12, 0.06), level=1.0, emit=30),
    "accent":        dict(color=srgb(0.10, 0.95, 1.0), level=0.45, emit=8),
    "window":        dict(color=srgb(1.0, 0.80, 0.52), level=0.55, emit=20),
    "lantern_amber": dict(color=srgb(1.0, 0.52, 0.18), level=0.95, emit=60),
    "lantern_red":   dict(color=srgb(1.0, 0.27, 0.12), level=0.95, emit=50),
    "lantern_gold":  dict(color=srgb(1.0, 0.72, 0.36), level=0.8, emit=60),
    "sign":          dict(color=srgb(1.0, 0.20, 0.10), level=0.9, emit=60),
    "dial":          dict(color=srgb(1.0, 0.88, 0.66), level=0.5, emit=15),
    "reefer":        dict(color=srgb(0.25, 1.0, 0.35), level=0.6, emit=4),
}
for _spec in MATS.values():   # lamp lenses: a plain plastic or glass cover
    _spec.setdefault("rough", 0.5)
# weathered shipping-container paints, picked by eye; no line's livery
PALETTE = [srgb(*c) for c in ((0.46, 0.13, 0.09), (0.12, 0.22, 0.40), (0.14, 0.33, 0.20), (0.64, 0.32, 0.09), (0.47, 0.48, 0.47),
                              (0.70, 0.70, 0.66), (0.33, 0.09, 0.09), (0.11, 0.36, 0.37))]


def lamp_of(name):
    """The lamp a surface lights with: its own name for a lamp cell, `lamp` for a lit pattern, else None."""
    spec = MATS[name]
    return spec.get("lamp", name) if spec.get("emit") else None


def _scan_files():
    """(set, map) -> local path, each file checked against sources.json."""
    paths = {}
    for entry in json.loads(RECORD.read_text(encoding="utf-8"))["sets"]:
        for rec in entry["files"]:
            path = CACHE.joinpath(*rec["path"].split("/"))
            if not path.exists():
                raise SystemExit(f"{rec['path']}: missing, run python3 -I assets-src/neon-landmarks/fetch_sources.py")
            if hashlib.sha256(path.read_bytes()).hexdigest() != rec["sha256"]:
                raise SystemExit(f"{rec['path']}: sha256 differs from sources.json")
            paths[entry["id"], rec["map"]] = (path, entry["metres"])
    return paths


_FILES = {}


def _image(asset, key):
    if not _FILES:
        _FILES.update(_scan_files())
    path, metres = _FILES[asset, key]
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "sRGB" if key == "Diffuse" else "Non-Color"
    return image, metres


def _mean(image):
    """Mean linear colour of an image (the flat swatch value of a raw scan, the reference of a painted one)."""
    px = np.zeros(len(image.pixels), np.float32)
    image.pixels.foreach_get(px)
    px = px.reshape(-1, 4)[:, :3]   # a byte image reads back as stored: sRGB-encoded for a colour map
    if image.colorspace_settings.name == "sRGB":
        px = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)
    return px.mean(axis=0)


def _node(nt, kind, **inputs):
    node = nt.nodes.new(kind)
    for key, value in inputs.items():
        if isinstance(value, bpy.types.NodeSocket):
            nt.links.new(value, node.inputs[key])
        else:
            node.inputs[key].default_value = value
    return node


def _vec(nt, op, a, b):
    node = nt.nodes.new("ShaderNodeVectorMath")
    node.operation = op
    for socket, value in zip(node.inputs, (a, b)):
        if isinstance(value, bpy.types.NodeSocket):
            nt.links.new(value, socket)
        elif value is not None:
            socket.default_value = value
    return node.outputs[0]


def _gray(nt, value):
    """A float socket as an (x, x, x) vector, to scale a colour."""
    return _node(nt, "ShaderNodeCombineXYZ", X=value, Y=value, Z=value).outputs[0]


def _mix(nt, fac, a, b):
    node = nt.nodes.new("ShaderNodeMix")
    node.data_type = "RGBA"
    for socket, value in ((node.inputs[0], fac), (node.inputs[6], a), (node.inputs[7], b)):
        if isinstance(value, bpy.types.NodeSocket):
            nt.links.new(value, socket)
        else:
            socket.default_value = value if not isinstance(value, tuple) or len(value) == 4 else (*value, 1)
    return node.outputs[2]


def _sample(nt, image, uv):
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = image
    nt.links.new(uv, node.inputs["Vector"])
    return node


def _scan_uv(nt, world, metres, crop):
    """World metres -> image units; `crop` keeps one band of rows of the image (v0, v1) and repeats it."""
    uv = _vec(nt, "MULTIPLY", world, (1 / metres, 1 / metres, 1))
    if not crop:
        return uv
    xyz = _node(nt, "ShaderNodeSeparateXYZ", Vector=uv)
    band = crop[1] - crop[0]
    v = _math(nt, "ADD", crop[0], _math(nt, "MULTIPLY", _math(nt, "FRACT", _math(nt, "DIVIDE", xyz.outputs[1], band)), band))
    return _node(nt, "ShaderNodeCombineXYZ", X=xyz.outputs[0], Y=v).outputs[0]


def _stripes(nt, value, period, width):
    """1 where fract(value / period) < width / period."""
    return _math(nt, "LESS_THAN", _math(nt, "FRACT", _math(nt, "DIVIDE", value, period)), width / period)


def _edge(nt, fract, size, width):
    """1 within `width` metres of either end of a cell `size` metres long (fract = position in the cell, 0..1)."""
    return _math(nt, "LESS_THAN", _math(nt, "MINIMUM", fract, _math(nt, "SUBTRACT", 1.0, fract)), width / size)


def _palette(nt, geometry, spacing):
    """One PALETTE colour per grid cell, picked by a hash of the cell index (shipping containers)."""
    floor = _vec(nt, "FLOOR", _cell(nt, geometry, spacing).outputs[0], None)
    noise = _node(nt, "ShaderNodeTexWhiteNoise", Vector=floor)
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    stops = ramp.color_ramp.elements
    while len(stops) < len(PALETTE):
        stops.new(0.5)
    for i, (stop, colour) in enumerate(zip(stops, PALETTE)):
        stop.position, stop.color = i / len(PALETTE), (*colour, 1)
    nt.links.new(noise.outputs["Value"], ramp.inputs["Fac"])
    return ramp.outputs["Color"]


def _container_marks(nt, geometry, normal):
    """(frame, casting, rods) masks of the container lattice: corner posts and rails, the corner castings, and the
    four lock rods plus the door split on the -y end of every container (its doors)."""
    fract = _node(nt, "ShaderNodeSeparateXYZ", Vector=_vec(nt, "FRACTION", _cell(nt, geometry, CELL).outputs[0], None))
    frame, casting = 0.0, 1.0
    for axis, width in enumerate((0.12, 0.15, 0.14)):
        in_plane = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", normal.outputs[axis]), 0.7)
        near = _edge(nt, fract.outputs[axis], CELL[axis], width)
        frame = _math(nt, "MAXIMUM", frame, _math(nt, "MULTIPLY", in_plane, near))
        corner = _edge(nt, fract.outputs[axis], CELL[axis], 0.2)
        casting = _math(nt, "MULTIPLY", casting, _math(nt, "MAXIMUM", corner, _math(nt, "SUBTRACT", 1.0, in_plane)))
    x = _math(nt, "MULTIPLY", fract.outputs[0], CELL[0])
    rods = 0.0
    for at, width in ((0.42, 0.04), (0.88, 0.04), (1.25, 0.02), (1.62, 0.04), (2.08, 0.04)):
        rods = _math(nt, "MAXIMUM", rods, _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, at)), width / 2))
    doors = _math(nt, "LESS_THAN", normal.outputs[1], -0.7)
    return frame, casting, _math(nt, "MULTIPLY", rods, doors)


def _windows(nt, world, normal, pitch_u, pitch_v, base):
    """(window, lit) masks: 1.2 x 1.0 m windows on a pitch_u x pitch_v grid from height `base`, walls only; about
    half of them lit, each at its own dimmer level."""
    xyz = _node(nt, "ShaderNodeSeparateXYZ", Vector=world)
    u, v = xyz.outputs[0], _math(nt, "SUBTRACT", xyz.outputs[1], base)
    fu, fv = _math(nt, "FRACT", _math(nt, "DIVIDE", u, pitch_u)), _math(nt, "FRACT", _math(nt, "DIVIDE", v, pitch_v))
    across = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", fu, 0.5)), 0.6 / pitch_u)
    up = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", fv, 0.55)), 0.5 / pitch_v)
    wall = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", normal.outputs[2]), 0.5)
    window = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", across, up), wall)
    cell = _node(nt, "ShaderNodeCombineXYZ", X=_math(nt, "FLOOR", _math(nt, "DIVIDE", u, pitch_u)),
                 Y=_math(nt, "FLOOR", _math(nt, "DIVIDE", v, pitch_v))).outputs[0]
    hashed = _node(nt, "ShaderNodeTexWhiteNoise", Vector=cell).outputs["Value"]
    on = _math(nt, "GREATER_THAN", hashed, 0.45)
    dim = _math(nt, "ADD", 0.55, _math(nt, "MULTIPLY", hashed, 0.45))
    return window, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", window, on), dim)


def _rivets(nt, world, spacing):
    """Height of rivet heads on a `spacing` grid (1 on a head, 0 between)."""
    cell = _vec(nt, "SUBTRACT", _vec(nt, "FRACTION", _vec(nt, "MULTIPLY", world, (1 / spacing, 1 / spacing, 1)), None), (0.5, 0.5, 0))
    flat = _vec(nt, "MULTIPLY", cell, (1, 1, 0))
    return _math(nt, "LESS_THAN", _vec_length(nt, flat), 0.016 / spacing)


def _vec_length(nt, vec):
    node = nt.nodes.new("ShaderNodeVectorMath")
    node.operation = "LENGTH"
    nt.links.new(vec, node.inputs[0])
    return node.outputs["Value"]


def source_material(name):
    """Bake-only material, the same rig as materials.source_material plus `normal` (the scan's normal map and the
    procedural relief, also fed to the diffuse shader, so the baked lamp light falls on the relief)."""
    spec = MATS[name]
    mat = bpy.data.materials.new("src_" + name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    geometry = nt.nodes.new("ShaderNodeNewGeometry")
    normal = _node(nt, "ShaderNodeSeparateXYZ", Vector=geometry.outputs["True Normal"])
    world = _node(nt, "ShaderNodeUVMap").outputs[0]
    world.node.uv_map = "world"
    color, rough, emit, relief, normal_out = spec["color"], spec["rough"], None, None, None
    spec["flat"] = spec["color"]
    if spec.get("scan"):
        diffuse_img, metres = _image(spec["scan"], "Diffuse")
        uv = _scan_uv(nt, world, metres, spec.get("crop"))
        diffuse = _sample(nt, diffuse_img, uv).outputs["Color"]
        arm = _node(nt, "ShaderNodeSeparateColor", Color=_sample(nt, _image(spec["scan"], "arm")[0], uv).outputs["Color"])
        nor = _sample(nt, _image(spec["scan"], "nor_gl")[0], uv).outputs["Color"]
        mean = _mean(diffuse_img)
        if spec.get("raw"):
            color = _vec(nt, "MULTIPLY", diffuse, (spec["raw"],) * 3)
            spec["flat"] = tuple(float(c) * spec["raw"] for c in mean)
        else:   # paint: the tint, lit and darkened by the scan's own light and dark
            lum = _math(nt, "DIVIDE", _node(nt, "ShaderNodeRGBToBW", Color=diffuse).outputs[0], float(mean @ (0.2126, 0.7152, 0.0722)))
            detail = _math(nt, "ADD", 1 - spec["paint"], _math(nt, "MULTIPLY", lum, spec["paint"]))
            base = _palette(nt, geometry, spec["cells"]) if spec.get("cells") else spec["color"]
            color = _vec(nt, "MULTIPLY", base, _gray(nt, detail))
        color = _vec(nt, "MULTIPLY", color, _gray(nt, arm.outputs[0]))
        rough = _math(nt, "ADD", spec["rough"] * 0.5, _math(nt, "MULTIPLY", arm.outputs[1], 0.5), clamp=True)
        normal_map = _node(nt, "ShaderNodeNormalMap", Color=nor, Strength=spec["normal"])
        normal_map.space, normal_map.uv_map = "TANGENT", "world"
        normal_out = normal_map.outputs["Normal"]
        if spec.get("ribs"):   # corrugation shading kept in the albedo too: it must still read where the normal map mips away
            ribs = _node(nt, "ShaderNodeSeparateColor", Color=nor).outputs[0]
            shade = _math(nt, "ADD", 1.0, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", ribs, 0.5), 2 * spec["ribs"]))
            color = _vec(nt, "MULTIPLY", color, _gray(nt, shade))
        if spec.get("rust"):
            rust_img = _image(RUST, "Diffuse")[0]
            rust = _sample(nt, rust_img, _scan_uv(nt, world, 2.2, None)).outputs["Color"]
            patches = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", _noise(nt, geometry.outputs["Position"], 0.35), 0.62, clamp=False), 8.0, clamp=True)
            amount = _math(nt, "MULTIPLY", patches, spec["rust"] * 2.5, clamp=True)
            color = _mix(nt, amount, color, _vec(nt, "MULTIPLY", rust, (0.7, 0.7, 0.7)))
            rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", amount, 0.3), clamp=True)
    if spec.get("streak"):
        streak = _noise(nt, geometry.outputs["Position"], 0.9, stretch=(1, 1, 0.06))
        wet = _math(nt, "SUBTRACT", 1.15, _math(nt, "MULTIPLY", streak, spec["streak"] * 1.3), clamp=True)
        color = _vec(nt, "MULTIPLY", color, _gray(nt, wet))
    if spec.get("cells"):
        frame, casting, rods = _container_marks(nt, geometry, normal)
        dark = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", frame, 0.3), _math(nt, "MULTIPLY", rods, 0.55))
        color = _mix(nt, dark, color, (0.02, 0.02, 0.02))
        color = _mix(nt, _math(nt, "MULTIPLY", casting, 0.85), color, (0.03, 0.03, 0.03))
        relief = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", frame, 0.6), _math(nt, "MAXIMUM", casting, rods))
    if spec.get("plates"):
        joint = _joints(nt, geometry, spec["plates"])
        color = _mix(nt, _math(nt, "MULTIPLY", joint, 0.35), color, (0.01, 0.01, 0.01))
        relief = _math(nt, "SUBTRACT", 0.0, joint)
    if spec.get("stripes"):
        xyz = _node(nt, "ShaderNodeSeparateXYZ", Vector=world)
        black = _stripes(nt, _math(nt, "ADD", xyz.outputs[0], xyz.outputs[1]), 0.8, 0.4)
        color = _mix(nt, _math(nt, "MULTIPLY", black, spec["stripes"] + 0.25, clamp=True), color, (0.015, 0.015, 0.015))
    if spec.get("treads"):
        gap = _stripes(nt, _node(nt, "ShaderNodeSeparateXYZ", Vector=world).outputs[1], spec["treads"], 0.07)
        color = _mix(nt, _math(nt, "MULTIPLY", gap, 0.9), color, (0.005, 0.005, 0.005))
        relief = _math(nt, "SUBTRACT", 0.0, gap)
    if spec.get("rivets"):
        relief = _rivets(nt, world, spec["rivets"])
        color = _mix(nt, _math(nt, "MULTIPLY", relief, 0.3), color, (0.3, 0.32, 0.3))
    if spec.get("windows"):
        window, lit = _windows(nt, world, normal, *spec["windows"])
        color = _mix(nt, window, color, srgb(0.04, 0.05, 0.06))
        rough = _math(nt, "SUBTRACT", rough, _math(nt, "MULTIPLY", window, 0.35), clamp=True)
        lamp = MATS[spec["lamp"]]
        emit = _vec(nt, "MULTIPLY", tuple(c * lamp["level"] for c in lamp["color"]), _gray(nt, lit))
    if relief is not None:
        bump = _node(nt, "ShaderNodeBump", Height=relief, Strength=0.6, Distance=0.02)
        if normal_out is not None:
            nt.links.new(normal_out, bump.inputs["Normal"])
        normal_out = bump.outputs["Normal"]
    if isinstance(color, tuple):
        color = (*color, 1)
    if emit is None:
        emit = (*(c * spec.get("level", 1) for c in spec["color"]), 1) if spec.get("emit") else (0, 0, 0, 1)
    emission, diffuse = nt.nodes.new("ShaderNodeEmission"), nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
    if normal_out is not None:
        nt.links.new(normal_out, diffuse.inputs["Normal"])
    output, target = nt.nodes.new("ShaderNodeOutputMaterial"), nt.nodes.new("ShaderNodeTexImage")
    nt.nodes.active = target
    return mat, dict(color=color, rough=rough, metal=float(spec.get("metal", 0)), emit=emit, mask=1.0,
                     emission=emission, diffuse=diffuse, output=output, target=target, power=spec.get("emit", 0))
