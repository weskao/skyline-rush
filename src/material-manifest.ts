// Task 5 road material manifest. Hashes/bytes come from the SUMMARY that `assets-src/coast-asphalt/bake.py` prints.
// Convention: one UV repeat = ROAD_UV_METRES (u across the road, v along it). Textures are KTX2 UASTC + zstd with a full
// mip chain, rows written v = 0 first (load with flipY = false, the KTX2Loader default). normal is OpenGL / tangent space.
export type MaterialMap = 'baseColor' | 'normal' | 'packed';
export type MaterialColorSpace = 'srgb' | 'linear';
/** Texture resolution per quality tier; Low keeps the procedural road and loads nothing. */
export const TIERS = { medium: 1024, high: 2048, ultra: 2048 } as const; // Ultra adds a detail normal (coast-road-material.ts)
export type MaterialTier = keyof typeof TIERS;

export interface MaterialFile { map: MaterialMap; resolution: number; url: string; bytes: number; sha256: string; colorSpace: MaterialColorSpace }
export interface MaterialManifestEntry {
  id: string;
  tileMetres: number;
  /** packed.r = ambient occlusion, packed.g = dry roughness, packed.b = puddle mask (0 dry .. 1 standing water). */
  packing: { r: string; g: string; b: string };
  license: { id: string; creator: string; sourceUrl: string };
  source: { master: string; script: string; masterSha256: string; scriptSha256: string; inputSha256: Record<string, string> };
  files: MaterialFile[];
  budgets: { downloadBytes: Record<number, number>; gpuBytes: Record<MaterialTier, number> };
}

/** GPU bytes of the three maps once transcoded to an 8 bpp block format (BC7 / ASTC 4x4), mips included (x 4/3). */
export const gpuBytesEstimate = (resolution: number): number => Math.round(3 * resolution * resolution * 4 / 3);

