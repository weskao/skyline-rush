// Optional downloadable visuals, not an offline copy of the game. Each track's release version is independent.
import { RACE_TRACKS } from './race-tracks.ts';
import { trackLook } from './track-look.ts';
import { coastEnvPlan, COAST_ENV_VARIANTS } from './coast-lighting.ts';
import { COAST_SKY_MANIFEST } from './coast-sky-manifest.ts';
import { COAST_SEA_MANIFEST } from './coast-sea-manifest.ts';
import { MATERIAL_MANIFEST, TIERS } from './material-manifest.ts';
import { MODEL_MANIFEST } from './model-manifest.ts';
import type { TrackAssetPack, TrackPackAsset } from './track-pack-store.ts';

export const TRACK_PACK_VERSIONS: Readonly<Record<string, string>> = Object.freeze({
  coast: '1.0.0', neon: '1.0.0', canyon: '1.0.0', aurora: '1.0.0', spiral: '1.0.0',
  taipei: '1.0.0', tokyo: '1.0.0', alpine: '1.0.0', coastal: '1.0.0', cosmic: '1.0.0',
});

/** Every published playable card has a per-map version. Adding a new map requires registering its pack here. */
export function trackAssetPack(trackId: string, quality: 'low' | 'medium' | 'high', ultra = false, preset = 'track'): TrackAssetPack | null {
  if (!Object.hasOwn(TRACK_PACK_VERSIONS, trackId) || !Object.hasOwn(RACE_TRACKS, trackId)) return null;
  const version = TRACK_PACK_VERSIONS[trackId]!;
  const tier = ultra && quality === 'high' ? 'ultra' : quality;
  const entries = new Map<string, TrackPackAsset>();
  const add = (url: string, sha256 = '', bytes = 0): void => {
    if (url) entries.set(url, { url, sha256: /^[a-f0-9]{64}$/.test(sha256) && !/^0+$/.test(sha256) ? sha256 : '', bytes });
  };
  // Teaser is always available first. Low has no heavyweight detailed materials or models.
  add(`track-teasers/${trackId}.jpg`);
  if (quality !== 'low') {
    const look = trackLook(trackId);
    if (look) {
      for (const slot of ['scenery', 'boats', 'landmarks'] as const) {
        const id = look[slot];
        const model = id && MODEL_MANIFEST[id];
        if (model) add(model.url, model.glb.sha256, model.glb.bytes);
      }
      const resolution = quality === 'medium' ? TIERS.medium : tier === 'ultra' ? TIERS.ultra : TIERS.high;
      for (const slot of ['road', 'ground', 'helix'] as const) {
        const id = look[slot];
        const material = id && MATERIAL_MANIFEST[id];
        for (const file of material?.files ?? []) if (file.resolution === resolution) add(file.url, file.sha256, file.bytes);
      }
      // Include every advertised weather/lighting preset, so "downloaded" covers later weather changes.
      const variants = new Set(Object.keys(look.env).flatMap(name => {
        const plan = coastEnvPlan(trackId, name, quality);
        return plan.kind === 'hdri' ? [plan.variant] : [];
      }));
      for (const variant of variants) {
        const sky = COAST_ENV_VARIANTS[variant];
        add(`environments/${sky.file}`);
        const files = COAST_SKY_MANIFEST.skies[variant].files;
        for (const file of files) if (file.width === 4096 || tier === 'ultra') add(file.url, file.sha256, file.bytes);
      }
      if (variants.size) add(COAST_SEA_MANIFEST.url, COAST_SEA_MANIFEST.sha256, COAST_SEA_MANIFEST.bytes);
    }
  }
  const assets = [...entries.values()];
  const signature = JSON.stringify([trackId, version, tier, assets]);
  return { trackId, version, tier, preset, signature, assets };
}
