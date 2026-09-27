import type {
  IntegrationCapability,
  IntegrationRuntime,
} from "@/mirrorcraft/integrations/types";

export type ProviderProfileId =
  | "github-pages"
  | "cloudflare-pages"
  | "vercel"
  | "netlify"
  | "firebase-hosting"
  | "google-cloud-run"
  | "supabase"
  | "neon";

export type ProviderProfileKind = "hosting" | "backend";
export type ProviderFreeTierStatus = "yes" | "no" | "unknown";
export type ProviderCommercialUse = "allowed" | "restricted" | "service-dependent";
export type ProviderBillingMode = "hard-cap" | "usage-based" | "unknown";

export interface ProviderEvidence {
  verifiedAt: string;
  source: string;
  confidence: number;
}

export interface ProviderProfile {
  id: ProviderProfileId;
  label: string;
  kind: ProviderProfileKind;
  runtimes: readonly IntegrationRuntime[];
  capabilities: readonly IntegrationCapability[];
  customDomain: boolean;
  freeTier: ProviderFreeTierStatus;
  commercialUse: ProviderCommercialUse;
  billingMode: ProviderBillingMode;
  limits: Readonly<Record<string, string | number | boolean>>;
  evidence: ProviderEvidence;
  notes: readonly string[];
}

const VERIFIED_AT = "2026-09-26";
const GOOGLE_VERIFIED_AT = "2026-09-27";

