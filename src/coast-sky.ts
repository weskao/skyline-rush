// Coast visible sky (owner decision D3): the preset's own lighting HDRI, at 4K / 8K, on a dome mesh, so the sky the
// player sees is the sky that lights the car. The dome hangs under the procedural sky mesh and replaces its draw; the
// HDR sun disc moves onto the HDRI sun. Low, other tracks, presets without an HDRI, pages without `?look=3d` and a
// failed load keep the procedural sky. The dome holds a 1 px map from creation, so the world's first shader warmup
// builds its program; every sky after that is a texture swap, as the environment map is (coast-look.ts).
import * as THREE from 'three';
import { COAST_ENV_VARIANTS, coastEnvPlan, type CoastEnvName } from './coast-lighting.ts';
import { COAST_SKY_MANIFEST, type SkyFile, type SkyWidth } from './coast-sky-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';

/** Where every preset's sun sits, as atan2(z, x): the car drives toward -z, the sun is 22 degrees to its left. */
export const COAST_SUN_AZIMUTH = -Math.PI / 2 - 22 * Math.PI / 180;
const RADIUS = 2400, COLUMNS = 64, ROWS = 16, SKIRT = 0.2; // inside the procedural dome (2,500 m) and the far plane
const DISC_DISTANCE = 2300, DISC_GAIN = 6; // in front of the dome; HDR so the disc blooms

const hdriAzimuth = (name: CoastEnvName): number => Math.atan2(COAST_ENV_VARIANTS[name].sky.sunDirection[2], COAST_ENV_VARIANTS[name].sky.sunDirection[0]);
/** rotation.y for the dome, and for scene.environmentRotation, that turns this HDRI's sun to COAST_SUN_AZIMUTH. */
export const coastSkyYaw = (name: CoastEnvName): number => hdriAzimuth(name) - COAST_SUN_AZIMUTH;
/** Unit world direction to the turned HDRI sun: the HDRI's elevation at the shared azimuth. */
export function coastSunDirection(name: CoastEnvName, target = new THREE.Vector3()): THREE.Vector3 {
  const [x, y, z] = COAST_ENV_VARIANTS[name].sky.sunDirection, flat = Math.hypot(x, z);
  return target.set(Math.cos(COAST_SUN_AZIMUTH) * flat, y, Math.sin(COAST_SUN_AZIMUTH) * flat).normalize(); // the manifest rounds to 4 places
}

export const coastSkyWidth = (ultra: boolean, maxTextureSize: number): SkyWidth => ultra && maxTextureSize >= 8192 ? 8192 : 4096;
export const coastSkyFile = (name: CoastEnvName, width: SkyWidth): SkyFile => COAST_SKY_MANIFEST.skies[name].files.find(file => file.width === width)!;

/** Upper hemisphere with the equirect mapping of the lighting HDRI (u = atan2(z, x) / 2pi + 0.5; v = 0 zenith, 1
 *  horizon), plus one row under the horizon that repeats the horizon texels down to the sea. */
export function createSkyDomeGeometry(): THREE.BufferGeometry {
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  for (let row = 0; row <= ROWS + 1; row++) {
    const angle = row <= ROWS ? row / ROWS * Math.PI / 2 : Math.PI / 2 + SKIRT; // from the zenith
    for (let column = 0; column <= COLUMNS; column++) {
      const u = column / COLUMNS, longitude = (u - 0.5) * Math.PI * 2;
      position.push(RADIUS * Math.sin(angle) * Math.cos(longitude), RADIUS * Math.cos(angle), RADIUS * Math.sin(angle) * Math.sin(longitude));
      uv.push(u, Math.min(1, row / ROWS));
      if (row > ROWS || column === COLUMNS) continue;
      const a = row * (COLUMNS + 1) + column, b = a + COLUMNS + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b); // outward faces: the dome is drawn BackSide, as the procedural one
    }
  }
  return new THREE.BufferGeometry().setIndex(index)
    .setAttribute('position', new THREE.Float32BufferAttribute(position, 3)).setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
}

