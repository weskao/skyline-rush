// The rear exhaust shown on NITRO/BOOST: one jet per rear port. Every part is a child of the `Rear ports` group, so
// garage-model.ts keeps placing it on each car's nozzles, and sits in the scene (hidden) from creation so the world
// warm-up compiles it. Per frame: uniforms only, from the one PlumeFrame aero-vfx.js reuses.
import * as THREE from 'three';

interface Port { position: readonly number[]; direction: readonly number[]; size: number }
/** `reach`: jet length (m). `quality`: 0.25 Low, 0.5 Medium, 1 High. `calm`: Reduced Motion or Comfortable. */
export interface PlumeFrame { time: number; power: number; nitroMix: number; reach: number; brightness: number; diamonds: number;
  extreme: number; tail: number; quality: number; enabled: boolean; calm: boolean; voidPulse: boolean; racing: boolean; grounded: boolean }

const FORWARD = new THREE.Vector3(0, 0, 1);

export function createSprintPlume(parent: THREE.Object3D, ports: readonly Port[], _vehicle?: THREE.Object3D, _ground?: THREE.Object3D) {
  const jetGeometry = new THREE.CylinderGeometry(1, 4.8, 1, 20, 24, true);
  jetGeometry.rotateX(-Math.PI / 2); jetGeometry.translate(0, 0, 0.5);
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, brightness: { value: 1 }, diamonds: { value: 0.5 }, extreme: { value: 0 }, nitroMix: { value: 0 }, tail: { value: 0 }, skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, trailAccent: { value: new THREE.Vector4(1, 1, 1, 0) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float time,power,brightness,diamonds,extreme,nitroMix,skinPattern,tail;uniform vec3 skinTint;uniform vec4 trailAccent;
      void main(){float t=clamp(1.-vUv.y,0.,1.); // MSAA slivers extrapolate vUv far past the rim; unclamped, the core overflows to Inf and a zero fade makes NaN
        float cells=pow(max(0.,.5+.5*cos(t*48.)),5.)*diamonds;
        float breakup=.75+.25*sin(vUv.x*52.+t*31.-time*16.);
        float core=exp(-t*7.);float fade=pow(max(0.,1.-t),1.7)*smoothstep(0.,.025,t);
        vec3 color=mix(vec3(.62,.84,1.),vec3(1.),core+cells*.5);
        color=mix(color,vec3(.6,.38,1.),extreme*t*.25);
        color=mix(color,vec3(1.,.38,.78),tail*smoothstep(.2,1.,t)); // board plume (Medium+): the blue-white core fades to magenta
        color=mix(color*skinTint,mix(vec3(.68,.42,1.),trailAccent.rgb,trailAccent.a),clamp(nitroMix,0.,1.)*(.65+.27*trailAccent.a)); // skin tints the base; NITRO is purple or the trail skin's colour
        float shape=1.;
        if(skinPattern>.5) shape=.6+.4*abs(sin(vUv.x*10.+t*18.-time*6.));
        if(skinPattern>1.5) shape=.25+.75*abs(sin(vUv.x*6.28*3.+t*28.-time*11.));
        if(skinPattern>2.5) shape=step(.45,fract(t*7.+time*3.+vUv.x*3.));
        gl_FragColor=vec4(color*brightness*(1.+core+cells),fade*(.15+core*.55+cells*.35)*breakup*power*shape);}`,
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
  return {
    jets,
    /** Event-driven: a skin swap writes uniforms only. `accent` is the NITRO trail colour (w 1 when a trail skin is equipped). */
    setSkin(tint: readonly number[], pattern: number, accent: THREE.Vector4, _trailStyle: number): void {
      for (const jet of jets) {
        const u = jet.material.uniforms;
        u.skinTint!.value.fromArray(tint); u.skinPattern!.value = pattern; u.trailAccent!.value.copy(accent);
      }
    },
    update(frame: PlumeFrame): void {
      const on = frame.enabled && frame.power > 0.005 && !frame.voidPulse;
      jets.forEach((jet, i) => {
        jet.visible = on;
        jet.scale.set(ports[i]!.size, ports[i]!.size, frame.reach);
        const u = jet.material.uniforms;
        u.time!.value = frame.time + i * 0.13; u.power!.value = frame.power; u.tail!.value = frame.tail;
        u.brightness!.value = frame.brightness; u.diamonds!.value = frame.diamonds; u.extreme!.value = frame.extreme; u.nitroMix!.value = frame.nitroMix;
      });
    },
    reset(): void { for (const jet of jets) jet.visible = false; },
  };
}
