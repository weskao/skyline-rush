// Small optional active item slot for unranked practice; never changes Classic ring rewards.
const DURATIONS = { shield: 10, magnet: 5, ghost: 3, freeze: 2 };
export function bankItem(car, item) {
  if (!car || car.heldItem || !Object.hasOwn(DURATIONS, item)) return false;
  car.heldItem = item;
  return true;
}
export function activateItem(car, hasRivals = true) {
  if (!car?.heldItem || car.itemCooldown > 0) return null;
  const effect = car.heldItem === 'freeze' && !hasRivals ? 'magnet' : car.heldItem;
  car.effects[effect] = Math.max(car.effects[effect] || 0, DURATIONS[effect]);
  car.heldItem = null;
  car.itemCooldown = .7;
  return effect;
}
export function tickItemCooldown(car, dt) {
  if (Number.isFinite(dt) && dt > 0 && dt <= .1)
    car.itemCooldown = Math.max(0, (car.itemCooldown || 0) - dt);
}
