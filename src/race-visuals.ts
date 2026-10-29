import type { Color } from 'three';
import type { VisualPreset } from './race-session.ts';

interface Targets {
  scene: { background: Color; fog: { color: Color; density: number } };
  sky: Record<'top' | 'horizon' | 'cloudTint', { value: Color }> & Record<'cloudOpacity' | 'warmth' | 'aurora', { value: number }>;
  renderer: { toneMappingExposure: number };
}
interface Atmosphere { background: Color | string; fog: Color | string; density: number; exposure: number }
const STYLES = {
  day: { background: '#94b7c9', fog: '#a3bdc8', density: .001, exposure: 1.12, top: '#458bab', horizon: '#d9e8e9', cloudTint: '#82989a', cloudOpacity: .45, warmth: .2 },
  dusk: { background: '#ec9478', fog: '#bb7f89', density: .001, exposure: 1.15, top: '#27284a', horizon: '#ec9478', cloudTint: '#7e667d', cloudOpacity: .45, warmth: .7 },
  night: { background: '#1b2e5a', fog: '#304b73', density: .0016, exposure: .72, top: '#050b25', horizon: '#304b73', cloudTint: '#394354', cloudOpacity: .2, warmth: 0 },
  rain: { background: '#536879', fog: '#697d8a', density: .0024, exposure: .93, top: '#253b50', horizon: '#697d8a', cloudTint: '#536879', cloudOpacity: 1, warmth: 0 },
  fog: { background: '#8297a4', fog: '#8297a4', density: .004, exposure: 1.02, top: '#647e8c', horizon: '#8297a4', cloudTint: '#8297a4', cloudOpacity: .7, warmth: 0 },
  snow: { background: '#c3d0d9', fog: '#d3dde4', density: .0026, exposure: 1.04, top: '#7d95aa', horizon: '#e1e8ec', cloudTint: '#b7c4cd', cloudOpacity: .9, warmth: 0 },
  aurora: { background: '#0b1630', fog: '#16294a', density: .0014, exposure: .78, top: '#040a20', horizon: '#1c3555', cloudTint: '#2b3a52', cloudOpacity: .15, warmth: 0, aurora: 1 },
} as const;

// 11B Aurora Pass: two authored blizzard stretches (opt-in themed races only). Visual-only: the haze
// thickens over 150 m ramps inside each stretch so visibility never jumps; grip and physics are unchanged.
/** Weather particles drawn this frame: weak hardware and touch devices take a third of the transparent overlay. */
export const weatherDrops = (quality: string, touch: boolean): number => touch || quality === 'low' ? 60 : 180;
export const AURORA_BLIZZARDS = Object.freeze([{ from: 2000, to: 2500 }, { from: 3700, to: 4150 }]);
const BLIZZARD_RAMP = 150, BLIZZARD_HAZE = 1.6;
export function blizzardLevel(trackId: string, distance: number, themed: boolean): number {
  if (!themed || trackId !== 'aurora') return 0;
  let level = 0;
  for (const { from, to } of AURORA_BLIZZARDS)
    level = Math.max(level, Math.min(1, (distance - from) / BLIZZARD_RAMP, (to - distance) / BLIZZARD_RAMP));
  return Math.max(0, level);
}

export function createRaceVisuals({ scene, sky, renderer }: Targets) {
  let preset: VisualPreset = 'track';
  let photoDefaults: Atmosphere | null = null;
  let fogBase: number | null = null, blizzardNow = 0; // haze before the blizzard factor; reset with the atmosphere
  let defaults: {
    background: Color; fog: Color; density: number; exposure: number;
    top: Color; horizon: Color; cloudTint: Color; cloudOpacity: number; warmth: number; aurora: number;
  } | null = null;
  const captureAtmosphere = () => ({ background: scene.background.clone(), fog: scene.fog.color.clone(),
    density: fogBase ?? scene.fog.density, exposure: renderer.toneMappingExposure }); // the clear haze: a live blizzard is re-applied on top
  function setAtmosphere(style: Atmosphere): void {
    scene.background.set(style.background); scene.fog.color.set(style.fog);
    scene.fog.density = style.density; renderer.toneMappingExposure = style.exposure;
    fogBase = style.density; blizzardNow = 0;
  }
  function apply(next: VisualPreset): void {
    if (next === preset) return;
    defaults ??= {
      ...captureAtmosphere(), top: sky.top.value.clone(), horizon: sky.horizon.value.clone(),
      cloudTint: sky.cloudTint.value.clone(), cloudOpacity: sky.cloudOpacity.value, warmth: sky.warmth.value, aurora: sky.aurora.value,
    };
    const style = next === 'track' ? defaults : STYLES[next];
    setAtmosphere(style);
    sky.top.value.set(style.top); sky.horizon.value.set(style.horizon); sky.cloudTint.value.set(style.cloudTint);
    sky.cloudOpacity.value = style.cloudOpacity; sky.warmth.value = style.warmth; sky.aurora.value = 'aurora' in style ? style.aurora : 0;
    preset = next;
  }
  function photo(style: string | null): void {
    if (style === null) {
      if (photoDefaults) setAtmosphere(photoDefaults);
      photoDefaults = null;
      return;
    }
    photoDefaults ??= captureAtmosphere();
    setAtmosphere(style === 'sunset' ? STYLES.dusk : style === 'night' || style === 'fog' ? STYLES[style] : photoDefaults);
  }
  function blizzard(level: number): void {
    if (level === blizzardNow) return;
    fogBase ??= scene.fog.density;
    scene.fog.density = fogBase * (1 + BLIZZARD_HAZE * level);
    blizzardNow = level;
  }
  return { apply, photo, blizzard, reset: () => { blizzard(0); photo(null); apply('track'); defaults = null; fogBase = null; } };
}
