// Per-tier drift charge on the player car (look and timing: drift-charge.ts). A glow shell rides the body
// (`followsBody`, so garage-model-rig.ts moves it onto a dressed GLB's body), a shockwave ring lies on the ground under
// the car, and the sprung parts hop on a local offset while the wheels and the road pose stay put
// (.claude/rules/vehicle-road-stability.md). Every material exists from creation, so shader warmup sees it.
import * as THREE from 'three';
import { chargeFired, chargeFit, chargeFrame } from './drift-charge.ts';

const VERTEX = `uniform vec2 zRange;uniform float inflate;varying float vU;varying vec3 vN,vView;
  void main(){vec4 mv=modelViewMatrix*vec4(position+normal*inflate,1.);
    vU=(zRange.y-position.z)/max(1e-4,zRange.y-zRange.x); // 0 at the tail (+z), 1 at the nose
    vN=normalMatrix*normal;vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const FRAGMENT = `uniform vec3 color;uniform vec2 fronts;uniform float sharp,glow,flash;varying float vU;varying vec3 vN,vView;
  void main(){float u=clamp(vU,0.,1.);
    float facing=abs(dot(normalize(vN+vec3(0.,0.,1e-5)),normalize(vView+vec3(0.,0.,1e-5)))); // never normalize a zero vector
    float rim=pow(max(0.,1.-facing),2.); // the outline: brightest where the body turns away from the camera
    float band=(fronts.x<0.?0.:exp(-abs(u-fronts.x)*sharp))+(fronts.y<0.?0.:exp(-abs(u-fronts.y)*sharp));
    float a=clamp(band*(.3+.7*rim)+rim*glow+flash*(.15+.85*rim),0.,1.);
    gl_FragColor=vec4(color*(.5+band+flash),a);}`;
const GLB_RIGGED = /^(wheel_|wing|lift_fans)/; // GLB nodes that copy a procedural partner each frame (garage-model-rig.ts)
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const LIFT = 0.05; // ring height above the road, against z-fighting

/** `colors`: the drift sparks' tier colours (effects.js), so sparks and body agree. */
export function createDriftCharge(car, colors, scene) {
  const body = car.userData.body;
  const uniforms = { color: { value: new THREE.Color() }, fronts: { value: new THREE.Vector2(-1, -1) }, sharp: { value: 1 },
    glow: { value: 0 }, flash: { value: 0 }, zRange: { value: new THREE.Vector2() }, inflate: { value: 0 } };
  const shell = new THREE.Mesh(body.geometry, new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  shell.name = 'Drift charge shell'; shell.userData.followsBody = true; shell.visible = false;
  body.add(shell);
  // In the scene, placed from the car's matrix: a car child would be masked with the procedural parts under a GLB.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 72), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  ring.name = 'Drift charge shockwave'; ring.visible = false; ring.matrixAutoUpdate = false;
  scene.add(ring);
  const frame = {}, sprung = [], bounds = new THREE.Box3(), toCar = new THREE.Matrix4(), ringLocal = new THREE.Matrix4();
  const ringAt = new THREE.Vector3(), ringSize = new THREE.Vector3();
  let fit = chargeFit(bounds), tier = 0, lastTier = 0, age = 0, applied = 0;

  function move(by) { // a local offset in car units on each sprung part (a GLB node's parent is the scaled instance)
    for (const part of sprung) part.position.y += part.parent === car ? by : by / part.parent.scale.y;
  }
  function settle() { move(-applied); applied = 0; }
  function start(fired) {
    settle();
    sprung.length = 0;
    for (const part of car.children) {
      if (part.userData.garageModel) for (const node of part.children) { if (!GLB_RIGGED.test(node.name)) sprung.push(node); }
      else if (!car.userData.wheels?.includes(part)) sprung.push(part);
    }
    const geometry = shell.geometry; // the GLB body's once dressed
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    uniforms.zRange.value.set(geometry.boundingBox.min.z, geometry.boundingBox.max.z);
    uniforms.inflate.value = (geometry.boundingBox.max.z - geometry.boundingBox.min.z) * 0.008;
    car.updateWorldMatrix(true, true);
    fit = chargeFit(bounds.copy(geometry.boundingBox).applyMatrix4(toCar.copy(car.matrixWorld).invert().multiply(shell.parent.matrixWorld)));
    uniforms.color.value.setRGB(...colors[fired - 1]);
    ring.material.color.setRGB(...colors[fired - 1]);
    tier = fired; age = 0;
  }
  function placeRing(progress) {
    car.updateWorldMatrix(true, false);
    ringLocal.compose(ringAt.set(fit.x, LIFT, fit.z), FLAT, ringSize.setScalar(fit.ringRadius * (0.55 + progress)));
    ring.matrix.multiplyMatrices(car.matrixWorld, ringLocal);
    ring.matrixWorldNeedsUpdate = true;
    ring.material.opacity = (1 - progress) ** 2;
  }

  return {
    objects: { shell, ring },
    /** `armed`: the player is racing. Returns the tier that fired this frame (0 = none) for the rear-wheel burst. */
    update(drift, dt, armed, reducedMotion) {
      const fired = armed && drift ? chargeFired(lastTier, drift.time) : 0;
      lastTier = drift ? fired || lastTier : 0;
      if (fired) start(fired); else age += dt;
      if (!tier) return fired;
      chargeFrame(tier, age, frame);
      shell.visible = frame.active;
      uniforms.fronts.value.set(reducedMotion ? -1 : frame.fronts[0], reducedMotion ? -1 : frame.fronts[1]);
      uniforms.sharp.value = frame.sharp; uniforms.glow.value = frame.glow; uniforms.flash.value = reducedMotion ? 0 : frame.flash;
      const offset = reducedMotion ? 0 : frame.bounce * fit.hop;
      move(offset - applied); applied = offset;
      ring.visible = !reducedMotion && frame.ring > 0;
      if (ring.visible) placeRing(frame.ring);
      if (!frame.active) tier = 0;
      return fired;
    },
    reset() {
      settle();
      tier = lastTier = 0; shell.visible = ring.visible = false;
    },
    dispose() {
      shell.removeFromParent(); ring.removeFromParent();
      shell.material.dispose(); ring.geometry.dispose(); ring.material.dispose();
    },
  };
}
