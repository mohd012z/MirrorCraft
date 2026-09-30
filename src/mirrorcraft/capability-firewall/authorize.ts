import { isExecutableInstructionSource } from "@/mirrorcraft/prompt-defense";
import type {
  ToolAuthorizationDecision,
  ToolAuthorizationRequest,
  ToolCapability,
} from "./types";

const PRIVILEGED_CAPABILITIES: ReadonlySet<ToolCapability> = new Set([
  "workspace-edit",
  "terminal-exec",
  "git-write",
  "network-write",
  "deployment",
  "persistent-state",
]);

function deny(request: ToolAuthorizationRequest, reason: string): ToolAuthorizationDecision {
  return { allowed: false, reason, evidenceIds: [...request.evidenceIds] };
}

export function authorizeToolCapability(
  request: ToolAuthorizationRequest,
): ToolAuthorizationDecision {
  const trustedInstruction = isExecutableInstructionSource(request.instructionSource);

  if (
    request.capability === "read-analysis" &&
    !request.mutatesWorkspace &&
    request.allowUntrustedEvidenceRead
  ) {
    return {
      allowed: true,
      reason: "Read-only analysis of untrusted evidence is explicitly permitted.",
      evidenceIds: [...request.evidenceIds],
    };
  }

  if (PRIVILEGED_CAPABILITIES.has(request.capability) && !trustedInstruction) {
    return deny(
      request,
      `Instruction source ${request.instructionSource} cannot authorize privileged capability ${request.capability}.`,
    );
  }

  if (request.mutatesWorkspace && !trustedInstruction) {
    return deny(
      request,
      `Instruction source ${request.instructionSource} cannot authorize workspace mutation.`,
    );
  }

  if (request.requiresVerification && !request.verified) {
    return deny(request, "This tool requires verification before the requested capability may run.");
  }

  if (!trustedInstruction && request.capability !== "network-read") {
    return deny(request, `Instruction source ${request.instructionSource} is not executable.`);
  }

  return {
    allowed: true,
    reason: "Capability is authorized by the trusted task source and tool metadata.",
    evidenceIds: [...request.evidenceIds],
  };
}
