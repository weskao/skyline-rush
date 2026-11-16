import * as THREE from 'three';

/** World-space exhaust and NITRO wake drawables; the Aero controller owns their simulation. */
export function createAeroWakeMeshes(positions, alphas, sizes, segmentCount) {
  const particleGeo = new THREE.BufferGeometry();
  for (const [name, array, size] of [['position', positions, 3], ['alpha', alphas, 1], ['size', sizes, 1]]) particleGeo.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  const vapor = new THREE.Points(particleGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { skinTint: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: `attribute float alpha,size;varying float vAlpha;void main(){vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.);
      gl_PointSize=clamp(size*240./max(1.,-p.z),0.,80.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying float vAlpha;uniform vec3 skinTint;void main(){float r=length(gl_PointCoord*2.-1.);if(r>1.)discard;
      gl_FragColor=vec4(vec3(.8,.9,.98)*skinTint,exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*vAlpha);}`,
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
    vertexShader: 'attribute float alpha,rollWake;varying float vAlpha,vRoll;varying vec2 vUv;void main(){vAlpha=alpha;vRoll=rollWake;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vAlpha,vRoll;varying vec2 vUv;uniform vec3 skinTint;uniform float skinPattern,time;void main(){float u=clamp(vUv.x,0.,1.);float edge=vRoll>.5?pow(max(0.,1.-min(u,1.-u)*12.),2.):pow(max(0.,sin(u*3.14159)),3.);float shape=1.;if(vRoll<.5){if(skinPattern>.5)shape=.65+.35*cos(vUv.x*14.+vUv.y*6.);if(skinPattern>1.5)shape=.3+.7*abs(sin(vUv.x*28.+vUv.y*12.));if(skinPattern>2.5)shape=step(.44,fract(vUv.y*7.+vUv.x*2.));if(skinPattern>3.5)shape=.3+.7*pow(max(0.,abs(sin(vUv.y*25.+vUv.x*16.-time*9.))),6.);}gl_FragColor=vec4(vec3(.5,.8,1.)*skinTint,edge*vAlpha*shape);}',
  }));
  ribbon.name = 'Continuous dash ribbon'; ribbon.frustumCulled = false;
  return { vapor, particleGeo, ribbon, ribbonGeo, ribbonPositions, ribbonAlpha, ribbonKinds };
}
