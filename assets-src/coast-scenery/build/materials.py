"""Named PBR materials for the Coast scenery master. Names are the runtime contract (model-manifest.ts).

Wiring is the subset the Blender glTF exporter maps 1:1: Image -> Base Color (sRGB), Image (Non-Color)
-> Separate Color G -> Roughness and R -> glTF Material Output.Occlusion (one shared ARM image), Image
(Non-Color) -> Normal Map -> Normal. Vertex colour -> Base Color for the fronds (glTF COLOR_0).
"""
import bpy


def _gltf_output_group():
    """The exporter's custom 'glTF Material Output' group: its Occlusion input becomes occlusionTexture."""
    group = bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    return group


def _base(name, double_sided):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = not double_sided
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    return mat, nt, bsdf


def _image(nt, img, extension="REPEAT"):
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    node.extension = extension
    return node


def _normal(nt, bsdf, img, extension="REPEAT"):
    tex = _image(nt, img, extension)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tex.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])


def scan_material(name, diff, arm):
    """Photoscan: albedo + ARM (AO, roughness; metal 0). The baked normal is wired by attach_normal()."""
    mat, nt, bsdf = _base(name, double_sided=True)  # scans are open shells: their backs must not vanish
    nt.links.new(_image(nt, diff).outputs["Color"], bsdf.inputs["Base Color"])
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(_image(nt, arm).outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 0.0
    out = nt.nodes.new("ShaderNodeGroup")
    out.node_tree = _gltf_output_group()
    nt.links.new(sep.outputs["Red"], out.inputs["Occlusion"])
    return mat


def attach_normal(mat, img):
    nt = mat.node_tree
    _normal(nt, next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), img)


def bark_material(name, diff, nrm, roughness):
    mat, nt, bsdf = _base(name, double_sided=False)
    nt.links.new(_image(nt, diff).outputs["Color"], bsdf.inputs["Base Color"])
    _normal(nt, bsdf, nrm)
    bsdf.inputs["Roughness"].default_value = roughness  # palm_bark rough map is flat (0.90-0.96): a factor is enough
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def frond_material(name):
    mat, nt, bsdf = _base(name, double_sided=True)  # single-sided leaflet sheets, seen from below and above
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def steel_material(name, rough, nrm, base_rgb):
    """Galvanized steel: metal 1, roughness + normal from a seam-free crop of a metal-plate scan,
    mirrored on repeat (glTF MIRRORED_REPEAT) so the crop tiles without seams."""
    mat, nt, bsdf = _base(name, double_sided=False)
    bsdf.inputs["Base Color"].default_value = (*base_rgb, 1.0)
    bsdf.inputs["Metallic"].default_value = 1.0
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(_image(nt, rough, "MIRROR").outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    _normal(nt, bsdf, nrm, "MIRROR")
    return mat
