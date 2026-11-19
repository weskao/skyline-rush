// The three Crucible study angles, followed by a full-car title shot. +Z is the rear.
const shots = [
  { name: 'signature', end: 1600, from: [2.67, .12, .93, -.08], to: [2.55, .095, 1.01, -.12] },
  { name: 'profile', end: 3150, from: [1.78, .13, .89, -.025], to: [1.34, .11, .94, .035] },
  { name: 'thrusters', end: 4700, from: [.57, .135, .99, .13], to: [.35, .075, 1.30, .30] },
  { name: 'hero', end: 6550, from: [2.40, .19, .86, 0], to: [2.54, .175, .94, 0] },
] as const;

export type CarRevealShot = typeof shots[number]['name'];
export const CAR_REVEAL_MS = shots[shots.length - 1].end;
export const CAR_REVEAL_FOV = 33;

export function carRevealShot(milliseconds: number) {
  const time = Math.max(0, milliseconds);
  const index = shots.findIndex(shot => time < shot.end);
  const i = index < 0 ? shots.length - 1 : index;
  const shot = shots[i]!;
  const start = i ? shots[i - 1]!.end : 0;
  const u = Math.min(1, (time - start) / (shot.end - start));
  const ease = u * u * (3 - 2 * u);
  const at = (axis: 0 | 1 | 2 | 3) => shot.from[axis] + (shot.to[axis] - shot.from[axis]) * ease;
  return { name: shot.name, yaw: at(0), pitch: at(1), fill: at(2), focus: at(3) };
}
