export type PublishTarget = "preview" | "production" | "artifact";

export interface VerificationCheck {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "pending";
  evidence?: string[];
}

export interface PublishManifest {
  projectId: string;
  revision: string;
  target: PublishTarget;
  createdAt: string;
  sourceBranch?: string;
  output?: string;
  checks: VerificationCheck[];
  provenanceComplete: boolean;
  alignmentPassed: boolean;
  unresolvedCriticalFindings: number;
}

export interface PublishDecision {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface PublishPolicy {
  requireBuild: boolean;
  requireTypecheck: boolean;
  requireLint: boolean;
  requireProvenance: boolean;
  requireAlignment: boolean;
  allowSkippedOptionalChecks: boolean;
}

export const defaultPublishPolicy: PublishPolicy = {
  requireBuild: true,
  requireTypecheck: true,
  requireLint: true,
  requireProvenance: true,
  requireAlignment: true,
  allowSkippedOptionalChecks: true,
};

function findCheck(manifest: PublishManifest, id: string): VerificationCheck | undefined {
  return manifest.checks.find((check) => check.id === id);
}

export function evaluatePublish(
  manifest: PublishManifest,
  policy: PublishPolicy = defaultPublishPolicy,
): PublishDecision {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const requiredChecks: Array<[boolean, string, string]> = [
    [policy.requireBuild, "build", "Production build must pass before publish."],
    [policy.requireTypecheck, "typecheck", "TypeScript verification must pass before publish."],
    [policy.requireLint, "lint", "Lint verification must pass before publish."],
  ];

  for (const [required, id, message] of requiredChecks) {
    if (!required) continue;
    const check = findCheck(manifest, id);
    if (!check || check.status !== "passed") blockers.push(message);
  }

  if (policy.requireProvenance && !manifest.provenanceComplete) {
    blockers.push("CodeTransparent provenance is incomplete.");
  }

  if (policy.requireAlignment && !manifest.alignmentPassed) {
    blockers.push("CodeAlign validation has not passed.");
  }

  if (manifest.unresolvedCriticalFindings > 0) {
    blockers.push(`${manifest.unresolvedCriticalFindings} unresolved critical finding(s) remain.`);
  }

  for (const check of manifest.checks) {
    if (check.status === "failed" && !requiredChecks.some(([, id]) => id === check.id)) {
      warnings.push(`Optional check failed: ${check.name}`);
    }
    if (check.status === "skipped" && !policy.allowSkippedOptionalChecks) {
      blockers.push(`Skipped verification is not permitted: ${check.name}`);
    }
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
  };
}

export interface Publisher {
  publish(manifest: PublishManifest): Promise<{ location: string; revision: string }>;
}

export class PublishGate {
  constructor(
    private readonly publisher: Publisher,
    private readonly policy: PublishPolicy = defaultPublishPolicy,
  ) {}

  async execute(manifest: PublishManifest): Promise<{ location: string; revision: string }> {
    const decision = evaluatePublish(manifest, this.policy);
    if (!decision.allowed) {
      throw new Error(`Publish blocked:\n- ${decision.blockers.join("\n- ")}`);
    }

    return this.publisher.publish(manifest);
  }
}
