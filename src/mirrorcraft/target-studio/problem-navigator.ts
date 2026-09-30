import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";
import { buildImpactReport, buildTargetContext, createMirrorCommand } from "@/mirrorcraft/target-studio";
import type { ImpactReport, MirrorCommand, SourceRange, TargetContext } from "@/mirrorcraft/target-studio/types";

export interface ProblemReference {
  problemId: string;
  targetId: string;
  title: string;
  summary: string;
  evidence: string[];
}

export interface ProblemNavigation {
  problemId: string;
  targetId: string;
  title: string;
  summary: string;
  file?: string;
  sourceRange?: SourceRange;
  route?: string;
  selector?: string;
  context: TargetContext;
  impact: ImpactReport;
  evidence: string[];
}

export interface CorrectionPreview {
  problemId: string;
  targetId: string;
  command: MirrorCommand;
  before: string;
  after: string;
  verification: {
    routes: string[];
    viewports: number[];
    tests: string[];
    visual: boolean;
    structural: boolean;
    behavioral: boolean;
  };
  evidence: string[];
  applyAllowed: false;
}

/** Resolve a summary/finding row to its exact graph/source target. */
export function buildProblemNavigation(
  graph: WebStructureGraph,
  problem: ProblemReference,
): ProblemNavigation | null {
  const context = buildTargetContext(graph, problem.targetId);
  const impact = buildImpactReport(graph, problem.targetId);
  if (!context || !impact) return null;
  return {
    problemId: problem.problemId,
    targetId: problem.targetId,
    title: problem.title,
    summary: problem.summary,
    file: context.target.file,
    sourceRange: context.target.sourceRange,
    route: context.target.route,
    selector: context.target.selector,
    context,
    impact,
    evidence: [...new Set([...problem.evidence, ...context.evidence])],
  };
}

/**
 * Build a non-mutating before/after correction preview. The preview can be
 * inspected and verified, but source application is intentionally impossible
 * through this object; promotion to real mode belongs to a separate boundary.
 */
export function buildCorrectionPreview(input: {
  navigation: ProblemNavigation;
  before: string;
  after: string;
}): CorrectionPreview {
  const { navigation } = input;
  const command = createMirrorCommand({
    command: "rectify",
    targetId: navigation.targetId,
    mode: "virtual",
    intent: navigation.summary,
    verification: {
      viewports: navigation.impact.affectedViewports,
      visual: navigation.impact.requiresCapture,
      structural: true,
      behavioral: navigation.impact.requiresBehaviorTest,
      tests: navigation.impact.affectedTests.length > 0,
    },
  });
  return {
    problemId: navigation.problemId,
    targetId: navigation.targetId,
    command,
    before: input.before,
    after: input.after,
    verification: {
      routes: navigation.impact.affectedRoutes,
      viewports: navigation.impact.affectedViewports,
      tests: navigation.impact.affectedTests,
      visual: navigation.impact.requiresCapture,
      structural: true,
      behavioral: navigation.impact.requiresBehaviorTest,
    },
    evidence: navigation.evidence,
    applyAllowed: false,
  };
}
