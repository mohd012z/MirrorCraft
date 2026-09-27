import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";

export interface DeploymentRequest {
  target: DeploymentTarget;
  manifest: ReleaseManifest;
  artifactPath: string;
  repository?: string;
  branch?: string;
  customDomain?: string;
}

export interface DeploymentResult {
  target: DeploymentTarget;
  status: "published" | "failed" | "blocked";
  revision: string;
  location?: string;
  deploymentId?: string;
  evidence: string[];
  errors: string[];
}

export interface DeploymentAdapter {
  readonly target: DeploymentTarget;
  validate(request: DeploymentRequest): string[];
  publish(request: DeploymentRequest): Promise<DeploymentResult>;
}

export class DeploymentRouter {
  private readonly adapters = new Map<DeploymentTarget, DeploymentAdapter>();

  register(adapter: DeploymentAdapter): void {
    this.adapters.set(adapter.target, adapter);
  }

  async publish(request: DeploymentRequest): Promise<DeploymentResult> {
    const adapter = this.adapters.get(request.target);
    if (!adapter) {
      return {
        target: request.target,
        status: "blocked",
        revision: request.manifest.revision,
        evidence: [],
        errors: [`No deployment adapter registered for ${request.target}.`],
      };
    }

    const blockers = adapter.validate(request);
    if (blockers.length > 0) {
      return {
        target: request.target,
        status: "blocked",
        revision: request.manifest.revision,
        evidence: [],
        errors: blockers,
      };
    }

    return adapter.publish(request);
  }
}
