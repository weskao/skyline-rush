// Coast seagulls (`?look=3d`, Medium+): a few flocks circling over the sea and the cliffs, never over the road. One
// InstancedMesh for every bird in view; each bird is an orbit (centre in its instance matrix; radius, phase, angular
// speed and size in one instanced vec4) that the vertex shader flies from a single time uniform: the circle, the bank
// into the turn and the wing beats cost no CPU per frame. Buffers are rewritten only when the slot window moves.
import * as THREE from 'three';
import type { ClassicRoad } from './classic-road-routes.ts';
import type { ChunkWindow } from './coast-scenery-glb.ts';
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';

export const GULL_SLOT_METRES = 160;
/** No point of any orbit comes closer to the road centre (m): the road is 12.4 m to its kerb, rings hang above it. */
export const GULL_ROAD_CLEARANCE = 30;
/** Lowest flight (m): the tallest close cliff tops out near 25 m. */
export const GULL_MIN_HEIGHT = 28;
const SLOTS: Readonly<Record<Exclude<VfxQuality, 'low'>, number>> = { medium: 5, high: 6 };
const MAX_GULLS = 8, CAPACITY = 2 * MAX_GULLS * SLOTS.high;

/** `speed` is rad/s around the flock centre, signed (the flock turns one way); `lift` is metres on the flock height. */
export interface Gull { radius: number; phase: number; speed: number; lift: number; size: number }
/** `along` is metres into the slot, `offset` lateral metres from the road centre (as coast-scenery-glb.ts). */
export interface Flock { along: number; offset: number; height: number; gulls: Gull[] }

export function coastGullPlan(slot: number, seed?: number): Flock[] {
  const r = seededRng(seed ?? 0, 'coast-gulls-v1:' + slot), out: Flock[] = [];
  for (const side of [-1, 1]) {
    if (r() > .75) continue;
    const reach = 14 + r() * 18, turn = r() < .5 ? -1 : 1, count = 4 + Math.floor(r() * (MAX_GULLS - 3));
    out.push({
      along: r() * GULL_SLOT_METRES, height: GULL_MIN_HEIGHT + 2 + r() * 14,
      offset: side * (GULL_ROAD_CLEARANCE + 8 + reach + r() * 50), // 8 m spare: a bend can lean towards the flock
      gulls: Array.from({ length: count }, () => {
        const radius = reach * (.45 + .55 * r()); // gliding at 7 to 11 m/s
        return { radius, phase: r() * Math.PI * 2, speed: turn * (7 + r() * 4) / radius, lift: (r() - .5) * 4, size: 2 + r() * .8 };
      }),
    });
  }
  return out;
}

/** One slot behind the car to past where the birds are sub-pixel; Low draws none. */
export function coastGullWindow(distance: number, quality: VfxQuality): ChunkWindow | null {
  if (quality === 'low') return null;
  return { first: Math.floor(distance / GULL_SLOT_METRES) - 1, count: SLOTS[quality] };
}

