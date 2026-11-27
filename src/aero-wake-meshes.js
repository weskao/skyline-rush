import * as THREE from 'three';

/** World-space exhaust and NITRO wake drawables; the Aero controller owns their simulation. */
export function createAeroWakeMeshes(positions, alphas, sizes, segmentCount) {
  const particleGeo = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['alpha', alphas, 1], ['size', sizes, 1]]) particleGeo.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  const seed = Float32Array.from(alphas, (_, i) => (i * 0.61803398875) % 1);
  particleGeo.setAttribute('sparkSeed', new THREE.BufferAttribute(seed, 1));
  const vapor = new THREE.Points(particleGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { skinTint: { value: new THREE.Vector3(1, 1, 1) }, thrusterTint: { value: new THREE.Vector3(1, 1, 1) },
      sparkShare: { value: 0 }, nitroMix: { value: 0 } },
    vertexShader: `attribute float alpha,size,sparkSeed;uniform float sparkShare;varying float vAlpha,vSpark;
      void main(){if(alpha<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;} // dead: drew nothing (discard)
        vAlpha=alpha;vSpark=sparkSeed<sparkShare?1.:0.;vec4 p=modelViewMatrix*vec4(position,1.);
        gl_PointSize=clamp(size*240./max(1.,-p.z)*mix(1.,.44,vSpark),0.,80.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying float vAlpha,vSpark;uniform float nitroMix;uniform vec3 skinTint,thrusterTint;
      void main(){vec2 p=gl_PointCoord*2.-1.;vec3 color=vec3(.8,.9,.98)*skinTint;
        if(vSpark>.5){
          p=vec2((p.x+p.y)*.76,(p.x-p.y)*1.5);
          color=min(mix(thrusterTint,skinTint,nitroMix)*vec3(.86,.91,.98),vec3(1.));
        }
        float r=length(p);if(r>1.||vAlpha<=0.)discard;
        gl_FragColor=vec4(color,exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*vAlpha);}`,
  }));
  vapor.name = 'World space gas wake'; vapor.frustumCulled = false;
  const ribbonPositions = new Float32Array(segmentCount * 18), ribbonAlpha = new Float32Array(segmentCount * 6), ribbonUV = new Float32Array(segmentCount * 12), ribbonKinds = new Float32Array(segmentCount * 6);
  const ribbonGeo = new THREE.BufferGeometry();
  for (let i = 0; i < segmentCount; i++) ribbonUV.set([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1], i * 12);
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('alpha', new THREE.BufferAttribute(ribbonAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('rollWake', new THREE.BufferAttribute(ribbonKinds, 1).setUsage(THREE.DynamicDrawUsage));
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(ribbonUV, 2));
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { skinTint: { value: new THREE.Vector3(1, 1, 1) }, skinPattern: { value: 0 }, time: { value: 0 } },
    vertexShader: 'attribute float alpha,rollWake;varying float vAlpha,vRoll;varying vec2 vUv;void main(){if(alpha<=0.){gl_Position=vec4(2.,2.,2.,1.);return;}vAlpha=alpha;vRoll=rollWake;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying float vAlpha,vRoll;varying vec2 vUv;uniform vec3 skinTint;uniform float skinPattern,time;
      void main(){
        float u=clamp(vUv.x,0.,1.);
        float edge=vRoll>.5?pow(max(0.,1.-min(u,1.-u)*12.),2.):pow(max(0.,sin(u*3.14159)),3.);
        float shape=1.;
        if(vRoll<.5){
          if(skinPattern>.5)shape=.65+.35*cos(vUv.x*14.+vUv.y*6.);
          if(skinPattern>1.5)shape=.3+.7*abs(sin(vUv.x*28.+vUv.y*12.));
          if(skinPattern>2.5){float dash=fract(vUv.y*5.+vUv.x*2.);
            shape=.32+.56*smoothstep(.06,.28,dash)*(1.-smoothstep(.62,.93,dash));}
          if(skinPattern>3.5)shape=.3+.7*pow(max(0.,abs(sin(vUv.y*25.+vUv.x*16.-time*9.))),6.);
        }
        gl_FragColor=vec4(vec3(.5,.8,1.)*skinTint,edge*vAlpha*shape);
      }`,
  }));
  ribbon.name = 'Continuous dash ribbon'; ribbon.frustumCulled = false;
  // After the car's normal-blended transparent parts: its sort sphere is frozen at the first draw, so depth cannot order it.
  ribbon.renderOrder = 1;
  return { vapor, particleGeo, ribbon, ribbonGeo, ribbonPositions, ribbonAlpha, ribbonKinds };
}
