import * as THREE from 'three';

// NITRO trail skins: a hot flame at every exhaust, a long light streak behind it and the glow it throws on the
// road. One program for all four styles (1 cyan laser, 2 gold pulse, 3 crimson dash, 4 nebula twin ribbons):
// a skin swap writes uniforms only, and the meshes sit on the car (hidden) from creation for shader warm-up.
// Each plume is an open tube (unit radius, u along +z) that leaves its round nozzle at exactly the nozzle radius and
// swells behind it; the view-facing term shades it as a glowing round jet, so it reads as gas, never as a flat card.
const STREAK_VERTEX = `uniform float time,style,trailLength,nozzleRadius;varying vec2 vUv;varying float vFacing;
  void main(){vUv=uv;float u=clamp(position.z,0.,1.);
    float grow=style>3.5?4.:style>2.5?2.2:style>1.5?2.8:style>.5?1.2:2.; // nebula billows; the laser stays tight
    if(style>1.5&&style<2.5)grow*=1.+.5*exp(-abs(fract(u*5.-time*3.2)-.5)*12.); // golden pulses bulge as they race back
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
    float nozzle=exp(-u*7.);float tail=pow(max(0.,1.-u),1.3);
    float glint=step(.965,hash(floor(vec2(a*16.,u*46.-time*22.))))*edge;
    float body=edge*.35+core;vec3 tint=color;
    if(style>.5&&style<1.5){body=core*1.6*(.8+.2*sin(u*70.-time*45.))+edge*.15;glint*=1.5;} // ice laser
    if(style>1.5&&style<2.5){float k=fract(u*5.-time*3.2);float beat=1.+.6*pow(max(0.,sin(time*20.)),4.);
      body=(edge*.2+core*.4+exp(-abs(k-.5)*14.)*2.6*edge)*beat;nozzle*=beat;} // golden pulses race back
    if(style>2.5&&style<3.5){float k=u*8.-time*7.;float on=step(.42,fract(k+.3*hash(vec2(floor(k),1.))));
      body=core*1.8*on+edge*.08;glint*=2.;} // crimson tracer dashes and embers
    if(style>3.5){float twin=pow(max(0.,sin(a*12.566-u*9.+time*6.)),6.); // two ribbons wind around the plume
      body=edge*.25+core*.5+twin*1.4*edge;tint=mix(color,vec3(1.,.22,.8),.5+.5*sin(u*8.-time*3.));glint*=1.6;} // violet-to-magenta nebula
    vec3 col=tint*(body+nozzle*1.2+nozzle*core*1.5)+mix(tint,vec3(1.),.6)*glint*2.; // the nozzle stays the skin colour, not white
    gl_FragColor=vec4(col,clamp((body*tail+nozzle*.9*edge+glint)*power,0.,1.));}`;
const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const POOL_FRAGMENT = `varying vec2 vUv;uniform float time,power,style;uniform vec3 color;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;float u=1.-clamp(vUv.y,0.,1.); // u: 0 at the bumper, 1 far back
    float qx=q.x;float glow=exp(-qx*qx*4.)*exp(-clamp(u,0.,1.)*2.2);
    float beat=style>1.5&&style<2.5?.7+.6*pow(max(0.,sin(time*20.)),4.):1.;
    gl_FragColor=vec4(color*1.2,clamp(glow*beat*power*.32,0.,1.));}`;

function plumeTube() { // open round tube, unit radius, mouth at z=0 and tail at z=1 (uv.x around, uv.y along)
  return new THREE.CylinderGeometry(1, 1, 1, 16, 24, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
}

export function createNitroTrail(car, rearPorts) {
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
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.04, rearPorts[0].position[2] + 5); pool.scale.set(2.3, 10, 1);
  pool.name = 'NITRO trail road glow'; pool.frustumCulled = false; pool.visible = false; car.add(pool);
  return {
    streaks, pool,
    setStyle(style, rgb) { uniforms.style.value = style; uniforms.color.value.set(...rgb); },
    // Low keeps the streaks but skips the road overdraw; callers pass enabled=false for VFX Off / Reduced Motion.
    update(time, power, quality, enabled) {
      streaks.visible = enabled && uniforms.style.value > 0 && power > 0.01;
      pool.visible = streaks.visible && quality > 0.25;
      uniforms.time.value = time; uniforms.power.value = Math.min(1, Math.max(0, power));
      uniforms.trailLength.value = 6 + 8 * uniforms.power.value;
    },
  };
}
