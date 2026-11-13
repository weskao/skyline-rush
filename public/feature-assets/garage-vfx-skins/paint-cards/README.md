# Garage paint artwork (@3x)

Six original 960×510 WebP car-body thumbnails are stored here at **3× design density**, so the nominal layout size is 320×170 CSS pixels, further responsive to the collection grid. The game renders assets at **1× UI size**, never upsizes raster imagery at runtime.

Original artwork:
- pearl@3x.webp, aurora@3x.webp, glacier@3x.webp
- coral@3x.webp, cobalt@3x.webp, obsidian@3x.webp

Car factory finish:
- `factory@3x.webp` uses the same front-quarter crop and blue studio light as the paint collection. The
  `coral@3x.webp` artwork was the image reference for a factory crimson (`#9a1424`) variant. The generator output
  was downsampled to the 960×510 runtime card size.
- The car picker uses separate 432×198 transparent WebPs in `../car-picker/`. The Crimson GT thumbnail
  reframes the car geometry used for the previous factory artwork (`assets-src/crimson-gt/build.py` and its
  Blender master). The Roadster thumbnail uses the actual procedural car from `src/car-model.js`. Both are
  rendered under the same studio light rig, with the full wheels and wing visible, at up to 144×66 CSS pixels.

Names and status labels remain live Vue DOM, not baked into artwork. The image URL respects Vite's BASE_URL for GitHub Pages.

The Medium/High card glint is a compositor-friendly CSS sweep, while actual Garage Three.js body paint uses a MeshPhysicalMaterial clearcoat and animated fragment shader sweep. Low, VFX-off, comfortable mode, and Reduced Motion keep the artwork static and disable the sheen. No extra canvas or per-frame GPU material allocation.

Unlock/ownership logic and free-trial release policy are unchanged.