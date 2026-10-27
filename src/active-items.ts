// Small optional active item slot for unranked practice; never changes Classic ring rewards.
const DURATIONS = { shield: 10, magnet: 5, ghost: 3, freeze: 2 };
export type ActiveItem = keyof typeof DURATIONS;

export function ringsForItemRule<T extends { type: string; group: number }>(rings: T[], rule?: string): T[] {
  if (rule === 'off') return [];
  if (rule !== 'active') return rings;
  return rings.flatMap((ring, index) => ring.type === 'mystery' ? [{ ...ring, mysteryIndex: index,
    groupSize: rings.filter(other => other.group === ring.group).length }] : []);
}

// The engine owns the mutable car; this typed adapter owns only item-related fields.
export interface ActiveItemCar {
  heldItem: ActiveItem | null;
  itemCooldown: number;
  effects: Record<ActiveItem, number>;
}

const isActiveItem = (item: unknown): item is ActiveItem =>
  typeof item === 'string' && Object.hasOwn(DURATIONS, item);

export function bankItem(car: ActiveItemCar | null | undefined, item: unknown): boolean {
  if (!car || car.heldItem || !isActiveItem(item)) return false;
  car.heldItem = item;
  return true;
}

export function activateItem(car: ActiveItemCar | null | undefined, hasRivals = true): ActiveItem | null {
  if (!car?.heldItem || car.itemCooldown > 0) return null;
  const effect = car.heldItem === 'freeze' && !hasRivals ? 'magnet' : car.heldItem;
  car.effects[effect] = Math.max(car.effects[effect] || 0, DURATIONS[effect]);
  car.heldItem = null;
  car.itemCooldown = .7;
  return effect;
}

export function tickItemCooldown(car: ActiveItemCar, dt: number): void {
  if (Number.isFinite(dt) && dt > 0 && dt <= .1)
    car.itemCooldown = Math.max(0, (car.itemCooldown || 0) - dt);
}
