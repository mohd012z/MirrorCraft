import type { ToolAuthorizationDecision } from "@/mirrorcraft/capability-firewall";
import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
import { hostingProviderToDeploymentTarget } from "@/mirrorcraft/deployment/targets";
import type { DomainPlan } from "@/mirrorcraft/domain/types";
import type { EditOperation } from "@/mirrorcraft/editing/types";
import type { FreeHostingCandidate } from "@/mirrorcraft/hosting/classifier";
import type { AccessDecision } from "@/mirrorcraft/intake/access-policy";
import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import type { InjectionAssessment } from "@/mirrorcraft/prompt-defense";
import type { PublishDecision } from "@/mirrorcraft/publish";
import { redactSensitiveText } from "@/mirrorcraft/security/redaction";

export type RestrictionScope =
  | "access"
  | "edit"
  | "integration"
  | "hosting"
  | "deployment"
  | "publish"
  | "ai-context"
  | "agent-tool";

export type RestrictionSeverity = "block" | "warning";

export type RestrictionCode =
  | "access-capture-blocked"
  | "access-consent-required"
  | "access-authorized-session"
  | "edit-access-state-unauthorized"
  | "integration-not-ready"
  | "integration-degraded"
  | "hosting-incompatible"
  | "hosting-policy-restricted"
  | "hosting-zero-cost-unverified"
  | "hosting-evidence-warning"
  | "deployment-provider-required"
  | "deployment-target-unsupported"
  | "deployment-target-mismatch"
  | "deployment-policy-blocked"
  | "deployment-provider-warning"
  | "publish-not-ready"
  | "publish-warning"
  | "secret-boundary-violation"
  | "domain-unverified"
  | "domain-plan-blocked"
  | "domain-warning"
  | "external-instruction-detected"
  | "instruction-boundary-violation"
  | "tool-escalation-request"
  | "context-poisoning"
  | "untrusted-persistent-instruction"
  | "secret-exposure-request";

export interface Restriction {
  code: RestrictionCode;
  scope: RestrictionScope;
  severity: RestrictionSeverity;
  message: string;
  evidence: readonly string[];
}

export interface RestrictionDecision {
  allowed: boolean;
  blockers: readonly Restriction[];
  warnings: readonly Restriction[];
  restrictions: readonly Restriction[];
}

export interface RestrictionInput {
  code: RestrictionCode;
  scope: RestrictionScope;
  severity: RestrictionSeverity;
  message: string;
  evidence?: readonly string[];
}

export interface DeploymentRestrictionProvider {
  providerId: string;
  connectionId: string;
  runtime: IntegrationRuntime;
  serviceId?: string;
  executionMode: "runtime-connector";
  warnings: readonly string[];
}

export interface DeploymentRestrictionInput {
  target: DeploymentTarget;
  provider?: DeploymentRestrictionProvider;
}

export interface EditRestrictionInput {
  operation: EditOperation;
  authorizedProject: boolean;
}

const PROVIDER_BACKED_TARGETS = new Set<DeploymentTarget>([
  "github-pages",
  "cloudflare-pages",
  "vercel",
  "netlify",
  "firebase-hosting",
  "google-cloud-run",
]);

function normalizeRestriction(input: RestrictionInput): Restriction {
  return {
    code: input.code,
    scope: input.scope,
    severity: input.severity,
    message: input.message.trim(),
    evidence: [...(input.evidence ?? [])],
  };
}

export function createRestrictionDecision(
  restrictions: readonly RestrictionInput[],
): RestrictionDecision {
  const normalized = restrictions.map(normalizeRestriction);
  const blockers = normalized.filter((item) => item.severity === "block");
  const warnings = normalized.filter((item) => item.severity === "warning");

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
    restrictions: normalized,
  };
}

export function combineRestrictionDecisions(
  ...decisions: readonly RestrictionDecision[]
): RestrictionDecision {
  return createRestrictionDecision(
    decisions.flatMap((decision) => decision.restrictions),
  );
}

