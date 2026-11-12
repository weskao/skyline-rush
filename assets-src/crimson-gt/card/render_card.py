"""Renders the Garage "factory" paint card from the Crimson GT master itself: the car's own body in its factory red,
framed like the six painted cards (front three-quarter close-up on the dark showroom blue). The master is the
source; nothing is saved back into it.

  "$BLENDER_BIN" --background --python assets-src/crimson-gt/card/render_card.py -- <out.png>
  cwebp -q 90 <out.png> -o public/feature-assets/garage-vfx-skins/paint-cards/factory@3x.webp

960x510 is 3x the 320x170 card (.claude/rules/raster-artwork.md).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SIZE = (960, 510)
TARGET = Vector((0.30, 0.95, 0.52))    # front-left wheel arch and headlight (Blender: +Y is the nose, Z up)
CAMERA = Vector((3.30, 5.60, 1.05))
LENS = 62

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "..", "crimson-gt.blend"))
scene = bpy.context.scene


def look_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, target, size, energy, color):
    light = bpy.data.lights.new(name, "AREA")
    light.shape = "RECTANGLE"
    light.size, light.size_y = size
    light.energy = energy
    light.color = color
    obj = bpy.data.objects.new(name, light)
    obj.location = location
    scene.collection.objects.link(obj)
    look_at(obj, Vector(target))


camera = bpy.data.objects.new("card_camera", bpy.data.cameras.new("card_camera"))
camera.location = CAMERA
camera.data.lens = LENS
scene.collection.objects.link(camera)
look_at(camera, TARGET)
scene.camera = camera

# Showroom: a dark blue room, one long strip overhead for the streak along the hood, a cool rim from behind.
world = bpy.data.worlds.new("card_world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.02, 0.05, 1)
scene.world = world
area("card_strip", (1.2, 2.4, 3.2), (0.3, 0.8, 0.6), (0.5, 7.0), 650, (1.0, 0.96, 0.92))
area("card_fill", (5.0, 4.5, 1.6), (0.6, 1.2, 0.6), (3.0, 2.0), 150, (0.85, 0.92, 1.0))
area("card_rim", (-2.5, -3.5, 2.4), (0.0, 0.5, 0.7), (4.0, 1.0), 700, (0.25, 0.6, 1.0))

floor_mesh = bpy.data.meshes.new("card_floor")
s = 30
floor_mesh.from_pydata([(-s, -s, 0.02), (s, -s, 0.02), (s, s, 0.02), (-s, s, 0.02)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("card_floor", floor_mesh)
floor_mat = bpy.data.materials.new("card_floor")
floor_mat.use_nodes = True
bsdf = next(n for n in floor_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Base Color"].default_value = (0.004, 0.012, 0.03, 1)
bsdf.inputs["Roughness"].default_value = 0.22
floor_mesh.materials.append(floor_mat)
scene.collection.objects.link(floor)

# Path-traced strip lights read the flake far harder than the game's lighting does: at card size the highlight turns
# to frost. The card renders the flake at a third of the master's strength; the master keeps its own value.
paint = bpy.data.materials["gt_paint"].node_tree
flake = next(l.from_node for l in paint.links if l.to_node.type == "BSDF_PRINCIPLED" and l.to_socket.identifier == "Normal")
flake.inputs["Strength"].default_value /= 3

scene.render.engine = "CYCLES"
scene.cycles.samples = 600
scene.cycles.use_denoising = False  # the denoiser smears the flake sparkle into frost
scene.render.resolution_x, scene.render.resolution_y = SIZE
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = sys.argv[sys.argv.index("--") + 1]
bpy.ops.render.render(write_still=True)
print("CARD_RENDERED", scene.render.filepath, math.degrees(camera.data.angle))
