import type { VerificationResult } from "@/mirrorcraft/verification-engine";

export type ReleaseStage = "draft" | "analyzed" | "aligned" | "built" | "verified" | "ready" | "published";

export interface FidelityScores {
  visual?: number;
  structure?: number;
  responsive?: number;
  behavior?: number;
  assets?: number;
  overall?: number;
}

export interface ReleaseArtifact {
  kind: "bundle" | "report" | "preview" | "deployment" | "source";
  location: string;
  sha256?: string;
}

export interface ReleaseManifest {
  projectId: string;
  revision: string;
  branch: string;
  commit: string;
  stage: ReleaseStage;
  createdAt: string;
  verification: VerificationResult[];
  fidelity: FidelityScores;
  alignmentPassed: boolean;
  provenanceComplete: boolean;
  unresolvedCriticalFindings: number;
  warnings: string[];
  artifacts: ReleaseArtifact[];
  rollbackCheckpointId?: string;
}

export function advanceReleaseStage(manifest: ReleaseManifest, next: ReleaseStage): ReleaseManifest {
  const order: ReleaseStage[] = ["draft", "analyzed", "aligned", "built", "verified", "ready", "published"];
  const currentIndex = order.indexOf(manifest.stage);
  const nextIndex = order.indexOf(next);
  if (nextIndex < currentIndex) throw new Error(`Release stage cannot move backward from ${manifest.stage} to ${next}.`);
  if (nextIndex > currentIndex + 1) throw new Error(`Release stage cannot skip from ${manifest.stage} to ${next}.`);
  return { ...manifest, stage: next };
}

export function releaseReady(manifest: ReleaseManifest): boolean {
  return manifest.stage === "ready" &&
    manifest.alignmentPassed &&
    manifest.provenanceComplete &&
    manifest.unresolvedCriticalFindings === 0 &&
    manifest.verification.filter((result) => result.required).every((result) => result.status === "passed");
}
