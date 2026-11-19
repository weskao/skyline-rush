"""Builds the Sky Spiral landmark kit: sixteen modelled pieces on one material and one atlas.

  python3 -I assets-src/spiral-landmarks/fetch_sources.py   (once: the CC0 scans, outside the repo)
  blender --background --factory-startup --python assets-src/spiral-landmarks/build.py

Writes spiral-landmarks.blend, textures/ and contract.json next to this file. build/atlas.py composes the atlas
from the scans (no render bake: the day look lights the kit at run time), build/pieces.py and build/sky.py model the
pieces with build/mesh.py, in the game's axes; this file wires the one material, checks every piece against the node contract
and saves. Nothing here depends on the machine: same inputs, same pieces, textures and contract. The .blend's
bytes differ on every save, so a rebuild is followed by export, optimise, check and new hashes in the manifest.
"""
import json
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "build"))
import atlas  # noqa: E402
from pieces import CAPS, CORE, STRUT, build_all  # noqa: E402
from sky import AIRSHIP, SHOULDER, WINGSPAN  # noqa: E402

MATERIAL = "spiral_landmarks"
# where the runtime puts each piece (the placement itself is the runtime's: src/, not this kit)
PLACE = {
    "tower": "1: axis on the spiral's axis, y = 0 at the helix-entry road level; the light strip faces +Z",
    "tower_far": "the same pivot, drawn instead of `tower` at distance: same outline, UVs and material",
    "strut": "origin at the deck end, +X toward the tower axis; 170 m long, its far end sinks into the 40 m core",
    "platform_a": "floating: origin at the deck centre, deck top y = 0",
    "platform_b": "floating: origin at the deck centre, deck top y = 0; 48 m along X, 30 m along Z",
    "station": "origin at the base centre, y = 0 base; 30 m along X",
    "chevron_sign": "origin at the post base; the board faces +Z, chevrons point +X (a half turn about Y points them -X)",
    "gap_marker": "origin at the base, at a launch-gap edge",
    "cloud_a": "origin at the centre of the flat underside", "cloud_b": "origin at the centre of the flat underside",
    "cloud_c": "origin at the centre of the flat underside",
    "peak": "origin at the base centre; the base ring (y = 0) goes under the cloud sea",
    "bird_body": "flying: origin at the body's centre, beak toward -Z; draw both wings on the same pivot",
    "bird_wing_l": "the body's pivot; to flap, turn it about Z through its shoulder (`bird.shoulders`), not its origin",
    "bird_wing_r": "the body's pivot; to flap, turn it about Z through its shoulder (`bird.shoulders`), not its origin",
    "airship": "flying: origin at the hull's centre, nose toward -Z",
}


def delivery_material(images):
    """The shipped material, wired the way the glTF exporter maps 1:1. The same wiring as the Neon landmark kit's
    (assets-src/neon-landmarks/build/materials.py); kept here so one kit's build never imports another's."""
    mat = bpy.data.materials.new(MATERIAL)
    mat.use_nodes = True
    mat.use_backface_culling = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

    def image(img):
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        return node.outputs["Color"]

    nt.links.new(image(images["base"]), bsdf.inputs["Base Color"])
    nt.links.new(image(images["emissive"]), bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.0
    split = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(image(images["orm"]), split.inputs["Color"])
    nt.links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])
    group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    occlusion = nt.nodes.new("ShaderNodeGroup")
    occlusion.node_tree = group
    nt.links.new(split.outputs["Red"], occlusion.inputs["Occlusion"])
    bump = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(image(images["normal"]), bump.inputs["Color"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def check(name, m):
    """The node contract, on the authored mesh."""
    lo, hi = m.bounds()
    assert m.triangles() <= CAPS[name], f"{name}: {m.triangles()} triangles is over {CAPS[name]}"
    if name.startswith("tower"):
        assert (lo[1], hi[1]) == (-140, 400), f"{name} spans y {lo[1]} .. {hi[1]}"
        span = [p for p in m.verts if -10 <= p.y <= 115]
        reach = [(p.x ** 2 + p.z ** 2) ** 0.5 for p in span]
        assert min(reach) > CORE - 1 and max(reach) < CORE + 3.1, f"{name}: radius {min(reach)} .. {max(reach)} in the strut span (rib roots sink 0.6 m)"
        assert sum(abs(r - CORE) < 1e-3 for r, p in zip(reach, span) if p.y in (-10, 115)), f"{name}: no {CORE} m ring at the strut span's ends"
    if name == "strut":
        assert (lo[0], hi[0], hi[1]) == (0, STRUT, -0.5), f"strut: x {lo[0]} .. {hi[0]}, top {hi[1]}"
    if name.startswith("bird_wing"):   # each wing wholly on its own side of its shoulder, out to half the span
        side = 1 if name.endswith("r") else -1
        assert sorted((side * lo[0], side * hi[0])) == [SHOULDER[0], WINGSPAN / 2], f"{name}: x {lo[0]} .. {hi[0]}"
    if name == "airship":
        assert (lo[2], hi[2]) == (-AIRSHIP / 2, AIRSHIP / 2), f"airship: z {lo[2]} .. {hi[2]}"
    if name != "strut" and not name.startswith(("tower", "platform", "bird", "airship")):
        assert lo[1] == 0, f"{name}: base at y = {lo[1]}"
    return dict(triangles=m.triangles(), triangle_cap=CAPS[name], min=lo, max=hi, place=PLACE[name])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    images, stats = atlas.build(MATERIAL)
    material = delivery_material(images)
    nodes = {}
    for m in build_all():
        nodes[m.name] = check(m.name, m)
        scene.collection.objects.link(m.build(material))
        print(f"{m.name}: {m.triangles()} triangles, {nodes[m.name]['min']} .. {nodes[m.name]['max']}", flush=True)
    assert list(nodes) == list(CAPS), "a piece is missing or out of order"
    (HERE / "contract.json").write_text(json.dumps(dict(
        glb="public/models/spiral-landmarks/spiral-landmarks.glb", material=MATERIAL,
        axes="Y up, metres; each node's origin is its pivot (a bird wing also turns about its shoulder)",
        tower=dict(core_radius=CORE, strut_span_y=[-10, 115], strip_side="+Z"), strut=dict(length=STRUT, top_y=-0.5),
        # the wings' vertices are authored about the body's pivot: a flap is T(shoulder) R(Z) T(-shoulder)
        bird=dict(wingspan=WINGSPAN, forward="-Z", flap_axis="Z",
                  shoulders=dict(bird_wing_l=[-SHOULDER[0], SHOULDER[1], 0], bird_wing_r=[SHOULDER[0], SHOULDER[1], 0])),
        airship=dict(length=int(AIRSHIP), forward="-Z"),
        emissive="blue only; `lamps` gives each lamp's stored linear colour and luminance (0.2126, 0.7152, 0.0722). "
                 "The runtime's emissive strength multiplies it: the kit sets none.",
        **stats, nodes=nodes), indent=2) + "\n", encoding="utf-8")
    # libraries.write keeps the file free of UI state and of the absolute paths a normal save records
    path = str(HERE / "spiral-landmarks.blend")
    bpy.data.libraries.write(path, {scene}, path_remap="RELATIVE", compress=False)
    print("saved", Path(path).name, sum(n["triangles"] for n in nodes.values()), "triangles")


main()
