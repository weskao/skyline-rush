// Wave 2 Phase B: account-scoped cosmetic contracts; variants affect visuals only.
export const SKIN_CATEGORIES = ['thruster', 'airflow', 'nitro-trail', 'launch-flare'] as const;
export type SkinCategory = (typeof SKIN_CATEGORIES)[number];
export const SKIN_SCHEMA_VERSION = 1 as const;

type SkinDefinition = {
  readonly id: string;
  readonly category: SkinCategory;
  readonly default: boolean;
  readonly name: Readonly<{ en: string; 'zh-TW': string }>;
  readonly candidateRasterId?: string;
};
export const GARAGE_SKINS = [
  { id: 'thruster-basic', category: 'thruster', default: true, name: { en: 'Standard thruster', 'zh-TW': '標準推進器' }, candidateRasterId: 'thruster-basic' },
  { id: 'thruster-ion', category: 'thruster', default: false, name: { en: 'Ion thruster', 'zh-TW': '離子推進器' }, candidateRasterId: 'thruster-ion' },
  { id: 'thruster-plasma', category: 'thruster', default: false, name: { en: 'Plasma helix', 'zh-TW': '電漿螺旋' }, candidateRasterId: 'thruster-plasma' },
  { id: 'thruster-void', category: 'thruster', default: false, name: { en: 'Void pulse', 'zh-TW': '虛空脈衝' }, candidateRasterId: 'thruster-void' },
  { id: 'airflow-basic', category: 'airflow', default: true, name: { en: 'Standard airflow', 'zh-TW': '標準氣流' }, candidateRasterId: 'airflow-basic' },
  { id: 'airflow-slipstream', category: 'airflow', default: false, name: { en: 'Slipstream', 'zh-TW': '流線氣流' }, candidateRasterId: 'airflow-slipstream' },
  { id: 'airflow-vortex', category: 'airflow', default: false, name: { en: 'Vortex spiral', 'zh-TW': '渦旋氣流' }, candidateRasterId: 'airflow-vortex' },
  { id: 'airflow-prism', category: 'airflow', default: false, name: { en: 'Prism lattice', 'zh-TW': '稜鏡氣流' }, candidateRasterId: 'airflow-prism' },
  { id: 'nitro-trail-basic', category: 'nitro-trail', default: true, name: { en: 'Standard NITRO trail', 'zh-TW': '標準氮氣尾跡' } },
  { id: 'nitro-trail-cyan', category: 'nitro-trail', default: false, name: { en: 'Cyan trail', 'zh-TW': '青色尾跡' }, candidateRasterId: 'trail-cyan' },
  { id: 'nitro-trail-gold', category: 'nitro-trail', default: false, name: { en: 'Golden pulse trail', 'zh-TW': '金色脈衝尾跡' }, candidateRasterId: 'trail-gold' },
  { id: 'nitro-trail-red', category: 'nitro-trail', default: false, name: { en: 'Crimson dash trail', 'zh-TW': '赤紅斷續尾跡' }, candidateRasterId: 'trail-red' },
  { id: 'nitro-trail-purple', category: 'nitro-trail', default: false, name: { en: 'Nebula ribbon', 'zh-TW': '星雲紫光尾跡' }, candidateRasterId: 'trail-purple' },
  { id: 'launch-flare-basic', category: 'launch-flare', default: true, name: { en: 'Standard launch flare', 'zh-TW': '標準起跑閃焰' } },
  { id: 'launch-flare-blue', category: 'launch-flare', default: false, name: { en: 'Blue flare', 'zh-TW': '藍色閃焰' }, candidateRasterId: 'flare-blue' },
  { id: 'launch-flare-ring', category: 'launch-flare', default: false, name: { en: 'Shock ring flare', 'zh-TW': '衝擊環閃焰' }, candidateRasterId: 'flare-ring' },
  { id: 'launch-flare-pulse', category: 'launch-flare', default: false, name: { en: 'Pulse flare', 'zh-TW': '脈衝閃焰' }, candidateRasterId: 'flare-purple' },
  { id: 'launch-flare-gold', category: 'launch-flare', default: false, name: { en: 'Solar corona', 'zh-TW': '日冕金焰' }, candidateRasterId: 'flare-gold' },
  { id: 'launch-flare-red', category: 'launch-flare', default: false, name: { en: 'Crimson shock', 'zh-TW': '赤紅衝擊' }, candidateRasterId: 'flare-red' },
  { id: 'launch-flare-cyan', category: 'launch-flare', default: false, name: { en: 'Arctic nova', 'zh-TW': '極光新星' }, candidateRasterId: 'flare-cyan' },
  { id: 'launch-flare-magenta', category: 'launch-flare', default: false, name: { en: 'Magenta vortex', 'zh-TW': '洋紅旋渦' }, candidateRasterId: 'flare-magenta' },
  { id: 'launch-flare-white', category: 'launch-flare', default: false, name: { en: 'White supernova', 'zh-TW': '白耀超新星' }, candidateRasterId: 'flare-white' },
] as const satisfies readonly SkinDefinition[];
export type SkinId = (typeof GARAGE_SKINS)[number]['id'];
export type SkinState = 'locked' | 'trial' | 'owned' | 'equipped';
export type SkinProfile = {
  version: typeof SKIN_SCHEMA_VERSION;
  accountId: string;
  owned: SkinId[];
  equipped: Partial<Record<SkinCategory, SkinId>>;
};
export type SkinSession = {
  accountId: string;
  now: number;
  trialEnabled: boolean;
  trialExpiresAt: number;
  trialEquipped?: Partial<Record<SkinCategory, SkinId>>;
};
export const DEFAULT_SKINS = {
  thruster: 'thruster-basic',
  airflow: 'airflow-basic',
  'nitro-trail': 'nitro-trail-basic',
  'launch-flare': 'launch-flare-basic',
} as const satisfies Record<SkinCategory, SkinId>;
export const SKIN_PREVIEW_UI = Object.freeze({
  mode: 'live-shared-aero', // Studio and racing reuse createAeroVFX.
  cardCssSize: 96, badgeCssSize: 72, rasterScale: 3,
  categories: SKIN_CATEGORIES,
  placeholderText: { en: 'VFX preview coming soon', 'zh-TW': '特效預覽即將推出' },
});

