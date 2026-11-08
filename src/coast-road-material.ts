// Task 5 Coast asphalt: the Blender-baked KTX2 set (material-manifest.ts) on one MeshStandardMaterial, plus a wet
// variant driven by a `wetness` uniform. Puddles come from packed.b: darker albedo, near-mirror roughness and a flat
// normal, so the scene environment (the Coast HDRI) reflects in them. Weather changes only move the uniform; the
// program is built once (customProgramCacheKey) and warmed before GO like every other material.
import * as THREE from 'three';
import { MATERIAL_MANIFEST, TIERS, type MaterialFile, type MaterialMap } from './material-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';

/** Texture resolution for a tier; null keeps the procedural road (Low, also with the Ultra flag). */
export function coastRoadTier(quality: VfxQuality, ultra: boolean): number | null {
  if (quality === 'low') return null;
  return ultra ? TIERS.ultra : TIERS[quality];
}

export function coastRoadFiles(resolution: number): Record<MaterialMap, MaterialFile> {
  const files = MATERIAL_MANIFEST['coast-asphalt']!.files.filter(f => f.resolution === resolution);
  return Object.fromEntries(files.map(f => [f.map, f])) as Record<MaterialMap, MaterialFile>;
}

const WETNESS: Readonly<Record<string, number>> = { rain: .85, dusk: .35, fog: .25 };
/** 0 dry .. 1 soaked, per race visual preset; unknown presets (day, track, night, snow) stay dry. */
export const coastWetness = (preset: string): number => WETNESS[preset] ?? 0;

const ROUGHNESS = '#include <roughnessmap_fragment>', NORMAL = '#include <normal_fragment_maps>', COMMON = '#include <common>';
const WET_ROUGHNESS = `${ROUGHNESS}
float puddle = smoothstep( .3, .7, texelRoughness.b ) * wetness;
roughnessFactor = mix( roughnessFactor, roughnessFactor * .55, wetness );
roughnessFactor = mix( roughnessFactor, .05, puddle );
diffuseColor.rgb *= mix( 1., .6, wetness ) * mix( 1., .75, puddle );`;
const WET_NORMAL = `${NORMAL}
normal = normalize( mix( normal, nonPerturbedNormal, puddle ) );`;

export function createCoastRoadMaterial(maps: Record<MaterialMap, THREE.Texture>, anisotropy = 1) {
  maps.baseColor.colorSpace = THREE.SRGBColorSpace;
  maps.normal.colorSpace = maps.packed.colorSpace = THREE.NoColorSpace;
  for (const texture of Object.values(maps)) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.flipY = false;
    texture.anisotropy = anisotropy;
  }
  const wetness = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    name: 'coast_asphalt', map: maps.baseColor, normalMap: maps.normal, aoMap: maps.packed, roughnessMap: maps.packed,
    roughness: 1, metalness: 0,
  });
  material.onBeforeCompile = shader => {
    const frag = shader.fragmentShader;
    if (!frag.includes(ROUGHNESS) || !frag.includes(NORMAL) || !frag.includes(COMMON)) throw new Error('coast road: three shader chunks moved; update the wet-road injection');
    shader.uniforms.wetness = wetness;
    shader.fragmentShader = frag.replace(COMMON, `${COMMON}\nuniform float wetness;`).replace(ROUGHNESS, WET_ROUGHNESS).replace(NORMAL, WET_NORMAL);
  };
  material.customProgramCacheKey = () => 'coast-road-wet-v1';
  return {
    material,
    setWetness(value: number): void { wetness.value = value; },
    dispose(): void { material.dispose(); for (const texture of Object.values(maps)) texture.dispose(); },
  };
}
export type CoastRoad = ReturnType<typeof createCoastRoadMaterial>;
