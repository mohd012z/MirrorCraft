import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
  IntegrationRuntime,
} from "@/mirrorcraft/integrations/types";

export type GoogleServiceId =
  | "google-oauth"
  | "firebase-hosting"
  | "firebase-auth"
  | "firebase-storage"
  | "cloud-run"
  | "cloud-storage";

export type GoogleServiceCostModel =
  | "authorization"
  | "no-cost-plan-with-service-limits"
  | "usage-based-with-free-tier"
  | "service-dependent";

export interface GoogleServiceDescriptor {
  id: GoogleServiceId;
  label: string;
  capabilities: readonly IntegrationCapability[];
  runtimes: readonly IntegrationRuntime[];
  costModel: GoogleServiceCostModel;
  customDomain: boolean;
  secretBoundary: "none" | "secret-resolver";
  notes: readonly string[];
}

export const GOOGLE_SERVICE_CATALOG: readonly GoogleServiceDescriptor[] = [
  {
    id: "google-oauth",
    label: "Google OAuth",
    capabilities: ["oauth", "auth"],
    runtimes: ["client", "serverless", "server"],
    costModel: "authorization",
    customDomain: false,
    secretBoundary: "secret-resolver",
    notes: [
      "OAuth access and refresh tokens are resolved at runtime and are never embedded in project state.",
      "Web-server client secrets stay outside generated source and public repositories.",
    ],
  },
  {
    id: "firebase-hosting",
    label: "Firebase Hosting",
    capabilities: ["hosting", "custom-domain"],
    runtimes: ["static", "client"],
    costModel: "no-cost-plan-with-service-limits",
    customDomain: true,
    secretBoundary: "secret-resolver",
    notes: [
      "Firebase has a Spark no-cost plan, but Hosting limits and eligibility must be checked per project and current pricing rules.",
    ],
  },
  {
    id: "firebase-auth",
    label: "Firebase Authentication",
    capabilities: ["auth", "oauth"],
    runtimes: ["client", "serverless", "server"],
    costModel: "service-dependent",
    customDomain: false,
    secretBoundary: "secret-resolver",
    notes: [
      "Authentication quotas and billing behavior are service and provider dependent.",
    ],
  },
  {
    id: "firebase-storage",
    label: "Firebase Storage",
    capabilities: ["storage"],
    runtimes: ["client", "serverless", "server"],
    costModel: "service-dependent",
    customDomain: false,
    secretBoundary: "secret-resolver",
    notes: [
      "Storage usage must be evaluated against the project plan and current product-specific quota.",
    ],
  },
  {
    id: "cloud-run",
    label: "Google Cloud Run",
    capabilities: ["hosting", "functions", "custom-domain"],
    runtimes: ["serverless", "server"],
    costModel: "usage-based-with-free-tier",
    customDomain: true,
    secretBoundary: "secret-resolver",
    notes: [
      "Cloud Run is usage based and has a free tier; billing-account aggregation and usage beyond free allocation can incur charges.",
    ],
  },
  {
    id: "cloud-storage",
    label: "Google Cloud Storage",
    capabilities: ["storage"],
    runtimes: ["client", "serverless", "server"],
    costModel: "service-dependent",
    customDomain: false,
    secretBoundary: "secret-resolver",
    notes: [
      "Cloud Storage cost and quota are evaluated separately from Firebase Hosting and Cloud Run.",
    ],
  },
];

export const GOOGLE_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "google",
  label: "Google / Firebase",
  capabilities: [
    "oauth",
    "hosting",
    "functions",
    "auth",
    "storage",
    "custom-domain",
  ],
  authModes: ["oauth", "service-account"],
  requiredScopes: [],
  runtimes: ["client", "static", "serverless", "server"],
  customDomain: true,
  quota: {
    freeTier: "unknown",
    confidence: 1,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source:
      "https://firebase.google.com/pricing | https://cloud.google.com/run/pricing",
    limits: {
      "cost-model": "service-dependent",
      "firebase-spark": "No-cost plan exists; product-specific limits apply",
      "cloud-run": "Usage-based free tier; billing-account aggregation applies",
    },
  },
  notes: [
    "Provider-level cost remains unknown because Google/Firebase services use different quota and billing models.",
    "OAuth tokens, service-account material, and client secrets must be resolved through SecretRef boundaries rather than serialized into MirrorCraft state.",
  ],
};

export interface GoogleIntegrationPlanInput {
  connectionId: string;
  services: readonly GoogleServiceId[];
  secretRefs?: readonly SecretRef[];
  requestedScopes?: readonly string[];
}

export interface GoogleIntegrationPlan {
  providerId: "google";
  connectionId: string;
  services: readonly GoogleServiceId[];
  requestedScopes: readonly string[];
  secretRefs: readonly SecretRef[];
  requiredCapabilities: readonly IntegrationCapability[];
  runtimes: readonly IntegrationRuntime[];
  requiresSecretResolver: boolean;
  costAssessment: "service-dependent";
  warnings: readonly string[];
}

const SAFE_CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeConnectionId(value: string): string {
  const normalized = value.trim();
  if (!SAFE_CONNECTION_ID.test(normalized)) {
    throw new Error("Google integration connectionId is invalid");
  }
  return normalized;
}

function serviceById(id: GoogleServiceId): GoogleServiceDescriptor {
  const service = GOOGLE_SERVICE_CATALOG.find((item) => item.id === id);
  if (!service) throw new Error(`Unknown Google integration service: ${id}`);
  return service;
}

function normalizeScopes(scopes: readonly string[] | undefined): string[] {
  return unique(
    (scopes ?? [])
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0),
  );
}

function normalizeSecretRefs(
  refs: readonly SecretRef[] | undefined,
  connectionId: string,
): SecretRef[] {
  const seen = new Set<string>();
  const normalized: SecretRef[] = [];

  for (const ref of refs ?? []) {
    if (ref.scheme !== "secret" || ref.provider !== "google") {
      throw new Error("Google integration plans must use google secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error(
        "Google integration secret references must use the selected connectionId",
      );
    }

    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ ...ref });
  }

  return normalized;
}

export function createGoogleIntegrationPlan(
  input: GoogleIntegrationPlanInput,
): GoogleIntegrationPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  const services = unique(input.services);
  if (services.length === 0) {
    throw new Error("Google integration plan requires at least one service");
  }

  const descriptors = services.map(serviceById);
  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);

  return {
    providerId: "google",
    connectionId,
    services,
    requestedScopes: normalizeScopes(input.requestedScopes),
    secretRefs,
    requiredCapabilities: unique(
      descriptors.flatMap((service) => service.capabilities),
    ),
    runtimes: unique(descriptors.flatMap((service) => service.runtimes)),
    requiresSecretResolver: secretRefs.length > 0,
    costAssessment: "service-dependent",
    warnings: [
      "Verify current quotas and billing state for every selected Google/Firebase service before deployment.",
      "Keep OAuth client secrets, refresh tokens, service-account keys, and provider credentials outside generated source and model-visible project state.",
    ],
  };
}
