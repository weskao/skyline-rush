import * as THREE from 'three';
import { blue } from './effects-palette.ts';

// A rival slowed by the player's Freeze or EMP (game.js FREEZE_RIVAL_SPEED) wears a status shell: one instanced
// additive mesh and one shader program for every rival. Car materials are never touched, so shared paints,
// the player and Garage previews stay exact. Low draws the soft tint only; Medium and up add a fresnel rim.
type StatusRace = { elapsed: number; phase?: string; player: { effects?: { freeze?: number } }; rivals: { empUntil?: number }[] };
export type RivalStatus = 'freeze' | 'emp' | null;

/** Mirrors the slow-down test in game.js stepRace: EMP is per rival, Freeze hits every rival. */
export function rivalStatus(race: StatusRace, rival: { empUntil?: number }): RivalStatus {
  if ((rival.empUntil ?? 0) > race.elapsed) return 'emp';
  return (race.player.effects?.freeze ?? 0) > 0 ? 'freeze' : null;
}

const EMP: [number, number, number] = [1.3, 2.2, 0.35]; // electric yellow-green, apart from Freeze blue and NITRO gold
const FIT = 1.2; // ellipsoid radii over the car's half extents: covers the body, corners soften into the rim
const parked = new THREE.Matrix4().makeTranslation(0, -1e4, 0); // unused instances wait below the scene, never at scale 0

export function createRivalStatusTint(capacity: number) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { rim: { value: 0 } },
    vertexShader: `varying vec3 vColor, vNormal, vView;
      void main(){mat3 m=mat3(modelMatrix*instanceMatrix);
        vec3 s=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2])); // squared axis scales: ellipsoid normal = m * n / s
        vNormal=m*(normal/max(s,vec3(1e-6)));vColor=instanceColor;
        vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);vView=cameraPosition-world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `uniform float rim;varying vec3 vColor, vNormal, vView;
      void main(){float facing=clamp(abs(dot(vNormal/max(length(vNormal),1e-4),vView/max(length(vView),1e-4))),0.,1.);
        float body=.14*smoothstep(0.,.5,facing);float edge=pow(max(0.,1.-facing),3.);
        gl_FragColor=vec4(vColor*(body+rim*edge*.9),1.);}`,
  });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), material, capacity);
  mesh.name = 'Rival status tint';
  mesh.frustumCulled = false; // at most a few shells, posed every frame
  mesh.visible = false;
  const levels = new Float64Array(capacity), kinds: RivalStatus[] = new Array(capacity).fill(null), fits = new WeakMap<THREE.Object3D, THREE.Matrix4>();
  const color = new THREE.Color(), matrix = new THREE.Matrix4(), toCar = new THREE.Matrix4(), inverse = new THREE.Matrix4(), box = new THREE.Box3(), part = new THREE.Box3();
  const center = new THREE.Vector3(), size = new THREE.Vector3();
  for (let i = 0; i < capacity; i++) { mesh.setMatrixAt(i, parked); mesh.setColorAt(i, color.setRGB(0, 0, 0)); }
  let time = 0;

  // The shell's local transform, measured once per car from its own visible parts (any model fits).
  function fit(pose: THREE.Object3D): THREE.Matrix4 {
    let local = fits.get(pose);
    if (local) return local;
    pose.updateWorldMatrix(true, true);
    inverse.copy(pose.matrixWorld).invert();
    box.makeEmpty();
    pose.traverseVisible(object => {
      const { geometry, isMesh } = object as THREE.Mesh;
      if (!isMesh || object === pose.userData.jets || object.parent === pose.userData.jets) return;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      box.union(part.copy(geometry.boundingBox!).applyMatrix4(toCar.multiplyMatrices(inverse, object.matrixWorld)));
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1.1, 0, -2.3), new THREE.Vector3(1.1, 1.3, 2.3));
    box.getCenter(center); box.getSize(size).multiplyScalar(FIT / 2);
    fits.set(pose, local = new THREE.Matrix4().compose(center, new THREE.Quaternion(), size));
    return local;
  }

  return {
    mesh,
    update(race: StatusRace, vehicles: THREE.Object3D[] | undefined, dt: number, { quality = 'high', reducedMotion = false, preview = false } = {}) {
      time += dt;
      material.uniforms.rim!.value = quality === 'low' ? 0 : 1;
      let shown = false;
      for (let i = 0; i < capacity; i++) {
        const rival = race.rivals[i], pose = vehicles?.[i + 1];
        const status = !preview && rival && pose?.visible ? rivalStatus(race, rival) : null;
        if (status) kinds[i] = status; // keep the last colour while it fades out
        levels[i] = THREE.MathUtils.damp(levels[i]!, status ? 1 : 0, status ? 14 : 8, dt);
        if (levels[i]! < 0.01 || !pose) { levels[i] = 0; mesh.setMatrixAt(i, parked); mesh.setColorAt(i, color.setRGB(0, 0, 0)); continue; }
        shown = true;
        const emp = kinds[i] === 'emp';
        // EMP: a hard electric flicker; reduced motion keeps it steady.
        const flicker = emp && !reducedMotion && Math.sin(time * 53 + i * 2.1) * Math.sin(time * 29) < 0 ? 0.35 : 1;
        mesh.setColorAt(i, color.setRGB(...(emp ? EMP : blue)).multiplyScalar(levels[i]! * flicker));
        pose.updateWorldMatrix(true, false);
        mesh.setMatrixAt(i, matrix.multiplyMatrices(pose.matrixWorld, fit(pose)));
      }
      mesh.visible = shown;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    },
    reset() { levels.fill(0); mesh.visible = false; },
    dispose() { mesh.removeFromParent(); mesh.geometry.dispose(); material.dispose(); },
  };
}
