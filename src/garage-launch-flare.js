import * as THREE from 'three';
import { FLARE_SHAPES, LAUNCH_FLARE_STYLES } from './garage-launch-flare-styles.ts';

const ANCHOR = new THREE.Vector3(0, 0.6, 2.75); // just behind the tail; the car's rear faces +z

// One burst billboard and one body shell, each a single program for every flare skin: a skin swap writes
// uniforms only, and both meshes sit in the scene (hidden) from creation so shader warm-up compiles them.
const BURST_VERTEX = `uniform float size,age,shape;varying vec2 vUv;
  void main(){vUv=uv;vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.);
    float grow=size*(.35+.65*(1.-pow(max(0.,1.-clamp(age*3.,0.,1.)),3.)));
    c.xy+=position.xy*grow;c.y+=grow*(shape>2.5?.7:.55); // lift clear of the road; fans erupt upward from the tail
    gl_Position=projectionMatrix*c;}`;
const BURST_FRAGMENT = `varying vec2 vUv;
  uniform float age,power,time,shape,rays,swirl,pulse,corona,core;uniform vec3 primary,secondary;
  float hash(float n){return fract(sin(n*12.9898)*43758.5453);}
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;vec2 p=q;
    if(shape>2.5)p.y+=.7;
    if(shape>1.5&&shape<2.5)p+=vec2(.18,.2); // crimson shock bursts off-centre
    float r=length(p);float a=r<1e-4?0.:atan(p.y,p.x);
    a+=swirl*(r*2.5-time*.8); // magenta vortex twists its rays
    float k=a/6.28318*rays;float id=floor(k+.5);
    float reach=.4+.55*hash(id+7.);
    float spike=pow(max(0.,1.-abs(k-id)*2.2),6.)*smoothstep(reach,0.,r);
    float fine=pow(max(0.,abs(cos(a*rays*1.5+hash(id)*6.))),24.)*smoothstep(.85,0.,r)*.55;
    float rayLight=spike+fine;
    if(shape>2.5)rayLight*=smoothstep(-.2,.35,p.y/(r+.001));
    float d=dot(p,vec2(.7071));float across=dot(p,vec2(-.7071,.7071));
    float beam=shape>1.5&&shape<2.5?exp(-abs(across)*24.)*smoothstep(-.1,.15,d)*smoothstep(1.15,.25,d):0.;
    float R=.42+.42*clamp(age,0.,1.);float wob=.035*sin(a*9.+time*7.);
    float outer=exp(-abs(r-R-.17+wob)*26.),inner=exp(-abs(r-R+.06-wob)*22.);
    float hot=exp(-dot(p,p)*26./core);float halo=exp(-length(p)*4.5);
    float flame=corona*exp(-abs(r-.3-.05*sin(a*12.+time*9.))*16.);
    float rings=pulse*exp(-abs(fract(r*2.5-time*3.)-.5)*9.)*smoothstep(.95,.15,r);
    float mist=exp(-abs(r-.78)*7.)*.07;
    vec3 col=shape>.5&&shape<1.5
      ?primary*outer*1.7+secondary*inner*1.8+secondary*hot*.35
      :primary*(rayLight*1.3+halo*.25+flame*1.2+rings*.8)+secondary*beam*1.5+mix(secondary,vec3(1.),.3)*hot*1.3;
    col+=vec3(.75,.8,.9)*mist;
    float life=pow(max(0.,1.-age),1.4)*(1.+pulse*.45*sin(age*42.));
    float edge=smoothstep(1.,.7,length(q)); // round falloff: no square halo
    gl_FragColor=vec4(col,clamp(life*power*edge,0.,1.));}`;
