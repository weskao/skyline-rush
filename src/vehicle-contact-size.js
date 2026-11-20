// Neutral race models, in road metres. Front and rear are measured from the
// model pivot, so the same pair can need a different gap in the opposite order.
// The player envelope covers the procedural Roadster and the fitted race GLBs.
const size = (halfWidth, front, rear) => ({ halfWidth, front, rear });
const PLAYER = size(1.25, 2.79, 2.54);
const RIVALS = {
  NOVA: size(1.20, 2.53, 2.74), ORBIT: size(1.20, 2.39, 2.29),
  APEX: size(1.20, 2.68, 2.31), VEGA: size(1.23, 2.56, 2.46),
  PULSE: size(1.20, 2.13, 2.13), COMET: size(1.20, 2.66, 2.31),
  RIFT: size(1.22, 2.64, 2.47),
};
const TRAFFIC = [size(1.15, 2.29, 2.19), size(1.15, 2.22, 2.18), size(1.15, 1.89, 1.82)];
export const TRAFFIC_DISPLAY_SCALE = 0.96;
export const trafficBodyIndex = index => index % TRAFFIC.length;
export const vehicleContactSize = (race, car) => car === race.player ? PLAYER :
  RIVALS[car.name] ?? TRAFFIC[trafficBodyIndex(Math.max(0, race.traffic.indexOf(car)))];

export const bodiesShareHeight = (a, b) => Math.abs((a.altitude || 0) - (b.altitude || 0)) < 1.8;
