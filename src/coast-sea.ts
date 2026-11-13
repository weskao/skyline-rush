// Coast water (full-scene step 2): under `?look=3d` on Medium+ the classic sea plane draws this surface instead of its
// two-sine shader. Three scrolling lookups of one baked ocean normal/foam map (coast-sea-manifest.ts) tilt the surface;
// it mirrors the sky dome texture that is on screen (coast-sky.ts) by Fresnel, glitters under that sky's sun, fades into
// the dome's own horizon texels, and foams where the placed rocks, cliffs and arch stand in it (the shore mask the
// scenery layer stamps). The mesh is a hidden child of the sea from creation, so the first shader warmup builds its
// program; showing it, a preset change and a new sky are visibility, uniform and texture changes only.
import * as THREE from 'three';
import { COAST_ENV_VARIANTS, coastEnvPlan, type CoastEnvName } from './coast-lighting.ts';
import type { ShoreSink } from './coast-scenery-glb.ts';
import { COAST_SEA_MANIFEST } from './coast-sea-manifest.ts';
import { coastSunDirection } from './coast-sky.ts';
import type { VfxQuality } from './vfx-settings.ts';

/** Sun glitter as a factor on the preset's key light: the overcast skies have almost no sun to mirror. */
const GLITTER: Readonly<Record<CoastEnvName, number>> = { day: 1, dusk: 1, rain: .3, fog: .08 };
export const SHORE_MASK_METRES = 1280; // the High chunk window (960 m) plus the arch offsets
const MASK = 512, TEXEL = SHORE_MASK_METRES / MASK, FOAM_REACH = 6;

/** Where scenery stands in the water, in the scenery group's coordinates: 1 inside a footprint, fading to 0 over
 *  FOAM_REACH metres of water. Rewritten when the chunk window moves (every 120 m), one 256 KB upload. */
