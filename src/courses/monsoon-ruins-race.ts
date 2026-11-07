// RED-stage stub for Monsoon's unconnected shared race engine.
export const MONSOON_ID = 'monsoon-ruins';
export const MONSOON_TRACK = { name: 'Monsoon Ruins', length: 0, trafficDensity: 1, seed: 15015,
  sections: [], topology: 'course-graph', topologyVersion: 1 };
export const monsoonLeg = () => ({ edgeId: 'monsoon-ground-0', localS: 0 });
export const monsoonFrame = () => ({ point: { x: 0, y: 0, z: 0 }, forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] });
