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


// Wave 2: presentation-only sprint state. No gameplay/physics values are ever mutated.
// Each frame and both channel objects are reused: no reactive or GPU allocations in the hot path.
export type SprintPhase = 'ready' | 'ignition' | 'sustain' | 'recovery';
export type SprintInput = {
  phase: string; nitro: boolean; boost: boolean; speed: number; cap: number; dt: number;
  enabled: boolean; quality: VfxQuality; reducedMotion: boolean;
};
type SprintChannel = { phase: SprintPhase; intensity: number; ignition: number; age: number; release: number };
const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback;
const unit = (value: number): number => Math.max(0, Math.min(1, finite(value)));
const channel = (): SprintChannel => ({ phase: 'ready', intensity: 0, ignition: 0, age: 0, release: 0 });

export function createSprintVfx() {
  const nitro = channel(), boost = channel();
  const frame = { nitro, boost, power: 0, fov: 0, blur: 0, particles: 0, nitroMix: 0 };
  const clear = (part: SprintChannel): void => {
    part.phase = 'ready'; part.intensity = part.ignition = part.age = part.release = 0;
  };
  const reset = (): typeof frame => {
    clear(nitro); clear(boost);
    frame.power = frame.fov = frame.blur = frame.particles = frame.nitroMix = 0;
    return frame;
  };
  const advance = (part: SprintChannel, active: boolean, dt: number, speedScale: number): void => {
    if (active && (part.phase === 'ready' || part.phase === 'recovery')) {
      part.phase = 'ignition'; part.age = 0;
    } else if (!active && (part.phase === 'sustain' || part.phase === 'ignition')) {
      part.phase = 'recovery'; part.age = 0; part.release = part.intensity;
    } else part.age += dt;
    if (part.phase === 'ignition') {
      if (part.age >= 0.18) part.phase = 'sustain';
      part.ignition = Math.max(0, 1 - part.age / 0.18);
      part.intensity = speedScale * (0.65 + 0.35 * (1 - part.ignition));
    } else if (part.phase === 'sustain') {
      part.ignition = 0;
      part.intensity = speedScale;
    } else if (part.phase === 'recovery') {
      if (part.age >= 0.45) { clear(part); return; }
      part.intensity = part.release * (1 - part.age / 0.45) ** 2;
      part.ignition = 0;
    } else part.intensity = part.ignition = 0;
    part.intensity = unit(part.intensity);
  };
  return {
    reset,
    update(input: SprintInput): typeof frame {
      // A paused game must not consume an ignition window or advance a fade.
      if (input.phase === 'paused') return frame;
      if (input.phase !== 'racing' || !input.enabled) return reset();
      const dt = Math.max(0, Math.min(0.1, finite(input.dt)));
      const cap = Math.max(40, finite(input.cap, 110));
      const speed = Math.max(0, finite(input.speed));
      const speedScale = unit((speed - 12) / (cap - 12));
      advance(nitro, !!input.nitro, dt, speedScale);
      advance(boost, !!input.boost, dt, speedScale);
      // Independent channels never add; simultaneous activation is capped at one.
      frame.power = unit(Math.max(nitro.intensity, boost.intensity * 0.8));
      frame.nitroMix = nitro.intensity > 0 ? unit(nitro.intensity / Math.max(0.01, frame.power)) : 0;
      const tier = input.quality === 'high' ? 1 : input.quality === 'medium' ? 0.65 : 0.3;
      const comfort = input.reducedMotion;
      frame.particles = frame.power * (comfort ? 0.2 : tier);
      frame.fov = comfort ? 0 : Math.min(5, frame.power * tier * 4.5);
      frame.blur = comfort ? 0 : Math.min(1, frame.power * tier * 0.6);
      return frame;
    },
  };
}
