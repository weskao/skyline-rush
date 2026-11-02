// GLSL for the 3D launch flare. Every part shares one uniforms object, so a skin swap writes uniforms only.
// View-facing terms (vFacing / vRim) give each mesh its volume: rods glow along their core, shells at the rim.
const VIEW = 'normalize(-mv.xyz+vec3(0.,0.,1e-5))'; // never normalize a zero vector at the eye
const LIFE = 'pow(max(0.,1.-age),1.4)';

// Light pool on the road under the car: the flare erupts from below, so the road lights up first.
export const POOL_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
export const POOL_FRAGMENT = `varying vec2 vUv;uniform float age,power,time,pulse,corona;uniform vec3 primary,secondary;
  void main(){vec2 q=clamp(vUv,0.,1.)*2.-1.;
    float pool=exp(-dot(q,q)*2.6);float hot=exp(-dot(q*vec2(1.,.6),q*vec2(1.,.6))*9.);
    float flick=1.+corona*.25*sin(time*23.+q.y*7.)+pulse*.35*sin(time*14.);
    vec3 col=primary*pool*1.4+mix(secondary,vec3(1.),.25)*hot*1.2;
    float life=${LIFE}*smoothstep(0.,.06,age+.02);
    gl_FragColor=vec4(col*flick,clamp(pool*life*power*1.5,0.,1.));}`;

// Instanced cones rising from the sills; each instance matrix carries its base, 3D direction and length.
export const RAY_VERTEX = `attribute float tone;uniform float age;varying float vT,vTone,vFacing;
  void main(){vec3 p=position;p.y*=1.-pow(max(0.,1.-clamp(age*2.5,0.,1.)),3.);
    vT=clamp(position.y,0.,1.);vTone=tone;
    vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.);
    vFacing=abs(dot(normalize(normalMatrix*mat3(instanceMatrix)*normal),${VIEW}));
    gl_Position=projectionMatrix*mv;}`;
export const RAY_FRAGMENT = `uniform float age,power;uniform vec3 primary,secondary;varying float vT,vTone,vFacing;
  void main(){vec3 col=mix(primary,mix(secondary,vec3(1.),.35),vTone)*(1.+2.*pow(max(0.,1.-vT),3.));
    float body=pow(max(0.,1.-vT),1.2)*(.35+.65*vFacing);
    gl_FragColor=vec4(col,clamp(body*${LIFE}*power*1.4,0.,1.));}`;

// Two horizontal rings around the body (instance matrices size them to the car): they climb from the sills
// to the roof as the flare ages, the inner tone a beat behind, rippling as they rise.
export const RING_VERTEX = `attribute float tone;uniform float age,time;varying float vTone,vFacing;
  void main(){vec3 p=position;float a=atan(p.y,p.x);
    float rise=clamp(age*1.6-tone*.25,0.,1.);rise=1.-pow(max(0.,1.-rise),2.);
    p.xy*=1.+.12*rise;p.z+=.1+rise*1.45+.05*sin(a*9.+time*7.+tone*3.);
    vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.);
    vFacing=abs(dot(normalize(normalMatrix*mat3(instanceMatrix)*normal),${VIEW}));
    vTone=tone;gl_Position=projectionMatrix*mv;}`;
export const RING_FRAGMENT = `uniform float age,power;uniform vec3 primary,secondary;varying float vTone,vFacing;
  void main(){vec3 col=vTone>.5?secondary*1.8:primary*1.7;
    gl_FragColor=vec4(col,clamp((.45+.55*vFacing)*${LIFE}*power,0.,1.));}`;

// Light sweeps over the car body (unchanged from the flat flare).
export const BODY_VERTEX = `varying vec3 vPos,vN,vView;
  void main(){vPos=position;vec4 mv=modelViewMatrix*vec4(position+normal*.04,1.);
    vN=normalMatrix*normal;vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
export const BODY_FRAGMENT = `varying vec3 vPos,vN,vView;
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
