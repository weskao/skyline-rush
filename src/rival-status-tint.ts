import * as THREE from 'three';
import { blue, emp as EMP } from './effects-palette.ts';
import { itemHit, rivalItemHit, type ItemHits } from './item-attacks.ts';
import { createRivalStatusFx, type FxRival, type StatusEmit } from './rival-status-fx.ts';

// Cars slowed by Freeze or EMP share an instanced status shell over their paint.
// Low draws the soft tint; Medium and up add a fresnel rim and the
// status's own surface: Freeze = frost creeping up from the sills into faceted, glinting ice (flash-freeze);
// EMP = lightning arcs re-striking over the body after a white hit flash. rival-status-fx.ts adds crystals and waves.
type StatusRace = { elapsed: number; phase?: string; player: ItemHits & FxRival & { effects?: { freeze?: number } }; rivals: (ItemHits & FxRival)[] };
export type RivalStatus = 'freeze' | 'emp' | null;

export const rivalStatus = rivalItemHit;

const PLAYER_EMP = [1.65, 1.12, 0.24] as const;
const FIT = 1.2; // ellipsoid radii over the car's half extents: covers the body, corners soften into the rim
const parked = new THREE.Matrix4().makeTranslation(0, -1e4, 0); // unused instances wait below the scene, never at scale 0

const FROST_CREEP = 0.3; // s for the frost line to climb from the sills over the roof
// Per instance `status` = (kind: 1 EMP / 0 Freeze, seconds since the hit, seed, fade level). `rim` doubles as the
// detail switch: Low skips the facets and arcs (uniform branch, one program for every tier).
const VERTEX = `attribute vec4 status;varying vec3 vColor,vNormal,vView,vLocal;varying vec4 vStatus;
  void main(){mat3 m=mat3(modelMatrix*instanceMatrix);
    vec3 s=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2])); // squared axis scales: ellipsoid normal = m * n / s
    vNormal=m*(normal/max(s,vec3(1e-6)));vColor=instanceColor;vLocal=position;vStatus=status;
    vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);vView=cameraPosition-world.xyz;
    gl_Position=projectionMatrix*viewMatrix*world;}`;
const FRAGMENT = `uniform float rim,time;varying vec3 vColor,vNormal,vView,vLocal;varying vec4 vStatus;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float facets(vec3 p){vec3 i=floor(p),f=fract(p);float a=8.,b=8.; // distance to the nearest ice-cell border
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(x,y,z);
      float d=length(g+vec3(hash(i+g),hash(i+g+17.),hash(i+g+31.))-f);b=d<a?a:min(b,d);a=min(a,d);}
    return b-a;}
  void main(){float facing=clamp(abs(dot(vNormal/max(length(vNormal),1e-4),vView/max(length(vView),1e-4))),0.,1.);
    float body=.14*smoothstep(0.,.5,facing);float edge=pow(max(0.,1.-facing),3.);
    float age=vStatus.y,seed=vStatus.z,level=vStatus.w;vec3 p=vLocal,col;
    bool player=seed<0.;
    if(vStatus.x>.5){float flash=player?0.:1.-smoothstep(0.,.18,age),arcs=0.,core=0.;
      if(rim>0.){float strike=floor(time*(player?4.:15.)+seed*7.); // the arcs jump to a new path each strike
        core=1.-smoothstep(0.,.05,abs(noise(p*2.6+vec3(seed,strike*1.7,0.))-.5));
        arcs=max(core,.8*(1.-smoothstep(0.,.035,abs(noise(p*4.3-vec3(strike*.9,seed,0.))-.5))));}
      col=vColor*(body+(player ? 0.28 : 0.)*edge+rim*edge*.9+arcs*2.2+flash*1.4)+vec3(1.)*level*(core*core*1.3+flash*.8);
    }else{float front=-1.15+2.5*clamp(age/${FROST_CREEP},0.,1.);
      float iced=smoothstep(front+.08,front-.08,p.y),line=(1.-smoothstep(0.,.08,abs(p.y-front)))*step(age,${FROST_CREEP});
      float crack=0.,glint=0.;
      if(rim>0.){crack=1.-smoothstep(0.,.08,facets(p*3.2));glint=crack*step(.86,hash(floor(p*9.)+floor(time*4.+seed)));}
      col=vColor*iced*(body*1.6+rim*edge*1.2+crack*.8)+vec3(.85,.95,1.)*level*(iced*(crack*.45+glint*1.8)+line*1.6);}
    gl_FragColor=vec4(col,1.);}`;

