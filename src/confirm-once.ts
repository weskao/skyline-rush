/** A confirmation the player answers once: saved when storage works, otherwise kept for this page. */
export function confirmOnce(key: string, storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let confirmed = false;
  try { confirmed = storage().getItem(key) === '1'; } catch { /* Blocked storage asks again on the next visit. */ }
  return {
    needed: (): boolean => !confirmed,
    remember(): void {
      confirmed = true;
      try { storage().setItem(key, '1'); } catch { /* Remembered in memory for this session. */ }
    },
  };
}