interface Deps {
  /** The procedural sky dome and sun disc of classic-backdrop.ts. */
  sky: THREE.Mesh; sun: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  load(url: string): Promise<THREE.Texture>; maxTextureSize: number;
  /** QA state (the canvas dataset): coastSky = procedural | loading | <variant>:<width> | fallback:<variant>. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastSky({ sky, sun, load, maxTextureSize, dataset = {} }: Deps) {
  // Transparent queue only to stay out of the wet mirror (its light sources are the opaque unlit meshes) and to draw
  // after the opaque scene; nothing blends.
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: blank, side: THREE.BackSide, depthWrite: false, fog: false, transparent: true, blending: THREE.NoBlending });
  const dome = new THREE.Mesh(createSkyDomeGeometry(), material);
  dome.visible = false; dome.frustumCulled = false; dome.renderOrder = -1;
  sky.add(dome);
  const procedural = sky.material as THREE.Material;
  const disc = { position: sun.position.clone(), scale: sun.scale.clone(), color: sun.material.color.clone() };
  const textures = new Map<string, THREE.Texture | 'loading' | 'failed'>();
  let shown: { name: CoastEnvName; key: string } | null = null, status = '', disposed = false;
  const say = (next: string): void => { if (next !== status) dataset.coastSky = status = next; };

  function request(name: CoastEnvName, key: string, width: SkyWidth): void {
    textures.set(key, 'loading');
    load(coastSkyFile(name, width).url).then(texture => {
      if (disposed) return texture.dispose();
      texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
      textures.set(key, texture);
    }, error => {
      textures.set(key, 'failed');
      console.warn(`[coast-sky] ${key} → procedural sky (${error})`);
    });
  }

  function hide(): void {
    if (!shown) return;
    dome.visible = false; procedural.visible = true;
    sun.position.copy(disc.position); sun.scale.copy(disc.scale); sun.material.color.copy(disc.color);
    shown = null;
  }

  function show(name: CoastEnvName, key: string, texture: THREE.Texture): void {
    const v = COAST_ENV_VARIANTS[name];
    material.map = texture;
    material.color.setScalar(v.sky.range * v.sky.gain); // the texture stores radiance / range
    dome.rotation.y = coastSkyYaw(name); dome.visible = true;
    procedural.visible = false; // not `sky.visible`: world.js reads that for the sea and the mountains
    coastSunDirection(name, sun.position).multiplyScalar(DISC_DISTANCE);
    sun.scale.setScalar(Math.max(v.sky.disc, 1e-3)); // parked, never a zero matrix
    sun.material.color.set(v.sun.color).multiplyScalar(DISC_GAIN);
    for (const [other, entry] of textures) if (other !== key && typeof entry === 'object') { entry.dispose(); textures.delete(other); }
    shown = { name, key };
    say(key);
  }

  return {
    /** Per frame: a string compare unless the track, preset or tier changed. */
    update(trackId: string, preset: string, quality: VfxQuality, ultra: boolean): void {
      const plan = coastEnvPlan(trackId, preset, quality);
      if (plan.kind === 'room' || maxTextureSize < 4096) { hide(); return say('procedural'); }
      const name = plan.variant, width = coastSkyWidth(ultra, maxTextureSize), key = `${name}:${width}`;
      if (shown?.key === key) return;
      if (shown && shown.name !== name) hide(); // never another preset's sky; a tier change keeps the old width up
      if (!textures.has(key)) { request(name, key, width); say('loading'); }
      const ready = textures.get(key);
      if (ready === 'failed') { hide(); return say(`fallback:${name}`); }
      if (typeof ready === 'object') show(name, key, ready);
    },
    dispose(): void {
      hide(); disposed = true;
      for (const entry of textures.values()) if (typeof entry === 'object') entry.dispose();
      textures.clear();
      sky.remove(dome); dome.geometry.dispose(); material.dispose(); blank.dispose();
    },
  };
}
