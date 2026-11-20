import * as THREE from 'three';
import { createSprintRoadPlacement } from './sprint-plume.ts';
import { MAX_SPEED } from './drive-rules.ts';
import { nitroFlame } from './nitro-flame-texture.ts';

// NITRO trail skins: a hot flame at every exhaust, a long light streak behind it and the glow it throws on the
// road. One program for all four styles (1 cyan laser, 2 gold pulse, 3 crimson dash, 4 nebula twin ribbons):
// a skin swap writes uniforms only, and the meshes sit on the car (hidden) from creation for shader warm-up.
// Each plume is an open tube (unit radius, u along +z) that leaves its round nozzle at exactly the nozzle radius and
// swells behind it; the view-facing term shades it as a glowing round jet, so it reads as gas, never as a flat card.
// Comfort (.claude/rules/nitro-trail-vfx.md): the whole plume, halo and road glow change no faster than 3 Hz; only
// thin streaks on the core flow back fast (±18%, ~10 Hz), which is what sells speed. Colour caps at 1.2, and only the
// small white-hot nozzle core passes the bloom threshold. Speed comes from flow and length, not glow: the trail stretches with car
// speed and a tight halo flares once at ignition.
const IGNITION_SECONDS = 0.45;
const SHORTEST = 3, LONGEST = 17; // metres: a 20 m/s crawl keeps a stub, NITRO at top speed draws the full streak
const plumeVertex = shell => `uniform float time,style,trailLength,nozzleRadius,ignite;varying vec2 vUv;varying float vFacing;varying float vWide;varying float vAxis;
  void main(){vUv=uv;float u=clamp(position.z,0.,1.);
    float grow=style>3.5?2.5:style>2.5?1.8:style>1.5?2.1:1.15;
    if(style>1.5&&style<2.5)grow*=1.+.32*exp(-abs(fract(u*3.-time*1.35)-.5)*7.);
    float r=nozzleRadius*(1.+grow*sqrt(u))*${shell}*(1.+ignite*.6*(1.-u)); // the ignition swell bulges the mouth
    vWide=r;
    vec3 p=vec3(position.xy*r,u*trailLength);
    vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);
    vec3 n=normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(position.xy,0.));
    vFacing=abs(dot(n,normalize(-view.xyz)));
    float along=dot(normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(0.,0.,1.)),normalize(-view.xyz));
    vAxis=sqrt(max(0.,1.-along*along)); // the most vFacing can be here: 1 side-on, near 0 down the jet's axis
    gl_Position=projectionMatrix*view;}`;
const HASH = 'float hash(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}';
const FLOW = 'float flow(float x){return 1.+.18*sin(x);}'; // the only term allowed past 3 Hz: thin, ±18%
// The flame texture (nitro-flame-texture.ts) gives the jet its shape: R tears the body into tongues and erodes its
// edge (`lick`, `torn`), G roughens that edge, B is the thin hot filaments along the core (`hair`). Patterns are
// scaled in metres (`m`), not `u`: the chase camera sees only the first 3 to 4 m of a 17 m trail. `rim` is the
// view-normalised profile (vFacing never passes ~.3 seen end-on), so the body reads down the axis. A sample scrolled
// by `time*N` changes N x cycles times a second at one pixel; the real image's busiest columns hold R 3, G 11, B 3 cycles
// a tile, so 1 x 3 and .27 x 11 stay under 3 Hz. On the
// neutral 1 x 1 fallback (.5) `lick` is 1, `hair` is 0 and `torn` only narrows the jet: smooth, never broken.
// `white` is the white-hot nozzle core, the one light added after the .66 normalisation: steady (no time, ignition or
// texture), it ends 0.3 m behind the nozzle and wherever a swell draws the jet wider than 0.16 m.
const STREAK_FRAGMENT = `varying vec2 vUv;varying float vFacing;varying float vWide;varying float vAxis;uniform float time,power,style,ignite,trailLength;uniform vec3 color;uniform sampler2D flame;${HASH}${FLOW}
  void main(){float u=clamp(vUv.y,0.,1.);float a=clamp(vUv.x,0.,1.);float f=clamp(vFacing,0.,1.);
    float m=u*trailLength;float rim=clamp(f/max(vAxis,.08),0.,1.); // metres behind the nozzle; 1 on the jet's centre line, 0 at its silhouette
    float tongue=texture2D(flame,vec2(a,m*.5-time*1.)).r;
    vec2 fine=texture2D(flame,vec2(a*2.+tongue*.1,m*.12-time*.27)).gb; // x: G turbulence, y: B filaments
    float rush=flow(u*40.+a*25.13-time*60.); // four thin streaks race back at ~10 Hz
    float lick=smoothstep(.25,.75,tongue)*2.;
    float hair=smoothstep(.52,.85,fine.y)*rim*rim*rush;
    float torn=smoothstep(0.,.3,rim*.8+(tongue-.5)*1.6+(fine.x-.5)*.5-clamp(m*.3,0.,.5)-u*.4);
    float edge=pow(max(0.,f),1.2); // bright down the jet's axis, soft at its rim
    float core=pow(max(0.,f),3.)*rush;
    float nozzle=exp(-u*9.)*(1.+ignite*1.5);
    float tail=pow(max(0.,1.-u),1.65)*torn; // the jet burns away from its rim, dark tongues first
    float glint=pow(max(0.,hash(floor(vec2(a*14.,u*32.)))),24.)*edge*.12;
    float filament=.5+.5*cos(a*18.85-u*13.+time*3.8);
    float body=edge*.15+core;vec3 tint=color;
    if(style>.5&&style<1.5){body=core*(.86+.19*filament)+edge*.12;glint*=.45;} // steady cyan filament
    if(style>1.5&&style<2.5){float band=exp(-abs(fract(u*3.-time*1.35)-.5)*7.);
      body=edge*(.23+.53*band)*(.78+.22*filament)+core*.35;} // amber bands travel through steady exhaust
    if(style>2.5&&style<3.5){float k=fract(u*5.-time*2.65);
      float dash=smoothstep(.06,.27,k)*(1.-smoothstep(.61,.92,k));
      body=core*(.28+.64*dash)*(.8+.2*filament)+edge*.12;glint*=1.3;} // soft red segments and embers
    if(style>3.5){float twin=pow(max(0.,sin(a*12.566-u*9.+time*4.2)),6.);
      body=edge*.13+core*.28+twin*.85*edge;
      tint=mix(color,vec3(.72,.23,.61),.26+.48*filament);} // two violet ribbons
    body=(body+rim*.75)*lick+hair*.6;
    float white=(1.-smoothstep(.05,.3,u*trailLength))*(1.-smoothstep(.11,.16,vWide))*smoothstep(0.,.2,f);
    vec3 light=tint*(.19+body*.41+nozzle*.19+glint);
    light*=.66/max(.66,max(light.r,max(light.g,light.b)));
    light+=mix(color,vec3(1.),.75)*white*1.2;
    gl_FragColor=vec4(min(light,vec3(1.2)),clamp((body*tail+nozzle*.42*edge+glint+white)*power,0.,.76));}`;
const HALO_FRAGMENT = `varying vec2 vUv;varying float vFacing;uniform float time,power,style,ignite;uniform vec3 color;${HASH}
  void main(){float u=clamp(vUv.y,0.,1.);float a=clamp(vUv.x,0.,1.);float f=clamp(vFacing,0.,1.);
    float flare=.4+ignite*1.6; // a faint sheath while cruising, a bright bloom only for the ignition swell
    float soft=sqrt(f)*(1.-.7*f)*smoothstep(0.,.12,u)*pow(max(0.,1.-u),2.4); // peaks off the core and stays near the nozzle
    vec2 c=vec2(a*6.,u*5.-time*1.2);float d=length(fract(c)-.5); // embers drift back: 1.5 cells a second at one pixel
    float ember=step(.75,hash(floor(c)))*(1.-smoothstep(.08,.35,d))*max(0.,1.-u)*sqrt(f);
    vec3 tint=style>3.5?mix(color,vec3(.72,.23,.61),.5):color;
    vec3 col=tint*soft*1.6*flare+mix(tint,vec3(1.),.4)*ember*2.5;
    gl_FragColor=vec4(min(col*.5,vec3(1.2)),clamp((soft*.5*flare+ember)*power,0.,1.));}`;
const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const POOL_FRAGMENT = `varying vec2 vUv;uniform float power;uniform vec3 color;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;float u=clamp(1.-vUv.y,0.,1.);
    float across=clamp(q.x*q.x,0.,1.);
    float glow=exp(-across*4.)*exp(-u*2.4)*(1.-smoothstep(.65,1.,u));
    float tracks=.78+.22*abs(cos(q.x*8.));
    gl_FragColor=vec4(min(color*.78,vec3(1.2)),glow*tracks*power*.13);}`;

function plumeTube() { // open round tube, unit radius, mouth at z=0 and tail at z=1 (uv.x around, uv.y along)
  return new THREE.CylinderGeometry(1, 1, 1, 16, 24, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
}

export function createNitroTrail(car, rearPorts, vehicle, ground, flame = nitroFlame) {
  const uniforms = { time: { value: 0 }, power: { value: 0 }, style: { value: 0 }, trailLength: { value: 8 }, ignite: { value: 0 }, nozzleRadius: { value: rearPorts[0].size },
    color: { value: new THREE.Vector3(1, 1, 1) }, flame: flame.uniform }; // the sampler exists from creation: warm-up compiles it
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
  const poolZ = rearPorts[0].position[2] + 2.75;
  const placeRoadGlow = createSprintRoadPlacement(car, vehicle, ground);
  pool.rotation.x = -Math.PI / 2; pool.scale.set(1.6, 5.5, 1);
  pool.name = 'NITRO trail road glow'; pool.frustumCulled = false; pool.visible = false; car.add(pool);
  let previousTime = 0, lastPower = 0, igniteAt = -Infinity;
  return {
    streaks, halo, pool,
    setStyle(style, rgb) {
      uniforms.style.value = style; uniforms.color.value.set(...rgb);
      if (style > 0) flame.request(); // fetched once, and only for a player who equips a trail skin
    },
    // Low keeps the streaks but skips the halo and road overdraw; callers pass enabled=false for VFX Off / Reduced Motion.
    // speed (m/s) stretches the streak: its length, not its brightness, tells how fast the car goes. The road gets a
    // short, steady reflection on the ground only. Chain energy changes only length and travel speed.
    update(time, power, quality, enabled, speed = 0, grounded = false, chain = 0) {
      streaks.visible = enabled && uniforms.style.value > 0 && power > 0.01;
      halo.visible = streaks.visible && quality > 0.25;
      pool.visible = halo.visible && grounded;
      if (pool.visible) placeRoadGlow(pool, poolZ);
      const dt = Math.max(0, time - previousTime);
      previousTime = time;
      if (streaks.visible) uniforms.time.value += dt * (1 + chain * .5);
      const level = THREE.MathUtils.clamp(power, 0, 1);
      if (level > 0.01 && lastPower <= 0.01) igniteAt = time; // one swell per NITRO start, never a repeating pulse
      lastPower = level;
      uniforms.ignite.value = Math.max(0, 1 - (time - igniteAt) / IGNITION_SECONDS);
      uniforms.power.value = level;
      uniforms.trailLength.value = SHORTEST + (LONGEST - SHORTEST) * level * Math.min(1, Math.max(0, speed) / MAX_SPEED) + 6 * chain;
    },
  };
}
