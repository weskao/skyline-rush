import type { MeshStandardMaterial } from 'three';
import { COAST_PALETTE } from './coast-visuals.ts';
import { WORLD_THEMES } from './world-tour-scene.js';

export const TRACK_PALETTES = {
  coast: COAST_PALETTE,
  neon: { top: '#040a20', horizon: '#263057', fog: '#18223f', rock: '#182039', road: '#101c2e', ground: '#080e21', rail: '#ff52bf', sun: '#96b7ff', warmth: 0 },
  canyon: { top: '#458bab', horizon: '#f5c58c', fog: '#c99c79', rock: '#a15339', road: '#51453b', ground: '#a76e46', rail: '#ffc36f', sun: '#ffdfaa', warmth: .6 },
  aurora: { top: '#051b31', horizon: '#337064', fog: '#234d5b', rock: '#9cb9c7', road: '#293d50', ground: '#b3cad3', rail: '#78ffd1', sun: '#b9ddff', warmth: 0 },
  spiral: { top: '#050b25', horizon: '#55348c', fog: '#302657', rock: '#29345b', road: '#111827', ground: '#161d49', rail: '#00e5ff', sun: '#a855f7', warmth: 0 },
  ...WORLD_THEMES,
};

/** Keep every legacy track's material values isolated across course switching. */
export function applyTrackSurfaceStyle(trackId: string, road: MeshStandardMaterial,
  buildings: MeshStandardMaterial, roadColor: string): void {
  road.color.set(roadColor);
  // Neon remains rain-slick, while Canyon/Aurora stay physically matte.
  // Retain Phase 2 Coast values and leave the five World Tour tiers unchanged.
  road.roughness = trackId === 'neon' ? .4 : trackId === 'coast' ? .91
    : trackId === 'canyon' ? .86 : trackId === 'aurora' ? .74 : .5;
  road.metalness = trackId === 'neon' ? .08 : trackId === 'coast' ? .025
    : trackId === 'canyon' ? .025 : trackId === 'aurora' ? .035 : .3;
  buildings.roughness = trackId === 'coast' ? .84 : trackId === 'neon' ? .46
    : trackId === 'canyon' ? .92 : trackId === 'aurora' ? .82 : .38;
  buildings.metalness = trackId === 'coast' ? .055 : trackId === 'neon' ? .24
    : trackId === 'canyon' ? .025 : trackId === 'aurora' ? .04 : .5;
}
