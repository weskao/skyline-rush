// Visual controls only: none of these values are consumed by the race simulation.
// Index 0 is the English label; the UI translates it through the `vfx.<key>` catalog entry (vfxLabelKey).
export const vfxLabelKey = (key: string): string => `vfx.${key}`;
export const SHOWCASE_VIEWS = Object.freeze(['drive','front','rear','left','right','orbit'] as const);
export const VFX_RANGES = {
  airflowDensity: ['Airflow density', 0, 1, 0.05, 0.75],
  airflowSpeed: ['Airflow speed', 0.2, 3, 0.1, 1],
  streamlineLength: ['Streamline length', 0.1, 1, 0.05, 0.45],
  airflowOpacity: ['Airflow opacity', 0, 1, 0.05, 0.55],
  turbulence: ['Turbulence strength', 0, 2, 0.1, 0.6],
  suction: ['Underbody suction', 0, 2, 0.1, 1],
  coreBrightness: ['Thruster core brightness', 0, 3, 0.1, 1.5],
  exhaustLength: ['Thruster exhaust length', 1, 10, 0.5, 4],
  vaporDensity: ['Vapor density', 0, 1, 0.05, 0.65],
  machDiamonds: ['Mach diamond visibility', 0, 1, 0.05, 0.55],
  shockwave: ['Shockwave intensity', 0, 1, 0.05, 0.5],
  trailLength: ['Nitro trail length (m)', 4, 60, 1, 32],
  afterimages: ['Nitro afterimages', 0, 8, 1, 4],
  speedLines: ['Speed line density', 0, 1, 0.05, 0.45],
  motionBlur: ['Motion blur strength', 0, 1, 0.05, 0.25],
  fov: ['Camera FOV offset', 0, 14, 1, 7],
  shake: ['Camera shake', 0, 1, 0.05, 0.15],
  bloom: ['Bloom intensity', 0, 1.5, 0.05, 0.55],
} as const satisfies Record<string, readonly [string, number, number, number, number]>;
export type VfxRangeKey = keyof typeof VFX_RANGES;
export type ShowcaseView = (typeof SHOWCASE_VIEWS)[number];
export type VfxPreset = 'realistic' | 'cinematic' | 'extreme';
export type VfxQuality = 'low' | 'medium' | 'high';
export type VfxSettings = {
  enabled: boolean; airflow: boolean; preset: VfxPreset; quality: VfxQuality;
  aeroMode: 'drag' | 'downforce'; view: ShowcaseView; comfortable: boolean; haptics: boolean;
} & Record<VfxRangeKey, number>;
export const VFX_PRESETS: Record<VfxPreset, Partial<Record<VfxRangeKey, number>>> = {
  realistic: { coreBrightness: 0.8, exhaustLength: 3, vaporDensity: 0.4, machDiamonds: 0.2, shockwave: 0.12, afterimages: 0, speedLines: 0.15, motionBlur: 0, fov: 3, shake: 0, bloom: 0.2 },
  cinematic: Object.fromEntries(Object.entries(VFX_RANGES).map(([key, range]) => [key, range[4]])),
  extreme: { coreBrightness: 2.4, exhaustLength: 7, vaporDensity: 0.9, machDiamonds: 0.85, shockwave: 0.85, afterimages: 7, speedLines: 0.8, motionBlur: 0.5, fov: 11, shake: 0.3, bloom: 0.9 },
};
export function vfxSettings(values: unknown = {}): VfxSettings {
  const input: Record<string, unknown> = values && typeof values === 'object' && !Array.isArray(values)
    ? values as Record<string, unknown> : {};
  const preset: VfxPreset = typeof input.preset === 'string' && Object.hasOwn(VFX_PRESETS, input.preset)
    ? input.preset as VfxPreset : 'cinematic';
  const quality: VfxQuality = input.quality === 'low' || input.quality === 'medium' || input.quality === 'high'
    ? input.quality : 'high';
  const view: ShowcaseView = SHOWCASE_VIEWS.find(candidate => candidate === input.view) ?? 'drive';
  const base = {
    enabled: input.enabled !== false, airflow: input.airflow === true, preset, quality,
    aeroMode: input.aeroMode === 'downforce' ? 'downforce' as const : 'drag' as const,
    view, comfortable: input.comfortable === true, haptics: input.haptics === true,
  };
  const ranges = Object.fromEntries((Object.keys(VFX_RANGES) as VfxRangeKey[]).map(key => {
    const [, min, max, step, fallback] = VFX_RANGES[key];
    const supplied = input[key];
    const value = typeof supplied === 'number' && Number.isFinite(supplied)
      ? supplied : VFX_PRESETS[preset][key] ?? fallback;
    return [key, Math.min(max, Math.max(min, step === 1 ? Math.round(value) : value))];
  }));
  return { ...base, ...ranges } as VfxSettings;
}
