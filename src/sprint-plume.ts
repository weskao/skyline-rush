// The rear exhaust shown on NITRO/BOOST: per rear port one additive jet and one opaque core. Every part is a child of the `Rear ports` group, so
// garage-model.ts keeps placing it on each car's nozzles, and sits in the scene (hidden) from creation so the world
// warm-up compiles it. Per frame: uniforms only, from the one PlumeFrame aero-vfx.js reuses.
import * as THREE from 'three';

interface Port { position: readonly number[]; direction: readonly number[]; size: number }
/** `reach`: jet length (m). `quality`: 0.25 Low, 0.5 Medium, 1 High. `calm`: Reduced Motion or Comfortable. */
export interface PlumeFrame { time: number; power: number; nitroMix: number; reach: number; brightness: number; diamonds: number;
  extreme: number; tail: number; quality: number; enabled: boolean; calm: boolean; voidPulse: boolean; racing: boolean; grounded: boolean }

/** The flame in metres behind the nozzle. Fixed: as fat and as bright on Low + Realistic as on High + Extreme, whatever the tail length. */
export const PLUME = { nozzle: 0.065, fat: 0.26, half: 0.2, coreMax: 0.09, coreLength: 1.8, flare: 0.45, glowWidth: 2.4, glowLength: 7 } as const;
/** Radius of a jet's glow `metres` behind its nozzle. */
export function plumeRadius(metres: number): number { return PLUME.nozzle + (PLUME.fat - PLUME.nozzle) * metres / (metres + PLUME.half); }
/** Radius of a jet's opaque core: the nozzle's at the exit, `coreMax` a quarter of the way, closed at `coreLength`. */
export function coreRadius(metres: number): number {
  const u = Math.min(1, Math.max(0, metres / PLUME.coreLength)), taper = Math.max(0, (u - 0.25) / 0.75);
  return (PLUME.nozzle + (PLUME.coreMax - PLUME.nozzle) * Math.min(1, u * 4)) * (1 - taper * taper);
}

const FORWARD = new THREE.Vector3(0, 0, 1);
const glsl = (n: number) => Number.isInteger(n) ? `${n}.` : String(n); // a GLSL float literal
const NOZZLE = glsl(PLUME.nozzle);
/** Second and third arguments of `mix(base, …)`: NITRO turns the flame purple, or the trail skin's colour. */
const NITRO_TINT = 'mix(vec3(.68,.42,1.),trailAccent.rgb,trailAccent.a),clamp(nitroMix,0.,1.)*(.65+.27*trailAccent.a)';
/** Unit-radius open tube along +z, 0 to 1: the vertex shaders give it its radius in metres. */
const tube = (around: number, along: number) => new THREE.CylinderGeometry(1, 1, 1, around, along, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5);

