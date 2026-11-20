import type { HistoryStorage } from '../history-storage.ts';

// Only the unlocked Vite server uses this storage. Test picks never leave the page.
const picks = new Map<string, string>();
export const garagePlaytestStorage: HistoryStorage = {
  getItem: key => picks.get(key) ?? null,
  setItem: (key, value) => { picks.set(key, value); },
};
