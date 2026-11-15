// The rear exhaust shown on NITRO/BOOST: per rear port an additive jet, an opaque core and a nozzle flare, plus one glow
// on the road behind the car. Every part is a child of the `Rear ports` group, so
// garage-model.ts keeps placing it on each car's nozzles, and sits in the scene (hidden) from creation so the world
// warm-up compiles it. Per frame: uniforms only, from the one PlumeFrame aero-vfx.js reuses.
import * as THREE from 'three';

interface Port { position: readonly number[]; direction: readonly number[]; size: number }
/** `reach`: jet length (m). `quality`: 0.25 Low, 0.5 Medium, 1 High. `calm`: Reduced Motion or Comfortable. */
export interface PlumeFrame { time: number; power: number; nitroMix: number; reach: number; brightness: number; diamonds: number;
  extreme: number; tail: number; quality: number; enabled: boolean; calm: boolean; voidPulse: boolean; racing: boolean; grounded: boolean }

/** The flame in metres behind the nozzle. Fixed: as fat and as bright on Low + Realistic as on High + Extreme, whatever the tail length. */
export const PLUME = { nozzle: 0.065, fat: 0.3, half: 0.12, coreMax: 0.09, coreLength: 1.8, flare: 0.45, glowWidth: 2.4, glowLength: 7 } as const;
/** Radius of a jet's glow `metres` behind its nozzle. */
export function plumeRadius(metres: number): number { return PLUME.nozzle + (PLUME.fat - PLUME.nozzle) * metres / (metres + PLUME.half); }
/** Radius of a jet's opaque core: the nozzle's at the exit, `coreMax` a quarter of the way, closed at `coreLength`. */
export function coreRadius(metres: number): number {
  const u = Math.min(1, Math.max(0, metres / PLUME.coreLength)), taper = Math.max(0, (u - 0.25) / 0.75);
  return (PLUME.nozzle + (PLUME.coreMax - PLUME.nozzle) * Math.min(1, u * 4)) * (1 - taper * taper);
}

const FORWARD = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); // a plane laid on the road
const glsl = (n: number) => Number.isInteger(n) ? `${n}.` : String(n); // a GLSL float literal
const NOZZLE = glsl(PLUME.nozzle);
/** Second and third arguments of `mix(base, …)`: NITRO turns the flame purple, or the trail skin's colour. */
const NITRO_TINT = 'mix(vec3(.68,.42,1.),trailAccent.rgb,trailAccent.a),clamp(nitroMix,0.,1.)*(.65+.27*trailAccent.a)';
/** Unit-radius open tube along +z, 0 to 1: the vertex shaders give it its radius in metres. */
const TINT_UNIFORMS = 'uniform float time,nitroMix;uniform vec3 skinTint;uniform vec4 trailAccent;';
const FLAME = `mix(vec3(.45,.75,1.)*skinTint,${NITRO_TINT})`; // the thruster tint on blue
const tube = (around: number, along: number) => new THREE.CylinderGeometry(1, 1, 1, around, along, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5);

