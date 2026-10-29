import type { RaceRing } from './ring-layout.ts';
import { bankItem, type ActiveItemCar } from './active-items.ts';

export type BonusGate = 'speed-pad' | 'air-pad' | 'recovery-pad' | 'score-pad' | 'emp';
export interface BonusCar extends ActiveItemCar {
  distance: number; x: number; altitude: number; fuel: number; miniBoost: number;
  lastBonus?: { type: BonusGate; time: number };
}
interface BonusRace {
  mode: string; elapsed: number; player: BonusCar;
  rivals: { distance: number; x: number; altitude?: number; empUntil?: number }[];
}
interface BonusConfig { mode: string; rivals: number; itemRules?: string; bonusGates?: boolean }

// Reuse authored reachable geometry; switching a rule never reshuffles or adds positions.
export function decorateBonusGates(rings: RaceRing[], config: BonusConfig): RaceRing[] {
  const style = config.mode === 'stunt' || config.mode === 'checkpoint';
  if (!(style && config.bonusGates) && !(['custom', 'free'].includes(config.mode) && config.itemRules === 'all')) return rings;
  const types: BonusGate[] = ['speed-pad', 'air-pad', 'recovery-pad'];
  if (style) types.push('score-pad');
  else if (config.mode === 'custom' && config.rivals > 0) types.push('emp');
  let index = 0;
  return rings.map(ring => ring.type === 'mystery' ? ring : { ...ring, type: types[index++ % types.length] });
}

export function collectBonusGate(race: BonusRace, ring: RaceRing): void {
  const car = race.player;
  const type = ring.type;
  if (type === 'speed-pad') car.miniBoost = Math.max(car.miniBoost, 1.2);
  else if (type === 'air-pad') car.fuel = Math.min(100, car.fuel + 25);
  else if (type === 'recovery-pad') car.recoveryTime = 5;
  else if (type === 'score-pad' && ['stunt', 'checkpoint'].includes(race.mode)) car.multiplierTime = 5;
  else if (type === 'emp' && race.mode === 'custom' && race.rivals.length > 0) bankItem(car, 'emp');
  else return;
  car.lastBonus = { type: type as BonusGate, time: race.elapsed };
}

export function applyEMPPulse(race: BonusRace): void {
  const car = race.player;
  for (const rival of race.rivals) if (Math.hypot(rival.distance - car.distance, rival.x - car.x,
    (rival.altitude ?? 0) - car.altitude) <= 30) rival.empUntil = race.elapsed + 1.5;
}

export function recoveryRetention(car: ActiveItemCar, retention: number): number {
  if (!(car.recoveryTime! > 0)) return retention;
  car.recoveryTime = 0;
  return Math.max(.85, retention);
}

export function bonusScore(car: ActiveItemCar, mode: string, earned: number): number {
  return car.multiplierTime! > 0 && ['stunt', 'checkpoint'].includes(mode) && Number.isFinite(earned) && earned > 0 ? earned : 0;
}
