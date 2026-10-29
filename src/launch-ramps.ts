// One launch rule for Sky Spiral's track ramps and Event Lab's authored ramps.
export const LAUNCH_MIN_SPEED = 32; // m/s
export const launchImpulse = (speed: number): number => 6 + speed * 0.075;

export interface LaunchRamp { readonly distance: number; readonly x: number; readonly halfWidth: number; readonly halfLength: number; readonly height: number }

/** True when a car will cross an authored ramp's lip within `ahead` metres, inside its width. */
export function crossesRamp(ramps: readonly LaunchRamp[] | undefined, car: { distance: number; x: number }, ahead: number): boolean {
  if (!ramps) return false;
  for (const ramp of ramps) {
    const lip = ramp.distance + ramp.halfLength;
    if (lip >= car.distance && lip <= car.distance + ahead && Math.abs(car.x - ramp.x) <= ramp.halfWidth) return true;
  }
  return false;
}