export function createRivalStatusTint(capacity: number) {
  const fx = createRivalStatusFx(capacity);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { rim: { value: 0 }, time: { value: 0 } }, vertexShader: VERTEX, fragmentShader: FRAGMENT,
  });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), material, capacity);
  mesh.name = 'Rival status tint';
  mesh.frustumCulled = false; // at most a few shells, posed every frame
  mesh.visible = false;
  const status = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  mesh.geometry.setAttribute('status', status);
  const object = new THREE.Group();
  object.name = 'Rival status';
  object.add(mesh, fx.group);
  const levels = new Float64Array(capacity), since = new Float64Array(capacity), live: RivalStatus[] = new Array(capacity).fill(null), kinds: RivalStatus[] = new Array(capacity).fill(null), fits = new WeakMap<THREE.Object3D, THREE.Matrix4>();
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
    mesh, object,
    /** `emit` (effects.js, road coordinates) is passed only while the race runs: sparks, frost and ice chips. */
    update(race: StatusRace, vehicles: THREE.Object3D[] | undefined, dt: number,
      { quality = 'high', reducedMotion = false, preview = false, playerEnabled = true, emit = null as StatusEmit | null } = {}) {
      time += dt;
      const low = quality === 'low';
      material.uniforms.rim!.value = low ? 0 : 1;
      material.uniforms.time!.value = reducedMotion ? 0 : time; // reduced motion: arcs and glints hold still
      let shown = false;
      fx.begin(dt);
      for (let i = 0; i < capacity; i++) {
        const isPlayer = i === capacity - 1;
        const driver = isPlayer ? race.player : race.rivals[i];
        const playerVisible = playerEnabled && (race.phase === 'racing' || race.phase === 'paused');
        const pose = vehicles?.[isPlayer ? 0 : i + 1];
        const target = pose?.visible && !preview && (!isPlayer || playerVisible) ? pose : undefined;
        const now = target && driver ? (isPlayer ? itemHit(race, race.player) : rivalStatus(race, driver)) : null;
        if (now && now !== live[i]) since[i] = time; // a new hit restarts the flash and the frost creep
        live[i] = now;
        if (now) kinds[i] = now; // keep the last colour while it fades out
        levels[i] = THREE.MathUtils.damp(levels[i]!, now ? 1 : 0, now ? 14 : 8, dt);
        const visible = levels[i]! >= 0.01 && (isPlayer ? !!target : !!pose);
        fx.rival(i, { status: now, age: time - since[i]!, pose: target, fit, rival: driver },
          dt, target ? emit : null, low, reducedMotion || isPlayer);

        if (!visible) { levels[i] = 0; mesh.setMatrixAt(i, parked); mesh.setColorAt(i, color.setRGB(0, 0, 0)); continue; }
        shown = true;
        const emp = kinds[i] === 'emp', age = time - since[i]!;
        // EMP: a hard electric flicker; reduced motion keeps it steady.
        const flicker = emp && !isPlayer && !reducedMotion && Math.sin(time * 53 + i * 2.1) * Math.sin(time * 29) < 0 ? 0.35 : 1;
        const strength = levels[i]! * (isPlayer ? 0.68 : 1);
        const rgb = emp ? (isPlayer ? PLAYER_EMP : EMP) : blue;
        mesh.setColorAt(i, color.setRGB(rgb[0], rgb[1], rgb[2]).multiplyScalar(strength * flicker));
        status.setXYZW(i, emp ? 1 : 0, age, isPlayer ? -1 : i * 0.37, strength);

        pose!.updateWorldMatrix(true, false);
        // The hit lands with a pop: EMP bursts the shell out, Freeze swells as the crust forms.
        const pop = reducedMotion || isPlayer ? 1 : emp ? 1 + 0.3 * Math.max(0, 1 - age / 0.15) : 1 + 0.08 * Math.sin(Math.min(1, age / FROST_CREEP) * Math.PI);
        mesh.setMatrixAt(i, matrix.multiplyMatrices(pose!.matrixWorld, fit(pose!)).multiply(toCar.makeScale(pop, pop, pop)));
      }
      fx.end();
      mesh.visible = shown;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      status.needsUpdate = true;
    },
    reset() { levels.fill(0); live.fill(null); mesh.visible = false; fx.reset(); },
    dispose() { object.removeFromParent(); fx.dispose(); mesh.geometry.dispose(); material.dispose(); },
  };
}
