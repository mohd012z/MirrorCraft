import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
} from "@/mirrorcraft/integrations/types";

export const NETLIFY_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "netlify",
  label: "Netlify",
  capabilities: ["hosting", "functions", "custom-domain"],
  authModes: ["oauth", "api-token"],
  requiredScopes: [],
  runtimes: ["static", "edge", "serverless"],
  customDomain: true,
  quota: {
    freeTier: "yes",
    confidence: 0.99,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source: "https://www.netlify.com/pricing/",
    limits: {
      monthlyCredits: 300,
      creditHardLimit: true,
      productionDeployCredits: 15,
      concurrentBuilds: 1,
    },
  },
  notes: [
    "The Free plan uses a monthly credit model and can pause when the hard limit is reached.",
    "Static hosting and Functions share provider-account constraints that must be checked before deployment.",
    "Provider credentials are supplied only through an authorized connector or SecretRef at execution time.",
  ],
};

export interface NetlifyDeploymentPlanInput {
  connectionId: string;
  runtime: "static" | "edge" | "serverless" | "server";
  secretRefs?: readonly SecretRef[];
  customDomain?: string;
}

export interface NetlifyDeploymentPlan {
  providerId: "netlify";
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
    throw new Error("Netlify connectionId is invalid");
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
    if (ref.scheme !== "secret" || ref.provider !== "netlify") {
      throw new Error("Netlify deployment plans must use netlify secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("Netlify secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createNetlifyDeploymentPlan(
  input: NetlifyDeploymentPlanInput,
): NetlifyDeploymentPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  if (
    input.runtime !== "static" &&
    input.runtime !== "edge" &&
    input.runtime !== "serverless"
  ) {
    throw new Error(`Netlify does not support runtime ${input.runtime} in this adapter`);
  }

  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);
  const customDomain = input.customDomain?.trim() || undefined;
  const requiredCapabilities: IntegrationCapability[] = input.runtime === "static"
    ? ["hosting"]
    : ["hosting", "functions"];

  return {
    providerId: "netlify",
    connectionId,
    runtime: input.runtime,
    secretRefs,
    requiredCapabilities,
    ...(customDomain ? { customDomain } : {}),
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Verify current Free-plan credits and commercial terms before deployment.",
      "MirrorCraft does not authorize paid overages, plan changes, or payment actions through this deployment plan.",
    ],
  };
}