export function createShoreMask() {
  const data = new Uint8Array(MASK * MASK);
  const texture = new THREE.DataTexture(data, MASK, MASK, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  const rect = new THREE.Vector3(0, 0, 1 / SHORE_MASK_METRES); // x0, z0, 1 / extent
  const span = (centre: number, reach: number, from: number): [number, number] => // the border texels stay 0
    [Math.max(1, Math.floor((centre - reach - from) / TEXEL)), Math.min(MASK - 2, Math.ceil((centre + reach - from) / TEXEL))];
  return {
    texture, rect,
    begin(x: number, z: number): void { data.fill(0); rect.set(x - SHORE_MASK_METRES / 2, z - SHORE_MASK_METRES / 2, 1 / SHORE_MASK_METRES); },
    stamp(x: number, z: number, halfX: number, halfZ: number, yaw: number): void {
      const reach = Math.max(halfX, halfZ) + FOAM_REACH, narrow = Math.min(halfX, halfZ), cos = Math.cos(yaw), sin = Math.sin(yaw);
      const [c0, c1] = span(x, reach, rect.x), [r0, r1] = span(z, reach, rect.y);
      for (let row = r0; row <= r1; row++) for (let column = c0; column <= c1; column++) {
        const dx = rect.x + (column + .5) * TEXEL - x, dz = rect.y + (row + .5) * TEXEL - z;
        const outside = (Math.hypot((dx * cos - dz * sin) / halfX, (dx * sin + dz * cos) / halfZ) - 1) * narrow; // metres, about
        const value = Math.round(255 * Math.min(1, Math.max(0, 1 - outside / FOAM_REACH))), i = row * MASK + column;
        if (value > data[i]!) data[i] = value;
      }
    },
    end(): void { texture.needsUpdate = true; },
  } satisfies ShoreSink & { texture: THREE.DataTexture; rect: THREE.Vector3 };
}

const VERTEX = `varying vec3 p; varying vec3 ambient; uniform sampler2D sky; uniform float skyScale;
  void main(){p=(modelMatrix*vec4(position,1.)).xyz;
    ambient=textureLod(sky,vec2(.5),12.).rgb*skyScale; // the last mip: the mean of the sky, per vertex
    gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
// Guarded for tests/shader-safety.test.js: every pow() base is max(0., ...), no exp(), no normalize() of a vector
// that can be zero, atan() never at (0, 0).
const FRAGMENT = `varying vec3 p; varying vec3 ambient;
  uniform sampler2D waves,sky,shore; uniform float time,skyYaw,skyScale; uniform vec2 offset; uniform vec3 shoreRect,sunDirection,sunColor;
  vec3 skyAt(vec3 d,float lod){ // the dome's mapping (coast-sky.ts); explicit lod, so no seam where atan wraps
    return textureLod(sky,vec2((atan(d.z,d.x+1e-5)+skyYaw)*.15915494+.5,1.-asin(clamp(d.y,0.,1.))*.63661977),lod).rgb*skyScale;}
  void main(){vec3 toEye=cameraPosition-p;float dist=length(toEye);vec3 v=toEye/max(dist,1e-3);
    vec2 uv=p.xz+offset;float far=smoothstep(60.,1500.,dist);
    vec3 a=texture2D(waves,uv*.015625+time*vec2(.011,.004)).xyz; // the 64 m patch as baked
    vec3 b=texture2D(waves,uv.yx*.0611+time*vec2(.017,-.02)).xyz; // 16 m ripples, crossing
    vec3 c=texture2D(waves,uv*.0041-time*vec2(.002,.003)).xyz; // 240 m swell, hides the tiling
    vec2 tilt=((a.xy-.5)*1.6+(b.yx-.5)+(c.xy-.5)*1.2)*(1.-.6*far);
    vec3 n=normalize(vec3(tilt.x,1.,tilt.y));
    float fresnel=(.02+.98*pow(max(0.,1.-dot(n,v)),5.))*(1.-.4*smoothstep(80.,900.,dist)); // far waves face the eye more than a flat plane does
    vec3 r=reflect(-v,n);r.y=abs(r.y);
    vec3 light=ambient+sunColor*max(0.,dot(n,sunDirection))*.3;
    vec3 col=mix(mix(vec3(.02,.46,.42),vec3(.005,.05,.16),smoothstep(15.,300.,dist))*light,skyAt(r,2.+3.*far),fresnel);
    col+=sunColor*pow(max(0.,dot(n,normalize(v+sunDirection))),mix(900.,320.,far))*mix(3.,.6,far);
    float edge=texture2D(shore,(uv-shoreRect.xy)*shoreRect.z).r;
    float surf=smoothstep(.45,.9,edge*(.65+.35*sin(edge*10.+time*1.4))+(a.z+b.z)*.3);
    float caps=smoothstep(.3,.85,a.z)*smoothstep(.48,.56,c.x)*.55*(1.-far); // whitecaps in patches, not a speckle
    col=mix(col,light*.8,max(surf,caps));
    col=mix(col,skyAt(vec3(-v.x,0.,-v.z),1.),smoothstep(800.,2350.,dist)); // the dome's horizon row behind this pixel
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const pixel = (r: number, g: number, b: number): THREE.DataTexture => {
  const texture = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
};

interface Deps {
  /** The procedural sea plane and its foam boxes (classic-backdrop.ts), and the sky dome mesh of coast-sky.ts. */
  sea: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>; seaLines: { material: THREE.Material };
  dome: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** The Coast scenery group's position: the world slides past the car, the waves must stay with the rocks. */
  origin: THREE.Vector3; load(url: string): Promise<THREE.Texture>;
  /** QA state (the canvas dataset): coastSea = procedural | loading | water | fallback. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastSea({ sea, seaLines, dome, origin, load, dataset = {} }: Deps) {
  const mask = createShoreMask(), flat = pixel(128, 128, 0), dark = pixel(0, 0, 0);
  const uniforms = {
    time: sea.material.uniforms.time!, waves: { value: flat as THREE.Texture }, sky: { value: dark as THREE.Texture | null }, shore: { value: mask.texture },
    skyYaw: { value: 0 }, skyScale: { value: 1 }, offset: { value: new THREE.Vector2() }, shoreRect: { value: mask.rect },
    sunDirection: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color(0, 0, 0) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT });
  const water = new THREE.Mesh(sea.geometry, material);
  water.visible = false;
  sea.add(water);
  let waves: THREE.Texture | 'loading' | 'failed' | null = null, lit: CoastEnvName | null = null, disposed = false;
  function show(on: boolean, state: string): void {
    water.visible = on; sea.material.visible = seaLines.material.visible = !on;
    if (dataset.coastSea !== state) dataset.coastSea = state;
  }
  return {
    /** The scenery layer writes its sea-level footprints here (coast-scenery-glb.ts). */
    shore: mask as ShoreSink,
    /** Per frame, after the sky's update: a few assignments unless the track, preset or tier changed. */
    update(trackId: string, preset: string, quality: VfxQuality): void {
      const plan = coastEnvPlan(trackId, preset, quality);
      if (plan.kind === 'room') return show(false, 'procedural');
      if (!waves) {
        waves = 'loading';
        load(COAST_SEA_MANIFEST.url).then(texture => {
          if (disposed) return texture.dispose();
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.NoColorSpace;
          uniforms.waves.value = waves = texture;
        }, error => { waves = 'failed'; console.warn(`[coast-sea] wave texture → procedural sea (${error})`); });
      }
      if (waves === 'failed') return show(false, 'fallback');
      if (waves === 'loading' || !dome.visible) return show(false, 'loading'); // never a mirror of a sky that is not on screen
      if (lit !== plan.variant) {
        const v = COAST_ENV_VARIANTS[lit = plan.variant];
        coastSunDirection(lit, uniforms.sunDirection.value);
        uniforms.sunColor.value.set(v.sun.color).multiplyScalar(v.sun.intensity * GLITTER[lit]);
      }
      uniforms.sky.value = dome.material.map; uniforms.skyScale.value = dome.material.color.r; uniforms.skyYaw.value = dome.rotation.y;
      // shortcut: a floating-origin rebase (endless, every 500 m) shifts the wave pattern for one frame; carry the
      // rebase delta into the offset if that ever reads as a pop.
      uniforms.offset.value.set(-origin.x, -origin.z);
      show(true, 'water');
    },
    dispose(): void {
      disposed = true;
      show(false, 'procedural');
      sea.remove(water); material.dispose(); mask.texture.dispose(); flat.dispose(); dark.dispose();
      if (waves && typeof waves === 'object') waves.dispose();
    },
  };
}
