import { shallowReactive } from 'vue';
import type { HalfwayCue } from './race-halfway.ts';

export const raceHalfwayView = shallowReactive({ cue: null as HalfwayCue | null, leaving: false });

export function updateRaceHalfwayView(cue: HalfwayCue | null, leaving: boolean): void {
  if (raceHalfwayView.cue !== cue) raceHalfwayView.cue = cue;
  if (raceHalfwayView.leaving !== leaving) raceHalfwayView.leaving = leaving;
}
