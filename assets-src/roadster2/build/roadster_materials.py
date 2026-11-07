"""Named materials for the Roadster 2 master. Names are the contract with the runtime:
*_paint is tinted per car by the Garage, *_light is driven as emissive by the brake light."""
import bpy

# name: (base colour rgb, metallic, roughness, extra)
_SPEC = {
    "roadster_paint": ((0.90, 0.91, 0.906), 0.13, 0.19, {"coat": 0.88, "coat_rough": 0.10}),
    "roadster_glass": ((0.17, 0.13, 0.09), 0.04, 0.075, {"coat": 0.96, "coat_rough": 0.065, "cull": False}),
    "roadster_trim": ((0.04, 0.07, 0.09), 0.35, 0.30, {}),
    "roadster_carbon": ((0.13, 0.17, 0.19), 0.20, 0.37, {}),
    "roadster_tire": ((0.06, 0.06, 0.07), 0.0, 0.80, {}),
    "roadster_rim": ((0.84, 0.86, 0.86), 0.70, 0.28, {}),
    "roadster_light": ((0.0, 0.0, 0.0), 0.0, 0.5, {"emit": (1.0, 0.02, 0.05), "emit_strength": 2.2}),
    "roadster_lamp": ((0.0, 0.0, 0.0), 0.0, 0.5, {"emit": (0.8, 0.9, 1.0), "emit_strength": 3.0}),
    "roadster_nozzle": ((0.35, 0.29, 0.23), 0.80, 0.35, {}),
    "roadster_fan": ((0.165, 0.219, 0.254), 0.65, 0.45, {}),  # car-model.js fanMaterial #71818a (linear), metal .65, rough .45
}


def make_materials():
    out = {}
    for name, (rgb, metal, rough, extra) in _SPEC.items():
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Metallic"].default_value = metal
        bsdf.inputs["Roughness"].default_value = rough
        if "coat" in extra:
            bsdf.inputs["Coat Weight"].default_value = extra["coat"]
            bsdf.inputs["Coat Roughness"].default_value = extra["coat_rough"]
        if "emit" in extra:
            bsdf.inputs["Emission Color"].default_value = (*extra["emit"], 1.0)
            bsdf.inputs["Emission Strength"].default_value = extra["emit_strength"]
        if not extra.get("cull", True):
            mat.use_backface_culling = False
        out[name] = mat
    return out
