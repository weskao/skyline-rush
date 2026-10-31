import { reactive } from 'vue';
import { SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { createGarageSkinSession } from './garage-skin-session.ts';

let accountId = 'guest';
const session = createGarageSkinSession(accountId, Date.now);
// Free-to-try is a temporary feature flag, NEVER a purchase or a cloud entitlement.
const freeTrialExpiry = Number.MAX_SAFE_INTEGER;
session.setTrial({ enabled: true, expiresAt: freeTrialExpiry });
export const garageSkinState = reactive({ revision: 0 });
const listeners = new Set<() => void>();
function publish() {
  garageSkinState.revision++;
  for (const listener of listeners) listener();
}
export const subscribeGarageSkins = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function currentGarageSkins(): Record<SkinCategory, SkinId> {
  return Object.fromEntries(SKIN_CATEGORIES.map(category => [category, session.active(category)]))
    as Record<SkinCategory, SkinId>;
}
export function selectedGarageSkins(): Record<SkinCategory, SkinId> {
  return Object.fromEntries(SKIN_CATEGORIES.map(category => [category, session.preview(category)]))
    as Record<SkinCategory, SkinId>;
}
export const garageSkinEntry = (id: unknown) => session.view(id);
export function selectGarageSkin(id: unknown): boolean {
  if (!session.select(id)) return false;
  publish();
  return true;
}
export function equipGarageSkin(id: unknown): boolean {
  if (!session.equip(id)) return false;
  publish();
  return true;
}
export function cancelGarageSkinPreview(): void {
  session.cancelPreview();
  publish();
}
export function setGarageSkinAccount(nextId: string | null): void {
  const id = nextId || 'guest';
  if (id === accountId) return;
  accountId = id;
  session.setAccount(id);
  session.setTrial({ enabled: true, expiresAt: freeTrialExpiry });
  publish();
}
export function setGarageSkinTrial(enabled: boolean, expiresAt: number): void {
  session.setTrial({ enabled, expiresAt });
  publish();
}
