import type {
  Code360Edge,
  Code360EdgeType,
  Code360Graph,
  Code360Node,
  Code360NodeType,
} from "@/mirrorcraft/code360";
import type { WebEdge, WebNode, WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export function mapWebNodeToCode360NodeType(node: WebNode): Code360NodeType {
  switch (node.kind) {
    case "base":
    case "group":
    case "subgroup":
      return "group";
    case "page":
      return "page";
    case "tab":
    case "container":
      return "container";
    case "child":
      return "dom-node";
    case "content":
      return "content";
    case "database":
      return "database";
    case "function":
      return "function";
    case "api":
      return "api-endpoint";
    case "route":
      return "route";
    case "asset":
      return "asset";
  }
}

export function mapWebEdgeToCode360EdgeType(edge: WebEdge): Code360EdgeType {
  switch (edge.kind) {
    case "contains":
    case "child-of":
    case "subgroup-of":
    case "page-of":
    case "tab-of":
      return "contains";
    case "binds-content":
      return "binds";
    case "reads-data":
      return "reads";
    case "writes-data":
      return "writes";
    case "invokes":
    case "cross-function":
    case "calls-api":
      return "calls";
    case "navigates-to":
      return "navigates-to";
    case "inherits-from":
      return "inherits";
    case "uses-asset":
      return "uses-asset";
  }
}

function normalizeHierarchyDirection(edge: WebEdge): Pick<Code360Edge, "from" | "to"> {
  switch (edge.kind) {
    case "child-of":
    case "subgroup-of":
    case "page-of":
    case "tab-of":
      return { from: edge.to, to: edge.from };
    default:
      return { from: edge.from, to: edge.to };
  }
}

function toCode360Node(node: WebNode): Code360Node {
  return {
    id: node.id,
    type: mapWebNodeToCode360NodeType(node),
    label: node.label,
    routeId: node.route,
    sourcePath: node.sourcePath,
    sourceLine: node.sourceLine,
    metadata: {
      ...(node.metadata ?? {}),
      webNodeKind: node.kind,
    },
  };
}

function toCode360Edge(edge: WebEdge): Code360Edge {
  const direction = normalizeHierarchyDirection(edge);
  return {
    ...direction,
    type: mapWebEdgeToCode360EdgeType(edge),
    metadata: {
      ...(edge.metadata ?? {}),
      webEdgeKind: edge.kind,
      ...(edge.label ? { label: edge.label } : {}),
    },
  };
}

export function mergeWebStructureIntoCode360(
  base: Code360Graph,
  web: WebStructureGraph,
): Code360Graph {
  const nodes: Record<string, Code360Node> = { ...base.nodes };
  for (const node of Object.values(web.nodes)) {
    nodes[node.id] = {
      ...nodes[node.id],
      ...toCode360Node(node),
      metadata: {
        ...(nodes[node.id]?.metadata ?? {}),
        ...toCode360Node(node).metadata,
      },
    };
  }

  const seen = new Set(
    base.edges.map((edge) => `${edge.from}\u0000${edge.to}\u0000${edge.type}`),
  );
  const edges = [...base.edges];

  for (const webEdge of web.edges) {
    const edge = toCode360Edge(webEdge);
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(edge);
  }

  return { nodes, edges };
}