export function findSkin(id: unknown): (typeof GARAGE_SKINS)[number] | null {
  return typeof id === 'string' ? GARAGE_SKINS.find(skin => skin.id === id) ?? null : null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const validAccount = (accountId: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(accountId);
const emptyProfile = (accountId: string): SkinProfile => ({ version: 1, accountId, owned: [], equipped: {} });

// Strict, account-scoped migration: never import trial flags or overwrite legacy PAINTS data.
export function normalizeSkinProfile(raw: unknown, accountId: string): SkinProfile {
  const scope = validAccount(accountId) ? accountId : '';
  const empty = emptyProfile(scope);
  if (!scope || !isRecord(raw) || raw.version !== 1 || raw.accountId !== scope) return empty;
  const owned: SkinId[] = [];
  if (Array.isArray(raw.owned)) for (const value of raw.owned.slice(0, 100)) {
    const skin = findSkin(value);
    if (skin && !skin.default && !owned.includes(skin.id)) owned.push(skin.id);
  }
  const equipped: SkinProfile['equipped'] = {};
  if (isRecord(raw.equipped)) for (const category of SKIN_CATEGORIES) {
    const skin = findSkin(raw.equipped[category]);
    if (skin && skin.category === category && (skin.default || owned.includes(skin.id))) equipped[category] = skin.id;
  }
  return { version: 1, accountId: scope, owned, equipped };
}

function trialActive(profile: SkinProfile, session: SkinSession): boolean {
  return !!profile.accountId && profile.accountId === session.accountId && session.trialEnabled === true
    && Number.isFinite(session.now) && Number.isFinite(session.trialExpiresAt)
    && session.trialExpiresAt > session.now;
}

// Trial equips are session-only. A stale account/expired flag cannot activate a cosmetic.
export function resolveActiveSkin(category: SkinCategory, profile: SkinProfile, session: SkinSession): SkinId {
  if (profile.accountId !== session.accountId || !validAccount(session.accountId)) return DEFAULT_SKINS[category];
  const persisted = normalizeSkinProfile(profile, session.accountId);
  const temporary = findSkin(session.trialEquipped?.[category]);
  if (temporary && temporary.category === category && (temporary.default || persisted.owned.includes(temporary.id) || trialActive(persisted, session))) return temporary.id;
  return persisted.equipped[category] ?? DEFAULT_SKINS[category];
}

export function skinView(id: unknown, profile: SkinProfile, session: SkinSession) {
  const skin = findSkin(id);
  if (!skin) return null;
  const persisted = normalizeSkinProfile(profile, session.accountId);
  const owned = skin.default || persisted.owned.includes(skin.id);
  const trial = !owned && trialActive(persisted, session);
  const equipped = resolveActiveSkin(skin.category, profile, session) === skin.id;
  const state: SkinState = equipped ? 'equipped' : owned ? 'owned' : trial ? 'trial' : 'locked';
  return { id: skin.id, category: skin.category, state, owned, canEquip: !equipped && (owned || trial), canPreview: true };
}

// Source artwork is 3x (WebP for existing effects; 288-unit SVG for the four Airflow variants). All cards display at 1x CSS size.
export function skinArtwork(id: unknown, baseUrl: string) {
  const skin = findSkin(id);
  if (!skin) return null;
  const base = /^\/(?!\/)(?:[A-Za-z0-9_-]+\/)*$/.test(baseUrl) ? baseUrl : '/';
  const fallback = `${base}feature-assets/garage-vfx-skins/${skin.category}.svg`;
  const candidateRasterId = 'candidateRasterId' in skin ? skin.candidateRasterId : undefined;
  const hasRaster = typeof candidateRasterId === 'string';
  const src = hasRaster
    ? `${base}feature-assets/garage-vfx-skins/raster/${candidateRasterId}@3x.${skin.category === 'airflow' ? 'svg' : 'webp'}`
    : fallback;
  return { src, fallback, cssSize: SKIN_PREVIEW_UI.cardCssSize, candidateRasterId, hasRaster };
}

// Serialize only versioned permanent entitlements. Cloud Save integration remains Phase B.
export function skinCloudPayload(profile: SkinProfile): SkinProfile {
  return normalizeSkinProfile(profile, profile.accountId);
}
