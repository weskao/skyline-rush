# Garage paint artwork (@3x)

Six original 960×510 WebP car-body thumbnails are stored here at **3× design density**, so the nominal layout size is 320×170 CSS pixels, further responsive to the collection grid. The game renders assets at **1× UI size**, never upsizes raster imagery at runtime.

Original artwork:
- pearl@3x.webp, aurora@3x.webp, glacier@3x.webp
- coral@3x.webp, cobalt@3x.webp, obsidian@3x.webp

Names and status labels remain live Vue DOM, not baked into artwork. The image URL respects Vite's BASE_URL for GitHub Pages.

The Medium/High card glint is a compositor-friendly CSS sweep, while actual Garage Three.js body paint uses a MeshPhysicalMaterial clearcoat and animated fragment shader sweep. Low, VFX-off, comfortable mode, and Reduced Motion keep the artwork static and disable the sheen. No extra canvas or per-frame GPU material allocation.

Unlock/ownership logic and free-trial release policy are unchanged.