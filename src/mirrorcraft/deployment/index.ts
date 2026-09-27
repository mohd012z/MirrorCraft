import type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
import type { DomainPlan } from "@/mirrorcraft/domain/types";
import type { IntegrationConnectionSummary } from "@/mirrorcraft/integrations/connections";
import type { IntegrationRuntime } from "@/mirrorcraft/integrations/types";
import { restrictionsFromDeploymentContext } from "@/mirrorcraft/policy/deployment-context";
import {
  validateRevisionPolicyEnvelope,
  type RevisionPolicyEnvelope,
  type RevisionPolicyEnvelopeVerifier,
} from "@/mirrorcraft/policy/revision-envelope";
import {
  combineRestrictionDecisions,
  restrictionsFromDeploymentExecution,
  restrictionsFromPublishDecision,
  type RestrictionDecision,
} from "@/mirrorcraft/policy/restrictions";
import { evaluatePublish } from "@/mirrorcraft/publish";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export type { DeploymentTarget } from "@/mirrorcraft/deployment/targets";
export type DeploymentPolicyEnvelope = RevisionPolicyEnvelope;

export interface DeploymentProviderExecution {
  providerId: string;
  connectionId: string;
  runtime: IntegrationRuntime;
  serviceId?: string;
  executionMode: "runtime-connector";
  warnings: string[];
}

export interface DeploymentPolicyEnvelopeBinding {
  projectId: string;
  revision: string;
  commit: string;
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
  /** Revision-bound, non-secret policy snapshot. Router verifies binding, freshness, SHA-256 integrity, and trusted attestation before execution. */
  policyEnvelope?: RevisionPolicyEnvelope;
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

export interface DeploymentRouterOptions {
  now?: () => Date;
  policyVerifier?: RevisionPolicyEnvelopeVerifier;
}

export class DeploymentRouter {
  private readonly adapters = new Map<DeploymentTarget, DeploymentAdapter>();
  private readonly now: () => Date;
  private readonly policyVerifier?: RevisionPolicyEnvelopeVerifier;

  constructor(options: DeploymentRouterOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.policyVerifier = options.policyVerifier;
  }

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

    if (request.policyEnvelope) {
      const envelopeValidation = await validateRevisionPolicyEnvelope(
        request.policyEnvelope,
        request.manifest,
        this.now(),
        this.policyVerifier,
      );
      if (!envelopeValidation.valid) {
        return {
          target: request.target,
          status: "blocked",
          revision: request.manifest.revision,
          evidence: [...envelopeValidation.evidence],
          errors: [...envelopeValidation.errors],
        };
      }
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
    const envelopeRestrictions = request.policyEnvelope?.decision;
    const restrictionDecision = request.restrictions
      ? combineRestrictionDecisions(
          executionRestrictions,
          contextRestrictions,
          publishRestrictions,
          ...(envelopeRestrictions ? [envelopeRestrictions] : []),
          request.restrictions,
        )
      : combineRestrictionDecisions(
          executionRestrictions,
          contextRestrictions,
          publishRestrictions,
          ...(envelopeRestrictions ? [envelopeRestrictions] : []),
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

    if (!request.policyEnvelope) {
      return {
        target: request.target,
        status: "blocked",
        revision: request.manifest.revision,
        evidence: [
          `release-project:${request.manifest.projectId}`,
          `release-revision:${request.manifest.revision}`,
          `release-commit:${request.manifest.commit}`,
        ],
        errors: [
          "Deployment execution requires a revision-bound policy envelope for the current release manifest.",
        ],
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
