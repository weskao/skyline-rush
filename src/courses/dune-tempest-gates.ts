type Point3 = readonly [number, number, number];
type Node = { readonly position: Point3 };
type Edge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly role: 'main' | 'shortcut';
  readonly widthMeters: number;
  readonly controlPoints: readonly Point3[];
};
type Course = {
  readonly nodes: Readonly<Record<string, Node>>;
  readonly edges: readonly Edge[];
  readonly checkpoints: readonly string[];
};
export type DirectionalGate = Readonly<{
  id: string;
  order: number;
  nodeId: string;
  approachEdgeId: string;
  center: Point3;
  forwardXZ: readonly [number, number];
  halfWidthMeters: number;
  minRelativeAltitudeMeters: number;
  maxRelativeAltitudeMeters: number;
}>;

/** Map-owned authored gate descriptors; shared race runtime owns crossing/progression. */
export function buildDuneGates(course: Course): readonly DirectionalGate[] {
  return [...course.checkpoints, 'finish'].map((nodeId, index) => {
    const center = course.nodes[nodeId]?.position;
    const incoming = course.edges.filter(edge => edge.to === nodeId && edge.role === 'main');
    if (!center || incoming.length !== 1) {
      throw new Error(`Dune gate ${nodeId}: expected one incoming main edge`);
    }
    const edge = incoming[0];
    const points = edge.controlPoints;
    const previous = points.at(-2);
    const last = points.at(-1);
    if (!previous || !last || last.some((v, i) => v !== center[i])) {
      throw new Error(`Dune gate ${nodeId}: invalid final road segment`);
    }
    const dx = center[0] - previous[0], dz = center[2] - previous[2];
    const length = Math.hypot(dx, dz);
    if (!Number.isFinite(length) || length < 1 || !(edge.widthMeters > 0)) {
      throw new Error(`Dune gate ${nodeId}: degenerate road direction or width`);
    }
    return {
      id: nodeId, nodeId, order: index + 1, approachEdgeId: edge.id,
      center, forwardXZ: [dx / length, dz / length] as const,
      halfWidthMeters: edge.widthMeters / 2 + 3,
      minRelativeAltitudeMeters: -6,
      maxRelativeAltitudeMeters: 22,
    };
  });
}

/** Pure map-owned gate geometry; shared race runtime decides checkpoint order.
 * Rejects non-physical (>90 m) single-sample jumps; runtime must substep longer updates.
 */
export function crossesDuneGate(gate: DirectionalGate, previous: Point3, current: Point3,
  approachEdgeId: string): boolean {
  if (approachEdgeId !== gate.approachEdgeId ||
    !previous.every(Number.isFinite) || !current.every(Number.isFinite)) return false;

  const dx = current[0] - previous[0], dz = current[2] - previous[2];
  const distance = Math.hypot(dx, dz);
  const [fx, fz] = gate.forwardXZ;
  const forward = dx * fx + dz * fz;
  if (distance === 0 || distance > 90 || forward / distance < 0.55) return false;

  const signed = (p: Point3) => (p[0] - gate.center[0]) * fx + (p[2] - gate.center[2]) * fz;
  const before = signed(previous), after = signed(current);
  if (!(before < 0 && after >= 0)) return false;

  const t = -before / (after - before);
  const x = previous[0] + dx * t - gate.center[0];
  const z = previous[2] + dz * t - gate.center[2];
  const lateral = -fz * x + fx * z;
  const altitude = previous[1] + (current[1] - previous[1]) * t - gate.center[1];
  return Math.abs(lateral) <= gate.halfWidthMeters + 1e-7 &&
    altitude >= gate.minRelativeAltitudeMeters && altitude <= gate.maxRelativeAltitudeMeters;
}
