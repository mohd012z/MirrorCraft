import { classifyDeployment, type DeploymentRecommendation } from "@/mirrorcraft/deployment-classifier";
import {
  scanSourceRuntime,
  type SourceFileInput,
  type SourceRuntimeAnalysis,
} from "@/mirrorcraft/source-scanner";

export interface SourceDeploymentClassification {
  analysis: SourceRuntimeAnalysis;
  recommendation: DeploymentRecommendation;
}

export function classifyDeploymentFromSource(
  files: SourceFileInput[],
): SourceDeploymentClassification {
  const analysis = scanSourceRuntime(files);
  return {
    analysis,
    recommendation: classifyDeployment(analysis),
  };
}