export function restrictionsFromInjectionAssessment(
  assessment: InjectionAssessment,
): RestrictionDecision {
  if (assessment.classification === "none") {
    return createRestrictionDecision([]);
  }

  const evidence = assessment.evidence.map((item) => item.id);
  const signalEvidence = assessment.signals.map((signal) => `signal:${signal}`);
  const allEvidence = [...evidence, ...signalEvidence];

  if (assessment.signals.includes("secret-acquisition-request")) {
    return createRestrictionDecision([
      {
        code: "secret-exposure-request",
        scope: "ai-context",
        severity: "block",
        message:
          "Untrusted content attempted to make the agent acquire or disclose secret material.",
        evidence: allEvidence,
      },
    ]);
  }

  if (
    assessment.action === "exclude-from-agent-context" &&
    assessment.signals.includes("persistent-instruction")
  ) {
    return createRestrictionDecision([
      {
        code: "untrusted-persistent-instruction",
        scope: "ai-context",
        severity: "block",
        message:
          "Untrusted content attempted to persist instructions beyond its evidence scope.",
        evidence: allEvidence,
      },
    ]);
  }

  if (
    assessment.action === "exclude-from-agent-context" &&
    assessment.signals.includes("tool-permission-escalation")
  ) {
    return createRestrictionDecision([
      {
        code: "tool-escalation-request",
        scope: "agent-tool",
        severity: "block",
        message:
          "Untrusted content attempted to authorize or invoke a privileged tool capability.",
        evidence: allEvidence,
      },
    ]);
  }

  if (assessment.action === "exclude-from-agent-context") {
    return createRestrictionDecision([
      {
        code: "instruction-boundary-violation",
        scope: "ai-context",
        severity: "block",
        message:
          "Untrusted content attempted to cross from evidence into executable agent instruction.",
        evidence: allEvidence,
      },
    ]);
  }

  if (assessment.action === "quarantine") {
    return createRestrictionDecision([
      {
        code: "context-poisoning",
        scope: "ai-context",
        severity: "warning",
        message:
          "Potential prompt-injection content was quarantined from executable model context.",
        evidence: allEvidence,
      },
    ]);
  }

  return createRestrictionDecision([
    {
      code: "external-instruction-detected",
      scope: "ai-context",
      severity: "warning",
      message:
        "Untrusted content contains instruction-like signals and remains evidence-only.",
      evidence: allEvidence,
    },
  ]);
}

export function restrictionsFromToolAuthorization(
  decision: ToolAuthorizationDecision,
): RestrictionDecision {
  if (decision.allowed) return createRestrictionDecision([]);
  return createRestrictionDecision([
    {
      code: "tool-escalation-request",
      scope: "agent-tool",
      severity: "block",
      message: decision.reason,
      evidence: decision.evidenceIds,
    },
  ]);
}

export function restrictionsFromAccessDecision(
  decision: AccessDecision,
): RestrictionDecision {
  if (!decision.captureAllowed) {
    return createRestrictionDecision([
      {
        code: "access-capture-blocked",
        scope: "access",
        severity: "block",
        message: decision.reason,
        evidence: [decision.classification],
      },
    ]);
  }

  if (decision.classification === "consent-gate") {
    return createRestrictionDecision([
      {
        code: "access-consent-required",
        scope: "access",
        severity: "warning",
        message: decision.reason,
        evidence: [decision.classification],
      },
    ]);
  }

  if (decision.classification === "authorized-session") {
    return createRestrictionDecision([
      {
        code: "access-authorized-session",
        scope: "access",
        severity: "warning",
        message:
          "Authorized-session capture is limited to content rendered by the user-authorized browser session; access controls must not be bypassed.",
        evidence: [decision.classification],
      },
    ]);
  }

  return createRestrictionDecision([]);
}

export function restrictionsFromEditOperation(
  input: EditRestrictionInput,
): RestrictionDecision {
  if (input.operation.category === "access" && !input.authorizedProject) {
    return createRestrictionDecision([
      {
        code: "edit-access-state-unauthorized",
        scope: "edit",
        severity: "block",
        message:
          "Access-state and entitlement UI may only be edited for a user-owned or explicitly authorized project.",
        evidence: [
          `operation:${input.operation.id}`,
          `parameter:${input.operation.parameterId}`,
        ],
      },
    ]);
  }

  return createRestrictionDecision([]);
}

export function restrictionsFromIntegrationConnection(
  connection: IntegrationConnectionSummary,
): RestrictionDecision {
  if (connection.health === "connected") {
    return createRestrictionDecision([]);
  }

  if (connection.health === "degraded") {
    return createRestrictionDecision([
      {
        code: "integration-degraded",
        scope: "integration",
        severity: "warning",
        message: `Integration connection ${connection.id} is degraded and should be revalidated before a sensitive action.`,
        evidence: [
          `provider:${connection.providerId}`,
          `health:${connection.health}`,
          ...(connection.checkedAt ? [`checkedAt:${connection.checkedAt}`] : []),
        ],
      },
    ]);
  }

  return createRestrictionDecision([
    {
      code: "integration-not-ready",
      scope: "integration",
      severity: "block",
      message: `Integration connection ${connection.id} is not ready for execution (${connection.health}).`,
      evidence: [
        `provider:${connection.providerId}`,
        `health:${connection.health}`,
        ...(connection.checkedAt ? [`checkedAt:${connection.checkedAt}`] : []),
      ],
    },
  ]);
}

