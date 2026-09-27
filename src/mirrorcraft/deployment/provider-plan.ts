import type {
  DeploymentProviderExecution,
  DeploymentRequest,
} from "@/mirrorcraft/deployment";
import {
  hostingProviderToDeploymentTarget,
  type DeploymentTarget,
} from "@/mirrorcraft/deployment/targets";
import type { CloudflareDeploymentPlan } from "@/mirrorcraft/integrations/cloudflare";
import type { GitHubDeploymentPlan } from "@/mirrorcraft/integrations/github";
import {
  GOOGLE_SERVICE_CATALOG,
  type GoogleIntegrationPlan,
  type GoogleServiceId,
} from "@/mirrorcraft/integrations/google";
import type { NetlifyDeploymentPlan } from "@/mirrorcraft/integrations/netlify";
import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import type { VercelDeploymentPlan } from "@/mirrorcraft/integrations/vercel";
import type { RestrictionDecision } from "@/mirrorcraft/policy/restrictions";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export type DirectHostingDeploymentPlan =
  | GitHubDeploymentPlan
  | CloudflareDeploymentPlan
  | VercelDeploymentPlan
  | NetlifyDeploymentPlan;

export type ProviderDeploymentPlan =
  | DirectHostingDeploymentPlan
  | GoogleIntegrationPlan;

export type DeployableGoogleServiceId = Extract<
  GoogleServiceId,
  "firebase-hosting" | "cloud-run"
>;

export interface GoogleDeploymentSelectionOptions {
  serviceId: DeployableGoogleServiceId;
  runtime: "static" | "serverless" | "server";
}

export interface DeploymentExecutionSelection {
  target: DeploymentTarget;
  providerId: "github" | "cloudflare" | "vercel" | "netlify" | "google";
  connectionId: string;
  runtime: IntegrationRuntime;
  serviceId?: DeployableGoogleServiceId;
  customDomain?: string;
  executionMode: "runtime-connector";
  warnings: readonly string[];
}

export interface BuildDeploymentRequestOptions {
  repository?: string;
  branch?: string;
  restrictions?: RestrictionDecision;
}

function directProviderTarget(
  plan: DirectHostingDeploymentPlan,
): DeploymentTarget {
  const providerId =
    plan.providerId === "github"
      ? "github-pages"
      : plan.providerId === "cloudflare"
        ? "cloudflare-pages"
        : plan.providerId;
  const target = hostingProviderToDeploymentTarget(providerId, plan.runtime);
  if (!target) {
    throw new Error(
      `No canonical deployment target for ${plan.providerId} runtime ${plan.runtime}`,
    );
  }
  return target;
}

function directSelection(
  plan: DirectHostingDeploymentPlan,
): DeploymentExecutionSelection {
  return {
    target: directProviderTarget(plan),
    providerId: plan.providerId,
    connectionId: plan.connectionId,
    runtime: plan.runtime,
    ...(plan.customDomain ? { customDomain: plan.customDomain } : {}),
    executionMode: "runtime-connector",
    warnings: [...plan.warnings],
  };
}

function googleSelection(
  plan: GoogleIntegrationPlan,
  options: GoogleDeploymentSelectionOptions,
): DeploymentExecutionSelection {
  if (!plan.services.includes(options.serviceId)) {
    throw new Error(
      `Google integration plan does not include deployment service ${options.serviceId}`,
    );
  }

  const descriptor = GOOGLE_SERVICE_CATALOG.find(
    (service) => service.id === options.serviceId,
  );
  if (!descriptor || !descriptor.capabilities.includes("hosting")) {
    throw new Error(`${options.serviceId} is not a deployable Google hosting service`);
  }
  if (!descriptor.runtimes.includes(options.runtime)) {
    throw new Error(
      `${options.serviceId} does not support deployment runtime ${options.runtime}`,
    );
  }

  const target = hostingProviderToDeploymentTarget(
    options.serviceId,
    options.runtime,
  );
  if (!target) {
    throw new Error(
      `No canonical deployment target for ${options.serviceId} runtime ${options.runtime}`,
    );
  }

  return {
    target,
    providerId: "google",
    connectionId: plan.connectionId,
    runtime: options.runtime,
    serviceId: options.serviceId,
    executionMode: "runtime-connector",
    warnings: [...plan.warnings],
  };
}

export function createDeploymentExecutionSelection(
  plan: GoogleIntegrationPlan,
  options: GoogleDeploymentSelectionOptions,
): DeploymentExecutionSelection;
export function createDeploymentExecutionSelection(
  plan: DirectHostingDeploymentPlan,
): DeploymentExecutionSelection;
export function createDeploymentExecutionSelection(
  plan: ProviderDeploymentPlan,
  options?: GoogleDeploymentSelectionOptions,
): DeploymentExecutionSelection {
  if (plan.providerId === "google") {
    if (!options) {
      throw new Error(
        "Google deployment selection requires an explicit hosting service and runtime",
      );
    }
    return googleSelection(plan, options);
  }
  return directSelection(plan);
}

export function buildDeploymentRequest(
  selection: DeploymentExecutionSelection,
  manifest: ReleaseManifest,
  artifactPath: string,
  options: BuildDeploymentRequestOptions = {},
): DeploymentRequest {
  const provider: DeploymentProviderExecution = {
    providerId: selection.providerId,
    connectionId: selection.connectionId,
    runtime: selection.runtime,
    ...(selection.serviceId ? { serviceId: selection.serviceId } : {}),
    executionMode: selection.executionMode,
    warnings: [...selection.warnings],
  };

  return {
    target: selection.target,
    manifest,
    artifactPath,
    ...(options.repository ? { repository: options.repository } : {}),
    ...(options.branch ? { branch: options.branch } : {}),
    ...(selection.customDomain ? { customDomain: selection.customDomain } : {}),
    provider,
    ...(options.restrictions ? { restrictions: options.restrictions } : {}),
  };
}
