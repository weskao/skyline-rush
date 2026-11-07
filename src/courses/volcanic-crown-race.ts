// RED-stage stub; wiring to the authored ground route is performed in the GREEN commit.
export const VOLCANIC_ID = 'volcanic-crown';
export const VOLCANIC_TRACK = { name: 'Volcanic Crown', length: 0, trafficDensity: 1, seed: 14014,
  sections: [], topology: 'course-graph', topologyVersion: 1 };
export const volcanicLeg = () => ({ edgeId: 'ground-0', localS: 0 });
export const volcanicFrame = () => ({ point: { x: 0, y: 0, z: 0 }, forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] });
