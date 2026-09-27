import type { IntegrationCapability, IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import type {
  ProviderBillingMode,
  ProviderCommercialUse,
  ProviderFreeTierStatus,
  ProviderProfileKind,
} from "@/mirrorcraft/hosting/provider-catalog";

export type EvidenceFreshness = "fresh" | "stale" | "unknown";

export interface HostingProviderEvidence {
  verifiedAt: string;
  source: string;
  confidence: number;
}

export interface HostingProviderProfile {
  id: string;
  label: string;
  kind: ProviderProfileKind;
  runtimes: readonly IntegrationRuntime[];
  capabilities: readonly IntegrationCapability[];
  customDomain: boolean;
  freeTier: ProviderFreeTierStatus;
  commercialUse: ProviderCommercialUse;
  billingMode: ProviderBillingMode;
  limits: Readonly<Record<string, string | number | boolean>>;
  evidence: HostingProviderEvidence;
  notes: readonly string[];
}

export interface FreeHostingInput {
  runtime: IntegrationRuntime;
  commercialUse: boolean;
  requireCustomDomain: boolean;
  requiredCapabilities: readonly IntegrationCapability[];
  /** Date used to evaluate evidence freshness, formatted as YYYY-MM-DD. */
  verifiedAt: string;
  maxEvidenceAgeDays: number;
}

export interface FreeHostingCandidate {
  providerId: string;
  label: string;
  runtimeCompatible: boolean;
  capabilityCompatible: boolean;
  policyEligible: boolean;
  billingMode: ProviderBillingMode;
  evidenceFreshness: EvidenceFreshness;
  evidenceAgeDays: number | null;
  zeroCostEvidenceReady: boolean;
  eligible: boolean;
  technicalFitScore: number;
  blockers: readonly string[];
  warnings: readonly string[];
  limits: Readonly<Record<string, string | number | boolean>>;
  evidence: HostingProviderEvidence;
}

export interface FreeHostingPlan {
  input: FreeHostingInput;
  candidates: readonly FreeHostingCandidate[];
  eligible: readonly FreeHostingCandidate[];
  blocked: readonly FreeHostingCandidate[];
  evidenceVerifiedAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function evidenceAgeDays(
  evidenceVerifiedAt: string,
  evaluationDate: string,
): number | null {
  const evidenceTime = parseIsoDay(evidenceVerifiedAt);
  const evaluationTime = parseIsoDay(evaluationDate);
  if (evidenceTime === null || evaluationTime === null) return null;

  return Math.max(0, Math.floor((evaluationTime - evidenceTime) / DAY_MS));
}

function classifyFreshness(
  ageDays: number | null,
  maxEvidenceAgeDays: number,
): EvidenceFreshness {
  if (ageDays === null) return "unknown";
  return ageDays <= maxEvidenceAgeDays ? "fresh" : "stale";
}

function uniqueCapabilities(
  values: readonly IntegrationCapability[],
): readonly IntegrationCapability[] {
  return [...new Set(values)];
}

function createCandidate(
  input: FreeHostingInput,
  provider: HostingProviderProfile,
): FreeHostingCandidate {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const runtimeCompatible =
    provider.kind === "hosting" && provider.runtimes.includes(input.runtime);

  const requiredCapabilities = uniqueCapabilities(input.requiredCapabilities);
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !provider.capabilities.includes(capability),
  );
  const capabilityCompatible = missingCapabilities.length === 0;

  if (provider.kind !== "hosting") {
    blockers.push("Provider is a backend companion, not a hosting target.");
  }

  if (provider.kind === "hosting" && !provider.runtimes.includes(input.runtime)) {
    blockers.push(`Runtime ${input.runtime} is not supported by this provider profile.`);
  }

  for (const capability of missingCapabilities) {
    blockers.push(`Missing required capability: ${capability}.`);
  }

  if (input.requireCustomDomain && !provider.customDomain) {
    blockers.push("Custom domain support is required.");
  }

  let policyEligible = true;
  if (input.commercialUse && provider.commercialUse === "restricted") {
    policyEligible = false;
    blockers.push("The documented free-tier policy is restricted for commercial use.");
  } else if (input.commercialUse && provider.commercialUse === "service-dependent") {
    warnings.push(
      "Commercial eligibility is service-dependent and must be verified against the active provider plan and terms.",
    );
  }

  const ageDays = evidenceAgeDays(provider.evidence.verifiedAt, input.verifiedAt);
  const freshness = classifyFreshness(ageDays, input.maxEvidenceAgeDays);

  if (provider.freeTier !== "yes") {
    blockers.push("Verified free-tier evidence is unavailable for this provider profile.");
  }

  if (provider.billingMode === "usage-based") {
    blockers.push(
      "Free-tier usage can become billable after the allowance; guaranteed zero-cost operation is not available.",
    );
  } else if (provider.billingMode === "unknown") {
    blockers.push("Zero-cost billing protection is unknown for this provider profile.");
  }

  if (freshness === "stale") {
    blockers.push(
      `Free-tier evidence is stale (${ageDays ?? "unknown"} day(s) old; maximum ${input.maxEvidenceAgeDays}).`,
    );
  } else if (freshness === "unknown") {
    blockers.push("Free-tier evidence freshness is unknown.");
  }

  if (!provider.evidence.source.startsWith("https://")) {
    blockers.push("Free-tier evidence source is missing or untrusted.");
  }

  if (!Number.isFinite(provider.evidence.confidence) || provider.evidence.confidence <= 0.5) {
    blockers.push("Free-tier evidence confidence is too low.");
  }

  const zeroCostEvidenceReady =
    provider.freeTier === "yes" &&
    provider.billingMode === "hard-cap" &&
    freshness === "fresh" &&
    provider.evidence.source.startsWith("https://") &&
    Number.isFinite(provider.evidence.confidence) &&
    provider.evidence.confidence > 0.5;

  const technicalFitFactors = [
    provider.kind === "hosting",
    runtimeCompatible,
    capabilityCompatible,
    !input.requireCustomDomain || provider.customDomain,
  ];
  const technicalFitScore = Math.round(
    (technicalFitFactors.filter(Boolean).length / technicalFitFactors.length) * 100,
  );

  return {
    providerId: provider.id,
    label: provider.label,
    runtimeCompatible,
    capabilityCompatible,
    policyEligible,
    billingMode: provider.billingMode,
    evidenceFreshness: freshness,
    evidenceAgeDays: ageDays,
    zeroCostEvidenceReady,
    eligible: blockers.length === 0,
    technicalFitScore,
    blockers,
    warnings,
    limits: provider.limits,
    evidence: provider.evidence,
  };
}

export function classifyFreeHosting(
  input: FreeHostingInput,
  providers: readonly HostingProviderProfile[],
): FreeHostingPlan {
  if (!Number.isInteger(input.maxEvidenceAgeDays) || input.maxEvidenceAgeDays < 0) {
    throw new Error("maxEvidenceAgeDays must be a non-negative integer");
  }

  if (parseIsoDay(input.verifiedAt) === null) {
    throw new Error("verifiedAt must use YYYY-MM-DD format");
  }

  const candidates = providers.map((provider) => createCandidate(input, provider));
  const eligible = candidates.filter((candidate) => candidate.eligible);
  const blocked = candidates.filter((candidate) => !candidate.eligible);

  return {
    input: {
      ...input,
      requiredCapabilities: uniqueCapabilities(input.requiredCapabilities),
    },
    candidates,
    eligible,
    blocked,
    evidenceVerifiedAt: input.verifiedAt,
  };
}
