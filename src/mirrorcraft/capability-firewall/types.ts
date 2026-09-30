import type { ToolClass } from "@/mirrorcraft/kernel-core";
import type { TrustTier } from "@/mirrorcraft/prompt-defense";

export type ToolCapability =
  | "read-analysis"
  | "workspace-edit"
  | "terminal-exec"
  | "git-write"
  | "network-read"
  | "network-write"
  | "deployment"
  | "persistent-state";

export interface ToolAuthorizationRequest {
  taskId: string;
  instructionSource: TrustTier;
  referencedEvidenceTrust?: readonly TrustTier[];
  evidenceIds: string[];
  capability: ToolCapability;
  toolClass: ToolClass;
  mutatesWorkspace: boolean;
  requiresVerification: boolean;
  verified: boolean;
  allowUntrustedEvidenceRead?: boolean;
}

export interface ToolAuthorizationDecision {
  allowed: boolean;
  reason: string;
  evidenceIds: string[];
}
