type Point = readonly [number, number, number];
type Kind = 'start' | 'checkpoint' | 'split' | 'merge' | 'finish';
type Authored = {
  readonly id: string;
  readonly topologyVersion: number;
  readonly nodes: Readonly<Record<string, { readonly kind: Kind; readonly position: Point }>>;
  readonly edges: readonly {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly role: 'main' | 'shortcut';
    readonly surface: string;
    readonly widthMeters: number;
    readonly controlPoints: readonly Point[];
  }[];
  readonly checkpoints: readonly string[];
};

/** Adapt map-authored data to the shared CourseGraph contract, without another route sampler. */
export function createDuneCourseGraph(course: Authored) {
  for (const edge of course.edges) {
    if (edge.controlPoints.length < 2 ||
      edge.controlPoints.some(p => p.length !== 3 || !p.every(Number.isFinite))) {
      throw new Error('Dune CourseGraph: invalid finite geometry ' + edge.id);
    }
  }
  const byFrom = new Map<string, Authored['edges'][number][]>();
  for (const edge of course.edges) {
    if (edge.role !== 'main') continue;
    const entries = byFrom.get(edge.from) ?? [];
    entries.push(edge);
    byFrom.set(edge.from, entries);
  }
  const groundRoute: string[] = [], visited = new Set<string>();
  let at = 'start';
  while (at !== 'finish') {
    if (visited.has(at)) throw new Error('Dune CourseGraph: cycle in main ground route at ' + at);
    visited.add(at);
    const choices = byFrom.get(at) ?? [];
    if (choices.length !== 1 || choices[0].surface === 'air-route') {
      throw new Error('Dune CourseGraph: missing or ambiguous main ground route at ' + at);
    }
    groundRoute.push(choices[0].id);
    at = choices[0].to;
  }
  return {
    id: course.id, version: course.topologyVersion, start: 'start', finish: 'finish',
    nodes: Object.entries(course.nodes).map(([id, n]) => ({ id, kind: n.kind, at: n.position })),
    edges: course.edges.map(e => ({
      id: e.id, from: e.from, to: e.to, points: e.controlPoints,
      width: e.widthMeters, mode: e.surface === 'air-route' ? 'flight' as const : 'ground' as const,
      surface: e.surface,
    })),
    checkpoints: course.checkpoints,
    groundRoute,
  };
}