// shortcut: a 19-triangle silhouette with vertex colours, 1.5 m wingspan at size 1, nose towards +z. A gull is under
// 40 px across from the road, so no scan or texture is spent on it; model one if a camera ever flies among them.
function gullGeometry(): THREE.BufferGeometry {
  const white = [.8, .8, .8], grey = [.3, .33, .37], dusk = [.18, .2, .22], black = [.03, .03, .035];
  const points: number[][] = [
    [0, 0, .36, .7, .45, .05], [.07, 0, .06, ...white], [0, .07, .06, ...white], [-.07, 0, .06, ...white], [0, -.06, .06, ...white], [0, 0, -.28, ...white], // body
    [0, 0, -.2, ...white], [.1, 0, -.46, ...white], [-.1, 0, -.46, ...white], // tail fan
  ];
  const index = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4, 6, 7, 8];
  for (const s of [1, -1]) { // root, raised wrist, outer wing, drooped black tip: the gull's shallow M
    const a = points.length;
    points.push([s * .05, .03, .16, ...grey], [s * .05, .03, -.12, ...grey], [s * .34, .09, .21, ...grey], [s * .34, .08, -.03, ...grey],
      [s * .58, .05, .07, ...dusk], [s * .56, .05, -.08, ...dusk], [s * .75, 0, -.12, ...black]);
    for (const [i, j, k] of [[0, 2, 3], [0, 3, 1], [2, 4, 5], [2, 5, 3], [4, 6, 5]] as const) index.push(a + i, a + (s > 0 ? j : k), a + (s > 0 ? k : j));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.slice(0, 3)), 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(points.flatMap(p => p.slice(3)), 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const TURN = `attribute vec4 gull; uniform float gullTime;
  vec3 gullTurn(vec3 v){ // bank into the turn, then face along the orbit
    float way=sign(gull.z),a=gull.y+gull.z*gullTime,b=.38*way;
    v.xy=vec2(v.x*cos(b)-v.y*sin(b),v.x*sin(b)+v.y*cos(b));
    vec2 f=way*vec2(-sin(a),cos(a));
    return vec3(v.x*f.y+v.z*f.x,v.y,v.z*f.y-v.x*f.x);}`;
// Wing beats come in bursts between glides; the outer wing lags the inner one.
const FLY = `float gullA=gull.y+gull.z*gullTime,gullW=gullTime*9.+gull.y*7.,gullX=abs(position.x);
  vec3 gullP=position;
  gullP.y+=(sin(gullW)*.5*gullX+sin(gullW-1.1)*.55*max(0.,gullX-.34))*smoothstep(.15,.75,sin(gullTime*.45+gull.y*3.));
  vec3 transformed=vec3(cos(gullA)*gull.x,sin(gullTime*.6+gull.y)*1.2,sin(gullA)*gull.x)+gullTurn(gullP)*gull.w;`;

export function createCoastSeagulls() {
  const geometry = gullGeometry(), orbit = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4);
  geometry.setAttribute('gull', orbit);
  const time = { value: 0 };
  // Lit like the scans (HDRI + sun, fog), so the birds follow every Coast time of day.
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, side: THREE.DoubleSide });
  material.name = 'coast_seagull';
  material.userData.time = time;
  material.customProgramCacheKey = () => 'coast-seagull';
  material.onBeforeCompile = shader => {
    shader.uniforms.gullTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${TURN}`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal=gullTurn(objectNormal);')
      .replace('#include <begin_vertex>', FLY);
    // Seen from the road the birds show their undersides: feathers pass light, so a wing is lit from above on both
    // faces (a little dimmer below) instead of going black against the sky.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nif(!gl_FrontFacing){normal=-normal;diffuseColor.rgb*=.7;}');
  };
  const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
  mesh.name = 'Coast seagulls';
  mesh.frustumCulled = false; // the flocks span the whole window and move in the shader
  mesh.count = 0;
  const centre = new THREE.Matrix4();
  let key = '', previousRoute: ClassicRoad | undefined;
  return {
    mesh,
    /** Rewrites every orbit for the slot window; a no-op unless the window, the origin or the seed changed. */
    place(route: ClassicRoad, window: ChunkWindow, origin: number, seed?: number): void {
      const next = `${window.first}|${window.count}|${origin}|${seed}`;
      if (next === key && route === previousRoute) return;
      key = next; previousRoute = route;
      let used = 0;
      for (let slot = window.first; slot < window.first + window.count; slot++) for (const flock of coastGullPlan(slot, seed)) {
        const [x, z] = route.point(slot * GULL_SLOT_METRES + flock.along, flock.offset);
        for (const gull of flock.gulls) {
          if (used === CAPACITY) break;
          mesh.setMatrixAt(used, centre.makeTranslation(x, flock.height + gull.lift, z + origin));
          orbit.setXYZW(used++, gull.radius, gull.phase, gull.speed, gull.size);
        }
      }
      mesh.count = used;
      mesh.instanceMatrix.needsUpdate = orbit.needsUpdate = true;
    },
    /** Seconds; a constant (reduced motion) holds the flocks in a glide. */
    setTime(seconds: number): void { time.value = seconds; },
    dispose(): void { mesh.removeFromParent(); mesh.dispose(); geometry.dispose(); material.dispose(); },
  };
}
