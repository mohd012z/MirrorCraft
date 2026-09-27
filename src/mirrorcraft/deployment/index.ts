import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
import type { DomainPlan } from "@/mirrorcraft/domain/types";
import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import { restrictionsFromDeploymentContext } from "@/mirrorcraft/policy/deployment-context";
import {
  combineRestrictionDecisions,
  restrictionsFromDeploymentExecution,
  restrictionsFromPublishDecision,
  type RestrictionDecision,
} from "@/mirrorcraft/policy/restrictions";
import { evaluatePublish } from "@/mirrorcraft/publish";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";

export interface DeploymentProviderExecution {
  providerId: string;
  connectionId: string;
  runtime: IntegrationRuntime;
  serviceId?: string;
  executionMode: "runtime-connector";
  warnings: string[];
}

export interface DeploymentRequest {
  target: DeploymentTarget;
  manifest: ReleaseManifest;
  artifactPath: string;
  repository?: string;
  branch?: string;
  customDomain?: string;
  /** Non-secret provider routing metadata. Credentials remain behind connector/SecretRef boundaries. */
  provider?: DeploymentProviderExecution;
  /** Non-secret connection health/capability summary used to fail closed before execution. */
  connection?: IntegrationConnectionSummary;
  /** Domain planning/verification metadata. No registrar credentials belong here. */
  domainPlan?: DomainPlan;
  /** Precomputed policy restrictions from access/hosting/domain planning. Router derives execution and publish readiness independently. */
  restrictions?: RestrictionDecision;
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

    const executionRestrictions = restrictionsFromDeploymentExecution({
      target: request.target,
      ...(request.provider ? { provider: request.provider } : {}),
    });
    const contextRestrictions = restrictionsFromDeploymentContext({
      ...(request.provider ? { provider: request.provider } : {}),
      ...(request.connection ? { connection: request.connection } : {}),
      ...(request.customDomain ? { customDomain: request.customDomain } : {}),
      ...(request.domainPlan ? { domainPlan: request.domainPlan } : {}),
    });
    const publishRestrictions = restrictionsFromPublishDecision(
      evaluatePublish(request.manifest),
    );
    const restrictionDecision = request.restrictions
      ? combineRestrictionDecisions(
          executionRestrictions,
          contextRestrictions,
          publishRestrictions,
          request.restrictions,
        )
      : combineRestrictionDecisions(
          executionRestrictions,
          contextRestrictions,
          publishRestrictions,
        );

    if (!restrictionDecision.allowed) {
      return {
        target: request.target,
        status: "blocked",
        revision: request.manifest.revision,
        evidence: [
          ...new Set(
            restrictionDecision.blockers.flatMap((restriction) => restriction.evidence),
          ),
        ],
        errors: restrictionDecision.blockers.map(
          (restriction) => restriction.message,
        ),
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
