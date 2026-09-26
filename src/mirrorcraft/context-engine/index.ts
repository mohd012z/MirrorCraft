export interface ContextItem {
  id: string;
  kind: "instruction" | "source" | "search" | "graph" | "runtime" | "verification" | "user";
  reference: string;
  summary: string;
  tokensEstimate: number;
  priority: number;
  confidence: number;
  immutable?: boolean;
}

export interface ContextBudget {
  maxTokens: number;
  reserveTokens: number;
}

export interface ContextBundle {
  selected: ContextItem[];
  omitted: ContextItem[];
  estimatedTokens: number;
}

function score(item: ContextItem): number {
  const confidence = Math.max(0, Math.min(1, item.confidence));
  return item.priority * 10 + confidence * 5 + (item.immutable ? 20 : 0);
}

export function buildContextBundle(items: ContextItem[], budget: ContextBudget): ContextBundle {
  const capacity = Math.max(0, budget.maxTokens - budget.reserveTokens);
  const ordered = [...items].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const selected: ContextItem[] = [];
  const omitted: ContextItem[] = [];
  let used = 0;

  for (const item of ordered) {
    if (item.immutable || used + item.tokensEstimate <= capacity) {
      selected.push(item);
      used += item.tokensEstimate;
    } else {
      omitted.push(item);
    }
  }

  return { selected, omitted, estimatedTokens: used };
}

export function findContext(bundle: ContextBundle, reference: string): ContextItem[] {
  return bundle.selected.filter((item) =>
    item.reference === reference || item.reference.includes(reference) || item.summary.includes(reference),
  );
}
