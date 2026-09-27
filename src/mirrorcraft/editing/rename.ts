import type {
  Code360Edge,
  Code360Graph,
  Code360Node,
} from "@/mirrorcraft/code360";

export type RenameKind = "symbol" | "route" | "component" | "token" | "asset";

export interface RenameRequest {
  targetId: string;
  kind: RenameKind;
  from: string;
  to: string;
}

export interface RenameImpact {
  targetId: string;
  kind: RenameKind;
  from: string;
  to: string;
  affectedNodeIds: readonly string[];
  affectedEdges: readonly Code360Edge[];
  atomic: true;
  reversible: true;
  baseSignature: string;
  before: Code360Graph;
  after: Code360Graph;
}

function cloneGraph(graph: Code360Graph): Code360Graph {
  return structuredClone(graph);
}

function stableGraphSignature(graph: Code360Graph): string {
  const nodes = Object.keys(graph.nodes)
    .sort()
    .map((id) => [id, graph.nodes[id]]);
  const edges = [...graph.edges].sort((left, right) => {
    const a = `${left.from}\u0000${left.type}\u0000${left.to}\u0000${JSON.stringify(left.metadata ?? {})}`;
    const b = `${right.from}\u0000${right.type}\u0000${right.to}\u0000${JSON.stringify(right.metadata ?? {})}`;
    return a.localeCompare(b);
  });
  return JSON.stringify({ nodes, edges });
}

function replaceStructuredValue(value: unknown, from: string, to: string): unknown {
  if (value === from) return to;
  if (Array.isArray(value)) {
    return value.map((item) => replaceStructuredValue(item, from, to));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceStructuredValue(item, from, to),
      ]),
    );
  }
  return value;
}

function metadataChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  return JSON.stringify(before ?? {}) !== JSON.stringify(after ?? {});
}

function rewriteNode(
  node: Code360Node,
  request: RenameRequest,
): { node: Code360Node; changed: boolean } {
  const next: Code360Node = {
    ...node,
    metadata: node.metadata
      ? (replaceStructuredValue(node.metadata, request.from, request.to) as Record<
          string,
          unknown
        >)
      : undefined,
  };

  let changed = metadataChanged(node.metadata, next.metadata);

  if (request.kind === "route" && node.routeId === request.from) {
    next.routeId = request.to;
    changed = true;
  }

  if (node.id === request.targetId && node.label === request.from) {
    next.label = request.to;
    changed = true;
  }

  return { node: next, changed };
}

function rewriteEdge(
  edge: Code360Edge,
  request: RenameRequest,
): { edge: Code360Edge; changed: boolean } {
  if (!edge.metadata) return { edge: { ...edge }, changed: false };
  const metadata = replaceStructuredValue(
    edge.metadata,
    request.from,
    request.to,
  ) as Record<string, unknown>;
  return {
    edge: { ...edge, metadata },
    changed: metadataChanged(edge.metadata, metadata),
  };
}

function validateRequest(graph: Code360Graph, request: RenameRequest): void {
  if (!request.targetId.trim()) throw new Error("Rename targetId is required");
  if (!request.from.trim() || !request.to.trim()) {
    throw new Error("Rename from/to values are required");
  }
  if (request.from === request.to) throw new Error("Rename values must differ");
  if (!graph.nodes[request.targetId]) {
    throw new Error(`Rename target does not exist: ${request.targetId}`);
  }
}

export function planRename(
  graph: Code360Graph,
  request: RenameRequest,
): RenameImpact {
  validateRequest(graph, request);
  const before = cloneGraph(graph);
  const changedNodeIds = new Set<string>();
  const nodes: Code360Graph["nodes"] = {};

  for (const [id, node] of Object.entries(graph.nodes)) {
    const rewritten = rewriteNode(node, request);
    nodes[id] = rewritten.node;
    if (rewritten.changed) changedNodeIds.add(id);
  }

  const affectedEdges: Code360Edge[] = [];
  const edges = graph.edges.map((edge) => {
    const rewritten = rewriteEdge(edge, request);
    const touchesTarget = edge.from === request.targetId || edge.to === request.targetId;
    if (rewritten.changed || touchesTarget) {
      affectedEdges.push(rewritten.edge);
      changedNodeIds.add(edge.from);
      changedNodeIds.add(edge.to);
    }
    return rewritten.edge;
  });

  if (!changedNodeIds.has(request.targetId)) {
    throw new Error(
      `Rename precondition failed: ${request.targetId} does not reference ${request.from}`,
    );
  }

  return {
    targetId: request.targetId,
    kind: request.kind,
    from: request.from,
    to: request.to,
    affectedNodeIds: [...changedNodeIds].sort(),
    affectedEdges,
    atomic: true,
    reversible: true,
    baseSignature: stableGraphSignature(graph),
    before,
    after: { nodes, edges },
  };
}

export function applyRenamePlan(
  graph: Code360Graph,
  plan: RenameImpact,
): Code360Graph {
  if (stableGraphSignature(graph) !== plan.baseSignature) {
    throw new Error("Rename plan is stale and cannot be applied atomically");
  }
  return cloneGraph(plan.after);
}

export function rollbackRename(plan: RenameImpact): Code360Graph {
  return cloneGraph(plan.before);
}
