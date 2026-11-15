"""Materials of the Neon landmark kit.

MATS are the authored surfaces of the nine pieces of the 4000 m lap: procedural, project-made, no outside source.
They exist only to be baked into `neon_landmarks`, which reads three atlases (base colour, emissive,
occlusion-roughness-metal). The order of MATS is the order of the flat-colour swatch cells along the top of the
atlas. The harbour and oldtown pieces bake their own set (sector_materials.py); show_channel and
delivery_material serve both.
"""
import bpy


def srgb(*rgb):
    """A colour picked by eye (sRGB) as the linear value the shader and the bake work in."""
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb)


# colour, roughness, metal; grain = colour noise depth; streak = vertical rain staining; grid = (joint spacing m,
# joint darkening); emit = watts per square metre the lamp throws into the baked light spill (its own colour is
# stored at full value: the runtime sets the brightness, asset-brief.md "Emissive ranges").
MATS = {
    "concrete":   dict(color=srgb(0.47, 0.46, 0.45), rough=0.62, metal=0, grain=0.25, streak=0.35),
    "stone":      dict(color=srgb(0.36, 0.37, 0.41), rough=0.42, metal=0, grain=0.20, streak=0.15, grid=(1.2, 0.5)),
    "tile":       dict(color=srgb(0.42, 0.30, 0.18), rough=0.36, metal=0, grain=0.15, grid=(0.3, 0.55)),
    "paving":     dict(color=srgb(0.33, 0.33, 0.37), rough=0.28, metal=0, grain=0.18, grid=(0.6, 0.45)),
    "ballast":    dict(color=srgb(0.20, 0.19, 0.18), rough=0.90, metal=0, grain=0.50),
    "steel_dark": dict(color=srgb(0.16, 0.18, 0.22), rough=0.42, metal=0, grain=0.15, streak=0.2),
    "steel_arch": dict(color=srgb(0.60, 0.63, 0.68), rough=0.38, metal=1, grain=0.12, streak=0.25, grid=(3.0, 0.3)),
    "steel_teal": dict(color=srgb(0.12, 0.33, 0.35), rough=0.40, metal=0),
    "steel_bare": dict(color=srgb(0.62, 0.64, 0.66), rough=0.30, metal=1),
    "crystal":    dict(color=srgb(0.80, 0.76, 0.90), rough=0.20, metal=1, grain=0.06),
    "amber":      dict(color=srgb(1.0, 0.62, 0.18), rough=0.5, metal=0, emit=320),
    "cyan":       dict(color=srgb(0.10, 0.95, 1.0), rough=0.5, metal=0, emit=25),
    "violet":     dict(color=srgb(0.74, 0.22, 1.0), rough=0.5, metal=0, emit=160),
    "pink":       dict(color=srgb(1.0, 0.16, 0.72), rough=0.5, metal=0, emit=120),
}


def _math(nt, op, a, b=None, clamp=False):
    node = nt.nodes.new("ShaderNodeMath")
    node.operation, node.use_clamp = op, clamp
    for socket, value in zip(node.inputs, (a, b)):
        if isinstance(value, (int, float)):
            socket.default_value = value
        elif value is not None:
            nt.links.new(value, socket)
    return node.outputs[0]


