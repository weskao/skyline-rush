import * as THREE from 'three';
import { MAX_SPEED } from './drive-rules.ts';

// NITRO trail skins: a hot flame at every exhaust, a long light streak behind it and the glow it throws on the
// road. One program for all four styles (1 cyan laser, 2 gold pulse, 3 crimson dash, 4 nebula twin ribbons):
// a skin swap writes uniforms only, and the meshes sit on the car (hidden) from creation for shader warm-up.
// Each plume is an open tube (unit radius, u along +z) that leaves its round nozzle at exactly the nozzle radius and
// swells behind it; the view-facing term shades it as a glowing round jet, so it reads as gas, never as a flat card.
// Comfort (.claude/rules/nitro-trail-vfx.md): the whole plume, halo and road glow change no faster than 3 Hz; only
// thin streaks on the core flow back fast (±18%, ~10 Hz), which is what sells speed. Colour caps at 1.2, so only the
// thin core touches the bloom threshold. Speed comes from contrast and length, not glow: a thin white-hot core over a
// dark rim, a trail that stretches with car speed, fixed shock diamonds and a tight halo that flares at ignition.
const IGNITION_SECONDS = 0.45;
const SHORTEST = 3, LONGEST = 17; // metres: a 20 m/s crawl keeps a stub, NITRO at top speed draws the full streak
const plumeVertex = shell => `uniform float time,style,trailLength,nozzleRadius,ignite;varying vec2 vUv;varying float vFacing;
  void main(){vUv=uv;float u=clamp(position.z,0.,1.);
    float grow=style>3.5?4.:style>2.5?2.2:style>1.5?2.8:style>.5?1.2:2.; // nebula billows; the laser stays tight
    if(style>1.5&&style<2.5)grow*=1.+.5*exp(-abs(fract(u*3.-time*2.)-.5)*12.); // golden pulses bulge as they race back
    float r=nozzleRadius*(1.+grow*sqrt(u))*${shell}*(1.+ignite*.6*(1.-u)); // the ignition swell bulges the mouth
    vec3 p=vec3(position.xy*r,u*trailLength);
    vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);
    vec3 n=normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(position.xy,0.));
    vFacing=abs(dot(n,normalize(-view.xyz)));
    gl_Position=projectionMatrix*view;}`;
const HASH = 'float hash(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}';
const FLOW = 'float flow(float x){return 1.+.18*sin(x);}'; // the only term allowed past 3 Hz: thin, ±18%
const STREAK_FRAGMENT = `varying vec2 vUv;varying float vFacing;uniform float time,power,style,ignite;uniform vec3 color;${HASH}${FLOW}
  void main(){float u=clamp(vUv.y,0.,1.);float a=clamp(vUv.x,0.,1.);float f=clamp(vFacing,0.,1.);
    float axis=pow(max(0.,f),5.);float edge=pow(max(0.,f),1.2); // a thin hot axis over a soft rim
    float core=axis*flow(u*40.+a*25.13-time*60.); // four thin streaks race back at ~10 Hz
    float nozzle=exp(-u*7.)*(1.+ignite*1.5);float tail=pow(max(0.,1.-u),1.3);
    float diamonds=exp(-abs(fract(u*12.)-.5)*14.)*max(0.,1.-u*3.4)*(axis*.6+edge*.4); // three fixed shock diamonds: shape, never flicker
    float glint=step(.965,hash(floor(vec2(a*16.,u*12.-time*2.5))))*edge; // embers drift back, never a 20 Hz glitter
    float body=edge*.18+core*1.5;vec3 tint=color; // contrast, not glow: a dark rim frames the core
    if(style>.5&&style<1.5){body=core*2.2+edge*.08;glint*=1.5;} // ice laser: the thinnest, hardest core
    if(style>1.5&&style<2.5){float k=fract(u*3.-time*2.);float beat=1.+.25*pow(max(0.,sin(time*6.)),4.); // a ~1 Hz heartbeat
      body=(edge*.12+core*.8+exp(-abs(k-.5)*14.)*2.6*edge)*beat;nozzle*=beat;} // golden pulses race back
    if(style>2.5&&style<3.5){float k=u*3.-time*2.5;float on=.5+.5*smoothstep(.3,.5,fract(k+.3*hash(vec2(floor(k),1.))));
      body=core*2.2*on+edge*.12;glint*=2.;} // crimson tracer dashes over a dimmed jet: soft edges, no on/off flash
    if(style>3.5){float twin=pow(max(0.,sin(a*12.566-u*9.+time*6.)),6.); // two ribbons wind around the plume
      body=edge*.15+core*.9+twin*1.4*edge;tint=mix(color,vec3(1.,.22,.8),.5+.5*sin(u*8.-time*3.));glint*=1.6;} // violet-to-magenta nebula
    else{vec3 deep=style<1.5?vec3(.05,.3,1.):style<2.5?vec3(1.,.32,.05):vec3(.85,.04,.2); // ice→deep blue, gold→ember, crimson→wine
      tint=mix(tint,deep,smoothstep(.05,.8,u)*.8);}
    tint=mix(tint,vec3(1.),axis*.3*max(0.,1.-u*2.)+diamonds*.4);body+=diamonds*3.; // white-hot only on the axis by the nozzle
    vec3 col=tint*(body+nozzle*.6+nozzle*core*.7)+mix(tint,vec3(1.),.3)*glint*.9; // the nozzle stays the skin colour, not white
    gl_FragColor=vec4(min(col*.4,vec3(1.2)),clamp((body*tail+nozzle*.6*edge+glint)*power,0.,1.));}`;
