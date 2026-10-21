// Visual controls only: none of these values are consumed by the race simulation.
// Index 0 is the English label; the UI translates it through the `vfx.<key>` catalog entry (vfxLabelKey).
export const vfxLabelKey = key => `vfx.${key}`;
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
};
export const VFX_PRESETS = {
  realistic: { coreBrightness: 0.8, exhaustLength: 3, vaporDensity: 0.4, machDiamonds: 0.2, shockwave: 0.12, afterimages: 0, speedLines: 0.15, motionBlur: 0, fov: 3, shake: 0, bloom: 0.2 },
  cinematic: Object.fromEntries(Object.entries(VFX_RANGES).map(([key, range]) => [key, range[4]])),
  extreme: { coreBrightness: 2.4, exhaustLength: 7, vaporDensity: 0.9, machDiamonds: 0.85, shockwave: 0.85, afterimages: 7, speedLines: 0.8, motionBlur: 0.5, fov: 11, shake: 0.3, bloom: 0.9 },
};
export function vfxSettings(values = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) values = {};
  const result = { enabled: values.enabled !== false, airflow: values.airflow === true,
    preset: Object.hasOwn(VFX_PRESETS, values.preset) ? values.preset : 'cinematic',
    quality: ['low', 'medium', 'high'].includes(values.quality) ? values.quality : 'high',
    aeroMode: values.aeroMode === 'downforce' ? 'downforce' : 'drag',
    view: ['drive', 'front', 'rear', 'left', 'right', 'orbit'].includes(values.view) ? values.view : 'drive',
    comfortable: values.comfortable === true, haptics: values.haptics === true };
  for (const [key, [, min, max, step, fallback]] of Object.entries(VFX_RANGES)) {
    const value = typeof values[key] === 'number' && Number.isFinite(values[key]) ? values[key] : VFX_PRESETS[result.preset][key] ?? fallback;
    result[key] = Math.min(max, Math.max(min, step === 1 ? Math.round(value) : value));
  }
  return result;
}
