export interface CodeLocation {
  file: string;
  startLine?: number;
  endLine?: number;
  symbol?: string;
}

export interface CodeViewNode {
  id: string;
  kind:
    | "file"
    | "module"
    | "component"
    | "function"
    | "class"
    | "route"
    | "dom"
    | "style"
    | "asset"
    | "api";
  label: string;
  location?: CodeLocation;
  children: string[];
  dependencies: string[];
  dependents: string[];
  tags: string[];
}

export interface CodeViewGraph {
  nodes: Record<string, CodeViewNode>;
  roots: string[];
}

export function createCodeViewGraph(nodes: CodeViewNode[]): CodeViewGraph {
  const record = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const referenced = new Set(nodes.flatMap((node) => node.children));
  return {
    nodes: record,
    roots: nodes.filter((node) => !referenced.has(node.id)).map((node) => node.id),
  };
}

export function traceDependencies(
  graph: CodeViewGraph,
  startId: string,
  direction: "dependencies" | "dependents" = "dependencies",
): CodeViewNode[] {
  const visited = new Set<string>();
  const output: CodeViewNode[] = [];
  const queue = [startId];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);

    const node = graph.nodes[id];
    if (!node) continue;
    output.push(node);
    queue.push(...node[direction]);
  }

  return output;
}
