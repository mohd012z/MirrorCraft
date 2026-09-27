import type {
  Web360Snapshot,
  WebEdge,
  WebEdgeKind,
  WebNode,
  WebStructureGraph,
  WebStructureMap,
} from "@/mirrorcraft/web-structure/types";

const HIERARCHY_EDGE_KINDS = new Set<WebEdgeKind>([
  "contains",
  "child-of",
  "subgroup-of",
  "page-of",
  "tab-of",
]);

function parentChild(edge: WebEdge): { parent: string; child: string } | null {
  if (!HIERARCHY_EDGE_KINDS.has(edge.kind)) return null;

  if (edge.kind === "contains") {
    return { parent: edge.from, child: edge.to };
  }

  return { parent: edge.to, child: edge.from };
}

function hierarchyPairs(graph: WebStructureGraph): Array<{ parent: string; child: string; edge: WebEdge }> {
  return graph.edges.flatMap((edge) => {
    const relation = parentChild(edge);
    return relation ? [{ ...relation, edge }] : [];
  });
}

function wouldCreateHierarchyCycle(
  graph: WebStructureGraph,
  parent: string,
  child: string,
): boolean {
  if (parent === child) return true;

  const queue = [child];
  const visited = new Set<string>();
  const pairs = hierarchyPairs(graph);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (current === parent) return true;

    for (const pair of pairs) {
      if (pair.parent === current) queue.push(pair.child);
    }
  }

  return false;
}

export function createWebStructureGraph(projectId: string): WebStructureGraph {
  return { projectId, nodes: {}, edges: [] };
}

export function addWebNode(graph: WebStructureGraph, node: WebNode): WebStructureGraph {
  if (graph.nodes[node.id]) {
    throw new Error(`Web structure node already exists: ${node.id}`);
  }

  return {
    ...graph,
    nodes: { ...graph.nodes, [node.id]: node },
  };
}

export function addWebEdge(graph: WebStructureGraph, edge: WebEdge): WebStructureGraph {
  if (!graph.nodes[edge.from] || !graph.nodes[edge.to]) {
    throw new Error(`Web structure edge references unknown node: ${edge.from} -> ${edge.to}`);
  }

  const relation = parentChild(edge);
  if (relation && wouldCreateHierarchyCycle(graph, relation.parent, relation.child)) {
    throw new Error(`Web structure hierarchy cycle rejected: ${relation.parent} -> ${relation.child}`);
  }

  const duplicate = graph.edges.some(
    (candidate) =>
      candidate.from === edge.from &&
      candidate.to === edge.to &&
      candidate.kind === edge.kind,
  );
  if (duplicate) return graph;

  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

export function getChildren(graph: WebStructureGraph, nodeId: string): WebNode[] {
  const childIds = hierarchyPairs(graph)
    .filter((pair) => pair.parent === nodeId)
    .map((pair) => pair.child);

  return [...new Set(childIds)]
    .map((id) => graph.nodes[id])
    .filter((node): node is WebNode => Boolean(node));
}

export function getParents(graph: WebStructureGraph, nodeId: string): WebNode[] {
  const parentIds = hierarchyPairs(graph)
    .filter((pair) => pair.child === nodeId)
    .map((pair) => pair.parent);

  return [...new Set(parentIds)]
    .map((id) => graph.nodes[id])
    .filter((node): node is WebNode => Boolean(node));
}

export function getDescendants(graph: WebStructureGraph, nodeId: string): WebNode[] {
  const queue = getChildren(graph, nodeId).map((node) => node.id);
  const visited = new Set<string>();
  const descendants: WebNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const node = graph.nodes[current];
    if (!node) continue;
    descendants.push(node);

    for (const child of getChildren(graph, current)) queue.push(child.id);
  }

  return descendants;
}

export function getAncestors(graph: WebStructureGraph, nodeId: string): WebNode[] {
  const queue = getParents(graph, nodeId).map((node) => node.id);
  const visited = new Set<string>();
  const ancestors: WebNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const node = graph.nodes[current];
    if (!node) continue;
    ancestors.push(node);

    for (const parent of getParents(graph, current)) queue.push(parent.id);
  }

  return ancestors;
}

export function getCrossFunctionLinks(graph: WebStructureGraph, nodeId: string): WebEdge[] {
  return graph.edges.filter(
    (edge) =>
      edge.kind === "cross-function" &&
      (edge.from === nodeId || edge.to === nodeId),
  );
}

export function buildWebStructureMap(graph: WebStructureGraph): WebStructureMap {
  const hierarchyEdges = graph.edges.filter((edge) => HIERARCHY_EDGE_KINDS.has(edge.kind));
  const relationshipEdges = graph.edges.filter((edge) => !HIERARCHY_EDGE_KINDS.has(edge.kind));
  const childIds = new Set(hierarchyPairs(graph).map((pair) => pair.child));
  const roots = Object.values(graph.nodes).filter((node) => !childIds.has(node.id));

  return { roots, hierarchyEdges, relationshipEdges };
}

export function buildWeb360Snapshot(
  graph: WebStructureGraph,
  nodeId: string,
): Web360Snapshot | null {
  const focus = graph.nodes[nodeId];
  if (!focus) return null;

  return {
    focus,
    parents: getParents(graph, nodeId),
    children: getChildren(graph, nodeId),
    ancestors: getAncestors(graph, nodeId),
    descendants: getDescendants(graph, nodeId),
    incoming: graph.edges.filter((edge) => edge.to === nodeId),
    outgoing: graph.edges.filter((edge) => edge.from === nodeId),
    crossFunction: getCrossFunctionLinks(graph, nodeId),
  };
}

export function validateWebStructure(graph: WebStructureGraph): string[] {
  const issues: string[] = [];

  for (const edge of graph.edges) {
    if (!graph.nodes[edge.from]) issues.push(`Missing source node: ${edge.from}`);
    if (!graph.nodes[edge.to]) issues.push(`Missing target node: ${edge.to}`);

    const relation = parentChild(edge);
    if (relation && relation.parent === relation.child) {
      issues.push(`Hierarchy self-cycle: ${relation.parent}`);
    }
  }

  const pairs = hierarchyPairs(graph);
  for (const pair of pairs) {
    const graphWithoutCurrentEdge: WebStructureGraph = {
      ...graph,
      edges: graph.edges.filter((edge) => edge !== pair.edge),
    };
    if (wouldCreateHierarchyCycle(graphWithoutCurrentEdge, pair.parent, pair.child)) {
      issues.push(`Hierarchy cycle: ${pair.parent} -> ${pair.child}`);
    }
  }

  return [...new Set(issues)];
}
