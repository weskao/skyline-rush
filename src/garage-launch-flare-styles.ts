import type { SkinId } from './garage-skin-catalog.ts';

// Each premium launch flare re-draws its 3x badge (public/feature-assets/garage-vfx-skins/raster/flare-*@3x.webp)
// as a live burst behind the car plus a sweep of light over the body. Colours are HDR so bloom carries the glow.
export const FLARE_SHAPES = ['starburst', 'ring', 'streak', 'fan'] as const;
type Rgb = readonly [number, number, number];
export interface LaunchFlareStyle {
  readonly shape: (typeof FLARE_SHAPES)[number];
  readonly primary: Rgb; // ray / ring colour; also tints the ignition shockwave
  readonly secondary: Rgb; // hot core, inner ring or fringe
  readonly rays: number; // spikes around the full circle
  readonly swirl: number; // vortex twist of the rays
  readonly pulse: number; // repeated throbs and travelling rings
  readonly corona: number; // flickering flame ring around the core
  readonly core: number; // white-hot centre size
  readonly size: number; // burst radius in metres
}
const style = (shape: LaunchFlareStyle['shape'], primary: Rgb, secondary: Rgb, extra: Partial<LaunchFlareStyle> = {}): LaunchFlareStyle =>
  ({ shape, primary, secondary, rays: 14, swirl: 0, pulse: 0, corona: 0, core: 1, size: 2.6, ...extra });

export const LAUNCH_FLARE_STYLES: Partial<Record<SkinId, LaunchFlareStyle>> = {
  'launch-flare-blue': style('starburst', [0.35, 0.75, 1.65], [0.8, 0.92, 1.7], { rays: 16 }),
  'launch-flare-ring': style('ring', [1.55, 0.3, 1.45], [0.3, 0.5, 1.75], { rays: 0, size: 2.9 }),
  'launch-flare-pulse': style('starburst', [0.9, 0.35, 1.75], [1.3, 0.95, 1.8], { rays: 18, pulse: 1 }),
  'launch-flare-gold': style('starburst', [1.8, 1.05, 0.25], [1.85, 1.5, 0.75], { rays: 20, corona: 1, core: 1.3 }),
  'launch-flare-red': style('streak', [1.75, 0.16, 0.12], [1.85, 0.9, 0.7], { rays: 18 }),
  'launch-flare-cyan': style('fan', [0.22, 1.4, 1.8], [0.85, 1.65, 1.85], { rays: 11, size: 3 }),
  'launch-flare-magenta': style('fan', [1.7, 0.22, 1.4], [1.8, 0.85, 1.7], { rays: 13, swirl: 0.45, size: 3 }),
  'launch-flare-white': style('fan', [1.8, 1.82, 1.9], [0.62, 0.74, 1.55], { rays: 12, core: 2.2, size: 3.3 }),
};
