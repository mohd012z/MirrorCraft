import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";

declare module "./studio-operations-surface" {
  interface StudioOperationsSurfaceProps {
    /** Safe connection summaries only. SecretRef values are never exposed through Studio props. */
    connections?: readonly IntegrationConnectionSummary[];
  }
}

export {};
