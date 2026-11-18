import type { Locale } from './i18n.ts';

export type AcquisitionKind = 'car' | 'track' | 'paint' | 'equipment' | 'clothing' | 'item' | 'medal' | 'currency';
export type AcquisitionText = Readonly<Record<Locale, string>>;
export type AcquisitionItem = Readonly<{
  id: string;
  kind: AcquisitionKind;
  status: 'unlocked' | 'earned';
  name: AcquisitionText;
  description?: AcquisitionText;
  artwork?: Readonly<{ src: string; style: 'cover' | 'cutout' | 'icon' }>;
  quantity?: number;
  scope?: 'demo';
}>;
export type AcquisitionBatch = Readonly<{ id: string; items: readonly AcquisitionItem[] }>;

/** UI-only presentation port. Each ID identifies a successful, already committed operation. */
export function createAcquisitionQueue() {
  const pending: AcquisitionBatch[] = [];
  const seen = new Set<string>();
  const listeners = new Set<(batch: AcquisitionBatch | null) => void>();
  const current = () => pending[0] ?? null;
  const notify = () => { for (const listener of listeners) listener(current()); };
  return {
    current,
    subscribe(listener: (batch: AcquisitionBatch | null) => void) {
      listeners.add(listener);
      listener(current());
      return () => { listeners.delete(listener); };
    },
    present(batch: AcquisitionBatch): boolean {
      if (!batch.items.length || seen.has(batch.id)) return false;
      seen.add(batch.id);
      pending.push({ id: batch.id, items: [...batch.items] });
      if (pending.length === 1) notify();
      return true;
    },
    dismiss(id: string): void {
      if (current()?.id !== id) return;
      pending.shift();
      notify();
    },
  };
}

export const acquisitionReveal = createAcquisitionQueue();
export const presentAcquisition = acquisitionReveal.present;
