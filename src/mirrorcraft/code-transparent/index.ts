export type ChangeAction = "create" | "update" | "delete" | "move";

export interface ChangeEvidence {
  kind: "search" | "source" | "test" | "runtime" | "visual" | "user";
  reference: string;
  summary: string;
}

export interface TransparentChange {
  id: string;
  action: ChangeAction;
  target: string;
  reason: string;
  beforeHash?: string;
  afterHash?: string;
  relatedNodes: string[];
  evidence: ChangeEvidence[];
  verification: string[];
  reversible: boolean;
}

export interface TransparentRun {
  taskId: string;
  startedAt: string;
  completedAt?: string;
  changes: TransparentChange[];
  unresolved: string[];
}

export function addTransparentChange(
  run: TransparentRun,
  change: TransparentChange,
): TransparentRun {
  return {
    ...run,
    changes: [...run.changes, change],
  };
}

export function explainTarget(run: TransparentRun, target: string): TransparentChange[] {
  return run.changes.filter(
    (change) =>
      change.target === target ||
      change.relatedNodes.includes(target) ||
      change.evidence.some((evidence) => evidence.reference === target),
  );
}

export function transparencySummary(run: TransparentRun): {
  changed: number;
  verified: number;
  reversible: number;
  unresolved: number;
} {
  return {
    changed: run.changes.length,
    verified: run.changes.filter((change) => change.verification.length > 0).length,
    reversible: run.changes.filter((change) => change.reversible).length,
    unresolved: run.unresolved.length,
  };
}
