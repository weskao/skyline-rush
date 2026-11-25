import { RACE_TRACKS, COURSE_TRACKS } from '../../src/race-tracks.ts';
import { CIRCUIT_ID } from '../../src/circuit-track.ts';
import { UPCOMING_TRACKS } from '../../src/upcoming-tracks.ts';

const priority = ['volcanic-crown', 'taipei', 'tokyo'];
const ordered = ids => [...new Set([...priority.filter(id => ids.includes(id)), ...ids])];
export const thermalScenarios = [
  ...ordered([...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID]).flatMap(id => [
    { id, phase: 'home' }, { id, phase: 'racing' },
  ]),
  ...ordered(Object.keys(UPCOMING_TRACKS)).map(id => ({ id, phase: 'showcase' })),
];
