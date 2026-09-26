import type { DeploymentRecommendation } from "@/mirrorcraft/deployment-classifier";
import type { SourceRuntimeAnalysis } from "@/mirrorcraft/source-scanner";

export type HostingRuntimeDecision =
  | "static"
  | "serverless"
  | "server"
  | "artifact-only";

export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation & { profile: "static-export" },
  analysis: SourceRuntimeAnalysis,
): "static";
export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation & { profile: "artifact-only" },
  analysis: SourceRuntimeAnalysis,
): "artifact-only";
export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation & { profile: "server-runtime" | "hybrid" },
  analysis: SourceRuntimeAnalysis &
    (
      | { websocketServer: true }
      | { writableFilesystemRuntime: true }
    ),
): "server";
export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation & { profile: "server-runtime" | "hybrid" },
  analysis: SourceRuntimeAnalysis & {
    websocketServer: false;
    writableFilesystemRuntime: false;
  },
): "serverless";
export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation,
  analysis: SourceRuntimeAnalysis,
): HostingRuntimeDecision;
export function deriveHostingRuntime(
  recommendation: DeploymentRecommendation,
  analysis: SourceRuntimeAnalysis,
): HostingRuntimeDecision {
  if (recommendation.profile === "artifact-only") return "artifact-only";
  if (recommendation.profile === "static-export") return "static";

  if (analysis.websocketServer || analysis.writableFilesystemRuntime) {
    return "server";
  }

  return "serverless";
}
