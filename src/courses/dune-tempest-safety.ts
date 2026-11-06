type Point3 = readonly [number, number, number];
type Hazard = { readonly id: string; readonly edgeId: string; readonly lateralMeters: number;
  readonly collisionRadiusMeters: number; readonly aiPreviewMeters: number;
  readonly safePassSide: 'left' | 'right' };

/** Advisory for the existing AI; no steering controller or parallel AI engine. */
export function duneAvoidanceHint(hazard: Hazard, roadWidth: number,
  carHalfWidth = 1.5, clearance = 2) {
  if (![roadWidth, carHalfWidth, clearance, hazard.lateralMeters, hazard.collisionRadiusMeters].every(Number.isFinite) ||
    roadWidth <= 0 || carHalfWidth <= 0 || clearance < 0 || hazard.collisionRadiusMeters <= 0) {
    throw new RangeError('Invalid Dune obstacle avoidance geometry');
  }
  const safeSide = hazard.safePassSide === 'right' ? 1 : -1;
  const targetLateralMeters = hazard.lateralMeters + safeSide *
    (hazard.collisionRadiusMeters + carHalfWidth + clearance);
  const limit = roadWidth / 2 - carHalfWidth - clearance;
  if (limit <= 0 || Math.abs(targetLateralMeters) > limit) return {
    hazardId: hazard.id, action: 'brake' as const,
    targetLateralMeters: null, previewMeters: hazard.aiPreviewMeters,
  };
  return { hazardId: hazard.id, action: 'dodge' as const,
    targetLateralMeters, previewMeters: hazard.aiPreviewMeters };
}

type OffroadZone = { readonly edgeId: string; readonly startFraction: number;
  readonly endFraction: number; readonly widthMeters: number; readonly recoveryBufferMeters: number };
type Frame = { readonly point: Point3; readonly right: Point3; readonly up: Point3 };

/** Map-owned warning/recovery intent; shared physics must validate the candidate's road collision. */
export function duneRecoveryAdvice(zone: OffroadZone, edgeLength: number, localS: number,
  lateral: number, sample: (edgeId: string, localS: number) => Frame) {
  if (![edgeLength, localS, lateral].every(Number.isFinite) || edgeLength <= 0) {
    throw new RangeError('Invalid Dune recovery input');
  }
  if (localS < zone.startFraction * edgeLength || localS > zone.endFraction * edgeLength)
    return {status:'outside-zone' as const};
  const distance = Math.abs(lateral);
  if (distance <= zone.widthMeters / 2) return {status:'safe' as const};
  if (distance <= zone.widthMeters / 2 + zone.recoveryBufferMeters)
    return {status:'warn' as const};
  return { status:'recover' as const, candidatePosition: [...sample(zone.edgeId, localS).point],
    edgeId:zone.edgeId, localS, targetLateralMeters:0,
    requiresCollisionClearanceCheck:true as const };
}

/** Real landing pad location from the authored aerial route; no flight motion is simulated here. */
export function duneLandingEnvelope(edgeId: string, edgeLength: number,
  landing: {readonly clearLengthMeters:number;readonly recoveryEdgeId:string}) {
  if (!Number.isFinite(edgeLength) || !(edgeLength >= landing.clearLengthMeters) ||
    !(landing.clearLengthMeters > 0) || !landing.recoveryEdgeId) {
    throw new RangeError('Invalid Dune landing envelope length/fallback');
  }
  return {edgeId, startS:edgeLength - landing.clearLengthMeters, endS:edgeLength,
    fallbackEdgeId:landing.recoveryEdgeId};
}
