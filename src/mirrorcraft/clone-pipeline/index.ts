export type CloneStage =
  | "intake"
  | "access-check"
  | "route-discovery"
  | "capture"
  | "trust-analysis"
  | "extract"
  | "normalize"
  | "index"
  | "componentize"
  | "rebuild"
  | "render"
  | "compare"
  | "repair"
  | "verify"
  | "adversarial-verify"
  | "release";

export type StageStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "skipped";

export interface CloneArtifactRef {
  id: string;
  kind:
    | "source"
    | "route-map"
    | "capture"
    | "trust-report"
    | "site-dna"
    | "code360"
    | "component-graph"
    | "generated-source"
    | "fidelity-report"
    | "repair-log"
    | "adversarial-report"
    | "release-manifest";
  location: string;
  hash?: string;
}

export interface CloneStageResult {
  stage: CloneStage;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  artifacts: CloneArtifactRef[];
  warnings: string[];
  errors: string[];
  confidence?: number;
}

export interface ClonePipelineState {
  projectId: string;
  source: string;
  mode: "fast" | "balanced" | "deep" | "max";
  stages: CloneStageResult[];
  currentStage?: CloneStage;
  createdAt: string;
  updatedAt: string;
}

export const CLONE_STAGE_ORDER: readonly CloneStage[] = [
  "intake",
  "access-check",
  "route-discovery",
  "capture",
  "trust-analysis",
  "extract",
  "normalize",
  "index",
  "componentize",
  "rebuild",
  "render",
  "compare",
  "repair",
  "verify",
  "adversarial-verify",
  "release",
] as const;

export function nextCloneStage(stage: CloneStage): CloneStage | null {
  const index = CLONE_STAGE_ORDER.indexOf(stage);
  if (index < 0 || index === CLONE_STAGE_ORDER.length - 1) return null;
  return CLONE_STAGE_ORDER[index + 1];
}

export function canAdvanceClone(state: ClonePipelineState, stage: CloneStage): boolean {
  const index = CLONE_STAGE_ORDER.indexOf(stage);
  if (index <= 0) return true;
  const prior = CLONE_STAGE_ORDER.slice(0, index);
  return prior.every((requiredStage) => {
    const result = state.stages.find((candidate) => candidate.stage === requiredStage);
    return result?.status === "passed" || result?.status === "skipped";
  });
}

export function cloneSummary(state: ClonePipelineState): {
  completed: number;
  failed: number;
  blocked: number;
  progress: number;
} {
  const completed = state.stages.filter((stage) => stage.status === "passed").length;
  const failed = state.stages.filter((stage) => stage.status === "failed").length;
  const blocked = state.stages.filter((stage) => stage.status === "blocked").length;
  return {
    completed,
    failed,
    blocked,
    progress: state.stages.length === 0 ? 0 : completed / state.stages.length,
  };
}
