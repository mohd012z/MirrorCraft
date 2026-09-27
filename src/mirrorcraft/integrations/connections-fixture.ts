import { GITHUB_PROVIDER_DESCRIPTOR } from "@/mirrorcraft/integrations/github";
import {
  createIntegrationConnectionRegistry,
  listIntegrationConnectionSummaries,
  registerIntegrationConnection,
  updateIntegrationConnectionHealth,
} from "@/mirrorcraft/integrations/connections";
import { createIntegrationRegistry } from "@/mirrorcraft/integrations/registry";
import { createSecretRef } from "@/mirrorcraft/integrations/secrets";

const providers = createIntegrationRegistry([GITHUB_PROVIDER_DESCRIPTOR]);
let connections = createIntegrationConnectionRegistry();
connections = registerIntegrationConnection(connections, providers, {
  id: "github-primary",
  providerId: "github",
  authMode: "oauth",
  health: "connected",
  capabilities: ["source-control", "hosting"],
  secretRefs: [
    createSecretRef({
      provider: "github",
      connectionId: "github-primary",
      secretId: "oauth-token",
    }),
  ],
  createdAt: "2026-09-27T00:00:00.000Z",
});
connections = updateIntegrationConnectionHealth(
  connections,
  "github-primary",
  "degraded",
  {
    checkedAt: "2026-09-27T01:00:00.000Z",
    message: "Provider health check needs attention.",
  },
);

const summaries = listIntegrationConnectionSummaries(connections);
if (summaries.length !== 1) throw new Error("Expected one connection summary");
if (summaries[0].health !== "degraded") throw new Error("Expected degraded connection health");
if (summaries[0].secretCount !== 1) throw new Error("Expected opaque secret count");
if (JSON.stringify(summaries[0]).includes("oauth-token")) {
  throw new Error("Connection summaries must not expose secret identifiers");
}
