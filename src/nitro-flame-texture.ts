import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, TextureLoader, type Texture } from 'three';

// The NITRO trail's flame texture (contract: docs/designs/nitro-flame/DESIGN.md). V is the flow axis, U wraps the tube;
// R tongues, G fine turbulence, B sparse hot filaments. This module is the only code that names the path.
export const NITRO_FLAME_PATH = 'feature-assets/garage-vfx-skins/nitro-flame/flame-noise.png';

/** Most light-dark cycles along V in one tile, per channel: what the trail's flicker accounting assumes of the image
 *  (.claude/rules/nitro-trail-vfx.md). A busier texture needs these raised, and the shader's scroll speeds lowered. */
export const FLAME_CYCLES = { r: 2, g: 8, b: 3 };

type Load = (url: string, onLoad: (texture: Texture) => void) => unknown;
const browserLoad: Load | null = typeof document === 'undefined' ? null : (url, onLoad) => new TextureLoader().load(url, onLoad);

function tiled<T extends Texture>(texture: T): T {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = NoColorSpace; // data, not colour
  texture.needsUpdate = true;
  return texture;
}

/** A sampler uniform that holds a neutral 1 x 1 at once and the image once `request()` has loaded it: the value is
 *  swapped, never the uniform, so materials keep their warmed-up program. A failed load keeps the neutral texel. */
export function createNitroFlame(load: Load | null = browserLoad, baseUrl?: string) {
  const uniform: { value: Texture } = { value: tiled(new DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1)) };
  let asked = false;
  return {
    uniform,
    request() {
      if (asked || !load) return;
      asked = true;
      load(`${baseUrl ?? import.meta.env.BASE_URL}${NITRO_FLAME_PATH}`, image => { uniform.value = tiled(image); });
    },
  };
}

/** One texture for every trail: the race car, the Garage stage and the previews. */
export const nitroFlame = createNitroFlame();
