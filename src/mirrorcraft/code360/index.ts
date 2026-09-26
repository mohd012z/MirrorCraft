export type Code360NodeType =
  | "file"
  | "module"
  | "function"
  | "class"
  | "component"
  | "dom-node"
  | "style-rule"
  | "asset"
  | "route"
  | "interaction"
  | "api-endpoint"
  | "storage"
  | "generated-artifact";

export type Code360EdgeType =
  | "imports"
  | "exports"
  | "renders"
  | "styles"
  | "uses-asset"
  | "navigates-to"
  | "calls"
  | "reads"
  | "writes"
  | "generates"
  | "validated-by";

export interface Code360Node {
  id: string;
  type: Code360NodeType;
  label: string;
  routeId?: string;
  sourcePath?: string;
  sourceLine?: number;
  metadata?: Record<string, unknown>;
}

export interface Code360Edge {
  from: string;
  to: string;
  type: Code360EdgeType;
  metadata?: Record<string, unknown>;
}

export interface Code360Graph {
  nodes: Record<string, Code360Node>;
  edges: Code360Edge[];
}

export class Code360Index {
  private graph: Code360Graph = { nodes: {}, edges: [] };
  private outgoing = new Map<string, Code360Edge[]>();
  private incoming = new Map<string, Code360Edge[]>();

  addNode(node: Code360Node): void {
    this.graph.nodes[node.id] = node;
  }

  addEdge(edge: Code360Edge): void {
    if (!this.graph.nodes[edge.from] || !this.graph.nodes[edge.to]) {
      throw new Error(`Code360 edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
    this.graph.edges.push(edge);
    this.outgoing.set(edge.from, [...(this.outgoing.get(edge.from) ?? []), edge]);
    this.incoming.set(edge.to, [...(this.incoming.get(edge.to) ?? []), edge]);
  }

  getNode(id: string): Code360Node | undefined {
    return this.graph.nodes[id];
  }

  related(id: string, direction: "in" | "out" | "both" = "both"): Code360Node[] {
    const edges = [
      ...(direction !== "in" ? this.outgoing.get(id) ?? [] : []),
      ...(direction !== "out" ? this.incoming.get(id) ?? [] : []),
    ];
    const ids = new Set<string>();
    for (const edge of edges) ids.add(edge.from === id ? edge.to : edge.from);
    return [...ids].map((nodeId) => this.graph.nodes[nodeId]).filter(Boolean);
  }

  findBySourcePath(sourcePath: string): Code360Node[] {
    return Object.values(this.graph.nodes).filter((node) => node.sourcePath === sourcePath);
  }

  findByRoute(routeId: string): Code360Node[] {
    return Object.values(this.graph.nodes).filter((node) => node.routeId === routeId);
  }

  traceToGeneratedSource(startId: string, maxDepth = 8): Code360Node[] {
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    const visited = new Set<string>();
    const matches: Code360Node[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.depth > maxDepth) continue;
      visited.add(current.id);

      const node = this.graph.nodes[current.id];
      if (!node) continue;
      if (node.type === "generated-artifact" || node.sourcePath) matches.push(node);

      for (const edge of this.outgoing.get(current.id) ?? []) {
        queue.push({ id: edge.to, depth: current.depth + 1 });
      }
      for (const edge of this.incoming.get(current.id) ?? []) {
        queue.push({ id: edge.from, depth: current.depth + 1 });
      }
    }

    return matches;
  }

  toJSON(): Code360Graph {
    return {
      nodes: { ...this.graph.nodes },
      edges: [...this.graph.edges],
    };
  }
}
