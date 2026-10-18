# Skyline Rush visual direction

Experience mode: the playable world fills the viewport. A coastal expressway at dusk, warm peach sky, dark blue water and a distant city. White electric sports car, red rear light bar and four underbody lift ports echo the supplied image. A narrow white editorial wordmark, coral accent and restrained telemetry frame the scene. The intro sits to the left while the car and road remain visible; racing hides the intro. Responsive HUD and large touch controls preserve the driving view.

No downloaded car models, Tesla logos, stock imagery or online asset dependencies. The car and road are real WebGL geometry. Fuel and altitude remain visible so flight's limits are understandable.

## Immersive flight and collision update

The dusk coast now has layered clouds, a warm sunset reflection, illuminated city windows, suspension spans, cyan rail lighting and aerial guide rings. Bloom and a restrained lens pass carry the light; the road and vehicle silhouette remain legible. Flight vapor, collision sparks and touchdown dust share one bounded particle pool.

The motion vocabulary is energetic but tied to events: steering banks the car, acceleration opens the field of view, contact causes a short damped jolt and chromatic separation, and touchdown releases a brief surface dust wash. OS reduced-motion preference disables camera shake, camera banking, dynamic FOV and speed streaks; the flight instructions remain available.

Flight instruments show ascent/cruise/descent/touchdown, vertical speed, altitude, remaining thrust seconds, charge and the next useful action. Orange collision reports show contact type and speed lost. Touch controls include boost, expose pressed states and support a 320px viewport.

Lift is visualized as air movement: faint gray-blue wisps accelerate downward from the four ports, inherit vehicle momentum, broaden through entrainment and disperse into a slowing outward wash at the road surface. There are no solid light columns or lift illumination. The wake follows each car's bank and pitch, fades smoothly after thrust stops and becomes sparser with reduced motion. Player and rival wakes share the existing 480-particle GPU pool; distant cars have a smaller emission budget.
