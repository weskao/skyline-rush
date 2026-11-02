import { createRace as createBareRace, setLayoutSeed, RACE_TRACKS } from './game.js';
import { createCheckpointRush } from './checkpoint-rush.ts';
import { roadObstacles, endlessRoadObstacles } from './world-tour-scene.js';

type BareRace = ReturnType<typeof createBareRace>;
type AppRace = Omit<BareRace, 'props' | 'checkpoint'> & {
  props: ReturnType<typeof roadObstacles>; checkpoint: BareRace['checkpoint'] | ReturnType<typeof createCheckpointRush>;
  endless?: unknown; streamProps?: (distance: number) => void;
};

// Every race in the app places its rings and pickups anew (tests and tools keep the repeatable track seed).
setLayoutSeed(() => (Math.random() * 2 ** 32) >>> 0);

// World Tour scenery that reaches into the road is solid in the simulation too.
export function createRace(...args: Parameters<typeof createBareRace>): AppRace {
  const created = createBareRace(...args) as unknown as AppRace;
  created.props = roadObstacles(created.trackId);
  if (created.endless) { created.streamProps = distance => { created.props = endlessRoadObstacles(created.trackId, distance); }; created.streamProps(0); }
  if (created.checkpoint && created.props.length)
    created.checkpoint = createCheckpointRush(RACE_TRACKS[created.trackId as keyof typeof RACE_TRACKS], created.props);
  return created;
}