/** `ground`: the car's contact-shadow plane (+z is the road's up), so the road glow stays on the road while `vehicle` leans. */
export function createSprintPlume(parent: THREE.Object3D, ports: readonly Port[], vehicle?: THREE.Object3D, ground?: THREE.Object3D) {
  const jetGeometry = tube(20, 24);
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, brightness: { value: 1 }, diamonds: { value: 0.5 }, extreme: { value: 0 }, nitroMix: { value: 0 }, tail: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) }, reach: { value: 1 }, thick: { value: 1 }, glare: { value: 1 } },
    // `thick` 0 is the old cone (nozzle radius widening 4.8x over the whole length); 1 never draws thinner than plumeRadius.
    vertexShader: `varying vec2 vUv;varying float vD,vSpread;uniform float reach,thick;
      void main(){vUv=uv;float d=position.z*reach;vD=d;float cone=${NOZZLE}*(1.+3.8*position.z);
        float radius=mix(cone,max(cone,${NOZZLE}+(${glsl(PLUME.fat)}-${NOZZLE})*d/(d+${glsl(PLUME.half)})),thick);
        vSpread=cone*cone/(radius*radius); // the chase camera sees the jet end-on: the thin cone's light spread over the fat disc
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position.xy*radius,position.z,1.);}`,
    fragmentShader: `varying vec2 vUv;varying float vD,vSpread;uniform float time,power,brightness,diamonds,extreme,nitroMix,skinPattern,tail,thick,glare;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){float t=clamp(1.-vUv.y,0.,1.); // MSAA slivers extrapolate vUv far past the rim; unclamped, the core overflows to Inf and a zero fade makes NaN
        float cells=pow(max(0.,.5+.5*cos(t*48.)),5.)*diamonds;
        float breakup=.75+.25*sin(vUv.x*52.+t*31.-time*16.);
        float core=exp(-t*7.);float fade=pow(max(0.,1.-t),1.7)*smoothstep(0.,.025,t);
        vec3 color=mix(vec3(.62,.84,1.),vec3(1.),core+cells*.5);
        color=mix(color,vec3(.6,.38,1.),extreme*t*.25);
        color=mix(color,vec3(1.,.38,.78),tail*smoothstep(.2,1.,t)); // board plume (Medium+): the blue-white core fades to magenta
        color=mix(color*skinTint,${NITRO_TINT}); // skin tints the base
        float body=thick*(1.-smoothstep(0.,3.,clamp(vD,0.,3.))); // the first 3 m stay dense whatever the tail length
        float shape=1.;
        if(skinPattern>.5) shape=.6+.4*abs(sin(vUv.x*10.+t*18.-time*6.));
        if(skinPattern>1.5) shape=.25+.75*abs(sin(vUv.x*6.28*3.+t*28.-time*11.));
        if(skinPattern>2.5) shape=step(.45,fract(t*7.+time*3.+vUv.x*3.));
        // glare 1 (bloom, Medium/High): under the bloom threshold, the fat flame emits half (two faces, overlapping neighbours).
        // 0 (Low, no bloom): full light and a denser tail, the jet's own halo. No channel above 1, hue kept.
        vec3 light=color*brightness*(1.+core+cells)*mix(1.,vSpread*(1.-.5*thick),glare);
        gl_FragColor=vec4(light/max(1.,max(light.r,max(light.g,light.b))),fade*(mix(.3,.15,glare)+core*.55+cells*.35+body*.45)*breakup*power*shape);}`,
  });
  const jets = ports.map((port, i) => {
    const jet = new THREE.Mesh(jetGeometry, jetMaterial.clone());
    jet.name = `Cold gas nozzle ${i + 1}`;
    jet.position.fromArray(port.position);
    jet.quaternion.setFromUnitVectors(FORWARD, new THREE.Vector3(...port.direction));
    jet.visible = false;
    parent.add(jet);
    return jet;
  });
  jetMaterial.dispose();
  // Additive light washes out over a sunlit road; the core is drawn over it instead. Its own gain: no brightness setting, tier or bloom.
  const shared = { time: { value: 0 }, nitroMix: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) } };
  const coreAlpha = { value: 0 };
  const core = new THREE.InstancedMesh(tube(12, 12), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { ...shared, alpha: coreAlpha },
    vertexShader: `varying float vT;
      void main(){vT=position.z;float taper=max(0.,(vT-.25)/.75);
        float radius=(${NOZZLE}+(${glsl(PLUME.coreMax)}-${NOZZLE})*min(1.,vT*4.))*(1.-taper*taper); // coreRadius()
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position.xy*radius,position.z,1.);}`,
    fragmentShader: `varying float vT;${TINT_UNIFORMS}uniform float alpha;
      void main(){float t=clamp(vT,0.,1.);
        vec3 color=${FLAME}*1.5;
        color=mix(color,vec3(1.),(1.-t)*(1.-t)*.6); // white-hot at the nozzle
        gl_FragColor=vec4(color,alpha*(1.-t*t)*(.9+.1*sin(t*26.-time*18.)));}`,
  }), ports.length);
  core.name = 'Sprint plume core';
  // Flare and road glow say "sprinting" on every skin. Depth-tested: scenery and rivals in front still hide them.
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const flareSize = { value: 0 }, flareFade = { value: 0 }, glowFade = { value: 0 };
  const flare = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    ...additive, uniforms: { ...shared, size: flareSize, fade: flareFade },
    vertexShader: `varying vec2 vUv;uniform float size;
      void main(){vUv=uv;vec4 centre=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        float span=size*length(modelViewMatrix[0].xyz); // metres on the car, a scaled showroom car too
        centre.xyz-=normalize(centre.xyz)*span*.5; // towards the eye by its own radius: the tail must not cut the disc in half
        gl_Position=projectionMatrix*(centre+vec4(position.xy*span,0.,0.));}`,
    fragmentShader: `varying vec2 vUv;${TINT_UNIFORMS}uniform float fade;
      void main(){float disc=clamp(1.-length(vUv-.5)*2.,0.,1.);disc*=disc;
        gl_FragColor=vec4(mix(${FLAME},vec3(1.),disc),disc*fade*(.9+.1*sin(time*23.)));}`,
  }), ports.length);
  flare.name = 'Sprint nozzle flare';
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(PLUME.glowWidth, PLUME.glowLength), new THREE.ShaderMaterial({
    ...additive, uniforms: { ...shared, fade: glowFade },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;${TINT_UNIFORMS}uniform float fade;
      void main(){float across=clamp(1.-abs(vUv.x-.5)*2.,0.,1.),t=clamp(1.-vUv.y,0.,1.); // t: 0 under the tail, 1 at the far end
        gl_FragColor=vec4(${FLAME},across*across*smoothstep(0.,.1,t)*(1.-t)*(1.-t)*fade*(.9+.1*sin(t*9.-time*14.)));}`,
  }));
  glow.name = 'Sprint road glow'; glow.renderOrder = 1; glow.quaternion.copy(FLAT);
  const glowZ = ports[0]!.position[2]! + PLUME.glowLength / 2 - 0.5; // starts under the tail
  const place = new THREE.Matrix4(), turn = new THREE.Quaternion(), size = new THREE.Vector3(1, 1, PLUME.coreLength);
  ports.forEach((port, i) => {
    const at = new THREE.Vector3(...port.position);
    core.setMatrixAt(i, place.compose(at, turn.setFromUnitVectors(FORWARD, new THREE.Vector3(...port.direction)), size));
    flare.setMatrixAt(i, place.makeTranslation(at));
  });
  for (const mesh of [core, flare, glow]) { mesh.visible = false; parent.add(mesh); }
  const roadUp = new THREE.Vector3(), spot = new THREE.Vector3(), carFrame = new THREE.Quaternion();
  let trail = 0;
  return {
    jets,
    /** Event-driven: a skin swap writes uniforms only. `accent` is the NITRO trail colour (w 1 when a trail skin is equipped). */
    setSkin(tint: readonly number[], pattern: number, accent: THREE.Vector4, trailStyle: number): void {
      for (const jet of jets) {
        const u = jet.material.uniforms;
        u.skinTint!.value.fromArray(tint); u.skinPattern!.value = pattern; u.trailAccent!.value.copy(accent);
      }
      shared.skinTint.value.fromArray(tint); shared.trailAccent.value.copy(accent); trail = trailStyle;
    },
    update(frame: PlumeFrame): void {
      const lit = frame.enabled && frame.power > 0.005, on = lit && !frame.voidPulse, power = Math.min(1, frame.power), dim = frame.calm ? 0.6 : 1; // a x3 chain is no bigger
      const skinFade = trail > 0 && !frame.calm ? THREE.MathUtils.clamp(frame.nitroMix, 0, 1) : 0; // a trail skin draws its own NITRO flame
      jets.forEach((jet, i) => {
        jet.visible = on;
        jet.scale.z = frame.reach;
        const u = jet.material.uniforms;
        u.reach!.value = frame.reach; u.thick!.value = 1 - skinFade; u.glare!.value = frame.quality > 0.25 ? 1 : 0; // configureBloom: no bloom on Low
        u.time!.value = frame.time + i * 0.13; u.power!.value = Math.sqrt(frame.power); // a held BOOST (power ~0.65) still reads as a sprint u.tail!.value = frame.tail;
        u.brightness!.value = frame.brightness; u.diamonds!.value = frame.diamonds; u.extreme!.value = frame.extreme; u.nitroMix!.value = frame.nitroMix;
      });
      core.visible = on; flare.visible = lit; glow.visible = lit && frame.quality > 0.25 && frame.racing && frame.grounded;
      shared.time.value = frame.time; shared.nitroMix.value = frame.nitroMix; coreAlpha.value = 0.85 * power * (1 - skinFade);
      flareSize.value = PLUME.flare * (0.55 + 0.45 * power); flareFade.value = power * dim; glowFade.value = 0.6 * power * (1 - skinFade) * dim;
      if (!glow.visible) return;
      glow.position.set(0, -parent.position.y, glowZ); // the road under the car, wherever garage-model.ts put the ports
      if (ground && vehicle) { // as garage-launch-flare.js: the car banks and squats about its wheels, the glow must not
        roadUp.set(0, 0, 1).applyQuaternion(ground.quaternion).applyQuaternion(carFrame.copy(vehicle.quaternion).invert());
        glow.quaternion.setFromUnitVectors(UP, roadUp).multiply(FLAT);
        glow.position.addScaledVector(roadUp, -roadUp.dot(spot.copy(glow.position).add(parent.position))); // back onto the road plane: 6 m behind a squatting car it would sink
      } else roadUp.copy(UP);
      glow.position.addScaledVector(roadUp, 0.04);
    },
    reset(): void { for (const jet of jets) jet.visible = false; core.visible = flare.visible = glow.visible = false; },
  };
}
