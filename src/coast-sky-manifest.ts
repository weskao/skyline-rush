// Coast sky dome textures: the upper hemisphere of each lighting HDRI (coast-lighting.ts names the Poly Haven asset,
// creator and CC0 licence) as 4:1 KTX2 UASTC + zstd with a full mip chain, first row = zenith (flipY = false).
// Bytes and hashes come from the SUMMARY that `assets-src/coast-sky/build.py` prints; there is no .blend master.
import type { CoastEnvName } from './coast-lighting.ts';

export type SkyWidth = 4096 | 8192;
export interface SkyFile { width: SkyWidth; url: string; bytes: number; sha256: string }

export const COAST_SKY_MANIFEST = {
  script: 'assets-src/coast-sky/build.py',
  scriptSha256: '0a8ee4abef388f7fdd0b8476434450fb5deb92a2df49129c258e3b384b6059a2',
  /** One sky is on the GPU at a time. gpuBytes: 8 bpp block format (BC7 / ASTC 4x4), mips included (x 4/3). */
  budgets: { downloadBytes: { 4096: 2_600_000, 8192: 8_600_000 }, gpuBytes: { 4096: 5_600_000, 8192: 22_400_000 } },
  skies: {
    day: {
      inputSha256: {
        'kloofendal_48d_partly_cloudy_puresky_4k.hdr': '3061c00a16ecae748e84fd6c44c04804f539c118bb66325db858bad87b11bf88',
        'kloofendal_48d_partly_cloudy_puresky_8k.hdr': '30ff6bb1eec58c11b52254e89b5dc39aaf756dd332c9a14a4976d68f23feaa71',
      },
      files: [
        { width: 4096, url: 'environments/sky/kloofendal_48d_partly_cloudy_puresky_sky_4k.ktx2', bytes: 2_450_665, sha256: '9724ca065e9d748906e9fa5f5eb8786acfa6d4cf0b5e45ae5fe62ad47cf97f20' },
        { width: 8192, url: 'environments/sky/kloofendal_48d_partly_cloudy_puresky_sky_8k.ktx2', bytes: 8_348_821, sha256: 'e42d5a580da3406a8fb365c284cbc1583e06cedef10188242d291177706f4e1e' },
      ],
    },
    dusk: {
      inputSha256: {
        'qwantani_sunset_puresky_4k.hdr': '10ac5a0327925511e17fb0b6d903899265ffbb2b4a5ebdc9c66abec38778eddb',
        'qwantani_sunset_puresky_8k.hdr': '4b3939973ff5fafcda49b1bd10665451f5d96fade3ccd774648e58903bc029fb',
      },
      files: [
        { width: 4096, url: 'environments/sky/qwantani_sunset_puresky_sky_4k.ktx2', bytes: 1_606_909, sha256: '8be2d1d262aabc5f2070909cc901577cb32bd19a4bc5d5a4ca8169cbc6154690' },
        { width: 8192, url: 'environments/sky/qwantani_sunset_puresky_sky_8k.ktx2', bytes: 5_701_291, sha256: '57cc3647bc6eda300a0200e9b2ed3d25ee6d5364ea6d1e5292fd9c6f3812cc65' },
      ],
    },
    rain: {
      inputSha256: {
        'belfast_sunset_puresky_4k.hdr': 'cafc52b99ce15d84bd039826a0333f5ab0259d8c1f4feb2f7faf5fafa039108a',
        'belfast_sunset_puresky_8k.hdr': 'f2610ff3ed21171063bc7be641deb4608b05e44d4da357634966a4febc94bb65',
      },
      files: [
        { width: 4096, url: 'environments/sky/belfast_sunset_puresky_sky_4k.ktx2', bytes: 1_862_679, sha256: '63a423460ae738419c015f1fc6b72b3a3e45b8347db65273d7d35f80fbf10cbc' },
        { width: 8192, url: 'environments/sky/belfast_sunset_puresky_sky_8k.ktx2', bytes: 6_286_099, sha256: '49aaa95d5cee3e526ab948f73a272db6c1eb87c5573454d1f7cd4ebe02f21832' },
      ],
    },
    fog: {
      inputSha256: {
        'kloofendal_overcast_puresky_4k.hdr': '77ade807bd208195073a51b970dea574fa70cd80cf666aeedf5cd416ab5c8abd',
        'kloofendal_overcast_puresky_8k.hdr': '489b1552b02e8a15a39278476049ce82421f985064b4a888fa8d1fd49a5c7e77',
      },
      files: [
        { width: 4096, url: 'environments/sky/kloofendal_overcast_puresky_sky_4k.ktx2', bytes: 1_759_681, sha256: '1a52c950d7721bf759355ca89fd4b8b6ffcf3d3ea60b3e0ef9a3021588c9287e' },
        { width: 8192, url: 'environments/sky/kloofendal_overcast_puresky_sky_8k.ktx2', bytes: 6_073_131, sha256: '9b6ae531e5272c8ea5da5f82d2ee460b8796377f98a75006909956046536c2f1' },
      ],
    },
  } satisfies Record<CoastEnvName, { inputSha256: Record<string, string>; files: SkyFile[] }>,
};
