// Task 8c: the Sky Spiral detailed look on Medium and above. The helix course draws its own scene (sky-scene.js), so
// two shared hooks never reached it: world.js hides the shared sky mesh the HDRI dome hangs under, and the classic
// road mesh that wears the KTX2 road set. This is their target on the course: the dome hangs under the course's group
// in place of its procedural backdrop, the ribbon wears the look's `helix` set (coast-assets.ts loads it), and clear
// day air replaces the violet haze. Lighting, exposure and bloom come from coast-look.ts through the look entry.
// The landmark kit (spiral-scenery.ts) is shown on every preset of Medium and above, as the road set is. Under the day
// sky on High and Ultra the cloud sea and its wisps (spiral-clouds.ts) stand in for the kit's cloud mounds.
import { Color, DoubleSide, type FogExp2, type Material, type Object3D, type Scene } from 'three';
import { createSpiralClouds, type SpiralClouds } from './spiral-clouds.ts';
import { coastEnvPlan } from './coast-lighting.ts';
import { createSpiralKit, type SpiralKit, type SpiralKitHost } from './spiral-scenery.ts';
import { TRACK_PALETTES } from './track-palettes.ts';
import type { VfxQuality } from './vfx-settings.ts';

const TRACK = 'spiral';
/** Clear air above the clouds: the `day` preset's colours (race-visuals.ts) at under half its density, so the tower
 *  shows from the start of the approach (fog 0.50 at 1,850 m; 0.97 at the preset's 0.001). No other haze uses this
 *  density, which is how the look tells its own haze from a preset's or a photo style's. */
export const SPIRAL_DAY = Object.freeze({ background: '#94b7c9', fog: '#a3bdc8', density: .00045 });

/** The course's own pieces (sky-scene.js `parts`). */
export interface SpiralParts extends SpiralKitHost {
  group: Object3D; road: Object3D & { material: Material | Material[] }; backdrop: { visible: boolean };
  /** Called by the course each frame it is drawn, after it has moved its road: the kit's streaming while shown. */
  stream?: SpiralKit['stream'];
}
interface Deps {
  parts: SpiralParts;
  /** The HDRI dome (coast-sky.ts) and the shared sky mesh it hangs under on every other track. */
  dome: Parameters<typeof createSpiralClouds>[0]['dome']; home: { add(child: Object3D): unknown };
  scene: Pick<Scene, 'background' | 'fog'>;
  /** The shared scene clock (the sea's `time` uniform): world.js stops it under Reduced Motion. */
  clock: { value: number };
}

export function createSpiralLook({ parts, dome, home, scene, clock }: Deps) {
  const procedural = parts.road.material, background = scene.background as Color, fog = scene.fog as FogExp2;
  const night = new Color(TRACK_PALETTES.spiral.fog), shared = fog.density; // what world.js sets on this track
  const dayBackground = new Color(SPIRAL_DAY.background), dayFog = new Color(SPIRAL_DAY.fog);
  let hung = false, kit: SpiralKit | null = null, dressed = false, clouds: SpiralClouds | null = null, billowed = false;
  const stream: SpiralKit['stream'] = (distance, endless) => { kit?.stream(distance, endless); if (billowed) clouds?.stream(distance, endless); };

  /** The dome under the course while it shows the course's sky; the backdrop only without it. */
  function hang(under: boolean): void {
    if (under === hung) return;
    (under ? parts.group : home).add(dome);
    parts.backdrop.visible = !under;
    hung = under;
  }
  function dress(on: boolean): void {
    if (on === dressed) return;
    kit?.show(dressed = on);
    parts.stream = on ? stream : undefined;
  }
  /** The cloud sea in place of the kit's mounds: created with the kit, so a course without it has neither. */
  function billow(on: boolean, ultra: boolean): void {
    clouds?.show(on, ultra);
    if (on !== billowed) kit?.clouds(!(billowed = on));
  }
  function strip(): void { billow(false, false); dress(false); clouds?.dispose(); kit?.dispose(); clouds = kit = null; }

  return {
    /** Per frame, after coast-sky.ts and race-visuals.ts: both write first, this corrects for the course. `kitted`:
     *  the look wants the landmark kit and it is in the scene. */
    update(trackId: string, preset: string, quality: VfxQuality, kitted = false, ultra = false): void {
      dress(kitted && !!kit);
      const mine = trackId === TRACK, day = mine && coastEnvPlan(trackId, preset, quality).kind === 'hdri';
      hang(day && dome.visible);
      billow(dressed && hung && quality === 'high', ultra);
      if (day) {
        // From the track's violet or the day preset's haze only: a photo style keeps its own.
        if (fog.density !== SPIRAL_DAY.density && (background.equals(night) || background.equals(dayBackground))) {
          background.copy(dayBackground); fog.color.copy(dayFog); fog.density = SPIRAL_DAY.density;
        }
      } else if (fog.density === SPIRAL_DAY.density) { // Low, or the next track: world.js sets colours on a track change, never the density
        fog.density = shared;
        if (mine) { background.copy(night); fog.color.copy(night); }
      }
    },
    /** Puts the caller's road material on the helix ribbon (the caller frees it); null brings the procedural one back. */
    pave(material: Material | null): void {
      // The deck is seen from below across the rising helix, as the procedural road is. A set of its own: never shared.
      if (material) { material.side = DoubleSide; material.name = 'spiral_asphalt'; }
      parts.road.material = material ?? procedural;
    },
    /** The landmark kit joins the course hidden (its programs get the warmup); `update` shows it. Throws on a kit
     *  without one of its nodes, and the caller keeps the procedural scene. */
    attachKit(source: Object3D): void {
      kit = createSpiralKit(source, parts);
      clouds = createSpiralClouds({ group: parts.group, road: parts.road, dome, clock });
    },
    detachKit: strip,
    dispose(): void {
      strip();
      hang(false);
      parts.road.material = procedural;
    },
  };
}
export type SpiralLook = ReturnType<typeof createSpiralLook>;
