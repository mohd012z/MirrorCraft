import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import { StudioOperationsSurface } from "./studio-operations-surface";

const connections: IntegrationConnectionSummary[] = [
  {
    id: "github-primary",
    providerId: "github",
    authMode: "oauth",
    health: "connected",
    capabilities: ["source-control", "hosting"],
    hasSecretMaterial: true,
    secretCount: 1,
    createdAt: "2026-09-27T00:00:00.000Z",
    checkedAt: "2026-09-27T01:00:00.000Z",
  },
];

export const studioOperationsConnectionFixture = (
  <StudioOperationsSurface selection={null} connections={connections} />
);
