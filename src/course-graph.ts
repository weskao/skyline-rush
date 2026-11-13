/** Opt-in point-to-point route graph. Legacy RACE_TRACKS and their distance axes are untouched. */
export type CoursePoint3 = readonly [x: number, y: number, z: number];
export type CourseNodeKind = 'start' | 'split' | 'merge' | 'checkpoint' | 'finish';
export interface CourseNode { readonly id: string; readonly kind: CourseNodeKind; readonly at: CoursePoint3 }
export interface CourseEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly points: readonly CoursePoint3[];
  readonly width: number;
  readonly mode: 'ground' | 'flight';
  readonly surface?: string;
  readonly layer?: string;
}
export interface CourseGraph {
  readonly id: string;
  readonly version: number;
  readonly start: string;
  readonly finish: string;
  readonly nodes: readonly CourseNode[];
  readonly edges: readonly CourseEdge[];
  /** Mandatory nodes crossed on EVERY legal start-to-finish path, in this order. */
  readonly checkpoints: readonly string[];
  /** Ordered safe ground edges connecting start to finish without using flight. */
  readonly groundRoute: readonly string[];
  /** Metres over which route frames converge at a join with the ground route. */
  readonly groundJoinBlend?: number;
}

const finitePoint = (p: CoursePoint3): boolean =>
  Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const close = (a: CoursePoint3, b: CoursePoint3): boolean =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.01;
const check = (ok: unknown, problem: string): void => { if (!ok) throw new Error(`Invalid CourseGraph: ${problem}`); };

/** Reject unreachable choices, cycles and shortcuts that bypass mandatory checkpoints. */
export function validateCourseGraph(graph: CourseGraph): CourseGraph {
  check(Boolean(graph.id) && Number.isSafeInteger(graph.version) && graph.version > 0, 'id/version');
  const nodes = new Map<string, CourseNode>();
  for (const node of graph.nodes) {
    check(Boolean(node.id) && !nodes.has(node.id), `duplicate node ${node.id}`);
    check(['start', 'split', 'merge', 'checkpoint', 'finish'].includes(node.kind) && finitePoint(node.at), `node point ${node.id}`);
    nodes.set(node.id, node);
  }
  check(graph.start !== graph.finish && nodes.get(graph.start)?.kind === 'start' && nodes.get(graph.finish)?.kind === 'finish', 'distinct start/finish');
  check(!close(nodes.get(graph.start)!.at, nodes.get(graph.finish)!.at), 'distinct start/finish position');
  check([...nodes.values()].filter(n => n.kind === 'start').length === 1 && [...nodes.values()].filter(n => n.kind === 'finish').length === 1, 'multiple start/finish');

  const edges = new Map<string, CourseEdge>();
  const next = new Map<string, string[]>([...nodes.keys()].map(id => [id, []]));
  for (const edge of graph.edges) {
    check(Boolean(edge.id) && !edges.has(edge.id), `duplicate edge ${edge.id}`);
    check(nodes.has(edge.from) && nodes.has(edge.to) && edge.from !== edge.to, `edge endpoints ${edge.id}`);
    check(edge.mode === 'ground' || edge.mode === 'flight', `mode ${edge.id}`);
    check(Number.isFinite(edge.width) && edge.width > 0, `width ${edge.id}`);
    check(edge.points.length >= 2 && edge.points.every(finitePoint), `finite points ${edge.id}`);
    check(close(edge.points[0], nodes.get(edge.from)!.at) && close(edge.points.at(-1)!, nodes.get(edge.to)!.at), `endpoint geometry ${edge.id}`);
    check(edge.points.some((p, i) => i > 0 && !close(p, edge.points[i - 1])), `zero-length geometry ${edge.id}`);
    edges.set(edge.id, edge);
    next.get(edge.from)!.push(edge.to);
  }

  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(id: string): void {
    check(!visiting.has(id), 'cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const to of next.get(id)!) visit(to);
    visiting.delete(id); visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  const reachable = (from: string, to: string, excluded = ''): boolean => {
    const queue = [from], seen = new Set<string>([excluded]);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (id === to) return true;
      if (seen.has(id)) continue;
      seen.add(id); queue.push(...next.get(id)!);
    }
    return false;
  };
  for (const id of nodes.keys()) {
    check(reachable(graph.start, id), `unreachable node ${id}`);
    check(reachable(id, graph.finish), `dead-end ${id}`);
  }
  check(graph.checkpoints.length > 0 && new Set(graph.checkpoints).size === graph.checkpoints.length, 'checkpoint list');
  for (const [i, cp] of graph.checkpoints.entries()) {
    check(nodes.get(cp)?.kind === 'checkpoint', `checkpoint node ${cp}`);
    check(!reachable(graph.start, graph.finish, cp), `checkpoint bypass ${cp}`);
    if (i > 0) check(reachable(graph.checkpoints[i - 1], cp), `checkpoint order ${cp}`);
  }
  check(graph.groundRoute.length > 0, 'ground route missing');
  let location = graph.start;
  const groundNodes = new Set<string>([location]);
  for (const id of graph.groundRoute) {
    const edge = edges.get(id);
    check(edge?.mode === 'ground' && edge.from === location, `ground route ${id}`);
    location = edge!.to; groundNodes.add(location);
  }
  check(location === graph.finish && graph.checkpoints.every(cp => groundNodes.has(cp)), 'ground route misses finish/checkpoint');
  return graph;
}
