// Registry of tracks raced on the per-car CourseGraph runtime (spec §5.1). Every other id leaves `race.course` unset.
import type { TrackConfig } from './game-types.ts';
import type { CourseRaceSpec } from './course-race.ts';
import { DUNE_TEMPEST_ID, DUNE_TEMPEST_RACE, DUNE_TEMPEST_TRACK } from './courses/dune-tempest-race.ts';
import { SKYFALL_ARCHIPELAGO_ID, SKYFALL_ARCHIPELAGO_RACE, SKYFALL_ARCHIPELAGO_TRACK } from './courses/skyfall-archipelago-race.ts';

export interface CourseRuntimeEntry { readonly spec: CourseRaceSpec; readonly track: TrackConfig & { topologyVersion: number } }
export const COURSE_RUNTIMES: Readonly<Record<string, CourseRuntimeEntry>> = {
  [DUNE_TEMPEST_ID]: { spec: DUNE_TEMPEST_RACE, track: DUNE_TEMPEST_TRACK },
  [SKYFALL_ARCHIPELAGO_ID]: { spec: SKYFALL_ARCHIPELAGO_RACE, track: SKYFALL_ARCHIPELAGO_TRACK },
};
export const isCourseRuntime = (id: string): boolean => Object.hasOwn(COURSE_RUNTIMES, id);
