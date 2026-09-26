import type {
  IntegrationProviderDescriptor,
  IntegrationRegistry,
  ProviderQuotaFreshness,
  ProviderQuotaMetadata,
} from "@/mirrorcraft/integrations/types";

const DEFAULT_QUOTA_MAX_AGE_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

export interface NormalizeProviderQuotaOptions {
  now?: Date;
  maxAgeDays?: number;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizedEvidence(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function assessProviderQuotaFreshness(
  quota: ProviderQuotaMetadata,
  options: NormalizeProviderQuotaOptions = {},
): ProviderQuotaFreshness {
  const source = normalizedEvidence(quota.source);
  const verifiedAt = normalizedEvidence(quota.verifiedAt);
  if (!source || !verifiedAt) return "unknown";

  const verifiedTime = new Date(verifiedAt).getTime();
  const now = options.now ?? new Date();
  const nowTime = now.getTime();
  if (!Number.isFinite(verifiedTime) || verifiedTime > nowTime) return "unknown";

  const maxAgeDays = Math.max(
    1,
    Math.floor(options.maxAgeDays ?? DEFAULT_QUOTA_MAX_AGE_DAYS),
  );
  const ageDays = (nowTime - verifiedTime) / MILLISECONDS_PER_DAY;
  return ageDays <= maxAgeDays ? "fresh" : "stale";
}

export function normalizeProviderQuota(
  quota: ProviderQuotaMetadata,
  options: NormalizeProviderQuotaOptions = {},
): ProviderQuotaMetadata {
  const freshness = assessProviderQuotaFreshness(quota, options);
  const confidence = clampConfidence(quota.confidence);
  const source = normalizedEvidence(quota.source);
  const verifiedAt = normalizedEvidence(quota.verifiedAt);

  if (freshness !== "fresh") {
    return {
      ...quota,
      freeTier: "unknown",
      confidence: Math.min(confidence, 0.5),
      source,
      verifiedAt,
    };
  }

  return {
    ...quota,
    confidence,
    source,
    verifiedAt,
  };
}

function normalizeProviderDescriptor(
  descriptor: IntegrationProviderDescriptor,
): IntegrationProviderDescriptor {
  const id = descriptor.id.trim();
  const label = descriptor.label.trim();
  if (!id) throw new Error("Integration provider id is required");
  if (!label) throw new Error(`Integration provider ${id} requires a label`);

  return {
    ...descriptor,
    id,
    label,
    capabilities: [...new Set(descriptor.capabilities)],
    authModes: [...new Set(descriptor.authModes)],
    requiredScopes: [...new Set(descriptor.requiredScopes.map((scope) => scope.trim()).filter(Boolean))],
    runtimes: [...new Set(descriptor.runtimes)],
    quota: normalizeProviderQuota(descriptor.quota),
    notes: descriptor.notes ? [...descriptor.notes] : undefined,
  };
}

export function createIntegrationRegistry(
  providers: readonly IntegrationProviderDescriptor[] = [],
): IntegrationRegistry {
  let registry: IntegrationRegistry = { providers: {} };
  for (const provider of providers) {
    registry = registerIntegrationProvider(registry, provider);
  }
  return registry;
}

export function registerIntegrationProvider(
  registry: IntegrationRegistry,
  descriptor: IntegrationProviderDescriptor,
): IntegrationRegistry {
  const normalized = normalizeProviderDescriptor(descriptor);
  if (registry.providers[normalized.id]) {
    throw new Error(`Integration provider ${normalized.id} is already registered`);
  }

  return {
    providers: {
      ...registry.providers,
      [normalized.id]: normalized,
    },
  };
}

export function getIntegrationProvider(
  registry: IntegrationRegistry,
  providerId: string,
): IntegrationProviderDescriptor | undefined {
  return registry.providers[providerId.trim()];
}

export function listIntegrationProviders(
  registry: IntegrationRegistry,
): readonly IntegrationProviderDescriptor[] {
  return Object.values(registry.providers);
}