export const PROVIDER_CATALOG: readonly ProviderProfile[] = [
  {
    id: "github-pages",
    label: "GitHub Pages",
    kind: "hosting",
    runtimes: ["static"],
    capabilities: ["hosting", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "restricted",
    billingMode: "hard-cap",
    limits: {
      siteSizeMb: 1024,
      softBandwidthGbPerMonth: 100,
      deploymentTimeoutMinutes: 10,
      softBuildsPerHour: 10,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source:
        "https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits",
      confidence: 0.98,
    },
    notes: [
      "GitHub Pages is static hosting only; server APIs and request-time SSR require another runtime.",
      "GitHub Free supports Pages from public repositories.",
      "GitHub Pages must not be treated as free hosting for an online business, e-commerce site, or commercial SaaS; those uses are restricted by the Pages usage policy.",
    ],
  },
  {
    id: "cloudflare-pages",
    label: "Cloudflare Pages",
    kind: "hosting",
    runtimes: ["static", "edge"],
    capabilities: ["hosting", "functions", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "hard-cap",
    limits: {
      monthlyBuilds: 500,
      concurrentBuilds: 1,
      maxFilesPerSite: 20_000,
      maxAssetMiB: 25,
      customDomainsPerProject: 100,
      buildTimeoutMinutes: 20,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source: "https://developers.cloudflare.com/pages/platform/limits/",
      confidence: 0.99,
    },
    notes: [
      "Static Pages hosting and Pages Functions have different quota behavior; Functions consume Workers-plan quotas.",
      "Commercial eligibility should be validated against the active Cloudflare plan and terms before deployment.",
    ],
  },
  {
    id: "vercel",
    label: "Vercel",
    kind: "hosting",
    runtimes: ["static", "edge", "serverless"],
    capabilities: ["hosting", "functions", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "restricted",
    billingMode: "hard-cap",
    limits: {
      edgeRequestsPerMonth: 1_000_000,
      fastDataTransferGbPerMonth: 100,
      hobbyDeploymentStorageGb: 10,
      hobbyAdditionalUsagePurchasable: false,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source: "https://vercel.com/pricing",
      confidence: 0.99,
    },
    notes: [
      "The Hobby plan is $0 but is intended for personal, non-commercial use.",
      "Hobby is capped; additional usage cannot be purchased without changing plan.",
    ],
  },
  {
    id: "netlify",
    label: "Netlify",
    kind: "hosting",
    runtimes: ["static", "edge", "serverless"],
    capabilities: ["hosting", "functions", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "hard-cap",
    limits: {
      monthlyCredits: 300,
      creditHardLimit: true,
      productionDeployCredits: 15,
      concurrentBuilds: 1,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source: "https://www.netlify.com/pricing/",
      confidence: 0.99,
    },
    notes: [
      "The Free plan has a hard monthly credit limit and no auto-recharge; projects can pause when credits are exhausted.",
      "Custom domains with SSL and Functions are available, but their usage contributes to the credit model where applicable.",
    ],
  },
  {
    id: "firebase-hosting",
    label: "Firebase Hosting",
    kind: "hosting",
    runtimes: ["static"],
    capabilities: ["hosting", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "hard-cap",
    limits: {
      sparkPaymentMethodRequired: false,
      hostingStorageGb: 10,
      hostingDataTransferMbPerDay: 360,
      customDomainAndSsl: true,
    },
    evidence: {
      verifiedAt: GOOGLE_VERIFIED_AT,
      source: "https://firebase.google.com/pricing",
      confidence: 0.99,
    },
    notes: [
      "The Spark plan does not require payment information for no-cost usage.",
      "Firebase Hosting includes no-cost storage and data-transfer quotas; Spark projects can be stopped rather than billed when no-cost resources are exceeded.",
      "Commercial and production eligibility must still be checked against the active Firebase project and current service terms.",
    ],
  },
  {
    id: "google-cloud-run",
    label: "Google Cloud Run",
    kind: "hosting",
    runtimes: ["serverless", "server"],
    capabilities: ["hosting", "functions", "custom-domain"],
    customDomain: true,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "usage-based",
    limits: {
      requestBasedRequestsFreePerMonth: 2_000_000,
      requestBasedCpuSecondsFreePerMonth: 180_000,
      requestBasedRamGibSecondsFreePerMonth: 360_000,
      freeTierAggregatedByBillingAccount: true,
      billingBeyondFreeTier: true,
    },
    evidence: {
      verifiedAt: GOOGLE_VERIFIED_AT,
      source: "https://cloud.google.com/run/pricing",
      confidence: 0.99,
    },
    notes: [
      "Cloud Run has a monthly free tier, but usage beyond the allowance is billable.",
      "Free-tier usage is aggregated across projects by billing account, so MirrorCraft must not classify Cloud Run as guaranteed zero-cost hosting.",
    ],
  },
  {
    id: "supabase",
    label: "Supabase",
    kind: "backend",
    runtimes: ["client", "serverless", "server"],
    capabilities: ["database", "auth", "storage", "realtime", "functions"],
    customDomain: false,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "unknown",
    limits: {
      freeProjects: 2,
      databaseMbPerProject: 500,
      egressGbPerMonth: 5,
      storageGb: 1,
      edgeFunctionInvocationsPerMonth: 500_000,
      realtimeMessagesPerMonth: 2_000_000,
      realtimePeakConnections: 200,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source: "https://supabase.com/docs/guides/platform/billing-on-supabase",
      confidence: 0.99,
    },
    notes: [
      "Supabase is modeled as a backend companion rather than a frontend host.",
      "Custom domains are an add-on and are not assumed to be included in the Free plan.",
    ],
  },
  {
    id: "neon",
    label: "Neon",
    kind: "backend",
    runtimes: ["serverless", "server"],
    capabilities: ["database"],
    customDomain: false,
    freeTier: "yes",
    commercialUse: "service-dependent",
    billingMode: "unknown",
    limits: {
      storageMbPerProject: 500,
      egressGbPerMonth: 5,
      autoscalingComputeUnits: 2,
    },
    evidence: {
      verifiedAt: VERIFIED_AT,
      source: "https://neon.com/blog/how-to-make-the-most-of-neons-free-plan",
      confidence: 0.8,
    },
    notes: [
      "Neon is modeled as a Postgres backend companion, not a frontend host.",
      "The exact project and compute allowances can change independently; current console/pricing should be rechecked before deployment planning.",
    ],
  },
];

export function getProviderProfile(
  providerId: string,
): ProviderProfile | undefined {
  return PROVIDER_CATALOG.find((provider) => provider.id === providerId.trim());
}

export function listProviderProfiles(
  kind?: ProviderProfileKind,
): readonly ProviderProfile[] {
  return kind
    ? PROVIDER_CATALOG.filter((provider) => provider.kind === kind)
    : [...PROVIDER_CATALOG];
}
