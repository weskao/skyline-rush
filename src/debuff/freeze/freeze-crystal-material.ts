import * as THREE from 'three';

// One translucent ice crystal: a faceted hexagonal column with pointed ends, base sunk 12% into the body, drawn
// with a cheap unlit ice shader (deep blue root, pale tip, bright fresnel edges, a sparkle facing the sky). Unlit, so
// the track's light count never changes its program; one program for every car.

export function crystalGeometry(): THREE.BufferGeometry {
  const lathe = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.12), new THREE.Vector2(1, 0.02), new THREE.Vector2(0.92, 0.7), new THREE.Vector2(0, 1),
  ], 6);
  const faceted = lathe.toNonIndexed(); // flat facets: each triangle keeps its own normal
  lathe.dispose();
  faceted.computeVertexNormals();
  return faceted;
}

const VERTEX = `varying vec3 vNormal,vView;varying float vH,vSeed;
  void main(){mat4 m=modelMatrix*instanceMatrix;vec4 world=m*vec4(position,1.);
    vNormal=mat3(m)*normal;vView=cameraPosition-world.xyz;vH=position.y;vSeed=float(gl_InstanceID)*.618;
    gl_Position=projectionMatrix*viewMatrix*world;}`;
const FRAGMENT = `uniform float time;varying vec3 vNormal,vView;varying float vH,vSeed;
  void main(){vec3 n=normalize(vNormal),v=normalize(vView);
    float facing=clamp(abs(dot(n,v)),0.,1.),fres=pow(max(0.,1.-facing),2.);
    vec3 ice=mix(vec3(.16,.42,.82),vec3(.78,.93,1.),clamp(.2+.6*vH+.25*n.y,0.,1.)); // deep at the root, pale at the tip
    float glint=pow(max(0.,dot(reflect(-v,n),vec3(.32,.9,.3))),24.);
    float shimmer=.86+.14*sin(time*2.4+vSeed*37.+vH*5.);
    vec3 col=ice*shimmer+vec3(.9,.97,1.)*(fres*.95+glint*1.5);
    gl_FragColor=vec4(col,clamp(.36+.55*fres+glint,0.,.94));}`;

export function crystalMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false,
  });
}
