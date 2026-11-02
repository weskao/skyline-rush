import * as THREE from 'three';

// One instanced draw for four physical car-mounted beams, rather than recolouring the airflow.
// Geometry/material are created once, then reused for every equip and animation frame.
export function createVoidPulseBeams(car, rearPorts) {
  const geometry = new THREE.CylinderGeometry(0.07, 0.2, 1, 16, 1, true); // nozzle end (bottom) wide, far end narrow: perspective depth
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, quality: { value: 1 } },
    vertexShader: `varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.);
      vFacing=abs(dot(normalize(normalMatrix*mat3(instanceMatrix)*normal),normalize(-mv.xyz+vec3(0.,0.,1e-5)))); // rod volume: bright core, soft edges
      gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec2 vUv;varying float vFacing;uniform float time,power,quality;
      void main(){
        float axial=clamp(vUv.y,0.,1.);
        float wave=fract(axial*4.5-time*2.4+vUv.x*2.); // helical bolts: spirals keep depth where flat bands read as rings
        float bolt=pow(max(0.,1.-abs(wave-.36)*4.),3.);
        float flash=pow(max(0.,sin(time*8.5)),6.);
        float bright=(.16+bolt*1.4+flash*.65)*power*quality;
        float taper=pow(max(0.,1.-abs(axial-.42)*1.9),1.4);
        vec3 violet=vec3(.58,.23,1.);vec3 core=vec3(.65,.91,1.);
        vec3 color=mix(violet,core,clamp(bolt+flash*.35+pow(max(0.,vFacing),3.)*.6,0.,1.));
        gl_FragColor=vec4(color*(1.+bolt*2.),min(1.,bright*taper*(.25+.75*vFacing)));
      }`,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, rearPorts.length);
  mesh.name = 'Void pulse beams';
  mesh.frustumCulled = false;
  const obj = new THREE.Object3D();
  rearPorts.forEach((port, index) => {
    obj.position.set(port.position[0], port.position[1], port.position[2] + 2.05);
    obj.rotation.set(Math.PI / 2, 0, 0);
    obj.scale.set(1, 4.1, 1);
    obj.updateMatrix();
    mesh.setMatrixAt(index, obj.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.visible = false;
  car.add(mesh);
  let selected = false;
  return {
    mesh,
    setSelected(next) { selected = next; if (!next) mesh.visible = false; },
    update(time, power, quality, enabled) {
      mesh.visible = selected && enabled && power > 0.005;
      material.uniforms.time.value = time;
      material.uniforms.power.value = Math.min(1, Math.max(0, power));
      material.uniforms.quality.value = Math.min(1, Math.max(0.25, quality));
    },
  };
}
