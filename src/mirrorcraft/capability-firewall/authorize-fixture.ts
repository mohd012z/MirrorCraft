import { authorizeToolCapability, type ToolAuthorizationRequest } from "./index";

const blockedCapabilities = [
  "terminal-exec",
  "git-write",
  "network-write",
  "deployment",
  "persistent-state",
] as const;

for (const capability of blockedCapabilities) {
  const decision = authorizeToolCapability({
    taskId: "external-task",
    instructionSource: "external-content",
    evidenceIds: ["e-hostile"],
    capability,
    toolClass: capability === "git-write" ? "git" : capability === "network-write" ? "network" : "terminal",
    mutatesWorkspace: true,
    requiresVerification: false,
    verified: false,
  });
  if (decision.allowed) throw new Error(`external content must not authorize ${capability}`);
  if (!decision.evidenceIds.includes("e-hostile")) throw new Error("authorization decision lost evidence IDs");
}

const readOnly: ToolAuthorizationRequest = {
  taskId: "read-task",
  instructionSource: "external-content",
  evidenceIds: ["e-read"],
  capability: "read-analysis",
  toolClass: "read",
  mutatesWorkspace: false,
  requiresVerification: false,
  verified: false,
  allowUntrustedEvidenceRead: true,
};
if (!authorizeToolCapability(readOnly).allowed) {
  throw new Error("explicit read-only analysis of untrusted evidence should be allowed");
}

const untrustedNetworkRead = authorizeToolCapability({
  taskId: "external-network-task",
  instructionSource: "external-content",
  evidenceIds: ["e-network"],
  capability: "network-read",
  toolClass: "network",
  mutatesWorkspace: false,
  requiresVerification: false,
  verified: false,
});
if (untrustedNetworkRead.allowed) {
  throw new Error("external content must not authorize outbound network reads by default");
}

const operatorCitingHostile = authorizeToolCapability({
  taskId: "operator-task",
  instructionSource: "operator",
  referencedEvidenceTrust: ["external-content"],
  evidenceIds: ["e-hostile"],
  capability: "workspace-edit",
  toolClass: "edit",
  mutatesWorkspace: true,
  requiresVerification: false,
  verified: false,
});
if (!operatorCitingHostile.allowed) {
  throw new Error("trusted task should not inherit hostile evidence authority");
}

const unverifiedMutation = authorizeToolCapability({
  taskId: "verified-task",
  instructionSource: "operator",
  evidenceIds: ["e-change"],
  capability: "workspace-edit",
  toolClass: "edit",
  mutatesWorkspace: true,
  requiresVerification: true,
  verified: false,
});
if (unverifiedMutation.allowed) {
  throw new Error("verification-required mutation must be denied until verified");
}
