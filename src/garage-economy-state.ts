/**
 * Wave 3 Economy's read-only UI contract. No approved wallet, paid inventory,
 * award values, checkout or ownership verifier exists yet. This module never
 * trusts client storage or a cloud document as proof of an entitlement.
 *
 * The legacy PAINTS progression and temporary Garage VFX trial stay separate.
 * An eventual backend must authenticate and verify grants before any capability
 * can change from false; do not promote `phase: 'ready'` into an owned item.
 */
export const GARAGE_ECONOMY_VERSION = 1 as const;
export type GarageEconomyPhase = 'unavailable' | 'loading' | 'ready' | 'error' | 'unsupported';
export type GarageEconomySnapshot = Readonly<{
  version: typeof GARAGE_ECONOMY_VERSION;
  accountId: string | null;
  phase: GarageEconomyPhase;
  entitlements: 'unverified';
  owned: readonly never[];
  balance: null;
  price: null;
  award: null;
  canBuy: false;
  canClaim: false;
}>;

const validAccount = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const emptyOwned = Object.freeze([]) as readonly never[];

export function createGarageEconomyState() {
  let accountId: string | null = null;
  let phase: GarageEconomyPhase = 'unavailable';
  const snapshot = (): GarageEconomySnapshot => Object.freeze({
    version: GARAGE_ECONOMY_VERSION, accountId, phase,
    entitlements: 'unverified', owned: emptyOwned,
    balance: null, price: null, award: null, canBuy: false, canClaim: false,
  });
  return {
    snapshot,
    setAccount(next: unknown): GarageEconomySnapshot {
      accountId = validAccount(next) ? next : null;
      phase = 'unavailable';
      return snapshot();
    },
    beginLoad(forAccount: string): GarageEconomySnapshot {
      if (accountId === forAccount && accountId !== null) phase = 'loading';
      return snapshot();
    },
    resolve(forAccount: string, raw: unknown): GarageEconomySnapshot {
      if (accountId !== forAccount || phase !== 'loading') return snapshot();
      if (isRecord(raw) && typeof raw.version === 'number' && raw.version > GARAGE_ECONOMY_VERSION) {
        phase = 'unsupported';
      } else {
        phase = isRecord(raw) && raw.version === GARAGE_ECONOMY_VERSION && raw.accountId === accountId
          ? 'ready' : 'error';
      }
      return snapshot();
    },
    fail(forAccount: string): GarageEconomySnapshot {
      if (accountId === forAccount && phase === 'loading') phase = 'error';
      return snapshot();
    },
  };
}
