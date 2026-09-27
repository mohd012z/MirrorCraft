import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
} from "@/mirrorcraft/integrations/types";

export const VERCEL_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "vercel",
  label: "Vercel",
  capabilities: ["hosting", "functions", "custom-domain"],
  authModes: ["oauth", "api-token"],
  requiredScopes: [],
  runtimes: ["static", "edge", "serverless"],
  customDomain: true,
  quota: {
    freeTier: "yes",
    confidence: 0.99,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source: "https://vercel.com/pricing",
    limits: {
      edgeRequestsPerMonth: 1_000_000,
      fastDataTransferGbPerMonth: 100,
      hobbyDeploymentStorageGb: 10,
      hobbyAdditionalUsagePurchasable: false,
    },
  },
  notes: [
    "The Hobby plan is a no-cost plan intended for personal, non-commercial use.",
    "Commercial projects must not be classified as zero-cost-ready solely because the Hobby tier exists.",
    "Deployment credentials remain outside MirrorCraft project state and are resolved at execution time.",
  ],
};

export interface VercelDeploymentPlanInput {
  connectionId: string;
  runtime: "static" | "edge" | "serverless" | "server";
  secretRefs?: readonly SecretRef[];
  customDomain?: string;
}

export interface VercelDeploymentPlan {
  providerId: "vercel";
  connectionId: string;
  runtime: "static" | "edge" | "serverless";
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
    throw new Error("Vercel connectionId is invalid");
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
    if (ref.scheme !== "secret" || ref.provider !== "vercel") {
      throw new Error("Vercel deployment plans must use vercel secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("Vercel secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createVercelDeploymentPlan(
  input: VercelDeploymentPlanInput,
): VercelDeploymentPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  if (
    input.runtime !== "static" &&
    input.runtime !== "edge" &&
    input.runtime !== "serverless"
  ) {
    throw new Error(`Vercel does not support runtime ${input.runtime} in this adapter`);
  }

  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);
  const customDomain = input.customDomain?.trim() || undefined;
  const requiredCapabilities: IntegrationCapability[] = input.runtime === "static"
    ? ["hosting"]
    : ["hosting", "functions"];

  return {
    providerId: "vercel",
    connectionId,
    runtime: input.runtime,
    secretRefs,
    requiredCapabilities,
    ...(customDomain ? { customDomain } : {}),
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Verify commercial eligibility before deployment; the Vercel Hobby plan is intended for personal, non-commercial use.",
      "Quota and billing state must be rechecked before publish; this plan does not authorize payment or upgrades.",
    ],
  };
}
