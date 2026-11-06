/** Wave 3 shop stays non-transactional until separate economy and platform approval. */
export type StoreReadiness = Readonly<{
  phase: 'coming-soon'; canPreview: true; canBuy: false; canClaim: false; price: null; balance: null;
}>;
const DISABLED_STORE: StoreReadiness = Object.freeze({
  phase: 'coming-soon', canPreview: true, canBuy: false, canClaim: false, price: null, balance: null,
});
export const storeReadiness = (): StoreReadiness => DISABLED_STORE;
export const storeReadinessText = (locale: string): string =>
  locale === 'zh-TW' ? '商店 · 即將推出 — 僅供預覽' : 'Shop · Coming soon — preview only';
