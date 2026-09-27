import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationProviderDescriptor,
  IntegrationRuntime,
} from "@/mirrorcraft/integrations/types";

export const NEON_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "neon",
  label: "Neon",
  capabilities: ["database"],
  authModes: ["api-token"],
  requiredScopes: [],
  runtimes: ["serverless", "server"],
  customDomain: false,
  quota: {
    freeTier: "yes",
    confidence: 0.8,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source: "https://neon.com/blog/how-to-make-the-most-of-neons-free-plan",
    limits: {
      storageMbPerProject: 500,
      egressGbPerMonth: 5,
      autoscalingComputeUnits: 2,
    },
  },
  notes: [
    "Neon is modeled as a Postgres backend companion rather than a frontend hosting target.",
    "Free-plan project, storage, and compute allowances can change independently and should be rechecked before deployment.",
    "Database connection strings and provider credentials stay behind SecretRef/runtime connector boundaries.",
  ],
};

export interface NeonBackendPlanInput {
  connectionId: string;
  secretRefs?: readonly SecretRef[];
}

export interface NeonBackendPlan {
  providerId: "neon";
  connectionId: string;
  capabilities: readonly ["database"];
  runtimes: readonly IntegrationRuntime[];
  secretRefs: readonly SecretRef[];
  requiresSecretResolver: boolean;
  executionMode: "runtime-connector";
  warnings: readonly string[];
}

const SAFE_CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function normalizeConnectionId(value: string): string {
  const normalized = value.trim();
  if (!SAFE_CONNECTION_ID.test(normalized)) {
    throw new Error("Neon connectionId is invalid");
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
    if (ref.scheme !== "secret" || ref.provider !== "neon") {
      throw new Error("Neon backend plans must use neon secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("Neon secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createNeonBackendPlan(
  input: NeonBackendPlanInput,
): NeonBackendPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);

  return {
    providerId: "neon",
    connectionId,
    capabilities: ["database"],
    runtimes: ["serverless", "server"],
    secretRefs,
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Keep Neon database connection strings outside generated source and resolve them only at runtime.",
      "Recheck current free-plan limits before deployment; this plan does not authorize paid usage or upgrades.",
    ],
  };
}
