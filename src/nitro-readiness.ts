import { BOOST_DRAIN } from './drive-rules.ts';

/** Read-only presentation of the engine's one-charge NITRO activation contract. */
export type NitroDisplayState = 'disabled' | 'charging' | 'ready' | 'active';
export interface NitroFrame { charge: number; phase: string; active: boolean; locked?: boolean }
export interface NitroFeedback { state: NitroDisplayState; cueReady: boolean }
export function createNitroReadiness() {
  let previousCharge: number | undefined;
  let armed = true;
  return {
    update(frame: NitroFrame): NitroFeedback {
      const charge = Number.isFinite(frame.charge) ? Math.max(0, frame.charge) : 0;
      const state: NitroDisplayState = frame.phase !== 'racing' || frame.locked ? 'disabled'
        : frame.active ? 'active' : charge >= 1 ? 'ready' : 'charging';
      // A real one-charge spend rearms; tiny threshold oscillations cannot replay the sound.
      if (previousCharge !== undefined && previousCharge - charge >= 0.5) armed = true;
      const cueReady = state !== 'disabled' && armed && previousCharge !== undefined && previousCharge < 1 && charge >= 1;
      if (cueReady) armed = false;
      previousCharge = charge;
      return { state, cueReady };
    },
    reset(): void { previousCharge = undefined; armed = true; },
  };
}

interface BoostFrame {
  fuel: number;
  phase: string;
  boosting: boolean;
  braking: boolean;
  held: boolean;
}

// The engine accepts any positive fuel. After depletion, wait for one second of road
// BOOST reserve before chiming, so holding BOOST on the empty tank cannot spam SFX.
const BOOST_READY_RESERVE = BOOST_DRAIN;
export function createBoostReadiness() {
  let armed = true;
  return {
    update({ fuel, phase, boosting, braking, held }: BoostFrame): NitroFeedback {
      if (phase !== 'racing') return { state: 'disabled', cueReady: false };
      const charge = Number.isFinite(fuel) ? Math.max(0, fuel) : 0;
      if (charge === 0) armed = true;
      const state = braking ? 'disabled' : boosting && charge > 0 ? 'active' : charge > 0 ? 'ready' : 'charging';
      const cueReady = armed && state === 'ready' && !held && charge >= BOOST_READY_RESERVE;
      if (cueReady || state === 'active' && charge >= BOOST_READY_RESERVE) armed = false;
      return { state, cueReady };
    },
    reset(): void { armed = true; },
  };
}
