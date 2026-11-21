// Task 8c: the cloud deck under the Sky Spiral course on High and Ultra, and the wisps that drift across the road.
// The deck is one flat quad whose fragment shader steps the eye ray down through a slab of billows (two drifting scales
// of one tiling noise map, cloud-noise.ts): tops hide what is behind them, creases fall into shade, the far deck fades
// into the dome's own horizon, and the written depth lets the tower and struts rise out of the cloud rather than out of
// a plane. Lit by the day sky that is on screen, as the Coast water is (coast-sea.ts). Both meshes join the course
// hidden, so the shader warmup builds their programs; showing them is visibility and a few uniforms.
import * as THREE from 'three';
import { CLOUD_SLOPE, createCloudNoise } from './cloud-noise.ts';
import { COAST_ENV_VARIANTS } from './coast-lighting.ts';
import { coastSunDirection } from './coast-sky.ts';
import { SKY_LENGTH, skyFrame, skyPoint } from './sky-track.ts';

/** The deck's top stays `clear` metres under the lowest road from `behind` the car to `ahead` of it (the ribbon draws
 *  1,660 m ahead), and moves there by at most `rise` / `sink` metres per metre driven: never while the car is parked. */
export const CLOUD_SEA = Object.freeze({ depth: 110, clear: 16, behind: 1500, ahead: 3000, rise: .04, sink: .12, tile: 2048,
  /** Ray steps through the slab and shadow taps toward the sun, per tier. */
  high: [8, 2] as readonly [number, number], ultra: [20, 5] as readonly [number, number] });
/** A wisp may stand over the road every `every` metres (`share` of the slots do), out to `reach` ahead of the car. */
export const CLOUD_WISPS = Object.freeze({ every: 150, share: .55, reach: 1050, capacity: 10, span: 260 });
const SECTOR = 200, HALF = 3000; // re-chosen every SECTOR of travel; the quad reaches the camera's far plane

const roadPoint = (s: number, endless: boolean) => skyPoint(s, endless || s > SKY_LENGTH); // the run-out is road too
/** Where the deck's top belongs with the car at `distance`, in track space. */
export function cloudSeaLevel(distance: number, endless: boolean): number {
  let low = Infinity;
  for (let s = Math.max(0, distance - CLOUD_SEA.behind); s <= distance + CLOUD_SEA.ahead; s += 100) low = Math.min(low, roadPoint(s, endless).y);
  return low - CLOUD_SEA.clear;
}
const chance = (n: number): number => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

const SKY_AT = `vec3 skyAt(vec3 d,float lod){ // the dome's mapping (coast-sky.ts)
    return textureLod(sky,vec2((atan(d.z,d.x+1e-5)+skyYaw)*.15915494+.5,1.-asin(clamp(d.y,0.,1.))*.63661977),lod).rgb*skyScale;}`;
