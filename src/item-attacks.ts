import { activateItem, EMP_DURATION, ITEM_COOLDOWN, type ActiveItemCar } from './active-items.ts';
import { carGap } from './course-race-step.ts';
import type { CourseRuntime } from './course-race.ts';
import { EFFECT_TIMES } from './ring-layout.ts';

export const ITEM_HIT_SPEED = 0.5;
const EMP_RANGE = 30;

export type ItemAttack = 'emp' | 'freeze';
export interface ItemHits {
  empUntil?: number;
  freezeUntil?: number;
}

const expiration = { emp: 'empUntil', freeze: 'freezeUntil' } as const;
interface AttackCar extends ItemHits {
  distance: number;
  x: number;
  altitude?: number;
  id?: string;
  finishTime?: number | null;
  heldAttack?: ItemAttack;
  attackReadyAt?: number;
}
interface AttackRace {
  trackId: string;
  elapsed: number;
  course?: CourseRuntime;
  player: AttackCar & { speed: number };
  rivals: readonly AttackCar[];
}

export function itemHit(race: { elapsed: number }, car: ItemHits): ItemAttack | null {
  if ((car.empUntil ?? 0) > race.elapsed) return 'emp';
  return (car.freezeUntil ?? 0) > race.elapsed ? 'freeze' : null;
}

export function rivalItemHit(race: { elapsed: number; player: { effects?: { freeze?: number } } }, rival: ItemHits): ItemAttack | null {
  // The player's outgoing Freeze also covers Classic's immediate mystery ring effect.
  return itemHit(race, rival) ?? ((race.player.effects?.freeze ?? 0) > 0 ? 'freeze' : null);
}

function applyAttack(race: AttackRace, attacker: AttackCar, item: ItemAttack): boolean {
  const until = race.elapsed + (item === 'emp' ? EMP_DURATION : EFFECT_TIMES.freeze);
  const timer = expiration[item];
  function hit(target: AttackCar): boolean {
    if (target === attacker || target.finishTime != null) return false;
    if (item === 'emp') {
      const gap = carGap(race, attacker, target);
      if (gap === null || Math.hypot(gap, target.x - attacker.x, (target.altitude ?? 0) - (attacker.altitude ?? 0)) > EMP_RANGE) return false;
    }
    // Rivals scale their driving pace. The player's stored speed also drives the HUD and course sweep.
    if (target === race.player && !itemHit(race, target)) race.player.speed *= ITEM_HIT_SPEED;
    target[timer] = until;
    return true;
  }
  let hitAnyone = hit(race.player);
  for (const rival of race.rivals) if (hit(rival)) hitAnyone = true;
  return hitAnyone;
}

export interface PlayerItemRace extends AttackRace {
  mode: string;
  phase: string;
  config: { activeItems?: boolean; itemRules?: string };
  player: AttackRace['player'] & ActiveItemCar;
}

export function useHeldItem(race: PlayerItemRace | null | undefined) {
  if (!race?.config?.activeItems || race.phase !== 'racing') return null;
  if (race.player.heldItem === 'emp' && (race.mode !== 'custom' || race.config.itemRules !== 'all')) race.player.heldItem = 'magnet';
  const item = activateItem(race.player, race.rivals.length > 0);
  if (item === 'emp') applyAttack(race, race.player, item);
  return item;
}

export function stepRivalAttacks(race: AttackRace & { phase: string; config: { activeItems?: boolean } }): void {
  if (race.phase !== 'racing') return;
  for (const rival of race.rivals) {
    const item = rival.heldAttack;
    if (!item || rival.finishTime != null || (rival.attackReadyAt ?? 0) > race.elapsed) continue;
    if (!applyAttack(race, rival, item)) continue; // Hold EMP until a racer is in range.
    delete rival.heldAttack;
    if (race.config.activeItems) rival.attackReadyAt = race.elapsed + ITEM_COOLDOWN;
  }
}
