import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
  IntegrationRuntime,
} from "@/mirrorcraft/integrations/types";

export type SupabaseCapability =
  | "database"
  | "auth"
  | "storage"
  | "realtime"
  | "functions";

export const SUPABASE_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "supabase",
  label: "Supabase",
  capabilities: ["database", "auth", "storage", "realtime", "functions"],
  authModes: ["api-token"],
  requiredScopes: [],
  runtimes: ["client", "serverless", "server"],
  customDomain: false,
  quota: {
    freeTier: "yes",
    confidence: 0.99,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source: "https://supabase.com/docs/guides/platform/billing-on-supabase",
    limits: {
      freeProjects: 2,
      databaseMbPerProject: 500,
      egressGbPerMonth: 5,
      storageGb: 1,
      edgeFunctionInvocationsPerMonth: 500_000,
      realtimeMessagesPerMonth: 2_000_000,
      realtimePeakConnections: 200,
    },
  },
  notes: [
    "Supabase is modeled as a backend companion rather than a frontend hosting target.",
    "Custom domains and paid add-ons are not assumed to be part of the Free plan.",
    "Service-role keys and database credentials remain outside generated source and are resolved only through SecretRef/runtime connector boundaries.",
  ],
};

export interface SupabaseBackendPlanInput {
  connectionId: string;
  capabilities: readonly SupabaseCapability[];
  secretRefs?: readonly SecretRef[];
}

export interface SupabaseBackendPlan {
  providerId: "supabase";
  connectionId: string;
  capabilities: readonly SupabaseCapability[];
  runtimes: readonly IntegrationRuntime[];
  secretRefs: readonly SecretRef[];
  requiresSecretResolver: boolean;
  executionMode: "runtime-connector";
  warnings: readonly string[];
}

const SAFE_CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const ALLOWED_CAPABILITIES = new Set<SupabaseCapability>([
  "database",
  "auth",
  "storage",
  "realtime",
  "functions",
]);

function normalizeConnectionId(value: string): string {
  const normalized = value.trim();
  if (!SAFE_CONNECTION_ID.test(normalized)) {
    throw new Error("Supabase connectionId is invalid");
  }
  return normalized;
}

function normalizeCapabilities(
  capabilities: readonly SupabaseCapability[],
): SupabaseCapability[] {
  const output: SupabaseCapability[] = [];
  const seen = new Set<SupabaseCapability>();

  for (const capability of capabilities) {
    if (!ALLOWED_CAPABILITIES.has(capability)) {
      throw new Error(`Unsupported Supabase capability: ${capability}`);
    }
    if (seen.has(capability)) continue;
    seen.add(capability);
    output.push(capability);
  }

  if (output.length === 0) {
    throw new Error("Supabase backend plan requires at least one capability");
  }
  if (!seen.has("database")) {
    throw new Error("Supabase backend plan requires database capability");
  }

  return output;
}

function normalizeSecretRefs(
  refs: readonly SecretRef[] | undefined,
  connectionId: string,
): SecretRef[] {
  const seen = new Set<string>();
  const output: SecretRef[] = [];

  for (const ref of refs ?? []) {
    if (ref.scheme !== "secret" || ref.provider !== "supabase") {
      throw new Error("Supabase backend plans must use supabase secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("Supabase secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createSupabaseBackendPlan(
  input: SupabaseBackendPlanInput,
): SupabaseBackendPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  const capabilities = normalizeCapabilities(input.capabilities);
  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);

  return {
    providerId: "supabase",
    connectionId,
    capabilities,
    runtimes: ["client", "serverless", "server"],
    secretRefs,
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Never expose Supabase service-role or privileged database credentials to client-generated source.",
      "Verify current project quotas and add-on requirements before deployment; this plan does not authorize payment or upgrades.",
    ],
  };
}