const GLOW_VERTEX = `varying vec3 vPos,vN,vView;
  void main(){vPos=position;vec4 mv=modelViewMatrix*vec4(position+normal*.04,1.);
    vN=normalMatrix*normal;vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const GLOW_FRAGMENT = `varying vec3 vPos,vN,vView;
  uniform float age,power,time,shape,swirl,pulse,corona;uniform vec3 primary,secondary;
  void main(){float facing=abs(dot(normalize(vN),normalize(vView)));
    float rim=pow(max(0.,1.-facing),2.);
    float front=mix(3.,-3.,clamp(age*1.6,0.,1.)); // light sweeps tail to nose
    float lane=vPos.z;
    if(shape>1.5&&shape<2.5)lane=vPos.z+vPos.x*1.3; // crimson slash crosses the body
    if(shape>2.5)lane=3.-(vPos.y-.35)*7.; // fans rise from the sills to the roof
    vec2 s=vec2(vPos.x,vPos.y-.6);lane+=swirl*.35*sin((dot(s,s)<1e-8?0.:atan(s.y,s.x))*2.+time*6.);
    float band=exp(-abs(lane-front)*4.);
    float band2=shape>.5&&shape<1.5?exp(-abs(lane-front-.9)*4.):0.; // second, blue ring
    float throb=1.+pulse*.6*sin(time*18.);float flick=1.+corona*.35*sin(vPos.z*9.+time*23.);
    vec3 col=primary*(rim*1.5+band*2.)*throb*flick+secondary*(band2*2.+band*.5);
    gl_FragColor=vec4(col,clamp((rim*.9+band*1.2+band2)*pow(max(0.,1.-age),1.2)*power,0.,1.));}`;

export function createLaunchFlare(scene, vehicle) {
  const uniforms = Object.fromEntries(['age', 'power', 'time', 'shape', 'rays', 'swirl', 'pulse', 'corona', 'core', 'size']
    .map(key => [key, { value: 0 }]));
  uniforms.core.value = uniforms.size.value = 1; // never divide by zero, even in the hidden warm-up draw
  uniforms.primary = { value: new THREE.Vector3(1, 1, 1) }; uniforms.secondary = { value: new THREE.Vector3(1, 1, 1) };
  const additive = { uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    ...additive, side: THREE.DoubleSide, vertexShader: BURST_VERTEX, fragmentShader: BURST_FRAGMENT }));
  burst.name = 'Launch flare burst'; burst.frustumCulled = false; burst.visible = false; scene.add(burst);
  const body = vehicle.userData.body;
  const glow = new THREE.Mesh(body.geometry, new THREE.ShaderMaterial({ ...additive, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT }));
  glow.name = 'Launch flare body glow'; glow.visible = false; body.add(glow);
  const start = new THREE.Vector3();
  let style = null, age = 1, duration = 1;
  const hide = () => { age = 1; burst.visible = glow.visible = false; };
  return {
    get active() { return burst.visible; },
    reset: hide,
    setSkin(id) {
      style = LAUNCH_FLARE_STYLES[id] ?? null;
      if (!style) return hide();
      for (const key of ['rays', 'swirl', 'pulse', 'corona', 'core', 'size']) uniforms[key].value = style[key];
      uniforms.shape.value = FLARE_SHAPES.indexOf(style.shape);
      uniforms.primary.value.fromArray(style.primary); uniforms.secondary.value.fromArray(style.secondary);
    },
    trigger(position, quaternion, seconds) {
      if (!style) return;
      start.copy(ANCHOR).applyQuaternion(quaternion).add(position); age = 0; duration = seconds;
    },
    // Low keeps the burst but skips the full-body overdraw; VFX Off / Reduced Motion pass enabled=false.
    update(dt, time, origin, enabled, quality, power) {
      if (age < 1) age = Math.min(1, age + dt / duration);
      burst.visible = !!style && enabled && age < 1;
      glow.visible = burst.visible && quality > 0.25;
      if (!burst.visible) return;
      uniforms.age.value = age; uniforms.time.value = time; uniforms.power.value = power;
      burst.position.copy(start).sub(origin);
    },
  };
}
