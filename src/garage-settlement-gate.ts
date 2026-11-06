/**
 * Wave 3 non-transactional settlement boundary.
 * The caller must supply a SERVER-authoritative completion verifier. This module
 * never mints currency, persists awards or trusts a browser-stored balance.
 * In-memory dedupe is only a UI retry guard: the server must still enforce
 * atomic idempotency per account/completion across devices and reconnects.
 */
export type CompletionEvidence = {
  accountId: string;
  completionId: string;
  eligible: boolean;
  verified: boolean;
};
export type CompletionVerifier = (accountId: string, completionId: string) => Promise<unknown>;
export type SettlementStatus = 'unavailable' | 'rejected' | 'ineligible' | 'verified' | 'duplicate';
export type SettlementView = { status: SettlementStatus; award: null };

const view = (status: SettlementStatus): SettlementView => ({ status, award: null });
const validAccount = (id: string) => /^[A-Za-z0-9_-]{1,128}$/.test(id);
const validCompletion = (id: string) => /^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/.test(id);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createGarageSettlementGate(verify?: CompletionVerifier) {
  const verified = new Set<string>();
  const inFlight = new Map<string, Promise<SettlementView>>();

  async function settle(accountId: string, completionId: string): Promise<SettlementView> {
    if (!validAccount(accountId) || !validCompletion(completionId)) return view('rejected');
    if (!verify) return view('unavailable');
    const key = JSON.stringify([accountId, completionId]);
    if (verified.has(key)) return view('duplicate');
    const pending = inFlight.get(key);
    if (pending) {
      const first = await pending;
      return first.status === 'verified' ? view('duplicate') : first;
    }
    const attempt = (async (): Promise<SettlementView> => {
      try {
        const proof = await verify(accountId, completionId);
        if (!record(proof) || proof.verified !== true ||
            proof.accountId !== accountId || proof.completionId !== completionId) return view('rejected');
        if (proof.eligible !== true) return view('ineligible');
        verified.add(key);
        return view('verified');
      } catch { return view('unavailable'); }
    })();
    inFlight.set(key, attempt);
    try { return await attempt; }
    finally { inFlight.delete(key); }
  }

  return { settle };
}
