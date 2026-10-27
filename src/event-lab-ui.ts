import { shallowReactive } from 'vue';
import { compileCourse, createCourse, loadCourse, validateCourse, type CourseDocument, type CourseObstacle } from './event-lab.ts';
import type { createRace } from './game.js';

type EngineRace = ReturnType<typeof createRace> & { eventCourse?: CourseDocument };
interface EventLabOptions {
  getRace(): EngineRace;
  createRace(trackId: string, config: Record<string, unknown>): EngineRace;
  unlockedTracks: ReadonlySet<string>;
  select(race: EngineRace): void;
  cueUi(): void;
  clearControls(): void;
}
// Only editor presentation crosses Vue; the mutable simulation never becomes reactive.
export const eventLabView = shallowReactive({ open: false, trackId: 'coast',
  unlocked: [] as string[], obstacles: [] as CourseObstacle[], document: null as CourseDocument | null });
let accept: ((document: CourseDocument) => void) | undefined;
export function useEventCourse(document: CourseDocument): void { accept?.(document); }

export function setupEventLabUI(options: EventLabOptions) {
  let selected: CourseDocument | null = null;
  const baseRace = (trackId: string) => options.createRace(trackId, { mode: 'custom', rivals: 0, traffic: 'off', items: true });
  const selectedRace = (trackId: string): EngineRace => {
    const base = baseRace(trackId);
    const document = selected?.trackId === trackId ? selected : createCourse(trackId, 'slalom', 12345, options.unlockedTracks, base.props);
    return compileCourse(base, document, options.unlockedTracks);
  };
  accept = document => {
    if (options.getRace().phase !== 'ready') return;
    const base = baseRace(document.trackId);
    const checked = validateCourse(document, options.unlockedTracks, base.props);
    const race = compileCourse(base, checked, options.unlockedTracks);
    selected = checked;
    options.select(race);
    options.cueUi();
    eventLabView.open = false;
  };
  return {
    selectedRace,
    open(): void {
      const race = options.getRace();
      if (race.phase !== 'ready' || !options.unlockedTracks.has(race.trackId)) return;
      options.clearControls();
      eventLabView.trackId = race.trackId;
      eventLabView.unlocked = [...options.unlockedTracks];
      eventLabView.obstacles = race.props;
      const saved = selected ?? loadCourse(options.unlockedTracks);
      eventLabView.document = saved?.trackId === race.trackId ? saved : null;
      eventLabView.open = true;
      options.cueUi();
    },
    recreate(race: EngineRace, trackId: string): EngineRace {
      return race.eventCourse && race.trackId === trackId
        ? compileCourse(baseRace(trackId), race.eventCourse, options.unlockedTracks)
        : options.createRace(trackId, race.modifier ?? (race.mode === 'classic' ? {} : race.config));
    },
  };
}
