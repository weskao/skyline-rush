// Framing studied on both catalog cars in Crucible. +Z is the rear, yaw < 0 puts the key light on the visible flank.
// Pose: yaw, pitch, bounds fill, longitudinal focus (half-lengths from centre), vertical FOV.
const shots = [
  { name: 'signature', end: 980, from: [-2.88, .115, 1.04, -.22, 30], to: [-2.66, .125, 1.14, -.30, 30] },
  { name: 'thrusters', end: 2150, from: [-.43, .11, 1.13, .28, 32], to: [-.66, .18, 1.06, .28, 32] },
  { name: 'profile', end: 3580, from: [-1.36, .22, .96, .09, 34], to: [-1.89, .28, .87, -.07, 34] },
  { name: 'hero', end: 5800, from: [-2.24, .25, .91, -.04, 35], to: [-2.42, .24, .79, 0, 37] },
] as const;

export type CarRevealShot = typeof shots[number]['name'];
export const CAR_REVEAL_MS = shots[shots.length - 1].end;
export const CAR_REVEAL_CUE_SECONDS: Readonly<Record<string, number | undefined>> = Object.fromEntries(
  shots.map((shot, i) => ['acquisition-car-' + shot.name, (shot.end - (shots[i - 1]?.end ?? 0)) / 1000]),
);

export function carRevealShot(milliseconds: number) {
  const time = Math.max(0, milliseconds);
  const index = shots.findIndex(shot => time < shot.end);
  const i = index < 0 ? shots.length - 1 : index;
  const shot = shots[i]!;
  const start = shots[i - 1]?.end ?? 0;
  const moveEnd = shot.name === 'hero' ? 5050 : shot.end;
  const u = Math.min(1, (time - start) / (moveEnd - start));
  const ease = u * u * (3 - 2 * u);
  const at = (axis: 0 | 1 | 2 | 3 | 4) => shot.from[axis] + (shot.to[axis] - shot.from[axis]) * ease;
  return { name: shot.name, yaw: at(0), pitch: at(1), fill: at(2), focus: at(3), fov: at(4) };
}
