export const accentVertex = /* glsl */ `
  attribute vec3 contact, roadUp, roadSide;
  attribute vec4 birthSeedPower;
  attribute float facetShade;
  uniform float time, style;
  varying vec2 vShape;
  varying float vAge, vSeed, vStrength, vShade, vSpark;
  void main() {
    vShape = vec2(position.x + position.z, position.y);
    vShade = facetShade;
    vSeed = birthSeedPower.y;
    vSpark = birthSeedPower.w;
    float age = max(0., time - birthSeedPower.x);
    float life = mix(.68, 1.22, vSeed);
    if (style > 3.5 && style < 4.5) life *= .68;
    if (vSpark > .5) life = mix(.25, .61, vSeed);
    vAge = age / life;
    vStrength = birthSeedPower.z;
    vec2 size = vec2(.41, .61);
    float rise = .32 + .38 * vAge;
    if (style > 1.5 && style < 2.5) {
      size = vec2(.21, .16);
      rise = .09 + .33 * vAge;
    } else if (style > 2.5 && style < 3.5) {
      size = vec2(.30, .64);
      rise = .18 * (1. - vAge);
    } else if (style > 3.5 && style < 4.5) {
      size = vec2(.35, .28);
      rise = .06 + .16 * vAge;
    } else if (style > 4.5) {
      size = vec2(.52, .30);
      rise = .10 + .40 * vAge;
    }
    float scatter = 0.;
    if (vSpark > .5) {
      size *= style > 2.5 && style < 3.5 ? .29 : .32;
      rise += (style > 2.5 && style < 3.5 ? .24 : .39) * (1. - (1. - vAge) * (1. - vAge));
      scatter = (vSeed - .5) * (.36 + .82 * vAge);
    }
    vec3 spawn = contact + roadUp * rise + roadSide * scatter;
    if (vAge >= 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }

    float scale = mix(.72, 1.24, vSeed) * mix(.75, 1., vStrength);
    if (style < 1.5 || (style > 2.5 && style < 3.5)) {
      float turn = (vSeed - .5) * 1.14;
      vec3 forward = cross(roadSide, roadUp);
      vec3 right = roadSide * cos(turn) + forward * sin(turn);
      vec3 depth = cross(right, roadUp);
      float melt = style > 2.5 ? 1. - .50 * smoothstep(.20, 1., vAge) : 1.;
      vec3 lever = right * position.x * size.x + depth * position.z * size.x * 1.27
        + roadUp * position.y * size.y;
      vec3 point = spawn + lever * scale * melt;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.);
      return;
    }

    vec3 axis = mat3(modelViewMatrix) * roadUp;
    vec2 axisXY = dot(axis.xy, axis.xy) > .0001 ? normalize(axis.xy) : vec2(0., 1.);
    vec2 side = vec2(axisXY.y, -axisXY.x);
    vec3 centre = (modelViewMatrix * vec4(spawn, 1.)).xyz;
    centre.xy += (side * (position.x * size.x + (vSeed - .5) * (.22 + .3 * vAge))
      + axisXY * position.y * size.y) * scale;
    gl_Position = projectionMatrix * vec4(centre, 1.);
  }
`;

export const accentFragment = /* glsl */ `
  uniform float style;
  uniform vec3 tint, core;
  varying vec2 vShape;
  varying float vAge, vSeed, vStrength, vShade, vSpark;

  float softBand(float d, float w) { return 1. - smoothstep(w * .42, w, abs(d)); }

  vec2 flame(vec2 p) {
    float h = p.y * .5 + .5;
    float lean = .59 * h * h * sign(vSeed - .5) + .15 * sin(h * 8. - vAge * 5.);
    float width = mix(.73, .06, h) * smoothstep(0., .21, h);
    float d = p.x - lean;
    float tongue = softBand(d, max(.018, width)) * (1. - smoothstep(.63, .98, h));
    float ember = softBand(p.x + .28 * sign(vSeed - .5), .095) * softBand(h - .82, .081);
    return vec2(max(tongue, ember), max(softBand(d, max(.018, width * .54)) * (1. - h), ember));
  }

  void main() {
    if (vAge >= 1.) discard;
    vec2 p = vShape;
    float alpha, hot;
    vec3 color = tint;
    if (vSpark > .5) {
      vec2 point = abs(p);
      float starDot = 1. - smoothstep(.09, .65, length(p * vec2(1.15, .84)));
      float gleam = max(softBand(point.x, .10) * softBand(point.y, .79),
        softBand(point.x, .62) * softBand(point.y, .12));
      alpha = style > 2.5 && style < 3.5 ? .69 : max(starDot * .66, gleam * .76);
      hot = style > 2.5 && style < 3.5 ? vShade : max(starDot, gleam);
      if (style > 1.5 && style < 2.5) {
        color = .12 + .63 * clamp(abs(fract(vSeed + vec3(0., .67, .33)) * 6. - 3.) - 1., 0., 1.);
      }
    } else if (style < 1.5) {
      vec2 lit = flame(p);
      alpha = lit.x * .80;
      hot = lit.y;
    } else if (style < 2.5) {
      float pearlescent = 1. - smoothstep(.06, .76, length(p * vec2(1., 1.4)));
      alpha = pearlescent * .54;
      hot = softBand(p.x + p.y * .45, .18) * .32;
      color = .15 + .63 * clamp(abs(fract(vSeed + p.y * .24 + vec3(0., .67, .33)) * 6. - 3.) - 1., 0., 1.);
    } else if (style < 3.5) {
      float reflection = .5 + .5 * sin(p.y * 7. - p.x * 3. - vAge * 3.);
      color *= .42 + .66 * vShade;
      alpha = .73;
      hot = vShade * (.37 + .48 * reflection) + .20 * smoothstep(.55, 1., p.y);
    } else if (style < 4.5) {
      float h = p.y * .5 + .5;
      float zig = (1. - abs(fract(h * 2.8 + vSeed) * 2. - 1.)) * .55;
      float edge = softBand(p.x - zig + .25, .10);
      float branch = softBand(p.x + h * .92 - .53, .074) * (1. - smoothstep(.46, .73, h));
      alpha = (edge + branch * .56) * smoothstep(.04, .26, h) * (1. - smoothstep(.68, .99, h));
      hot = max(edge, branch);
    } else {
      vec2 point = abs(p);
      float cloud = (1. - smoothstep(.07, .98, length(p * vec2(1., 1.12))))
        * (.68 + .32 * sin(p.x * 5. - p.y * 3. + vAge * 6.));
      float star = max(softBand(point.x, .11) * softBand(point.y, .66),
        softBand(point.x, .61) * softBand(point.y, .12));
      alpha = max(.43 * cloud, star * .75);
      hot = star * (.72 + .28 * sin((vAge + vSeed) * 6.283));
    }
    float fade = smoothstep(0., .15, vAge) * (1. - smoothstep(.28, 1., vAge));
    alpha *= fade * vStrength;
    if (alpha < .012) discard;
    gl_FragColor = vec4(mix(color, core, clamp(hot, 0., 1.) * .82), min(.81, alpha));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