const HALO_FRAGMENT = `varying vec2 vUv;varying float vFacing;uniform float time,power,style,ignite;uniform vec3 color;${HASH}
  void main(){float u=clamp(vUv.y,0.,1.);float a=clamp(vUv.x,0.,1.);float f=clamp(vFacing,0.,1.);
    float flare=.4+ignite*1.6; // a faint sheath while cruising, a bright bloom only for the ignition swell
    float soft=sqrt(f)*(1.-.7*f)*smoothstep(0.,.12,u)*pow(max(0.,1.-u),2.4); // peaks off the core and stays near the nozzle
    vec2 c=vec2(a*6.,u*5.-time*1.2);float d=length(fract(c)-.5); // embers drift back: 1.5 cells a second at one pixel
    float ember=step(.75,hash(floor(c)))*(1.-smoothstep(.08,.35,d))*max(0.,1.-u)*sqrt(f);
    vec3 tint=style>3.5?mix(color,vec3(1.,.22,.8),.5):color;
    vec3 col=tint*soft*1.6*flare+mix(tint,vec3(1.),.4)*ember*2.5;
    gl_FragColor=vec4(min(col*.5,vec3(1.2)),clamp((soft*.5*flare+ember)*power,0.,1.));}`;
const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const POOL_FRAGMENT = `varying vec2 vUv;uniform float time,power,style,ignite;uniform vec3 color;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;float u=1.-clamp(vUv.y,0.,1.); // u: 0 at the bumper, 1 far back
    float qx=q.x;float glow=exp(-qx*qx*4.)*exp(-clamp(u,0.,1.)*2.2);
    float beat=style>1.5&&style<2.5?.85+.3*pow(max(0.,sin(time*6.)),4.):1.; // in step with the streak's heartbeat
    gl_FragColor=vec4(min(color*1.2,vec3(1.2)),clamp(glow*beat*power*.42*(1.+ignite),0.,1.));}`;

function plumeTube() { // open round tube, unit radius, mouth at z=0 and tail at z=1 (uv.x around, uv.y along)
  return new THREE.CylinderGeometry(1, 1, 1, 16, 24, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
}

export function createNitroTrail(car, rearPorts) {
  const uniforms = { time: { value: 0 }, power: { value: 0 }, style: { value: 0 }, trailLength: { value: 8 }, ignite: { value: 0 }, nozzleRadius: { value: rearPorts[0].size },
    color: { value: new THREE.Vector3(1, 1, 1) } };
  const additive = { uniforms, transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending };
  const tube = plumeTube();
  const streaks = new THREE.InstancedMesh(tube, new THREE.ShaderMaterial({ ...additive,
    vertexShader: plumeVertex('1.'), fragmentShader: STREAK_FRAGMENT }), rearPorts.length);
  const halo = new THREE.InstancedMesh(tube, new THREE.ShaderMaterial({ ...additive,
    vertexShader: plumeVertex('1.3'), fragmentShader: HALO_FRAGMENT }), rearPorts.length);
  const matrix = new THREE.Matrix4(), yaw = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3(1, 1, 1);
  rearPorts.forEach((port, i) => { // outer streaks fan out so they stay visible beside the chase camera
    yaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), port.position[0] * 0.2);
    streaks.setMatrixAt(i, matrix.compose(at.fromArray(port.position), yaw, size)); halo.setMatrixAt(i, matrix);
  });
  streaks.name = 'NITRO trail streaks'; streaks.frustumCulled = false; streaks.visible = false; car.add(streaks);
  halo.name = 'NITRO trail halo'; halo.frustumCulled = false; halo.visible = false; car.add(halo);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ ...additive,
    vertexShader: POOL_VERTEX, fragmentShader: POOL_FRAGMENT }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.04, rearPorts[0].position[2] + 4.6); pool.scale.set(3.2, 11.5, 1); // starts under the bumper
  pool.name = 'NITRO trail road glow'; pool.frustumCulled = false; pool.visible = false; car.add(pool);
  let lastPower = 0, igniteAt = -Infinity;
  return {
    streaks, halo, pool,
    setStyle(style, rgb) { uniforms.style.value = style; uniforms.color.value.set(...rgb); },
    // Low keeps the streaks but skips the halo and road overdraw; callers pass enabled=false for VFX Off / Reduced Motion.
    // speed (m/s) stretches the streak: the length of the trail, not its brightness, tells how fast the car goes.
    update(time, power, quality, enabled, speed = 0) {
      streaks.visible = enabled && uniforms.style.value > 0 && power > 0.01;
      pool.visible = halo.visible = streaks.visible && quality > 0.25;
      const level = Math.min(1, Math.max(0, power));
      if (level > 0.01 && lastPower <= 0.01) igniteAt = time; // one swell per NITRO start, never a repeating pulse
      lastPower = level;
      uniforms.ignite.value = Math.max(0, 1 - (time - igniteAt) / IGNITION_SECONDS);
      uniforms.time.value = time; uniforms.power.value = level;
      uniforms.trailLength.value = SHORTEST + (LONGEST - SHORTEST) * level * Math.min(1, Math.max(0, speed) / MAX_SPEED);
    },
  };
}
