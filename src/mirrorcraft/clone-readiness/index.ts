import type { DeploymentRecommendation } from "@/mirrorcraft/deployment-classifier";

export interface FidelitySummary {
  visual: number;
  structure: number;
  responsive: number;
  behavior: number;
  assets: number;
  overall: number;
}

export interface CloneReadinessInput {
  pagesDiscovered: number;
  pagesPermitted: number;
  pagesReconstructed: number;
  blockedPages: number;
  components: number;
  reusableComponents: number;
  assets: number;
  brokenRoutes: number;
  consoleErrors: number;
  buildErrors: number;
  unresolvedCriticalFindings: number;
  autoRepairs: number;
  warnings: string[];
  fidelity: FidelitySummary;
  deployment: DeploymentRecommendation;
}

export interface CloneReadinessReport extends CloneReadinessInput {
  reconstructionComplete: boolean;
  verificationPassed: boolean;
  publishReady: boolean;
  blockers: string[];
}

export function buildCloneReadinessReport(
  input: CloneReadinessInput,
): CloneReadinessReport {
  const blockers: string[] = [];

  if (input.pagesReconstructed < input.pagesPermitted) {
    blockers.push(
      `${input.pagesPermitted - input.pagesReconstructed} permitted page(s) are not reconstructed.`,
    );
  }
  if (input.brokenRoutes > 0) blockers.push(`${input.brokenRoutes} broken route(s) remain.`);
  if (input.consoleErrors > 0) blockers.push(`${input.consoleErrors} console error(s) remain.`);
  if (input.buildErrors > 0) blockers.push(`${input.buildErrors} build error(s) remain.`);
  if (input.unresolvedCriticalFindings > 0) {
    blockers.push(`${input.unresolvedCriticalFindings} critical finding(s) remain unresolved.`);
  }

  const reconstructionComplete = input.pagesReconstructed >= input.pagesPermitted;
  const verificationPassed =
    input.brokenRoutes === 0 &&
    input.consoleErrors === 0 &&
    input.buildErrors === 0 &&
    input.unresolvedCriticalFindings === 0;

  return {
    ...input,
    reconstructionComplete,
    verificationPassed,
    publishReady: reconstructionComplete && verificationPassed && blockers.length === 0,
    blockers,
  };
}
