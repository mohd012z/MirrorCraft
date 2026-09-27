import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
import { hostingProviderToDeploymentTarget } from "@/mirrorcraft/deployment/targets";
import type { FreeHostingCandidate } from "@/mirrorcraft/hosting/classifier";
import type { AccessDecision } from "@/mirrorcraft/intake/access-policy";
import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import type { PublishDecision } from "@/mirrorcraft/publish";

export type RestrictionScope =
  | "access"
  | "edit"
  | "integration"
  | "hosting"
  | "deployment"
  | "publish";

export type RestrictionSeverity = "block" | "warning";

export type RestrictionCode =
  | "access-capture-blocked"
  | "access-consent-required"
  | "access-authorized-session"
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
  | "domain-unverified";

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
