import { sprintCue } from './sprint-tier.ts';
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
  shake: ['Camera shake', 0, 1, 0.05, 0.2],
  bloom: ['Bloom intensity', 0, 1.5, 0.05, 0.55],
} as const satisfies Record<string, readonly [string, number, number, number, number]>;
export type VfxRangeKey = keyof typeof VFX_RANGES;
export type ShowcaseView = (typeof SHOWCASE_VIEWS)[number];
export type VfxPreset = 'realistic' | 'cinematic' | 'extreme';
export type VfxQuality = 'low' | 'medium' | 'high';
/** Saved/selectable tier: Ultra renders as 'high' for scene density tables, plus the `ultra` flag for Ultra-only effects. */
export type QualityTier = VfxQuality | 'ultra';
export type VfxSettings = {
  enabled: boolean; airflow: boolean; preset: VfxPreset; quality: VfxQuality; ultra: boolean;
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
  // Saved form is {quality:'high', ultra:true}; a raw 'ultra' choice from the settings control maps to the same.
  const ultra = input.quality === 'ultra' || (input.quality === 'high' && input.ultra === true);
  const view: ShowcaseView = SHOWCASE_VIEWS.find(candidate => candidate === input.view) ?? 'drive';
  const base = {
    enabled: input.enabled !== false, airflow: input.airflow === true, preset, quality, ultra,
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
  enabled: boolean; quality: VfxQuality; reducedMotion: boolean; ultra?: boolean;
  chain?: number; // charges spent in the running NITRO burst (car.nitroBurst)
};
// NITRO ×1/×2/×3 scale the sprint frame: longer flames, denser speed lines, wider FOV. Presentation only.
export const NITRO_CHAIN_LIFT: readonly number[] = [1, 1.2, 1.4];
type SprintChannel = { phase: SprintPhase; intensity: number; ignition: number; age: number; release: number };
const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback;
const unit = (value: number): number => Math.max(0, Math.min(1, finite(value)));
const channel = (): SprintChannel => ({ phase: 'ready', intensity: 0, ignition: 0, age: 0, release: 0 });

export function createSprintVfx() {
  const nitro = channel(), boost = channel();
  /** `fov`: eased sprint share for the camera (FOV, dolly, rumble). `lines`: speed-line density and travel speed. `kick`: seconds since the last fresh ignition. `punch`: its 0–1 surge.
   * `squat`: the car's 0–1 nose lift on that ignition, peaking before the punch so the camera follows late. */
  const frame = { nitro, boost, power: 0, lightPower: 0, fov: 0, blur: 0, lines: 0, particles: 0, nitroMix: 0, kick: 1, punch: 0, squat: 0 };
  let lift = 1;
  const clear = (part: SprintChannel): void => {
    part.phase = 'ready'; part.intensity = part.ignition = part.age = part.release = 0;
  };
  const reset = (): typeof frame => {
    clear(nitro); clear(boost);
    frame.power = frame.lightPower = frame.fov = frame.blur = frame.lines = frame.particles = frame.nitroMix = frame.punch = frame.squat = 0; frame.kick = 1;
    lift = 1;
    return frame;
  };
  const advance = (part: SprintChannel, active: boolean, dt: number, speedScale: number): void => {
    if (active && part.phase === 'ready') frame.kick = 0; // a flicker re-ignites from 'recovery' and must not kick again
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
    /** The last frame: world.js poses the car before this frame's update. */
    frame,
    update(input: SprintInput): typeof frame {
      // A paused game must not consume an ignition window or advance a fade.
      if (input.phase === 'paused') return frame;
      if (input.phase !== 'racing' || !input.enabled) return reset();
      const dt = Math.max(0, Math.min(0.1, finite(input.dt)));
      const cap = Math.max(40, finite(input.cap, 110));
      const speed = Math.max(0, finite(input.speed));
      const speedScale = unit((speed - 12) / (cap - 12));
      frame.kick = Math.min(1, frame.kick + dt);
      advance(nitro, !!input.nitro, dt, speedScale);
      advance(boost, !!input.boost, dt, speedScale);
      // Every strength comes from the ladder (sprint-tier.ts); the light share never passes one.
      frame.power = frame.lightPower = unit(sprintCue(nitro.intensity, boost.intensity, 'share'));
      frame.nitroMix = nitro.intensity > 0 ? unit(nitro.intensity / Math.max(0.01, frame.power)) : 0;
      // Only a chained NITRO goes past one; eased so a new charge swells and the end of NITRO settles back.
      const level = Math.min(3, Math.max(1, Math.round(finite(input.chain ?? 1, 1))));
      lift += ((input.nitro ? NITRO_CHAIN_LIFT[level - 1]! : 1) - lift) * Math.min(1, dt * 8);
      const chained = 1 + (lift - 1) * frame.nitroMix;
      frame.power *= chained;
      frame.lines = sprintCue(nitro.intensity, boost.intensity, 'lines') * chained;
      const tier = input.quality === 'high' ? 1 : input.quality === 'medium' ? 0.65 : 0.3;
      const comfort = input.reducedMotion;
      frame.particles = frame.power * (comfort ? 0.2 : tier);
      // FOV is camera framing, not GPU cost: one strength on every tier (pre-Wave 2 behaviour).
      // Ramped over 0.3 s instead of jumping with the ignition; the camera's own smoothing rounds both ends.
      const target = comfort ? 0 : frame.power, step = dt / 0.3;
      frame.fov = comfort || Math.abs(target - frame.fov) <= step ? target : frame.fov + Math.sign(target - frame.fov) * step;
      // Capped at a x3 NITRO punch: race-camera.test.js checks the portrait HUD and the dolly up to there.
      frame.punch = comfort ? 0 : Math.min(NITRO_CHAIN_LIFT.at(-1)!, sprintCue(nitro.intensity, boost.intensity, 'punch') * chained) * sprintPunch(frame.kick);
      frame.squat = comfort ? 0 : speedScale * sprintPunch(frame.kick * SQUAT_LEAD); // NITRO and BOOST squat alike
      frame.blur = comfort ? 0 : Math.min(1, (sprintCue(nitro.intensity, boost.intensity, 'blur') * chained + 0.5 * frame.punch) * tier * (input.ultra ? 0.96 : 0.6)); // Ultra: stronger lens radial blur, same pass
      return frame;
    },
  };
}

/** Ignition punch envelope `age` seconds after a fresh NITRO/BOOST: eased in over 0.2 s, gone at 0.8 s. */
const PUNCH_IN = 0.2, PUNCH_TIME = 0.8, PUNCH_FOV = 0.8;
/** The squat runs the punch envelope this much faster: peak at 0.12 s, settled at 0.48 s. */
const SQUAT_LEAD = 5 / 3;
export function sprintPunch(age: number): number {
  if (!(age >= 0 && age < PUNCH_TIME)) return 0;
  if (age < PUNCH_IN) { const x = age / PUNCH_IN; return x * x * (3 - 2 * x); }
  return (1 - (age - PUNCH_IN) / (PUNCH_TIME - PUNCH_IN)) ** 2;
}

/** Degrees the sprint widens the chase camera: sprint strength plus the ignition punch × the player's FOV setting, 0 with VFX off. */
export function sprintFovOffset(frame: { fov: number; punch?: number }, visual: { enabled: boolean; fov: number }): number {
  return visual.enabled ? (frame.fov + PUNCH_FOV * (frame.punch ?? 0)) * visual.fov : 0;
}

/** NITRO adds a bounded halo from the unchained intensity. BOOST retains its own lighting. */
export function sprintBloomBoost(frame: { nitroMix: number; lightPower: number }, bloom: number, ignition: number): number {
  const boost = bloom * (frame.lightPower * .25 + ignition * .2);
  const nitro = Math.min(.055, bloom * (frame.lightPower * .09 + ignition * .035));
  return boost + (nitro - boost) * frame.nitroMix;
}
