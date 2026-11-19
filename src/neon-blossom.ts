// Task 5b audit entry 24: the cherry tree's blossom is closed puffs (assets-src/neon-city/build/kit.py `puff`) on the
// city kit's one opaque material, so it read as solid balls. Its pools wear this copy instead: florets cut out of the
// blossom cell by the alpha test (no blending, depth write on), more of them where a puff turns away from the camera,
// so the crown shows gaps and a ragged outline. Only the cherry tree wears it, and its pools are one draw each already:
// no draw call is added, one program is. Low draws no kit, so the cut-out is Medium and above.
import * as THREE from 'three';

const ATLAS = 2048;
/** The blossom cell (assets-src/neon-city/build/cells.py, 256 px, placed by atlas.py `pack`) in glTF UV:
 *  [u0, v0, u1, v1]. The bark lies elsewhere in the atlas. Guard: tests/neon-city-glb.test.js. */
export const NEON_BLOSSOM_CELL = [1104 / ATLAS, 1324 / ATLAS, 1360 / ATLAS, 1580 / ATLAS] as const;

const COMMON = '#include <common>', MAP = '#include <map_fragment>';
const vec2 = (x: number, y: number): string => `vec2( ${x.toFixed(6)}, ${y.toFixed(6)} )`;
const [U0, V0, U1, V1] = NEON_BLOSSOM_CELL;
const NOISE = `${COMMON}
float blossomHash( vec2 p ) { vec3 q = fract( p.xyx * .1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float blossomNoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( blossomHash( i ), blossomHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( blossomHash( i + vec2( 0.0, 1.0 ) ), blossomHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}`;
// A puff spans 0.9 of the cell, so about 8 floret clumps cross it. Where the clumps shrink under a pixel the cut fades
// out (the far band reads as a whole crown instead of shimmering). vNormal is the unmapped view-space normal.
const CUT = `${MAP}
#ifdef USE_MAP
{
	vec2 blossomCell = ( vMapUv - ${vec2(U0, V0)} ) / ${vec2(U1 - U0, V1 - V0)};
	if ( all( greaterThanEqual( blossomCell, vec2( 0.0 ) ) ) && all( lessThanEqual( blossomCell, vec2( 1.0 ) ) ) ) {
		vec2 floret = blossomCell * 9.0, texel = fwidth( floret );
		float clump = blossomNoise( floret ) * .65 + blossomNoise( floret * 2.3 + 17.0 ) * .35;
		float facing = abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) );
		float cut = mix( -.1, mix( .6, .24, smoothstep( .15, .7, facing ) ), 1.0 - smoothstep( .4, 1.0, max( texel.x, texel.y ) ) );
		float edge = max( fwidth( clump ), 1e-4 );
		diffuseColor.a *= smoothstep( cut - edge, cut + edge, clump );
	}
}
#endif`;

/** The cherry tree's copy of the city kit material; the caller owns (and disposes) it. */
export function createBlossomMaterial(kit: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const material = Object.assign(kit.clone(), { name: `${kit.name}_blossom`, alphaTest: .5, transparent: false, depthWrite: true });
  material.customProgramCacheKey = () => 'neon-blossom-v1';
  material.onBeforeCompile = shader => {
    const fragment = shader.fragmentShader;
    if (!fragment.includes(COMMON) || !fragment.includes(MAP)) throw new Error('neon blossom: three shader chunks moved; update the cut-out injection');
    shader.fragmentShader = fragment.replace(COMMON, NOISE).replace(MAP, CUT);
  };
  return material;
}
