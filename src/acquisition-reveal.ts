import type { Locale } from './i18n.ts';
import type { SkinCategory } from './garage-skin-catalog.ts';

export const ACQUISITION_KIND = {
  CAR: 'car',
  TRACK: 'track',
  PAINT: 'paint',
  EQUIPMENT: 'equipment',
  CLOTHING: 'clothing',
  ITEM: 'item',
  MEDAL: 'medal',
  CURRENCY: 'currency',
} as const;
export type AcquisitionKind = typeof ACQUISITION_KIND[keyof typeof ACQUISITION_KIND];
export type AcquisitionAction = Readonly<
  | { kind: 'drive' | 'paint' | 'equip' | 'wear' | 'use'; apply(): boolean | Promise<boolean>; isApplied?(): boolean }
  | { kind: 'track'; open(): void }
>;
export type AcquisitionActionFor = (item: AcquisitionItem) => AcquisitionAction | undefined;
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
  equipmentCategory?: SkinCategory;
  action?: AcquisitionAction;
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
