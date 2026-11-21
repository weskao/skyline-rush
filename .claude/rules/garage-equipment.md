---
paths:
  - "src/garage-*.ts"
  - "src/garage-*.js"
  - "src/Garage*.vue"
  - "src/appearance.ts"
  - "src/car-catalog.ts"
  - "src/car-model.js"
  - "tests/garage-*"
  - "tests/crimson-gt-browser.spec.js"
---

# Garage equipment works on every car

Every new or updated Garage item, including paints, cosmetics, and vehicle-mounted VFX,
must preview and equip correctly on every selectable car. Use the shared equipment catalog
and application path. Fit model-dependent effects to the active car's geometry or attachment
points so the same equipment also works when a new car is added.
For new paint IDs, names and artwork, follow `.claude/rules/raster-artwork.md`.

Changing car models carries forward the equipped paint and any live paint preview. Persist
only the equipped paint for the new car, and let the shared model loader warm the replacement
before drawing it. Guards: `tests/crimson-gt-browser.spec.js` and `tests/garage-model.test.js`.

Verify each changed item on every selectable car. Check the Garage preview and the equipped
appearance after switching cars, including the home showcase and races where the item appears.
