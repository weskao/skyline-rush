import { GARAGE_SKINS } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { demoOffer, demoBalance, insufficientDemo } from './wave3-demo-settlement.ts';
import type { DemoCurrency, DemoInsufficient, ExperienceSnapshot } from './wave3-experience-contract.ts';

/** Presentation derived from the real VFX catalog; NOT a second inventory or paid SKU list. */
export type Wave3DemoItem = Readonly<{
  id: SkinId;
  category: SkinCategory;
  name: Readonly<{ en: string; 'zh-TW': string }>;
  demoPrice: number | null;
  currency: DemoCurrency | null;
}>;
export type DemoItemStatus = 'preview-only' | 'trial' | 'demo-unlocked' | 'locked';
export type DemoRedeemState = 'ready' | 'invalid' | 'unavailable' | 'preview-only' | 'duplicate' | DemoInsufficient;
/** A read-only projection of the existing Garage skin session's view(). */
export type DemoTrialAccess = Readonly<{
  state: 'locked' | 'trial' | 'owned' | 'equipped';
  canEquip: boolean;
  owned?: boolean;
  expiresAt?: number;
}>;

export const WAVE3_DEMO_ITEMS: readonly Wave3DemoItem[] = Object.freeze(
  GARAGE_SKINS.filter(skin => !skin.default).map(skin => {
    const offer = demoOffer(skin.id);
    return Object.freeze({ id: skin.id, category: skin.category, name: skin.name,
      demoPrice: offer?.cost ?? null, currency: offer?.currency ?? null });
  }),
);

/** Existing 3x Store illustrations; display-only concepts, never redeemable cosmetics. */
export const WAVE3_DEMO_STORE_ART = [
  'store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection',
] as const;

export const findDemoItem = (id: unknown): Wave3DemoItem | null =>
  typeof id === 'string' ? WAVE3_DEMO_ITEMS.find(item => item.id === id) ?? null : null;

const isLocalDemo = (snapshot: ExperienceSnapshot): boolean =>
  snapshot.mode === 'local-demo' && snapshot.authority === 'local' && snapshot.syncState === 'local-only';

export function demoItemStatus(
  id: string, snapshot: ExperienceSnapshot, access?: DemoTrialAccess | null, now = Date.now(),
): DemoItemStatus {
  const item = findDemoItem(id);
  if (!item) return 'locked';
  if (isLocalDemo(snapshot) && snapshot.demoInventory.includes(item.id)) return 'demo-unlocked';
  const trialActive = access && (access.state === 'trial' && access.canEquip ||
    access.state === 'equipped' && access.owned === false) &&
    (access.expiresAt === undefined || access.expiresAt > now);
  if (trialActive) return 'trial';
  return item.demoPrice === null ? 'preview-only' : 'locked';
}

/** A UI preflight only; all actual debits must still go through port.redeemPreview(). */
export function demoRedemptionState(id: string, snapshot: ExperienceSnapshot): DemoRedeemState {
  const item = findDemoItem(id);
  if (!item) return 'invalid';
  if (item.demoPrice === null || !item.currency) return 'preview-only';
  if (!isLocalDemo(snapshot)) return 'unavailable';
  if (snapshot.demoInventory.includes(item.id)) return 'duplicate';
  if (demoBalance(snapshot, item.currency) < item.demoPrice) return insufficientDemo(item.currency);
  return 'ready';
}

/** Only the F01 local-demo inventory can request equipPreview; Garage trials remain separate. */
export function canEquipDemoPreview(id: string, snapshot: ExperienceSnapshot): boolean {
  const item = findDemoItem(id);
  return isLocalDemo(snapshot) && item?.demoPrice !== null && item !== null &&
    snapshot.demoInventory.includes(item.id);
}

const LABELS: Record<DemoItemStatus, { en: string; 'zh-TW': string }> = {
  'preview-only': { en: 'Preview only', 'zh-TW': '僅供預覽' },
  trial: { en: 'Trial', 'zh-TW': '試用中' },
  'demo-unlocked': { en: 'Demo unlocked', 'zh-TW': '試玩取得' },
  locked: { en: 'Locked', 'zh-TW': '未解鎖' },
};

export const demoItemStatusText = (status: DemoItemStatus, locale: string): string =>
  LABELS[status][locale === 'zh-TW' ? 'zh-TW' : 'en'];
