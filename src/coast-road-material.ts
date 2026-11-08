// Task 5 Coast asphalt: the Blender-baked KTX2 set (material-manifest.ts) on one MeshStandardMaterial, plus a wet
// variant driven by a `wetness` uniform. Puddles come from packed.b: darker albedo, near-mirror roughness and a flat
// normal, so the scene environment (the Coast HDRI) reflects in them. Weather changes only move the uniform; the
// program is built once (customProgramCacheKey) and warmed before GO like every other material.
import * as THREE from 'three';
import { MATERIAL_MANIFEST, type MaterialFile, type MaterialMap, type MaterialTier } from './material-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';

/** Road material tier (TIERS gives its resolution); null keeps the procedural road (Low, also with the Ultra flag). */
export function coastRoadTier(quality: VfxQuality, ultra: boolean): MaterialTier | null {
  if (quality === 'low') return null;
  return ultra ? 'ultra' : quality;
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
roughnessFactor = mix( roughnessFactor, roughnessFactor * .4, wetness );
roughnessFactor = mix( roughnessFactor, .05, puddle );
diffuseColor.rgb *= mix( 1., .5, wetness ) * mix( 1., .75, puddle );`;
// The lights-only mirror (wet-reflection.ts): projective lookup, rippled by the normal map, five fading taps stretched
// along the screen like light on wet asphalt, strongest in puddles and at grazing angles. No pow/exp, w clamped.
const OPAQUE = '#include <opaque_fragment>', PROJECT = '#include <project_vertex>';
const MIRROR = `vec2 mirrorUv = vReflectUv.xy / max( vReflectUv.w, 1e-4 ) + ( normal.xy - nonPerturbedNormal.xy ) * .05;
vec3 mirrorLight = ( texture2D( reflectMap, mirrorUv ).rgb + texture2D( reflectMap, mirrorUv + vec2( 0., .02 ) ).rgb * .8
  + texture2D( reflectMap, mirrorUv + vec2( 0., .05 ) ).rgb * .6 + texture2D( reflectMap, mirrorUv + vec2( 0., .09 ) ).rgb * .4
  + texture2D( reflectMap, mirrorUv + vec2( 0., .15 ) ).rgb * .25 ) / 3.05;
float grazing = 1. - saturate( dot( nonPerturbedNormal, geometryViewDir ) );
outgoingLight += mirrorLight * reflectStrength * ( .3 + .7 * puddle / max( wetness, 1e-4 ) ) * ( .25 + .75 * grazing * grazing );
${OPAQUE}`;
const FLATTEN = 'normal = normalize( mix( normal, nonPerturbedNormal, puddle ) );';
// Ultra: the same normal map again at 1/6 the repeat, adding grain the 2K texels cannot hold at the bumper camera.
const DETAIL = `vec3 detailN = texture2D( normalMap, vNormalMapUv * 6. ).xyz * 2. - 1.;
normal = normalize( normal + tbn * vec3( detailN.xy * normalScale * .4, 0. ) );`;

/** Uniforms the lights-only mirror updates in place; without one the road adds nothing (Medium, tests). */
export interface ReflectionUniforms { reflectMap: { value: THREE.Texture | null }; reflectMatrix: { value: THREE.Matrix4 }; reflectStrength: { value: number } }
const noReflection = (): ReflectionUniforms => ({ reflectMap: { value: null }, reflectMatrix: { value: new THREE.Matrix4() }, reflectStrength: { value: 0 } });

export function createCoastRoadMaterial(maps: Record<MaterialMap, THREE.Texture>, anisotropy = 1,
  { detail = false, reflection = noReflection() }: { detail?: boolean; reflection?: ReflectionUniforms } = {}) {
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
    if (![ROUGHNESS, NORMAL, COMMON, OPAQUE].every(chunk => frag.includes(chunk)) || !shader.vertexShader.includes(PROJECT)) throw new Error('coast road: three shader chunks moved; update the wet-road injection');
    Object.assign(shader.uniforms, { wetness }, reflection);
    shader.vertexShader = shader.vertexShader.replace(COMMON, `${COMMON}\nuniform mat4 reflectMatrix;\nvarying vec4 vReflectUv;`)
      .replace(PROJECT, `${PROJECT}\nvReflectUv = reflectMatrix * modelMatrix * vec4( transformed, 1.0 );`);
    const normal = [NORMAL, ...detail ? [DETAIL] : [], FLATTEN].join('\n');
    shader.fragmentShader = frag.replace(COMMON, `${COMMON}\nuniform float wetness;\nuniform float reflectStrength;\nuniform sampler2D reflectMap;\nvarying vec4 vReflectUv;`)
      .replace(ROUGHNESS, WET_ROUGHNESS).replace(NORMAL, normal).replace(OPAQUE, MIRROR);
  };
  const key = detail ? 'coast-road-wet-v2-detail' : 'coast-road-wet-v2';
  material.customProgramCacheKey = () => key;
  return {
    material,
    setWetness(value: number): void { wetness.value = value; },
    dispose(): void { material.dispose(); for (const texture of Object.values(maps)) texture.dispose(); },
  };
}
export type CoastRoad = ReturnType<typeof createCoastRoadMaterial>;
