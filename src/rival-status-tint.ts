import * as THREE from 'three';
import { measureAirflowProfile, type AirflowProfile } from './airflow-geometry.ts';
import { itemHit, rivalItemHit, type ItemHits } from './item-attacks.ts';
import { createRivalStatusFx } from './rival-status-fx.ts';
import { PARKED, type FxFrame, type FxRival, type StatusEmit } from './debuff/fx-shared.ts';
import { FREEZE_SHELL } from './debuff/freeze/freeze-shell.ts';
import { EMP_SHELL } from './debuff/emp/emp-shell.ts';

// Cars slowed by Freeze or EMP share one instanced status shell over their paint: a hull lofted through the
// measured width and roof of 24 slices of the car that is drawn, so the effect follows the car, not a bubble.
// Low draws the soft tint; Medium and up add a fresnel rim and each status's own surface, which lives with that
// status (src/debuff/<effect>/<effect>-shell.ts) and is composed here into one program and one draw.
// rival-status-fx.ts adds the shockwave and each status's own objects and particles.
type StatusRace = { elapsed: number; phase?: string; player: ItemHits & FxRival & { effects?: { freeze?: number } }; rivals: (ItemHits & FxRival)[] };
export type RivalStatus = 'freeze' | 'emp' | null;

export const rivalStatus = rivalItemHit;

const FIT = 1.2; // shell unit = the car's half extents x FIT, so the body ends near +-0.83
const SLICES = 24; // airflow-geometry.ts sections
const OVER = 1.03; // the hull runs just past the bumpers

// Per instance `status` = (kind: 1 EMP / 0 Freeze, seconds since the hit, seed, fade level). `rim` doubles as the
// detail switch (0 on Low). `hull` holds one row per car: per slice (centre x, half width, roof y) in shell units.
const VERTEX = `attribute vec4 status;uniform highp sampler2D hull;
  varying vec3 vColor,vNormal,vView,vLocal;varying vec4 vStatus;
  void main(){float t=asin(clamp(position.z,-1.,1.))*.63662,r=length(position.xy); // t: even along the car, -1 to 1
    float u=(clamp(t*${OVER},-1.,1.)*.5+.5)*${SLICES}.-.5,j=clamp(floor(u),0.,${SLICES - 1}.);
    vec4 h=mix(texelFetch(hull,ivec2(int(j),gl_InstanceID),0),
      texelFetch(hull,ivec2(int(min(j+1.,${SLICES - 1}.)),gl_InstanceID),0),clamp(u-j,0.,1.));
    vec2 ring=position.xy/max(r,1e-4);ring/=pow(clamp(max(abs(ring.x),abs(ring.y)),.5,1.),.6); // a squared-off section
    float close=pow(max(0.,r),.15)*1.05,low=-${1 / FIT},halfH=max((h.z-low)*.5,.05);
    vec3 p=vec3(h.x+ring.x*h.y*close,low+halfH+ring.y*halfH*close,t*${OVER / FIT});
    mat3 m=mat3(modelMatrix*instanceMatrix);
    vec3 s=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2])); // squared axis scales: normal = m * n / s
    // shortcut: the normal is the slice's ellipsoid, not the loft's true slope; upgrade if the rim must follow steps.
    vNormal=m*(position/vec3(max(h.y,.05),halfH,${1 / FIT})/max(s,vec3(1e-6)));vColor=instanceColor;vLocal=p;vStatus=status;
    vec4 world=modelMatrix*instanceMatrix*vec4(p,1.);vView=cameraPosition-world.xyz;
    gl_Position=projectionMatrix*viewMatrix*world;}`;
const FRAGMENT = `uniform float rim,time;varying vec3 vColor,vNormal,vView,vLocal;varying vec4 vStatus;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  ${FREEZE_SHELL.glsl}
  ${EMP_SHELL.glsl}
  void main(){float facing=clamp(abs(dot(vNormal/max(length(vNormal),1e-4),vView/max(length(vView),1e-4))),0.,1.);
    float body=.14*smoothstep(0.,.5,facing);float edge=pow(max(0.,1.-facing),3.);vec3 col;
    if(vStatus.x>.5)col=empShell(vLocal,vColor,body,edge,vStatus.y,vStatus.z,vStatus.w);
    else col=freezeShell(vLocal,vColor,body,edge,vStatus.y,vStatus.z,vStatus.w);
    gl_FragColor=vec4(col,1.);}`;

type Hull = { fit: THREE.Matrix4; profile: AirflowProfile; row: Float32Array };

