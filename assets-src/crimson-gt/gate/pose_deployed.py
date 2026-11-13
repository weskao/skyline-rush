"""Writes a copy of crimson-gt.blend with the wing raised, for the forms gate: the rear three-quarter panel shows the
wing deployed, the other three show the car without it, and the master rests stowed. The pose is the runtime's
raise = 1 (src/roadster-fidelity.js poseRoadsterWing): the `wing` pivot up by RAISE, the blade tilted RAISE_TILT.

  "$BLENDER_BIN" --background --python assets-src/crimson-gt/gate/pose_deployed.py -- <out.blend>
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "roadster2", "build"))

from roadster_parts import RAISE, RAISE_TILT  # noqa: E402

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "..", "crimson-gt.blend"))
bpy.data.objects["wing"].location.z += RAISE            # Blender Z is three.js Y
bpy.data.objects["wing_blade"].rotation_euler.x = -RAISE_TILT
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[sys.argv.index("--") + 1], copy=True)
