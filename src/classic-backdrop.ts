import * as THREE from 'three';

/** The shared classic-track backdrop: sky dome, sun disc and sea plane, added to `scene` in this draw order. */
export function createClassicBackdrop(scene: THREE.Scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#101e43') }, horizon: { value: new THREE.Color('#d98785') }, warmth: { value: 1 }, aurora: { value: 0 }, cloudOpacity: { value: 1 }, cloudTint: { value: new THREE.Color('#4d3d60') }, time: { value: 0 } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vPosition; uniform vec3 top; uniform vec3 horizon,cloudTint; uniform float warmth,aurora,time,cloudOpacity;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 dir=normalize(vPosition);float h=dir.y;
        vec3 col=mix(horizon,top,smoothstep(-.03,.65,h));
        float light=pow(max(0.,dot(dir,normalize(vec3(-.22,.055,-1.)))),12.);
        col+=vec3(.65,.21,.07)*light*warmth;
        vec2 p=dir.xz/(max(.08,abs(h)))*2.;
        float cloud=noise(p*1.8)*.6+noise(p*4.5)*.25+noise(p*9.)*.15;
        float band=smoothstep(.05,.13,h)*(1.-smoothstep(.3,.62,h));
        col=mix(col,cloudTint+vec3(.32,.12,.02)*light,smoothstep(.45,.75,cloud)*band*.6*cloudOpacity);
        float ribbon=pow(max(0.,sin(dir.x*9.+sin(dir.z*6.+time*.08)*2.+h*16.)),12.);
        col+=vec3(.04,.8,.35)*ribbon*band*aurora;
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.35, 0.5), fog: false }));
  sun.position.set(-355, 88, -1600);
  scene.add(sun);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, ground: { value: new THREE.Color('#0a233b') }, fogColor: { value: new THREE.Color('#94758a') }, water: { value: 1 } },
    vertexShader: 'varying vec3 p; void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
    fragmentShader: `varying vec3 p; uniform float time,water; uniform vec3 ground,fogColor;
      void main(){float wave=sin(p.x*.065+time*.7+sin(p.z*.018))*sin(p.z*.21-time)*.5+.5;
        vec3 col=mix(vec3(.018,.055,.11),vec3(.055,.14,.21),wave*.5);
        float reflection=pow(max(0.,1.-abs(p.x+170.)*.003),8.)*smoothstep(.68,1.,wave);
        col+=vec3(.65,.22,.08)*reflection;
        col=mix(ground,col,water);
        float fog=smoothstep(300.,1800.,distance(p,cameraPosition));col=mix(col,fogColor,fog);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -6;
  scene.add(sea);
  return { sky, sun, sea };
}
