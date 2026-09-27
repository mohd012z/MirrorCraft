import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationCapability,
  IntegrationProviderDescriptor,
} from "@/mirrorcraft/integrations/types";

export const GITHUB_PROVIDER_DESCRIPTOR: IntegrationProviderDescriptor = {
  id: "github",
  label: "GitHub Pages",
  capabilities: ["source-control", "hosting", "custom-domain"],
  authModes: ["oauth", "api-token"],
  requiredScopes: [],
  runtimes: ["static"],
  customDomain: true,
  quota: {
    freeTier: "yes",
    confidence: 0.98,
    verifiedAt: "2026-09-26T00:00:00.000Z",
    source:
      "https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits",
    limits: {
      siteSizeMb: 1024,
      softBandwidthGbPerMonth: 100,
      deploymentTimeoutMinutes: 10,
    },
  },
  notes: [
    "GitHub Pages is a static deployment target and must not be selected for required server runtimes.",
    "Pages usage policy restricts using the service as free hosting for an online business, e-commerce site, or commercial SaaS.",
    "Execution credentials are resolved only through the connected GitHub runtime or SecretRef boundary.",
  ],
};

export interface GitHubDeploymentPlanInput {
  connectionId: string;
  runtime: "static" | "serverless" | "server" | "edge";
  secretRefs?: readonly SecretRef[];
  customDomain?: string;
}

export interface GitHubDeploymentPlan {
  providerId: "github";
  connectionId: string;
  runtime: "static";
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
    throw new Error("GitHub connectionId is invalid");
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
    if (ref.scheme !== "secret" || ref.provider !== "github") {
      throw new Error("GitHub deployment plans must use github secret references");
    }
    if (ref.connectionId !== connectionId) {
      throw new Error("GitHub secret references must use the selected connectionId");
    }
    const key = `${ref.provider}/${ref.connectionId}/${ref.secretId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...ref });
  }

  return output;
}

export function createGitHubDeploymentPlan(
  input: GitHubDeploymentPlanInput,
): GitHubDeploymentPlan {
  const connectionId = normalizeConnectionId(input.connectionId);
  if (input.runtime !== "static") {
    throw new Error(`GitHub Pages does not support runtime ${input.runtime}`);
  }

  const secretRefs = normalizeSecretRefs(input.secretRefs, connectionId);
  const customDomain = input.customDomain?.trim() || undefined;

  return {
    providerId: "github",
    connectionId,
    runtime: "static",
    secretRefs,
    requiredCapabilities: ["hosting"],
    ...(customDomain ? { customDomain } : {}),
    requiresSecretResolver: secretRefs.length > 0,
    executionMode: "runtime-connector",
    warnings: [
      "Verify GitHub Pages usage-policy eligibility for the project before publishing.",
      "Do not place GitHub tokens or other credentials in generated source, history, or deployment manifests.",
    ],
  };
}
