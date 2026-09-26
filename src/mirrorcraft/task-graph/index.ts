export type TaskStatus = "pending" | "ready" | "running" | "blocked" | "passed" | "failed" | "skipped";

export interface TaskNode {
  id: string;
  title: string;
  dependsOn: string[];
  status: TaskStatus;
  targets: string[];
  acceptanceCriteria: string[];
  evidence: string[];
}

export interface TaskGraph {
  nodes: TaskNode[];
}

export function validateTaskGraph(graph: TaskGraph): string[] {
  const ids = new Set(graph.nodes.map((node) => node.id));
  const problems: string[] = [];

  for (const node of graph.nodes) {
    for (const dependency of node.dependsOn) {
      if (!ids.has(dependency)) problems.push(`Task ${node.id} depends on missing task ${dependency}.`);
      if (dependency === node.id) problems.push(`Task ${node.id} cannot depend on itself.`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  const visit = (id: string): void => {
    if (visiting.has(id)) {
      problems.push(`Cycle detected at task ${id}.`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const node = byId.get(id);
    for (const dependency of node?.dependsOn ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };

  for (const node of graph.nodes) visit(node.id);
  return [...new Set(problems)];
}

export function readyTasks(graph: TaskGraph): TaskNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.nodes.filter((node) =>
    node.status === "pending" &&
    node.dependsOn.every((id) => byId.get(id)?.status === "passed"),
  );
}

export function updateTaskStatus(graph: TaskGraph, taskId: string, status: TaskStatus): TaskGraph {
  return {
    nodes: graph.nodes.map((node) => node.id === taskId ? { ...node, status } : node),
  };
}
