import { DEFAULT_SKINS, findSkin, normalizeSkinProfile, resolveActiveSkin, skinCloudPayload, skinView } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId, SkinProfile, SkinSession } from './garage-skin-catalog.ts';

/**
 * Garage Phase B's event-driven session boundary.
 * No storage, Firestore write or race-state mutation here: temporary trial access lives only in memory.
 * The trial runtime may re-apply a remembered pick through `equip`, which re-checks the same gate.
 */
export function createGarageSkinSession(accountId: string, now: () => number, initial?: unknown) {
  let profile = normalizeSkinProfile(initial, accountId);
  let trial = { enabled: false, expiresAt: 0 };
  let selected: SkinId | null = null;
  const temporary: NonNullable<SkinSession['trialEquipped']> = {};

  const context = (): SkinSession => ({
    accountId: profile.accountId, now: now(), trialEnabled: trial.enabled,
    trialExpiresAt: trial.expiresAt, trialEquipped: temporary,
  });
  const active = (category: SkinCategory): SkinId => resolveActiveSkin(category, profile, context());
  const view = (id: unknown) => skinView(id, profile, context());

  function select(id: unknown): boolean {
    const skin = findSkin(id);
    if (!skin) return false;
    selected = skin.id;
    return true;
  }

  function equip(id: unknown): boolean {
    const skin = findSkin(id);
    if (!skin) return false;
    const state = view(skin.id);
    if (!state?.owned && !state?.canEquip && state?.state !== 'equipped') return false;
    if (state.owned) {
      // The cloud-safe profile receives only permanently owned or default equipment.
      profile = normalizeSkinProfile({
        ...profile, equipped: { ...profile.equipped, [skin.category]: skin.id },
      }, profile.accountId);
      delete temporary[skin.category];
    } else {
      temporary[skin.category] = skin.id;
    }
    selected = null;
    return true;
  }

  function preview(category: SkinCategory): SkinId {
    const skin = findSkin(selected);
    return skin?.category === category ? skin.id : active(category);
  }

  return {
    active, view, preview, select, equip,
    cancelPreview() { selected = null; },
    setTrial(next: { enabled: boolean; expiresAt: number }) {
      const time = now();
      // Expired trial equipment must not revive when a fresh trial is enabled.
      const previousExpired = trial.enabled && trial.expiresAt <= time;
      trial = {
        enabled: next.enabled === true,
        expiresAt: Number.isFinite(next.expiresAt) ? next.expiresAt : 0,
      };
      if (previousExpired || !trial.enabled || trial.expiresAt <= time) {
        selected = null;
        for (const category of Object.keys(temporary) as SkinCategory[]) delete temporary[category];
      }
    },
    setAccount(nextId: string, initialProfile?: unknown) {
      profile = normalizeSkinProfile(initialProfile, nextId);
      trial = { enabled: false, expiresAt: 0 };
      selected = null;
      for (const category of Object.keys(temporary) as SkinCategory[]) delete temporary[category];
    },
    cloudPayload(): SkinProfile { return skinCloudPayload(profile); },
    defaults: DEFAULT_SKINS,
  };
}