export function createSprintPlume(parent: THREE.Object3D, ports: readonly Port[], _vehicle?: THREE.Object3D, _ground?: THREE.Object3D) {
  const jetGeometry = tube(20, 24);
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, brightness: { value: 1 }, diamonds: { value: 0.5 }, extreme: { value: 0 }, nitroMix: { value: 0 }, tail: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) }, reach: { value: 1 }, thick: { value: 1 } },
    // `thick` 0 is the old cone (nozzle radius widening 4.8x over the whole length); 1 never draws thinner than plumeRadius.
    vertexShader: `varying vec2 vUv;varying float vD;uniform float reach,thick;
      void main(){vUv=uv;float d=position.z*reach;vD=d;float cone=${NOZZLE}*(1.+3.8*position.z);
        float radius=mix(cone,max(cone,${NOZZLE}+(${glsl(PLUME.fat)}-${NOZZLE})*d/(d+${glsl(PLUME.half)})),thick);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position.xy*radius,position.z,1.);}`,
    fragmentShader: `varying vec2 vUv;varying float vD;uniform float time,power,brightness,diamonds,extreme,nitroMix,skinPattern,tail,thick;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){float t=clamp(1.-vUv.y,0.,1.); // MSAA slivers extrapolate vUv far past the rim; unclamped, the core overflows to Inf and a zero fade makes NaN
        float cells=pow(max(0.,.5+.5*cos(t*48.)),5.)*diamonds;
        float breakup=.75+.25*sin(vUv.x*52.+t*31.-time*16.);
        float core=exp(-t*7.);float fade=pow(max(0.,1.-t),1.7)*smoothstep(0.,.025,t);
        vec3 color=mix(vec3(.62,.84,1.),vec3(1.),core+cells*.5);
        color=mix(color,vec3(.6,.38,1.),extreme*t*.25);
        color=mix(color,vec3(1.,.38,.78),tail*smoothstep(.2,1.,t)); // board plume (Medium+): the blue-white core fades to magenta
        color=mix(color*skinTint,${NITRO_TINT}); // skin tints the base
        float body=thick*(1.-smoothstep(0.,2.,clamp(vD,0.,2.))); // the first 2 m stay dense whatever the tail length
        float shape=1.;
        if(skinPattern>.5) shape=.6+.4*abs(sin(vUv.x*10.+t*18.-time*6.));
        if(skinPattern>1.5) shape=.25+.75*abs(sin(vUv.x*6.28*3.+t*28.-time*11.));
        if(skinPattern>2.5) shape=step(.45,fract(t*7.+time*3.+vUv.x*3.));
        gl_FragColor=vec4(color*brightness*(1.+core+cells),fade*(.15+core*.55+cells*.35+body*.45)*breakup*power*shape);}`,
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
    fragmentShader: `varying float vT;uniform float time,alpha,nitroMix;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){float t=clamp(vT,0.,1.);
        vec3 color=mix(vec3(.45,.75,1.)*skinTint,${NITRO_TINT})*1.5;
        color=mix(color,vec3(1.),(1.-t)*(1.-t)*.6); // white-hot at the nozzle
        gl_FragColor=vec4(color,alpha*(1.-t*t)*(.9+.1*sin(t*26.-time*18.)));}`,
  }), ports.length);
  core.name = 'Sprint plume core';
  const place = new THREE.Matrix4(), turn = new THREE.Quaternion(), size = new THREE.Vector3(1, 1, PLUME.coreLength);
  ports.forEach((port, i) => core.setMatrixAt(i, place.compose(new THREE.Vector3(...port.position), turn.setFromUnitVectors(FORWARD, new THREE.Vector3(...port.direction)), size)));
  core.visible = false;
  parent.add(core);
  return {
    jets,
    /** Event-driven: a skin swap writes uniforms only. `accent` is the NITRO trail colour (w 1 when a trail skin is equipped). */
    setSkin(tint: readonly number[], pattern: number, accent: THREE.Vector4, _trailStyle: number): void {
      for (const jet of jets) {
        const u = jet.material.uniforms;
        u.skinTint!.value.fromArray(tint); u.skinPattern!.value = pattern; u.trailAccent!.value.copy(accent);
      }
      shared.skinTint.value.fromArray(tint); shared.trailAccent.value.copy(accent);
    },
    update(frame: PlumeFrame): void {
      const on = frame.enabled && frame.power > 0.005 && !frame.voidPulse;
      jets.forEach((jet, i) => {
        jet.visible = on;
        jet.scale.z = frame.reach;
        const u = jet.material.uniforms;
        u.reach!.value = frame.reach; u.thick!.value = 1;
        u.time!.value = frame.time + i * 0.13; u.power!.value = frame.power; u.tail!.value = frame.tail;
        u.brightness!.value = frame.brightness; u.diamonds!.value = frame.diamonds; u.extreme!.value = frame.extreme; u.nitroMix!.value = frame.nitroMix;
      });
      core.visible = on;
      shared.time.value = frame.time; shared.nitroMix.value = frame.nitroMix; coreAlpha.value = 0.85 * Math.min(1, frame.power); // a x3 chain is no more opaque
    },
    reset(): void { for (const jet of jets) jet.visible = false; core.visible = false; },
  };
}
