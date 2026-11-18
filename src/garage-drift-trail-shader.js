export const driftVertex = /* glsl */ `
  attribute vec3 birthAlongStrength, roadNormal;
  uniform float time, style, motion, life;
  varying vec2 vTrail;
  varying float vBorn, vStrength;
  void main() {
    vTrail = vec2(uv.x, birthAlongStrength.y);
    vBorn = birthAlongStrength.x;
    vStrength = birthAlongStrength.z;
    float age = max(0., time - vBorn);
    float ridge = 1. - abs(uv.x * 2. - 1.);
    float ripples = (style > 1.5 && style < 2.5 ? .085 : .055) * sin(vTrail.y * 2.8 - time * 5.2);
    float floatOff = style > 4.5 ? .18 * smoothstep(.15, life, age) : 0.;
    vec3 p = position + roadNormal * (ripples + floatOff) * ridge * motion * vStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`;

export const driftFragment = /* glsl */ `
  uniform float time, style, motion, detail, life;
  uniform vec3 tint, core;
  varying vec2 vTrail;
  varying float vBorn, vStrength;

  float band(float x, float center, float width) {
    return 1. - smoothstep(width * .30, width, abs(x - center));
  }
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float triangle(float x) { return 1. - abs(fract(x) * 2. - 1.); }
  vec3 spectrum(float h) {
    return .075 + .77 * clamp(abs(fract(h + vec3(0., .67, .33)) * 6. - 3.) - 1., 0., 1.);
  }

  void main() {
    float age = max(0., time - vBorn);
    if (age >= life || vStrength <= 0.) discard;
    float x = vTrail.x * 2. - 1.;
    float s = vTrail.y;
    float t = time * motion;
    float envelope = 1. - smoothstep(.12, life, age);
    float shoulder = 1. - smoothstep(.61, 1., abs(x));
    float body = .19 * shoulder;
    float highlight = 0.;
    vec3 color = tint;

    if (style < 1.5) {
      // Amber edges frame a dark, heat-scored tread. A second flame curls back in each cell.
      float lean = .17 * sin(s * 2.5 - t * 3.3);
      float tongues = triangle(s * .68 + .33 * x - t * 1.55);
      float crest = .23 + .50 * tongues;
      float rim = band(abs(x - lean), crest, .27);
      float inner = band(x, lean * .4, .46);
      float tread = smoothstep(.25, .48, triangle(s * 2.2 + .60 * abs(x)));
      color = mix(tint, tint * .16, inner * (1. - tread * .49));
      body += .58 * rim + inner * (.40 + tread * .22);
      highlight = rim * (.54 + .46 * tongues);
      if (detail > .5) highlight += .32 * band(x, -.60, .15) * pow(max(0., triangle(s * 1.5 - t * 2.3)), 5.);
    } else if (style < 2.5) {
      // A spectrum spans the width of each ribbon with filaments that keep their relative order.
      float wave = .13 * sin(s * .91 - t * 2.5);
      float across = x - wave;
      float hue = .44 * across + .042 * sin(s * .42 - t * 1.9);
      color = spectrum(hue);
      float filaments = .5 + .5 * cos(across * 22. - .15 * sin(s - t * 2.));
      body += band(x, wave, .96) * (.70 + .14 * filaments);
      highlight = .18 * filaments * triangle(s * .36 - t * .86);
    } else if (style < 3.5) {
      // Alternating ice fins have asymmetric faces and a narrow translucent fracture edge.
      float tooth = s * .84 + .38 * x;
      float shard = fract(tooth);
      float axis = .23 * sin(floor(tooth) * 2.39);
      float edge = abs(x - axis);
      float shell = (1. - shard) * .88 + .075;
      float face = (1. - smoothstep(shell - .075, shell + .04, edge)) * smoothstep(.015, .18, shard);
      float lip = band(edge, shell - .07, .13);
      body += face * (.67 - .20 * smoothstep(.35, life, age));
      color *= mix(.55, 1.05, smoothstep(-.24, .19, x - axis));
      highlight = lip * shoulder * smoothstep(.05, .12, shard) + .20 * band(x, axis, .16);
    } else if (style < 4.5) {
      // A continuous bolt keeps its zig-zag while charge runs along it and through finer side branches.
      float bolt = (triangle(s * .82 - t * .46) - .5) * 1.19;
      float line = band(x, bolt, .19);
      float charge = .50 + .50 * triangle(s * .31 - t * 1.12);
      float branch = band(x, -bolt * .92 + .11, .11) * smoothstep(.33, .7, triangle(s * .58 + t * .42));
      body += .75 * line + .31 * band(x, bolt, .64) + .32 * branch;
      highlight = charge * line + .60 * branch * detail;
    } else {
      // Pink crests around a purple core break into low mist and sparse luminous points.
      float wisps = sin(s * 2.1 - t * 1.48 + x * 5.) * sin(s * .70 + x * 6.3);
      float crest = .48 + .23 * sin(s * .78 - t * 1.1);
      float edge = band(abs(x), crest, .32);
      color *= mix(.52, 1.08, edge);
      body += .36 * edge + (.28 + .23 * wisps) * shoulder;
      float cell = floor(s * 2.35);
      float star = band(x, hash(cell + 4.) * 1.62 - .81, .125) * band(fract(s * 2.35), .5, .23);
      highlight = star * (.78 + .22 * triangle(t * .55 + hash(cell))) + .16 * edge * detail;
    }

    float alpha = shoulder * envelope * vStrength * min(.93, body + highlight * .41);
    if (alpha < .009) discard;
    gl_FragColor = vec4(mix(color, core, clamp(highlight, 0., .94) * .89), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
