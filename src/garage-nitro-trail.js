import * as THREE from 'three';

// NITRO trail skins: a hot flame at every exhaust, a long light streak behind it and the glow it throws on the
// road. One program for all four styles (1 cyan laser, 2 gold pulse, 3 crimson dash, 4 nebula twin ribbons):
// a skin swap writes uniforms only, and the meshes sit on the car (hidden) from creation for shader warm-up.
const STREAK_VERTEX = `uniform float time,style,trailLength;varying vec2 vUv;
  void main(){vUv=uv;vec3 p=position;float u=clamp(p.z,0.,1.);
    float w=mix(1.,.3,u)*(style>3.5?1.2:style>.5&&style<1.5?.7:1.); // nebula ribbons spread wide; the laser stays tight
    if(style>3.5){float a=u*9.-time*6.;p.xy=mat2(cos(a),sin(a),-sin(a),cos(a))*p.xy;} // crossed quads twist into helices
    p.xy*=w;p.z*=trailLength;
    gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`;
const STREAK_FRAGMENT = `varying vec2 vUv;uniform float time,power,style;uniform vec3 color;
  float hash(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}
  void main(){float u=clamp(vUv.y,0.,1.);float x=clamp(vUv.x,0.,1.)*2.-1.;
    float core=exp(-x*x*9.);float edge=exp(-x*x*2.5);
    float nozzle=exp(-u*7.);float tail=pow(max(0.,1.-u),1.3);
    float glint=step(.965,hash(floor(vec2(x*5.,u*46.-time*22.))))*edge;
    float body=edge*.35+core;vec3 tint=color;
    if(style>.5&&style<1.5){body=core*1.6*(.8+.2*sin(u*70.-time*45.))+edge*.15;glint*=1.5;} // ice laser
    if(style>1.5&&style<2.5){float k=fract(u*5.-time*3.2);float beat=1.+.6*pow(max(0.,sin(time*20.)),4.);
      body=(edge*.2+core*.4+exp(-abs(k-.5)*14.)*2.6*edge)*beat;nozzle*=beat;} // golden pulses race back
    if(style>2.5&&style<3.5){float k=u*8.-time*7.;float on=step(.42,fract(k+.3*hash(vec2(floor(k),1.))));
      body=core*1.8*on+edge*.08;glint*=2.;} // crimson tracer dashes and embers
    if(style>3.5){body=(edge*.35+core*.9)*(.6+.4*sin(u*14.-time*5.));tint=mix(color,vec3(1.,.22,.8),.5+.5*sin(u*8.-time*3.));glint*=1.6;} // violet-to-magenta nebula
    vec3 col=tint*(body+nozzle*1.2+nozzle*core*1.5)+mix(tint,vec3(1.),.6)*glint*2.; // the nozzle stays the skin colour, not white
    gl_FragColor=vec4(col,clamp((body*tail+nozzle*.9+glint)*power,0.,1.));}`;
const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const POOL_FRAGMENT = `varying vec2 vUv;uniform float time,power,style;uniform vec3 color;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;float u=1.-clamp(vUv.y,0.,1.); // u: 0 at the bumper, 1 far back
    float qx=q.x;float glow=exp(-qx*qx*4.)*exp(-clamp(u,0.,1.)*2.2);
    float beat=style>1.5&&style<2.5?.7+.6*pow(max(0.,sin(time*20.)),4.):1.;
    gl_FragColor=vec4(color*1.2,clamp(glow*beat*power*.32,0.,1.));}`;

function crossedQuads() { // two quads along +z (0..1), one flat and one upright: volume from every angle
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const upright = new THREE.PlaneGeometry(1, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0, 0.5);
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'uv']) {
    const a = flat.attributes[name].array, b = upright.attributes[name].array;
    const merged = new Float32Array(a.length + b.length); merged.set(a); merged.set(b, a.length);
    geometry.setAttribute(name, new THREE.BufferAttribute(merged, name === 'uv' ? 2 : 3));
  }
  const index = [...flat.index.array, ...Array.from(upright.index.array, i => i + 4)];
  geometry.setIndex(index);
  return geometry;
}

export function createNitroTrail(car, rearPorts) {
  const uniforms = { time: { value: 0 }, power: { value: 0 }, style: { value: 0 }, trailLength: { value: 8 },
    color: { value: new THREE.Vector3(1, 1, 1) } };
  const additive = { uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending };
  const streaks = new THREE.InstancedMesh(crossedQuads(), new THREE.ShaderMaterial({ ...additive,
    vertexShader: STREAK_VERTEX, fragmentShader: STREAK_FRAGMENT }), rearPorts.length);
  const matrix = new THREE.Matrix4(), yaw = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3(0.42, 0.42, 1);
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
