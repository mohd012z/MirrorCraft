import type { IntegrationCapability } from "@/mirrorcraft/integrations/types";
import {
  classifyDeploymentFromSource,
  type SourceDeploymentClassification,
} from "@/mirrorcraft/deployment-classifier/from-source";
import {
  classifyFreeHosting,
  type FreeHostingPlan,
} from "@/mirrorcraft/hosting/classifier";
import { PROVIDER_CATALOG } from "@/mirrorcraft/hosting/provider-catalog";
import {
  deriveHostingRuntime,
  type HostingRuntimeDecision,
} from "@/mirrorcraft/hosting/runtime-bridge";
import type { SourceFileInput } from "@/mirrorcraft/source-scanner";

export interface SourceFreeHostingOptions {
  commercialUse: boolean;
  requireCustomDomain: boolean;
  requiredCapabilities?: readonly IntegrationCapability[];
  verifiedAt: string;
  maxEvidenceAgeDays: number;
}

export interface SourceFreeHostingClassification {
  deployment: SourceDeploymentClassification;
  runtime: HostingRuntimeDecision;
  plan: FreeHostingPlan | null;
  blockers: readonly string[];
}

function requiredCapabilities(
  values: readonly IntegrationCapability[] = [],
): readonly IntegrationCapability[] {
  return [...new Set<IntegrationCapability>(["hosting", ...values])];
}

export function classifyFreeHostingFromSource(
  files: SourceFileInput[],
  options: SourceFreeHostingOptions,
): SourceFreeHostingClassification {
  const deployment = classifyDeploymentFromSource(files);
  const runtime = deriveHostingRuntime(
    deployment.recommendation,
    deployment.analysis,
  );

  if (runtime === "artifact-only") {
    return {
      deployment,
      runtime,
      plan: null,
      blockers: [
        "The source was classified as artifact-only and does not have a deployable hosting runtime.",
      ],
    };
  }

  const plan = classifyFreeHosting(
    {
      runtime,
      commercialUse: options.commercialUse,
      requireCustomDomain: options.requireCustomDomain,
      requiredCapabilities: requiredCapabilities(options.requiredCapabilities),
      verifiedAt: options.verifiedAt,
      maxEvidenceAgeDays: options.maxEvidenceAgeDays,
    },
    PROVIDER_CATALOG,
  );

  return {
    deployment,
    runtime,
    plan,
    blockers: plan.eligible.length === 0
      ? ["No evidence-ready zero-cost hosting provider satisfies the detected runtime and policy requirements."]
      : [],
  };
}
