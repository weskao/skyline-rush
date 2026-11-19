// A single shot sequence for every catalog vehicle. +Z is the rear of the model.
const shots = [
  { name: 'signature', end: 850, from: [2.95, .115], to: [2.63, .18], fill: .91 },
  { name: 'profile', end: 1750, from: [1.79, .13], to: [1.42, .19], fill: .88 },
  { name: 'thrusters', end: 2650, from: [.74, .12], to: [.42, .16], fill: .93 },
  { name: 'hero', end: 3750, from: [2.24, .24], to: [2.56, .23], fill: .86 },
] as const;

export const CAR_REVEAL_MS = shots[shots.length - 1].end;
export const CAR_REVEAL_FOV = 36;

export function carRevealShot(milliseconds: number) {
  const time = Math.max(0, milliseconds);
  const index = shots.findIndex(shot => time < shot.end);
  const i = index < 0 ? shots.length - 1 : index;
  const shot = shots[i]!;
  const start = i ? shots[i - 1]!.end : 0;
  const u = Math.min(1, (time - start) / (shot.end - start));
  const ease = u * u * (3 - 2 * u);
  return {
    name: shot.name,
    yaw: shot.from[0] + (shot.to[0] - shot.from[0]) * ease,
    pitch: shot.from[1] + (shot.to[1] - shot.from[1]) * ease,
    fill: shot.fill,
  };
}