export function restrictionsFromHostingCandidate(
  candidate: FreeHostingCandidate,
): RestrictionDecision {
  const restrictions: RestrictionInput[] = [];

  if (!candidate.runtimeCompatible || !candidate.capabilityCompatible) {
    restrictions.push({
      code: "hosting-incompatible",
      scope: "hosting",
      severity: "block",
      message: `${candidate.label} is not technically compatible with the requested hosting profile.`,
      evidence: candidate.blockers,
    });
  }

  if (!candidate.policyEligible) {
    restrictions.push({
      code: "hosting-policy-restricted",
      scope: "hosting",
      severity: "block",
      message: `${candidate.label} is restricted by the documented usage policy for this deployment context.`,
      evidence: candidate.blockers,
    });
  }

  if (!candidate.zeroCostEvidenceReady) {
    restrictions.push({
      code: "hosting-zero-cost-unverified",
      scope: "hosting",
      severity: "block",
      message: `${candidate.label} does not have fresh evidence for guaranteed zero-cost eligibility.`,
      evidence: candidate.blockers,
    });
  }

  for (const warning of candidate.warnings) {
    restrictions.push({
      code: "hosting-evidence-warning",
      scope: "hosting",
      severity: "warning",
      message: warning,
      evidence: [candidate.evidence.source],
    });
  }

  return createRestrictionDecision(restrictions);
}

export function restrictionsFromDomainPlan(
  plan: DomainPlan,
): RestrictionDecision {
  const restrictions: RestrictionInput[] = [];

  for (const blocker of plan.blockers) {
    restrictions.push({
      code: "domain-plan-blocked",
      scope: "deployment",
      severity: "block",
      message: blocker,
      evidence: [
        `provider:${plan.providerId}`,
        `hostname:${plan.hostname}`,
      ],
    });
  }

  if (
    plan.mode === "custom-domain" &&
    (!plan.ownershipVerified || plan.verification.status !== "verified")
  ) {
    restrictions.push({
      code: "domain-unverified",
      scope: "deployment",
      severity: "block",
      message: `Custom domain ${plan.hostname} is not verified by the provider.`,
      evidence: [
        `verification:${plan.verification.status}`,
        ...plan.verification.evidence,
      ],
    });
  }

  for (const warning of plan.warnings) {
    restrictions.push({
      code: "domain-warning",
      scope: "deployment",
      severity: "warning",
      message: warning,
      evidence: [`hostname:${plan.hostname}`],
    });
  }

  return createRestrictionDecision(restrictions);
}

export function restrictionsFromSerializedState(
  serialized: string,
): RestrictionDecision {
  const scan = redactSensitiveText(serialized);
  if (!scan.redacted) return createRestrictionDecision([]);

  return createRestrictionDecision([
    {
      code: "secret-boundary-violation",
      scope: "integration",
      severity: "block",
      message:
        "Serialized state contains sensitive material and must not enter project files, history, provenance, exports, or model-visible context.",
      evidence: [
        `redaction-count:${scan.count}`,
        ...scan.categories.map((category) => `category:${category}`),
      ],
    },
  ]);
}

function providerTargetKey(provider: DeploymentRestrictionProvider): string {
  if (provider.providerId === "google" && provider.serviceId) {
    return provider.serviceId;
  }
  return provider.providerId;
}

export function restrictionsFromDeploymentExecution(
  input: DeploymentRestrictionInput,
): RestrictionDecision {
  const restrictions: RestrictionInput[] = [];

  if (!input.provider) {
    if (PROVIDER_BACKED_TARGETS.has(input.target)) {
      restrictions.push({
        code: "deployment-provider-required",
        scope: "deployment",
        severity: "block",
        message: `Deployment target ${input.target} requires an authorized provider connection.`,
      });
    }
    return createRestrictionDecision(restrictions);
  }

  const expectedTarget = hostingProviderToDeploymentTarget(
    providerTargetKey(input.provider),
    input.provider.runtime,
  );

  if (!expectedTarget) {
    restrictions.push({
      code: "deployment-target-unsupported",
      scope: "deployment",
      severity: "block",
      message: `Provider ${input.provider.providerId} does not expose a canonical target for runtime ${input.provider.runtime}.`,
      evidence: input.provider.serviceId ? [input.provider.serviceId] : [],
    });
  } else if (expectedTarget !== input.target) {
    restrictions.push({
      code: "deployment-target-mismatch",
      scope: "deployment",
      severity: "block",
      message: `Deployment target ${input.target} does not match provider/runtime target ${expectedTarget}.`,
      evidence: [
        `provider:${input.provider.providerId}`,
        `runtime:${input.provider.runtime}`,
      ],
    });
  }

  for (const warning of input.provider.warnings) {
    restrictions.push({
      code: "deployment-provider-warning",
      scope: "deployment",
      severity: "warning",
      message: warning,
    });
  }

  return createRestrictionDecision(restrictions);
}

export function restrictionsFromPublishDecision(
  decision: PublishDecision,
): RestrictionDecision {
  return createRestrictionDecision([
    ...decision.blockers.map<RestrictionInput>((message) => ({
      code: "publish-not-ready",
      scope: "publish",
      severity: "block",
      message,
    })),
    ...decision.warnings.map<RestrictionInput>((message) => ({
      code: "publish-warning",
      scope: "publish",
      severity: "warning",
      message,
    })),
  ]);
}
