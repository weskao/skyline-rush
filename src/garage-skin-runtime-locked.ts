import { DEFAULT_SKINS } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

// Production coming-soon Strategy: no account trial session, no ownership logic.
export const currentGarageSkins = (): Record<SkinCategory, SkinId> => ({ ...DEFAULT_SKINS });
export const selectedGarageSkins = currentGarageSkins;
export const subscribeGarageSkins = (_listener: () => void): (() => void) => () => {};
export const cancelGarageSkinPreview = (): void => {};
export const setGarageSkinAccount = (_uid: string | null): void => {};
