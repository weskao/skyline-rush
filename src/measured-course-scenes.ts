// Race scenery for the measured-route courses (Stormline, Volcanic, Monsoon): built on first use, one visible at a time.
import type * as THREE from 'three';
import { createStormlineRaceScene } from './stormline-megacity-race-scene.ts';
import { createVolcanicCrownRaceScene } from './volcanic-crown-race-scene.ts';
import { createMonsoonRuinsRaceScene } from './monsoon-ruins-race-scene.ts';
import { STORMLINE_ID } from './courses/stormline-megacity-race.ts';
import { VOLCANIC_ID } from './courses/volcanic-crown-race.ts';
import { MONSOON_ID } from './courses/monsoon-ruins-race.ts';

interface CourseScene { update(distance: number, time?: number, reducedMotion?: boolean): void; hide(): void; dispose(): void }
const FACTORIES: Readonly<Record<string, (scene: THREE.Scene) => CourseScene>> = {
  [STORMLINE_ID]: createStormlineRaceScene, [VOLCANIC_ID]: createVolcanicCrownRaceScene, [MONSOON_ID]: createMonsoonRuinsRaceScene,
};
export const MEASURED_COURSE_IDS: ReadonlySet<string> = new Set(Object.keys(FACTORIES));

export function createMeasuredCourseScenes(scene: THREE.Scene) {
  const live = new Map<string, CourseScene>();
  return {
    update(trackId: string, distance: number, time: number, reducedMotion: boolean): void {
      live.forEach((course, id) => { if (id !== trackId) course.hide(); });
      const factory = Object.hasOwn(FACTORIES, trackId) ? FACTORIES[trackId] : null;
      if (!factory) return;
      let course = live.get(trackId);
      if (!course) live.set(trackId, course = factory(scene));
      course.update(distance, time, reducedMotion);
    },
    dispose(): void { live.forEach(course => course.dispose()); live.clear(); },
  };
}
