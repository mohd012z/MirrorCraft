export type IntegrationCapability =
  | "source-control"
  | "oauth"
  | "hosting"
  | "functions"
  | "database"
  | "auth"
  | "storage"
  | "realtime"
  | "custom-domain"
  | "dns";

export type IntegrationAuthMode =
  | "oauth"
  | "api-token"
  | "service-account"
  | "none";

export type IntegrationRuntime =
  | "client"
  | "static"
  | "edge"
  | "serverless"
  | "server";

export type ProviderFreeTierStatus = "yes" | "no" | "unknown";
export type ProviderQuotaFreshness = "fresh" | "stale" | "unknown";

export interface ProviderQuotaMetadata {
  freeTier: ProviderFreeTierStatus;
  confidence: number;
  verifiedAt?: string;
  source?: string;
  limits?: Readonly<Record<string, string | number | boolean>>;
}

export interface IntegrationProviderDescriptor {
  id: string;
  label: string;
  capabilities: readonly IntegrationCapability[];
  authModes: readonly IntegrationAuthMode[];
  requiredScopes: readonly string[];
  runtimes: readonly IntegrationRuntime[];
  customDomain: boolean;
  quota: ProviderQuotaMetadata;
  notes?: readonly string[];
}

export interface IntegrationRegistry {
  providers: Readonly<Record<string, IntegrationProviderDescriptor>>;
}