export function createRivalStatusTint(capacity: number) {
  const fx = createRivalStatusFx(capacity);
  const hull = new THREE.DataTexture(new Float32Array(capacity * SLICES * 4), SLICES, capacity, THREE.RGBAFormat, THREE.FloatType);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { rim: { value: 0 }, time: { value: 0 }, hull: { value: hull } }, vertexShader: VERTEX, fragmentShader: FRAGMENT,
  });
  // Poles on the car's long axis: each ring of the sphere becomes one section of the hull.
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 32).rotateX(Math.PI / 2), material, capacity);
  mesh.name = 'Rival status tint';
  mesh.frustumCulled = false; // at most a few shells, posed every frame
  mesh.visible = false;
  const status = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  mesh.geometry.setAttribute('status', status);
  const object = new THREE.Group();
  object.name = 'Rival status';
  object.add(mesh, fx.group);
  const levels = new Float64Array(capacity), since = new Float64Array(capacity), live: RivalStatus[] = new Array(capacity).fill(null), kinds: RivalStatus[] = new Array(capacity).fill(null);
  const hulls = new WeakMap<THREE.Object3D, Hull>(), drawn: (Hull | null)[] = new Array(capacity).fill(null);
  const color = new THREE.Color(), matrix = new THREE.Matrix4(), toCar = new THREE.Matrix4(), inverse = new THREE.Matrix4(), box = new THREE.Box3(), part = new THREE.Box3();
  const center = new THREE.Vector3(), size = new THREE.Vector3(), upright = new THREE.Quaternion();
  for (let i = 0; i < capacity; i++) { mesh.setMatrixAt(i, PARKED); mesh.setColorAt(i, color.setRGB(0, 0, 0)); }
  let time = 0;

  const sourceOf = (pose: THREE.Object3D): THREE.Object3D => pose.children.find(part => part.userData.garageModel) ?? pose;

  // The race pose stays the same when the loader replaces its displayed model. Measure and cache each model once.
  function hullOf(pose: THREE.Object3D): Hull {
    const source = sourceOf(pose);
    const cached = hulls.get(source);
    if (cached) return cached;
    pose.updateWorldMatrix(true, true);
    inverse.copy(pose.matrixWorld).invert();
    const jets: THREE.Object3D | undefined = pose.userData.jets;
    box.makeEmpty();
    source.traverseVisible(object => {
      const { geometry, isMesh } = object as THREE.Mesh;
      if (!isMesh || object.userData.followsBody || object === jets || object.parent === jets) return;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      box.union(part.copy(geometry.boundingBox!).applyMatrix4(toCar.multiplyMatrices(inverse, object.matrixWorld)));
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1.1, 0, -2.3), new THREE.Vector3(1.1, 1.3, 2.3));
    box.getCenter(center); box.getSize(size).multiplyScalar(FIT / 2);
    const shown = jets?.visible; // the lift jets are not the body
    if (jets) jets.visible = false;
    const profile = inPose(measureAirflowProfile(source), toCar.multiplyMatrices(inverse, source.matrixWorld));
    if (jets) jets.visible = shown!;
    const { min, max } = profile.bounds, row = new Float32Array(SLICES * 4);
    for (let j = 0; j < SLICES; j++) {
      const z = center.z + size.z / FIT * ((j + 0.5) / SLICES * 2 - 1);
      const slice = profile.sections[THREE.MathUtils.clamp(Math.floor((z - min.z) / (max.z - min.z) * SLICES), 0, SLICES - 1)]!;
      const empty = !Number.isFinite(slice.top) || !Number.isFinite(slice.right - slice.left); // nothing drawn there: the box
      row.set(empty ? [0, 1 / FIT, 1 / FIT, 1]
        : [((slice.left + slice.right) / 2 - center.x) / size.x, (slice.right - slice.left) / 2 / size.x, (slice.top - center.y) / size.y, 1], j * 4);
    }
    const made = { fit: new THREE.Matrix4().compose(center, upright, size), profile, row };
    hulls.set(source, made);
    return made;
  }
  const fit = (pose: THREE.Object3D): THREE.Matrix4 => hullOf(pose).fit;
  const frame: FxFrame = {
    status: null, age: 0, isPlayer: false, pose: undefined, rival: undefined, fit, profile: pose => hullOf(pose).profile,
    dt: 0, low: false, reducedMotion: false, emit: null, thin: 1, on: false, began: false, ended: false,
  };

  return {
    mesh, object,
    /** `emit` (effects.js, road coordinates) is passed only while the race runs: sparks, frost and ice chips. */
    update(race: StatusRace, vehicles: THREE.Object3D[] | undefined, dt: number,
      { quality = 'high', reducedMotion = false, preview = false, playerEnabled = true, emit = null as StatusEmit | null } = {}) {
      time += dt;
      const low = quality === 'low';
      material.uniforms.rim!.value = low ? 0 : 1;
      material.uniforms.time!.value = reducedMotion ? 0 : time; // reduced motion: moving detail holds still
      // Measuring walks every vertex of a model: at most one car per frame, ahead of any hit.
      const unmeasured = preview ? undefined : vehicles?.find(pose => pose.visible && !hulls.has(sourceOf(pose)));
      if (unmeasured) hullOf(unmeasured);
      let shown = false;
      frame.dt = dt; frame.low = low; frame.reducedMotion = reducedMotion;
      fx.begin(dt);
      for (let i = 0; i < capacity; i++) {
        const isPlayer = i === capacity - 1;
        const driver = isPlayer ? race.player : race.rivals[i];
        const playerVisible = playerEnabled && (race.phase === 'racing' || race.phase === 'paused');
        const pose = vehicles?.[isPlayer ? 0 : i + 1];
        const target = pose?.visible && !preview && (!isPlayer || playerVisible) ? pose : undefined;
        const now = target && driver ? (isPlayer ? itemHit(race, race.player) : rivalStatus(race, driver)) : null;
        if (now && now !== live[i]) since[i] = time; // a new hit restarts the status's opening
        live[i] = now;
        if (now) kinds[i] = now; // keep the last colour while it fades out
        levels[i] = THREE.MathUtils.damp(levels[i]!, now ? 1 : 0, now ? 14 : 8, dt);
        const visible = levels[i]! >= 0.01 && (isPlayer ? !!target : !!pose);
        const age = time - since[i]!;
        frame.status = now; frame.age = age; frame.isPlayer = isPlayer; frame.pose = target; frame.rival = driver;
        frame.emit = target ? emit : null;
        fx.rival(i, frame);

        if (!visible) { levels[i] = 0; mesh.setMatrixAt(i, PARKED); mesh.setColorAt(i, color.setRGB(0, 0, 0)); continue; }
        shown = true;
        const shell = kinds[i] === 'emp' ? EMP_SHELL : FREEZE_SHELL;
        const flicker = isPlayer || reducedMotion ? 1 : shell.flicker(time, i);
        const strength = levels[i]! * (isPlayer ? 0.68 : 1);
        mesh.setColorAt(i, color.setRGB(shell.color[0], shell.color[1], shell.color[2]).multiplyScalar(strength * flicker));
        status.setXYZW(i, shell === EMP_SHELL ? 1 : 0, age, isPlayer ? -1 : i * 0.37, strength);

        pose!.updateWorldMatrix(true, false);
        const car = hullOf(pose!);
        if (drawn[i] !== car) { drawn[i] = car; (hull.image.data as Float32Array).set(car.row, i * SLICES * 4); hull.needsUpdate = true; }
        const pop = reducedMotion || isPlayer ? 1 : shell.pop(age); // the hit lands with a pop
        mesh.setMatrixAt(i, matrix.multiplyMatrices(pose!.matrixWorld, car.fit).multiply(toCar.makeScale(pop, pop, pop)));
      }
      fx.end();
      mesh.visible = shown;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      status.needsUpdate = true;
    },
    reset() { levels.fill(0); live.fill(null); mesh.visible = false; fx.reset(); },
    dispose() { object.removeFromParent(); fx.dispose(); mesh.geometry.dispose(); material.dispose(); hull.dispose(); },
  };
}

/** A profile measured in its model's own coordinates, moved into the pose's (the model may be scaled to fit). */
function inPose(profile: AirflowProfile, toPose: THREE.Matrix4): AirflowProfile {
  // shortcut: reads scale and offset only, so a model yawed other than 0 or 180 degrees in its pose would skew.
  const e = toPose.elements, sx = e[0]!, sy = e[5]!, sz = e[10]!, tx = e[12]!, ty = e[13]!;
  const sections = profile.sections.map(({ left, right, top }) => Number.isFinite(top)
    ? { left: Math.min(sx * left, sx * right) + tx, right: Math.max(sx * left, sx * right) + tx, top: sy * top + ty }
    : { left, right, top });
  if (sz < 0) sections.reverse();
  return { bounds: profile.bounds.clone().applyMatrix4(toPose), sections };
}
