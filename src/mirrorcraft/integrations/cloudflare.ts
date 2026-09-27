import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
} from "@/mirrorcraft/integrations/types";

export const CLOUDFLARE_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "cloudflare",
  label: "Cloudflare Pages",
  capabilities: ["hosting", "functions", "custom-domain", "dns"],
  authModes: ["api-token"],
  requiredScopes: [],
  runtimes: ["static", "edge"],
  customDomain: true,
  quota: {
    freeTier: "yes",
    confidence: 0.99,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source: "https://developers.cloudflare.com/pages/platform/limits/",
    limits: {
      monthlyBuilds: 500,
      concurrentBuilds: 1,
      maxFilesPerSite: 20_000,
      maxAssetMiB: 25,
      customDomainsPerProject: 100,
    },
  },
  notes: [
    "Cloudflare Pages static hosting and Pages Functions use different quota models.",
    "Edge execution is modeled separately from generic serverless or persistent server runtimes.",
    "API tokens remain outside project state and are resolved only at connector execution time.",
  ],
};

export interface CloudflareDeploymentPlanInput {
  connectionId: string;
  runtime: "static" | "edge" | "serverless" | "server";
  secretRefs?: readonly SecretRef[];
  customDomain?: string;
}

export interface CloudflareDeploymentPlan {
  providerId: "cloudflare";
  connectionId: string;
  runtime: "static" | "edge";
  secretRefs: readonly SecretRef[];
  requiredCapabilities: readonly IntegrationCapability[];
  customDomain?: string;
  requiresSecretResolver: boolean;
  executionMode: "runtime-connector";
  warnings: readonly string[];
}

const SAFE_CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function normalizeConnectionId(value: string): string {
  const normalized = value.trim();
  if (!SAFE_CONNECTION_ID.test(normalized)) {
    throw new Error("Cloudflare connectionId is invalid");
  }
  return normalized;
}

function normalizeSecretRefs(
  refs: readonly SecretRef[] | undefined,
  connectionId: string,
): SecretRef[] {
  const seen = new Set<string>();
  const output: SecretRef[] = [];

  for (const ref of refs ?? []) {
    if (ref.scheme !== "secret" || ref.provider !== "cloudflare") {
      throw new Error("Cloudflare deployment plans must use cloudflare secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("Cloudflare secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createCloudflareDeploymentPlan(
  input: CloudflareDeploymentPlanInput,
): CloudflareDeploymentPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  if (input.runtime !== "static" && input.runtime !== "edge") {
    throw new Error(`Cloudflare Pages does not support runtime ${input.runtime}`);
  }

  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);
  const customDomain = input.customDomain?.trim() || undefined;
  const requiredCapabilities: IntegrationCapability[] = input.runtime === "edge"
    ? ["hosting", "functions"]
    : ["hosting"];

  return {
    providerId: "cloudflare",
    connectionId,
    runtime: input.runtime,
    secretRefs,
    requiredCapabilities,
    ...(customDomain ? { customDomain } : {}),
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Verify current Pages and Workers quotas independently before deployment.",
      "Commercial eligibility and plan terms must be checked against the active Cloudflare account.",
    ],
  };
}