def _noise(nt, position, scale, stretch=(1, 1, 1)):
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = stretch
    nt.links.new(position, mapping.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value, noise.inputs["Detail"].default_value = scale, 6
    nt.links.new(mapping.outputs[0], noise.inputs["Vector"])
    return noise.outputs[0]


def _cell(nt, geometry, spacing):
    """Position divided by the grid spacing: one number, or (x, y, z) for a box grid."""
    scaled = nt.nodes.new("ShaderNodeVectorMath")
    scaled.operation = "MULTIPLY"
    scaled.inputs[1].default_value = [1 / s for s in (spacing if isinstance(spacing, tuple) else (spacing,) * 3)]
    nt.links.new(geometry.outputs["Position"], scaled.inputs[0])
    return scaled


def _joints(nt, geometry, spacing):
    """1 on the joint lines of a `spacing` grid, 0 elsewhere. Only the two axes in the face's plane draw lines."""
    spacing = spacing if isinstance(spacing, tuple) else (spacing,) * 3
    scaled = _cell(nt, geometry, spacing)
    fract = nt.nodes.new("ShaderNodeVectorMath")
    fract.operation = "FRACTION"
    nt.links.new(scaled.outputs[0], fract.inputs[0])
    cell, normal = nt.nodes.new("ShaderNodeSeparateXYZ"), nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(fract.outputs[0], cell.inputs[0])
    nt.links.new(geometry.outputs["True Normal"], normal.inputs[0])
    line = 0.0
    for axis in range(3):
        in_plane = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", normal.outputs[axis]), 0.7)
        on_joint = _math(nt, "LESS_THAN", cell.outputs[axis], 0.02 / spacing[axis] + 0.012)
        line = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", in_plane, on_joint), line)
    return line


def source_material(name):
    """Bake-only material: an Emission shader whose colour build.py points at one channel at a time."""
    spec = MATS[name]
    mat = bpy.data.materials.new("src_" + name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    geometry = nt.nodes.new("ShaderNodeNewGeometry")
    shade, rough = 1.0, spec["rough"]
    if spec.get("grain"):
        grain = _noise(nt, geometry.outputs["Position"], 1.7)
        shade = _math(nt, "ADD", 1 - spec["grain"], _math(nt, "MULTIPLY", grain, 2 * spec["grain"]))
        rough = _math(nt, "ADD", spec["rough"] - 0.12, _math(nt, "MULTIPLY", grain, 0.24), clamp=True)
    if spec.get("streak"):
        streak = _noise(nt, geometry.outputs["Position"], 0.9, stretch=(1, 1, 0.06))
        wet = _math(nt, "SUBTRACT", 1.15, _math(nt, "MULTIPLY", streak, spec["streak"] * 1.3), clamp=True)
        shade = _math(nt, "MULTIPLY", shade, wet)
    grid = spec.get("grid")
    if grid:
        joint = _joints(nt, geometry, grid[0])
        shade = _math(nt, "MULTIPLY", shade, _math(nt, "SUBTRACT", 1.0, _math(nt, "MULTIPLY", joint, grid[1])))
        rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", joint, 0.3), clamp=True)
    color = nt.nodes.new("ShaderNodeVectorMath")
    color.operation = "SCALE"
    color.inputs[0].default_value = spec["color"]
    if isinstance(shade, float):
        color.inputs["Scale"].default_value = shade
    else:
        nt.links.new(shade, color.inputs["Scale"])
    emission, diffuse = nt.nodes.new("ShaderNodeEmission"), nt.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
    output, target = nt.nodes.new("ShaderNodeOutputMaterial"), nt.nodes.new("ShaderNodeTexImage")
    nt.nodes.active = target
    emit = (*spec["color"], 1) if spec.get("emit") else (0, 0, 0, 1)
    return mat, dict(color=color.outputs[0], rough=rough, metal=float(spec["metal"]), emit=emit, mask=1.0,
                     emission=emission, diffuse=diffuse, output=output, target=target, power=spec.get("emit", 0))


def show_channel(mat, rig, channel, image):
    """Point one source material at a bake pass: a surface channel as emission, or the lamp-light set-up
    ('spill': lamps emit at their power, every other surface is plain white diffuse)."""
    nt = mat.node_tree
    rig["target"].image = image
    color = rig["emission"].inputs["Color"]
    for link in list(color.links):
        nt.links.remove(link)
    rig["emission"].inputs["Strength"].default_value = 1.0
    lit = channel == "normal" or channel == "spill" and not rig["power"]
    value = rig["emit" if channel == "spill" else channel] if channel != "normal" else 0.0
    if channel == "spill":
        rig["emission"].inputs["Strength"].default_value = rig["power"]
    if isinstance(value, float):
        color.default_value = (value, value, value, 1)
    elif isinstance(value, tuple):
        color.default_value = value
    else:
        nt.links.new(value, color)
    nt.links.new((rig["diffuse"] if lit else rig["emission"]).outputs[0], rig["output"].inputs["Surface"])


def delivery_material(base, emissive, orm, name="neon_landmarks", normal=None):
    """A shipped material, wired the way the glTF exporter maps 1:1 (same subset as Coast scenery, plus a
    tangent-space normal map when given)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

    def image(img):
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        return node.outputs["Color"]

    nt.links.new(image(base), bsdf.inputs["Base Color"])
    nt.links.new(image(emissive), bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.0
    split = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(image(orm), split.inputs["Color"])
    nt.links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])
    group = bpy.data.node_groups.get("glTF Material Output") or bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    if not group.interface.items_tree:
        group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    occlusion = nt.nodes.new("ShaderNodeGroup")
    occlusion.node_tree = group
    nt.links.new(split.outputs["Red"], occlusion.inputs["Occlusion"])
    if normal:
        bump = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(image(normal), bump.inputs["Color"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat
