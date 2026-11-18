import * as THREE from 'three';
import { createSprintRoadPlacement } from './sprint-plume.ts';

// NITRO trail skins: a hot flame at every exhaust, a long light streak behind it and the glow it throws on the
// road. One program for all four styles (1 cyan laser, 2 gold pulse, 3 crimson dash, 4 nebula twin ribbons):
// a skin swap writes uniforms only, and the meshes sit on the car (hidden) from creation for shader warm-up.
// Each plume is an open tube (unit radius, u along +z) that leaves its round nozzle at exactly the nozzle radius and
// swells behind it; the view-facing term shades it as a glowing round jet, so it reads as gas, never as a flat card.
const STREAK_VERTEX = `uniform float time,style,trailLength,nozzleRadius;varying vec2 vUv;varying float vFacing;
  void main(){vUv=uv;float u=clamp(position.z,0.,1.);
    float grow=style>3.5?2.5:style>2.5?1.8:style>1.5?2.1:1.15;
    if(style>1.5&&style<2.5)grow*=1.+.32*exp(-abs(fract(u*3.-time*1.35)-.5)*7.);
    float r=nozzleRadius*(1.+grow*sqrt(u));
    vec3 p=vec3(position.xy*r,u*trailLength);
    vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);
    vec3 n=normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(position.xy,0.));
    vFacing=abs(dot(n,normalize(-view.xyz)));
    gl_Position=projectionMatrix*view;}`;
const STREAK_FRAGMENT = `varying vec2 vUv;varying float vFacing;uniform float time,power,style;uniform vec3 color;
  float hash(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}
  void main(){float u=clamp(vUv.y,0.,1.);float a=clamp(vUv.x,0.,1.);float f=clamp(vFacing,0.,1.);
    float core=pow(max(0.,f),3.);float edge=pow(max(0.,f),1.2); // bright down the jet's axis, soft at its rim
    float nozzle=exp(-u*9.);float tail=pow(max(0.,1.-u),1.65);
    float glint=pow(hash(floor(vec2(a*14.,u*32.))),24.)*edge*.12;
    float body=edge*.15+core;vec3 tint=color;
    if(style>.5&&style<1.5){body=core*1.05+edge*.12;glint*=.45;} // steady cyan filament
    if(style>1.5&&style<2.5){float band=exp(-abs(fract(u*3.-time*1.35)-.5)*7.);
      body=edge*(.23+.53*band)+core*.35;} // amber bands travel through steady exhaust
    if(style>2.5&&style<3.5){float k=fract(u*5.-time*2.65);
      float dash=smoothstep(.06,.27,k)*(1.-smoothstep(.61,.92,k));
      body=core*(.28+.64*dash)+edge*.12;glint*=1.3;} // soft red segments and embers
    if(style>3.5){float twin=pow(max(0.,sin(a*12.566-u*9.+time*4.2)),6.);
      body=edge*.13+core*.28+twin*.85*edge;
      tint=mix(color,vec3(.72,.23,.61),.45+.25*sin(u*8.-time*2.));} // two violet ribbons
    vec3 light=tint*(.19+body*.41+nozzle*.19+glint);
    light*=.66/max(.66,max(light.r,max(light.g,light.b)));
    gl_FragColor=vec4(light,clamp((body*tail+nozzle*.42*edge+glint)*power,0.,.76));}`;
const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const POOL_FRAGMENT = `varying vec2 vUv;uniform float power;uniform vec3 color;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;float u=1.-clamp(vUv.y,0.,1.);
    float glow=exp(-q.x*q.x*4.)*exp(-u*2.4)*(1.-smoothstep(.65,1.,u));
    gl_FragColor=vec4(color*.78,glow*power*.13);}`;

function plumeTube() { // open round tube, unit radius, mouth at z=0 and tail at z=1 (uv.x around, uv.y along)
  return new THREE.CylinderGeometry(1, 1, 1, 16, 24, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
}

export function createNitroTrail(car, rearPorts, vehicle, ground) {
  const uniforms = { time: { value: 0 }, power: { value: 0 }, style: { value: 0 }, trailLength: { value: 8 }, nozzleRadius: { value: rearPorts[0].size },
    color: { value: new THREE.Vector3(1, 1, 1) } };
  const additive = { uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending };
  const streaks = new THREE.InstancedMesh(plumeTube(), new THREE.ShaderMaterial({ ...additive,
    vertexShader: STREAK_VERTEX, fragmentShader: STREAK_FRAGMENT }), rearPorts.length);
  const matrix = new THREE.Matrix4(), yaw = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3(1, 1, 1);
  rearPorts.forEach((port, i) => { // outer streaks fan out so they stay visible beside the chase camera
    yaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), port.position[0] * 0.2);
    streaks.setMatrixAt(i, matrix.compose(at.fromArray(port.position), yaw, size));
  });
  streaks.name = 'NITRO trail streaks'; streaks.frustumCulled = false; streaks.visible = false; car.add(streaks);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ ...additive,
    vertexShader: POOL_VERTEX, fragmentShader: POOL_FRAGMENT }));
  const poolZ = rearPorts[0].position[2] + 2.75;
  const placeRoadGlow = createSprintRoadPlacement(car, vehicle, ground);
  pool.rotation.x = -Math.PI / 2; pool.scale.set(1.6, 5.5, 1);
  pool.name = 'NITRO trail road glow'; pool.frustumCulled = false; pool.visible = false; car.add(pool);
  let previousTime = 0;
  return {
    streaks, pool,
    setStyle(style, rgb) { uniforms.style.value = style; uniforms.color.value.set(...rgb); },
    // The road gets a short, steady reflection. Chain energy changes only length and travel speed.
    update(time, power, quality, enabled, grounded = false, chain = 0) {
      streaks.visible = enabled && uniforms.style.value > 0 && power > 0.01;
      pool.visible = streaks.visible && grounded && quality > 0.25;
      if (pool.visible) placeRoadGlow(pool, poolZ);
      const dt = Math.max(0, time - previousTime);
      previousTime = time;
      if (streaks.visible) uniforms.time.value += dt * (1 + chain * .5);
      uniforms.power.value = THREE.MathUtils.clamp(power, 0, 1);
      uniforms.trailLength.value = 6 + 7 * uniforms.power.value + 6 * chain;
    },
  };
}
