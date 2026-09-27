import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";
import { releaseReady } from "@/mirrorcraft/release-manifest";

export type PublishTarget = "preview" | "production" | "artifact";

export interface PublishDecision {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface PublishPolicy {
  requireReadyStage: boolean;
  requireProvenance: boolean;
  requireAlignment: boolean;
  allowWarnings: boolean;
}

export const defaultPublishPolicy: PublishPolicy = {
  requireReadyStage: true,
  requireProvenance: true,
  requireAlignment: true,
  allowWarnings: true,
};

export function evaluatePublish(
  manifest: ReleaseManifest,
  policy: PublishPolicy = defaultPublishPolicy,
): PublishDecision {
  const blockers: string[] = [];
  const warnings = [...manifest.warnings];

  if (policy.requireReadyStage && !releaseReady(manifest)) {
    blockers.push("ReleaseManifest is not in a fully verified ready state.");
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
  if (!policy.allowWarnings && warnings.length > 0) {
    blockers.push(`${warnings.length} release warning(s) must be resolved.`);
  }

  return { allowed: blockers.length === 0, blockers, warnings };
}

export interface Publisher {
  publish(manifest: ReleaseManifest, target: PublishTarget): Promise<{ location: string; revision: string }>;
}

export class PublishGate {
  constructor(
    private readonly publisher: Publisher,
    private readonly policy: PublishPolicy = defaultPublishPolicy,
  ) {}

  async execute(
    manifest: ReleaseManifest,
    target: PublishTarget,
  ): Promise<{ location: string; revision: string }> {
    const decision = evaluatePublish(manifest, this.policy);
    if (!decision.allowed) {
      throw new Error(`Publish blocked:\n- ${decision.blockers.join("\n- ")}`);
    }
    return this.publisher.publish(manifest, target);
  }
}