const SEA_VERTEX = `varying vec3 p; varying vec3 ambient; uniform sampler2D sky; uniform float skyScale;
  void main(){p=(modelMatrix*vec4(position,1.)).xyz;
    ambient=textureLod(sky,vec2(.5),12.).rgb*skyScale; // the mean of the sky
    gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
const glsl = (n: number): string => n.toFixed(8);
// Guarded for tests/shader-safety.test.js: no pow(), no exp(), normalize() only of a vector with y = 1.
const SEA_FRAGMENT = `varying vec3 p; varying vec3 ambient;
  uniform sampler2D noise,sky; uniform float time,skyYaw,skyScale,steps,taps; uniform vec2 offset; uniform vec3 sunDirection,sunColor; uniform mat4 projectionMatrix;
  ${SKY_AT}
  vec3 billow(vec2 q,float lod){ // x: height, 0 crease to 1 crown; yz: its slope per metre. 512 m banks and 128 m puffs, drifting apart
    vec4 a=textureLod(noise,q*${glsl(1 / CLOUD_SEA.tile)}+time*vec2(.0027,.0011),lod),b=textureLod(noise,q*${glsl(4 / CLOUD_SEA.tile)}+time*vec2(-.0059,.0146),lod+1.);
    return vec3(a.r*.5+b.r*.5,((a.gb-.5)*.5+(b.gb-.5)*2.)*${glsl(256 / CLOUD_SEA.tile / CLOUD_SLOPE)});}
  void main(){vec3 toEye=cameraPosition-p;float dist=length(toEye);vec3 v=toEye/max(dist,1e-3);
    float dive=max(v.y,.03),reach=min(DEPTH/dive,420.),fall=reach*dive/DEPTH; // metres of ray inside the slab; the share of its depth that falls
    vec2 uv=p.xz+offset,along=-v.xz*reach;float lod=clamp(log2(dist*.003),0.,6.);
    float t=0.,before=0.;
    for(int i=1;i<=24;i++){if(float(i)>steps)break;t=float(i)/steps;if(t*fall>=1.-billow(uv+along*t,lod).x)break;before=t;}
    for(int i=0;i<4;i++){float m=(before+t)*.5;if(m*fall>=1.-billow(uv+along*m,lod).x)t=m;else before=m;}
    vec2 q=uv+along*t;vec3 b=billow(q,lod);float h=1.-t*fall;
    vec3 n=normalize(vec3(-b.y*DEPTH,1.,-b.z*DEPTH));
    float over=0.;vec2 sunward=sunDirection.xz/max(sunDirection.y,.2)*DEPTH; // metres toward the sun per slab depth climbed
    for(int i=1;i<=6;i++){if(float(i)>taps)break;float k=float(i)/taps*(1.-h);over=max(over,billow(q+sunward*k,lod+1.).x-h-k);}
    float lit=clamp(dot(n,sunDirection)*.6+.4,0.,1.)*(1.-smoothstep(0.,.12,over));
    float fine=textureLod(noise,q*${glsl(16 / CLOUD_SEA.tile)}+time*vec2(.01,-.02),lod+4.).a,open=smoothstep(.2,.95,h); // creases see less sky
    vec3 white=mix(sunColor,vec3(dot(sunColor,vec3(.3333))),.8); // cloud scatters the sun's warmth away
    vec3 col=(ambient*mix(.5,1.15,open)+white*lit*mix(.1,.3,open))*(.84+.22*fine);
    col=mix(col,skyAt(vec3(-v.x,0.,-v.z),1.),smoothstep(700.,2600.,dist)); // the dome's horizon row behind this pixel
    vec4 clip=projectionMatrix*viewMatrix*vec4(p-v*(reach*t),1.);gl_FragDepth=clamp(clip.z/clip.w*.5+.5,0.,1.);
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
// A wisp is a camera-facing quad over the road centreline that slides across the road with the clock.
const WISP_VERTEX = `attribute vec3 anchor; attribute vec4 drift; // drift: the road's right (x, z), a seed, the width in metres
  uniform sampler2D sky; uniform float time,skyScale; uniform vec3 sunColor; varying vec2 q; varying float seed,fade; varying vec3 light;
  void main(){float phase=fract(drift.z+time*.03); // one crossing in 33 s
    vec3 centre=(modelMatrix*vec4(anchor,1.)).xyz;
    centre.xz+=drift.xy*((phase-.5)*${glsl(CLOUD_WISPS.span)});centre.y+=drift.w*.25+1.;
    vec4 mv=viewMatrix*vec4(centre,1.);float away=-mv.z;
    mv.xy+=position.xy*drift.w*vec2(1.,.5);
    q=uv;seed=drift.z;light=textureLod(sky,vec2(.5),12.).rgb*skyScale+mix(sunColor,vec3(dot(sunColor,vec3(.3333))),.8)*.3;
    fade=smoothstep(0.,.2,phase)*(1.-smoothstep(.8,1.,phase))*smoothstep(10.,70.,away)*(1.-smoothstep(650.,1000.,away));
    gl_Position=projectionMatrix*mv;}`;
const WISP_FRAGMENT = `uniform sampler2D noise; uniform float time; varying vec2 q; varying float seed,fade; varying vec3 light;
  void main(){vec2 c=q-.5;
    float n=texture2D(noise,q*vec2(.5,.25)+seed*7.3+time*vec2(.004,.001)).r*.6+texture2D(noise,q*vec2(1.3,.65)+seed*3.1-time*vec2(.006,0.)).a*.4;
    float a=smoothstep(.3,.75,n*(1.-dot(c,c)*4.)*1.9)*fade*.5;
    if(a<.004)discard;
    gl_FragColor=vec4(light*(.86+.14*q.y),a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

interface Deps {
  /** The course's group (camera-relative) and its road, which holds track space (sky-scene.js `parts`). */
  group: THREE.Object3D; road: THREE.Object3D;
  /** The day sky dome (coast-sky.ts) and the shared scene clock, stopped under Reduced Motion (world.js). */
  dome: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; clock: { value: number };
}

export function createSpiralClouds({ group, road, dome, clock }: Deps) {
  const noise = createCloudNoise(), dark = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  dark.needsUpdate = true;
  const day = COAST_ENV_VARIANTS.day.sun;
  const uniforms = {
    time: clock, noise: { value: noise }, sky: { value: dark as THREE.Texture }, skyYaw: { value: 0 }, skyScale: { value: 1 },
    steps: { value: CLOUD_SEA.high[0] }, taps: { value: CLOUD_SEA.high[1] }, offset: { value: new THREE.Vector2() },
    sunDirection: { value: coastSunDirection('day') }, sunColor: { value: new THREE.Color(day.color).multiplyScalar(day.intensity) },
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms, vertexShader: SEA_VERTEX, fragmentShader: SEA_FRAGMENT, defines: { DEPTH: glsl(CLOUD_SEA.depth) } }));
  sea.name = 'Sky Spiral cloud sea'; sea.frustumCulled = false;
  sea.renderOrder = 1; // after the opaque course: the pixels the road covers never reach the ray steps' output

  const quad = new THREE.PlaneGeometry(1, 1), cards = new THREE.InstancedBufferGeometry();
  cards.index = quad.index; cards.setAttribute('position', quad.getAttribute('position')); cards.setAttribute('uv', quad.getAttribute('uv'));
  const anchor = new THREE.InstancedBufferAttribute(new Float32Array(CLOUD_WISPS.capacity * 3), 3), drift = new THREE.InstancedBufferAttribute(new Float32Array(CLOUD_WISPS.capacity * 4), 4);
  cards.setAttribute('anchor', anchor); cards.setAttribute('drift', drift); cards.instanceCount = 0;
  const wisps = new THREE.Mesh(cards, new THREE.ShaderMaterial({ uniforms, vertexShader: WISP_VERTEX, fragmentShader: WISP_FRAGMENT, transparent: true, depthWrite: false }));
  wisps.name = 'Sky Spiral cloud wisps'; wisps.frustumCulled = false;
  sea.visible = wisps.visible = false;
  group.add(sea); road.add(wisps);

  let sector = NaN, mode = false, last = NaN, level = 0, target = 0;
  function scatter(distance: number, endless: boolean): void {
    let n = 0;
    for (let k = Math.max(0, Math.ceil((distance - CLOUD_WISPS.every) / CLOUD_WISPS.every)); k * CLOUD_WISPS.every < distance + CLOUD_WISPS.reach && n < CLOUD_WISPS.capacity; k++) {
      if (chance(k) >= CLOUD_WISPS.share) continue;
      const s = k * CLOUD_WISPS.every, { point, right } = skyFrame(s, endless || s > SKY_LENGTH);
      anchor.setXYZ(n, point.x, point.y, point.z);
      drift.setXYZW(n++, right[0], right[2], chance(k + .5), 60 + 60 * chance(k + .25));
    }
    cards.instanceCount = n; anchor.needsUpdate = drift.needsUpdate = true;
  }

  return {
    /** The deck's top in track space, for tests and QA. */
    get level(): number { return level; },
    /** Per frame: a few assignments. The sky uniforms follow the dome that is on screen. */
    show(on: boolean, ultra = false): void {
      sea.visible = wisps.visible = on;
      if (!on) return;
      const [steps, taps] = ultra ? CLOUD_SEA.ultra : CLOUD_SEA.high;
      uniforms.steps.value = steps; uniforms.taps.value = taps;
      uniforms.sky.value = dome.material.map ?? dark; uniforms.skyScale.value = dome.material.color.r; uniforms.skyYaw.value = dome.rotation.y;
    },
    /** Per frame while shown, after sky-scene.js has moved the road for `distance`. */
    stream(distance: number, endless: boolean): void {
      const here = Math.floor(distance / SECTOR);
      if (here !== sector || endless !== mode) {
        target = cloudSeaLevel(distance, endless); scatter(distance, endless);
        sector = here; mode = endless;
      }
      const moved = Math.abs(distance - last);
      // The first frame and a jump (restart, a new race) start at the level; a drive eases to it.
      level = moved < 400 ? level + Math.min(moved * CLOUD_SEA.rise, Math.max(-moved * CLOUD_SEA.sink, target - level)) : target;
      last = distance;
      sea.position.y = level + road.position.y;
      const x = -road.position.x, z = -road.position.z; // the billows stay with the course, not with the car
      uniforms.offset.value.set(x - Math.floor(x / CLOUD_SEA.tile) * CLOUD_SEA.tile, z - Math.floor(z / CLOUD_SEA.tile) * CLOUD_SEA.tile);
    },
    dispose(): void {
      sea.removeFromParent(); wisps.removeFromParent();
      sea.geometry.dispose(); sea.material.dispose(); cards.dispose(); quad.dispose(); wisps.material.dispose(); noise.dispose(); dark.dispose();
    },
  };
}
export type SpiralClouds = ReturnType<typeof createSpiralClouds>;
