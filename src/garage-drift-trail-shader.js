export const driftVertex = /* glsl */ `
  attribute vec3 birthAlongStrength;
  varying vec2 vTrail;
  varying float vBorn, vStrength;
  void main() {
    vTrail = vec2(uv.x, birthAlongStrength.y);
    vBorn = birthAlongStrength.x;
    vStrength = birthAlongStrength.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`;

export const driftFragment = /* glsl */ `
  uniform float time, style, motion, detail, life;
  uniform vec3 tint, core;
  varying vec2 vTrail;
  varying float vBorn, vStrength;

  float band(float x, float center, float width) {
    return 1. - smoothstep(width * .32, width, abs(x - center));
  }
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float triangle(float x) { return 1. - abs(fract(x) * 2. - 1.); }

  void main() {
    float age = max(0., time - vBorn);
    if (age >= life || vStrength <= 0.) discard;
    float x = vTrail.x * 2. - 1.;
    float s = vTrail.y;
    float t = time * motion;
    float envelope = 1. - smoothstep(.08, life, age);
    float shoulder = 1. - smoothstep(.55, 1., abs(x));
    float body = .23 * shoulder;
    float highlight = 0.;
    vec3 color = tint;

    if (style < 1.5) {
      // Flames shear along the road with separate orange tongues and amber roots.
      float lean = sin(s * 2.6 - t * 3.) * .19;
      float tongues = triangle(s * .73 + .46 * abs(x) - t * 1.9);
      body += band(x, lean, .78) * smoothstep(.13, .86, tongues - .24 * abs(x)) * .64;
      highlight = band(x, lean, .28) * (.55 + .45 * tongues);
      if (detail > .5) highlight += .35 * band(x, -.63, .13) * pow(max(0., triangle(s * 1.8 - t * 1.5)), 5.);
    } else if (style < 2.5) {
      // Continuous spectral bands fold sideways with their ribbon, leaving visible dark seams.
      float wave = sin(s * 1.13 - t * 2.2) * .17;
      float hue = (x - wave) * .54 + s * .044 - t * .12;
      color = .10 + .67 * pow(clamp(.5 + .5 * cos(6.28318 * (hue + vec3(0., .66, .33))), 0., 1.), vec3(1.7));
      body += band(x, wave, .88) * (.45 + .19 * cos((x - wave) * 14.));
      if (detail > .5) highlight = .42 * band(x, wave, .1) * triangle(s * .61 - t * 1.4);
    } else if (style < 3.5) {
      // Staggered facets, with crisp diagonal edges that erode after the wheel passes.
      float shard = fract(s * .93 + .48 * x);
      float edge = abs(x + .22 * sin(floor(s * .93 + .48 * x) * 2.4));
      body += (1. - smoothstep(.04, .08, edge - (1. - shard) * .77)) *
        smoothstep(.04, .22, shard - age * .17) * .55;
      highlight = band(edge - (1. - shard) * .73, 0., .12) * shoulder * step(.12, shard);
      if (detail > .5) highlight *= .6 + .4 * triangle(s * .29 - t * .44);
    } else if (style < 4.5) {
      // A narrow serrated lightning channel with offset branches and traveling charge.
      float bolt = (triangle(s * 1.14 - t * 1.65) - .5) * .85;
      float line = band(x, bolt, .22);
      body += line * .67 + band(x, bolt, .53) * .22;
      highlight = line * (.67 + .33 * triangle(s * .55 - t * 1.2));
      if (detail > .5) body += band(x, -bolt * .9, .14) * smoothstep(.47, .82, triangle(s * .83 + t)) * .46;
    } else {
      // Nebula sheets leave space between soft curls. Only a few cells carry a star.
      float cloud = sin(s * 2.1 - t * 1.4 + x * 4.) * sin(s * .67 + x * 5. + age * 3.);
      body += (.38 + .29 * cloud) * shoulder;
      float cell = floor(s * 2.9);
      float star = band(x, hash(cell + 3.) * 1.54 - .77, .13) * band(fract(s * 2.9), .5, .25);
      highlight = star * (.65 + .35 * triangle(t * .62 + hash(cell) * 6.));
      if (detail > .5) highlight += .31 * band(x, sin(s * 1.4) * .53, .09) * triangle(s * 1.4 - t);
    }

    float alpha = shoulder * envelope * vStrength * min(.91, body + highlight * .43);
    if (alpha < .009) discard;
    gl_FragColor = vec4(mix(color, core, min(.84, highlight) * .83), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
