// Small optional active item slot for unranked practice; never changes Classic ring rewards.
import { EFFECT_TIMES, MYSTERY_EFFECTS } from './ring-layout.ts';
import { seededRng, RACE_STREAMS } from './rng.ts';

export const EMP_DURATION = 1.5;
export const ITEM_COOLDOWN = 0.7;
const DURATIONS = { ...EFFECT_TIMES, emp: EMP_DURATION };

// The same seeded mystery roll goes to whichever driver crosses the ring.
export function mysteryEffect(seed: number, index: number): keyof typeof EFFECT_TIMES {
  const roll = seededRng(seed, `${RACE_STREAMS.mysteryPrefix}${index}`)();
  return MYSTERY_EFFECTS[Math.floor(roll * MYSTERY_EFFECTS.length)]!;
}
export type ActiveItem = keyof typeof DURATIONS;
export const ACTIVE_ITEMS: readonly ActiveItem[] = Object.freeze(Object.keys(DURATIONS) as ActiveItem[]);

// Rings are scarce (5 per car), so Active makes every ring an item ring and All every other one (the rest
// become bonus gates); each keeps its source index, so its reward never depends on the rule.
export function ringsForItemRule<T extends { type: string; group: number }>(rings: T[], rule?: string): T[] {
  if (rule === 'off') return [];
  if (rule !== 'active' && rule !== 'all') return rings;
  return rings.map((ring, index) => rule === 'all' && index % 2 ? ring : { ...ring, type: 'mystery', mysteryIndex: index });
}

// The engine owns the mutable car; this typed adapter owns only item-related fields.
export interface ActiveItemCar {
  heldItem: ActiveItem | null;
  itemCooldown: number;
  effects: Record<Exclude<ActiveItem, 'emp'>, number> & { emp?: number };
  recoveryTime?: number;
  multiplierTime?: number;
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
  const effect = (car.heldItem === 'freeze' || car.heldItem === 'emp') && !hasRivals ? 'magnet' : car.heldItem;
  car.effects[effect] = Math.max(car.effects[effect] || 0, DURATIONS[effect]);
  car.heldItem = null;
  car.itemCooldown = ITEM_COOLDOWN;
  return effect;
}

export function tickItemCooldown(car: ActiveItemCar, dt: number): void {
  if (Number.isFinite(dt) && dt > 0 && dt <= .1) {
    car.itemCooldown = Math.max(0, (car.itemCooldown || 0) - dt);
    if (car.effects.emp !== undefined) car.effects.emp = Math.max(0, car.effects.emp - dt);
    if (car.recoveryTime !== undefined) car.recoveryTime = Math.max(0, car.recoveryTime - dt);
    if (car.multiplierTime !== undefined) car.multiplierTime = Math.max(0, car.multiplierTime - dt);
  }
}
