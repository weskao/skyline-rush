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
      const cueReady = state === 'ready' && armed && previousCharge !== undefined && previousCharge < 1 && charge >= 1;
      if (cueReady) armed = false;
      previousCharge = charge;
      return { state, cueReady };
    },
    reset(): void { previousCharge = undefined; armed = true; },
  };
}
