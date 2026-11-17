"""Renders the Crimson GT car-picker card from the car master: a front three-quarter of the right flank, nose to the
right, on a transparent background (opaque black glass, as shipped). The master is the source; nothing is saved back.

  "$BLENDER_BIN" --background --factory-startup --python assets-src/crimson-gt/card/render_picker.py -- <out.png>

Then trim to the alpha box and fit 432x198 (3x the 144x66 picker slot) with a few pixels of clear border, and encode:
  magick <out.png> -trim -resize 424x190 -background none -gravity center -extent 432x198 <card.png>
  cwebp -q 90 -alpha_q 100 -exact <card.png> -o public/feature-assets/garage-public/car-picker/crimson-gt@3x.webp
"""
import glob
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = Vector((0.0, 0.25, 0.48))     # Blender space: +Y is the nose, Z up; just ahead of mid-car
CAMERA = Vector((10.5, 4.2, 2.9))      # off the right front quarter, a little above the roof
LENS = 85

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "..", "crimson-gt.blend"))
scene = bpy.context.scene

camera = bpy.data.objects.new("picker_camera", bpy.data.cameras.new("picker_camera"))
camera.location = CAMERA
camera.data.lens = LENS
camera.rotation_euler = (TARGET - CAMERA).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(camera)
scene.camera = camera

# Studio HDRI for the reflections; the background itself renders transparent.
world = bpy.data.worlds.new("picker_world")
world.use_nodes = True
env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(glob.glob(os.path.join(os.path.dirname(bpy.app.binary_path), "..", "Resources", "*",
                                                        "datafiles", "studiolights", "world", "studio.exr"))[0])
background = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs["Strength"].default_value = 2.2
world.node_tree.links.new(env.outputs["Color"], background.inputs["Color"])
scene.world = world

# The paint card's reason holds here too: path tracing reads the flake far harder than the game, so a third of it.
paint = bpy.data.materials["gt_paint"].node_tree
flake = next(l.from_node for l in paint.links if l.to_node.type == "BSDF_PRINCIPLED" and l.to_socket.identifier == "Normal")
flake.inputs["Strength"].default_value /= 3

scene.render.engine = "CYCLES"
scene.cycles.samples = 256
scene.render.resolution_x, scene.render.resolution_y = 1500, 690
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = sys.argv[sys.argv.index("--") + 1]
bpy.ops.render.render(write_still=True)
print("PICKER_RENDERED", scene.render.filepath)
