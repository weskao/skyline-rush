import { reactive } from 'vue';
import { SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { createGarageSkinSession } from './garage-skin-session.ts';
import { createGarageEconomyState } from './garage-economy-state.ts';
import { browserSkinPickStorage, rememberSkinPick, restoreSkinPicks } from './garage-skin-preference.ts';

let accountId = 'guest';
const session = createGarageSkinSession(accountId, Date.now);
// Shared, fail-closed Economy read state. Cosmetics trials are not ownership.
const economy = createGarageEconomyState();
economy.setAccount(accountId);
export const garageEconomySnapshot = economy.snapshot;
// Free-to-try is a temporary feature flag, NEVER a purchase or a cloud entitlement.
declare const __GARAGE_SKIN_TRIAL__: boolean;
const trialMode = typeof __GARAGE_SKIN_TRIAL__ === 'undefined' || __GARAGE_SKIN_TRIAL__;
const freeTrialExpiry = Number.MAX_SAFE_INTEGER;
const MAX_TIMEOUT_MS = 2_147_483_647;
session.setTrial({ enabled: trialMode, expiresAt: trialMode ? freeTrialExpiry : 0 });
// Remembered picks re-enter through session.equip, so storage can never bypass the owned/trial gate.
const restorePicks = () => restoreSkinPicks(browserSkinPickStorage(), accountId, id => session.equip(id));
restorePicks();
export const garageSkinState = reactive({ revision: 0 });
const listeners = new Set<() => void>();
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
function clearExpiryTimer() {
  if (expiryTimer !== undefined) clearTimeout(expiryTimer);
  expiryTimer = undefined;
}
function publish() {
  garageSkinState.revision++;
  for (const listener of listeners) listener();
}
export const subscribeGarageSkins = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function currentGarageSkins(): Record<SkinCategory, SkinId> {
  return Object.fromEntries(SKIN_CATEGORIES.map(category => [category, session.active(category)])) as Record<SkinCategory, SkinId>;
}
export function selectedGarageSkins(): Record<SkinCategory, SkinId> {
  return Object.fromEntries(SKIN_CATEGORIES.map(category => [category, session.preview(category)])) as Record<SkinCategory, SkinId>;
}
export const garageSkinEntry = (id: unknown) => session.view(id);
export function selectGarageSkin(id: unknown): boolean {
  if (!session.select(id)) return false;
  publish();
  return true;
}
export function equipGarageSkin(id: unknown): boolean {
  if (!session.equip(id)) return false;
  rememberSkinPick(browserSkinPickStorage(), accountId, id);
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
  clearExpiryTimer();
  session.setAccount(id);
  economy.setAccount(id);
  session.setTrial({ enabled: trialMode, expiresAt: trialMode ? freeTrialExpiry : 0 });
  restorePicks();
  publish();
}
// A single JS timer can only cover ~24.8 days. Recheck the deadline after each
// bounded interval so long trials still expire without waking up too early.
function scheduleTrialExpiry(expiresAt: number): void {
  const remaining = expiresAt - Date.now();
  if (remaining > 0) {
    expiryTimer = setTimeout(() => {
      expiryTimer = undefined;
      scheduleTrialExpiry(expiresAt);
    }, Math.min(remaining, MAX_TIMEOUT_MS));
    return;
  }
  session.setTrial({ enabled: false, expiresAt: 0 });
  publish();
}

export function setGarageSkinTrial(enabled: boolean, expiresAt: number): void {
  if (!trialMode) return;
  clearExpiryTimer();
  session.setTrial({ enabled, expiresAt });
  publish();
  const remaining = expiresAt - Date.now();
  // The unlimited development trial is a feature flag, not a finite timer.
  if (enabled && expiresAt !== freeTrialExpiry && Number.isFinite(remaining) && remaining > 0) {
    scheduleTrialExpiry(expiresAt);
  }
}
