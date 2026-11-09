import { DEFAULT_SKINS } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { createGarageEconomyState } from './garage-economy-state.ts';

// Production coming-soon Strategy: no account trial session, no ownership logic.
// Safe read-only state, no identity binding or owned grants.
const economy = createGarageEconomyState();
export const garageEconomySnapshot = economy.snapshot;
export const currentGarageSkins = (): Record<SkinCategory, SkinId> => ({ ...DEFAULT_SKINS });
export const selectedGarageSkins = currentGarageSkins;
export const subscribeGarageSkins = (_listener: () => void): (() => void) => () => {};
export const cancelGarageSkinPreview = (): void => {};
export const setGarageSkinAccount = (_uid: string | null): void => {};
