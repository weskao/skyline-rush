import type { SkinId } from './garage-skin-catalog.ts';

// Each premium launch flare re-draws its 3x badge (public/feature-assets/garage-vfx-skins/raster/flare-*@3x.webp)
// as a live burst behind the car plus a sweep of light over the body. The emission budget keeps each silhouette readable on dark tracks.
export const FLARE_SHAPES = ['starburst', 'ring', 'streak', 'fan'] as const;
type Rgb = readonly [number, number, number];
export interface LaunchFlareStyle {
  readonly shape: (typeof FLARE_SHAPES)[number];
  readonly primary: Rgb; // ray / ring colour; also tints the ignition shockwave
  readonly secondary: Rgb; // hot core, inner ring or fringe
  readonly rays: number; // spikes around the full circle
  readonly swirl: number; // vortex twist of the rays
  readonly pulse: number; // a secondary travelling ring
  readonly corona: number; // flame texture around the core
  readonly core: number; // white-hot centre size
  readonly intensity: number; // additive emission budget
  readonly size: number; // burst radius in metres
}
const style = (shape: LaunchFlareStyle['shape'], primary: Rgb, secondary: Rgb, extra: Partial<LaunchFlareStyle> = {}): LaunchFlareStyle =>
  ({ shape, primary, secondary, rays: 14, swirl: 0, pulse: 0, corona: 0, core: .65, size: 2.45, intensity: .76, ...extra });

export const LAUNCH_FLARE_STYLES: Partial<Record<SkinId, LaunchFlareStyle>> = {
  'launch-flare-blue': style('starburst', [0.35, 0.75, 1.65], [0.8, 0.92, 1.7], { rays: 16 }),
  'launch-flare-ring': style('ring', [1.55, 0.3, 1.45], [0.3, 0.5, 1.75], { rays: 0, size: 2.6 }),
  'launch-flare-pulse': style('starburst', [0.9, 0.35, 1.75], [1.3, 0.95, 1.8], { rays: 18, pulse: 1 }),
  'launch-flare-gold': style('starburst', [1.8, 1.05, 0.25], [1.85, 1.5, 0.75], { rays: 20, corona: 1, core: .78, intensity: .65 }),
  'launch-flare-red': style('streak', [1.40, 0.34, 0.31], [1.55, 0.76, 0.62], { rays: 18, intensity: .66 }),
  'launch-flare-cyan': style('fan', [0.22, 1.4, 1.8], [0.85, 1.65, 1.85], { rays: 11, size: 2.55 }),
  'launch-flare-magenta': style('fan', [1.7, 0.22, 1.4], [1.8, 0.85, 1.7], { rays: 13, swirl: 0.45, size: 2.55 }),
  'launch-flare-white': style('fan', [1.00, 1.04, 1.13], [0.46, 0.60, 0.94], { rays: 12, core: .94, size: 2.5, intensity: .52 }),
};
