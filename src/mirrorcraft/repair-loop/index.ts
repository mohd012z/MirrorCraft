export type RepairCategory =
  | "build"
  | "typescript"
  | "dependency"
  | "runtime"
  | "route"
  | "missing-asset"
  | "layout"
  | "font"
  | "color"
  | "spacing"
  | "responsive"
  | "interaction"
  | "overflow"
  | "accessibility"
  | "broken-link"
  | "console"
  | "network-reference";

export interface MismatchEvidence {
  routeId: string;
  viewportId: string;
  nodeId?: string;
  category: RepairCategory;
  summary: string;
  expected?: unknown;
  actual?: unknown;
  confidence: number;
  sourcePath?: string;
  sourceLine?: number;
}

export interface RepairPatch {
  id: string;
  category: RepairCategory;
  targetNodeId?: string;
  sourcePath?: string;
  rationale: string;
  confidence: number;
  operations: Array<{
    kind: "replace" | "insert" | "remove" | "config";
    selector?: string;
    property?: string;
    before?: unknown;
    after?: unknown;
  }>;
}

export interface RepairAttempt {
  patch: RepairPatch;
  scoreBefore: number;
  scoreAfter?: number;
  accepted?: boolean;
  notes?: string[];
}

export interface RepairBudget {
  maxAttempts: number;
  minConfidence: number;
  minImprovement: number;
  targetScore: number;
}

export const DEFAULT_REPAIR_BUDGET: RepairBudget = {
  maxAttempts: 12,
  minConfidence: 0.7,
  minImprovement: 0.002,
  targetScore: 0.98,
};

export function prioritizeMismatches(items: MismatchEvidence[]): MismatchEvidence[] {
  const weight: Record<RepairCategory, number> = {
    build: 100,
    typescript: 95,
    dependency: 90,
    runtime: 85,
    route: 82,
    "missing-asset": 80,
    layout: 70,
    responsive: 68,
    interaction: 65,
    overflow: 60,
    font: 55,
    spacing: 50,
    color: 45,
    accessibility: 40,
    "broken-link": 38,
    console: 35,
    "network-reference": 30,
  };

  return [...items].sort(
    (a, b) => weight[b.category] * b.confidence - weight[a.category] * a.confidence,
  );
}

export function shouldAcceptRepair(
  attempt: RepairAttempt,
  budget: RepairBudget = DEFAULT_REPAIR_BUDGET,
): boolean {
  if (attempt.scoreAfter === undefined) return false;
  const improvement = attempt.scoreAfter - attempt.scoreBefore;
  return attempt.patch.confidence >= budget.minConfidence && improvement >= budget.minImprovement;
}

export function shouldStopRepairing(
  attempts: RepairAttempt[],
  currentScore: number,
  budget: RepairBudget = DEFAULT_REPAIR_BUDGET,
): boolean {
  if (currentScore >= budget.targetScore) return true;
  if (attempts.length >= budget.maxAttempts) return true;

  const recent = attempts.slice(-3).filter((a) => a.scoreAfter !== undefined);
  if (recent.length === 3) {
    const stagnant = recent.every(
      (a) => (a.scoreAfter ?? a.scoreBefore) - a.scoreBefore < budget.minImprovement,
    );
    if (stagnant) return true;
  }

  return false;
}