export const MATERIAL_MANIFEST: Record<string, MaterialManifestEntry> = {
  'coast-asphalt': {
    id: 'coast-asphalt',
    tileMetres: 24,
    packing: { r: 'ambient occlusion', g: 'dry roughness', b: 'puddle mask' },
    license: { id: 'CC0-1.0', creator: 'Rob Tuytel', sourceUrl: 'https://polyhaven.com/a/asphalt_02' },
    source: {
      master: 'assets-src/coast-asphalt/coast-asphalt.blend',
      script: 'assets-src/coast-asphalt/bake.py',
      masterSha256: '2ff9854764e8c720a24be7f94def94d304c9d498703c188dc810691547e182d7',
      scriptSha256: '66689328b47d121d0d09fb39e03ba100b350760966a98a6c476d9546b2e78588',
      inputSha256: {
        'asphalt_02_diff_4k.jpg': 'd1601354507b6c4a46aa741b9134f9f23f738596a2bdcd20792e50ca554018e0',
        'asphalt_02_nor_gl_4k.png': 'ab7e53a881eed0fb97fd8b7940fb5e3d5396e76623f823c054710b2701de63ae',
        'asphalt_02_rough_4k.jpg': '62e0461c25fe1cb411abf8ef3afaf080e16bf96ef7fd2acd180e9867ce95aabd',
        'asphalt_02_ao_4k.jpg': 'aed3afe9e5fb7c7689cb262fd13a7d6e19352cd903b6bdd3699ca04fea6cccae',
      },
    },
    files: [
      { map: 'baseColor', resolution: 1024, url: 'materials/coast-asphalt/asphalt_basecolor_1k.ktx2', bytes: 1_024_221, sha256: '81a1263a38c8bfcf14fe25caa25cf50aee70fc3841ea428bb16c9c93b2831395', colorSpace: 'srgb' },
      { map: 'normal', resolution: 1024, url: 'materials/coast-asphalt/asphalt_normal_1k.ktx2', bytes: 964_762, sha256: '29aa01caf5e8c9a3fae591f051b27fc64157caa8ec12999614bb71693c63a832', colorSpace: 'linear' },
      { map: 'packed', resolution: 1024, url: 'materials/coast-asphalt/asphalt_packed_1k.ktx2', bytes: 1_108_759, sha256: '09d5ebef51eb5ed3cfd447e3bb0bb0ce104b7548fc93f6d69159c29a757badff', colorSpace: 'linear' },
      { map: 'baseColor', resolution: 2048, url: 'materials/coast-asphalt/asphalt_basecolor_2k.ktx2', bytes: 4_181_791, sha256: 'b43cfb73d7bf61935924b6c155ce8e5968a8f7f2f27aa6881674e8daa7d4badc', colorSpace: 'srgb' },
      { map: 'normal', resolution: 2048, url: 'materials/coast-asphalt/asphalt_normal_2k.ktx2', bytes: 4_218_327, sha256: 'a36d5fdb339f89e90e01070cac198095fbeac44134e1578bbda6e7e46fe686d3', colorSpace: 'linear' },
      { map: 'packed', resolution: 2048, url: 'materials/coast-asphalt/asphalt_packed_2k.ktx2', bytes: 4_416_629, sha256: '9ac0c207f76d96a7c1e2cdc1c8353dd2a19da1a2f57f3104323926c05c7edf60', colorSpace: 'linear' },
    ],
    budgets: {
      downloadBytes: { 1024: 3_300_000, 2048: 13_000_000 },
      gpuBytes: { medium: 4_500_000, high: 17_500_000, ultra: 17_500_000 },
    },
  },
  // Task 5b step 4: Neon Downtown wet city asphalt, a drop-in for coast-asphalt (assets-src/neon-asphalt/README.md).
  'neon-asphalt': {
    id: 'neon-asphalt',
    tileMetres: 24,
    packing: { r: 'ambient occlusion', g: 'dry roughness', b: 'puddle mask' },
    license: { id: 'CC0-1.0', creator: 'Dimitrios Savva', sourceUrl: 'https://polyhaven.com/a/asphalt_track' },
    source: {
      master: 'assets-src/neon-asphalt/neon-asphalt.blend',
      script: 'assets-src/neon-asphalt/bake.py',
      masterSha256: '0ff54850ab42b0f1626c4011e43b59f1426041ab28a6fe323b3b1f4920d7933b',
      scriptSha256: 'aac90de7bb3cbaa03b4f160f0ae88a4fffe187cf0a2d0f3a464121b7eba5acb2',
      inputSha256: {
        'asphalt_track_diff_4k.jpg': '5719cb6a2cacdcd22edc82118be79a54b24c681aa2a6c1c3bf6a00d50f68c6c9',
        'asphalt_track_nor_gl_4k.png': 'b4a8aa21b43c27faeb349ae43cff15f753b08078173a8c38a9eecfac2eedcdf1',
        'asphalt_track_rough_4k.jpg': '2666b02ff3293dad8b44b6b69131d09a51ca25d087133d3ccf5a0e820e5fac33',
        'asphalt_track_ao_4k.jpg': '1bd099b091e50af2f00881a17e2203476285f520699a39a194708cbb988127b9',
      },
    },
    files: [
      { map: 'baseColor', resolution: 1024, url: 'materials/neon-asphalt/asphalt_basecolor_1k.ktx2', bytes: 917_342, sha256: '6ec00f9a89f4979c97435bcb85b4b0c66870c80b33c91195a03daea09a7dbb90', colorSpace: 'srgb' },
      { map: 'normal', resolution: 1024, url: 'materials/neon-asphalt/asphalt_normal_1k.ktx2', bytes: 617_599, sha256: '02371d47dab66dc3f100539c39bf00a7fee30dacfa1896f3fde79848d6b7f661', colorSpace: 'linear' },
      { map: 'packed', resolution: 1024, url: 'materials/neon-asphalt/asphalt_packed_1k.ktx2', bytes: 494_718, sha256: '2907da9590db49e0da98460ab775dbb5329e5470dad563ac9e65309a00ea02b1', colorSpace: 'linear' },
      { map: 'baseColor', resolution: 2048, url: 'materials/neon-asphalt/asphalt_basecolor_2k.ktx2', bytes: 3_692_563, sha256: 'eab658d2fcaf89589a3f06467032e6fc4b73c83978f817eea3126e1e4c7447f6', colorSpace: 'srgb' },
      { map: 'normal', resolution: 2048, url: 'materials/neon-asphalt/asphalt_normal_2k.ktx2', bytes: 3_059_005, sha256: 'faed186420bb76171afd0baa67df83fd3fc75c48722197c3767acbe1e88c56c3', colorSpace: 'linear' },
      { map: 'packed', resolution: 2048, url: 'materials/neon-asphalt/asphalt_packed_2k.ktx2', bytes: 1_959_317, sha256: '35cbe880a49cbe91f2674ce51d337e40ef807cd3611ccdef8a50d628f1a6f0ed', colorSpace: 'linear' },
    ],
    budgets: {
      downloadBytes: { 1024: 3_300_000, 2048: 13_000_000 },
      gpuBytes: { medium: 4_500_000, high: 17_500_000, ultra: 17_500_000 },
    },
  },
};
